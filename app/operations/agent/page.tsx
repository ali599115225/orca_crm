// app/operations/agent/page.tsx
import React from 'react';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getActiveTenant } from '@/lib/tenant';
import AgentWorkspaceView from './AgentWorkspaceView';

export const metadata = {
  title: 'واجهة المستشار العقاري - أوركا',
  description: 'مساحة العمل المخصصة لمستشار المبيعات العقارية والصفقات النشطة',
};

export default async function AgentWorkspacePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const tenant = await getActiveTenant();

  // جلب العملاء المسندين للمستخدم الحالي فقط
  const dbLeads = await prisma.lead.findMany({
    where: {
      tenantId: tenant.id,
      assignedTo: session.userId,
    },
    include: {
      project: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const leads = dbLeads.map(lead => ({
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    phone: lead.phone,
    city: lead.city,
    source: lead.source,
    status: lead.status,
    leadScore: lead.leadScore,
    createdAt: lead.createdAt.toISOString(),
    project: lead.project ? { name: lead.project.name } : null,
  }));

  return (
    <AgentWorkspaceView 
      initialLeads={leads}
      userId={session.userId}
      userName={session.name || ""}
    />
  );
}
