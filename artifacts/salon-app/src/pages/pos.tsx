import { useState, useMemo, useRef, useEffect } from "react";
import { useListServices, useListProducts, useListCustomers, useListStaff, useCreateBill } from "@workspace/api-client-react";
import {
  Search, Trash2, Receipt, CreditCard, Banknote, Smartphone,
  ChevronLeft, Wallet, UserPlus, X, Scissors, Package, Clock,
  ChevronDown, UserCircle2, Tag, Check, BadgeCheck, Users, Plus, Crown, TrendingUp
} from "lucide-react";
import { Link, useSearch, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "/api";
const noSpinner = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

type CartItem = {
  uid: string;
  type: "service" | "product" | "membership";
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  discountAmt: number;
  staffId?: string | null;
  staffName?: string;
  durationMonths?: number;
  isUpgradation?: boolean;
};

const PAYMENT_METHODS = [
  { id: "cash",   icon: Banknote,   label: "Cash" },
  { id: "upi",    icon: Smartphone, label: "UPI" },
  { id: "card",   icon: CreditCard, label: "Card" },
  { id: "wallet", icon: Wallet,     label: "Wallet" },
];

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

// ── Coloured Staff Picker ──────────────────────────────────
function StaffPicker({ staff, value, onChange, placeholder }: {
  staff: any[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const selected = staff.find((s: any) => (s.id || s._id) === value);

  const openDropdown = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropH = Math.min(220, staff.length * 40 + 56);
    const openUp = spaceBelow < dropH + 8;
    setDropStyle({
      position: "fixed",
      zIndex: 9999,
      left: rect.left,
      width: Math.max(192, rect.width),
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
    setOpen(v => !v);
  };

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node))
        setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  const genderStyle = (s: any, picked: boolean) => {
    if (s.gender === "male") return picked
      ? { background: "#1d4ed8", color: "#fff", border: "1.5px solid #1d4ed8" }
      : { background: "#dbeafe", color: "#1d4ed8", border: "1.5px solid #93c5fd" };
    if (s.gender === "female") return picked
      ? { background: "#db2777", color: "#fff", border: "1.5px solid #db2777" }
      : { background: "#fce7f3", color: "#be185d", border: "1.5px solid #f9a8d4" };
    return picked
      ? { background: "#7c3aed", color: "#fff", border: "1.5px solid #7c3aed" }
      : { background: "hsl(var(--sidebar))", color: "rgba(255,255,255,0.7)", border: "1.5px solid transparent" };
  };

  return (
    <div className="flex-1 min-w-0">
      <button ref={btnRef} type="button" onClick={openDropdown}
        className="w-full flex items-center gap-1.5 text-xs rounded-lg px-2 py-1.5 transition-colors"
        style={selected ? genderStyle(selected, true) : { background: "hsl(var(--sidebar))", color: "rgba(255,255,255,0.5)", border: "1.5px solid transparent" }}>
        {selected ? (
          <>
            <span>{selected.gender === "male" ? "♂" : selected.gender === "female" ? "♀" : "👤"}</span>
            <span className="truncate font-semibold">{selected.name}</span>
          </>
        ) : (
          <span className="truncate">{placeholder}</span>
        )}
        <ChevronDown className="w-3 h-3 ml-auto shrink-0 opacity-60" />
      </button>
      {open && (
        <div ref={dropRef} style={dropStyle}
          className="rounded-xl shadow-2xl overflow-hidden border border-sidebar-border bg-sidebar-accent">
          <button type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs text-white/50 hover:bg-sidebar/60 transition-colors border-b border-sidebar-border">
            — {placeholder}
          </button>
          <div className="p-2 flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
            {staff.map((s: any) => {
              const sid = s.id || s._id;
              const picked = value === sid;
              return (
                <button key={sid} type="button"
                  onClick={() => { onChange(sid); setOpen(false); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all"
                  style={genderStyle(s, picked)}>
                  <span>{s.gender === "male" ? "♂" : s.gender === "female" ? "♀" : ""}</span>
                  <span>{s.name.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function POS() {
  const { toast } = useToast();
  const { data: servicesData } = useListServices();
  const { data: productsData } = useListProducts();
  const { data: customersData, refetch: refetchCustomers } = useListCustomers();
  const { data: staffData } = useListStaff();
  const createBill = useCreateBill();

  const search2 = useSearch();
  const editBillId = useMemo(() => new URLSearchParams(search2).get("editBill") || "", [search2]);
  const [, navigate] = useLocation();

  const [stylistStats, setStylistStats] = useState<Record<string, { staffId: string; staffName: string; count: number }>>({});

  const [activeTab, setActiveTab]           = useState<"services" | "products" | "memberships">("services");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch]                 = useState("");
  const [cart, setCart]                     = useState<CartItem[]>([]);
  const [customerId, setCustomerId]         = useState<string>("");
  const [customerName, setCustomerName]     = useState<string>("Walk-in Customer");
  const [customerPhone, setCustomerPhone]   = useState<string>("");
  const [customerDob, setCustomerDob]       = useState<string>("");
  const [customerAnniversary, setCustomerAnniversary] = useState<string>("");
  const [paymentMethod, setPaymentMethod]   = useState<"cash" | "upi" | "card" | "wallet">("upi");
  const [taxEnabled, setTaxEnabled]         = useState(false);
  const [taxRate, setTaxRate]               = useState(18);
  const [selectedMemberParentName, setSelectedMemberParentName] = useState("");
  const [globalDiscountAmt, setGlobalDiscountAmt]   = useState(0);
  const [customerSearch, setCustomerSearch]         = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);
  const [customerMembership, setCustomerMembership] = useState<any>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  type POSFamilyMember = { name: string; gender: string; phone: string; dob: string; anniversary: string };
  const EMPTY_POS_MEMBER: POSFamilyMember = { name: "", gender: "", phone: "", dob: "", anniversary: "" };
  const MAX_POS_FAMILY = 4;
  const [addForm, setAddForm]     = useState<{ name: string; phone: string; dob: string; gender: string; anniversary: string; membershipId: string; membershipStartDate: string; familyMembers: POSFamilyMember[] }>({ name: "", phone: "", dob: "", gender: "", anniversary: "", membershipId: "", membershipStartDate: "", familyMembers: [] });
  const [showPOSFamilySection, setShowPOSFamilySection] = useState(false);
  const [addPhoneError, setAddPhoneError] = useState("");
  const [addLoading, setAddLoading]       = useState(false);
  const [membershipPlans, setMembershipPlans] = useState<any[]>([]);
  const [typePicker, setTypePicker]       = useState<any | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const isEditLoading = useRef(false);
  const editBillIdRef = useRef(editBillId);
  type POSFamilyAdd = { name: string; phone: string; gender: string; dob: string; anniversary: string };
  const EMPTY_POS_ADD: POSFamilyAdd = { name: "", phone: "", gender: "", dob: "", anniversary: "" };
  const [posFamilyToAdd, setPosFamilyToAdd] = useState<POSFamilyAdd[]>([]);
  const [showPosFamilySection, setShowPosFamilySection] = useState(false);

  const taxPercent = taxEnabled ? taxRate : 0;
  const services   = servicesData?.services || [];
  const products   = productsData?.products || [];
  const customers  = customersData?.customers || [];
  const staff      = (staffData as any)?.staff || [];

  // Today's MM-DD for birthday / anniversary matching
  const todayMMDD = useMemo(() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Discount from a membership plan that's being PURCHASED in this bill
  const cartMembershipDiscount = useMemo(() => {
    const cartMem = cart.find(i => i.type === "membership");
    if (!cartMem) return { pct: 0, name: "" };
    const plan = membershipPlans.find((p: any) => (p.id || p._id) === cartMem.itemId);
    return { pct: plan?.discountPercent || 0, name: plan?.name || cartMem.name };
  }, [cart.map(i => `${i.type}:${i.itemId}`).join(","), membershipPlans]); // eslint-disable-line

  // Auto-discount: special-day discounts stack with an active membership discount.
  // Memberships without an explicit discount still receive the standard 20% member discount.
  const { autoDiscountPct, specialLabel, membershipLabel } = useMemo(() => {
    const hasActiveMembership = Boolean(customerMembership);
    const configuredMembershipPct = Number(customerMembership?.discountPercent);
    const membershipPct = hasActiveMembership
      ? (configuredMembershipPct > 0 ? configuredMembershipPct : 20)
      : 0;

    const getSpecialDayDiscount = (label: string, specialPct: number) => {
      const totalPct = Math.min(100, specialPct + membershipPct);
      const breakdown = membershipPct > 0
        ? ` (${specialPct}% + ${membershipPct}% membership)`
        : "";
      return {
        autoDiscountPct: totalPct,
        specialLabel: `${label} — ${totalPct}% off${breakdown}`,
        membershipLabel: null,
      };
    };

    if (customerAnniversary?.length >= 7 && customerAnniversary.substring(5) === todayMMDD)
      return getSpecialDayDiscount("💐 Anniversary Special", 40);
    if (customerDob?.length >= 7 && customerDob.substring(5) === todayMMDD)
      return getSpecialDayDiscount("🎂 Birthday Special", 30);
    if (hasActiveMembership && membershipPct > 0)
      return { autoDiscountPct: membershipPct, specialLabel: null, membershipLabel: `🏷 ${customerMembership.membershipName} — ${membershipPct}% off` };
    if (cartMembershipDiscount.pct > 0)
      return { autoDiscountPct: cartMembershipDiscount.pct, specialLabel: null, membershipLabel: `👑 ${cartMembershipDiscount.name} — ${cartMembershipDiscount.pct}% off on services` };
    return { autoDiscountPct: 0, specialLabel: null, membershipLabel: null };
  }, [customerDob, customerAnniversary, customerMembership, cartMembershipDiscount, todayMMDD]);

  // Keep editBillIdRef in sync so handleGenerateBill always sees the latest value
  useEffect(() => { editBillIdRef.current = editBillId; }, [editBillId]);

  // Retroactively apply discount to all service items already in cart when customer/discount changes
  // Skip during edit-bill loading so we don't overwrite the restored item discounts
  useEffect(() => {
    if (isEditLoading.current) return;
    setCart(prev => prev.map(item => {
      if (item.type !== "service") return item;
      return { ...item, discountAmt: Math.round(item.price * autoDiscountPct / 100) };
    }));
  }, [autoDiscountPct]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node))
        setShowCustomerDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/memberships`).then(r => r.json()).then(d => setMembershipPlans(d.memberships || [])).catch(() => {});
  }, []);

  // Re-fetch whenever services data changes (covers HMR, navigation, and page reload)
  const servicesLoadedKey = (servicesData as any)?.services?.length ?? -1;
  useEffect(() => {
    if (servicesLoadedKey < 0) return;
    fetch(`${API_BASE}/service-stylist-stats`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => setStylistStats(d.stats || {}))
      .catch(() => {});
  }, [servicesLoadedKey]);

  // Load existing bill when in edit mode
  useEffect(() => {
    if (!editBillId) return;
    isEditLoading.current = true;
    fetch(`${API_BASE}/bills/${editBillId}`)
      .then(r => r.json())
      .then((bill: any) => {
        setCustomerId(bill.customerId || "");
        setCustomerName(bill.customerName || "Walk-in Customer");
        setCustomerPhone(bill.customerPhone || "");
        setCustomerDob(bill.customerDob || "");
        setCustomerAnniversary(bill.customerAnniversary || "");
        setPaymentMethod(bill.paymentMethod || "upi");
        setTaxEnabled((bill.taxPercent || 0) > 0);
        setTaxRate(bill.taxPercent || 18);
        setGlobalDiscountAmt(bill.discountAmount || 0);
        const restoredCart: CartItem[] = (bill.items || []).map((item: any) => ({
          uid: Math.random().toString(36).substr(2, 9),
          type: item.type || "service",
          itemId: item.itemId || "",
          name: item.name || "",
          price: item.price || 0,
          quantity: item.quantity || 1,
          discountAmt: item.discount || 0,
          staffId: item.staffId || null,
          staffName: item.staffName || "",
          durationMonths: item.durationMonths,
          isUpgradation: item.isUpgradation || false,
        }));
        setCart(restoredCart);
        // Load membership for display (badge) only — do NOT re-apply discount to loaded items
        if (bill.customerId) {
          fetch(`${API_BASE}/customer-memberships/customer/${bill.customerId}`)
            .then(r => r.json())
            .then(d => {
              setCustomerMembership(d.membership || null);
              // Now safe to unblock the discount effect (cart already has its original discounts)
              isEditLoading.current = false;
            })
            .catch(() => { isEditLoading.current = false; });
        } else {
          isEditLoading.current = false;
        }
      })
      .catch(() => { isEditLoading.current = false; });
  }, [editBillId]);

  const categories = useMemo(() => {
    if (activeTab === "memberships") return ["All"];
    const items = activeTab === "services" ? services : products;
    return ["All", ...Array.from(new Set(items.map((i: any) => i.category).filter(Boolean)))];
  }, [services, products, activeTab]);

  const filteredItems = useMemo(() => {
    if (activeTab === "memberships") return [];
    const items = activeTab === "services" ? services : products;
    return items.filter((item: any) =>
      item.name.toLowerCase().includes(search.toLowerCase()) &&
      (activeCategory === "All" || item.category === activeCategory)
    );
  }, [services, products, activeTab, search, activeCategory]);

  // Expand customers list to include family members as selectable entries
  const expandedCustomers = useMemo(() => {
    const result: any[] = [];
    for (const c of customers) {
      result.push({ ...c, _isFamily: false });
      const members: any[] = Array.isArray(c.familyMembers) ? c.familyMembers : [];
      for (const m of members) {
        if (!m.name) continue;
        result.push({
          ...m,
          id: m.id || m._id,
          _isFamily: true,
          _parentId: c.id || c._id,
          _parentName: c.name,
          activeMembership: m.activeMembership || c.activeMembership,
        });
      }
    }
    return result;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return expandedCustomers;
    const t = customerSearch.toLowerCase();
    return expandedCustomers.filter((c: any) => c.name?.toLowerCase().includes(t) || c.phone?.includes(t));
  }, [expandedCustomers, customerSearch]);

  const addToCart = (item: any, overridePrice?: number, overrideName?: string) => {
    const id    = item.id || item._id;
    const price = overridePrice ?? (Number(activeTab === "services" ? item.price : activeTab === "products" ? item.sellingPrice : item.price) || 0);
    const name  = overrideName ?? item.name;
    const discountAmt = activeTab === "services" ? Math.round(price * autoDiscountPct / 100) : 0;
    const type = activeTab === "services" ? "service" : activeTab === "products" ? "product" : "membership";
    let autoStaffId: string | null = null;
    let autoStaffName = "";
    if (type === "service") {
      // Try full variant name first, then fall back to parent service name
      const topStylist = stylistStats[name] || stylistStats[item.name];
      if (topStylist?.staffId) {
        autoStaffId = topStylist.staffId;
        autoStaffName = topStylist.staffName;
      }
    }
    setCart(prev => [...prev, {
      uid: Math.random().toString(36).substr(2, 9),
      type,
      itemId: id, name, price, quantity: 1, discountAmt,
      staffId: autoStaffId, staffName: autoStaffName,
      durationMonths: activeTab === "memberships" ? (item.duration || item.durationMonths) : undefined,
    }]);
  };

  const addMembershipToCart = (plan: any) => {
    const alreadyInCart = cart.some(i => i.type === "membership" && i.itemId === (plan.id || plan._id));
    if (alreadyInCart) return;
    setCart(prev => [...prev, {
      uid: Math.random().toString(36).substr(2, 9),
      type: "membership",
      itemId: plan.id || plan._id,
      name: plan.name,
      price: plan.price || 0,
      quantity: 1,
      discountAmt: 0,
      staffId: null,
      staffName: "",
      durationMonths: plan.duration,
    }]);
  };

  const handleItemClick = (item: any) => {
    const variants = activeTab === "services"
      ? (Array.isArray(item.types) ? item.types.filter((v: any) => v.name) : [])
      : [];
    if (variants.length > 0) setTypePicker(item);
    else addToCart(item);
  };

  const updateCartItem = (uid: string, field: keyof CartItem, value: any) => {
    setCart(prev => prev.map(item => {
      if (item.uid !== uid) return item;
      if (field === "staffId") {
        const s = staff.find((s: any) => (s.id || s._id) === value);
        return { ...item, staffId: value || null, staffName: s?.name || "" };
      }
      return { ...item, [field]: value };
    }));
  };

  const removeCartItem = (uid: string) => setCart(prev => prev.filter(i => i.uid !== uid));
  const getItemTotal   = (item: CartItem) => Math.max(0, item.price * item.quantity - (item.discountAmt || 0));

  const subtotal             = cart.reduce((a, i) => a + getItemTotal(i), 0);
  const totalItemDiscount    = cart.reduce((a, i) => a + (i.discountAmt || 0), 0);
  const globalDiscountAmount = Math.min(globalDiscountAmt, subtotal);
  const afterDiscount        = Math.max(0, subtotal - globalDiscountAmount);
  const taxAmount            = (afterDiscount * taxPercent) / 100;
  const finalAmount          = Math.round(afterDiscount + taxAmount);

  const fetchMembership = async (cid: string) => {
    try {
      const r = await fetch(`${API_BASE}/customer-memberships/customer/${cid}`);
      const d = await r.json();
      setCustomerMembership(d.membership || null);
    } catch { setCustomerMembership(null); }
  };

  const selectCustomer = (c: any) => {
    const cid = c.id || c._id;
    setCustomerId(cid);
    setCustomerName(c.name);
    setCustomerPhone(c.phone || "");
    setCustomerDob(c.dob || "");
    setCustomerAnniversary(c.anniversary || "");
    setSelectedMemberParentName(c._isFamily ? c._parentName : "");
    if (c.activeMembership !== undefined) setCustomerMembership(c.activeMembership || null);
    else fetchMembership(cid);
    setShowCustomerDropdown(false); setCustomerSearch("");
  };

  const selectWalkIn = () => {
    setCustomerId(""); setCustomerName("Walk-in Customer"); setCustomerPhone("");
    setCustomerDob(""); setCustomerAnniversary(""); setSelectedMemberParentName("");
    setShowCustomerDropdown(false); setCustomerSearch(""); setCustomerMembership(null);
  };

  const resetAddForm = () => {
    setAddForm({ name: "", phone: "", dob: "", gender: "", anniversary: "", membershipId: "", membershipStartDate: "", familyMembers: [] });
    setShowPOSFamilySection(false);
    setAddPhoneError("");
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(addForm.phone)) { setAddPhoneError("Phone must be exactly 10 digits"); return; }

    // Frontend uniqueness check against loaded customers (phones of main customers + their family members)
    const allExistingPhones: string[] = [];
    for (const c of customers as any[]) {
      if (c.phone) allExistingPhones.push(c.phone);
      for (const m of (c.familyMembers || [])) { if (m.phone) allExistingPhones.push(m.phone); }
    }
    if (allExistingPhones.includes(addForm.phone)) {
      setAddPhoneError("This phone number is already registered in the system.");
      return;
    }

    // Validate family member phones
    if (showPOSFamilySection) {
      const validFM = addForm.familyMembers.filter(m => m.name.trim());
      for (let i = 0; i < validFM.length; i++) {
        const m = validFM[i];
        if (!m.phone) continue;
        if (!/^\d{10}$/.test(m.phone)) { setAddPhoneError(`Family member ${i + 1}: phone must be 10 digits`); return; }
        if (m.phone === addForm.phone) { setAddPhoneError(`Family member ${i + 1}: cannot match the customer's phone`); return; }
        if (validFM.slice(0, i).some(prev => prev.phone === m.phone)) { setAddPhoneError(`Family member ${i + 1}: duplicate phone number`); return; }
        if (allExistingPhones.includes(m.phone)) { setAddPhoneError(`Family member ${i + 1}: phone already registered`); return; }
      }
    }

    setAddLoading(true);
    try {
      const validFamilyMembers = addForm.familyMembers.filter(m => m.name.trim());
      const res = await fetch(`${API_BASE}/customers`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addForm.name, phone: addForm.phone, dob: addForm.dob, gender: addForm.gender, anniversary: addForm.anniversary, email: "" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAddPhoneError(err.error || "Failed to add customer.");
        return;
      }
      const newC = await res.json();
      const newCId = newC.id || newC._id;
      if (addForm.membershipId) {
        const today = new Date().toISOString().slice(0, 10);
        await fetch(`${API_BASE}/customer-memberships`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId: newCId, membershipId: addForm.membershipId, startDate: addForm.membershipStartDate || today }),
        }).catch(() => {});
      }
      for (const member of validFamilyMembers) {
        try {
          await fetch(`${API_BASE}/customers/${newCId}/family-member`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(member),
          });
        } catch {}
      }
      await refetchCustomers(); selectCustomer(newC);
      setShowAddCustomer(false); resetAddForm();
      toast({ title: "Customer Added", description: `${addForm.name} added & selected.` });
    } catch { toast({ title: "Error", description: "Failed to add customer.", variant: "destructive" }); }
    finally { setAddLoading(false); }
  };

  const handleGenerateBill = async () => {
    if (cart.length === 0) { toast({ title: "Cart is empty", description: "Add at least one item.", variant: "destructive" }); return; }

    const currentEditBillId = editBillIdRef.current;

    const billData = {
      customerId: customerId || null, customerName: customerName || "Walk-in Customer", customerPhone: customerPhone || "",
      items: cart.map(i => ({ type: i.type, itemId: i.itemId, name: i.name, staffId: i.staffId || null, staffName: i.staffName || null, price: i.price, quantity: i.quantity, discount: i.discountAmt, total: getItemTotal(i), durationMonths: i.durationMonths, isUpgradation: i.isUpgradation || false })),
      subtotal, taxPercent, taxAmount, paymentMethod, discountAmount: globalDiscountAmount, finalAmount, status: "paid",
      notes: [specialLabel || membershipLabel, selectedMemberParentName ? `Family of ${selectedMemberParentName}` : ""].filter(Boolean).join(" · "),
    };

    const assignMembershipsForCustomer = async (cid: string) => {
      const membershipItems = cart.filter(i => i.type === "membership");
      for (const item of membershipItems) {
        const today = new Date().toISOString().slice(0, 10);
        await fetch(`${API_BASE}/customer-memberships`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId: cid, membershipId: item.itemId, startDate: today }),
        }).catch(() => {});
      }
    };

    if (currentEditBillId) {
      // Edit mode: PUT to update existing bill
      setIsEditSubmitting(true);
      try {
        const res = await fetch(`${API_BASE}/bills/${currentEditBillId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(billData),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error || "Failed to update");
        }
        if (customerId && cart.some(i => i.type === "membership")) await assignMembershipsForCustomer(customerId);
        // Save any new family members added during membership purchase
        if (customerId && posFamilyToAdd.filter(m => m.name.trim()).length > 0) {
          const existing = (customers as any[]).find((c: any) => (c.id || c._id) === customerId);
          const existingFM = Array.isArray(existing?.familyMembers) ? existing.familyMembers : [];
          const merged = [...existingFM, ...posFamilyToAdd.filter(m => m.name.trim()).map(m => ({
            name: m.name.trim(), phone: m.phone.trim(), gender: m.gender, dob: m.dob, anniversary: m.anniversary,
          }))];
          await fetch(`${API_BASE}/customers/${customerId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ familyMembers: merged }),
          }).catch(() => {});
        }
        toast({ title: "✓ Invoice Updated!", description: `Bill updated successfully — ₹${finalAmount.toLocaleString("en-IN")}` });
        setCart([]); setCustomerId(""); setCustomerName("Walk-in Customer"); setCustomerPhone("");
        setCustomerDob(""); setCustomerAnniversary(""); setGlobalDiscountAmt(0); setCustomerMembership(null);
        setPosFamilyToAdd([]); setShowPosFamilySection(false);
        navigate("/invoices");
      } catch (err: any) {
        toast({ title: "Failed to update bill", description: err?.message || "Please try again.", variant: "destructive" });
      } finally {
        setIsEditSubmitting(false);
      }
    } else {
      // New bill mode
      createBill.mutate({ data: billData as any }, {
        onSuccess: async (bill: any) => {
          if (customerId && cart.some(i => i.type === "membership")) await assignMembershipsForCustomer(customerId);
          // Save any new family members added during membership purchase
          if (customerId && posFamilyToAdd.filter(m => m.name.trim()).length > 0) {
            const existing = (customers as any[]).find((c: any) => (c.id || c._id) === customerId);
            const existingFM = Array.isArray(existing?.familyMembers) ? existing.familyMembers : [];
            const merged = [...existingFM, ...posFamilyToAdd.filter(m => m.name.trim()).map(m => ({
              name: m.name.trim(), phone: m.phone.trim(), gender: m.gender, dob: m.dob, anniversary: m.anniversary,
            }))];
            await fetch(`${API_BASE}/customers/${customerId}`, {
              method: "PATCH", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ familyMembers: merged }),
            }).catch(() => {});
          }
          toast({ title: "✓ Bill Generated!", description: `${(bill as any).billNumber} — ₹${finalAmount.toLocaleString("en-IN")}` });
          setCart([]); setCustomerId(""); setCustomerName("Walk-in Customer"); setCustomerPhone("");
          setCustomerDob(""); setCustomerAnniversary(""); setGlobalDiscountAmt(0); setCustomerMembership(null);
          setPosFamilyToAdd([]); setShowPosFamilySection(false);
        },
        onError: () => toast({ title: "Failed to generate bill", variant: "destructive" }),
      });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={poppins}>

      {/* ══════════════ LEFT AREA ══════════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="shrink-0 px-5 py-3.5 flex items-center gap-4 bg-sidebar">
          <Link href="/">
            <button className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors bg-sidebar-accent text-white hover:bg-sidebar-accent/80">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <h1 className="font-bold text-lg leading-tight text-white tracking-wide" style={poppins}>Point of Sale</h1>
            <p className="text-xs text-white/60">{editBillId ? "Edit Bill" : "New Bill"}</p>
          </div>
          <div className="flex-1" />

          {/* Services / Products / Memberships toggle */}
          <div className="flex gap-1 p-1 rounded-xl bg-sidebar-accent">
            {([
              { id: "services", icon: Scissors, label: "Services" },
              { id: "products", icon: Package, label: "Products" },
              { id: "memberships", icon: Crown, label: "Membership" },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setActiveCategory("All"); setSearch(""); }}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                style={{
                  background: activeTab === tab.id ? "white" : "transparent",
                  color: activeTab === tab.id ? "hsl(var(--primary))" : "rgba(255,255,255,0.6)",
                }}>
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm focus:outline-none border-0 bg-sidebar-accent text-white placeholder:text-white/40"
            />
          </div>
        </div>

        {/* Category sidebar + grid */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Category Sidebar ── */}
          <div className="w-44 shrink-0 overflow-y-auto bg-background border-r border-border/50 py-2">
            <p className="px-4 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {activeTab === "services" ? "Categories" : "Category"}
            </p>
            {categories.map((cat: string) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="w-full text-left px-4 py-2.5 text-sm font-medium transition-all"
                style={activeCategory === cat ? {
                  background: "hsl(var(--primary))",
                  color: "white",
                  borderRadius: "0 20px 20px 0",
                  width: "calc(100% - 8px)",
                } : {
                  color: "hsl(var(--foreground))",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* ── Main Grid ── */}
          <div className="flex-1 overflow-y-auto p-4 bg-muted/40">
            {/* Membership Plans Grid */}
            {activeTab === "memberships" && (
              membershipPlans.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary/10">
                    <Crown className="w-6 h-6 text-primary/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No membership plans found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {membershipPlans.map((plan: any) => {
                    const pid = plan.id || plan._id;
                    const inCart = cart.some(c => c.type === "membership" && c.itemId === pid);
                    return (
                      <button key={pid} onClick={() => addMembershipToCart(plan)}
                        disabled={inCart}
                        className="relative text-left p-4 rounded-2xl bg-card transition-all active:scale-95 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{
                          border: inCart ? "2px solid hsl(var(--primary))" : "1.5px solid hsl(var(--border))",
                          boxShadow: inCart ? "0 4px 16px hsl(var(--primary) / 0.15)" : undefined,
                        }}>
                        {inCart && (
                          <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full text-primary-foreground text-[10px] font-bold flex items-center justify-center bg-primary">✓</span>
                        )}
                        <Crown className="w-5 h-5 text-amber-500 mb-2" />
                        <p className="font-bold text-sm leading-snug mb-1 pr-5 text-foreground">{plan.name}</p>
                        <p className="text-[10px] text-muted-foreground mb-2">{plan.duration} months{plan.discountPercent > 0 ? ` · ${plan.discountPercent}% off` : ""}</p>
                        <p className="text-base font-extrabold text-primary">₹{Number(plan.price || 0).toLocaleString("en-IN")}</p>
                      </button>
                    );
                  })}
                </div>
              )
            )}

            {/* Services / Products Grid */}
            {activeTab !== "memberships" && filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary/10">
                  <Receipt className="w-6 h-6 text-primary/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No {activeTab} found</p>
              </div>
            ) : activeTab !== "memberships" && (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredItems.map((item: any) => {
                  const id       = item.id || item._id;
                  const variants = activeTab === "services"
                    ? (Array.isArray(item.types) ? item.types.filter((v: any) => v.name) : [])
                    : [];
                  const basePrice = Number(activeTab === "services" ? item.price : item.sellingPrice) || 0;
                  const minPrice  = variants.length > 0
                    ? Math.min(...variants.map((v: any) => Number(v.price) || 0))
                    : basePrice;
                  const displayPrice = variants.length > 0
                    ? `From ₹${minPrice.toLocaleString("en-IN")}`
                    : `₹${basePrice.toLocaleString("en-IN")}`;
                  const inCart = cart.filter(c => c.itemId === id).length;

                  const topStylist = activeTab === "services" ? stylistStats[item.name] : null;
                  return (
                    <button key={id} onClick={() => handleItemClick(item)}
                      className="relative text-left p-4 rounded-2xl bg-card transition-all active:scale-95 hover:shadow-md"
                      style={{
                        border: inCart > 0 ? "2px solid hsl(var(--primary))" : "1.5px solid hsl(var(--border))",
                        boxShadow: inCart > 0 ? "0 4px 16px hsl(var(--primary) / 0.15)" : undefined,
                      }}>
                      {inCart > 0 && (
                        <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full text-primary-foreground text-[10px] font-bold flex items-center justify-center bg-primary">
                          {inCart}
                        </span>
                      )}
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-muted-foreground">{item.category}</p>
                      <p className="font-bold text-sm leading-snug mb-2 pr-5 line-clamp-2 text-foreground">{item.name}</p>
                      {topStylist?.staffName && (
                        <div className="flex items-center gap-1 mb-2">
                          <span className="text-amber-400 text-[10px]">★</span>
                          <span className="text-[10px] font-semibold text-amber-700 truncate">{topStylist.staffName}</span>
                        </div>
                      )}
                      <div className="flex items-end justify-between">
                        <p className="text-base font-extrabold text-primary">{displayPrice}</p>
                        {variants.length > 0 && (
                          <span className="text-[10px] font-medium text-muted-foreground">{variants.length} types</span>
                        )}
                        {activeTab === "services" && item.duration && variants.length === 0 && (
                          <span className="text-[10px] flex items-center gap-0.5 text-muted-foreground">
                            <Clock className="w-3 h-3" />{item.duration}m
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════ RIGHT PANEL ══════════════ */}
      <div className="w-[390px] shrink-0 flex flex-col bg-sidebar border-l border-sidebar-border">

        {/* Customer selector */}
        <div className="px-4 pt-4 pb-3 border-b border-sidebar-border">
          <p className="text-[10px] uppercase tracking-widest font-bold mb-2 text-white">Customer</p>

          {/* Special day discount banner */}
          {specialLabel && (
            <div className="mb-2 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/25 border border-rose-400/30">
              <span className="text-xs font-semibold text-white">{specialLabel}</span>
            </div>
          )}

          {/* Membership badge (only when no special day override) */}
          {!specialLabel && customerMembership && (
            <div className="mb-2 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sidebar-accent">
              <BadgeCheck className="w-3.5 h-3.5 shrink-0 text-sidebar-primary" />
              <span className="text-xs font-semibold text-white">{customerMembership.membershipName}</span>
              {customerMembership.discountPercent > 0 && (
                <span className="text-xs text-white/70">· {customerMembership.discountPercent}% off</span>
              )}
              <span className="text-[10px] ml-auto text-white/60">
                till {new Date(customerMembership.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
              </span>
            </div>
          )}

          <div className="relative" ref={customerRef}>
            <button onClick={() => setShowCustomerDropdown(v => !v)}
              className="w-full flex items-center gap-2.5 p-3 rounded-xl text-sm text-left transition-colors bg-sidebar-accent"
              style={{ border: `1px solid ${showCustomerDropdown ? "hsl(var(--sidebar-primary))" : "transparent"}` }}>
              <UserCircle2 className="w-5 h-5 shrink-0 text-sidebar-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-white">{customerName || "Walk-in Customer"}</p>
                {selectedMemberParentName && (
                  <p className="text-[10px] text-violet-300 font-medium">Family of {selectedMemberParentName}</p>
                )}
                {!selectedMemberParentName && customerPhone && <p className="text-xs text-white/60">{customerPhone}</p>}
              </div>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform text-white ${showCustomerDropdown ? "rotate-180" : ""}`} />
            </button>

            {showCustomerDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl shadow-2xl z-50 overflow-hidden bg-sidebar-accent border border-sidebar-border">
                <div className="p-2 border-b border-sidebar-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                    <input autoFocus type="text" placeholder="Search customer..." value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg text-xs focus:outline-none bg-sidebar text-white border-none placeholder:text-white/40"
                    />
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  <button onClick={selectWalkIn}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-sidebar/50 text-white"
                    style={{ background: !customerId ? "hsl(var(--sidebar) / 0.6)" : "transparent" }}>
                    <UserCircle2 className="w-4 h-4 shrink-0 text-white/60" />
                    <span>Walk-in Customer</span>
                    {!customerId && <Check className="w-3.5 h-3.5 ml-auto text-sidebar-primary" />}
                  </button>
                  {filteredCustomers.map((c: any) => {
                    const key = c._isFamily ? `fm-${c._parentId}-${c.name}` : (c.id || c._id);
                    const sel = c._isFamily
                      ? (customerId === c._parentId && customerName === c.name)
                      : customerId === (c.id || c._id);
                    return (
                      <button key={key} onClick={() => selectCustomer(c)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-sidebar/50 text-white"
                        style={{ background: sel ? "hsl(var(--sidebar) / 0.6)" : "transparent" }}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white ${c._isFamily ? "bg-violet-500/30" : "bg-sidebar"}`}>
                          {c.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-medium truncate text-xs text-white">{c.name}</p>
                          <p className="text-[11px] text-white/60">{c.phone || <span className="italic opacity-50">No phone</span>}</p>
                          {c._isFamily && (
                            <p className="text-[10px] text-violet-300 font-medium">Family of {c._parentName}</p>
                          )}
                        </div>
                        {c.activeMembership && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold shrink-0 text-sidebar-primary"
                            style={{ background: "hsl(var(--sidebar-primary) / 0.15)" }}>
                            <BadgeCheck className="w-2.5 h-2.5" /> {c.activeMembership.membershipName}
                          </span>
                        )}
                        {sel && <Check className="w-3.5 h-3.5 shrink-0 text-sidebar-primary" />}
                      </button>
                    );
                  })}
                  {filteredCustomers.length === 0 && customerSearch && (
                    <p className="px-3 py-3 text-xs text-center text-white/50">No customer found</p>
                  )}
                </div>
                <div className="p-2 border-t border-sidebar-border">
                  <button onClick={() => { setShowCustomerDropdown(false); setShowAddCustomer(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors bg-sidebar text-white hover:bg-sidebar/80">
                    <UserPlus className="w-4 h-4 text-sidebar-primary" /> Add New Customer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-sidebar-accent">
                <Receipt className="w-6 h-6 text-white/40" />
              </div>
              <p className="text-sm font-semibold text-white">Cart is empty</p>
              <p className="text-xs text-center max-w-36 text-white/60">Tap a service or product to add it here</p>
            </div>
          ) : (
            cart.map((item, idx) => {
              const lineTotal = getItemTotal(item);
              const isUpg = !!item.isUpgradation;
              return (
                <div key={item.uid}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: isUpg ? "linear-gradient(135deg, #78350f22 0%, #92400e33 100%)" : "hsl(var(--sidebar-accent))", border: isUpg ? "1.5px solid #f59e0b55" : "1.5px solid transparent" }}>
                  <div className="flex items-start gap-2.5 px-3 pt-3 pb-2">
                    <div className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 bg-sidebar text-white">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-sm leading-tight text-white">{item.name}</p>
                        {isUpg && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <TrendingUp className="w-2.5 h-2.5" /> Upgradation
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-medium mt-0.5 capitalize text-white/60">{item.type}</p>
                    </div>
                    <p className="font-extrabold text-sm shrink-0 text-white">₹{lineTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 pb-3">
                    {item.type === "membership" && (
                      <span className="flex-1 text-[10px] text-amber-300 font-medium flex items-center gap-1">
                        <Crown className="w-3 h-3" /> {item.durationMonths ? `${item.durationMonths} months` : "Membership plan"}
                      </span>
                    )}
                    {(item.type === "service" || item.type === "product") && (
                      <StaffPicker
                        staff={staff}
                        value={item.staffId || ""}
                        onChange={sid => updateCartItem(item.uid, "staffId", sid)}
                        placeholder={item.type === "service" ? "Assign staff" : "Sold by"}
                      />
                    )}
                    {/* Upgradation toggle — appears on any non-membership item */}
                    {item.type !== "membership" && (
                      <button
                        onClick={() => updateCartItem(item.uid, "isUpgradation", !isUpg)}
                        title={isUpg ? "Remove Upgradation tag" : "Mark as Upgradation (upsell)"}
                        className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-lg transition-colors ${isUpg ? "bg-amber-500/30 text-amber-300" : "bg-sidebar text-white/40 hover:text-amber-300 hover:bg-amber-500/20"}`}>
                        <TrendingUp className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="flex items-center rounded-lg overflow-hidden shrink-0 bg-sidebar">
                      <button className="w-7 h-7 flex items-center justify-center font-bold transition-colors hover:opacity-70 text-white"
                        onClick={() => updateCartItem(item.uid, "quantity", Math.max(1, item.quantity - 1))}>−</button>
                      <span className="px-2 font-bold text-sm min-w-[1.5rem] text-center text-white">{item.quantity}</span>
                      <button className="w-7 h-7 flex items-center justify-center font-bold transition-colors hover:opacity-70 text-white"
                        onClick={() => updateCartItem(item.uid, "quantity", item.quantity + 1)}>+</button>
                    </div>
                    <div className="flex items-center shrink-0 rounded-lg overflow-hidden bg-sidebar">
                      <span className="px-1.5 text-[10px] font-medium border-r h-full flex items-center py-1.5 text-white border-sidebar-border">₹</span>
                      <input type="text" inputMode="numeric" placeholder="0"
                        value={item.discountAmt === 0 ? "" : item.discountAmt}
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g, "");
                          const base = item.price * item.quantity;
                          updateCartItem(item.uid, "discountAmt", Math.min(base, Number(digits) || 0));
                        }}
                        className={`w-12 text-xs bg-transparent px-1.5 py-1.5 focus:outline-none text-center font-semibold text-white ${noSpinner}`}
                      />
                    </div>
                    <button onClick={() => removeCartItem(item.uid)}
                      className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg transition-colors hover:opacity-70 bg-sidebar text-white">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Family members section — appears when buying a membership for a registered customer */}
        {cart.some(i => i.type === "membership") && customerId && (
          <div className="mx-3 mb-2 rounded-2xl bg-sidebar-accent overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-white"
              onClick={() => setShowPosFamilySection(v => !v)}>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-300" />
                Add Family Members to this Membership
              </span>
              <span className="text-white/50 text-[10px]">
                {showPosFamilySection ? "▲" : "▼"}
                {posFamilyToAdd.filter(m => m.name.trim()).length > 0 && (
                  <span className="ml-1 bg-amber-400/30 text-amber-200 px-1.5 py-0.5 rounded-full">
                    {posFamilyToAdd.filter(m => m.name.trim()).length}
                  </span>
                )}
              </span>
            </button>
            {showPosFamilySection && (
              <div className="px-3 pb-3 space-y-2 border-t border-sidebar-border/50">
                <p className="text-[10px] text-white/50 pt-2">These members will be added to {customerName}'s family (max 4)</p>
                {posFamilyToAdd.map((m, idx) => (
                  <div key={idx} className="rounded-xl bg-sidebar p-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-white/70">Member {idx + 1}</span>
                      <button onClick={() => setPosFamilyToAdd(prev => prev.filter((_, i) => i !== idx))}
                        className="text-white/40 hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <input placeholder="Full name *" value={m.name}
                        onChange={e => setPosFamilyToAdd(prev => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                        className="col-span-2 w-full text-xs rounded-lg px-2 py-1.5 bg-sidebar-accent text-white placeholder:text-white/30 border-0 focus:outline-none" />
                      <input placeholder="Phone" value={m.phone} maxLength={10}
                        onChange={e => setPosFamilyToAdd(prev => prev.map((x, i) => i === idx ? { ...x, phone: e.target.value.replace(/\D/g, "") } : x))}
                        className="w-full text-xs rounded-lg px-2 py-1.5 bg-sidebar-accent text-white placeholder:text-white/30 border-0 focus:outline-none" />
                      <select value={m.gender}
                        onChange={e => setPosFamilyToAdd(prev => prev.map((x, i) => i === idx ? { ...x, gender: e.target.value } : x))}
                        className="w-full text-xs rounded-lg px-2 py-1.5 bg-sidebar-accent text-white border-0 focus:outline-none">
                        <option value="">Gender</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                      <input type="date" placeholder="Birthday" value={m.dob}
                        onChange={e => setPosFamilyToAdd(prev => prev.map((x, i) => i === idx ? { ...x, dob: e.target.value } : x))}
                        className="w-full text-xs rounded-lg px-2 py-1.5 bg-sidebar-accent text-white border-0 focus:outline-none" />
                      <input type="date" placeholder="Anniversary" value={m.anniversary}
                        onChange={e => setPosFamilyToAdd(prev => prev.map((x, i) => i === idx ? { ...x, anniversary: e.target.value } : x))}
                        className="w-full text-xs rounded-lg px-2 py-1.5 bg-sidebar-accent text-white border-0 focus:outline-none" />
                    </div>
                  </div>
                ))}
                {posFamilyToAdd.length < 4 && (
                  <button
                    onClick={() => setPosFamilyToAdd(prev => [...prev, { ...EMPTY_POS_ADD }])}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-white/20 text-xs font-semibold text-white/60 hover:text-white hover:border-white/40 transition-colors">
                    <Plus className="w-3 h-3" /> Add Member
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bill summary */}
        <div className="shrink-0 border-t border-sidebar-border">
          <div className="px-4 pt-4 pb-2 space-y-2.5">
            {specialLabel && totalItemDiscount > 0 ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Gross ({cart.length} item{cart.length !== 1 ? "s" : ""})</span>
                  <span className="font-semibold text-white/70">₹{(subtotal + totalItemDiscount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-amber-300 font-semibold">{specialLabel.replace(/ — .*$/, "")} Discount</span>
                  <span className="font-bold text-amber-300">−₹{totalItemDiscount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white">Subtotal</span>
                  <span className="font-semibold text-white">₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-sm">
                <span className="text-white">Subtotal ({cart.length} item{cart.length !== 1 ? "s" : ""})</span>
                <span className="font-semibold text-white">₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm flex items-center gap-1 shrink-0 text-white">
                <Tag className="w-3.5 h-3.5" /> Extra Discount
              </span>
              <div className="flex items-center ml-auto rounded-lg overflow-hidden bg-sidebar-accent">
                <span className="text-[11px] px-1.5 flex items-center py-1.5 border-r text-white border-sidebar-border">₹</span>
                <input type="text" inputMode="numeric" value={globalDiscountAmt === 0 ? "" : globalDiscountAmt}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setGlobalDiscountAmt(Math.min(subtotal, Number(digits) || 0));
                  }} placeholder="0"
                  className={`w-16 text-xs text-center px-1.5 py-1 focus:outline-none bg-transparent font-semibold text-white ${noSpinner}`}
                />
              </div>
              <span className="text-sm font-medium min-w-[3rem] text-right text-white">
                {globalDiscountAmount > 0 ? `−₹${globalDiscountAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <button onClick={() => setTaxEnabled(t => !t)} className="flex items-center gap-2 transition-colors text-white">
                <div className="w-8 h-4 rounded-full relative transition-colors"
                  style={{ background: taxEnabled ? "hsl(var(--sidebar-primary))" : "hsl(var(--sidebar-accent))" }}>
                  <div className="w-3 h-3 rounded-full absolute top-0.5 transition-all bg-white"
                    style={{ left: taxEnabled ? "calc(100% - 14px)" : "2px" }} />
                </div>
                GST
              </button>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center rounded-lg overflow-hidden bg-sidebar-accent">
                  <input type="text" inputMode="numeric" value={taxRate}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, "");
                      const val = Math.min(100, Number(digits) || 0);
                      setTaxRate(val);
                    }}
                    className={`w-8 text-xs text-center px-1 py-1 focus:outline-none bg-transparent font-semibold text-white ${noSpinner}`}
                  />
                  <span className="text-[11px] pr-1.5 text-white/70">%</span>
                </div>
                <span className="font-medium text-white min-w-[3rem] text-right">
                  {taxEnabled ? `+₹${taxAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-sidebar-border">
              <span className="font-bold text-base text-white">Final Amount</span>
              <span className="text-2xl font-extrabold text-white">₹{finalAmount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="px-4 pb-3">
            <p className="text-[10px] uppercase tracking-widest font-bold mb-2 text-white">Payment Method</p>
            <div className="grid grid-cols-4 gap-1.5">
              {PAYMENT_METHODS.map(m => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id as any)}
                  className="py-2.5 flex flex-col items-center gap-1 rounded-xl text-xs font-semibold transition-all"
                  style={paymentMethod === m.id
                    ? { background: "white", color: "hsl(var(--primary))", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }
                    : { background: "hsl(var(--sidebar-accent))", color: "white" }}>
                  <m.icon className="w-4 h-4" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 pb-5">
            {(() => {
              const isDisabled = cart.length === 0 || createBill.isPending || isEditSubmitting;
              const isActive = !isDisabled;
              return (
                <button onClick={handleGenerateBill} disabled={isDisabled}
                  className={`w-full py-4 rounded-2xl font-bold text-base transition-all text-white ${isActive ? "rose-gold-gradient" : "bg-sidebar-accent opacity-40 cursor-not-allowed"}`}
                  style={isActive ? { boxShadow: "0 4px 20px hsl(15 40% 60% / 0.45)" } : {}}>
                  {(createBill.isPending || isEditSubmitting)
                    ? "Processing..."
                    : cart.length === 0
                    ? "Add items to generate bill"
                    : editBillId
                    ? `Update Invoice — ₹${finalAmount.toLocaleString("en-IN")}`
                    : `Generate Bill — ₹${finalAmount.toLocaleString("en-IN")}`}
                </button>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ══════════════ Type Picker Modal ══════════════ */}
      {typePicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-sidebar-accent rounded-2xl w-full max-w-sm border border-sidebar-border shadow-2xl" style={poppins}>
            <div className="flex items-center justify-between p-5 border-b border-sidebar-border">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{typePicker.category}</p>
                <h3 className="font-bold text-white text-lg leading-tight">{typePicker.name}</h3>
              </div>
              <button onClick={() => setTypePicker(null)}
                className="p-1.5 rounded-lg bg-sidebar text-white/60 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {autoDiscountPct > 0 && (
                <p className="text-[11px] text-center text-white/60 pb-1">
                  {autoDiscountPct}% discount will be applied automatically
                </p>
              )}
              {(Array.isArray(typePicker.types) ? typePicker.types.filter((v: any) => v.name) : []).map((v: any) => {
                const variantName = `${typePicker.name} — ${v.name}`;
                const alreadySelected = cart.some(
                  (c) => c.itemId === (typePicker.id || typePicker._id) && c.name === variantName
                );
                return (
                  <button key={v.name}
                    disabled={alreadySelected}
                    onClick={() => { addToCart(typePicker, Number(v.price) || 0, variantName); setTypePicker(null); }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                      alreadySelected
                        ? "bg-sidebar/40 opacity-40 cursor-not-allowed"
                        : "bg-sidebar hover:bg-sidebar/80"
                    }`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${alreadySelected ? "text-white/50" : "text-white"}`}>{v.name}</span>
                      {alreadySelected && (
                        <span className="text-[10px] font-medium text-white/40 bg-white/10 px-2 py-0.5 rounded-full">Added</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`font-bold text-sm ${alreadySelected ? "text-white/40" : "text-white"}`}>₹{(Number(v.price) || 0).toLocaleString("en-IN")}</span>
                      {autoDiscountPct > 0 && !alreadySelected && (
                        <span className="block text-[10px] text-emerald-400">
                          after disc: ₹{Math.round((Number(v.price) || 0) * (1 - autoDiscountPct / 100)).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ Add Customer Modal ══════════════ */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="rounded-3xl w-full max-w-md shadow-2xl bg-sidebar-accent border border-sidebar-border flex flex-col max-h-[90vh]" style={poppins}>
            <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
              <h2 className="text-2xl font-bold text-white">New Customer</h2>
              <button onClick={() => { setShowAddCustomer(false); resetAddForm(); }}
                className="p-2 rounded-xl transition-colors bg-sidebar text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="px-8 pb-8 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-white/60">Full Name *</label>
                <input required type="text" placeholder="Enter full name"
                  className="w-full p-3 rounded-xl focus:outline-none border-0 bg-sidebar text-white placeholder:text-white/30"
                  value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-white/60">Gender</label>
                <div className="flex gap-2">
                  {[{ label: "♂ Male", value: "male" }, { label: "♀ Female", value: "female" }].map(g => (
                    <button key={g.value} type="button"
                      onClick={() => setAddForm({ ...addForm, gender: addForm.gender === g.value ? "" : g.value })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${addForm.gender === g.value ? "bg-primary text-white" : "bg-sidebar text-white/60 hover:text-white"}`}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-white/60">Phone Number * (10 digits)</label>
                <input required type="tel" placeholder="10-digit mobile number"
                  className="w-full p-3 rounded-xl focus:outline-none border-0 bg-sidebar text-white placeholder:text-white/30"
                  value={addForm.phone}
                  onChange={e => { const v = e.target.value.replace(/\D/g, ""); if (v.length === 10) setAddPhoneError(""); setAddForm({ ...addForm, phone: v }); }}
                  maxLength={10} />
                {addPhoneError && <p className="text-destructive text-xs mt-1">{addPhoneError}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-white/60">Date of Birth</label>
                <input type="date"
                  className="w-full p-3 rounded-xl focus:outline-none border-0 bg-sidebar text-white placeholder:text-white/30 [&::-webkit-calendar-picker-indicator]:invert"
                  value={addForm.dob} onChange={e => setAddForm({ ...addForm, dob: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-white/60">Anniversary Date</label>
                <input type="date"
                  className="w-full p-3 rounded-xl focus:outline-none border-0 bg-sidebar text-white placeholder:text-white/30 [&::-webkit-calendar-picker-indicator]:invert"
                  value={addForm.anniversary} onChange={e => setAddForm({ ...addForm, anniversary: e.target.value })} />
              </div>

              {/* Membership */}
              {membershipPlans.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-white/60">Membership <span className="opacity-50">(optional)</span></label>
                  <select
                    className="w-full p-3 rounded-xl focus:outline-none border-0 bg-sidebar text-white appearance-none text-sm"
                    value={addForm.membershipId}
                    onChange={e => setAddForm({ ...addForm, membershipId: e.target.value, membershipStartDate: "" })}
                  >
                    <option value="">— No membership —</option>
                    {membershipPlans.map((m: any) => (
                      <option key={m.id || m._id} value={m.id || m._id}>
                        {m.name} — ₹{m.price?.toLocaleString()} / {m.duration} mo
                      </option>
                    ))}
                  </select>
                  {addForm.membershipId && (
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-white/60">Membership Start Date</label>
                      <input type="date"
                        className="w-full p-3 rounded-xl focus:outline-none border-0 bg-sidebar text-white [&::-webkit-calendar-picker-indicator]:invert"
                        value={addForm.membershipStartDate}
                        onChange={e => setAddForm({ ...addForm, membershipStartDate: e.target.value })} />
                    </div>
                  )}
                </div>
              )}

              {/* Family Members — only available when a membership is selected */}
              {addForm.membershipId && (
              <div className="border border-sidebar-border rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    if (!showPOSFamilySection) {
                      setShowPOSFamilySection(true);
                      if (addForm.familyMembers.length === 0) setAddForm(f => ({ ...f, familyMembers: [{ ...EMPTY_POS_MEMBER }] }));
                    } else {
                      setShowPOSFamilySection(false);
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-white/80 hover:text-white transition-colors bg-sidebar/50"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {showPOSFamilySection ? "Hide Family Members" : `Family Members${addForm.familyMembers.length > 0 ? ` (${addForm.familyMembers.length})` : ""}`}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showPOSFamilySection ? "rotate-180" : ""}`} />
                </button>

                {showPOSFamilySection && (
                  <div className="p-4 space-y-3 bg-sidebar/30">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-white/60 font-semibold uppercase tracking-wider">Family Members <span className="opacity-60">(up to {MAX_POS_FAMILY})</span></p>
                      {addForm.familyMembers.length < MAX_POS_FAMILY && (
                        <button type="button"
                          onClick={() => setAddForm(f => ({ ...f, familyMembers: [...f.familyMembers, { ...EMPTY_POS_MEMBER }] }))}
                          className="flex items-center gap-1 text-xs font-semibold text-sidebar-primary hover:opacity-80 transition-opacity">
                          <Plus className="w-3.5 h-3.5" /> Add Member
                        </button>
                      )}
                    </div>
                    {addForm.familyMembers.map((m, idx) => (
                      <div key={idx} className="bg-sidebar rounded-xl p-3 border border-sidebar-border space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Member {idx + 1}</span>
                          <button type="button"
                            onClick={() => setAddForm(f => ({ ...f, familyMembers: f.familyMembers.filter((_, i) => i !== idx) }))}
                            className="text-white/40 hover:text-destructive transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wider text-white/50">Name *</label>
                          <input type="text" placeholder="Member name"
                            className="w-full p-2.5 rounded-lg focus:outline-none border-0 bg-sidebar-accent text-white text-sm placeholder:text-white/30"
                            value={m.name}
                            onChange={e => { const members = [...addForm.familyMembers]; members[idx] = { ...m, name: e.target.value }; setAddForm(f => ({ ...f, familyMembers: members })); }} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wider text-white/50">Gender</label>
                          <div className="flex gap-2">
                            {[{ label: "♂ Male", value: "male" }, { label: "♀ Female", value: "female" }].map(g => (
                              <button key={g.value} type="button"
                                onClick={() => { const members = [...addForm.familyMembers]; members[idx] = { ...m, gender: m.gender === g.value ? "" : g.value }; setAddForm(f => ({ ...f, familyMembers: members })); }}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${m.gender === g.value ? "bg-primary text-white" : "bg-sidebar-accent text-white/50 hover:text-white"}`}>
                                {g.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wider text-white/50">Contact No</label>
                          <input type="tel" placeholder="10-digit number"
                            className="w-full p-2.5 rounded-lg focus:outline-none border-0 bg-sidebar-accent text-white text-sm placeholder:text-white/30"
                            value={m.phone}
                            maxLength={10}
                            onChange={e => { const v = e.target.value.replace(/\D/g, ""); const members = [...addForm.familyMembers]; members[idx] = { ...m, phone: v }; setAddForm(f => ({ ...f, familyMembers: members })); }} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wider text-white/50">Birth Date <span className="opacity-50">(opt)</span></label>
                            <input type="date"
                              className="w-full p-2.5 rounded-lg focus:outline-none border-0 bg-sidebar-accent text-white text-sm [&::-webkit-calendar-picker-indicator]:invert"
                              value={m.dob}
                              onChange={e => { const members = [...addForm.familyMembers]; members[idx] = { ...m, dob: e.target.value }; setAddForm(f => ({ ...f, familyMembers: members })); }} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wider text-white/50">Anniversary <span className="opacity-50">(opt)</span></label>
                            <input type="date"
                              className="w-full p-2.5 rounded-lg focus:outline-none border-0 bg-sidebar-accent text-white text-sm [&::-webkit-calendar-picker-indicator]:invert"
                              value={m.anniversary}
                              onChange={e => { const members = [...addForm.familyMembers]; members[idx] = { ...m, anniversary: e.target.value }; setAddForm(f => ({ ...f, familyMembers: members })); }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAddCustomer(false); resetAddForm(); }}
                  className="flex-1 py-3 rounded-xl font-semibold transition-colors bg-sidebar text-white hover:bg-sidebar/80">Cancel</button>
                <button type="submit" disabled={addLoading}
                  className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition-all rose-gold-gradient"
                  style={{ boxShadow: "0 4px 16px hsl(15 40% 60% / 0.4)" }}>
                  {addLoading ? "Saving..." : "Add & Select"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
