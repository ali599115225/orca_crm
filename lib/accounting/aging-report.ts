import { prisma } from '@/lib/prisma';

export interface AgingBucket {
  label: string;
  amount: number;
  count: number;
}

export interface AgingReport {
  buckets: AgingBucket[];
  totalOutstanding: number;
  asOfDate: string;
}

export async function getAgingReport(tenantId: string): Promise<AgingReport> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const invoices = await prisma.rentalInvoice.findMany({
    where: {
      tenantId,
      status: { not: 'paid' },
    },
    include: { lease: { select: { tenantName: true, unitName: true } } },
  });

  const buckets: AgingBucket[] = [
    { label: '0–30 يوم', amount: 0, count: 0 },
    { label: '31–60 يوم', amount: 0, count: 0 },
    { label: '61–90 يوم', amount: 0, count: 0 },
    { label: '90+ يوم', amount: 0, count: 0 },
  ];

  for (const inv of invoices) {
    const dueDate = new Date(inv.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const amount = Number(inv.totalAmount);

    if (diffDays <= 0) continue;
    if (diffDays <= 30) { buckets[0].amount += amount; buckets[0].count++; }
    else if (diffDays <= 60) { buckets[1].amount += amount; buckets[1].count++; }
    else if (diffDays <= 90) { buckets[2].amount += amount; buckets[2].count++; }
    else { buckets[3].amount += amount; buckets[3].count++; }
  }

  const totalOutstanding = invoices.reduce((s, i) => s + Number(i.totalAmount), 0);

  return {
    buckets,
    totalOutstanding,
    asOfDate: today.toISOString().split('T')[0],
  };
}

export async function getAgingDetail(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const invoices = await prisma.rentalInvoice.findMany({
    where: { tenantId, status: { not: 'paid' } },
    include: { lease: { select: { tenantName: true, unitName: true } } },
    orderBy: { dueDate: 'asc' },
  });

  return invoices.map((inv) => {
    const dueDate = new Date(inv.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    let bucket: string;
    if (diffDays <= 0) bucket = 'غير مستحق';
    else if (diffDays <= 30) bucket = '0–30 يوم';
    else if (diffDays <= 60) bucket = '31–60 يوم';
    else if (diffDays <= 90) bucket = '61–90 يوم';
    else bucket = '90+ يوم';

    return {
      invoiceId: inv.id,
      invoiceNumber: `${inv.invoicePrefix}-${inv.invoiceNumber}`,
      customerName: inv.lease.tenantName,
      unitName: inv.lease.unitName,
      dueDate: inv.dueDate.toISOString().split('T')[0],
      totalAmount: Number(inv.totalAmount),
      daysOverdue: diffDays > 0 ? diffDays : 0,
      bucket,
      status: inv.status,
    };
  });
}
