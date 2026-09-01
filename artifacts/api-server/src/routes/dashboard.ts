import { Router } from "express";
import { Bill, Customer, Appointment, Product, Expense, CustomerMembership } from "../models/index.js";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from "date-fns";

const router = Router();

router.get("/dashboard/stats", async (_req, res) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const now = new Date();
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const firstOfMonth = startOfMonth(now);
  const nextWeek = format(addDays(now, 7), "yyyy-MM-dd");

  const [
    todayBillDocs,
    totalCustomers,
    activeMembers,
    todayNewMembers,
    pendingAppointments,
    lowStockProducts,
    monthBillDocs,
    monthExpenseDocs,
    todayAppts,
    weekAppts,
    monthAppts,
    upcomingAppts,
    recentCustomers,
  ] = await Promise.all([
    Bill.find({ createdAt: { $gte: new Date(today), $lt: new Date(today + "T23:59:59.999Z") } }).sort({ createdAt: -1 }),
    Customer.countDocuments(),
    CustomerMembership.countDocuments({ isActive: true }),
    CustomerMembership.countDocuments({ createdAt: { $gte: new Date(today), $lt: new Date(today + "T23:59:59.999Z") } }),
    Appointment.countDocuments({ status: { $in: ["scheduled", "confirmed"] }, appointmentDate: { $gte: today } }),
    Product.find({ isLowStock: true }).select("name stock minStock").lean(),
    Bill.find({ createdAt: { $gte: firstOfMonth } }),
    Expense.find({ createdAt: { $gte: firstOfMonth } }),
    Appointment.find({ appointmentDate: today }).sort({ appointmentTime: 1 }),
    Appointment.find({ appointmentDate: { $gte: weekStart, $lte: weekEnd } }).sort({ appointmentDate: 1, appointmentTime: 1 }),
    Appointment.find({ appointmentDate: { $gte: monthStart, $lte: monthEnd } }).sort({ appointmentDate: 1, appointmentTime: 1 }),
    Appointment.find({ appointmentDate: { $gte: today, $lte: nextWeek }, status: { $in: ["scheduled", "confirmed"] } }).sort({ appointmentDate: 1, appointmentTime: 1 }).limit(15),
    Customer.find().sort({ createdAt: -1 }).limit(6).lean(),
  ]);

  const todayRevenue = todayBillDocs.reduce((s, b) => s + b.finalAmount, 0);
  const todayBills = todayBillDocs.length;
  const todayCustomerIds = new Set(todayBillDocs.map((b) => b.customerId).filter(Boolean));
  const todayCustomers = todayCustomerIds.size + todayBillDocs.filter((b) => !b.customerId).length;
  const lowStockCount = (lowStockProducts as any[]).length;
  const monthRevenue = monthBillDocs.reduce((s, b) => s + b.finalAmount, 0);
  const monthExpenses = monthExpenseDocs.reduce((s, e) => s + (e.amount || 0), 0);

  // Top services this month
  const serviceRevMap: Record<string, { name: string; revenue: number; count: number }> = {};
  for (const bill of monthBillDocs) {
    for (const item of bill.items) {
      if (item.type === "service") {
        if (!serviceRevMap[item.itemId]) serviceRevMap[item.itemId] = { name: item.name, revenue: 0, count: 0 };
        serviceRevMap[item.itemId].revenue += item.total;
        serviceRevMap[item.itemId].count += item.quantity;
      }
    }
  }
  const topServices = Object.values(serviceRevMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Top products this month
  const productRevMap: Record<string, { name: string; revenue: number; count: number }> = {};
  for (const bill of monthBillDocs) {
    for (const item of bill.items) {
      if (item.type === "product") {
        if (!productRevMap[item.itemId]) productRevMap[item.itemId] = { name: item.name, revenue: 0, count: 0 };
        productRevMap[item.itemId].revenue += item.total;
        productRevMap[item.itemId].count += item.quantity;
      }
    }
  }
  const topProducts = Object.values(productRevMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Appointment status breakdown (this month)
  const apptStatusBreakdown: Record<string, number> = { scheduled: 0, confirmed: 0, completed: 0, cancelled: 0 };
  for (const a of monthAppts) {
    if (a.status in apptStatusBreakdown) apptStatusBreakdown[a.status]++;
  }

  // Staff performance this month
  const staffPerf: Record<string, { name: string; appointments: number; revenue: number }> = {};
  for (const a of monthAppts) {
    const sid = a.staffId?.toString();
    if (!sid) continue;
    if (!staffPerf[sid]) staffPerf[sid] = { name: (a as any).staffName || "Unknown", appointments: 0, revenue: 0 };
    staffPerf[sid].appointments++;
  }
  for (const bill of monthBillDocs) {
    for (const item of (bill.items || [])) {
      if (item.type === "service" && item.staffId) {
        const sid = item.staffId.toString();
        if (staffPerf[sid]) staffPerf[sid].revenue += item.total;
      }
    }
  }
  const staffPerformance = Object.values(staffPerf).sort((a, b) => b.revenue - a.revenue);

  // Payment method breakdown (this month)
  const paymentBreakdown: Record<string, { count: number; amount: number }> = {};
  for (const bill of monthBillDocs) {
    const payments = Array.isArray((bill as any).paymentBreakdown) && (bill as any).paymentBreakdown.length > 0
      ? (bill as any).paymentBreakdown
      : [{ method: bill.paymentMethod || "other", amount: bill.finalAmount }];
    for (const payment of payments) {
      const method = String(payment.method || "other").toLowerCase();
      if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, amount: 0 };
      paymentBreakdown[method].count++;
      paymentBreakdown[method].amount += Number(payment.amount) || 0;
    }
  }

  // Last 6 months revenue + expenses trend
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [sixMonthBills, sixMonthExpensesList] = await Promise.all([
    Bill.find({ createdAt: { $gte: sixMonthsAgo } }),
    Expense.find({ createdAt: { $gte: sixMonthsAgo } }),
  ]);

  const monthlyRevenueMap: Record<string, number> = {};
  for (const bill of sixMonthBills) {
    const key = format(new Date(bill.createdAt as any), "MMM yyyy");
    monthlyRevenueMap[key] = (monthlyRevenueMap[key] || 0) + bill.finalAmount;
  }
  const monthlyExpenseMap: Record<string, number> = {};
  for (const exp of sixMonthExpensesList) {
    const key = format(new Date(exp.createdAt as any), "MMM yyyy");
    monthlyExpenseMap[key] = (monthlyExpenseMap[key] || 0) + (exp.amount || 0);
  }

  const monthlyRevenue = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const key = format(d, "MMM yyyy");
    monthlyRevenue.push({
      month: format(d, "MMM"),
      revenue: monthlyRevenueMap[key] || 0,
      expenses: monthlyExpenseMap[key] || 0,
    });
  }

  const mapAppt = (a: any) => ({ ...a.toObject(), id: a._id.toString() });

  res.json({
    todayRevenue,
    todayBills,
    todayCustomers,
    totalCustomers,
    activeMembers,
    todayNewMembers,
    pendingAppointments,
    lowStockCount,
    lowStockProducts,
    monthRevenue,
    monthExpenses,
    topServices,
    topProducts,
    monthlyRevenue,
    paymentBreakdown,
    apptStatusBreakdown,
    staffPerformance,
    recentCustomers: (recentCustomers as any[]).map((c) => ({ ...c, id: c._id.toString() })),
    todayBillsList: todayBillDocs.map((b) => ({ ...b.toObject(), id: b._id.toString() })),
    todayAppointments: todayAppts.map(mapAppt),
    weekAppointments: weekAppts.map(mapAppt),
    monthAppointments: monthAppts.map(mapAppt),
    upcomingAppointments: upcomingAppts.map(mapAppt),
  });
});

export default router;
