// app/contract/[leadId]/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getActiveTenant } from '@/lib/tenant';
import { ContractView } from './ContractView'; // استدعاء واجهة العرض التفاعلية

export const metadata = {
  title: "عقد الحجز العقاري الموحد - أوركا",
};

export default async function ContractPage({ params }: { params: Promise<{ leadId: string }> }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const tenant = await getActiveTenant();
  const resolvedParams = await params;
  const leadId = resolvedParams.leadId;

  // جلب العميل والمشروع بدقة
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      tenantId: tenant.id,
    },
    include: {
      project: true,
    }
  });

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs font-bold text-slate-500">
        عذراً، لم يتم العثور على وثيقة العقد لهذا العميل أو أنك لا تملك صلاحية الوصول إليها.
      </div>
    );
  }

  // التحقق هل المستخدم الحالي هو مدير المنصة (ADMIN) لمنحه صلاحية التعديل؟
  const isAdmin = session.role === 'ADMIN';

  return (
    <ContractView 
      lead={lead} 
      tenant={tenant} 
      isAdmin={isAdmin} 
    />
  );
}
