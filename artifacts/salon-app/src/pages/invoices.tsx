import { useState, useMemo } from "react";
import { Search, FileText, X, Eye, Calendar, Phone, Trash2, AlertTriangle, Pencil } from "lucide-react";
import { format } from "date-fns";
import { InvoiceModal } from "@/components/InvoiceModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

const API_BASE = "/api";

async function fetchBills() {
  const res = await fetch(`${API_BASE}/bills`);
  if (!res.ok) throw new Error("Failed to fetch bills");
  return res.json();
}

const PAY_METHODS = ["all", "cash", "card", "upi", "online"];
const PAY_COLORS: Record<string, string> = {
  cash: "bg-emerald-100 text-emerald-700",
  card: "bg-blue-100 text-blue-700",
  upi: "bg-violet-100 text-violet-700",
  online: "bg-sky-100 text-sky-700",
};

export default function Invoices() {
  const { data, isLoading } = useQuery({ queryKey: ["bills"], queryFn: fetchBills });
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [payFilter, setPayFilter] = useState("all");
  const [viewBill, setViewBill] = useState<any>(null);
  const [deleteBill, setDeleteBill] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const handleDelete = async () => {
    if (!deleteBill) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/bills/${deleteBill.id || deleteBill._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      setDeleteBill(null);
    } finally {
      setDeleting(false);
    }
  };

  const bills: any[] = data?.bills || [];

  const filtered = useMemo(() => {
    return bills.filter((b) => {
      const term = search.toLowerCase();
      const matchSearch =
        !term ||
        b.customerName?.toLowerCase().includes(term) ||
        b.customerPhone?.includes(term) ||
        b.billNumber?.toLowerCase().includes(term);
      const matchPay = payFilter === "all"
        || b.paymentMethod === payFilter
        || (Array.isArray(b.paymentBreakdown) && b.paymentBreakdown.some((payment: any) => payment.method === payFilter));
      const date = new Date(b.createdAt);
      const matchFrom = !fromDate || date >= new Date(fromDate);
      const matchTo = !toDate || date <= new Date(toDate + "T23:59:59");
      return matchSearch && matchPay && matchFrom && matchTo;
    });
  }, [bills, search, fromDate, toDate, payFilter]);

  const clearFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setPayFilter("all");
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = search || fromDate || toDate || payFilter !== "all";

  // Reset to page 1 when filters change
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleFromDate = (v: string) => { setFromDate(v); setPage(1); };
  const handleToDate = (v: string) => { setToDate(v); setPage(1); };
  const handlePayFilter = (v: string) => { setPayFilter(v); setPage(1); };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            All generated bills — view, filter & download invoices.
          </p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl font-semibold text-sm">
          {filtered.length} Invoice{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, phone or invoice no..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none text-sm bg-muted/30"
            />
          </div>

          {/* From Date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium px-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => handleFromDate(e.target.value)}
              className="py-2.5 px-3 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none text-sm bg-muted/30"
            />
          </div>

          {/* To Date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium px-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => handleToDate(e.target.value)}
              className="py-2.5 px-3 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none text-sm bg-muted/30"
            />
          </div>

          {/* Payment Method */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium px-1">Payment</label>
            <select
              value={payFilter}
              onChange={(e) => handlePayFilter(e.target.value)}
              className="py-2.5 px-3 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none text-sm bg-muted/30 capitalize"
            >
              {PAY_METHODS.map((m) => (
                <option key={m} value={m} className="capitalize">{m === "all" ? "All Methods" : m.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-sm text-muted-foreground"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                <th className="p-4 pl-6">Invoice #</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    Loading invoices...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground font-medium">No invoices found</p>
                    {hasFilters && (
                      <p className="text-muted-foreground/60 text-sm mt-1">Try clearing your filters</p>
                    )}
                  </td>
                </tr>
              ) : (
                paginated.map((bill: any) => (
                  <tr key={bill.id || bill._id} className="hover:bg-muted/20 transition-colors group">
                    {/* Invoice # */}
                    <td className="p-4 pl-6">
                      <span className="font-mono font-semibold text-sm text-primary">
                        {bill.billNumber}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="p-4">
                      <span className="font-medium text-sm">{bill.customerName || "Walk-in"}</span>
                    </td>

                    {/* Contact */}
                    <td className="p-4">
                      {bill.customerPhone ? (
                        <span className="text-sm text-muted-foreground">{bill.customerPhone}</span>
                      ) : (
                        <span className="text-muted-foreground/40 text-sm italic">—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {bill.createdAt ? format(new Date(bill.createdAt), "dd MMM yyyy, hh:mm a") : "—"}
                      </div>
                    </td>

                    {/* Payment */}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(bill.paymentBreakdown) && bill.paymentBreakdown.length > 0
                          ? bill.paymentBreakdown
                          : [{ method: bill.paymentMethod, amount: bill.finalAmount }]
                        ).map((payment: any, index: number) => (
                          <span key={`${payment.method}-${index}`} title={`₹${Number(payment.amount || 0).toLocaleString("en-IN")}`} className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${PAY_COLORS[payment.method] || "bg-muted text-muted-foreground"}`}>
                            {payment.method}{bill.paymentBreakdown?.length > 1 ? ` ₹${Number(payment.amount || 0).toLocaleString("en-IN")}` : ""}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="p-4">
                      <span className="font-bold text-emerald-600 text-sm">
                        ₹{Number(bill.finalAmount).toLocaleString("en-IN")}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${bill.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {bill.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setViewBill(bill)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-semibold"
                        >
                          <Eye className="w-4 h-4" /> View
                        </button>
                        <Link href={`/pos?editBill=${bill.id || bill._id}`}>
                          <button
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors text-sm font-semibold"
                            title="Edit invoice"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteBill(bill)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors text-sm font-semibold"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: summary + pagination */}
        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-border/50 bg-muted/20 flex flex-wrap justify-between items-center gap-3 text-sm text-muted-foreground">
            <span>
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} invoices
              &nbsp;·&nbsp;
              <span className="font-semibold text-foreground">
                Total: ₹{filtered.reduce((sum: number, b: any) => sum + Number(b.finalAmount || 0), 0).toLocaleString("en-IN")}
              </span>
            </span>
            {totalPages > 1 && (
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
            )}
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {viewBill && (
        <InvoiceModal bill={viewBill} onClose={() => setViewBill(null)} />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteBill && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Delete Invoice?</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
            <div className="bg-rose-50 rounded-xl p-3 mb-5 text-sm text-rose-800">
              <span className="font-semibold">{deleteBill.billNumber}</span> — {deleteBill.customerName} &nbsp;·&nbsp; ₹{Number(deleteBill.finalAmount).toLocaleString("en-IN")}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteBill(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors text-sm font-semibold disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
