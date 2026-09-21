import { prisma } from '@/lib/prisma';
import { getTodayString } from './utils';

export interface CustomerBalance {
  customerName: string;
  customerPhone: string;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  overdueAmount: number;
  lastPaymentDate: string | null;
  status: 'CURRENT' | 'OVERDUE' | 'PAID';
}

export async function getCustomerBalances(tenantId: string): Promise<CustomerBalance[]> {
  const invoices = await prisma.invoice.findMany({
    where: { tenantId },
    include: { lease: true, contract: true },
    orderBy: { issueDate: 'desc' },
  });

  const receipts = await prisma.receipt.findMany({
    where: { tenantId },
  });

  const customerMap = new Map<string, {
    customerName: string;
    customerPhone: string;
    totalInvoiced: number;
    totalPaid: number;
    invoices: typeof invoices;
    lastPaymentDate: string | null;
  }>();

  for (const inv of invoices) {
    const key = inv.lease?.tenantName || inv.contract?.buyerName || 'عميل';
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        customerName: inv.lease?.tenantName || inv.contract?.buyerName || 'عميل',
        customerPhone: '',
        totalInvoiced: 0,
        totalPaid: 0,
        invoices: [],
        lastPaymentDate: null,
      });
    }
    const entry = customerMap.get(key)!;
    entry.totalInvoiced += Number(inv.totalAmount);
    entry.invoices.push(inv);
  }

  for (const rec of receipts) {
    const inv = invoices.find((i) => i.id === rec.invoiceId);
    if (!inv) continue;
    const key = inv.lease?.tenantName || inv.contract?.buyerName || 'عميل';
    const entry = customerMap.get(key);
    if (entry) {
      entry.totalPaid += Number(rec.amount);
      const d = rec.receivedDate.toISOString().split('T')[0];
      if (!entry.lastPaymentDate || d > entry.lastPaymentDate) {
        entry.lastPaymentDate = d;
      }
    }
  }

  const today = getTodayString();
  const results: CustomerBalance[] = [];

  for (const [, entry] of customerMap) {
    const outstanding = entry.totalInvoiced - entry.totalPaid;
    let overdueAmount = 0;
    for (const inv of entry.invoices) {
      if (inv.status !== 'paid') {
        const dueStr = inv.dueDate.toISOString().split('T')[0];
        if (dueStr < today) {
          overdueAmount += Number(inv.totalAmount);
        }
      }
    }

    let status: 'CURRENT' | 'OVERDUE' | 'PAID';
    if (outstanding <= 0) status = 'PAID';
    else if (overdueAmount > 0) status = 'OVERDUE';
    else status = 'CURRENT';

    results.push({
      customerName: entry.customerName,
      customerPhone: entry.customerPhone,
      totalInvoiced: entry.totalInvoiced,
      totalPaid: entry.totalPaid,
      outstanding: Math.max(0, outstanding),
      overdueAmount,
      lastPaymentDate: entry.lastPaymentDate,
      status,
    });
  }

  return results.sort((a, b) => b.outstanding - a.outstanding);
}

export async function getOutstandingAmount(tenantId: string): Promise<number> {
  const result = await prisma.invoice.aggregate({
    where: { tenantId, status: { in: ['unpaid', 'overdue'] } },
    _sum: { totalAmount: true },
  });
  return Number(result._sum.totalAmount || 0);
}

export async function getOverdueAmount(tenantId: string): Promise<number> {
  const today = new Date();
  const result = await prisma.invoice.aggregate({
    where: { tenantId, status: { not: 'paid' }, dueDate: { lt: today } },
    _sum: { totalAmount: true },
  });
  return Number(result._sum.totalAmount || 0);
}

export async function getCollectionStatus(tenantId: string): Promise<{
  totalInvoiced: number;
  totalCollected: number;
  outstanding: number;
  collectionRate: number;
}> {
  const invoiced = await prisma.invoice.aggregate({
    where: { tenantId },
    _sum: { totalAmount: true },
  });
  const collected = await prisma.receipt.aggregate({
    where: { tenantId, status: 'COMPLETED' },
    _sum: { amount: true },
  });
  const totalInvoiced = Number(invoiced._sum.totalAmount || 0);
  const totalCollected = Number(collected._sum.amount || 0);
  return {
    totalInvoiced,
    totalCollected,
    outstanding: totalInvoiced - totalCollected,
    collectionRate: totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0,
  };
}
