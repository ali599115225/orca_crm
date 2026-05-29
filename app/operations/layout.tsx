// app/operations/layout.tsx
import React from 'react';
import { getSession } from '@/lib/session';
import { logoutAction } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getActiveTenant } from '@/lib/tenant';
import OperationsLayoutClient from './OperationsLayoutClient';

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
  const tenant = await getActiveTenant();

  // جلب البريد الإلكتروني للمستخدم الحالي
  const user = await prisma.user.findUnique({
    where: { id: session.userId as string }
  });
  const userEmail = user?.email || "";
  const isSuperAdmin = userEmail === "ali.orca@outlook.sa" || userEmail === "elite.orca@outlook.sa";

  const rawCompanyName = tenant?.companyName || "";
  const isNewTenant = rawCompanyName === "" || rawCompanyName === "منشأة جديدة قيد التأسيس" || rawCompanyName.includes("قيد التأسيس");
  const userRoleKey = session.role as string || "READ_ONLY";

  return (
    <OperationsLayoutClient
      initialName={session.name as string || "أحمد الغامدي"}
      userRoleKey={userRoleKey}
      isSuperAdmin={isSuperAdmin}
      companyName={rawCompanyName}
      isNewTenant={isNewTenant}
      logoutAction={logoutAction}
    >
      {children}
    </OperationsLayoutClient>
  );
}