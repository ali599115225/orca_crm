// app/operations/helpdesk/page.tsx
import { prisma } from '@/lib/prisma';
import HelpdeskView from '@/components/views/HelpdeskView';

export default async function HelpdeskPage() {
  let initialTickets: any[] = [];
  let tenantName = 'ORCA CRM';

  try {
    const tenant = await prisma.tenant.findFirst({
      select: { companyName: true }
    });
    if (tenant) tenantName = tenant.companyName;

    // جلب آخر 50 تذكرة مرتبة بالأحدث أولاً
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    initialTickets = tickets.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      aiResponse: t.aiResponse ?? null,
      createdAt: t.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error('[HelpdeskPage] DB fetch error:', err);
  }

  return (
    <HelpdeskView
      initialTickets={initialTickets}
      tenantName={tenantName}
    />
  );
}
