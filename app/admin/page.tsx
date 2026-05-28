// app/admin/page.tsx
// 🛡️ صفحة الأدمن الخارجية - بوابة المراقبة الفوقية لمنصة أوركا CRM
import React from "react";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import MonitorView from "@/app/operations/support-monitor/MonitorView";

export const metadata = {
  title: "بوابة المراقبة الفوقية - ORCA Super Admin",
  description: "لوحة الإدارة الكبرى لمنصة أوركا: تذاكر الدعم، الشركات، والوكلاء الذكيون",
};

export default async function AdminPage() {
  const session = await getSession();

  // إعادة التوجيه لصفحة الدخول إذا لم تكن هناك جلسة
  if (!session) {
    redirect("/admin/login");
  }

  // التحقق من صلاحيات المشرف العام فقط
  const user = await prisma.user.findUnique({
    where: { id: session.userId as string },
  });

  const userEmail = user?.email || "";
  const isSuperAdmin =
    userEmail === "ali.orca@outlook.sa" ||
    userEmail === "elite.orca@outlook.sa";

  if (!isSuperAdmin) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #090d16 0%, #0f172a 100%)",
          fontFamily: "'Calibri', sans-serif",
          direction: "rtl",
        }}
      >
        <div
          style={{
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "20px",
            padding: "40px",
            textAlign: "center",
            maxWidth: "420px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚫</div>
          <h1 style={{ color: "#ef4444", fontSize: "18px", fontWeight: 900, margin: "0 0 8px" }}>
            غير مصرح لك بالدخول
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "12px", lineHeight: 1.7, margin: "0 0 20px" }}>
            هذه الصفحة مخصصة حصرياً للمشرفين العامين لمنصة أوركا.
          </p>
          <a
            href="/operations/analytics"
            style={{
              background: "#f59e0b",
              color: "#0f172a",
              padding: "10px 24px",
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: 900,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            ← العودة للوحة التحكم
          </a>
        </div>
      </div>
    );
  }

  // جلب تذاكر الدعم الكاملة مع بيانات الشركة
  const allTickets = await prisma.ticket.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tenant: {
        select: {
          companyName: true,
          subdomain: true,
        },
      },
    },
  });

  // جلب جميع الشركات مع إحصائياتها
  const allTenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users: true,
          projects: true,
          leads: true,
        },
      },
    },
  });

  return (
    <div
      className="min-h-screen bg-slate-50 p-6 md:p-8"
      dir="rtl"
      style={{ fontFamily: "'Calibri', sans-serif" }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        body, html, * { font-family: 'Calibri', sans-serif !important; }
      `}} />

      {/* شريط علوي بسيط */}
      <div className="max-w-7xl mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}
          >
            🛡️
          </div>
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">ORCA CRM</p>
            <p className="text-xs font-black text-slate-700">نظام الإدارة - {userEmail}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/operations/analytics"
            className="bg-slate-800 text-white hover:bg-slate-700 px-4 py-2 rounded-xl text-[10px] font-bold transition-all"
          >
            ← لوحة التحكم
          </a>
          <button
            onClick={() => {
              document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              window.location.href = "/admin/login";
            }}
            className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 px-4 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* بوابة المراقبة الفوقية - المحتوى الكامل */}
      <div className="max-w-7xl mx-auto">
        <MonitorView
          initialTickets={allTickets}
          initialTenants={allTenants}
        />
      </div>
    </div>
  );
}