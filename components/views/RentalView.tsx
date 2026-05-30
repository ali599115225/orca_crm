// components/views/RentalView.tsx
"use client";
import React, { useState } from "react";
import { useApp } from "@/app/context/AppContext";

const MOCK_RENTALS = [
  { id: "r1", unit: "شقة A-101", tenant: "فيصل العمري",    phone: "0501234567", rent: 45000, paid: 45000, due: "2026-01-01", status: "مدفوع",   months: 12 },
  { id: "r2", unit: "فيلا B-05",  tenant: "سارة الزهراني", phone: "0559876543", rent: 90000, paid: 45000, due: "2026-03-15", status: "متأخر",   months: 6  },
  { id: "r3", unit: "مكتب C-22",  tenant: "أحمد الغامدي",  phone: "0533210987", rent: 36000, paid: 36000, due: "2026-06-01", status: "مدفوع",   months: 12 },
  { id: "r4", unit: "شقة A-204",  tenant: "نورة القحطاني", phone: "0547654321", rent: 55000, paid: 0,     due: "2026-02-01", status: "غير مدفوع", months: 3  },
];

const STATUS_COLORS: Record<string, string> = {
  "مدفوع":     "rgba(34,197,94,0.15)",
  "متأخر":     "rgba(245,158,11,0.15)",
  "غير مدفوع": "rgba(239,68,68,0.15)",
};
const STATUS_TEXT: Record<string, string> = {
  "مدفوع":     "#22c55e",
  "متأخر":     "#f59e0b",
  "غير مدفوع": "#ef4444",
};

export default function RentalView() {
  const { theme, lang } = useApp();
  const isDark = theme === "dark";
  const dir = lang === "AR" ? "rtl" : "ltr";

  const [search, setSearch] = useState("");
  const filtered = MOCK_RENTALS.filter(r =>
    r.unit.includes(search) || r.tenant.includes(search)
  );

  const totalRent    = MOCK_RENTALS.reduce((s, r) => s + r.rent, 0);
  const totalPaid    = MOCK_RENTALS.reduce((s, r) => s + r.paid, 0);
  const totalDue     = totalRent - totalPaid;
  const countPaid    = MOCK_RENTALS.filter(r => r.status === "مدفوع").length;
  const countLate    = MOCK_RENTALS.filter(r => r.status === "متأخر").length;
  const countUnpaid  = MOCK_RENTALS.filter(r => r.status === "غير مدفوع").length;

  const card = (bg: string, border: string) => ({
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 14,
    padding: "18px 20px",
  });

  return (
    <div dir={dir} style={{ fontFamily: "'Cairo','Inter',sans-serif", color: isDark ? "#e2e8f0" : "#0f172a" }}>

      {/* عنوان الصفحة */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>🏠 {lang === "AR" ? "إدارة الإيجارات" : "Rental Management"}</h1>
        <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
          {lang === "AR" ? "متابعة عقود الإيجار والمدفوعات والمستأجرين" : "Track rental contracts, payments, and tenants"}
        </p>
      </div>

      {/* بطاقات الملخص */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
        <div style={card("rgba(34,197,94,0.08)","rgba(34,197,94,0.2)")}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}>{lang === "AR" ? "إجمالي الإيجارات" : "Total Rent"}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#22c55e" }}>{totalRent.toLocaleString()}</div>
          <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>ر.س / سنوياً</div>
        </div>
        <div style={card("rgba(0,123,255,0.08)","rgba(0,123,255,0.2)")}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}>{lang === "AR" ? "المحصّل" : "Collected"}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#5aabff" }}>{totalPaid.toLocaleString()}</div>
          <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>ر.س</div>
        </div>
        <div style={card("rgba(239,68,68,0.08)","rgba(239,68,68,0.2)")}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}>{lang === "AR" ? "المتبقي" : "Outstanding"}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#ef4444" }}>{totalDue.toLocaleString()}</div>
          <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>ر.س</div>
        </div>
        <div style={card("rgba(255,255,255,0.04)","rgba(255,255,255,0.07)")}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, marginBottom: 8 }}>{lang === "AR" ? "حالة العقود" : "Contract Status"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>✅ مدفوع: {countPaid}</div>
            <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>⚠️ متأخر: {countLate}</div>
            <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>❌ غير مدفوع: {countUnpaid}</div>
          </div>
        </div>
      </div>

      {/* بحث */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={lang === "AR" ? "ابحث عن وحدة أو مستأجر..." : "Search unit or tenant..."}
          style={{
            width: "100%", maxWidth: 360, padding: "9px 14px", borderRadius: 10,
            background: isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
            color: isDark ? "#e2e8f0" : "#0f172a", fontSize: 11, fontWeight: 600, outline: "none",
          }}
        />
      </div>

      {/* جدول العقود */}
      <div style={{
        background: isDark ? "rgba(22,22,28,0.8)" : "#ffffff",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"}`,
        borderRadius: 16, overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9"}` }}>
              {["الوحدة","المستأجر","رقم الجوال","قيمة الإيجار","المدفوع","تاريخ الاستحقاق","الحالة"].map(h => (
                <th key={h} style={{ padding: "12px 16px", fontSize: 9, fontWeight: 900, color: "#475569", textAlign: "right" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id} style={{
                borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "#f8fafc"}`,
                background: i % 2 === 0 ? "transparent" : (isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)"),
              }}>
                <td style={{ padding: "11px 16px", fontSize: 11, fontWeight: 800, color: isDark ? "#e2e8f0" : "#1e293b" }}>{r.unit}</td>
                <td style={{ padding: "11px 16px", fontSize: 11, fontWeight: 700, color: isDark ? "#cbd5e1" : "#334155" }}>{r.tenant}</td>
                <td style={{ padding: "11px 16px", fontSize: 10, fontWeight: 600, color: "#64748b" }} dir="ltr">{r.phone}</td>
                <td style={{ padding: "11px 16px", fontSize: 11, fontWeight: 800, color: "#22c55e" }}>{r.rent.toLocaleString()} ر.س</td>
                <td style={{ padding: "11px 16px", fontSize: 11, fontWeight: 700, color: "#5aabff" }}>{r.paid.toLocaleString()} ر.س</td>
                <td style={{ padding: "11px 16px", fontSize: 10, fontWeight: 600, color: "#64748b" }}>{r.due}</td>
                <td style={{ padding: "11px 16px" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 99, fontSize: 9, fontWeight: 900,
                    background: STATUS_COLORS[r.status], color: STATUS_TEXT[r.status],
                  }}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
