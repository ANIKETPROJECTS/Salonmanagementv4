import { Router } from "express";
import { Bill, Customer, CustomerVoucher, Appointment } from "../models/index.js";
import { todayDate } from "../lib/vouchers.js";

const router = Router();
const PAYMENT_METHOD_IDS = new Set(["cash", "upi", "card", "wallet"]);

function normalizePaymentData(
  rawBreakdown: unknown,
  fallbackMethod: unknown,
  total: number,
): { paymentMethod: string; paymentBreakdown: { method: string; amount: number }[]; error?: string } {
  if (Array.isArray(rawBreakdown) && rawBreakdown.length > 0) {
    const paymentBreakdown = rawBreakdown.map((entry: any) => ({
      method: String(entry?.method || "").toLowerCase(),
      amount: Number(entry?.amount),
    }));
    if (paymentBreakdown.some((entry) => !PAYMENT_METHOD_IDS.has(entry.method) || !Number.isFinite(entry.amount) || entry.amount < 0)) {
      return { paymentMethod: "cash", paymentBreakdown: [], error: "Each payment must use a valid method and a non-negative amount." };
    }
    if (new Set(paymentBreakdown.map((entry) => entry.method)).size !== paymentBreakdown.length) {
      return { paymentMethod: "cash", paymentBreakdown: [], error: "Each payment method can only be added once." };
    }
    const paidTotal = paymentBreakdown.reduce((sum, entry) => sum + entry.amount, 0);
    if (Math.abs(paidTotal - total) > 0.01) {
      return { paymentMethod: "cash", paymentBreakdown: [], error: `Payment amounts must add up to ₹${Math.round(total).toLocaleString("en-IN")}.` };
    }
    return {
      paymentMethod: paymentBreakdown.length > 1 ? "multiple" : paymentBreakdown[0].method,
      paymentBreakdown,
    };
  }

  const method = String(fallbackMethod || "cash").toLowerCase();
  const safeMethod = PAYMENT_METHOD_IDS.has(method) ? method : "cash";
  return {
    paymentMethod: safeMethod,
    paymentBreakdown: [{ method: safeMethod, amount: Math.max(0, total) }],
  };
}

// Generate sequential bill number: TT{YYYYMMDD}-{seq}, sequence resets daily.
// Uses the highest existing sequence for today to avoid duplicates caused by
// deleted bills (count gaps) or pre-existing data in the database.
async function generateBillNumber(): Promise<string> {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;
  const prefix = `TT${dateStr}-`;

  // Find the last bill issued today (sorted descending by billNumber string)
  const lastBill = await Bill.findOne(
    { billNumber: { $regex: `^${prefix}` } },
    { billNumber: 1 },
  ).sort({ billNumber: -1 });

  let nextSeq = 1;
  if (lastBill?.billNumber) {
    const parts = lastBill.billNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(2, "0")}`;
}

// GET /api/service-stylist-stats — top stylist per service (appointments + bills combined)
router.get("/service-stylist-stats", async (_req, res) => {
  const stats: Record<string, Record<string, { staffName: string; count: number }>> = {};

  function tally(svcName: string, staffId: string, staffName: string) {
    if (!svcName || !staffId || !staffName) return;
    if (!stats[svcName]) stats[svcName] = {};
    if (!stats[svcName][staffId]) stats[svcName][staffId] = { staffName, count: 0 };
    stats[svcName][staffId].count++;
  }

  // ── Source 1: Appointments (staffId + serviceName per appointment) ──
  const appointments = await Appointment.find(
    { staffId: { $exists: true, $ne: "" } },
    { staffId: 1, staffName: 1, serviceName: 1, services: 1 }
  ).lean();

  for (const appt of appointments) {
    const a = appt as any;
    // Each appointment may have a primary serviceName or an array of services
    if (Array.isArray(a.services) && a.services.length > 0) {
      for (const svc of a.services) {
        tally(svc.serviceName, a.staffId, a.staffName);
      }
    } else if (a.serviceName) {
      tally(a.serviceName, a.staffId, a.staffName);
    }
  }

  // ── Source 2: Bills (items with staffId of type service) ──
  const bills = await Bill.find({ "items.staffId": { $exists: true, $ne: null } }).lean();
  for (const bill of bills) {
    for (const item of (bill as any).items || []) {
      if (item.type !== "service" || !item.staffId || !item.name) continue;
      tally(item.name, item.staffId.toString(), item.staffName || "");
    }
  }

  // ── Also aggregate counts by base service name (before " — " separator) ──
  // Appointments store full variant names like "HAIRCUT (Male) — Hair Cut Men"
  // but POS service cards use only the parent name "HAIRCUT (Male)".
  const baseStats: Record<string, Record<string, { staffName: string; count: number }>> = {};
  for (const [svcName, staffMap] of Object.entries(stats)) {
    const baseName = svcName.includes(" — ") ? svcName.split(" — ")[0].trim() : svcName.trim();
    if (!baseStats[baseName]) baseStats[baseName] = {};
    for (const [staffId, { staffName, count }] of Object.entries(staffMap)) {
      if (!baseStats[baseName][staffId]) baseStats[baseName][staffId] = { staffName, count: 0 };
      baseStats[baseName][staffId].count += count;
    }
  }

  // ── Pick top stylist per service (both full-variant and base name keys) ──
  const result: Record<string, { staffId: string; staffName: string; count: number }> = {};
  const pickTop = (staffMap: Record<string, { staffName: string; count: number }>) => {
    let topStaffId = "", topStaffName = "", topCount = 0;
    for (const [staffId, { staffName, count }] of Object.entries(staffMap)) {
      if (count > topCount) { topCount = count; topStaffId = staffId; topStaffName = staffName; }
    }
    return { staffId: topStaffId, staffName: topStaffName, count: topCount };
  };
  // Full variant keys (for exact matches)
  for (const [svcName, staffMap] of Object.entries(stats)) {
    result[svcName] = pickTop(staffMap);
  }
  // Base name keys (for POS card lookups — will overwrite if same key, which is fine)
  for (const [baseName, staffMap] of Object.entries(baseStats)) {
    result[baseName] = pickTop(staffMap);
  }
  res.json({ stats: result });
});

router.get("/bills", async (req, res) => {
  const { customerId, from, to, paymentMethod } = req.query as Record<string, string>;
  const query: Record<string, any> = {};
  if (customerId) query.customerId = customerId;
  if (paymentMethod) {
    query.$or = [
      { paymentMethod },
      { paymentBreakdown: { $elemMatch: { method: paymentMethod } } },
    ];
  }
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = toDate;
    }
  }
  const bills = await Bill.find(query).sort({ createdAt: -1 }).limit(500);
  res.json({
    bills: bills.map((b) => ({ ...b.toObject(), id: b._id.toString() })),
  });
});

router.get("/bills/:billId", async (req, res) => {
  const { billId } = req.params;
  const bill = await Bill.findById(billId);
  if (!bill) return res.status(404).json({ error: "Bill not found" });
  res.json({ ...bill.toObject(), id: bill._id.toString() });
});

router.put("/bills/:billId", async (req, res) => {
  const { billId } = req.params;
  const bill = await Bill.findById(billId);
  if (!bill) return res.status(404).json({ error: "Bill not found" });

  const {
    customerId,
    customerName,
    customerPhone,
    items,
    subtotal,
    taxPercent,
    taxAmount,
    discountAmount,
    finalAmount,
    paymentMethod,
    paymentBreakdown,
    status,
    notes,
  } = req.body;
  const normalizedPayment = normalizePaymentData(paymentBreakdown, paymentMethod, Number(finalAmount) || 0);
  if (normalizedPayment.error) return res.status(400).json({ error: normalizedPayment.error });

  // Reverse old customer stats, apply new ones
  if (bill.customerId) {
    await Customer.findByIdAndUpdate(bill.customerId, {
      $inc: { totalSpend: -(bill.finalAmount || 0), totalVisits: -1 },
    });
  }

  await Bill.findByIdAndUpdate(billId, {
    customerId: customerId || undefined,
    customerName: customerName || "Walk-in",
    customerPhone: customerPhone || "",
    items: items || [],
    subtotal: subtotal || 0,
    taxPercent: taxPercent || 0,
    taxAmount: taxAmount || 0,
    discountAmount: discountAmount || 0,
    finalAmount,
    paymentMethod: normalizedPayment.paymentMethod,
    paymentBreakdown: normalizedPayment.paymentBreakdown,
    status: status || "paid",
    notes: notes || "",
  });

  if (customerId) {
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { totalSpend: finalAmount, totalVisits: 1 },
    });
  }

  const updated = await Bill.findById(billId);
  res.json({ ...updated!.toObject(), id: updated!._id.toString() });
});

router.delete("/bills/:billId", async (req, res) => {
  const { billId } = req.params;
  const bill = await Bill.findById(billId);
  if (!bill) return res.status(404).json({ error: "Bill not found" });

  // Reverse the customer totalSpend and totalVisits if this bill was linked to a customer
  if (bill.customerId) {
    await Customer.findByIdAndUpdate(bill.customerId, {
      $inc: { totalSpend: -bill.finalAmount, totalVisits: -1 },
    });
  }

  await Bill.findByIdAndDelete(billId);
  res.json({ success: true });
});

router.post("/bills", async (req, res) => {
  const {
    customerId,
    customerName,
    customerPhone,
    items,
    subtotal,
    taxPercent,
    taxAmount,
    discountAmount,
    finalAmount,
    paymentMethod,
    paymentBreakdown,
    status,
    notes,
    voucherId,
  } = req.body;

  const billNumber = await generateBillNumber();

  const billItems = Array.isArray(items) ? items : [];
  let appliedVoucher: any = null;
  let voucherAmount = 0;
  let voucherReserved = false;

  try {
    if (voucherId) {
      if (!customerId) {
        return res.status(400).json({ error: "A voucher can only be used by a registered customer." });
      }

      if (billItems.some((item: any) => item.type === "membership")) {
        return res.status(400).json({ error: "A voucher cannot be combined with a membership purchase." });
      }

      const hasOtherDiscount = billItems.some((item: any) => Number(item.discount) > 0) || Number(discountAmount) > 0;
      if (hasOtherDiscount) {
        return res.status(400).json({ error: "This voucher cannot be combined with another offer or discount." });
      }

      const serviceGross = billItems
        .filter((item: any) => item.type === "service")
        .reduce((sum: number, item: any) => sum + Math.max(0, Number(item.price) || 0) * Math.max(1, Number(item.quantity) || 1), 0);

      if (serviceGross < 1000) {
        return res.status(400).json({ error: "A voucher requires at least ₹1,000 in salon services." });
      }

      const today = todayDate();
      const candidate = await CustomerVoucher.findOne({
        _id: voucherId,
        customerId: String(customerId),
        status: "assigned",
      });
      if (!candidate) {
        return res.status(409).json({ error: "This voucher is unavailable or has already been used." });
      }
      if (candidate.issueDate > today) {
        return res.status(400).json({ error: "This voucher is not valid before its issue date." });
      }
      if (candidate.expiryDate < today) {
        await CustomerVoucher.findByIdAndUpdate(candidate._id, { status: "expired" });
        return res.status(400).json({ error: "This voucher has expired." });
      }

      appliedVoucher = await CustomerVoucher.findOneAndUpdate(
        {
          _id: voucherId,
          customerId: String(customerId),
          status: "assigned",
          issueDate: { $lte: today },
          expiryDate: { $gte: today },
        },
        {
          $set: {
            status: "redeemed",
            redeemedAt: new Date(),
          },
        },
        { new: true }
      );
      if (!appliedVoucher) {
        return res.status(409).json({ error: "This voucher was just used or is no longer available." });
      }
      voucherReserved = true;
      voucherAmount = Math.min(Number(appliedVoucher.amount) || 0, serviceGross);
    }

    let computedSubtotal = Number(subtotal) || 0;
    let computedTaxAmount = Number(taxAmount) || 0;
    let computedFinalAmount = Number(finalAmount) || 0;
    let safeDiscountAmount = Number(discountAmount) || 0;

    // Keep the existing client-side calculation for ordinary bills. Voucher
    // bills are recalculated here so the flat voucher amount cannot be forged.
    if (appliedVoucher) {
      const grossSubtotal = billItems.reduce(
        (sum: number, item: any) => sum + Math.max(0, Number(item.price) || 0) * Math.max(1, Number(item.quantity) || 1),
        0
      );
      const itemDiscountTotal = billItems.reduce((sum: number, item: any) => sum + Math.max(0, Number(item.discount) || 0), 0);
      safeDiscountAmount = Math.min(Math.max(0, Number(discountAmount) || 0), Math.max(0, grossSubtotal - itemDiscountTotal));
      computedSubtotal = Math.max(0, grossSubtotal - itemDiscountTotal);
      const computedTaxBase = Math.max(0, computedSubtotal - safeDiscountAmount - voucherAmount);
      computedTaxAmount = (computedTaxBase * Math.max(0, Number(taxPercent) || 0)) / 100;
      computedFinalAmount = Math.round(computedTaxBase + computedTaxAmount);
    }

    const normalizedPayment = normalizePaymentData(paymentBreakdown, paymentMethod, computedFinalAmount);
    if (normalizedPayment.error) {
      const paymentError: any = new Error(normalizedPayment.error);
      paymentError.statusCode = 400;
      throw paymentError;
    }

    const bill = await Bill.create({
      billNumber,
      customerId: customerId || undefined,
      customerName: customerName || "Walk-in",
      customerPhone: customerPhone || "",
      items: billItems,
      subtotal: computedSubtotal,
      taxPercent: Math.max(0, Number(taxPercent) || 0),
      taxAmount: computedTaxAmount,
      discountAmount: safeDiscountAmount,
      voucherId: appliedVoucher?._id?.toString(),
      voucherCode: appliedVoucher?.voucherCode,
      voucherAmount,
      finalAmount: computedFinalAmount,
      paymentMethod: normalizedPayment.paymentMethod,
      paymentBreakdown: normalizedPayment.paymentBreakdown,
      status: status || "paid",
      notes: notes || "",
    });

    if (appliedVoucher) {
      await CustomerVoucher.findByIdAndUpdate(appliedVoucher._id, {
        redeemedBillId: bill._id.toString(),
      });
    }

    // Update customer totalSpend and totalVisits if linked
    if (customerId) {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { totalSpend: computedFinalAmount, totalVisits: 1 },
      });
    }

    res.status(201).json({ ...bill.toObject(), id: bill._id.toString(), billNumber });
  } catch (error: any) {
    if (voucherReserved && appliedVoucher) {
      await CustomerVoucher.findOneAndUpdate(
        { _id: appliedVoucher._id, status: "redeemed", redeemedBillId: { $exists: false } },
        { $set: { status: "assigned" }, $unset: { redeemedAt: 1 } }
      ).catch(() => {});
    }
    res.status(error?.statusCode || 500).json({ error: error?.message || "Failed to create bill" });
  }
});

export default router;
