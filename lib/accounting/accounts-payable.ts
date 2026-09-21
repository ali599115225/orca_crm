import { prisma } from '@/lib/prisma';
import { getTodayString } from './utils';

export interface SupplierBalance {
  supplierName: string;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  overdueAmount: number;
  lastPaymentDate: string | null;
  status: 'CURRENT' | 'OVERDUE' | 'PAID';
}

export interface PayableItem {
  id: string;
  supplierName: string;
  description: string;
  amount: number;
  dueDate: string;
  paidAmount: number;
  outstanding: number;
  daysOverdue: number;
  status: string;
}

export async function getSupplierBalances(tenantId: string): Promise<SupplierBalance[]> {
  const commissions = await prisma.payrollCommission.findMany({
    where: { tenantId },
    include: {
      user: { select: { name: true } },
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const supplierMap = new Map<string, {
    supplierName: string;
    totalBilled: number;
    totalPaid: number;
    lastPaymentDate: string | null;
  }>();

  for (const c of commissions) {
    const name = c.user?.name || 'مورد غير معروف';
    if (!supplierMap.has(name)) {
      supplierMap.set(name, {
        supplierName: name,
        totalBilled: 0,
        totalPaid: 0,
        lastPaymentDate: null,
      });
    }
    const entry = supplierMap.get(name)!;
    entry.totalBilled += Number(c.amount);
    for (const p of c.payments) {
      entry.totalPaid += Number(p.amount);
      const d = p.paidAt.toISOString().split('T')[0];
      if (!entry.lastPaymentDate || d > entry.lastPaymentDate) {
        entry.lastPaymentDate = d;
      }
    }
  }

  const today = getTodayString();
  const results: SupplierBalance[] = [];

  for (const [, entry] of supplierMap) {
    const outstanding = entry.totalBilled - entry.totalPaid;
    let status: 'CURRENT' | 'OVERDUE' | 'PAID';
    if (outstanding <= 0) status = 'PAID';
    else status = 'CURRENT';

    results.push({
      supplierName: entry.supplierName,
      totalBilled: entry.totalBilled,
      totalPaid: entry.totalPaid,
      outstanding: Math.max(0, outstanding),
      overdueAmount: 0,
      lastPaymentDate: entry.lastPaymentDate,
      status,
    });
  }

  return results.sort((a, b) => b.outstanding - a.outstanding);
}

export async function getPayablesReport(tenantId: string): Promise<PayableItem[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const commissions = await prisma.payrollCommission.findMany({
    where: { tenantId, status: { not: 'PAID' } },
    include: {
      user: { select: { name: true } },
      payments: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return commissions.map((c) => {
    const dueDate = c.createdAt;
    const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPaid = c.payments.reduce((s, p) => s + Number(p.amount), 0);
    const outstanding = Number(c.amount) - totalPaid;

    return {
      id: c.id,
      supplierName: c.user?.name || 'مورد غير معروف',
      description: `عمولة — عقد ${c.contractId}`,
      amount: Number(c.amount),
      dueDate: dueDate.toISOString().split('T')[0],
      paidAmount: totalPaid,
      outstanding: Math.max(0, outstanding),
      daysOverdue: diffDays > 0 ? diffDays : 0,
      status: totalPaid >= Number(c.amount) ? 'مدفوع' : diffDays > 0 ? 'متأخر' : 'مستحق',
    };
  });
}

export async function getPayablesOutstanding(tenantId: string): Promise<number> {
  const result = await prisma.payrollCommission.aggregate({
    where: { tenantId, status: { not: 'PAID' } },
    _sum: { amount: true },
  });
  return Number(result._sum.amount || 0);
}

export async function getPayablesSummary(tenantId: string): Promise<{
  totalPayables: number;
  totalPaid: number;
  outstanding: number;
  paymentRate: number;
}> {
  const billed = await prisma.payrollCommission.aggregate({
    where: { tenantId },
    _sum: { amount: true },
  });
  const paid = await prisma.commissionPayment.aggregate({
    where: { tenantId },
    _sum: { amount: true },
  });
  const totalBilled = Number(billed._sum.amount || 0);
  const totalPaid = Number(paid._sum.amount || 0);
  return {
    totalPayables: totalBilled,
    totalPaid,
    outstanding: totalBilled - totalPaid,
    paymentRate: totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0,
  };
}
