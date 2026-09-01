import { X, Download } from "lucide-react";
import { format } from "date-fns";

const SALON = {
  displayName: "The Touch Unisex Salon",
  name: "thetouch",
  tagline: "Unisex Salon",
  slogan: "Where Style Meets Perfection",
  address: "Shop B 11, Chanakya building kalubai chowk,\nLodha Casario road Dombivali East",
  phone: "+91 90210 64849",
  email: "thetouch@gmail.com",
};

const LOGO_URL = "/thetouch-logo.jpg";
const f = "'Poppins', sans-serif";

interface BillItem {
  type: string;
  name: string;
  staffName?: string;
  price: number;
  quantity: number;
  discount: number;
  total: number;
  durationMonths?: number;
  isUpgradation?: boolean;
}

interface Bill {
  id?: string;
  _id?: string;
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  items: BillItem[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discountAmount: number;
  voucherId?: string;
  voucherCode?: string;
  voucherAmount?: number;
  finalAmount: number;
  paymentMethod: string;
  paymentBreakdown?: { method: string; amount: number }[];
  status: string;
  notes?: string;
  createdAt: string | Date;
}

interface InvoiceModalProps {
  bill: Bill;
  onClose: () => void;
}

function formatPhone(phone?: string) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, "");
  if (phone.startsWith("+91")) return phone;
  if (clean.length === 10) return `+91 ${clean}`;
  return phone;
}

export function InvoiceModal({ bill, onClose }: InvoiceModalProps) {
  const invoiceDate = bill.createdAt ? new Date(bill.createdAt) : new Date();
  const phone = formatPhone(bill.customerPhone);

  // Parse notes to separate discount label from "Family of" info
  const noteParts = (bill.notes || "").split(" · ");
  const familyPart = noteParts.find(p => p.startsWith("Family of"));
  const parentName = familyPart ? familyPart.replace("Family of ", "") : null;
  const discountNote = noteParts.find(p => !p.startsWith("Family of")) || null;

  // Compute total per-item discounts (birthday/anniversary/membership discounts)
  const totalItemDiscount = bill.items.reduce((sum, i) => sum + (Number(i.discount) || 0), 0);
  // The subtotal stored in the bill is AFTER item discounts, so we show the gross first
  const grossSubtotal = bill.subtotal + totalItemDiscount;

  const handlePrint = () => {
    const el = document.getElementById("invoice-print-area");
    if (!el) return;
    const win = window.open("", "_blank", "width=820,height=960");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="UTF-8"/>
      <title>Invoice – ${bill.billNumber}</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Poppins',sans-serif;color:#111;background:#fff}
        .page{max-width:720px;margin:0 auto;padding:48px 40px}
        img{display:block}
        table{border-collapse:collapse;width:100%}
        @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
      </style>
    </head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[95vh] flex flex-col" style={{ fontFamily: f }}>

        {/* Modal toolbar */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: f }}>Invoice Preview</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors">
              <Download className="w-4 h-4" /> Print / Download
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Scrollable invoice body */}
        <div className="overflow-y-auto flex-1 p-6 bg-gray-50">
          <div
            id="invoice-print-area"
            style={{ maxWidth: 720, margin: "0 auto", padding: "48px 40px", fontFamily: f, color: "#111", background: "#fff", borderRadius: 12 }}
          >

            {/* ── HEADER ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", border: "2px solid #111", background: "#000", flexShrink: 0 }}>
                  <img src={LOGO_URL} alt="thetouch logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: "#111", letterSpacing: 5, textTransform: "uppercase", fontFamily: f }}>INVOICE</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#555", marginTop: 4, fontFamily: f }}>#{bill.billNumber}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2, fontFamily: f }}>{format(invoiceDate, "dd MMM yyyy, hh:mm a")}</div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "2px solid #111", margin: "0 0 24px 0" }} />

            {/* Special occasion / membership banner */}
            {discountNote && (
              <div style={{ background: "#fff8f0", border: "1.5px solid #f0a060", borderRadius: 8, padding: "8px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#b85c00", fontFamily: f }}>{discountNote}</span>
              </div>
            )}

            {/* ── FROM + BILL TO ── */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
              {/* From */}
              <div>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#999", marginBottom: 6, fontWeight: 600, fontFamily: f }}>From</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 6, fontFamily: f }}>{SALON.displayName}</div>
                <div style={{ fontSize: 11, color: "#444", lineHeight: 1.8, fontFamily: f, whiteSpace: "pre-line" }}>{SALON.address}</div>
                <div style={{ fontSize: 11, color: "#444", marginTop: 4, fontFamily: f }}>{SALON.phone}</div>
                <div style={{ fontSize: 11, color: "#444", fontFamily: f }}>{SALON.email}</div>
              </div>
              {/* Bill To */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#999", marginBottom: 6, fontWeight: 600, fontFamily: f }}>Bill To</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111", fontFamily: f }}>{bill.customerName}</div>
                {parentName && (
                  <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 3, fontWeight: 600, fontFamily: f }}>Family of {parentName}</div>
                )}
                {phone && (
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4, fontFamily: f }}>{phone}</div>
                )}
                <div style={{ display: "inline-block", border: "1.5px solid #111", borderRadius: 20, padding: "2px 12px", fontSize: 10, fontWeight: 700, color: "#111", marginTop: 8, textTransform: "uppercase", letterSpacing: 1, fontFamily: f }}>
                  ✓ {bill.status?.toUpperCase() || "PAID"}
                </div>
              </div>
            </div>

            {/* ── ITEMS TABLE ── */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
              <thead>
                <tr>
                  {["#", "Description", "Type", "Qty", "Rate", "Disc", "Amount"].map((h, i) => (
                    <th key={h} style={{
                      background: "#111", color: "#fff", padding: "10px 12px",
                      textAlign: i === 0 || i === 1 || i === 2 ? "left" : i === 3 ? "center" : "right",
                      fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, fontFamily: f,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "12px 12px", fontSize: 12, color: "#999", fontFamily: f }}>{i + 1}</td>
                    <td style={{ padding: "12px 12px", fontFamily: f }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{item.name}</span>
                        {item.isUpgradation && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 700, color: "#b45309", background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 4, padding: "2px 6px", textTransform: "uppercase", letterSpacing: 0.5 }}>
                            ↑ Upgradation
                          </span>
                        )}
                      </div>
                      {item.staffName && (
                        <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>by {item.staffName}</div>
                      )}
                      {item.type === "membership" && item.durationMonths && (
                        <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 3 }}>Valid for {item.durationMonths} month{item.durationMonths !== 1 ? "s" : ""}</div>
                      )}
                    </td>
                    <td style={{ padding: "12px 12px", fontFamily: f }}>
                      <span style={{
                        display: "inline-block",
                        fontSize: 10, fontWeight: 600,
                        color: item.type === "service" ? "#555" : item.type === "membership" ? "#7c3aed" : "#333",
                        background: item.type === "service" ? "#f5f5f5" : item.type === "membership" ? "#ede9fe" : "#ebebeb",
                        borderRadius: 4, padding: "2px 8px",
                        textTransform: "capitalize", letterSpacing: 0.5,
                      }}>
                        {item.type === "service" ? "Service" : item.type === "membership" ? "Membership" : "Product"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 12px", textAlign: "center", fontSize: 13, fontFamily: f }}>{item.quantity}</td>
                    <td style={{ padding: "12px 12px", textAlign: "right", fontSize: 13, fontFamily: f }}>₹{Number(item.price).toLocaleString("en-IN")}</td>
                    <td style={{ padding: "12px 12px", textAlign: "right", fontSize: 13, color: item.discount > 0 ? "#d97706" : "#bbb", fontWeight: item.discount > 0 ? 600 : 400, fontFamily: f }}>
                      {item.discount > 0 ? `−₹${Number(item.discount).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td style={{ padding: "12px 12px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#111", fontFamily: f }}>
                      ₹{Number(item.total).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── TOTALS ── */}
            <div style={{ marginLeft: "auto", width: 300, marginTop: 16 }}>
              {totalItemDiscount > 0 ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, color: "#555", fontFamily: f }}>
                    <span>Gross Amount</span>
                    <span>₹{Number(grossSubtotal).toLocaleString("en-IN")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, color: "#b85c00", fontWeight: 600, fontFamily: f }}>
                    <span>{discountNote ? discountNote.replace(/ — \d+% off[!]?/, "") + " Discount" : "Special Discount"}</span>
                    <span>− ₹{Number(totalItemDiscount).toLocaleString("en-IN")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, color: "#555", fontFamily: f }}>
                    <span>Subtotal</span>
                    <span>₹{Number(bill.subtotal).toLocaleString("en-IN")}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, color: "#555", fontFamily: f }}>
                  <span>Subtotal</span>
                  <span>₹{Number(bill.subtotal).toLocaleString("en-IN")}</span>
                </div>
              )}
              {bill.discountAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, color: "#111", fontFamily: f }}>
                  <span>Extra Discount</span>
                  <span>− ₹{Number(bill.discountAmount).toLocaleString("en-IN")}</span>
                </div>
              )}
              {Number(bill.voucherAmount || 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, color: "#b85c00", fontWeight: 600, fontFamily: f }}>
                  <span>Gift Voucher {bill.voucherCode ? `(${bill.voucherCode})` : ""}</span>
                  <span>− ₹{Number(bill.voucherAmount).toLocaleString("en-IN")}</span>
                </div>
              )}
              {bill.taxAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, color: "#555", fontFamily: f }}>
                  <span>GST ({bill.taxPercent}%)</span>
                  <span>₹{Number(bill.taxAmount).toLocaleString("en-IN")}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: 18, fontWeight: 800, color: "#111", borderTop: "2px solid #111", marginTop: 6, fontFamily: f }}>
                <span>Total</span>
                <span>₹{Number(bill.finalAmount).toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* ── MEMBERSHIP BENEFITS (if a membership was purchased) ── */}
            {bill.items.some(i => i.type === "membership") && (
              <div style={{ marginTop: 20, background: "#f5f3ff", border: "1.5px solid #c4b5fd", borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#7c3aed", fontWeight: 700, marginBottom: 8, fontFamily: f }}>Membership Benefits Activated</div>
                {bill.items.filter(i => i.type === "membership").map((item, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: idx < bill.items.filter(i2 => i2.type === "membership").length - 1 ? 8 : 0 }}>
                    <span style={{ fontSize: 16 }}>👑</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#5b21b6", fontFamily: f }}>{item.name}</div>
                      {item.durationMonths && (
                        <div style={{ fontSize: 11, color: "#7c3aed", fontFamily: f }}>Valid for {item.durationMonths} month{item.durationMonths !== 1 ? "s" : ""} from today</div>
                      )}
                      <div style={{ fontSize: 11, color: "#6d28d9", marginTop: 2, fontFamily: f }}>Services discounts apply on all future visits. Family members can be added to this plan.</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── PAYMENT ── */}
            <div style={{ marginTop: 24, display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#999", fontWeight: 600, fontFamily: f }}>Payment via</span>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5 }}>
                {(bill.paymentBreakdown && bill.paymentBreakdown.length > 0
                  ? bill.paymentBreakdown
                  : [{ method: bill.paymentMethod, amount: bill.finalAmount }]
                ).map((payment, index) => (
                  <span key={`${payment.method}-${index}`} style={{ border: "1.5px solid #111", borderRadius: 6, padding: "4px 14px", fontSize: 12, fontWeight: 700, textTransform: "capitalize", color: "#111", fontFamily: f }}>
                    {payment.method} · ₹{Number(payment.amount || 0).toLocaleString("en-IN")}
                  </span>
                ))}
              </div>
            </div>

            {/* ── FOOTER ── */}
            <div style={{ marginTop: 48, textAlign: "center", borderTop: "1px dashed #ccc", paddingTop: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111", fontFamily: f }}>
                Thank you for choosing {SALON.displayName}!
              </div>
              <div style={{ fontSize: 11, color: "#888", lineHeight: 1.8, marginTop: 8, fontFamily: f }}>
                All services are non-refundable. Products may be exchanged within 7 days with receipt.<br />
                {SALON.phone} &nbsp;|&nbsp; {SALON.email}
              </div>
              <div style={{ fontSize: 10, color: "#bbb", marginTop: 14, letterSpacing: 2, textTransform: "uppercase", fontFamily: f }}>
                {SALON.slogan}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
