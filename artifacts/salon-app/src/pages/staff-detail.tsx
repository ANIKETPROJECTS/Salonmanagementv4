import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft, Calendar, Scissors, Package, FileText,
  Phone, Briefcase, TrendingUp, Receipt, IndianRupee,
  ArrowUpRight, Eye, AlertTriangle, Star, Download,
} from "lucide-react";
import { InvoiceModal } from "@/components/InvoiceModal";

const API_BASE = "/api";

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-700",
  "from-rose-500 to-pink-700",
  "from-amber-500 to-orange-600",
  "from-teal-500 to-cyan-600",
  "from-blue-500 to-indigo-700",
  "from-emerald-500 to-green-700",
];

function fmt(n: number) { return n.toLocaleString("en-IN"); }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

interface ServiceBreakdown {
  name: string; type: string; count: number; revenue: number;
}
interface BillItem {
  name: string; type: string; total: number; isUpgradation: boolean;
}
interface StaffBill {
  billId: string; billNumber: string; customerName: string; customerPhone: string;
  date: string; billGrandTotal: number; paymentMethod: string; paymentBreakdown?: { method: string; amount: number }[]; status: string; items: BillItem[];
}
interface StaffData {
  staffId: string | null; staffName: string; staffRole: string; staffPhone: string;
  totalBills: number; totalRevenue: number; upgradationRevenue: number; upgradationCount: number;
  services: ServiceBreakdown[]; bills: StaffBill[];
}

const PAY_COLORS: Record<string, string> = {
  cash: "bg-emerald-100 text-emerald-700",
  card: "bg-blue-100 text-blue-700",
  upi: "bg-violet-100 text-violet-700",
  online: "bg-sky-100 text-sky-700",
};

// ── Generate and open a printable HTML report in a new tab ──────────────────
function generatePrintReport(data: StaffData, fromDate: string, toDate: string) {
  const now = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const period = fromDate && toDate
    ? `${fmtDateLong(fromDate)} — ${fmtDateLong(toDate)}`
    : fromDate
    ? `From ${fmtDateLong(fromDate)}`
    : toDate
    ? `Up to ${fmtDateLong(toDate)}`
    : "All Time";

  const logoUrl = `${window.location.origin}/thetouch-logo.jpg`;

  // Services breakdown — 3 columns (no Avg per Service)
  const servicesRows = data.services.map(s => `
    <tr>
      <td>${s.name}</td>
      <td style="text-align:center">${s.count}</td>
      <td style="text-align:right">₹${fmt(s.revenue)}</td>
    </tr>
  `).join("");

  // Invoice rows — Amount = sum of this staff's items in the bill (not full bill total)
  let grandStaffTotal = 0;
  const invoiceRows = data.bills.map(bill => {
    const staffBillTotal = bill.items.reduce((a, it) => a + it.total, 0);
    grandStaffTotal += staffBillTotal;
    const itemRows = bill.items.map(it => `
      <tr style="background:#fafafa">
        <td colspan="2" style="padding:4px 12px 4px 28px;font-size:11px;color:#555">
          ${it.type === "service" ? "✂" : "📦"} ${it.name}${it.isUpgradation ? ' <span style="color:#d97706;font-weight:600">[↑ Upgradation]</span>' : ""}
        </td>
        <td colspan="2" style="text-align:right;padding:4px 12px;font-size:11px;color:#333">₹${fmt(it.total)}</td>
      </tr>
    `).join("");

    return `
      <tr style="background:#f5f0ff">
        <td style="font-weight:700;font-size:12px">${bill.billNumber}</td>
        <td>${bill.customerName}${bill.customerPhone ? ` · ${bill.customerPhone}` : ""}</td>
        <td style="text-align:center">${fmtDate(bill.date)} · <span style="text-transform:uppercase;font-size:10px">${bill.paymentMethod || ""}</span></td>
        <td style="text-align:right;font-weight:700">₹${fmt(staffBillTotal)}</td>
      </tr>
      ${itemRows}
      <tr><td colspan="4" style="padding:0;height:2px;background:#e5e7eb"></td></tr>
    `;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Staff Report — ${data.staffName}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f1f1f; background: #fff; font-size: 13px; }
  .page { max-width: 800px; margin: 0 auto; padding: 32px 40px; }

  /* Header */
  .salon-header { display:flex; align-items:center; justify-content:space-between; border-bottom: 3px solid #5b21b6; padding-bottom: 16px; margin-bottom: 24px; }
  .logo-wrap { display:flex; align-items:center; gap:12px; }
  .logo-img { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; }
  .salon-name { font-size: 24px; font-weight: 900; color: #5b21b6; letter-spacing: 1px; }
  .salon-sub { font-size: 10px; color: #7c3aed; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
  .report-meta { text-align: right; }
  .report-meta p { font-size: 11px; color: #6b7280; }
  .report-meta strong { color: #1f1f1f; }

  /* Staff profile */
  .staff-section { background: #f5f0ff; border: 1.5px solid #ddd6fe; border-radius: 12px; padding: 18px 22px; margin-bottom: 24px; }
  .staff-avatar { width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg,#7c3aed,#5b21b6); color:#fff; font-size:20px; font-weight:900; display:flex; align-items:center; justify-content:center; margin-right: 16px; flex-shrink:0; }
  .staff-info { flex:1; }
  .staff-name { font-size: 20px; font-weight: 800; color: #1f1f1f; }
  .staff-role { display:inline-block; background:#ede9fe; color:#6d28d9; font-size:10px; font-weight:700; padding:2px 8px; border-radius:99px; margin-top:4px; text-transform:uppercase; letter-spacing:.5px; }
  .staff-phone { font-size: 12px; color: #6b7280; margin-top: 6px; }

  /* Summary */
  .summary-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 28px; }
  .stat-box { border-radius: 10px; padding: 14px; text-align: center; border: 1.5px solid; }
  .stat-box.green { background: #f0fdf4; border-color: #bbf7d0; }
  .stat-box.blue  { background: #eff6ff; border-color: #bfdbfe; }
  .stat-box.amber { background: #fffbeb; border-color: #fde68a; }
  .stat-box.violet{ background: #f5f3ff; border-color: #ddd6fe; }
  .stat-label { font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; color: #6b7280; }
  .stat-box.green .stat-label { color: #15803d; }
  .stat-box.blue  .stat-label { color: #1d4ed8; }
  .stat-box.amber .stat-label { color: #b45309; }
  .stat-box.violet .stat-label { color: #6d28d9; }
  .stat-value { font-size: 20px; font-weight: 900; }
  .stat-box.green .stat-value { color: #16a34a; }
  .stat-box.blue  .stat-value { color: #2563eb; }
  .stat-box.amber .stat-value { color: #d97706; }
  .stat-box.violet .stat-value { color: #7c3aed; }

  /* Section titles */
  .section-title { font-size: 13px; font-weight: 800; color: #5b21b6; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #ede9fe; padding-bottom: 8px; margin-bottom: 14px; margin-top: 28px; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #5b21b6; color: #fff; padding: 9px 12px; text-align: left; font-size: 10px; letter-spacing: .5px; text-transform: uppercase; }
  thead th:nth-child(2) { text-align: center; }
  thead th:last-child { text-align: right; }
  tbody tr:nth-child(even) { background: #faf5ff; }
  tbody td { padding: 9px 12px; border-bottom: 1px solid #f3e8ff; }
  tfoot td { padding: 10px 12px; font-weight: 800; font-size: 13px; background: #ede9fe; }
  tfoot td:last-child { text-align: right; color: #5b21b6; }

  /* Invoice table */
  .invoice-table thead th:nth-child(3) { text-align: center; }
  .invoice-table thead th:last-child { text-align: right; }
  .invoice-table tbody td:nth-child(3) { text-align: center; }
  .invoice-table tbody td:last-child { text-align: right; font-weight: 600; }

  /* Footer */
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; display:flex; justify-content:space-between; font-size: 10px; color: #9ca3af; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 20px 28px; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Salon Header -->
  <div class="salon-header">
    <div class="logo-wrap">
      <img src="${logoUrl}" alt="Salon Logo" class="logo-img" />
      <div>
        <div class="salon-name">AT SMART SALON</div>
        <div class="salon-sub">Salon Management Software</div>
      </div>
    </div>
    <div class="report-meta">
      <p><strong>Staff Performance Report</strong></p>
      <p>Period: <strong>${period}</strong></p>
      <p>Generated: ${now}</p>
    </div>
  </div>

  <!-- Staff Profile -->
  <div class="staff-section">
    <div style="display:flex;align-items:center">
      <div class="staff-avatar">${data.staffName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}</div>
      <div class="staff-info">
        <div class="staff-name">${data.staffName}</div>
        ${data.staffRole ? `<div class="staff-role">${data.staffRole}</div>` : ""}
        ${data.staffPhone ? `<div class="staff-phone">📞 ${data.staffPhone}</div>` : ""}
      </div>
    </div>
  </div>

  <!-- Summary Stats -->
  <div class="summary-grid">
    <div class="stat-box green">
      <div class="stat-label">Service Revenue</div>
      <div class="stat-value">₹${fmt(data.totalRevenue)}</div>
    </div>
    <div class="stat-box blue">
      <div class="stat-label">Bills Served</div>
      <div class="stat-value">${data.totalBills}</div>
    </div>
    <div class="stat-box amber">
      <div class="stat-label">Upgradation Rev</div>
      <div class="stat-value">₹${fmt(data.upgradationRevenue)}</div>
    </div>
    <div class="stat-box violet">
      <div class="stat-label">Upgradations Done</div>
      <div class="stat-value">${data.upgradationCount}</div>
    </div>
  </div>

  <!-- Services Breakdown -->
  <div class="section-title">Services Breakdown</div>
  <table>
    <thead>
      <tr>
        <th>Service / Product</th>
        <th>Count</th>
        <th>Total Revenue</th>
      </tr>
    </thead>
    <tbody>${servicesRows}</tbody>
    <tfoot>
      <tr>
        <td>TOTAL</td>
        <td style="text-align:center">${data.services.reduce((a, s) => a + s.count, 0)}</td>
        <td>₹${fmt(data.totalRevenue)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Invoice History -->
  <div class="section-title">Invoice History (${data.bills.length} bills)</div>
  <table class="invoice-table">
    <thead>
      <tr>
        <th>Invoice #</th>
        <th>Customer</th>
        <th>Date &amp; Payment</th>
        <th>Staff Revenue</th>
      </tr>
    </thead>
    <tbody>${invoiceRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="3">TOTAL (${data.bills.length} invoices)</td>
        <td>₹${fmt(grandStaffTotal)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Footer -->
  <div class="footer">
    <span>AT Smart Salon — Confidential Staff Report</span>
    <span>Generated on ${now}</span>
  </div>

</div>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export default function StaffDetail() {
  const params = useParams<{ staffId: string }>();
  const staffId = params.staffId || "unassigned";
  const [, setLocation] = useLocation();

  const [data, setData] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeTab, setActiveTab] = useState<"services" | "invoices">("services");
  const [viewBill, setViewBill] = useState<any>(null);
  const [loadingBill, setLoadingBill] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams({ staffId });
      if (fromDate) p.set("from", fromDate);
      if (toDate) p.set("to", toDate);
      const res = await fetch(`${API_BASE}/staff-report?${p.toString()}`);
      const json = await res.json();
      const report: StaffData[] = json.report || [];
      if (report.length === 0) { setError("No data found for this staff member."); setData(null); }
      else { setData(report[0]); }
    } catch {
      setError("Failed to load staff data."); setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [staffId]);

  const handleViewInvoice = async (bill: StaffBill) => {
    if (!bill.billId) return;
    setLoadingBill(true);
    try {
      const res = await fetch(`${API_BASE}/bills/${bill.billId}`);
      if (!res.ok) throw new Error();
      setViewBill(await res.json());
    } catch {
      setViewBill({
        _id: bill.billId, billNumber: bill.billNumber, customerName: bill.customerName,
        customerPhone: bill.customerPhone, createdAt: bill.date, finalAmount: bill.billGrandTotal,
        paymentMethod: bill.paymentMethod, paymentBreakdown: bill.paymentBreakdown, status: bill.status,
        items: bill.items.map(i => ({ name: i.name, type: i.type, total: i.total, quantity: 1, price: i.total })),
        subtotal: bill.billGrandTotal, taxAmount: 0, discountAmount: 0,
      });
    } finally {
      setLoadingBill(false);
    }
  };

  const gradient = data
    ? AVATAR_GRADIENTS[Math.abs(data.staffName.charCodeAt(0)) % AVATAR_GRADIENTS.length]
    : AVATAR_GRADIENTS[0];
  const initials = data
    ? data.staffName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/upgradations")}
            className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <p className="text-xs text-muted-foreground">Staff Reports</p>
            <h1 className="text-xl font-extrabold text-foreground leading-tight">
              {loading ? "Loading…" : data?.staffName || "Staff Detail"}
            </h1>
          </div>
        </div>

        {/* Download Report button */}
        {data && (
          <button
            onClick={() => generatePrintReport(data, fromDate, toDate)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Download Report
          </button>
        )}
      </div>

      {/* ── Date filter ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-3 py-2">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="text-xs bg-transparent text-foreground focus:outline-none" />
        </div>
        <span className="text-muted-foreground text-xs">to</span>
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-3 py-2">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="text-xs bg-transparent text-foreground focus:outline-none" />
        </div>
        <button onClick={fetchData}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors">
          Apply
        </button>
        {(fromDate || toDate) && (
          <button onClick={() => { setFromDate(""); setToDate(""); setTimeout(fetchData, 50); }}
            className="px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm gap-2">
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          Loading staff data…
        </div>
      ) : error ? (
        <div className="bg-card border border-border rounded-2xl p-16 flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400" />
          <p className="font-semibold text-foreground">{error}</p>
        </div>
      ) : data && (
        <>
          {/* ── Staff Profile Card ── */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-extrabold text-xl shadow-md shrink-0`}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-extrabold text-foreground">{data.staffName}</h2>
                  {data.staffName !== "Unassigned" && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                  {data.staffRole && (
                    <span className="px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-semibold">
                      {data.staffRole}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                  {data.staffPhone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> {data.staffPhone}
                    </span>
                  )}
                  {data.staffRole && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" /> {data.staffRole}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 4 Metric Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center mb-2"><IndianRupee className="w-4 h-4 text-emerald-500" /></div>
                <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">Service Revenue</p>
                <p className="text-2xl font-extrabold text-emerald-700">₹{fmt(data.totalRevenue)}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center mb-2"><Receipt className="w-4 h-4 text-blue-500" /></div>
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-1">Bills Served</p>
                <p className="text-2xl font-extrabold text-blue-700">{data.totalBills}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center mb-2"><TrendingUp className="w-4 h-4 text-amber-500" /></div>
                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">Upgradation Rev</p>
                <p className="text-2xl font-extrabold text-amber-700">₹{fmt(data.upgradationRevenue)}</p>
              </div>
              <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center mb-2"><ArrowUpRight className="w-4 h-4 text-violet-500" /></div>
                <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider mb-1">Upgradations Done</p>
                <p className="text-2xl font-extrabold text-violet-700">{data.upgradationCount}</p>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex border-b border-border">
              <button onClick={() => setActiveTab("services")}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "services"
                    ? "text-violet-600 border-b-2 border-violet-600 bg-violet-50/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}>
                <Scissors className="w-3.5 h-3.5" /> Services Breakdown ({data.services.length})
              </button>
              <button onClick={() => setActiveTab("invoices")}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "invoices"
                    ? "text-violet-600 border-b-2 border-violet-600 bg-violet-50/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}>
                <FileText className="w-3.5 h-3.5" /> Invoice History ({data.bills.length})
              </button>
            </div>

            {/* Services Tab */}
            {activeTab === "services" && (
              <div className="p-6">
                {data.services.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">No services data available.</div>
                ) : (
                  <div className="space-y-3">
                    {data.services.map((svc, i) => {
                      const maxCount = data.services[0]?.count || 1;
                      const pct = Math.round((svc.count / maxCount) * 100);
                      return (
                        <div key={i} className="flex items-center gap-4 py-3.5 px-4 rounded-xl bg-muted/30 border border-border/50">
                          <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
                            {svc.type === "service" ? <Scissors className="w-4 h-4 text-violet-500" /> : <Package className="w-4 h-4 text-blue-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{svc.name}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full bg-gradient-to-r ${gradient}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0 w-8 text-right">{pct}%</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-extrabold text-foreground">₹{fmt(svc.revenue)}</p>
                            <p className="text-[10px] text-muted-foreground">{svc.count} time{svc.count !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === "invoices" && (
              <div className="p-6">
                {data.bills.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">No invoices found.</div>
                ) : (
                  <div className="space-y-3">
                    {data.bills.map((bill, i) => {
                      const hasUpgradation = bill.items.some(it => it.isUpgradation);
                      return (
                        <div key={i} className="border border-border rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-xs font-bold text-foreground font-mono">{bill.billNumber}</p>
                                  {hasUpgradation && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold flex items-center gap-0.5">
                                      <ArrowUpRight className="w-2.5 h-2.5" /> Upgradation
                                    </span>
                                  )}
                                  {bill.paymentMethod && (
                                    <span title={bill.paymentBreakdown && bill.paymentBreakdown.length > 1
                                      ? bill.paymentBreakdown.map(payment => `${payment.method}: ₹${Number(payment.amount || 0).toLocaleString("en-IN")}`).join(" · ")
                                      : undefined}
                                      className={`px-2 py-0.5 rounded-full text-[9px] font-semibold capitalize ${PAY_COLORS[bill.paymentMethod] || "bg-muted text-muted-foreground"}`}>
                                      {bill.paymentBreakdown && bill.paymentBreakdown.length > 1
                                        ? bill.paymentBreakdown.map(payment => `${payment.method}: ₹${Number(payment.amount || 0).toLocaleString("en-IN")}`).join(" · ")
                                        : bill.paymentMethod.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground">{bill.customerName} · {fmtDate(bill.date)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm font-extrabold text-foreground">₹{fmt(bill.billGrandTotal)}</p>
                                <p className="text-[10px] text-muted-foreground">bill total</p>
                              </div>
                              <button onClick={() => handleViewInvoice(bill)} disabled={loadingBill}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-200 text-violet-600 hover:bg-violet-100 transition-colors text-[11px] font-semibold disabled:opacity-50">
                                <Eye className="w-3.5 h-3.5" />
                                {loadingBill ? "…" : "View Invoice"}
                              </button>
                            </div>
                          </div>
                          <div className="divide-y divide-border/50">
                            {bill.items.map((item, j) => (
                              <div key={j} className="flex items-center justify-between px-4 py-2">
                                <div className="flex items-center gap-2">
                                  {item.type === "service"
                                    ? <Scissors className="w-3 h-3 text-violet-400 shrink-0" />
                                    : <Package className="w-3 h-3 text-blue-400 shrink-0" />}
                                  <span className="text-xs text-foreground">{item.name}</span>
                                  {item.isUpgradation && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[9px] font-semibold">↑</span>
                                  )}
                                </div>
                                <span className="text-xs font-semibold text-foreground">₹{fmt(item.total)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {viewBill && <InvoiceModal bill={viewBill} onClose={() => setViewBill(null)} />}
    </div>
  );
}
