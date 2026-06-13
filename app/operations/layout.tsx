// app/operations/layout.tsx
import React from 'react';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getActiveTenant } from '@/lib/tenant';
import DashboardLayout from '@/components/layout/DashboardLayout';

export const metadata = {
  title: 'لوحة التحكم - أوركا',
  description: 'نظام إدارة العمليات العقارية السحابية',
};

export default async function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // جلب المنشأة العقارية النشطة ديناميكياً
  let tenant: any;
  try {
    tenant = await getActiveTenant();
  } catch {
    console.warn("[OperationsLayout] No active tenant — redirecting to login");
    redirect("/login");
  }

  // جلب بيانات المستخدم الحالي
  const user = await prisma.user.findUnique({
    where: { id: session.userId as string }
  });
  const userEmail = user?.email || "";
  const userName = user?.name || "";
  const isSuperAdmin = userEmail === "ali.orca@outlook.sa" || userEmail === "elite.orca@outlook.sa";

  const rawCompanyName = tenant?.companyName || "";
  const isNewTenant = rawCompanyName === "" || rawCompanyName === "منشأة جديدة قيد التأسيس" || rawCompanyName.includes("قيد التأسيس");
  const userRoleKey = session.role as string || "READ_ONLY";

  return (
    <DashboardLayout
      tenant={tenant}
      user={{ name: userName, email: userEmail, role: userRoleKey }}
      companyName={rawCompanyName || "ORCA"}
      isSuperAdmin={isSuperAdmin}
    >
      {children}
    </DashboardLayout>
  );
}
