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

  const voucher = await CustomerVoucher.create({
    voucherCode: voucherCode(template.amount),
    templateId: template.id,
    amount: template.amount,
    customerId: customer._id.toString(),
    customerName: customer.name,
    issueDate,
    expiryDate,
    status: "assigned",
  });

  res.status(201).json(serializeVoucher(voucher));
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

router.get("/customer-vouchers/:voucherId", async (req, res) => {
  const voucher = await CustomerVoucher.findById(req.params.voucherId);
  if (!voucher) return res.status(404).json({ error: "Voucher not found" });
  res.json(serializeVoucher(voucher));
});

export default router;