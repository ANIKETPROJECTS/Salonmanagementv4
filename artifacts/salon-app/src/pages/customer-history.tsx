import { useState, useEffect, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { ChevronLeft, Search, Filter, Receipt, Eye, Clock, Phone, Calendar } from "lucide-react";
import { InvoiceModal } from "@/components/InvoiceModal";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const API_BASE = "/api";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function CustomerHistory() {
  const [, params] = useRoute("/customers/:customerId/history");
  const customerId = params?.customerId;
  const { toast } = useToast();

  const [customer, setCustomer] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth());
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear());
  const [filterService, setFilterService] = useState("");
  const [viewingBill, setViewingBill] = useState<any>(null);
  const [billLoading, setBillLoading] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/customers/${customerId}`);
        const data = await res.json();
        setCustomer(data);
        setBills(data.bills || []);
      } catch {
        toast({ title: "Failed to load customer history", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [customerId]);

  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const d = new Date(bill.createdAt);
      const matchMonth = d.getMonth() === filterMonth && d.getFullYear() === filterYear;
      const matchService = !filterService || (bill.items || []).some((item: any) =>
        item.name.toLowerCase().includes(filterService.toLowerCase())
      );
      return matchMonth && matchService;
    });
  }, [bills, filterMonth, filterYear, filterService]);

  const stats = useMemo(() => ({
    totalSpend: filteredBills.reduce((a: number, b: any) => a + (b.finalAmount || b.grandTotal || 0), 0),
    visits: filteredBills.length,
    lastVisit: filteredBills.length > 0 ? new Date(filteredBills[0].createdAt) : null,
  }), [filteredBills]);

  const openInvoice = async (billId: string) => {
    setBillLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bills/${billId}`);
      if (!res.ok) throw new Error();
      const bill = await res.json();
      setViewingBill(bill);
    } catch {
      toast({ title: "Failed to load invoice", variant: "destructive" });
    } finally {
      setBillLoading(false);
    }
  };

  const yearOptions = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/customers">
          <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </Link>
        {customer ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
              {customer.name?.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="font-bold text-base">{customer.name}</h1>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {customer.phone && (
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{customer.phone}</span>
                )}
                {customer.dob && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    DOB: {format(new Date(customer.dob), "dd MMM yyyy")}
                  </span>
                )}
                <span className="text-muted-foreground/60">· Visit History</span>
              </div>
            </div>
          </div>
        ) : (
          <h1 className="font-bold text-base">Customer History</h1>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {!loading && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              {
                label: "Total Spent",
                value: `₹${stats.totalSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
              },
              { label: "Visits", value: stats.visits },
              {
                label: "Last Visit",
                value: stats.lastVisit
                  ? stats.lastVisit.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })
                  : "—",
              },
            ].map(s => (
              <div key={s.label} className="bg-card rounded-2xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background">
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background">
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input type="text" placeholder="Filter by service name..."
              value={filterService} onChange={e => setFilterService(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background" />
          </div>
          {filterService && (
            <button onClick={() => setFilterService("")}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">
              Clear
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {filteredBills.length} visit{filteredBills.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm">Loading visit history...</p>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground bg-card border border-border rounded-2xl">
            <Receipt className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">No visits found</p>
            <p className="text-xs text-center text-muted-foreground/60">
              No visits in {MONTHS[filterMonth]} {filterYear}
              {filterService ? ` matching "${filterService}"` : ""}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBills.map((bill, i) => {
              const date = new Date(bill.createdAt);
              return (
                <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4 px-5 py-4 border-b border-border/50">
                    <div className="shrink-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Bill</p>
                      <p className="font-bold text-primary text-sm">{bill.billNumber}</p>
                    </div>
                    <div className="w-px h-8 bg-border shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">
                        {bill.items?.length || 0} service{(bill.items?.length || 0) !== 1 ? "s" : ""}
                      </p>
                       <p className="text-xs text-muted-foreground capitalize">
                         {Array.isArray(bill.paymentBreakdown) && bill.paymentBreakdown.length > 1
                           ? bill.paymentBreakdown.map((payment: any) => `${payment.method}: ₹${Number(payment.amount || 0).toLocaleString("en-IN")}`).join(" · ")
                           : bill.paymentMethod || "—"}
                       </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium">
                        {date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-bold text-primary">
                        ₹{(bill.finalAmount || bill.grandTotal || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <button onClick={() => openInvoice(bill.id || bill._id)} disabled={billLoading}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 transition-colors text-xs font-semibold disabled:opacity-50">
                      <Eye className="w-3.5 h-3.5" /> Invoice
                    </button>
                  </div>
                  <div className="px-5 py-3 space-y-1.5">
                    {(bill.items || []).map((item: any, j: number) => (
                      <div key={j} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <div className="bg-muted/70 rounded-lg px-2.5 py-1 font-medium text-foreground">
                            {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ""}
                          </div>
                          {item.staffName && (
                            <span className="text-muted-foreground">by {item.staffName}</span>
                          )}
                        </div>
                        <span className="font-semibold text-foreground">
                          ₹{Number(item.total || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                    {(bill.discountAmount > 0 || bill.taxAmount > 0) && (
                      <div className="border-t border-border/30 pt-1.5 mt-1 space-y-1">
                        {bill.discountAmount > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Discount</span>
                            <span className="text-red-500 font-medium">-₹{Number(bill.discountAmount).toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        {bill.taxAmount > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Tax ({bill.taxPercent || 0}%)</span>
                            <span className="text-foreground font-medium">+₹{Number(bill.taxAmount).toLocaleString("en-IN")}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewingBill && <InvoiceModal bill={viewingBill} onClose={() => setViewingBill(null)} />}
    </div>
  );
}
