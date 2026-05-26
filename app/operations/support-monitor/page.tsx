// app/operations/support-monitor/page.tsx
import React from "react";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import MonitorView from "./MonitorView";

export const metadata = {
  title: "مراقبة الدعم والاشتراكات الفوقية - أوركا",
};

export default async function SupportMonitorPage() {
  const session = await getSession();
  
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-right" dir="rtl">
        <div className="bg-white p-8 rounded-2xl border shadow-md text-center max-w-md">
          <h1 className="text-lg font-bold text-rose-600">غير مصرح بالدخول</h1>
          <p className="text-xs text-slate-500 mt-2">يرجى تسجيل الدخول أولاً للوصول إلى هذه اللوحة.</p>
        </div>
      </div>
    );
  }

  // التحقق من صلاحيات المشرف العام
  const user = await prisma.user.findUnique({
    where: { id: session.userId as string }
  });

  const userEmail = user?.email || "";
  const isSuperAdmin = userEmail === "ali.orca@outlook.sa" || userEmail === "elite.orca@outlook.sa";

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-right" dir="rtl">
        <div className="bg-white p-8 rounded-2xl border shadow-md text-center max-w-md space-y-4">
          <svg className="w-12 h-12 text-rose-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v3m0-3h3m-3 0H9m12-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-lg font-black text-rose-600">غير مصرح لك بدخول هذه الصفحة</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            هذه الصفحة مخصصة حصرياً للمشرفين العامين لمنصة أوركا (`ali.orca@outlook.sa` و `elite.orca@outlook.sa`) لمتابعة الطلبات وتذاكر الدعم والاشتراكات.
          </p>
        </div>
      </div>
    );
  }

  // 1. جلب كافة تذاكر الدعم الفني بالنظام كاملة مع اسم الشركة
  const allTickets = await prisma.ticket.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tenant: {
        select: {
          companyName: true,
          subdomain: true,
        }
      }
    }
  });

  // 2. جلب جميع الشركات المسجلة بالنظام مع إحصائياتها الأساسية
  const allTenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users: true,
          projects: true,
          leads: true,
        }
      }
    }
  });

  return (
    <MonitorView 
      initialTickets={allTickets}
      initialTenants={allTenants}
    />
  );
}
