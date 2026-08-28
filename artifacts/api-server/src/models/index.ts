import mongoose, { Schema, Document } from "mongoose";

// ── Customer ──────────────────────────────────────────────
export interface IFamilyMember {
  name: string;
  gender?: string;
  phone?: string;
  dob?: string;
  anniversary?: string;
}

export interface ICustomer extends Document {
  name: string;
  phone: string;
  email?: string;
  dob?: string;
  anniversary?: string;
  notes?: string;
  gender?: string;
  familyOf?: mongoose.Types.ObjectId | string | null;
  familyMembers?: IFamilyMember[];
  totalSpend: number;
  totalVisits: number;
  createdAt: Date;
}

const FamilyMemberSchema = new Schema<IFamilyMember>(
  {
    name: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", ""], default: "" },
    phone: String,
    dob: String,
    anniversary: String,
  },
  { _id: false }
);

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: String,
    dob: String,
    anniversary: String,
    notes: String,
    gender: { type: String, enum: ["male", "female", ""], default: "" },
    familyOf: { type: Schema.Types.ObjectId, ref: "Customer", default: null },
    familyMembers: { type: [FamilyMemberSchema], default: [] },
    totalSpend: { type: Number, default: 0 },
    totalVisits: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Customer =
  mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);

// ── Staff ─────────────────────────────────────────────────
export interface IStaff extends Document {
  name: string;
  specialization: string;
  commissionPercent: number;
  phone?: string;
  gender?: string;
  avatarInitials: string;
}

const StaffSchema = new Schema<IStaff>({
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  commissionPercent: { type: Number, default: 10 },
  phone: String,
  gender: { type: String, enum: ["male", "female", ""], default: "" },
  avatarInitials: String,
});

export const Staff =
  mongoose.models.Staff || mongoose.model<IStaff>("Staff", StaffSchema);

// ── Service ───────────────────────────────────────────────
export interface IServiceTypeVariant {
  name: string;
  price: number;
  memberDiscount: number;
  memberPrice: number;
}

export interface IService extends Document {
  name: string;
  category: string;
  types: IServiceTypeVariant[];
  price: number;
  memberDiscount: number;
  memberPrice: number;
}

const TypeVariantSchema = new Schema<IServiceTypeVariant>({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  memberDiscount: { type: Number, default: 20 },
  memberPrice: { type: Number, default: 0 },
}, { _id: false });

const ServiceSchema = new Schema<IService>({
  name: { type: String, required: true },
  category: { type: String, required: true },
  types: { type: [TypeVariantSchema], default: [] },
  price: { type: Number, default: 0 },
  memberDiscount: { type: Number, default: 20 },
  memberPrice: { type: Number, default: 0 },
});

export const Service =
  mongoose.models.Service ||
  mongoose.model<IService>("Service", ServiceSchema);

// ── ProductMeta ───────────────────────────────────────────
export interface IProductMeta extends Document {
  categories: string[];
  brands: string[];
}

const ProductMetaSchema = new Schema<IProductMeta>({
  categories: { type: [String], default: [] },
  brands: { type: [String], default: [] },
});

export const ProductMeta =
  mongoose.models.ProductMeta ||
  mongoose.model<IProductMeta>("ProductMeta", ProductMetaSchema);

// ── Product ───────────────────────────────────────────────
export interface IProduct extends Document {
  name: string;
  category: string;
  brand?: string;
  description?: string;
  stockQuantity: number;
  costPrice?: number;
  sellingPrice: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  dateAdded?: Date;
  expiryDate?: string;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    brand: String,
    description: String,
    stockQuantity: { type: Number, default: 0 },
    costPrice: Number,
    sellingPrice: { type: Number, required: true },
    lowStockThreshold: { type: Number, default: 5 },
    isLowStock: { type: Boolean, default: false },
    expiryDate: String,
  },
  { timestamps: true }
);

export const Product =
  mongoose.models.Product ||
  mongoose.model<IProduct>("Product", ProductSchema);

// ── Appointment ───────────────────────────────────────────
export interface IServiceItem {
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  duration: number;
}

export interface IAppointment extends Document {
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  staffId: string;
  staffName: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  duration: number;
  services: IServiceItem[];
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  notes?: string;
  createdAt: Date;
}

const ServiceItemSchema = new Schema<IServiceItem>(
  { serviceId: String, serviceName: String, serviceCategory: String, duration: Number },
  { _id: false }
);

const AppointmentSchema = new Schema<IAppointment>(
  {
    customerId: String,
    customerName: { type: String, default: "Walk-in" },
    customerPhone: String,
    staffId: { type: String, required: true },
    staffName: { type: String, required: true },
    serviceId: { type: String, default: "" },
    serviceName: { type: String, default: "" },
    serviceCategory: { type: String, default: "General" },
    duration: { type: Number, default: 30 },
    services: { type: [ServiceItemSchema], default: [] },
    appointmentDate: { type: String, required: true },
    appointmentTime: { type: String, required: true },
    status: { type: String, default: "scheduled" },
    notes: String,
  },
  { timestamps: true }
);

export const Appointment =
  mongoose.models.Appointment ||
  mongoose.model<IAppointment>("Appointment", AppointmentSchema);

// ── Bill ──────────────────────────────────────────────────
export interface IBillItem {
  type: string;
  itemId: string;
  name: string;
  staffId?: string;
  staffName?: string;
  price: number;
  quantity: number;
  discount: number;
  total: number;
  isUpgradation?: boolean;
}

export interface IBill extends Document {
  billNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: IBillItem[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discountAmount: number;
  voucherId?: string;
  voucherCode?: string;
  voucherAmount?: number;
  finalAmount: number;
  paymentMethod: string;
  status: string;
  notes?: string;
  createdAt: Date;
}

const BillItemSchema = new Schema<IBillItem>(
  {
    type: String,
    itemId: String,
    name: String,
    staffId: String,
    staffName: String,
    price: Number,
    quantity: Number,
    discount: Number,
    total: Number,
    isUpgradation: { type: Boolean, default: false },
  },
  { _id: false }
);

const BillSchema = new Schema<IBill>(
  {
    billNumber: String,
    customerId: String,
    customerName: { type: String, default: "Walk-in" },
    customerPhone: String,
    items: [BillItemSchema],
    subtotal: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    voucherId: String,
    voucherCode: String,
    voucherAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    paymentMethod: { type: String, default: "cash" },
    status: { type: String, default: "paid" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Bill =
  mongoose.models.Bill || mongoose.model<IBill>("Bill", BillSchema);

// ── Expense ───────────────────────────────────────────────
export interface IExpense extends Document {
  category: string;
  description?: string;
  amount: number;
  date: string;
  createdAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    category: { type: String, required: true },
    description: String,
    amount: { type: Number, required: true },
    date: { type: String, required: true },
  },
  { timestamps: true }
);

export const Expense =
  mongoose.models.Expense ||
  mongoose.model<IExpense>("Expense", ExpenseSchema);

// ── Membership ────────────────────────────────────────────
export interface IMembership extends Document {
  name: string;
  price: number;
  duration: number;
  benefits: string;
  discountPercent: number;
}

const MembershipSchema = new Schema<IMembership>({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  duration: { type: Number, required: true },
  benefits: { type: String, default: "" },
  discountPercent: { type: Number, default: 0 },
});

export const Membership =
  mongoose.models.Membership ||
  mongoose.model<IMembership>("Membership", MembershipSchema);

// ── CustomerMembership ────────────────────────────────────
export interface ICustomerMembership extends Document {
  customerId: string;
  customerName: string;
  membershipId: string;
  membershipName: string;
  price: number;
  discountPercent: number;
  benefits: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: Date;
}

const CustomerMembershipSchema = new Schema<ICustomerMembership>(
  {
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    membershipId: { type: String, required: true },
    membershipName: { type: String, required: true },
    price: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    benefits: { type: String, default: "" },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const CustomerMembership =
  mongoose.models.CustomerMembership ||
  mongoose.model<ICustomerMembership>("CustomerMembership", CustomerMembershipSchema);

// ── Customer Voucher ────────────────────────────────────────
export type CustomerVoucherStatus = "assigned" | "redeemed" | "expired" | "revoked";

export interface ICustomerVoucher extends Document {
  voucherCode: string;
  templateId: string;
  amount: number;
  customerId: string;
  customerName: string;
  issueDate: string;
  expiryDate: string;
  status: CustomerVoucherStatus;
  redeemedBillId?: string;
  redeemedAt?: Date;
  createdAt: Date;
}

const CustomerVoucherSchema = new Schema<ICustomerVoucher>(
  {
    voucherCode: { type: String, required: true, unique: true },
    templateId: { type: String, required: true },
    amount: { type: Number, required: true },
    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    issueDate: { type: String, required: true },
    expiryDate: { type: String, required: true },
    status: { type: String, enum: ["assigned", "redeemed", "expired", "revoked"], default: "assigned", index: true },
    redeemedBillId: String,
    redeemedAt: Date,
  },
  { timestamps: true }
);
CustomerVoucherSchema.index(
  { customerId: 1, templateId: 1 },
  { unique: true, partialFilterExpression: { status: "assigned" } }
);

export const CustomerVoucher =
  mongoose.models.CustomerVoucher ||
  mongoose.model<ICustomerVoucher>("CustomerVoucher", CustomerVoucherSchema);
