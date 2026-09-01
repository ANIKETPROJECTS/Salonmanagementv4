import { useState, useEffect, useMemo } from "react";
import { Crown, Star, Gem, Plus, X, Check, Users, Tag, Trash2, UserPlus, Search, CalendarDays, BadgeCheck, AlertCircle, Pencil, Eye, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, addMonths, subDays } from "date-fns";
import { MembershipInvoiceModal } from "@/components/MembershipInvoiceModal";

const API_BASE = "/api";

function MembershipBadge({ membership, size = "sm" }: { membership: any; size?: "sm" | "md" }) {
  if (!membership) return null;
  const colors: Record<string, string> = {
    default: "bg-violet-100 text-violet-700 border-violet-200",
  };
  const cls = size === "sm"
    ? "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
    : "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border";
  return (
    <span className={`${cls} bg-violet-100 text-violet-700 border-violet-200`}>
      <BadgeCheck className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
      {membership.membershipName}
    </span>
  );
}

export default function Memberships() {
  const { toast } = useToast();

  // Plans state
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // Active members state
  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [activeMembersLoading, setActiveMembersLoading] = useState(true);

  // Create plan modal
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [planForm, setPlanForm] = useState({ name: "", price: "", duration: "3", benefits: "", discountPercent: "" });
  const [planSaving, setPlanSaving] = useState(false);

  // Edit plan modal
  const [editPlan, setEditPlan] = useState<any | null>(null);
  const [editPlanForm, setEditPlanForm] = useState({ name: "", price: "", duration: "3", benefits: "", discountPercent: "" });
  const [editPlanSaving, setEditPlanSaving] = useState(false);

  // Edit active member modal
  const [editMember, setEditMember] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ startDate: "", endDate: "", discountPercent: "", membershipId: "", membershipName: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Assign modal
  const [assignPlan, setAssignPlan] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [assignSaving, setAssignSaving] = useState(false);

  // New sub-members being added inside Assign modal
  const [assignNewMembers, setAssignNewMembers] = useState<NewFM[]>([]);

  // Edit sub-member modal
  const [editSubMember, setEditSubMember] = useState<{ cm: any; member: any; idx: number } | null>(null);
  const [editSubMemberForm, setEditSubMemberForm] = useState({ name: "", phone: "", gender: "", dob: "", anniversary: "" });
  const [editSubMemberSaving, setEditSubMemberSaving] = useState(false);

  // New sub-members being added inside Edit Membership modal
  type NewFM = { name: string; phone: string; gender: string; dob: string; anniversary: string };
  const EMPTY_NEW_FM: NewFM = { name: "", phone: "", gender: "", dob: "", anniversary: "" };
  const [editFormNewMembers, setEditFormNewMembers] = useState<NewFM[]>([]);
  const [showAddSubInEdit, setShowAddSubInEdit] = useState(false);

  // View member modal
  const [viewMember, setViewMember] = useState<any | null>(null);

  // Membership invoice modal
  const [invoiceMember, setInvoiceMember] = useState<any | null>(null);

  // Expanded rows in Active Members table
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await fetch(`${API_BASE}/memberships`);
      const data = await res.json();
      setPlans(data.memberships || []);
    } catch {
      toast({ title: "Failed to load plans", variant: "destructive" });
    } finally {
      setPlansLoading(false);
    }
  };

  const fetchActiveMembers = async () => {
    setActiveMembersLoading(true);
    try {
      const res = await fetch(`${API_BASE}/customer-memberships`);
      const data = await res.json();
      setActiveMembers(data.customerMemberships || []);
    } catch {
      toast({ title: "Failed to load members", variant: "destructive" });
    } finally {
      setActiveMembersLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE}/customers`);
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {}
  };

  useEffect(() => {
    fetchPlans();
    fetchActiveMembers();
    fetchCustomers();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name.trim()) return;
    setPlanSaving(true);
    try {
      const res = await fetch(`${API_BASE}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: planForm.name.trim(),
          price: Number(planForm.price),
          duration: Number(planForm.duration),
          benefits: planForm.benefits.trim(),
          discountPercent: Number(planForm.discountPercent) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Plan created!" });
      setShowCreatePlan(false);
      setPlanForm({ name: "", price: "", duration: "3", benefits: "", discountPercent: "" });
      fetchPlans();
    } catch {
      toast({ title: "Failed to create plan", variant: "destructive" });
    } finally {
      setPlanSaving(false);
    }
  };

  const openEditPlan = (plan: any) => {
    setEditPlan(plan);
    setEditPlanForm({
      name: plan.name || "",
      price: String(plan.price ?? ""),
      duration: String(plan.duration ?? "3"),
      benefits: plan.benefits || "",
      discountPercent: plan.discountPercent != null ? String(plan.discountPercent) : "",
    });
  };

  const handleEditPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPlan) return;
    setEditPlanSaving(true);
    try {
      const res = await fetch(`${API_BASE}/memberships/${editPlan.id || editPlan._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editPlanForm.name.trim(),
          price: Number(editPlanForm.price),
          duration: Number(editPlanForm.duration),
          benefits: editPlanForm.benefits.trim(),
          discountPercent: Number(editPlanForm.discountPercent) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Plan updated!" });
      setEditPlan(null);
      fetchPlans();
    } catch {
      toast({ title: "Failed to update plan", variant: "destructive" });
    } finally {
      setEditPlanSaving(false);
    }
  };

  const handleDeletePlan = async (plan: any) => {
    if (!confirm(`Delete plan "${plan.name}"? Existing assigned memberships will not be affected.`)) return;
    try {
      const res = await fetch(`${API_BASE}/memberships/${plan.id || plan._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Plan deleted" });
      fetchPlans();
    } catch {
      toast({ title: "Failed to delete plan", variant: "destructive" });
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      toast({ title: "Please select a customer", variant: "destructive" });
      return;
    }
    setAssignSaving(true);
    try {
      const res = await fetch(`${API_BASE}/customer-memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id || selectedCustomer._id,
          membershipId: assignPlan.id || assignPlan._id,
          startDate,
        }),
      });
      if (!res.ok) throw new Error();

      // Save any new sub-members added during assign
      const validNew = assignNewMembers.filter(m => m.name.trim());
      if (validNew.length > 0) {
        const customerId = selectedCustomer.id || selectedCustomer._id;
        for (const member of validNew) {
          const memberRes = await fetch(`${API_BASE}/customers/${customerId}/family-member`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: member.name.trim(),
              phone: member.phone.trim(),
              gender: member.gender,
              dob: member.dob,
              anniversary: member.anniversary,
            }),
          });
          if (!memberRes.ok) {
            const error = await memberRes.json().catch(() => ({}));
            throw new Error(error.error || "Failed to save sub-member");
          }
        }
      }

      toast({ title: "Membership assigned!", description: `${selectedCustomer.name} is now on ${assignPlan.name}` });
      setAssignPlan(null);
      setSelectedCustomer(null);
      setCustomerSearch("");
      setStartDate(format(new Date(), "yyyy-MM-dd"));
      setAssignNewMembers([]);
      fetchActiveMembers();
      fetchCustomers();
    } catch {
      toast({ title: "Failed to assign membership", variant: "destructive" });
    } finally {
      setAssignSaving(false);
    }
  };

  const handleRevoke = async (cm: any) => {
    if (!confirm(`Revoke ${cm.customerName}'s ${cm.membershipName} membership?`)) return;
    try {
      const res = await fetch(`${API_BASE}/customer-memberships/${cm.id || cm._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Membership revoked" });
      fetchActiveMembers();
    } catch {
      toast({ title: "Failed to revoke membership", variant: "destructive" });
    }
  };

  const openEditMember = (cm: any) => {
    setEditMember(cm);
    setEditForm({
      startDate: cm.startDate || "",
      endDate: cm.endDate || "",
      discountPercent: cm.discountPercent != null ? String(cm.discountPercent) : "",
      membershipId: cm.membershipId || "",
      membershipName: cm.membershipName || "",
    });
    setEditFormNewMembers([]);
    setShowAddSubInEdit(false);
  };

  const openEditSubMember = (cm: any, member: any, idx: number) => {
    setEditSubMember({ cm, member, idx });
    setEditSubMemberForm({
      name: member.name || "",
      phone: member.phone || "",
      gender: member.gender || "",
      dob: member.dob || "",
      anniversary: member.anniversary || "",
    });
  };

  const handleSaveSubMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubMember) return;
    setEditSubMemberSaving(true);
    try {
      const memberId = editSubMember.member.id || editSubMember.member._id;
      if (!memberId) throw new Error("Sub-member record not found");
      const res = await fetch(`${API_BASE}/customers/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editSubMemberForm.name.trim(),
          phone: editSubMemberForm.phone.trim(),
          gender: editSubMemberForm.gender,
          dob: editSubMemberForm.dob,
          anniversary: editSubMemberForm.anniversary,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update sub-member");
      }
      toast({ title: "Sub-member updated!" });
      setEditSubMember(null);
      fetchCustomers();
      fetchActiveMembers();
    } catch (err: any) {
      toast({ title: err.message || "Failed to update sub-member", variant: "destructive" });
    } finally {
      setEditSubMemberSaving(false);
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMember) return;
    setEditSaving(true);
    try {
      const res = await fetch(`${API_BASE}/customer-memberships/${editMember.id || editMember._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: editForm.startDate,
          endDate: editForm.endDate,
          discountPercent: editForm.discountPercent !== "" ? Number(editForm.discountPercent) : 0,
          membershipId: editForm.membershipId,
          membershipName: editForm.membershipName,
        }),
      });
      if (!res.ok) throw new Error();

      // Also save any newly-added sub-members to the customer
      const validNew = editFormNewMembers.filter(m => m.name.trim());
      if (validNew.length > 0) {
        const customer = customers.find((c: any) => (c.id || c._id) === editMember.customerId);
        if (customer) {
          for (const member of validNew) {
            const memberRes = await fetch(`${API_BASE}/customers/${editMember.customerId}/family-member`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: member.name.trim(),
                phone: member.phone.trim(),
                gender: member.gender,
                dob: member.dob,
                anniversary: member.anniversary,
              }),
            });
            if (!memberRes.ok) {
              const error = await memberRes.json().catch(() => ({}));
              throw new Error(error.error || "Failed to save sub-member");
            }
          }
        }
      }

      toast({ title: "Membership updated" });
      setEditMember(null);
      setEditFormNewMembers([]);
      setShowAddSubInEdit(false);
      fetchActiveMembers();
      fetchCustomers();
    } catch {
      toast({ title: "Failed to update membership", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const term = customerSearch.toLowerCase();
    return customers.filter((c: any) =>
      c.name?.toLowerCase().includes(term) || c.phone?.includes(term)
    );
  }, [customers, customerSearch]);

  // Build a set of customer names that are already covered as sub-members under another member's plan.
  // We match by name because sub-members stored as embedded family member objects don't share
  // the same ID as their customer-membership record's customerId.
  const coveredFamilyMemberNames = useMemo(() => {
    const names = new Set<string>();
    activeMembers.forEach((cm: any) => {
      const customer = customers.find((c: any) => (c.id || c._id) === cm.customerId);
      if (customer) {
        (customer.familyMembers || []).forEach((m: any) => {
          if (m.name) names.add(m.name.toLowerCase().trim());
        });
      }
    });
    return names;
  }, [customers, activeMembers]);

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Memberships</h1>
          <p className="text-muted-foreground mt-1 text-sm">Create plans and assign them to your clients</p>
        </div>
        <button
          onClick={() => setShowCreatePlan(true)}
          className="flex items-center gap-2 bg-secondary text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-secondary/90 transition-colors shadow-lg shadow-secondary/20 text-sm"
        >
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Members</p>
              <p className="text-xl font-bold text-foreground">{activeMembers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Tag className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Plans</p>
              <p className="text-xl font-bold text-foreground">{plans.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expiring This Month</p>
              <p className="text-xl font-bold text-foreground">
                {activeMembers.filter(m => {
                  const end = m.endDate;
                  const thirtyDays = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
                  return end <= thirtyDays && end >= today;
                }).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Membership Plans */}
      <div className="mb-8">
        <h2 className="text-lg font-bold font-serif text-foreground mb-4">Membership Plans</h2>
        {plansLoading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Loading plans...</div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16 bg-muted/20 rounded-2xl border border-dashed border-border">
            <Tag className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">No plans yet</p>
            <p className="text-muted-foreground text-sm mt-1">Create your first membership plan to get started</p>
            <button
              onClick={() => setShowCreatePlan(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan: any) => {
              const benefits = plan.benefits ? plan.benefits.split(",").map((b: string) => b.trim()).filter(Boolean) : [];
              const memberCount = activeMembers.filter(m => m.membershipId === (plan.id || plan._id)).length;
              return (
                <div key={plan.id || plan._id} className="bg-card rounded-2xl border border-border/60 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{plan.duration} month{plan.duration !== 1 ? "s" : ""} validity</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditPlan(plan)}
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          title="Edit plan"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePlan(plan)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-2xl font-bold text-primary mb-2">₹{Number(plan.price).toLocaleString("en-IN")}</p>

                    {plan.discountPercent > 0 && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <Tag className="w-3.5 h-3.5 text-secondary" />
                        <span className="text-sm text-secondary font-semibold">{plan.discountPercent}% off all services</span>
                      </div>
                    )}

                    {benefits.length > 0 && (
                      <div className="space-y-1.5 border-t border-border/40 pt-3 mb-4">
                        {benefits.map((b: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                            <span className="text-xs text-muted-foreground">{b}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <span className="text-xs text-muted-foreground">
                        {memberCount} active member{memberCount !== 1 ? "s" : ""}
                      </span>
                      <button
                        onClick={() => { setAssignPlan(plan); setSelectedCustomer(null); setCustomerSearch(""); setStartDate(format(new Date(), "yyyy-MM-dd")); setAssignNewMembers([]); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-semibold"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Assign to Client
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Members List */}
      <Card className="rounded-2xl border-border/50 shadow-lg">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold font-serif text-foreground mb-4">Active Members</h2>
          {activeMembersLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading members...</div>
          ) : activeMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto opacity-20 mb-3" />
              <p className="font-medium">No active members yet</p>
              <p className="text-sm mt-1">Assign a plan to a client to see them here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeMembers.filter((cm: any) => !coveredFamilyMemberNames.has(cm.customerName?.toLowerCase().trim())).map((cm: any) => {
                const isExpiringSoon = cm.endDate <= format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
                const customer = customers.find((c: any) => (c.id || c._id) === cm.customerId);
                const familyMembers: any[] = Array.isArray(customer?.familyMembers) ? customer.familyMembers.filter((m: any) => m.name) : [];
                const rowId = cm.id || cm._id;
                const isExpanded = expandedRows.has(rowId);

                return (
                  <div key={rowId} className="rounded-2xl border border-border/60 overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
                    {/* Parent Member Row */}
                    <div className="flex items-center gap-3 p-4">
                      {/* Expand toggle */}
                      <button
                        type="button"
                        onClick={() => setExpandedRows(prev => {
                          const next = new Set(prev);
                          if (next.has(rowId)) next.delete(rowId); else next.add(rowId);
                          return next;
                        })}
                        className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors shrink-0"
                        title={familyMembers.length > 0 ? (isExpanded ? "Collapse sub-members" : "Expand sub-members") : "No sub-members"}
                      >
                        {familyMembers.length > 0
                          ? (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)
                          : <span className="w-4 h-4 block" />
                        }
                      </button>

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {cm.customerName.substring(0, 2).toUpperCase()}
                      </div>

                      {/* Name + plan */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-sm">{cm.customerName}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-700">
                            <BadgeCheck className="w-3 h-3" /> {cm.membershipName}
                          </span>
                          {familyMembers.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
                              <Users className="w-3 h-3" /> {familyMembers.length} sub-member{familyMembers.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {cm.discountPercent > 0 && (
                            <span className="text-xs text-secondary font-semibold">{cm.discountPercent}% off</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {cm.startDate ? format(parseISO(cm.startDate), "dd MMM yyyy") : "—"} → {" "}
                            <span className={isExpiringSoon ? "text-amber-600 font-semibold" : ""}>
                              {cm.endDate ? format(parseISO(cm.endDate), "dd MMM yyyy") : "—"}
                              {isExpiringSoon && " ⚠"}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Status */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 shrink-0">
                        <Check className="w-3 h-3" /> Active
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setViewMember(cm)}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-border/60 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-colors font-medium flex items-center gap-1"
                          title="View details"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button
                          onClick={() => setInvoiceMember(cm)}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-border/60 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors font-medium flex items-center gap-1"
                          title="Membership invoice"
                        >
                          <FileText className="w-3 h-3" /> Invoice
                        </button>
                        <button
                          onClick={() => openEditMember(cm)}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-border/60 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors font-medium flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleRevoke(cm)}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors font-medium"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>

                    {/* Sub-members expanded */}
                    {isExpanded && familyMembers.length > 0 && (
                      <div className="border-t border-border/50 bg-muted/20 px-4 py-3 space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" /> Sub-members
                        </p>
                        {familyMembers.map((m: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 bg-card rounded-xl px-3 py-2.5 border border-border/50">
                            <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {m.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground">{m.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {m.phone && <span className="text-xs text-muted-foreground">{m.phone}</span>}
                                {m.gender && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{m.gender}</span>}
                                {m.dob && <span className="text-[10px] text-muted-foreground">DOB: {m.dob}</span>}
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-700 shrink-0">
                              <BadgeCheck className="w-3 h-3" /> Covered
                            </span>
                            <button
                              onClick={() => openEditSubMember(cm, m, idx)}
                              className="text-xs px-2 py-1 rounded-lg border border-border/60 hover:bg-primary/10 hover:text-primary transition-colors font-medium flex items-center gap-1 shrink-0"
                              title="Edit sub-member"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Plan Modal */}
      {editPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-serif font-bold text-primary">Edit Plan</h2>
              <button onClick={() => setEditPlan(null)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditPlan} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Plan Name *</label>
                <input required type="text" placeholder="e.g. Gold, Premium, Basic"
                  value={editPlanForm.name}
                  onChange={e => setEditPlanForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Price (₹) *</label>
                  <input required type="number" min="0" placeholder="3000"
                    value={editPlanForm.price}
                    onChange={e => setEditPlanForm(p => ({ ...p, price: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Duration (months) *</label>
                  <input required type="number" min="1" placeholder="3"
                    value={editPlanForm.duration}
                    onChange={e => setEditPlanForm(p => ({ ...p, duration: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Service Discount (%)</label>
                <input type="number" min="0" max="100" placeholder="0"
                  value={editPlanForm.discountPercent}
                  onChange={e => setEditPlanForm(p => ({ ...p, discountPercent: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Benefits</label>
                <textarea rows={3} placeholder="Free threading monthly, Priority booking..."
                  value={editPlanForm.benefits}
                  onChange={e => setEditPlanForm(p => ({ ...p, benefits: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none resize-none" />
                <p className="text-[11px] text-muted-foreground mt-1">Separate each benefit with a comma</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditPlan(null)}
                  className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editPlanSaving}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors">
                  {editPlanSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Active Member Modal */}
      {editMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-serif font-bold text-primary">Edit Membership</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{editMember.customerName}</p>
              </div>
              <button onClick={() => setEditMember(null)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Plan */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Plan</label>
                <select
                  value={editForm.membershipId}
                  onChange={e => {
                    const selected = plans.find(p => (p.id || p._id) === e.target.value);
                    setEditForm(f => ({
                      ...f,
                      membershipId: e.target.value,
                      membershipName: selected?.name || f.membershipName,
                      discountPercent: selected ? String(selected.discountPercent ?? "") : f.discountPercent,
                    }));
                  }}
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                >
                  {plans.map(p => (
                    <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Start Date</label>
                  <input required type="date"
                    value={editForm.startDate}
                    onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Expiry Date</label>
                  <input required type="date"
                    value={editForm.endDate}
                    onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                  />
                </div>
              </div>
              {/* Discount */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Service Discount (%)</label>
                <input type="number" min="0" max="100" placeholder="0"
                  value={editForm.discountPercent}
                  onChange={e => setEditForm(f => ({ ...f, discountPercent: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                />
              </div>
              {/* Sub-members (family members) */}
              {(() => {
                const customer = customers.find((c: any) => (c.id || c._id) === editMember?.customerId);
                const familyMembers: any[] = Array.isArray(customer?.familyMembers) ? customer.familyMembers.filter((m: any) => m.name) : [];
                return (
                  <div className="bg-muted/30 rounded-xl border border-border/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Sub-members ({familyMembers.length + editFormNewMembers.filter(m => m.name.trim()).length})
                    </p>
                    {familyMembers.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {familyMembers.map((m: any, i: number) => (
                          <div key={i} className="flex items-center gap-2.5 bg-card rounded-lg px-3 py-2 border border-border/50">
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                              {m.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{m.name}</p>
                              {m.phone && <p className="text-xs text-muted-foreground">{m.phone}</p>}
                            </div>
                            {m.gender && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{m.gender}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* New sub-members being added */}
                    {editFormNewMembers.map((nm, ni) => (
                      <div key={ni} className="bg-card border border-primary/30 rounded-xl p-3 mb-2 space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-primary">New Sub-member {ni + 1}</p>
                          <button type="button" onClick={() => setEditFormNewMembers(prev => prev.filter((_, ii) => ii !== ni))}
                            className="text-xs text-destructive hover:underline">Remove</button>
                        </div>
                        <input required type="text" placeholder="Name *" value={nm.name}
                          onChange={e => setEditFormNewMembers(prev => prev.map((x, ii) => ii === ni ? { ...x, name: e.target.value } : x))}
                          className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="tel" placeholder="Phone" value={nm.phone}
                            onChange={e => setEditFormNewMembers(prev => prev.map((x, ii) => ii === ni ? { ...x, phone: e.target.value.replace(/\D/g, "").slice(0, 10) } : x))}
                            className="p-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
                          <select value={nm.gender}
                            onChange={e => setEditFormNewMembers(prev => prev.map((x, ii) => ii === ni ? { ...x, gender: e.target.value } : x))}
                            className="p-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none">
                            <option value="">Gender</option>
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase tracking-wide block mb-0.5">Date of Birth</label>
                            <input type="date" value={nm.dob}
                              onChange={e => setEditFormNewMembers(prev => prev.map((x, ii) => ii === ni ? { ...x, dob: e.target.value } : x))}
                              className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase tracking-wide block mb-0.5">Anniversary</label>
                            <input type="date" value={nm.anniversary}
                              onChange={e => setEditFormNewMembers(prev => prev.map((x, ii) => ii === ni ? { ...x, anniversary: e.target.value } : x))}
                              className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
                          </div>
                        </div>
                      </div>
                    ))}
                    {(familyMembers.length + editFormNewMembers.length) < 4 ? (
                      <button type="button"
                        onClick={() => setEditFormNewMembers(prev => [...prev, { ...EMPTY_NEW_FM }])}
                        className="w-full py-2 rounded-xl border border-dashed border-primary/50 text-primary text-xs font-semibold hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5 mt-1">
                        <Plus className="w-3.5 h-3.5" /> Add Sub-member
                      </button>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2 bg-muted/30 rounded-xl mt-1">Maximum 4 sub-members allowed</p>
                    )}
                  </div>
                );
              })()}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditMember(null)}
                  className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors">
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreatePlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-serif font-bold text-primary">New Membership Plan</h2>
              <button onClick={() => setShowCreatePlan(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreatePlan} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Plan Name *</label>
                <input required type="text" placeholder="e.g. Gold, Premium, Basic"
                  value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-secondary/40 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Price (₹) *</label>
                  <input required type="number" min="0" placeholder="3000"
                    value={planForm.price} onChange={e => setPlanForm(p => ({ ...p, price: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-secondary/40 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Duration (months) *</label>
                  <input required type="number" min="1" placeholder="3"
                    value={planForm.duration} onChange={e => setPlanForm(p => ({ ...p, duration: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-secondary/40 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Service Discount (%)</label>
                <input type="text" inputMode="decimal" placeholder="e.g. 15"
                  value={planForm.discountPercent} onChange={e => setPlanForm(p => ({ ...p, discountPercent: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-secondary/40 outline-none" />
                <p className="text-[11px] text-muted-foreground mt-1">Leave blank if no discount applies</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Benefits</label>
                <textarea rows={3} placeholder="Free threading monthly, Priority booking, 10% off products..."
                  value={planForm.benefits} onChange={e => setPlanForm(p => ({ ...p, benefits: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-secondary/40 outline-none resize-none" />
                <p className="text-[11px] text-muted-foreground mt-1">Separate each benefit with a comma</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreatePlan(false)} className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={planSaving}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors">
                  {planSaving ? "Creating..." : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <div>
                <h2 className="text-xl font-serif font-bold text-primary">Assign Membership</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Plan: <span className="font-semibold text-foreground">{assignPlan.name}</span> · ₹{Number(assignPlan.price).toLocaleString("en-IN")} · {assignPlan.duration} months</p>
              </div>
              <button onClick={() => setAssignPlan(null)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAssign} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Customer search */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Select Customer *</label>
                {selectedCustomer ? (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/20 mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {selectedCustomer.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{selectedCustomer.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                    </div>
                    <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }}
                      className="text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded-lg hover:bg-destructive/10 transition-colors">
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search by name or phone..."
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        className="w-full pl-9 pr-3 p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-secondary/40 outline-none"
                      />
                    </div>
                    <div className="border border-border rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                      {filteredCustomers.length === 0 ? (
                        <p className="text-center py-4 text-sm text-muted-foreground">No customers found</p>
                      ) : (
                        filteredCustomers.slice(0, 10).map((c: any) => (
                          <button
                            key={c.id || c._id}
                            type="button"
                            onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left border-b border-border/40 last:border-0"
                          >
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                              {c.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{c.name}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-muted-foreground">{c.phone}</p>
                                {Array.isArray(c.familyMembers) && c.familyMembers.filter((m: any) => m.name).length > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                                    {c.familyMembers.filter((m: any) => m.name).length} sub-member{c.familyMembers.filter((m: any) => m.name).length !== 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>
                            </div>
                            {c.activeMembership && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">
                                {c.activeMembership.membershipName}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Sub-members section (shown after customer selected) */}
              {selectedCustomer && (() => {
                const existingFm: any[] = Array.isArray(selectedCustomer.familyMembers)
                  ? selectedCustomer.familyMembers.filter((m: any) => m.name)
                  : [];
                const totalSubs = existingFm.length + assignNewMembers.filter(m => m.name.trim()).length;
                return (
                  <div className="bg-muted/30 rounded-xl border border-border/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Sub-members ({totalSubs}/4)
                    </p>
                    {/* Existing sub-members */}
                    {existingFm.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {existingFm.map((m: any, i: number) => (
                          <div key={i} className="flex items-center gap-2.5 bg-card rounded-lg px-3 py-2 border border-border/50">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                              {m.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{m.name}</p>
                              {m.phone && <p className="text-[11px] text-muted-foreground">{m.phone}</p>}
                            </div>
                            {m.gender && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize shrink-0">{m.gender}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* New sub-members being added */}
                    {assignNewMembers.map((nm, ni) => (
                      <div key={ni} className="bg-card border border-primary/30 rounded-xl p-3 mb-2 space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-primary">New Sub-member {existingFm.length + ni + 1}</p>
                          <button type="button" onClick={() => setAssignNewMembers(prev => prev.filter((_, ii) => ii !== ni))}
                            className="text-xs text-destructive hover:underline">Remove</button>
                        </div>
                        <input required type="text" placeholder="Name *" value={nm.name}
                          onChange={e => setAssignNewMembers(prev => prev.map((x, ii) => ii === ni ? { ...x, name: e.target.value } : x))}
                          className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="tel" placeholder="Phone" value={nm.phone}
                            onChange={e => setAssignNewMembers(prev => prev.map((x, ii) => ii === ni ? { ...x, phone: e.target.value.replace(/\D/g, "").slice(0, 10) } : x))}
                            className="p-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
                          <select value={nm.gender}
                            onChange={e => setAssignNewMembers(prev => prev.map((x, ii) => ii === ni ? { ...x, gender: e.target.value } : x))}
                            className="p-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none">
                            <option value="">Gender</option>
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase tracking-wide block mb-0.5">Date of Birth</label>
                            <input type="date" value={nm.dob}
                              onChange={e => setAssignNewMembers(prev => prev.map((x, ii) => ii === ni ? { ...x, dob: e.target.value } : x))}
                              className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase tracking-wide block mb-0.5">Anniversary</label>
                            <input type="date" value={nm.anniversary}
                              onChange={e => setAssignNewMembers(prev => prev.map((x, ii) => ii === ni ? { ...x, anniversary: e.target.value } : x))}
                              className="w-full p-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
                          </div>
                        </div>
                      </div>
                    ))}
                    {totalSubs < 4 ? (
                      <button type="button"
                        onClick={() => setAssignNewMembers(prev => [...prev, { name: "", phone: "", gender: "", dob: "", anniversary: "" }])}
                        className="w-full py-2 rounded-xl border border-dashed border-primary/50 text-primary text-xs font-semibold hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5 mt-1">
                        <Plus className="w-3.5 h-3.5" /> Add Sub-member
                      </button>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2 bg-muted/30 rounded-xl mt-1">Maximum 4 sub-members allowed</p>
                    )}
                  </div>
                );
              })()}

              {/* Start Date */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Start Date</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full pl-9 p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-secondary/40 outline-none"
                  />
                </div>
                {startDate && assignPlan && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Valid until: <span className="font-semibold text-foreground">
                      {format(subDays(addMonths(parseISO(startDate), Number(assignPlan.duration)), 1), "dd MMM yyyy")}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAssignPlan(null)} className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={assignSaving || !selectedCustomer}
                  className="flex-1 py-3 rounded-xl bg-secondary text-white font-bold text-sm disabled:opacity-50 hover:bg-secondary/90 transition-colors">
                  {assignSaving ? "Assigning..." : "Assign Membership"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sub-member Modal */}
      {editSubMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-serif font-bold text-primary">Edit Sub-member</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Member of {editSubMember.cm.customerName}</p>
              </div>
              <button onClick={() => setEditSubMember(null)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSubMember} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Name *</label>
                <input required type="text" placeholder="Full name"
                  value={editSubMemberForm.name}
                  onChange={e => setEditSubMemberForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Gender</label>
                <div className="flex gap-2">
                  {[{ label: "♂ Male", value: "male" }, { label: "♀ Female", value: "female" }].map(g => (
                    <button key={g.value} type="button"
                      onClick={() => setEditSubMemberForm(f => ({ ...f, gender: f.gender === g.value ? "" : g.value }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${editSubMemberForm.gender === g.value ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Phone</label>
                <input type="tel" maxLength={10} placeholder="10-digit mobile"
                  value={editSubMemberForm.phone}
                  onChange={e => setEditSubMemberForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Date of Birth</label>
                  <input type="date"
                    value={editSubMemberForm.dob}
                    onChange={e => setEditSubMemberForm(f => ({ ...f, dob: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Anniversary</label>
                  <input type="date"
                    value={editSubMemberForm.anniversary}
                    onChange={e => setEditSubMemberForm(f => ({ ...f, anniversary: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditSubMember(null)}
                  className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editSubMemberSaving || !editSubMemberForm.name.trim()}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors">
                  {editSubMemberSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Membership Invoice Modal */}
      {invoiceMember && (() => {
        const customer = customers.find((c: any) => (c.id || c._id) === invoiceMember.customerId);
        return (
          <MembershipInvoiceModal
            membership={invoiceMember}
            customer={customer}
            onClose={() => setInvoiceMember(null)}
          />
        );
      })()}

      {/* View Member Modal */}
      {viewMember && (() => {
        const customer = customers.find((c: any) => (c.id || c._id) === viewMember.customerId);
        const familyMembers: any[] = Array.isArray(customer?.familyMembers) ? customer.familyMembers.filter((m: any) => m.name) : [];
        const isExpiringSoon = viewMember.endDate <= format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
                <div>
                  <h2 className="text-xl font-serif font-bold text-primary">Membership Details</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{viewMember.customerName}</p>
                </div>
                <button onClick={() => setViewMember(null)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Plan info */}
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-violet-100 text-violet-700">
                      <BadgeCheck className="w-4 h-4" /> {viewMember.membershipName}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Start Date</p>
                      <p className="font-semibold">{viewMember.startDate ? format(parseISO(viewMember.startDate), "dd MMM yyyy") : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Expiry</p>
                      <p className={`font-semibold ${isExpiringSoon ? "text-amber-600" : ""}`}>
                        {viewMember.endDate ? format(parseISO(viewMember.endDate), "dd MMM yyyy") : "—"}
                        {isExpiringSoon && " ⚠"}
                      </p>
                    </div>
                    {viewMember.discountPercent > 0 && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Service Discount</p>
                        <p className="font-semibold text-secondary">{viewMember.discountPercent}% off all services</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parent member info */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Parent Member</p>
                  <div className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-3 border border-border/50">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {viewMember.customerName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{viewMember.customerName}</p>
                      {customer?.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                      {customer?.gender && <p className="text-xs text-muted-foreground capitalize">{customer.gender}</p>}
                    </div>
                    <button
                      onClick={() => { setViewMember(null); openEditMember(viewMember); }}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-border/60 hover:bg-primary/10 hover:text-primary transition-colors font-medium flex items-center gap-1 shrink-0"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                  </div>
                </div>

                {/* Sub-members */}
                {familyMembers.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Sub-members ({familyMembers.length})
                    </p>
                    <div className="space-y-2">
                      {familyMembers.map((m: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-border/50">
                          <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {m.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{m.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {m.phone && <span className="text-xs text-muted-foreground">{m.phone}</span>}
                              {m.gender && <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{m.gender}</span>}
                              {m.dob && <span className="text-[11px] text-muted-foreground">DOB: {m.dob}</span>}
                              {m.anniversary && <span className="text-[11px] text-muted-foreground">Anniv: {m.anniversary}</span>}
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-700 shrink-0">
                            <BadgeCheck className="w-3 h-3" /> Covered
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {familyMembers.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm bg-muted/20 rounded-xl border border-dashed border-border">
                    <Users className="w-8 h-8 mx-auto opacity-20 mb-1.5" />
                    No sub-members added for this customer
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-border shrink-0">
                <button onClick={() => setViewMember(null)}
                  className="w-full py-3 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
