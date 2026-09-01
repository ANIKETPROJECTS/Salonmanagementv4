import { Router } from "express";
import { format } from "date-fns";
import mongoose from "mongoose";
import { Customer, Appointment, Bill, CustomerMembership } from "../models/index.js";

const router = Router();

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeFamilyMember(member: any) {
  const serialized = { ...member.toObject(), id: member._id.toString() };
  if (typeof serialized.phone === "string" && serialized.phone.startsWith("FAM")) {
    serialized.phone = "";
  }
  return serialized;
}

async function checkNamePhoneUniqueness(
  name: string,
  phone: string,
  excludeId?: string
): Promise<string | null> {
  const excl = excludeId ? { _id: { $ne: excludeId } } : {};

  if (name) {
    const nameCustomer = await Customer.findOne({
      ...excl,
      name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
    });
    if (nameCustomer) return `A customer named "${name}" already exists.`;
  }

  if (phone) {
    const phoneCustomer = await Customer.findOne({ ...excl, phone });
    if (phoneCustomer)
      return `A customer with phone ${phone} already exists (${phoneCustomer.name}).`;
  }

  return null;
}

// One-time migration: convert familyMembers sub-docs to full Customer records
async function migrateFamilyMembersToCustomers() {
  const customersWithFamily = await Customer.find({
    familyMembers: { $exists: true, $not: { $size: 0 } },
  }).lean();

  let migrated = 0;

  for (const parent of customersWithFamily) {
    if (!parent.familyMembers || parent.familyMembers.length === 0) continue;

    for (let i = 0; i < parent.familyMembers.length; i++) {
      const member = parent.familyMembers[i] as any;
      if (!member.name) continue;

      // Check if already migrated
      const existing = await Customer.findOne({
        name: { $regex: `^${escapeRegex(member.name.trim())}$`, $options: "i" },
        familyOf: parent._id,
      });
      if (existing) continue;

      // Use member phone or generate unique placeholder
      let phone = (member.phone || "").trim();
      if (!phone || phone.length < 5) {
        phone = `FAM${(parent._id as any).toString().slice(-6)}${String(i).padStart(2, "0")}${Math.floor(Math.random() * 100)}`;
      }

      // Ensure phone is unique
      const phoneConflict = await Customer.findOne({ phone });
      if (phoneConflict) {
        phone = `FAM${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 100)}`;
      }

      try {
        const newCustomer = await Customer.create({
          name: member.name.trim(),
          phone,
          gender: member.gender || "",
          dob: member.dob || "",
          anniversary: member.anniversary || "",
          familyOf: parent._id,
          familyMembers: [],
        });

        // Re-link bills: bills stored under parent ID with this member's name
        const relinked = await Bill.updateMany(
          { customerId: (parent._id as any).toString(), customerName: member.name.trim() },
          { $set: { customerId: newCustomer._id.toString() } }
        );

        migrated++;
        console.log(
          `[migrate] "${member.name}" → Customer ${newCustomer._id} (relinked ${relinked.modifiedCount} bills)`
        );
      } catch (err: any) {
        console.warn(`[migrate] Skipped "${member.name}": ${err.message}`);
      }
    }

    // Clear the now-migrated sub-doc array
    await Customer.findByIdAndUpdate(parent._id, { $set: { familyMembers: [] } });
  }

  return migrated;
}

// Run migration once the DB connection is actually open (idempotent — skips
// already-migrated members). Running this at import time races the initial
// `connectMongo()` call and fails now that buffering is disabled.
function runMigrationWhenReady() {
  if (mongoose.connection.readyState === 1) {
    migrateFamilyMembersToCustomers().catch((e) =>
      console.warn("[migrate] family-members migration error:", e.message)
    );
  } else {
    mongoose.connection.once("connected", () => {
      migrateFamilyMembersToCustomers().catch((e) =>
        console.warn("[migrate] family-members migration error:", e.message)
      );
    });
  }
}

runMigrationWhenReady();

// ── Migrate endpoint (manual trigger) ─────────────────────────────────────────
router.post("/customers/migrate-family", async (_req, res) => {
  try {
    const count = await migrateFamilyMembersToCustomers();
    res.json({ success: true, migrated: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── List all customers ─────────────────────────────────────────────────────────
router.get("/customers", async (req, res) => {
  const { search } = req.query;

  // Always fetch all customers so we can correctly group family members under parents
  const allCustomers = await Customer.find({}).sort({ createdAt: -1 });

  // Separate top-level customers from family-linked ones
  const familyCustomers = allCustomers.filter((c) => c.familyOf);
  let topLevelCustomers = allCustomers.filter((c) => !c.familyOf);

  // Apply search: match top-level customers directly OR parents whose family members match
  if (search && typeof search === "string") {
    const s = search.toLowerCase();
    const directMatchIds = new Set(
      topLevelCustomers
        .filter((c) => c.name.toLowerCase().includes(s) || c.phone.includes(s))
        .map((c) => c._id.toString())
    );
    const parentIdsOfMatchingMembers = new Set(
      familyCustomers
        .filter((fc) => fc.name.toLowerCase().includes(s) || fc.phone.includes(s))
        .map((fc) => fc.familyOf!.toString())
    );
    topLevelCustomers = topLevelCustomers.filter(
      (c) => directMatchIds.has(c._id.toString()) || parentIdsOfMatchingMembers.has(c._id.toString())
    );
  }

  // Build familyMap: parentId → array of family Customer docs
  const familyMap: Record<string, any[]> = {};
  for (const fc of familyCustomers) {
    const pid = fc.familyOf!.toString();
    if (!familyMap[pid]) familyMap[pid] = [];
    familyMap[pid].push(fc);
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const allCustomerIds = allCustomers.map((c) => c._id.toString());

  const activeMemberships = await CustomerMembership.find({
    customerId: { $in: allCustomerIds },
    isActive: true,
    endDate: { $gte: today },
  });
  const membershipMap: Record<string, any> = {};
  for (const cm of activeMemberships) {
    membershipMap[cm.customerId] = { ...cm.toObject(), id: cm._id.toString() };
  }

  // Build parent membership map so family members without own membership can inherit
  const parentIdsForMem = [...new Set(familyCustomers.map((c) => c.familyOf!.toString()))];
  const parentMembershipMap: Record<string, any> = {};
  if (parentIdsForMem.length > 0) {
    const parentMems = await CustomerMembership.find({
      customerId: { $in: parentIdsForMem },
      isActive: true,
      endDate: { $gte: today },
    });
    for (const cm of parentMems) {
      parentMembershipMap[cm.customerId] = { ...cm.toObject(), id: cm._id.toString() };
    }
  }

  res.json({
    customers: topLevelCustomers.map((c) => {
      const cId = c._id.toString();
      const ownMembership = membershipMap[cId] || null;

      // Populate familyMembers with actual Customer records, each with their own membership
      const members = (familyMap[cId] || []).map((fm) => {
        const fmId = fm._id.toString();
        const fmOwnMem = membershipMap[fmId] || null;
        const fmParentMem = parentMembershipMap[cId] || null;
        return {
          ...serializeFamilyMember(fm),
          familyOfId: cId,
          activeMembership: fmOwnMem || fmParentMem,
        };
      });

      return {
        ...c.toObject(),
        id: cId,
        familyOfId: null,
        familyOfName: null,
        familyMembers: members,
        activeMembership: ownMembership,
      };
    }),
  });
});

// ── Create customer ────────────────────────────────────────────────────────────
router.post("/customers", async (req, res) => {
  const { name, phone, email, dob, anniversary, notes, gender, familyOf } = req.body;
  const trimmedName = (name || "").trim();
  const trimmedPhone = (phone || "").trim();

  const mainError = await checkNamePhoneUniqueness(trimmedName, trimmedPhone);
  if (mainError) return res.status(409).json({ error: mainError });

  const customer = await Customer.create({
    name: trimmedName,
    phone: trimmedPhone,
    email,
    dob,
    anniversary,
    notes,
    gender,
    familyOf: familyOf || null,
    familyMembers: [],
  });

  res.status(201).json({ ...customer.toObject(), id: customer._id.toString() });
});

// ── Add a family member as a full Customer record ──────────────────────────────
router.post("/customers/:customerId/family-member", async (req, res) => {
  const { customerId } = req.params;
  const { name, phone, gender, dob, anniversary } = req.body;

  const parent = await Customer.findById(customerId);
  if (!parent) return res.status(404).json({ error: "Parent customer not found" });

  const trimmedName = (name || "").trim();
  const trimmedPhone = (phone || "").trim();

  if (!trimmedName) return res.status(400).json({ error: "Name is required" });
  if (trimmedPhone && !/^\d{10}$/.test(trimmedPhone))
    return res.status(400).json({ error: "A valid 10-digit phone number is required" });

  const uniqueError = await checkNamePhoneUniqueness(trimmedName, trimmedPhone);
  if (uniqueError) return res.status(409).json({ error: uniqueError });

  const existingCount = await Customer.countDocuments({ familyOf: customerId });
  if (existingCount >= 4)
    return res.status(400).json({ error: "Maximum 4 family members allowed per customer" });

  // Customer.phone is globally unique and required, but family-member phone
  // numbers are optional in the UI. Keep an internal placeholder for members
  // without a phone and hide it from customer-facing responses.
  let memberPhone = trimmedPhone;
  if (!memberPhone) {
    do {
      memberPhone = `FAM${customerId.slice(-8)}${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
    } while (await Customer.exists({ phone: memberPhone }));
  }

  const member = await Customer.create({
    name: trimmedName,
    phone: memberPhone,
    gender: gender || "",
    dob: dob || "",
    anniversary: anniversary || "",
    familyOf: customerId,
    familyMembers: [],
  });

  res.status(201).json({ ...member.toObject(), id: member._id.toString() });
});

// ── Update customer ────────────────────────────────────────────────────────────
router.patch("/customers/:customerId", async (req, res) => {
  const { customerId } = req.params;
  const { name, phone, dob, anniversary, notes, email, gender, familyOf } = req.body;

  const trimmedName = (name || "").trim();
  const trimmedPhone = (phone || "").trim();

  if (trimmedName || trimmedPhone) {
    const mainError = await checkNamePhoneUniqueness(trimmedName, trimmedPhone, customerId);
    if (mainError) return res.status(409).json({ error: mainError });
  }

  const customer = await Customer.findByIdAndUpdate(
    customerId,
    {
      ...(name && { name }),
      ...(phone && { phone }),
      ...(dob !== undefined && { dob }),
      ...(anniversary !== undefined && { anniversary }),
      ...(notes !== undefined && { notes }),
      ...(email !== undefined && { email }),
      ...(gender !== undefined && { gender }),
      ...(familyOf !== undefined && { familyOf: familyOf || null }),
    },
    { new: true }
  );
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json({ ...customer.toObject(), id: customer._id.toString() });
});

// ── Delete customer ────────────────────────────────────────────────────────────
router.delete("/customers/:customerId", async (req, res) => {
  const { customerId } = req.params;
  const customer = await Customer.findByIdAndDelete(customerId);
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  // Collect family member IDs before deleting them
  const familyMembers = await Customer.find({ familyOf: customerId }).select("_id").lean();
  const familyIds = familyMembers.map((f: any) => f._id.toString());
  // Delete all family members
  await Customer.deleteMany({ familyOf: customerId });
  // Revoke all memberships for the customer and their family members
  await CustomerMembership.deleteMany({ customerId: { $in: [customerId.toString(), ...familyIds] } });
  res.status(204).send();
});

// ── Get single customer with bills, appointments, and family members ───────────
router.get("/customers/:customerId", async (req, res) => {
  const { customerId } = req.params;
  const customer = await Customer.findById(customerId);
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  const today = format(new Date(), "yyyy-MM-dd");

  const [bills, appointments, activeMembership, familyMemberCustomers] = await Promise.all([
    Bill.find({ customerId: customerId.toString() }).sort({ createdAt: -1 }),
    Appointment.find({
      $or: [{ customerId: customerId.toString() }, { customerPhone: customer.phone }],
    }).sort({ appointmentDate: -1 }),
    CustomerMembership.findOne({
      customerId: customerId.toString(),
      isActive: true,
      endDate: { $gte: today },
    }),
    Customer.find({ familyOf: customerId }, { name: 1, phone: 1, gender: 1, dob: 1, anniversary: 1, totalSpend: 1, totalVisits: 1 }),
  ]);

  const computedTotalSpend = bills.reduce((sum, b) => sum + (b.finalAmount || 0), 0);
  const computedTotalVisits = bills.length;
  const lastVisit = bills.length > 0 ? bills[0].createdAt : null;

  if (
    customer.totalSpend !== computedTotalSpend ||
    customer.totalVisits !== computedTotalVisits
  ) {
    await Customer.findByIdAndUpdate(customerId, {
      totalSpend: computedTotalSpend,
      totalVisits: computedTotalVisits,
    });
  }

  // If this is a family customer, get parent info
  let familyOfInfo: any = null;
  if (customer.familyOf) {
    const parentDoc = await Customer.findById(customer.familyOf, { name: 1, phone: 1 });
    if (parentDoc) familyOfInfo = { id: parentDoc._id.toString(), name: parentDoc.name };
  }

  // If this is a family customer without own membership, check parent's membership
  let resolvedMembership = activeMembership
    ? { ...activeMembership.toObject(), id: activeMembership._id.toString() }
    : null;

  if (!resolvedMembership && customer.familyOf) {
    const parentMem = await CustomerMembership.findOne({
      customerId: customer.familyOf.toString(),
      isActive: true,
      endDate: { $gte: today },
    });
    if (parentMem) resolvedMembership = { ...parentMem.toObject(), id: parentMem._id.toString() };
  }

  res.json({
    ...customer.toObject(),
    id: customer._id.toString(),
    familyOfId: customer.familyOf ? customer.familyOf.toString() : null,
    familyOfInfo,
    totalSpend: computedTotalSpend,
    totalVisits: computedTotalVisits,
    lastVisit,
    activeMembership: resolvedMembership,
    bills: bills.map((b) => ({ ...b.toObject(), id: b._id.toString() })),
    appointments: appointments.map((a) => ({ ...a.toObject(), id: a._id.toString() })),
    familyMembers: familyMemberCustomers.map(serializeFamilyMember),
  });
});

export default router;
