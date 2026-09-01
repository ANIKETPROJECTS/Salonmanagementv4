import { Router } from "express";
import { Staff, Bill } from "../models/index.js";

const router = Router();

router.get("/staff", async (_req, res) => {
  const staff = await Staff.find().sort({ name: 1 });
  res.json({ staff: staff.map((s) => ({ ...s.toObject(), id: s._id.toString() })) });
});

router.post("/staff", async (req, res) => {
  const { name, specialization, commissionPercent, phone, gender } = req.body;
  const avatarInitials = name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const member = await Staff.create({
    name,
    specialization,
    commissionPercent: commissionPercent ?? 10,
    phone,
    gender: gender || "",
    avatarInitials,
  });
  res.status(201).json({ ...member.toObject(), id: member._id.toString() });
});

router.put("/staff/:staffId", async (req, res) => {
  const { staffId } = req.params;
  const { name, specialization, commissionPercent, phone, gender } = req.body;
  const member = await Staff.findById(staffId);
  if (!member) return res.status(404).json({ error: "Staff member not found" });
  const avatarInitials = (name || member.name)
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const updated = await Staff.findByIdAndUpdate(
    staffId,
    { name: name || member.name, specialization: specialization || member.specialization,
      commissionPercent: commissionPercent ?? member.commissionPercent,
      phone: phone !== undefined ? phone : member.phone,
      gender: gender !== undefined ? gender : (member.gender || ""),
      avatarInitials },
    { new: true }
  );
  res.json({ ...updated!.toObject(), id: updated!._id.toString() });
});

router.delete("/staff/:staffId", async (req, res) => {
  const { staffId } = req.params;
  const member = await Staff.findById(staffId);
  if (!member) return res.status(404).json({ error: "Staff member not found" });
  await Staff.findByIdAndDelete(staffId);
  res.json({ success: true });
});

router.get("/staff/:staffId/work-history", async (req, res) => {
  const { staffId } = req.params;
  const bills = await Bill.find({ "items.staffId": staffId }).sort({ createdAt: -1 });
  const history = bills.map((bill: any) => {
    const assignedItems = bill.items.filter((item: any) => item.staffId?.toString() === staffId);
    return {
      billId: bill._id.toString(),
      billNumber: bill.billNumber,
      date: bill.createdAt,
      customerName: bill.customerName,
      items: assignedItems.map((item: any) => ({
        name: item.name,
        type: item.type,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
        total: item.total,
      })),
      totalEarned: assignedItems.reduce((acc: number, item: any) => acc + (item.total || 0), 0),
      paymentMethod: bill.paymentMethod,
      paymentBreakdown: bill.paymentBreakdown || [{ method: bill.paymentMethod || "cash", amount: bill.finalAmount || 0 }],
      customerPhone: bill.customerPhone || "",
    };
  });
  res.json({ history });
});

export default router;
