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
    borderRadius: 8,
    padding: "18px 20px",
  });

  return (
    <div className="p-6 text-white min-h-screen bg-[#0b1120]">
       {/* مساحة عمل فارغة - جاهزة للتصميم الجديد */}
       <h1>واجهة قيد التطوير</h1>
    </div>
  );
}
