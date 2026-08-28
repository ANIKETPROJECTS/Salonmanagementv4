import { Router } from "express";
import { randomUUID } from "node:crypto";
import { Customer, CustomerVoucher } from "../models/index.js";
import {
  getVoucherExpiryDate,
  getVoucherTemplate,
  serializeVoucher,
  todayDate,
  VOUCHER_TEMPLATES,
  VOUCHER_TERMS,
} from "../lib/vouchers.js";

const router = Router();

function voucherCode(amount: number) {
  return `TT-${amount}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

router.get("/customer-vouchers/templates", (_req, res) => {
  res.json({ templates: VOUCHER_TEMPLATES, terms: VOUCHER_TERMS });
});

router.post("/customer-vouchers", async (req, res) => {
  const { customerId, templateId, issueDate } = req.body;
  const template = getVoucherTemplate(String(templateId || ""));

  if (!customerId || !template) {
    return res.status(400).json({ error: "A customer and a valid voucher must be selected." });
  }

  const expiryDate = getVoucherExpiryDate(String(issueDate || ""));
  if (!expiryDate) {
    return res.status(400).json({ error: "Issue date must be a valid date." });
  }

  const customer = await Customer.findById(customerId);
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  const normalizedCustomerId = customer._id.toString();
  const today = todayDate();

  // An expired assignment should not block a new assignment of the same
  // template, even if its status has not been opened in the UI yet.
  await CustomerVoucher.updateMany(
    { customerId: normalizedCustomerId, templateId: template.id, status: "assigned", expiryDate: { $lt: today } },
    { $set: { status: "expired" } }
  );

  const existingActive = await CustomerVoucher.findOne({
    customerId: normalizedCustomerId,
    templateId: template.id,
    status: "assigned",
    issueDate: { $lte: today },
    expiryDate: { $gte: today },
  });
  if (existingActive) {
    return res.status(409).json({
      error: `${template.name} is already active for ${customer.name}.`,
      existingVoucher: serializeVoucher(existingActive),
    });
  }

  let voucher;
  try {
    voucher = await CustomerVoucher.create({
      voucherCode: voucherCode(template.amount),
      templateId: template.id,
      amount: template.amount,
      customerId: normalizedCustomerId,
      customerName: customer.name,
      issueDate,
      expiryDate,
      status: "assigned",
    });
  } catch (error: any) {
    // The schema's partial unique index also protects against two assignment
    // requests arriving at exactly the same time.
    if (error?.code === 11000) {
      return res.status(409).json({ error: `${template.name} is already active for ${customer.name}.` });
    }
    throw error;
  }

  res.status(201).json(serializeVoucher(voucher));
});

router.get("/customer-vouchers", async (_req, res) => {
  const today = todayDate();
  await CustomerVoucher.updateMany(
    { status: "assigned", expiryDate: { $lt: today } },
    { $set: { status: "expired" } }
  );
  const vouchers = await CustomerVoucher.find().sort({ createdAt: -1 });
  res.json({ vouchers: vouchers.map(serializeVoucher) });
});

router.get("/customer-vouchers/customer/:customerId", async (req, res) => {
  const { customerId } = req.params;
  const today = todayDate();

  await CustomerVoucher.updateMany(
    { customerId, status: "assigned", expiryDate: { $lt: today } },
    { $set: { status: "expired" } }
  );

  const vouchers = await CustomerVoucher.find({ customerId }).sort({ createdAt: -1 });
  res.json({ vouchers: vouchers.map(serializeVoucher) });
});

router.post("/customer-vouchers/:voucherId/revoke", async (req, res) => {
  const voucher = await CustomerVoucher.findOneAndUpdate(
    { _id: req.params.voucherId, status: "assigned" },
    { $set: { status: "revoked" } },
    { new: true }
  );
  if (!voucher) {
    return res.status(409).json({ error: "Only an active assigned voucher can be revoked." });
  }
  res.json(serializeVoucher(voucher));
});

router.patch("/customer-vouchers/:voucherId", async (req, res) => {
  const issueDate = String(req.body?.issueDate || "");
  const expiryDate = getVoucherExpiryDate(issueDate);
  if (!expiryDate) {
    return res.status(400).json({ error: "Issue date must be a valid date." });
  }

  const existing = await CustomerVoucher.findById(req.params.voucherId);
  if (!existing) return res.status(404).json({ error: "Voucher not found" });
  if (!["assigned", "expired"].includes(existing.status)) {
    return res.status(409).json({ error: "Only assigned or expired vouchers can have their issue date edited." });
  }

  const today = todayDate();
  const becomesActive = issueDate <= today && expiryDate >= today;
  if (becomesActive) {
    const duplicate = await CustomerVoucher.findOne({
      _id: { $ne: existing._id },
      customerId: existing.customerId,
      templateId: existing.templateId,
      status: "assigned",
      issueDate: { $lte: today },
      expiryDate: { $gte: today },
    });
    if (duplicate) {
      return res.status(409).json({
        error: `${getVoucherTemplate(existing.templateId)?.name || "This voucher"} is already active for ${existing.customerName}.`,
      });
    }
  }

  try {
    const voucher = await CustomerVoucher.findOneAndUpdate(
      { _id: existing._id, status: { $in: ["assigned", "expired"] } },
      { $set: { issueDate, expiryDate, status: becomesActive || issueDate > today ? "assigned" : "expired" } },
      { new: true }
    );
    if (!voucher) return res.status(409).json({ error: "This voucher can no longer be edited." });
    res.json(serializeVoucher(voucher));
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: "This customer already has an active voucher of the same type." });
    }
    throw error;
  }
});

router.get("/customer-vouchers/:voucherId", async (req, res) => {
  const voucher = await CustomerVoucher.findById(req.params.voucherId);
  if (!voucher) return res.status(404).json({ error: "Voucher not found" });
  res.json(serializeVoucher(voucher));
});

export default router;