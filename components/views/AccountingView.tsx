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
    borderRadius: 8, padding: "18px 20px",
  });

  return (
    <div className="p-6 text-white min-h-screen bg-[var(--nc-surface-solid)]">
       {/* مساحة عمل فارغة - جاهزة للتصميم الجديد */}
       <h1>واجهة قيد التطوير</h1>
    </div>
  );
}
