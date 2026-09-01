import { Router } from "express";
import { Bill, Customer, Appointment, Staff, Expense, Service, CustomerMembership } from "../models/index.js";
import { format, subDays, startOfWeek, addDays, startOfMonth, endOfMonth, subMonths, getHours } from "date-fns";

const router = Router();

// Revenue trend (daily / weekly / monthly)
router.get("/reports/revenue", async (req, res) => {
  const period = (req.query.period as string) || "daily";
  const bills = await Bill.find().sort({ createdAt: 1 });

  let data: { label: string; revenue: number; bills: number; customers: number }[] = [];

  if (period === "daily") {
    const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
    data = days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayBills = bills.filter((b) => format(new Date(b.createdAt), "yyyy-MM-dd") === dateStr);
      const customerIds = new Set(dayBills.map((b) => b.customerId).filter(Boolean));
      return { label: format(day, "EEE"), revenue: dayBills.reduce((s, b) => s + b.finalAmount, 0), bills: dayBills.length, customers: customerIds.size };
    });
  } else if (period === "weekly") {
    for (let i = 5; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(new Date(), i * 7));
      const weekEnd = addDays(weekStart, 6);
      const weekBills = bills.filter((b) => { const d = new Date(b.createdAt); return d >= weekStart && d <= weekEnd; });
      const customerIds = new Set(weekBills.map((b) => b.customerId).filter(Boolean));
      data.push({ label: `W${6 - i}`, revenue: weekBills.reduce((s, b) => s + b.finalAmount, 0), bills: weekBills.length, customers: customerIds.size });
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const year = d.getFullYear(); const month = d.getMonth();
      const monthBills = bills.filter((b) => { const bd = new Date(b.createdAt); return bd.getFullYear() === year && bd.getMonth() === month; });
      const customerIds = new Set(monthBills.map((b) => b.customerId).filter(Boolean));
      data.push({ label: format(d, "MMM"), revenue: monthBills.reduce((s, b) => s + b.finalAmount, 0), bills: monthBills.length, customers: customerIds.size });
    }
  }

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalBills = data.reduce((s, d) => s + d.bills, 0);
  res.json({ period, totalRevenue, totalBills, data });
});

// Full analytics — supports ?from=YYYY-MM-DD&to=YYYY-MM-DD OR ?range=month|quarter|year
router.get("/reports/analytics", async (req, res) => {
  const now = new Date();
  let fromDate: Date;
  let toDate: Date = now;

  if (req.query.from && req.query.to) {
    fromDate = new Date(req.query.from as string);
    toDate = new Date(req.query.to as string);
    toDate.setHours(23, 59, 59, 999);
  } else {
    const range = (req.query.range as string) || "month";
    if (range === "year") fromDate = new Date(now.getFullYear(), 0, 1);
    else if (range === "quarter") fromDate = subMonths(now, 3);
    else fromDate = startOfMonth(now);
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const [bills, totalCustomers, staffDocs, expenses, allServices, newCustomers, membershipDocs, allTimeActiveCount] = await Promise.all([
    Bill.find({ createdAt: { $gte: fromDate, $lte: toDate } }).sort({ createdAt: 1 }),
    Customer.countDocuments(),
    Staff.find(),
    Expense.find({ createdAt: { $gte: fromDate, $lte: toDate } }).lean(),
    Service.find().lean(),
    Customer.aggregate([
      { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
      { $group: { _id: { $ifNull: ["$gender", "unknown"] }, count: { $sum: 1 } } },
    ]),
    CustomerMembership.find({ createdAt: { $gte: fromDate, $lte: toDate } }).lean(),
    CustomerMembership.countDocuments({ isActive: true, endDate: { $gte: todayStr } }),
  ]);

  // New customers gender breakdown (newCustomers is the aggregate result array)
  const newCustAgg = newCustomers as unknown as { _id: string; count: number }[];
  const newCustomerGenderMap: Record<string, number> = {};
  for (const g of newCustAgg) {
    newCustomerGenderMap[g._id || "unknown"] = g.count;
  }
  const newCustomersTotal = Object.values(newCustomerGenderMap).reduce((s, v) => s + v, 0);
  const newCustomersMale = newCustomerGenderMap["male"] || 0;
  const newCustomersFemale = newCustomerGenderMap["female"] || 0;

  // Build service ID → category lookup from actual Service documents
  const serviceCategoryMap: Record<string, string> = {};
  for (const svc of allServices as any[]) {
    serviceCategoryMap[svc._id.toString()] = svc.category || "Other";
  }

  // ── Revenue Summary ──
  const totalRevenue = bills.reduce((s, b) => s + b.finalAmount, 0);
  const totalBills = bills.length;
  const avgTicket = totalBills > 0 ? Math.round(totalRevenue / totalBills) : 0;
  const totalExpenses = (expenses as any[]).reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  // ── Services vs Products revenue — proportional share of finalAmount ──
  // item.total is pre-bill-discount; we distribute finalAmount proportionally
  // so servicesRevenue + productsRevenue always equals totalRevenue exactly.
  let servicesRevenue = 0;
  let productsRevenue = 0;
  for (const bill of bills) {
    const svcItemTotal = bill.items.filter(i => i.type === "service").reduce((s, i) => s + (i.total || 0), 0);
    const prdItemTotal = bill.items.filter(i => i.type === "product").reduce((s, i) => s + (i.total || 0), 0);
    const itemsTotal = svcItemTotal + prdItemTotal;
    if (itemsTotal > 0) {
      servicesRevenue += Math.round(bill.finalAmount * (svcItemTotal / itemsTotal));
      productsRevenue += Math.round(bill.finalAmount * (prdItemTotal / itemsTotal));
    } else {
      // fallback: count entire bill as services
      servicesRevenue += bill.finalAmount;
    }
  }

  // ── Previous period comparison ──
  const periodLength = toDate.getTime() - fromDate.getTime();
  const prevFrom = new Date(fromDate.getTime() - periodLength);
  const prevBills = await Bill.find({ createdAt: { $gte: prevFrom, $lt: fromDate } });
  const prevRevenue = prevBills.reduce((s, b) => s + b.finalAmount, 0);
  const revGrowth = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0;

  // ── Daily revenue within period (for chart) ──
  const dayCount = Math.round(periodLength / (1000 * 60 * 60 * 24)) + 1;
  const useDaily = dayCount <= 31;
  const dailyRevenue: { label: string; revenue: number; bills: number }[] = [];
  if (useDaily) {
    for (let i = 0; i < dayCount; i++) {
      const day = new Date(fromDate.getTime() + i * 86400000);
      const ds = format(day, "yyyy-MM-dd");
      const db = bills.filter(b => format(new Date(b.createdAt), "yyyy-MM-dd") === ds);
      dailyRevenue.push({ label: format(day, "d MMM"), revenue: db.reduce((s, b) => s + b.finalAmount, 0), bills: db.length });
    }
  } else {
    // Weekly buckets
    const weekMap: Record<string, { revenue: number; bills: number }> = {};
    for (const b of bills) {
      const wk = format(startOfWeek(new Date(b.createdAt)), "dd MMM");
      if (!weekMap[wk]) weekMap[wk] = { revenue: 0, bills: 0 };
      weekMap[wk].revenue += b.finalAmount;
      weekMap[wk].bills += 1;
    }
    for (const [label, v] of Object.entries(weekMap)) dailyRevenue.push({ label, ...v });
  }

  // ── Service Performance (all services done, no limit) ──
  const serviceMap: Record<string, { name: string; revenue: number; count: number }> = {};
  for (const bill of bills) {
    for (const item of bill.items) {
      if (item.type === "service") {
        const key = item.itemId || item.name;
        if (!serviceMap[key]) serviceMap[key] = { name: item.name, revenue: 0, count: 0 };
        serviceMap[key].revenue += item.total;
        serviceMap[key].count += item.quantity;
      }
    }
  }
  const topServices = Object.values(serviceMap)
    .filter(s => s.count > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .map(s => ({ ...s, avgTicket: s.count > 0 ? Math.round(s.revenue / s.count) : 0 }));

  // ── Product Sales ──
  const productMap: Record<string, { name: string; revenue: number; count: number }> = {};
  for (const bill of bills) {
    for (const item of bill.items) {
      if (item.type === "product") {
        if (!productMap[item.itemId]) productMap[item.itemId] = { name: item.name, revenue: 0, count: 0 };
        productMap[item.itemId].revenue += item.total;
        productMap[item.itemId].count += item.quantity;
      }
    }
  }
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  // ── Staff Performance ──
  const staffMap: Record<string, { name: string; revenue: number; services: number }> = {};
  for (const bill of bills) {
    for (const item of bill.items) {
      if (item.type === "service" && item.staffId && item.staffName) {
        if (!staffMap[item.staffId]) staffMap[item.staffId] = { name: item.staffName, revenue: 0, services: 0 };
        staffMap[item.staffId].revenue += item.total;
        staffMap[item.staffId].services += item.quantity;
      }
    }
  }
  const staffPerformance = Object.entries(staffMap).map(([staffId, data]) => {
    const staffDoc = staffDocs.find(s => s._id.toString() === staffId);
    const commissionPct = staffDoc?.commissionPercent || 10;
    return { ...data, commission: Math.round(data.revenue * commissionPct / 100), commissionPct };
  }).sort((a, b) => b.revenue - a.revenue);

  // ── Payment Mix ──
  const paymentMap: Record<string, { count: number; amount: number }> = {};
  for (const bill of bills) {
    const payments = Array.isArray((bill as any).paymentBreakdown) && (bill as any).paymentBreakdown.length > 0
      ? (bill as any).paymentBreakdown
      : [{ method: bill.paymentMethod || "cash", amount: bill.finalAmount }];
    for (const payment of payments) {
      const m = String(payment.method || "cash").toLowerCase();
      if (!paymentMap[m]) paymentMap[m] = { count: 0, amount: 0 };
      paymentMap[m].count += 1;
      paymentMap[m].amount += Number(payment.amount) || 0;
    }
  }
  const paymentMix = Object.entries(paymentMap).map(([method, d]) => ({ method, ...d })).sort((a, b) => b.amount - a.amount);

  // ── Peak Hours ──
  const hourMap: Record<number, number> = {};
  for (const bill of bills) {
    const hr = getHours(new Date(bill.createdAt));
    hourMap[hr] = (hourMap[hr] || 0) + 1;
  }
  const peakHours = Array.from({ length: 13 }, (_, i) => i + 9).map(hr => ({
    hour: hr <= 12 ? `${hr}am` : hr === 12 ? "12pm" : `${hr - 12}pm`,
    count: hourMap[hr] || 0,
  }));

  // ── Customer Insights ──
  const allBills = await Bill.find({ customerId: { $ne: null, $ne: "" } });
  const custBillCount: Record<string, number> = {};
  for (const b of allBills) {
    if (b.customerId) custBillCount[b.customerId] = (custBillCount[b.customerId] || 0) + 1;
  }
  const repeatCustomers = Object.values(custBillCount).filter(c => c > 1).length;
  const uniqueBilledCustomers = Object.keys(custBillCount).length;
  const periodCustIds = new Set(bills.map(b => b.customerId).filter(Boolean));

  // ── Category Revenue Split — uses actual service category from Service model ──
  const categoryMap: Record<string, number> = {};
  for (const bill of bills) {
    for (const item of bill.items) {
      if (item.type === "service") {
        const cat = serviceCategoryMap[item.itemId] || "Other";
        categoryMap[cat] = (categoryMap[cat] || 0) + item.total;
      }
    }
  }
  const categorySplit = Object.entries(categoryMap)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
  const catTotal = categorySplit.reduce((s, c) => s + c.revenue, 0);
  const categoryShare = categorySplit.map(c => ({ ...c, pct: catTotal > 0 ? Math.round((c.revenue / catTotal) * 100) : 0 }));

  // ── Expense Breakdown ──
  const expenseByCategory: Record<string, number> = {};
  for (const e of expenses as any[]) {
    const cat = e.category || "Other";
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (e.amount || 0);
  }
  const expenseBreakdown = Object.entries(expenseByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  // ── Membership Analytics ──
  const membershipArr = membershipDocs as any[];
  const membershipPlanMap: Record<string, { name: string; count: number; revenue: number; active: number; expired: number }> = {};
  for (const cm of membershipArr) {
    const key = cm.membershipName || "Unknown";
    if (!membershipPlanMap[key]) membershipPlanMap[key] = { name: key, count: 0, revenue: 0, active: 0, expired: 0 };
    membershipPlanMap[key].count++;
    membershipPlanMap[key].revenue += cm.price || 0;
    if (cm.isActive && cm.endDate >= todayStr) membershipPlanMap[key].active++;
    else if (cm.endDate < todayStr) membershipPlanMap[key].expired++;
    // records with isActive:false but endDate >= today were revoked/replaced — exclude from counts
  }
  const membershipBreakdown = Object.values(membershipPlanMap).sort((a, b) => b.revenue - a.revenue);
  const membershipRevenue = membershipArr.reduce((s, cm) => s + (cm.price || 0), 0);
  const activeMembershipsInPeriod = membershipArr.filter(cm => cm.isActive && cm.endDate >= todayStr).length;
  // Exclude revoked/replaced records (isActive:false but endDate not yet past) from the recent list
  const validMembershipArr = membershipArr.filter(cm => cm.isActive || cm.endDate < todayStr);
  // Sort by endDate ascending (nearest expiry first) — active first, then expired
  const recentMemberships = [...validMembershipArr]
    .map(cm => ({
      customerName: cm.customerName || "—",
      customerId: cm.customerId || "",
      plan: cm.membershipName || "—",
      price: cm.price || 0,
      discountPercent: cm.discountPercent || 0,
      startDate: cm.startDate,
      endDate: cm.endDate,
      isActive: !!(cm.isActive && cm.endDate >= todayStr),
      createdAt: cm.createdAt,
    }))
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.endDate.localeCompare(b.endDate);
    });

  res.json({
    summary: { totalRevenue, totalBills, avgTicket, totalCustomers, revGrowth, periodCustCount: periodCustIds.size, totalExpenses, netProfit, newCustomers: newCustomersTotal, newCustomersMale, newCustomersFemale, servicesRevenue, productsRevenue },
    topServices,
    topProducts,
    staffPerformance,
    paymentMix,
    peakHours,
    dailyRevenue,
    customerInsights: { totalCustomers, repeatCustomers, uniqueBilledCustomers, retentionRate: uniqueBilledCustomers > 0 ? Math.round((repeatCustomers / uniqueBilledCustomers) * 100) : 0 },
    categoryShare,
    expenseBreakdown,
    membershipAnalytics: { total: membershipArr.length, revenue: membershipRevenue, activeCount: activeMembershipsInPeriod, allTimeActive: allTimeActiveCount, breakdown: membershipBreakdown, recent: recentMemberships },
  });
});

export default router;
