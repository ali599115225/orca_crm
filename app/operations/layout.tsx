// app/operations/layout.tsx
import React from 'react';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getActiveTenant } from '@/lib/tenant';
import { runWithTenantContext } from '@/lib/tenant-context';
import { isPrivilegedSessionPayload } from '@/lib/platform-identity';
import DashboardLayout from '@/components/layout/DashboardLayout';

type OperationsDiagnosticCode =
  | 'OPERATIONS_SESSION_MISSING'
  | 'OPERATIONS_TENANT_RESOLUTION_FAILED'
  | 'OPERATIONS_TENANT_READY';

function logOperationsDiagnostic(code: OperationsDiagnosticCode) {
  console.info('[OperationsDiagnostics]', { code });
}

function TenantUnavailableState() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <main className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">تعذر فتح لوحة العمليات</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          لا يمكن فتح اللوحة حالياً. يرجى التواصل مع مسؤول النظام للتحقق من حالة المنشأة.
        </p>
      </main>
    </div>
  );
}

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
    logOperationsDiagnostic('OPERATIONS_SESSION_MISSING');
    redirect("/login");
  }

  // جلب المنشأة العقارية النشطة ديناميكياً
  let tenant: any;
  try {
    tenant = await getActiveTenant();
  } catch {
    logOperationsDiagnostic('OPERATIONS_TENANT_RESOLUTION_FAILED');
    return <TenantUnavailableState />;
  }
  logOperationsDiagnostic('OPERATIONS_TENANT_READY');

  // جلب بيانات المستخدم الحالي
  const user = await runWithTenantContext(
    {
      tenantId: tenant.id,
      userId: session.userId as string,
    },
    () =>
      prisma.user.findUnique({
        where: { id: session.userId as string },
      }),
  );
  const userEmail = user?.email || "";
  const userName = user?.name || "";
  const isSuperAdmin = isPrivilegedSessionPayload(session);

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
