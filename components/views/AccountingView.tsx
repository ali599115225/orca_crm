// components/views/AccountingView.tsx
"use client";
import React, { useState } from "react";
import { useApp } from "@/app/context/AppContext";

const MOCK_LEDGER = [
  { id: "t1", date: "2026-05-01", desc: "إيجار شقة A-101 — فيصل العمري",    type: "إيراد",  amount: 45000, cat: "إيجار" },
  { id: "t2", date: "2026-05-03", desc: "صيانة مبنى B — شركة الإعمار",       type: "مصروف", amount: 8500,  cat: "صيانة" },
  { id: "t3", date: "2026-05-10", desc: "عمولة بيع وحدة مشروع النخبة",       type: "إيراد",  amount: 32000, cat: "مبيعات" },
  { id: "t4", date: "2026-05-12", desc: "رواتب الموظفين — مايو ٢٠٢٦",        type: "مصروف", amount: 55000, cat: "رواتب" },
  { id: "t5", date: "2026-05-15", desc: "إيجار مكتب C-22 — أحمد الغامدي",   type: "إيراد",  amount: 36000, cat: "إيجار" },
  { id: "t6", date: "2026-05-18", desc: "فاتورة كهرباء وخدمات المباني",      type: "مصروف", amount: 12000, cat: "مرافق" },
  { id: "t7", date: "2026-05-22", desc: "عائد استثمار محفظة الأصول العقارية",type: "إيراد",  amount: 120000,cat: "استثمار" },
  { id: "t8", date: "2026-05-28", desc: "رسوم تسويق وإعلانات الربع الثاني",  type: "مصروف", amount: 18000, cat: "تسويق" },
];

const CAT_COLORS: Record<string, string> = {
  "إيجار": "#5aabff", "مبيعات": "#22c55e", "استثمار": "#a78bfa",
  "صيانة": "#f59e0b", "رواتب": "#ef4444", "مرافق": "#fb923c", "تسويق": "#ec4899",
};

export default function AccountingView() {
  const { theme, lang } = useApp();
  const isDark = theme === "dark";
  const dir = lang === "AR" ? "rtl" : "ltr";

  const [filter, setFilter] = useState<"all"|"إيراد"|"مصروف">("all");

  const revenues  = MOCK_LEDGER.filter(t => t.type === "إيراد");
  const expenses  = MOCK_LEDGER.filter(t => t.type === "مصروف");
  const totalRev  = revenues.reduce((s, t) => s + t.amount, 0);
  const totalExp  = expenses.reduce((s, t) => s + t.amount, 0);
  const netProfit = totalRev - totalExp;

  const filtered = filter === "all" ? MOCK_LEDGER : MOCK_LEDGER.filter(t => t.type === filter);

  const card = (bg: string, border: string) => ({
    background: bg, border: `1px solid ${border}`,
    borderRadius: 14, padding: "18px 20px",
  });

  return (
    <div dir={dir} style={{ fontFamily: "'Cairo','Inter',sans-serif", color: isDark ? "#e2e8f0" : "#0f172a" }}>

      {/* عنوان */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>💰 {lang === "AR" ? "المحاسبة والتقارير المالية" : "Accounting & Finance"}</h1>
        <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
          {lang === "AR" ? "السجل المالي الموحد — الإيرادات والمصروفات وصافي الربح" : "Unified financial ledger — revenues, expenses, and net profit"}
        </p>
      </div>

      {/* بطاقات الملخص المالي */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 28 }}>
        <div style={card("rgba(34,197,94,0.08)","rgba(34,197,94,0.2)")}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}>📥 {lang === "AR" ? "إجمالي الإيرادات" : "Total Revenue"}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#22c55e" }}>{totalRev.toLocaleString()}</div>
          <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>ر.س</div>
        </div>
        <div style={card("rgba(239,68,68,0.08)","rgba(239,68,68,0.2)")}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}>📤 {lang === "AR" ? "إجمالي المصروفات" : "Total Expenses"}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#ef4444" }}>{totalExp.toLocaleString()}</div>
          <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>ر.س</div>
        </div>
        <div style={card(netProfit >= 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", netProfit >= 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)")}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}>💹 {lang === "AR" ? "صافي الربح" : "Net Profit"}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: netProfit >= 0 ? "#22c55e" : "#ef4444" }}>
            {netProfit >= 0 ? "+" : ""}{netProfit.toLocaleString()}
          </div>
          <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>ر.س</div>
        </div>
        <div style={card("rgba(0,123,255,0.08)","rgba(0,123,255,0.2)")}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, marginBottom: 8 }}>📊 {lang === "AR" ? "هامش الربح" : "Profit Margin"}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#5aabff" }}>
            {totalRev > 0 ? Math.round((netProfit / totalRev) * 100) : 0}٪
          </div>
          <div style={{ marginTop: 6, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 4,
              width: `${totalRev > 0 ? Math.max(0, Math.round((netProfit / totalRev) * 100)) : 0}%`,
              background: "linear-gradient(90deg, #5aabff, #007BFF)",
            }} />
          </div>
        </div>
      </div>

      {/* مخطط الفئات */}
      <div style={{
        background: isDark ? "rgba(22,22,28,0.8)" : "#ffffff",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"}`,
        borderRadius: 16, padding: "20px 24px", marginBottom: 24,
      }}>
        <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 16, color: isDark ? "#e2e8f0" : "#1e293b" }}>
          {lang === "AR" ? "توزيع الإيرادات حسب الفئة" : "Revenue by Category"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {Object.entries(
            revenues.reduce((acc, t) => { acc[t.cat] = (acc[t.cat] || 0) + t.amount; return acc; }, {} as Record<string,number>)
          ).map(([cat, val]) => (
            <div key={cat} style={{
              padding: "8px 14px", borderRadius: 10,
              background: `${CAT_COLORS[cat]}18`,
              border: `1px solid ${CAT_COLORS[cat]}30`,
              display: "flex", flexDirection: "column", gap: 3,
            }}>
              <span style={{ fontSize: 9, color: CAT_COLORS[cat], fontWeight: 900 }}>{cat}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: isDark ? "#e2e8f0" : "#1e293b" }}>{val.toLocaleString()} ر.س</span>
            </div>
          ))}
        </div>
      </div>

      {/* فلتر + جدول الحركات */}
      <div style={{ marginBottom: 14, display: "flex", gap: 8 }}>
        {([["all","الكل"],["إيراد","إيرادات فقط"],["مصروف","مصروفات فقط"]] as [string,string][]).map(([v,l]) => (
          <button
            key={v}
            onClick={() => setFilter(v as any)}
            style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: "pointer",
              background: filter === v ? "rgba(0,123,255,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${filter === v ? "rgba(0,123,255,0.4)" : "rgba(255,255,255,0.07)"}`,
              color: filter === v ? "#5aabff" : "#64748b",
            }}
          >{l}</button>
        ))}
      </div>

      <div style={{
        background: isDark ? "rgba(22,22,28,0.8)" : "#ffffff",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"}`,
        borderRadius: 16, overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9"}` }}>
              {["التاريخ","البيان","الفئة","النوع","المبلغ"].map(h => (
                <th key={h} style={{ padding: "12px 16px", fontSize: 9, fontWeight: 900, color: "#475569", textAlign: "right" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={t.id} style={{
                borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "#f8fafc"}`,
                background: i % 2 === 0 ? "transparent" : (isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)"),
              }}>
                <td style={{ padding: "10px 16px", fontSize: 10, color: "#64748b", fontWeight: 600 }}>{t.date}</td>
                <td style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: isDark ? "#cbd5e1" : "#334155", maxWidth: 280 }}>{t.desc}</td>
                <td style={{ padding: "10px 16px" }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 900,
                    background: `${CAT_COLORS[t.cat] || "#888"}18`,
                    color: CAT_COLORS[t.cat] || "#888",
                  }}>{t.cat}</span>
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 900,
                    background: t.type === "إيراد" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                    color: t.type === "إيراد" ? "#22c55e" : "#ef4444",
                  }}>{t.type}</span>
                </td>
                <td style={{ padding: "10px 16px", fontSize: 12, fontWeight: 900, color: t.type === "إيراد" ? "#22c55e" : "#ef4444" }}>
                  {t.type === "إيراد" ? "+" : "-"}{t.amount.toLocaleString()} ر.س
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
