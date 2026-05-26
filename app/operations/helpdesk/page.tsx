// app/operations/helpdesk/page.tsx
import React from 'react';
import { getTicketsAction } from '@/app/actions/helpdesk';
import { getActiveTenant } from '@/lib/tenant';
import HelpdeskView from './HelpdeskView';

export const metadata = {
  title: 'مركز الدعم والوكيل مساعد - أوركا',
  description: 'الدعم الفني الذكي والتواصل الفوري مع الوكيل مساعد',
};

export default async function HelpdeskPage() {
  const tenant = await getActiveTenant();
  const dbTickets = await getTicketsAction();

  const tickets = dbTickets.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    aiResponse: t.aiResponse,
    createdAt: t.createdAt,
  }));

  return (
    <HelpdeskView 
      initialTickets={tickets}
      tenantName={tenant.companyName}
    />
  );
}
