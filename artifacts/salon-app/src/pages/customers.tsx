import { useState, useMemo, useEffect } from "react";
import { useListCustomers, useListMemberships } from "@workspace/api-client-react";
import { Search, Plus, User, Phone, Calendar, Eye, Pencil, Trash2, X, Scissors, Package, FileText, BadgeCheck, Users, ChevronDown, ChevronUp, Crown, Ticket, Gift } from "lucide-react";
import { format, addMonths, subDays, parseISO } from "date-fns";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { InvoiceModal } from "@/components/InvoiceModal";

const API_BASE = "/api";
const PAGE_SIZE = 10;
const MAX_FAMILY = 4;

type SortKey = "default" | "most-spent" | "least-spent" | "most-visits" | "least-visits";
type GenderFilter = "all" | "male" | "female";

type FamilyMember = { name: string; gender: string; phone: string; dob: string; anniversary: string };
const EMPTY_MEMBER: FamilyMember = { name: "", gender: "", phone: "", dob: "", anniversary: "" };

function GenderToggle({ value, onChange, dark = false }: { value: string; onChange: (v: string) => void; dark?: boolean }) {
  const base = dark
    ? "px-4 py-2 rounded-xl text-sm font-semibold transition-all"
    : "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border";
  const opts = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
  ];
  return (
    <div className={`flex gap-2 ${dark ? "" : ""}`}>
      {opts.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(value === o.value ? "" : o.value)}
          className={`${base} ${
            value === o.value
              ? dark
                ? "bg-primary text-white shadow"
                : "bg-primary text-white border-primary"
              : dark
              ? "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {o.label === "Male" ? "♂ Male" : "♀ Female"}
        </button>
      ))}
    </div>
  );
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("default");

  const { data, isLoading, refetch } = useListCustomers({ search });
  const { data: membershipData } = useListMemberships();
  const { toast } = useToast();

  const membershipPlans: any[] = (membershipData as any)?.memberships || [];
  const [voucherTemplates, setVoucherTemplates] = useState<any[]>([]);
  const [voucherTerms, setVoucherTerms] = useState<string[]>([]);
  const [showAssignVoucher, setShowAssignVoucher] = useState(false);
  const [voucherForm, setVoucherForm] = useState({
    customerId: "",
    templateId: "",
    issueDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [voucherCustomerSearch, setVoucherCustomerSearch] = useState("");
  const [voucherSaving, setVoucherSaving] = useState(false);
  const [assignedVouchers, setAssignedVouchers] = useState<any[]>([]);
  const [assignedVouchersLoading, setAssignedVouchersLoading] = useState(false);
  const [voucherLedgerSearch, setVoucherLedgerSearch] = useState("");
  const [revokingVoucherId, setRevokingVoucherId] = useState<string | null>(null);
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);
  const [editingVoucherIssueDate, setEditingVoucherIssueDate] = useState("");
  const [savingVoucherDateId, setSavingVoucherDateId] = useState<string | null>(null);
  const [customerVouchers, setCustomerVouchers] = useState<any[]>([]);
  const [customerVouchersLoading, setCustomerVouchersLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/customer-vouchers/templates`)
      .then((res) => res.json())
      .then((body) => {
        setVoucherTemplates(body.templates || []);
        setVoucherTerms(body.terms || []);
      })
      .catch(() => {});
  }, []);

  type FieldErrors = { name?: string; phone?: string; members?: Record<number, { name?: string; phone?: string }> };

  const [showAdd, setShowAdd] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createFieldErrors, setCreateFieldErrors] = useState<FieldErrors>({});
  const [phoneError, setPhoneError] = useState("");
  const [formData, setFormData] = useState({ name: "", phone: "", dob: "", anniversary: "", gender: "", familyMembers: [] as FamilyMember[], membershipId: "", membershipStartDate: format(new Date(), "yyyy-MM-dd") });
  const [showFamilySection, setShowFamilySection] = useState(false);

  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", dob: "", anniversary: "", gender: "", familyMembers: [] as FamilyMember[] });
  const [editPhoneError, setEditPhoneError] = useState("");
  const [editFieldErrors, setEditFieldErrors] = useState<FieldErrors>({});
  const [editSaving, setEditSaving] = useState(false);
  const [showEditFamilySection, setShowEditFamilySection] = useState(false);
  const [editMembershipId, setEditMembershipId] = useState("");
  const [editMembershipStartDate, setEditMembershipStartDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [deleteCustomer, setDeleteCustomer] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [viewInvoiceBill, setViewInvoiceBill] = useState<any>(null);

  const [viewSubMember, setViewSubMember] = useState<{member: any; parent: any} | null>(null);
  const [subMemberBills, setSubMemberBills] = useState<any[]>([]);
  const [subMemberBillsLoading, setSubMemberBillsLoading] = useState(false);
  const [editSubMemberState, setEditSubMemberState] = useState<{member: any; parent: any; idx: number} | null>(null);
  const [editSubMemberForm, setEditSubMemberForm] = useState({ name: "", gender: "", phone: "", dob: "", anniversary: "" });
  const [editSubMemberSaving, setEditSubMemberSaving] = useState(false);
  const [deleteSubMemberState, setDeleteSubMemberState] = useState<{member: any; parent: any; idx: number} | null>(null);
  const [deleteSubMemberLoading, setDeleteSubMemberLoading] = useState(false);

  const allCustomers: any[] = data?.customers || [];

  const assignableCustomers = useMemo(() => {
    const result: any[] = [];
    for (const customer of allCustomers) {
      result.push(customer);
      for (const member of Array.isArray(customer.familyMembers) ? customer.familyMembers : []) {
        if (member.name && (member.id || member._id)) {
          result.push({ ...member, _parentName: customer.name });
        }
      }
    }
    return result;
  }, [allCustomers]);

  const filteredVoucherCustomers = useMemo(() => {
    const query = voucherCustomerSearch.trim().toLowerCase();
    if (!query) return assignableCustomers;
    return assignableCustomers.filter((customer) =>
      [customer.name, customer.phone, customer._parentName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [assignableCustomers, voucherCustomerSearch]);

  const filteredAssignedVouchers = useMemo(() => {
    const query = voucherLedgerSearch.trim().toLowerCase();
    if (!query) return assignedVouchers;
    return assignedVouchers.filter((voucher) =>
      [voucher.customerName, voucher.voucherCode, voucher.templateName, voucher.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [assignedVouchers, voucherLedgerSearch]);

  const filteredSorted = useMemo(() => {
    let list = [...allCustomers];
    if (genderFilter !== "all") list = list.filter(c => c.gender === genderFilter);
    switch (sortKey) {
      case "most-spent":   list.sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0)); break;
      case "least-spent":  list.sort((a, b) => (a.totalSpend || 0) - (b.totalSpend || 0)); break;
      case "most-visits":  list.sort((a, b) => (b.totalVisits || 0) - (a.totalVisits || 0)); break;
      case "least-visits": list.sort((a, b) => (a.totalVisits || 0) - (b.totalVisits || 0)); break;
    }
    return list;
  }, [allCustomers, genderFilter, sortKey]);

  // Expand list to include family members after their parent customer
  type ExpandedEntry = { _type: "customer"; data: any } | { _type: "family"; data: any; parent: any };
  const expandedList = useMemo<ExpandedEntry[]>(() => {
    const result: ExpandedEntry[] = [];
    for (const c of filteredSorted) {
      result.push({ _type: "customer", data: c });
      const members: any[] = Array.isArray(c.familyMembers) ? c.familyMembers : [];
      for (const m of members) {
        if (m.name) result.push({ _type: "family", data: m, parent: c });
      }
    }
    return result;
  }, [filteredSorted]);

  const totalPages = Math.max(1, Math.ceil(expandedList.length / PAGE_SIZE));
  const paginatedCustomers = expandedList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage = () => setPage(1);

  const validatePhone = (phone: string) => {
    if (!/^\d{10}$/.test(phone)) { setPhoneError("Phone number must be exactly 10 digits"); return false; }
    setPhoneError(""); return true;
  };

  const parseApiError = (msg: string, members: { name: string }[]): FieldErrors => {
    const fmMatch = msg.match(/^Family member '(.+?)'/);
    if (fmMatch) {
      const memberName = fmMatch[1];
      const idx = Math.max(0, members.findIndex(m => m.name.trim().toLowerCase() === memberName.toLowerCase()));
      const bothMatch = /name and phone/i.test(msg);
      const phoneOnly = !bothMatch && /phone/i.test(msg);
      const nameOnly = !bothMatch && !phoneOnly;
      return { members: { [idx]: { ...(nameOnly || bothMatch ? { name: msg } : {}), ...(phoneOnly || bothMatch ? { phone: msg } : {}) } } };
    }
    const both = /name and phone/i.test(msg);
    const phoneOnly = !both && /phone/i.test(msg);
    const nameOnly = !both && !phoneOnly;
    return { ...(nameOnly || both ? { name: msg } : {}), ...(phoneOnly || both ? { phone: msg } : {}) };
  };

  const resetAddForm = () => {
    setFormData({ name: "", phone: "", dob: "", anniversary: "", gender: "", familyMembers: [], membershipId: "", membershipStartDate: format(new Date(), "yyyy-MM-dd") });
    setPhoneError("");
    setCreateFieldErrors({});
    setShowFamilySection(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone(formData.phone)) return;

    // Frontend uniqueness check — phone must not already exist
    const existingByPhone = allCustomers.find(c =>
      c.phone === formData.phone ||
      (Array.isArray(c.familyMembers) && c.familyMembers.some((m: any) => m.phone === formData.phone))
    );
    if (existingByPhone) {
      setPhoneError("This phone number is already registered in the system.");
      return;
    }

    // Validate family member phones
    if (showFamilySection && formData.familyMembers.length > 0) {
      const memberErrs: Record<number, { name?: string; phone?: string }> = {};
      for (let i = 0; i < formData.familyMembers.length; i++) {
        const m = formData.familyMembers[i];
        if (!m.name.trim()) continue;
        if (m.phone) {
          if (!/^\d{10}$/.test(m.phone)) {
            memberErrs[i] = { ...memberErrs[i], phone: "Phone must be exactly 10 digits" };
          } else if (m.phone === formData.phone) {
            memberErrs[i] = { ...memberErrs[i], phone: "Cannot be the same as the main customer's phone" };
          } else if (formData.familyMembers.slice(0, i).some(prev => prev.phone === m.phone)) {
            memberErrs[i] = { ...memberErrs[i], phone: "Duplicate number within family members" };
          } else {
            const taken = allCustomers.find(c =>
              c.phone === m.phone ||
              (Array.isArray(c.familyMembers) && c.familyMembers.some((fm: any) => fm.phone === m.phone))
            );
            if (taken) memberErrs[i] = { ...memberErrs[i], phone: "This phone is already registered" };
          }
        }
      }
      if (Object.keys(memberErrs).length > 0) {
        setCreateFieldErrors({ members: memberErrs });
        return;
      }
    }

    setCreateLoading(true);
    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name, phone: formData.phone, dob: formData.dob, anniversary: formData.anniversary, gender: formData.gender, email: "" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.error || "Failed to add customer.";
        setCreateFieldErrors(parseApiError(msg, formData.familyMembers));
        return;
      }
      setCreateFieldErrors({});
      const created = await res.json();
      const customerId = created?.id || created?._id;
      if (formData.membershipId && customerId) {
        try {
          await fetch(`${API_BASE}/customer-memberships`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customerId, membershipId: formData.membershipId, startDate: formData.membershipStartDate }),
          });
        } catch {}
      }
      if (customerId) {
        for (const member of formData.familyMembers) {
          if (!member.name.trim()) continue;
          try {
            await fetch(`${API_BASE}/customers/${customerId}/family-member`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(member),
            });
          } catch {}
        }
      }
      toast({ title: "Customer Added", description: `${formData.name} has been registered.` });
      setShowAdd(false);
      resetAddForm();
      refetch();
    } catch {
      setCreateFieldErrors({ name: "Something went wrong. Please try again." });
    } finally {
      setCreateLoading(false);
    }
  };

  const openView = async (customerId: string) => {
    setViewCustomerId(customerId);
    setCustomerDetail(null);
    setCustomerVouchers([]);
    setDetailLoading(true);
    setCustomerVouchersLoading(true);
    try {
      const [customerRes, voucherRes] = await Promise.all([
        fetch(`${API_BASE}/customers/${customerId}`),
        fetch(`${API_BASE}/customer-vouchers/customer/${customerId}`),
      ]);
      const d = await customerRes.json();
      const voucherData = await voucherRes.json();
      setCustomerDetail(d);
      setCustomerVouchers(voucherData.vouchers || []);
    } catch {
      toast({ title: "Error", description: "Failed to load customer details.", variant: "destructive" });
    } finally {
      setDetailLoading(false);
      setCustomerVouchersLoading(false);
    }
  };

  const resetVoucherForm = () => {
    setVoucherCustomerSearch("");
    setVoucherForm({
      customerId: "",
      templateId: "",
      issueDate: format(new Date(), "yyyy-MM-dd"),
    });
  };

  const loadAssignedVouchers = async () => {
    setAssignedVouchersLoading(true);
    try {
      const res = await fetch(`${API_BASE}/customer-vouchers`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load vouchers.");
      setAssignedVouchers(body.vouchers || []);
    } catch {
      setAssignedVouchers([]);
      toast({ title: "Could not load voucher assignments", variant: "destructive" });
    } finally {
      setAssignedVouchersLoading(false);
    }
  };

  const openAssignVoucherPage = (customerId = "") => {
    setSearch("");
    setPage(1);
    setVoucherCustomerSearch("");
    setVoucherForm({
      customerId,
      templateId: "",
      issueDate: format(new Date(), "yyyy-MM-dd"),
    });
    setVoucherLedgerSearch("");
    loadAssignedVouchers();
    setShowAssignVoucher(true);
  };

  const handleRevokeVoucher = async (voucher: any) => {
    const voucherId = voucher.id || voucher._id;
    if (!voucherId || !window.confirm(`Revoke ${voucher.templateName || "this voucher"} assigned to ${voucher.customerName}?`)) return;

    setRevokingVoucherId(voucherId);
    try {
      const res = await fetch(`${API_BASE}/customer-vouchers/${voucherId}/revoke`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to revoke voucher.");
      toast({ title: "Voucher Revoked", description: `${voucher.voucherCode} can no longer be redeemed.` });
      await loadAssignedVouchers();
    } catch (error: any) {
      toast({ title: "Could not revoke voucher", description: error.message, variant: "destructive" });
    } finally {
      setRevokingVoucherId(null);
    }
  };

  const startEditingVoucherDate = (voucher: any) => {
    setEditingVoucherId(voucher.id || voucher._id);
    setEditingVoucherIssueDate(voucher.issueDate || "");
  };

  const cancelEditingVoucherDate = () => {
    setEditingVoucherId(null);
    setEditingVoucherIssueDate("");
  };

  const handleSaveVoucherIssueDate = async (voucher: any) => {
    const voucherId = voucher.id || voucher._id;
    if (!voucherId || !editingVoucherIssueDate) return;

    setSavingVoucherDateId(voucherId);
    try {
      const res = await fetch(`${API_BASE}/customer-vouchers/${voucherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueDate: editingVoucherIssueDate }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to update issue date.");
      setAssignedVouchers((previous) => previous.map((item) => item.id === voucherId ? body : item));
      setCustomerVouchers((previous) => previous.map((item) => item.id === voucherId ? body : item));
      toast({ title: "Issue date updated", description: `${body.voucherCode} now expires on ${body.expiryDate}.` });
      cancelEditingVoucherDate();
    } catch (error: any) {
      toast({ title: "Could not update issue date", description: error.message, variant: "destructive" });
    } finally {
      setSavingVoucherDateId(null);
    }
  };

  const handleAssignVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherForm.customerId || !voucherForm.templateId || !voucherForm.issueDate) {
      toast({ title: "Missing voucher details", description: "Choose a customer, voucher, and issue date.", variant: "destructive" });
      return;
    }

    setVoucherSaving(true);
    try {
      const res = await fetch(`${API_BASE}/customer-vouchers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(voucherForm),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to assign voucher.");

      const assignedCustomer = assignableCustomers.find((c) => (c.id || c._id) === voucherForm.customerId);
      toast({
        title: "Voucher Assigned",
        description: `${body.amount ? `₹${body.amount}` : "Gift"} voucher assigned to ${assignedCustomer?.name || "customer"}.`,
      });
      setShowAssignVoucher(false);
      resetVoucherForm();
      refetch();
    } catch (error: any) {
      toast({ title: "Could not assign voucher", description: error.message, variant: "destructive" });
    } finally {
      setVoucherSaving(false);
    }
  };

  const openEdit = (c: any) => {
    setEditCustomer(c);
    setEditForm({
      name: c.name || "",
      phone: c.phone || "",
      dob: c.dob ? c.dob.substring(0, 10) : "",
      anniversary: c.anniversary ? c.anniversary.substring(0, 10) : "",
      gender: c.gender || "",
      familyMembers: Array.isArray(c.familyMembers) ? c.familyMembers.map((m: any) => ({
        name: m.name || "", gender: m.gender || "", phone: m.phone || "",
        dob: m.dob ? m.dob.substring(0, 10) : "", anniversary: m.anniversary ? m.anniversary.substring(0, 10) : "",
      })) : [],
    });
    setEditPhoneError("");
    setEditFieldErrors({});
    setEditMembershipId("");
    setEditMembershipStartDate(format(new Date(), "yyyy-MM-dd"));
    setShowEditFamilySection(Array.isArray(c.familyMembers) && c.familyMembers.length > 0);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(editForm.phone)) { setEditPhoneError("Phone number must be exactly 10 digits"); return; }
    setEditSaving(true);
    try {
      const customerId = editCustomer.id || editCustomer._id;
      const res = await fetch(`${API_BASE}/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name, phone: editForm.phone, dob: editForm.dob, anniversary: editForm.anniversary, gender: editForm.gender }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.error || "Failed to update customer.";
        setEditFieldErrors(parseApiError(msg, editForm.familyMembers));
        return;
      }
      setEditFieldErrors({});
      if (editMembershipId) {
        try {
          await fetch(`${API_BASE}/customer-memberships`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customerId, membershipId: editMembershipId, startDate: editMembershipStartDate }),
          });
        } catch {}
      }
      const originalMembers: any[] = Array.isArray(editCustomer.familyMembers) ? editCustomer.familyMembers : [];
      const originalNames = new Set(originalMembers.map((m: any) => (m.name || "").trim().toLowerCase()));
      const newNames = new Set(editForm.familyMembers.filter(m => m.name.trim()).map(m => m.name.trim().toLowerCase()));
      for (const member of editForm.familyMembers) {
        if (!member.name.trim()) continue;
        if (!originalNames.has(member.name.trim().toLowerCase())) {
          try {
            await fetch(`${API_BASE}/customers/${customerId}/family-member`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(member),
            });
          } catch {}
        }
      }
      for (const orig of originalMembers) {
        if (!(orig.name || "").trim()) continue;
        if (!newNames.has((orig.name || "").trim().toLowerCase())) {
          const origId = orig.id || orig._id;
          if (origId) {
            try { await fetch(`${API_BASE}/customers/${origId}`, { method: "DELETE" }); } catch {}
          }
        }
      }
      toast({ title: "Customer Updated", description: `${editForm.name} has been updated.` });
      setEditCustomer(null);
      refetch();
    } catch {
      toast({ title: "Error", description: "Failed to update customer.", variant: "destructive" });
    } finally { setEditSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteCustomer) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/customers/${deleteCustomer.id || deleteCustomer._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Customer Deleted", description: `${deleteCustomer.name} has been removed.` });
      setDeleteCustomer(null);
      refetch();
    } catch {
      toast({ title: "Error", description: "Failed to delete customer.", variant: "destructive" });
    } finally { setDeleteLoading(false); }
  };

  const openViewSubMember = async (member: any, parent: any) => {
    setViewSubMember({ member, parent });
    setSubMemberBills([]);
    setSubMemberBillsLoading(true);
    try {
      const memberId = member.id || member._id;
      const res = await fetch(`${API_BASE}/bills?customerId=${memberId}`);
      const d = await res.json();
      setSubMemberBills(d.bills || []);
    } catch { setSubMemberBills([]); }
    finally { setSubMemberBillsLoading(false); }
  };

  const openEditSubMember = (member: any, parent: any, idx: number) => {
    setEditSubMemberState({ member, parent, idx });
    setEditSubMemberForm({
      name: member.name || "",
      gender: member.gender || "",
      phone: member.phone || "",
      dob: member.dob ? member.dob.substring(0, 10) : "",
      anniversary: member.anniversary ? member.anniversary.substring(0, 10) : "",
    });
  };

  const handleSaveSubMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubMemberState) return;
    setEditSubMemberSaving(true);
    try {
      const { member } = editSubMemberState;
      const memberId = member.id || member._id;
      const res = await fetch(`${API_BASE}/customers/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editSubMemberForm.name.trim(),
          gender: editSubMemberForm.gender,
          phone: editSubMemberForm.phone.trim(),
          dob: editSubMemberForm.dob,
          anniversary: editSubMemberForm.anniversary,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Sub-member updated!" });
      setEditSubMemberState(null);
      refetch();
    } catch {
      toast({ title: "Failed to update sub-member", variant: "destructive" });
    } finally { setEditSubMemberSaving(false); }
  };

  const handleDeleteSubMember = async () => {
    if (!deleteSubMemberState) return;
    setDeleteSubMemberLoading(true);
    try {
      const { member } = deleteSubMemberState;
      const memberId = member.id || member._id;
      const res = await fetch(`${API_BASE}/customers/${memberId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Sub-member removed" });
      setDeleteSubMemberState(null);
      refetch();
    } catch {
      toast({ title: "Failed to remove sub-member", variant: "destructive" });
    } finally { setDeleteSubMemberLoading(false); }
  };

  if (showAssignVoucher) {
    const selectedVoucherCustomer = assignableCustomers.find(
      (customer) => (customer.id || customer._id) === voucherForm.customerId
    );
    const selectedCustomerActiveTemplates = new Set(
      assignedVouchers
        .filter((voucher) => voucher.customerId === voucherForm.customerId && voucher.available)
        .map((voucher) => voucher.templateId)
    );

    return (
      <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => { setShowAssignVoucher(false); resetVoucherForm(); }}
              className="p-3 rounded-xl border border-border hover:bg-muted transition-colors"
              aria-label="Back to customers"
            >
              <ChevronDown className="w-5 h-5 rotate-90" />
            </button>
            <div>
              <p className="text-sm font-semibold text-secondary mb-1">Customers / Gift Vouchers</p>
              <h1 className="text-3xl font-serif font-bold text-primary">Assign Gift Voucher</h1>
              <p className="text-muted-foreground mt-1">Issue a voucher with enough space to review every detail.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleAssignVoucher} className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6">
            <section className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-primary">Choose a customer</h2>
                  <p className="text-sm text-muted-foreground mt-1">Search by name, phone, or family relationship.</p>
                </div>
                <User className="w-5 h-5 text-secondary shrink-0" />
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="search"
                  autoFocus
                  value={voucherCustomerSearch}
                  onChange={(e) => setVoucherCustomerSearch(e.target.value)}
                  placeholder="Search customers by name or phone..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                />
              </div>

              {selectedVoucherCustomer && (
                <div className="mb-4 rounded-xl border border-secondary/40 bg-secondary/5 px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {(selectedVoucherCustomer.name || "??").substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Selected customer</p>
                    <p className="font-bold text-foreground truncate">{selectedVoucherCustomer.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedVoucherCustomer.phone || "No phone"}{selectedVoucherCustomer._parentName ? ` · Family of ${selectedVoucherCustomer._parentName}` : ""}</p>
                  </div>
                </div>
              )}

              <div className="border border-border/60 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 text-xs font-semibold text-muted-foreground flex justify-between">
                  <span>{filteredVoucherCustomers.length} customer{filteredVoucherCustomers.length !== 1 ? "s" : ""} found</span>
                  <span>Select one</span>
                </div>
                <div className="max-h-[28rem] overflow-y-auto divide-y divide-border/50">
                  {filteredVoucherCustomers.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">No customers match this search.</div>
                  ) : (
                    filteredVoucherCustomers.map((customer) => {
                      const customerId = customer.id || customer._id;
                      const selected = voucherForm.customerId === customerId;
                      return (
                        <button
                          type="button"
                          key={customerId}
                          onClick={() => setVoucherForm((prev) => ({
                            ...prev,
                            customerId,
                            templateId: assignedVouchers.some(
                              (voucher) => voucher.customerId === customerId && voucher.templateId === prev.templateId && voucher.available
                            ) ? "" : prev.templateId,
                          }))}
                          className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${selected ? "bg-primary/10" : "hover:bg-muted/30"}`}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${selected ? "bg-primary text-white" : "bg-muted text-primary"}`}>
                            {(customer.name || "??").substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm text-foreground truncate">{customer.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {customer.phone || "No phone"}{customer._parentName ? ` · Family of ${customer._parentName}` : ""}
                            </p>
                          </div>
                          {selected && <BadgeCheck className="w-5 h-5 text-primary shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            <section className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-primary">Voucher details</h2>
                  <p className="text-sm text-muted-foreground mt-1">Select the artwork and set the issue date.</p>
                </div>
                <div className="min-w-[13rem]">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Issued on *</label>
                  <input
                    type="date"
                    value={voucherForm.issueDate}
                    onChange={(e) => setVoucherForm((prev) => ({ ...prev, issueDate: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Expires {voucherForm.issueDate ? format(addMonths(parseISO(voucherForm.issueDate), 1), "dd MMM yyyy") : "—"}.
                  </p>
                </div>
              </div>

              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Voucher artwork *</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {voucherTemplates.map((template) => {
                  const selected = voucherForm.templateId === template.id;
                  const alreadyActiveForCustomer = selectedCustomerActiveTemplates.has(template.id);
                  return (
                    <button
                      type="button"
                      key={template.id}
                      onClick={() => setVoucherForm((prev) => ({ ...prev, templateId: template.id }))}
                      disabled={alreadyActiveForCustomer}
                      className={`text-left rounded-2xl overflow-hidden border-2 transition-all ${
                        alreadyActiveForCustomer
                          ? "border-border opacity-60 cursor-not-allowed"
                          : selected
                          ? "border-secondary ring-2 ring-secondary/20 shadow-lg"
                          : "border-border hover:border-secondary/50"
                      }`}
                    >
                      <img src={template.frontImage} alt={`${template.name} artwork`} className="w-full aspect-[2.75/1] object-cover" />
                      <div className="px-4 py-3 flex items-center justify-between bg-muted/20">
                        <span className="font-bold text-primary">{template.name}</span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {alreadyActiveForCustomer ? "Already active" : selected ? "Selected" : "Select"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {voucherTemplates.length === 0 && (
                <p className="text-sm text-muted-foreground bg-muted/20 rounded-xl p-4">Loading voucher templates...</p>
              )}
            </section>
          </div>

          <section className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Ticket className="w-5 h-5 text-secondary" />
              <div>
                <h2 className="text-lg font-bold text-primary">Voucher terms</h2>
                <p className="text-sm text-muted-foreground">These terms will apply when the voucher is redeemed.</p>
              </div>
            </div>
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-x-8 text-sm text-muted-foreground list-disc pl-5">
              {voucherTerms.map((term) => <li key={term}>{term}</li>)}
            </ul>
            <img src="/vouchers/voucher-terms.png" alt="Voucher offer details and terms" className="w-full max-w-4xl mx-auto rounded-xl mt-6 border border-border/50" />
          </section>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => { setShowAssignVoucher(false); resetVoucherForm(); }}
              className="px-6 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
            >
              Back to Customers
            </button>
            <button
              type="submit"
              disabled={voucherSaving || !voucherTemplates.length}
              className="px-7 py-3 rounded-xl bg-secondary text-white text-sm font-semibold hover:bg-secondary/90 transition-colors disabled:opacity-50"
            >
              {voucherSaving ? "Assigning..." : "Assign Voucher"}
            </button>
          </div>
        </form>

        <section className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-bold text-primary">Assigned vouchers</h2>
              <p className="text-sm text-muted-foreground mt-1">Review every customer assignment and revoke active vouchers when needed.</p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                value={voucherLedgerSearch}
                onChange={(e) => setVoucherLedgerSearch(e.target.value)}
                placeholder="Search customer, voucher, or status..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
          </div>

          <div className="border border-border/60 rounded-xl overflow-hidden">
            {assignedVouchersLoading ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Loading assigned vouchers...</div>
            ) : filteredAssignedVouchers.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                {voucherLedgerSearch ? "No voucher assignments match this search." : "No vouchers have been assigned yet."}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredAssignedVouchers.map((voucher) => {
                  const voucherId = voucher.id || voucher._id;
                  const statusLabel = voucher.available ? "Active" : voucher.status === "assigned" ? "Scheduled" : voucher.status;
                  const statusClass = voucher.available
                    ? "bg-emerald-100 text-emerald-700"
                    : voucher.status === "redeemed"
                    ? "bg-slate-100 text-slate-600"
                    : voucher.status === "revoked"
                    ? "bg-red-100 text-red-600"
                    : "bg-amber-100 text-amber-700";
                  return (
                    <div key={voucherId} className="p-4 flex flex-wrap items-center gap-4">
                      <img src={voucher.frontImage} alt="" className="w-28 h-12 object-cover rounded-lg border border-border/50 shrink-0" />
                      <div className="min-w-[12rem] flex-1">
                        <p className="font-bold text-sm text-foreground">{voucher.customerName || "Unknown customer"}</p>
                        <p className="text-sm text-primary font-semibold mt-0.5">{voucher.templateName} · ₹{Number(voucher.amount).toLocaleString("en-IN")}</p>
                        <p className="text-xs text-muted-foreground mt-1">{voucher.voucherCode}</p>
                      </div>
                      {editingVoucherId === voucherId ? (
                        <div className="min-w-[14rem]">
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Issue date</label>
                          <input
                            type="date"
                            value={editingVoucherIssueDate}
                            onChange={(e) => setEditingVoucherIssueDate(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">Expiry recalculates one month later.</p>
                          <div className="flex gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => handleSaveVoucherIssueDate(voucher)}
                              disabled={savingVoucherDateId === voucherId || !editingVoucherIssueDate}
                              className="px-2.5 py-1.5 rounded-lg bg-primary text-white text-[10px] font-semibold hover:bg-primary/90 disabled:opacity-50"
                            >
                              {savingVoucherDateId === voucherId ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditingVoucherDate}
                              disabled={savingVoucherDateId === voucherId}
                              className="px-2.5 py-1.5 rounded-lg border border-border text-[10px] font-semibold hover:bg-muted disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground min-w-[12rem]">
                          <p className="flex items-center gap-1">
                            Issued: <span className="font-medium text-foreground">{voucher.issueDate ? format(parseISO(voucher.issueDate), "dd MMM yyyy") : "—"}</span>
                            {voucher.status !== "redeemed" && voucher.status !== "revoked" && (
                              <button
                                type="button"
                                onClick={() => startEditingVoucherDate(voucher)}
                                title="Edit issue date"
                                className="p-1 rounded text-secondary hover:bg-secondary/10 transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </p>
                          <p className="mt-1">Expires: <span className="font-medium text-foreground">{voucher.expiryDate ? format(parseISO(voucher.expiryDate), "dd MMM yyyy") : "—"}</span></p>
                        </div>
                      )}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusClass}`}>{statusLabel}</span>
                      {voucher.status === "assigned" && (
                        <button
                          type="button"
                          onClick={() => handleRevokeVoucher(voucher)}
                          disabled={revokingVoucherId === voucherId}
                          className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {revokingVoucherId === voucherId ? "Revoking..." : "Revoke"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage your clients and their history.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => openAssignVoucherPage()}
            className="border border-secondary/40 text-secondary px-5 py-3 rounded-xl font-semibold hover:bg-secondary/10 transition-colors flex items-center gap-2">
            <Ticket className="w-5 h-5" /> Assign Voucher
          </button>
          <button onClick={() => setShowAdd(true)}
            className="bg-secondary text-white px-6 py-3 rounded-xl font-semibold hover:bg-secondary/90 transition-colors shadow-lg shadow-secondary/20 flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add Customer
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden">
        {/* Search + Filters */}
        <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-wrap gap-3 items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
          </div>

          {/* Gender filter */}
          <div className="flex items-center gap-1.5">
            {(["all", "male", "female"] as GenderFilter[]).map(g => (
              <button key={g} onClick={() => { setGenderFilter(g); resetPage(); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  genderFilter === g ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-muted"
                }`}>
                {g === "all" ? "All" : g === "male" ? "♂ Male" : "♀ Female"}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select value={sortKey} onChange={e => { setSortKey(e.target.value as SortKey); resetPage(); }}
            className="px-3 py-2 rounded-xl border border-border text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="default">Sort: Default</option>
            <option value="most-spent">Most Spent</option>
            <option value="least-spent">Least Spent</option>
            <option value="most-visits">Most Visits</option>
            <option value="least-visits">Least Visits</option>
          </select>

          <span className="ml-auto text-xs text-muted-foreground">
            {filteredSorted.length} customer{filteredSorted.length !== 1 ? "s" : ""}{expandedList.length > filteredSorted.length ? ` · ${expandedList.length - filteredSorted.length} family member${expandedList.length - filteredSorted.length !== 1 ? "s" : ""}` : ""}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                <th className="p-4 pl-6">Customer</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Date of Birth</th>
                <th className="p-4">Total Spent</th>
                <th className="p-4">Total Visits</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : filteredSorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <User className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No customers found.</p>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((entry, idx) => {
                  if (entry._type === "family") {
                    const m = entry.data;
                    const parent = entry.parent;
                    const mId = m.id || m._id;
                    return (
                      <tr key={`fm-${mId}-${idx}`} className="hover:bg-muted/20 transition-colors group">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 relative"
                              style={{ background: m.gender === "female" ? "#fdf2f8" : m.gender === "male" ? "#eff6ff" : "hsl(var(--primary) / 0.1)", color: m.gender === "female" ? "#db2777" : m.gender === "male" ? "#2563eb" : "hsl(var(--primary))" }}>
                              {(m.name || "??").substring(0, 2).toUpperCase()}
                              {m.gender && (
                                <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white border-2 border-card ${m.gender === "male" ? "bg-blue-500" : "bg-pink-500"}`}>
                                  {m.gender === "male" ? "♂" : "♀"}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{m.name}</p>
                              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-600">
                                  <Users className="w-2.5 h-2.5" /> Family of {parent.name}
                                </span>
                                {m.activeMembership && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700">
                                    <BadgeCheck className="w-2.5 h-2.5" /> {m.activeMembership.membershipName} · till {m.activeMembership.endDate ? new Date(m.activeMembership.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone className="w-3.5 h-3.5" />
                            {m.phone || <span className="italic">—</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            {m.dob ? format(new Date(m.dob), "dd MMM yyyy") : <span className="italic">—</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-emerald-600">
                            ₹{Number(m.totalSpend || 0).toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-foreground font-medium">
                            {m.totalVisits || 0} visits
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <Link href={`/customers/${mId}/history`}>
                              <button title="View Visit History"
                                className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                            </Link>
                            <button onClick={() => openEditSubMember(m, parent, parent.familyMembers.findIndex((fm: any) => fm === m))} title="Edit Sub-member"
                              className="p-2 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteSubMemberState({ member: m, parent, idx: parent.familyMembers.findIndex((fm: any) => fm === m) })} title="Remove Sub-member"
                              className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  const c = entry.data;
                  return (
                    <tr key={c.id || c._id} className="hover:bg-muted/20 transition-colors group">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 relative"
                            style={{ background: c.gender === "female" ? "#fdf2f8" : c.gender === "male" ? "#eff6ff" : "hsl(var(--primary) / 0.1)", color: c.gender === "female" ? "#db2777" : c.gender === "male" ? "#2563eb" : "hsl(var(--primary))" }}>
                            {(c.name || "??").substring(0, 2).toUpperCase()}
                            {c.gender && (
                              <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white border-2 border-card ${c.gender === "male" ? "bg-blue-500" : "bg-pink-500"}`}>
                                {c.gender === "male" ? "♂" : "♀"}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{c.name}</p>
                            {c.activeMembership && (
                              <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700">
                                <BadgeCheck className="w-2.5 h-2.5" /> {c.activeMembership.membershipName} · till {c.activeMembership.endDate ? new Date(c.activeMembership.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          {c.phone}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {c.dob ? format(new Date(c.dob), "dd MMM yyyy") : <span className="italic">—</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-emerald-600">
                          ₹{Number(c.totalSpend || 0).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground font-medium">
                          {c.totalVisits || 0} visits
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/customers/${c.id || c._id}/history`}>
                            <button title="View Visit History"
                              className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                          <button onClick={() => openEdit(c)} title="Edit Customer"
                            className="p-2 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteCustomer(c)} title="Delete Customer"
                            className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {expandedList.length > PAGE_SIZE && (
          <div className="px-6 py-3 border-t border-border/50 bg-muted/20 flex flex-wrap justify-between items-center gap-3 text-sm text-muted-foreground">
            <span>Showing {Math.min((page - 1) * PAGE_SIZE + 1, expandedList.length)}–{Math.min(page * PAGE_SIZE, expandedList.length)} of {expandedList.length}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 text-xs font-medium">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 text-xs font-medium">‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p); return acc;
                }, [])
                .map((p, i) => p === "..." ? (
                  <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p as number)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${page === p ? "bg-primary text-white border-primary" : "border-border hover:bg-muted"}`}>
                    {p}
                  </button>
                ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 text-xs font-medium">›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 text-xs font-medium">»</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Assign Voucher Modal ── */}
      {showAssignVoucher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card rounded-3xl w-full max-w-3xl shadow-2xl max-h-[92vh] flex flex-col">
            <div className="p-6 border-b border-border/50 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-2xl font-serif font-bold text-primary flex items-center gap-2">
                  <Gift className="w-6 h-6 text-secondary" /> Assign Gift Voucher
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Choose a voucher and issue it to a customer.</p>
              </div>
              <button onClick={() => { setShowAssignVoucher(false); resetVoucherForm(); }} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignVoucher} className="overflow-y-auto flex-1 p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Customer *</label>
                  <select
                    value={voucherForm.customerId}
                    onChange={(e) => setVoucherForm((prev) => ({ ...prev, customerId: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  >
                    <option value="">Choose a customer</option>
                    {assignableCustomers.map((customer) => (
                      <option key={customer.id || customer._id} value={customer.id || customer._id}>
                        {customer.name}{customer._parentName ? ` (Family of ${customer._parentName})` : ""} · {customer.phone || "No phone"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Voucher issued on *</label>
                  <input
                    type="date"
                    value={voucherForm.issueDate}
                    onChange={(e) => setVoucherForm((prev) => ({ ...prev, issueDate: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Expires on {voucherForm.issueDate ? format(addMonths(parseISO(voucherForm.issueDate), 1), "dd MMM yyyy") : "—"}.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-muted-foreground">Choose voucher *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {voucherTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setVoucherForm((prev) => ({ ...prev, templateId: template.id }))}
                      className={`text-left rounded-2xl overflow-hidden border-2 transition-all ${
                        voucherForm.templateId === template.id
                          ? "border-secondary ring-2 ring-secondary/20 shadow-lg"
                          : "border-border hover:border-secondary/50"
                      }`}
                    >
                      <img src={template.frontImage} alt={`${template.name} artwork`} className="w-full aspect-[2.75/1] object-cover" />
                      <div className="px-4 py-3 flex items-center justify-between bg-muted/20">
                        <span className="font-bold text-primary">{template.name}</span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {voucherForm.templateId === template.id ? "Selected" : "Select"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                {voucherTemplates.length === 0 && (
                  <p className="text-sm text-muted-foreground bg-muted/20 rounded-xl p-4">Loading voucher templates...</p>
                )}
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Ticket className="w-4 h-4 text-secondary" />
                  <p className="text-sm font-bold text-primary">Voucher terms</p>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-muted-foreground list-disc pl-5">
                  {voucherTerms.map((term) => <li key={term}>{term}</li>)}
                </ul>
                <img src="/vouchers/voucher-terms.png" alt="Voucher offer details" className="w-full rounded-xl mt-4 border border-border/50" />
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => { setShowAssignVoucher(false); resetVoucherForm(); }}
                  className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={voucherSaving || !voucherTemplates.length}
                  className="px-6 py-2.5 rounded-xl bg-secondary text-white text-sm font-semibold hover:bg-secondary/90 transition-colors disabled:opacity-50">
                  {voucherSaving ? "Assigning..." : "Assign Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Customer Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card rounded-3xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
              <h2 className="text-2xl font-serif font-bold text-primary">New Customer</h2>
              <button onClick={() => { setShowAdd(false); resetAddForm(); }} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="overflow-y-auto flex-1 px-8 pb-8 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Customer Name *</label>
                <input required autoFocus placeholder="Enter full name"
                  className={`w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 outline-none ${createFieldErrors.name ? "border-red-400 focus:ring-red-200" : "focus:ring-primary/20"}`}
                  value={formData.name} onChange={e => { setFormData({ ...formData, name: e.target.value }); setCreateFieldErrors(fe => ({ ...fe, name: undefined })); }} />
                {createFieldErrors.name && <p className="text-red-500 text-xs mt-1">{createFieldErrors.name}</p>}
              </div>
              {/* Gender */}
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">Gender</label>
                <GenderToggle value={formData.gender} onChange={v => setFormData({ ...formData, gender: v })} />
              </div>
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Contact No * (10 digits)</label>
                <input required type="tel" maxLength={10} placeholder="10-digit mobile number"
                  className={`w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 outline-none ${(phoneError || createFieldErrors.phone) ? "border-red-400 focus:ring-red-200" : "focus:ring-primary/20"}`}
                  value={formData.phone}
                  onChange={e => { const v = e.target.value.replace(/\D/g, ""); setFormData({ ...formData, phone: v }); if (v.length === 10) setPhoneError(""); setCreateFieldErrors(fe => ({ ...fe, phone: undefined })); }}
                  onBlur={e => validatePhone(e.target.value)} />
                {(phoneError || createFieldErrors.phone) && <p className="text-red-500 text-xs mt-1">{phoneError || createFieldErrors.phone}</p>}
              </div>
              {/* DOB */}
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Birth Date <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
                <input type="date"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} />
              </div>
              {/* Anniversary */}
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Anniversary Date <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
                <input type="date"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={formData.anniversary} onChange={e => setFormData({ ...formData, anniversary: e.target.value })} />
              </div>

              {/* Membership */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">Membership <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
                <div className="relative">
                  <Crown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none" />
                  <select
                    className="w-full pl-9 pr-4 py-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none appearance-none text-sm"
                    value={formData.membershipId}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData(f => ({ ...f, membershipId: val, familyMembers: val ? f.familyMembers : [] }));
                      if (!val) setShowFamilySection(false);
                    }}
                  >
                    <option value="">— No membership —</option>
                    {membershipPlans.map((m: any) => (
                      <option key={m.id || m._id} value={m.id || m._id}>
                        {m.name} — ₹{m.price?.toLocaleString()} / {m.duration} mo
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                {formData.membershipId && (() => {
                  const plan = membershipPlans.find((m: any) => (m.id || m._id) === formData.membershipId);
                  const expiry = plan && formData.membershipStartDate
                    ? format(subDays(addMonths(parseISO(formData.membershipStartDate), Number(plan.duration)), 1), "dd MMM yyyy")
                    : null;
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-amber-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={formData.membershipStartDate}
                          onChange={e => setFormData(f => ({ ...f, membershipStartDate: e.target.value }))}
                          className="w-full p-2 rounded-lg border border-amber-200 bg-white text-sm focus:ring-2 focus:ring-amber-300 outline-none"
                        />
                      </div>
                      {expiry && (
                        <p className="text-xs text-amber-700 flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          Valid until: <span className="font-semibold ml-1">{expiry}</span>
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Family Members Toggle — only when membership is assigned */}
              {formData.membershipId && (
              <div className="pt-1">
                <button type="button"
                  onClick={() => {
                    if (!showFamilySection) { setShowFamilySection(true); if (formData.familyMembers.length === 0) setFormData(f => ({ ...f, familyMembers: [{ ...EMPTY_MEMBER }] })); }
                    else setShowFamilySection(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors font-medium text-sm">
                  <Users className="w-4 h-4" />
                  {showFamilySection ? "Hide Family Members" : "Add Family Members"}
                  {showFamilySection ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                </button>
              </div>
              )}

              {/* Family Members Section */}
              {showFamilySection && (
                <div className="space-y-4 bg-muted/20 rounded-2xl p-4 border border-border/50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Family Members <span className="text-xs text-muted-foreground font-normal">(up to {MAX_FAMILY})</span></p>
                    {formData.familyMembers.length < MAX_FAMILY && (
                      <button type="button"
                        onClick={() => setFormData(f => ({ ...f, familyMembers: [...f.familyMembers, { ...EMPTY_MEMBER }] }))}
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/30 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Member
                      </button>
                    )}
                  </div>
                  {formData.familyMembers.map((m, idx) => (
                    <div key={idx} className="bg-card rounded-xl p-4 border border-border/50 space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Member {idx + 1}</span>
                        <button type="button" onClick={() => setFormData(f => ({ ...f, familyMembers: f.familyMembers.filter((_, i) => i !== idx) }))}
                          className="p-1 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-muted-foreground transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Name *</label>
                        <input required placeholder="Member name"
                          className={`w-full p-2.5 rounded-lg border bg-muted/30 focus:ring-2 outline-none text-sm ${createFieldErrors.members?.[idx]?.name ? "border-red-400 focus:ring-red-200" : "focus:ring-primary/20"}`}
                          value={m.name} onChange={e => { const members = [...formData.familyMembers]; members[idx] = { ...m, name: e.target.value }; setFormData(f => ({ ...f, familyMembers: members })); setCreateFieldErrors(fe => { const ms = { ...(fe.members || {}) }; if (ms[idx]) ms[idx] = { ...ms[idx], name: undefined }; return { ...fe, members: ms }; }); }} />
                        {createFieldErrors.members?.[idx]?.name && <p className="text-red-500 text-xs mt-1">{createFieldErrors.members[idx].name}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Gender</label>
                        <GenderToggle value={m.gender} onChange={v => { const members = [...formData.familyMembers]; members[idx] = { ...m, gender: v }; setFormData(f => ({ ...f, familyMembers: members })); }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Contact No</label>
                        <input type="tel" maxLength={10} placeholder="10-digit number"
                          className={`w-full p-2.5 rounded-lg border bg-muted/30 focus:ring-2 outline-none text-sm ${createFieldErrors.members?.[idx]?.phone ? "border-red-400 focus:ring-red-200" : "focus:ring-primary/20"}`}
                          value={m.phone} onChange={e => { const v = e.target.value.replace(/\D/g, ""); const members = [...formData.familyMembers]; members[idx] = { ...m, phone: v }; setFormData(f => ({ ...f, familyMembers: members })); setCreateFieldErrors(fe => { const ms = { ...(fe.members || {}) }; if (ms[idx]) ms[idx] = { ...ms[idx], phone: undefined }; return { ...fe, members: ms }; }); }} />
                        {createFieldErrors.members?.[idx]?.phone && <p className="text-red-500 text-xs mt-1">{createFieldErrors.members[idx].phone}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1 text-muted-foreground">Birth Date <span className="text-muted-foreground/60">(opt)</span></label>
                          <input type="date"
                            className="w-full p-2.5 rounded-lg border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                            value={m.dob} onChange={e => { const members = [...formData.familyMembers]; members[idx] = { ...m, dob: e.target.value }; setFormData(f => ({ ...f, familyMembers: members })); }} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-muted-foreground">Anniversary <span className="text-muted-foreground/60">(opt)</span></label>
                          <input type="date"
                            className="w-full p-2.5 rounded-lg border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                            value={m.anniversary} onChange={e => { const members = [...formData.familyMembers]; members[idx] = { ...m, anniversary: e.target.value }; setFormData(f => ({ ...f, familyMembers: members })); }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAdd(false); resetAddForm(); }}
                  className="flex-1 py-3 rounded-xl border hover:bg-muted font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={createLoading}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50">
                  {createLoading ? "Saving..." : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Customer Modal ── */}
      {editCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card rounded-3xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
              <h2 className="text-2xl font-serif font-bold text-amber-600">Edit Customer</h2>
              <button onClick={() => setEditCustomer(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="overflow-y-auto flex-1 px-8 pb-8 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Customer Name *</label>
                <input required autoFocus placeholder="Enter full name"
                  className={`w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 outline-none ${editFieldErrors.name ? "border-red-400 focus:ring-red-200" : "focus:ring-primary/20"}`}
                  value={editForm.name} onChange={e => { setEditForm({ ...editForm, name: e.target.value }); setEditFieldErrors(fe => ({ ...fe, name: undefined })); }} />
                {editFieldErrors.name && <p className="text-red-500 text-xs mt-1">{editFieldErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">Gender</label>
                <GenderToggle value={editForm.gender} onChange={v => setEditForm({ ...editForm, gender: v })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Contact No * (10 digits)</label>
                <input required type="tel" maxLength={10} placeholder="10-digit mobile number"
                  className={`w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 outline-none ${(editPhoneError || editFieldErrors.phone) ? "border-red-400 focus:ring-red-200" : "focus:ring-primary/20"}`}
                  value={editForm.phone}
                  onChange={e => { const v = e.target.value.replace(/\D/g, ""); setEditForm({ ...editForm, phone: v }); if (v.length === 10) setEditPhoneError(""); setEditFieldErrors(fe => ({ ...fe, phone: undefined })); }}
                  onBlur={e => { if (!/^\d{10}$/.test(e.target.value)) setEditPhoneError("Phone number must be exactly 10 digits"); else setEditPhoneError(""); }} />
                {(editPhoneError || editFieldErrors.phone) && <p className="text-red-500 text-xs mt-1">{editPhoneError || editFieldErrors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Birth Date <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
                <input type="date"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={editForm.dob} onChange={e => setEditForm({ ...editForm, dob: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Anniversary Date <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
                <input type="date"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={editForm.anniversary} onChange={e => setEditForm({ ...editForm, anniversary: e.target.value })} />
              </div>

              {/* Membership */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Membership
                  {editCustomer?.activeMembership && (
                    <span className="ml-2 text-xs text-amber-600 font-normal">
                      (currently: {editCustomer.activeMembership.membershipName} · till {editCustomer.activeMembership.endDate ? new Date(editCustomer.activeMembership.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"})
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Crown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none" />
                  <select
                    className="w-full pl-9 pr-4 py-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none appearance-none text-sm"
                    value={editMembershipId}
                    onChange={e => setEditMembershipId(e.target.value)}
                  >
                    <option value="">— {editCustomer?.activeMembership ? "Keep current / no change" : "No membership"} —</option>
                    {membershipPlans.map((m: any) => (
                      <option key={m.id || m._id} value={m.id || m._id}>
                        {m.name} — ₹{m.price?.toLocaleString()} / {m.duration} mo
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                {editMembershipId && (() => {
                  const plan = membershipPlans.find((m: any) => (m.id || m._id) === editMembershipId);
                  const expiry = plan && editMembershipStartDate
                    ? format(subDays(addMonths(parseISO(editMembershipStartDate), Number(plan.duration)), 1), "dd MMM yyyy")
                    : null;
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-amber-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={editMembershipStartDate}
                          onChange={e => setEditMembershipStartDate(e.target.value)}
                          className="w-full p-2 rounded-lg border border-amber-200 bg-white text-sm focus:ring-2 focus:ring-amber-300 outline-none"
                        />
                      </div>
                      {expiry && (
                        <p className="text-xs text-amber-700 flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          Valid until: <span className="font-semibold ml-1">{expiry}</span>
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Family Members Toggle */}
              <div className="pt-1">
                <button type="button"
                  onClick={() => {
                    if (!showEditFamilySection) { setShowEditFamilySection(true); if (editForm.familyMembers.length === 0) setEditForm(f => ({ ...f, familyMembers: [{ ...EMPTY_MEMBER }] })); }
                    else setShowEditFamilySection(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-amber-400/50 text-amber-600 hover:bg-amber-50 transition-colors font-medium text-sm">
                  <Users className="w-4 h-4" />
                  {showEditFamilySection ? "Hide Family Members" : `Family Members${editForm.familyMembers.length > 0 ? ` (${editForm.familyMembers.length})` : ""}`}
                  {showEditFamilySection ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                </button>
              </div>

              {showEditFamilySection && (
                <div className="space-y-4 bg-muted/20 rounded-2xl p-4 border border-border/50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Family Members <span className="text-xs text-muted-foreground font-normal">(up to {MAX_FAMILY})</span></p>
                    {editForm.familyMembers.length < MAX_FAMILY && (
                      <button type="button"
                        onClick={() => setEditForm(f => ({ ...f, familyMembers: [...f.familyMembers, { ...EMPTY_MEMBER }] }))}
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/30 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Member
                      </button>
                    )}
                  </div>
                  {editForm.familyMembers.map((m, idx) => (
                    <div key={idx} className="bg-card rounded-xl p-4 border border-border/50 space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Member {idx + 1}</span>
                        <button type="button" onClick={() => setEditForm(f => ({ ...f, familyMembers: f.familyMembers.filter((_, i) => i !== idx) }))}
                          className="p-1 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-muted-foreground transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Name *</label>
                        <input required placeholder="Member name"
                          className={`w-full p-2.5 rounded-lg border bg-muted/30 focus:ring-2 outline-none text-sm ${editFieldErrors.members?.[idx]?.name ? "border-red-400 focus:ring-red-200" : "focus:ring-primary/20"}`}
                          value={m.name} onChange={e => { const members = [...editForm.familyMembers]; members[idx] = { ...m, name: e.target.value }; setEditForm(f => ({ ...f, familyMembers: members })); setEditFieldErrors(fe => { const ms = { ...(fe.members || {}) }; if (ms[idx]) ms[idx] = { ...ms[idx], name: undefined }; return { ...fe, members: ms }; }); }} />
                        {editFieldErrors.members?.[idx]?.name && <p className="text-red-500 text-xs mt-1">{editFieldErrors.members[idx].name}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Gender</label>
                        <GenderToggle value={m.gender} onChange={v => { const members = [...editForm.familyMembers]; members[idx] = { ...m, gender: v }; setEditForm(f => ({ ...f, familyMembers: members })); }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Contact No</label>
                        <input type="tel" maxLength={10} placeholder="10-digit number"
                          className={`w-full p-2.5 rounded-lg border bg-muted/30 focus:ring-2 outline-none text-sm ${editFieldErrors.members?.[idx]?.phone ? "border-red-400 focus:ring-red-200" : "focus:ring-primary/20"}`}
                          value={m.phone} onChange={e => { const v = e.target.value.replace(/\D/g, ""); const members = [...editForm.familyMembers]; members[idx] = { ...m, phone: v }; setEditForm(f => ({ ...f, familyMembers: members })); setEditFieldErrors(fe => { const ms = { ...(fe.members || {}) }; if (ms[idx]) ms[idx] = { ...ms[idx], phone: undefined }; return { ...fe, members: ms }; }); }} />
                        {editFieldErrors.members?.[idx]?.phone && <p className="text-red-500 text-xs mt-1">{editFieldErrors.members[idx].phone}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1 text-muted-foreground">Birth Date <span className="text-muted-foreground/60">(opt)</span></label>
                          <input type="date"
                            className="w-full p-2.5 rounded-lg border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                            value={m.dob} onChange={e => { const members = [...editForm.familyMembers]; members[idx] = { ...m, dob: e.target.value }; setEditForm(f => ({ ...f, familyMembers: members })); }} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-muted-foreground">Anniversary <span className="text-muted-foreground/60">(opt)</span></label>
                          <input type="date"
                            className="w-full p-2.5 rounded-lg border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                            value={m.anniversary} onChange={e => { const members = [...editForm.familyMembers]; members[idx] = { ...m, anniversary: e.target.value }; setEditForm(f => ({ ...f, familyMembers: members })); }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditCustomer(null)}
                  className="flex-1 py-3 rounded-xl border hover:bg-muted font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors shadow-lg disabled:opacity-50">
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Delete Customer?</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteCustomer.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteCustomer(null)}
                className="flex-1 py-3 rounded-xl border hover:bg-muted font-medium transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 py-3 rounded-xl bg-destructive text-white font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50">
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Modal ── */}
      {viewInvoiceBill && <InvoiceModal bill={viewInvoiceBill} onClose={() => setViewInvoiceBill(null)} />}

      {/* ── View Sub-member Modal ── */}
      {viewSubMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card rounded-3xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-serif font-bold text-primary">{viewSubMember.member.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-600">
                    <Users className="w-2.5 h-2.5" /> Family of {viewSubMember.parent.name}
                  </span>
                  {viewSubMember.parent.activeMembership && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                      <BadgeCheck className="w-2.5 h-2.5" /> Member · {viewSubMember.parent.activeMembership.membershipName}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setViewSubMember(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              <div className="grid grid-cols-3 gap-3">
                {viewSubMember.member.phone && (
                  <div className="bg-muted/30 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="text-sm font-semibold mt-0.5">{viewSubMember.member.phone}</p>
                  </div>
                )}
                {viewSubMember.member.dob && (
                  <div className="bg-muted/30 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">Date of Birth</p>
                    <p className="text-sm font-semibold mt-0.5">{format(new Date(viewSubMember.member.dob), "dd MMM yyyy")}</p>
                  </div>
                )}
                {viewSubMember.member.gender && (
                  <div className="bg-muted/30 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">Gender</p>
                    <p className="text-sm font-semibold mt-0.5 capitalize">{viewSubMember.member.gender}</p>
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Service History</h4>
                {subMemberBillsLoading ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
                ) : subMemberBills.length === 0 ? (
                  <div className="text-center py-8 bg-muted/20 rounded-xl text-muted-foreground text-sm">No visits recorded yet.</div>
                ) : (
                  <div className="space-y-3">
                    {subMemberBills.map((bill: any) => (
                      <div key={bill.id || bill._id} className="bg-muted/20 rounded-xl p-4 border border-border/40">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-sm">{bill.billNumber}</p>
                            <p className="text-xs text-muted-foreground">{bill.createdAt ? format(new Date(bill.createdAt), "dd MMM yyyy, hh:mm a") : "—"}</p>
                          </div>
                          <span className="font-bold text-emerald-600">₹{Number(bill.finalAmount || 0).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="space-y-1">
                          {bill.items?.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {item.type === "service" ? <Scissors className="w-3 h-3 text-primary" /> : <Package className="w-3 h-3 text-secondary" />}
                                <span className="text-foreground font-medium">{item.name}</span>
                              </span>
                              <span className="font-semibold text-foreground">₹{Number(item.total || 0).toLocaleString("en-IN")}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="capitalize">💳 {bill.paymentMethod}</span>
                          <button onClick={() => setViewInvoiceBill({ ...bill, customerPhone: viewSubMember.member.phone })}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-semibold">
                            <FileText className="w-3.5 h-3.5" /> View Invoice
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Sub-member Modal ── */}
      {editSubMemberState && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card rounded-3xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-8 pt-8 pb-4">
              <h2 className="text-xl font-serif font-bold text-amber-600">Edit Sub-member</h2>
              <button onClick={() => setEditSubMemberState(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSubMember} className="px-8 pb-8 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Name *</label>
                <input required placeholder="Member name"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={editSubMemberForm.name} onChange={e => setEditSubMemberForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">Gender</label>
                <GenderToggle value={editSubMemberForm.gender} onChange={v => setEditSubMemberForm(f => ({ ...f, gender: v }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Contact No</label>
                <input type="tel" maxLength={10} placeholder="10-digit number"
                  className="w-full p-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={editSubMemberForm.phone} onChange={e => setEditSubMemberForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "") }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Birth Date</label>
                  <input type="date" className="w-full p-2.5 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    value={editSubMemberForm.dob} onChange={e => setEditSubMemberForm(f => ({ ...f, dob: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Anniversary</label>
                  <input type="date" className="w-full p-2.5 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    value={editSubMemberForm.anniversary} onChange={e => setEditSubMemberForm(f => ({ ...f, anniversary: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditSubMemberState(null)}
                  className="flex-1 py-3 rounded-xl border hover:bg-muted font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={editSubMemberSaving}
                  className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors disabled:opacity-50">
                  {editSubMemberSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Sub-member Confirm Modal ── */}
      {deleteSubMemberState && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Remove Sub-member?</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Remove <span className="font-semibold text-foreground">{deleteSubMemberState.member.name}</span> from <span className="font-semibold text-foreground">{deleteSubMemberState.parent.name}</span>'s family? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteSubMemberState(null)}
                className="flex-1 py-3 rounded-xl border hover:bg-muted font-medium transition-colors">Cancel</button>
              <button onClick={handleDeleteSubMember} disabled={deleteSubMemberLoading}
                className="flex-1 py-3 rounded-xl bg-destructive text-white font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50">
                {deleteSubMemberLoading ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Customer Profile Modal (inline) ── */}
      {viewCustomerId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-primary">Customer Profile</h2>
              <button onClick={() => { setViewCustomerId(null); setCustomerDetail(null); }} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {detailLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading profile...</div>
              ) : customerDetail ? (
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl shrink-0 relative">
                      {customerDetail.name?.substring(0, 2).toUpperCase()}
                      {customerDetail.gender && (
                        <span className={`absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${customerDetail.gender === "male" ? "bg-blue-500" : "bg-pink-500"}`}>
                          {customerDetail.gender === "male" ? "♂" : "♀"}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{customerDetail.name}</h3>
                      <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
                        <Phone className="w-3.5 h-3.5" /> {customerDetail.phone}
                      </p>
                      {customerDetail.dob && (
                        <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3.5 h-3.5" /> DOB: {format(new Date(customerDetail.dob), "dd MMM yyyy")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted/30 rounded-2xl p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">₹{Number(customerDetail.totalSpend || 0).toLocaleString("en-IN")}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Spent</p>
                    </div>
                    <div className="bg-muted/30 rounded-2xl p-4 text-center">
                      <p className="text-2xl font-bold text-primary">{customerDetail.totalVisits || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Visits</p>
                    </div>
                    <div className="bg-muted/30 rounded-2xl p-4 text-center">
                      <p className="text-lg font-bold text-secondary">
                        {customerDetail.lastVisit ? format(new Date(customerDetail.lastVisit), "dd MMM yy") : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Last Visit</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-secondary" /> Gift Vouchers
                      </h4>
                      <button
                        onClick={() => openAssignVoucherPage(customerDetail.id || customerDetail._id)}
                        className="text-xs font-semibold text-secondary hover:underline"
                      >
                        Assign another
                      </button>
                    </div>
                    {customerVouchersLoading ? (
                      <div className="text-sm text-muted-foreground bg-muted/20 rounded-xl p-4">Loading vouchers...</div>
                    ) : customerVouchers.length === 0 ? (
                      <div className="text-sm text-muted-foreground bg-muted/20 rounded-xl p-4">No gift vouchers assigned.</div>
                    ) : (
                      <div className="space-y-2">
                        {customerVouchers.map((voucher) => {
                          const statusColor = voucher.status === "redeemed"
                            ? "bg-slate-100 text-slate-600"
                            : voucher.status === "expired"
                            ? "bg-red-100 text-red-600"
                            : voucher.available
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700";
                          return (
                            <div key={voucher.id || voucher._id} className="rounded-xl border border-border/50 bg-muted/10 p-3 flex items-center gap-3">
                              <img src={voucher.frontImage} alt="" className="w-24 h-10 object-cover rounded-lg border border-border/40" />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm text-foreground">{voucher.voucherCode} · ₹{Number(voucher.amount).toLocaleString("en-IN")}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Issued {voucher.issueDate ? format(new Date(voucher.issueDate), "dd MMM yyyy") : "—"} · Expires {voucher.expiryDate ? format(new Date(voucher.expiryDate), "dd MMM yyyy") : "—"}
                                </p>
                              </div>
                              <span className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${statusColor}`}>
                                {voucher.status === "assigned" && !voucher.available ? "Not active" : voucher.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Visit History</h4>
                    {!customerDetail.bills || customerDetail.bills.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl">No visits yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {customerDetail.bills.map((bill: any) => (
                          <div key={bill.id || bill._id} className="bg-muted/20 rounded-xl p-4 border border-border/40">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-semibold text-sm">{bill.billNumber}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {bill.createdAt ? format(new Date(bill.createdAt), "dd MMM yyyy, hh:mm a") : "—"}
                                </p>
                              </div>
                              <span className="font-bold text-emerald-600 text-base">
                                ₹{Number(bill.finalAmount || 0).toLocaleString("en-IN")}
                              </span>
                            </div>

                            {bill.items && bill.items.length > 0 && (
                              <div className="space-y-1.5 border-t border-border/30 pt-2">
                                {bill.items.map((item: any, i: number) => (
                                  <div key={i} className="flex justify-between items-center text-xs">
                                    <span className="flex items-center gap-1.5 text-muted-foreground">
                                      {item.type === "service"
                                        ? <Scissors className="w-3 h-3 text-primary" />
                                        : <Package className="w-3 h-3 text-secondary" />}
                                      <span className="font-medium text-foreground">{item.name}</span>
                                      {item.quantity > 1 && <span className="text-muted-foreground/70">×{item.quantity}</span>}
                                      {item.staffName && <span className="text-muted-foreground/60">· {item.staffName}</span>}
                                    </span>
                                    <span className="font-semibold text-foreground">₹{Number(item.total || 0).toLocaleString("en-IN")}</span>
                                  </div>
                                ))}
                                {(bill.discountAmount > 0 || bill.taxAmount > 0) && (
                                  <div className="border-t border-border/20 pt-1.5 mt-1 space-y-1">
                                    {bill.discountAmount > 0 && (
                                      <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Discount</span>
                                        <span className="text-red-500 font-medium">-₹{Number(bill.discountAmount).toLocaleString("en-IN")}</span>
                                      </div>
                                    )}
                                    {bill.taxAmount > 0 && (
                                      <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Tax ({bill.taxPercent}%)</span>
                                        <span className="text-foreground font-medium">+₹{Number(bill.taxAmount).toLocaleString("en-IN")}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-3">
                                <span className="capitalize">💳 {bill.paymentMethod}</span>
                                <span className={`capitalize font-semibold ${bill.status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>{bill.status}</span>
                              </div>
                              <button
                                onClick={() => setViewInvoiceBill({ ...bill, customerPhone: customerDetail.phone })}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-semibold text-xs">
                                <FileText className="w-3.5 h-3.5" /> View Invoice
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
