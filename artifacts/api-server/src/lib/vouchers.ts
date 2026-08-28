import { addMonths, format, isValid, parseISO } from "date-fns";

export const VOUCHER_TEMPLATES = [
  {
    id: "gift-500",
    name: "₹500 Gift Voucher",
    amount: 500,
    frontImage: "/vouchers/voucher-500.png",
    termsImage: "/vouchers/voucher-terms.png",
  },
  {
    id: "gift-200",
    name: "₹200 Gift Voucher",
    amount: 200,
    frontImage: "/vouchers/voucher-200.png",
    termsImage: "/vouchers/voucher-terms.png",
  },
] as const;

export const VOUCHER_TERMS = [
  "Valid only on a minimum bill value of ₹1000",
  "Applicable only on salon services and not on products",
  "Cannot club with any other offers",
  "This is a one-time use voucher",
  "Prior appointment is a must for a waiting-free experience",
  "This voucher expires 1 month from the date of issue",
  "Non-refundable and cannot be exchanged for cash in part or full; valid for a single transaction only",
  "We reserve the right to vary/amend the privileges or T&C without prior notice",
];

export function getVoucherTemplate(templateId: string) {
  return VOUCHER_TEMPLATES.find((template) => template.id === templateId);
}

export function getVoucherExpiryDate(issueDate: string) {
  const parsed = parseISO(issueDate);
  if (!isValid(parsed) || !/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) return null;
  return format(addMonths(parsed, 1), "yyyy-MM-dd");
}

export function todayDate() {
  return format(new Date(), "yyyy-MM-dd");
}

export function serializeVoucher(voucher: any) {
  const template = getVoucherTemplate(voucher.templateId);
  return {
    ...voucher.toObject(),
    id: voucher._id.toString(),
    templateName: template?.name || `${voucher.amount} Gift Voucher`,
    frontImage: template?.frontImage || "",
    termsImage: template?.termsImage || "",
    terms: VOUCHER_TERMS,
    available:
      voucher.status === "assigned" &&
      voucher.issueDate <= todayDate() &&
      voucher.expiryDate >= todayDate(),
  };
}