import { prisma } from '@/lib/prisma';
import { getPeriod } from './utils';

export interface TrialBalanceRow {
  code: string;
  nameAr: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
}

export async function getTrialBalance(tenantId: string, period?: string): Promise<{
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
}> {
  const wherePeriod = period || getPeriod();
  const balances = await prisma.accountBalance.findMany({
    where: { tenantId, period: wherePeriod },
    include: { account: true },
    orderBy: { account: { code: 'asc' } },
  });

  const rows: TrialBalanceRow[] = balances.map((b) => {
    const debit = Number(b.debit);
    const credit = Number(b.credit);
    const balance =
      ['ASSET', 'EXPENSE'].includes(b.account.type)
        ? debit - credit
        : credit - debit;
    return {
      code: b.account.code,
      nameAr: b.account.nameAr,
      type: b.account.type,
      debit,
      credit,
      balance,
    };
  });

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return { rows, totalDebit, totalCredit };
}

export interface GeneralLedgerRow {
  date: string;
  entryNumber: number;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export async function getGeneralLedgerReport(
  tenantId: string,
  accountId?: string,
  fromDate?: string,
  toDate?: string
): Promise<GeneralLedgerRow[]> {
  const where: any = {
    journalEntry: { tenantId, status: 'POSTED' },
  };
  if (accountId) where.accountId = accountId;
  if (fromDate) where.journalEntry = { ...where.journalEntry, postedAt: { gte: new Date(fromDate) } };
  if (toDate) where.journalEntry = { ...where.journalEntry, postedAt: { lte: new Date(toDate) } };

  const lines = await prisma.journalLine.findMany({
    where,
    include: {
      journalEntry: true,
      account: { select: { code: true, nameAr: true } },
    },
    orderBy: [{ journalEntry: { postedAt: 'asc' } }, { id: 'asc' }],
  });

  let runningBalance = 0;
  return lines.map((l) => {
    const debit = Number(l.debit);
    const credit = Number(l.credit);
    runningBalance += debit - credit;
    return {
      date: l.journalEntry.postedAt.toISOString().split('T')[0],
      entryNumber: l.journalEntry.entryNumber,
      description: l.journalEntry.description,
      debit,
      credit,
      balance: runningBalance,
    };
  });
}

export interface ArReportRow {
  customerName: string;
  unitName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
  daysOverdue: number;
  status: string;
}

export async function getAccountsReceivableReport(tenantId: string): Promise<ArReportRow[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const invoices = await prisma.rentalInvoice.findMany({
    where: { tenantId },
    include: { lease: { select: { tenantName: true, unitName: true } } },
    orderBy: { dueDate: 'asc' },
  });

  const receipts = await prisma.receipt.findMany({
    where: { tenantId },
  });

  const receiptMap = new Map<string, number>();
  for (const r of receipts) {
    const key = r.invoiceId;
    receiptMap.set(key, (receiptMap.get(key) || 0) + Number(r.amount));
  }

  const rows: ArReportRow[] = [];
  for (const inv of invoices) {
    const paidAmount = receiptMap.get(inv.id) || 0;
    const outstanding = Number(inv.totalAmount) - paidAmount;
    if (outstanding <= 0 && inv.status === 'paid') continue;

    const dueDate = new Date(inv.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    rows.push({
      customerName: inv.lease.tenantName,
      unitName: inv.lease.unitName,
      invoiceNumber: `${inv.invoicePrefix}-${inv.invoiceNumber}`,
      issueDate: inv.issueDate.toISOString().split('T')[0],
      dueDate: inv.dueDate.toISOString().split('T')[0],
      totalAmount: Number(inv.totalAmount),
      paidAmount,
      outstanding: Math.max(0, outstanding),
      daysOverdue,
      status: daysOverdue > 0 ? 'متأخر' : inv.status === 'paid' ? 'مدفوع' : 'غير مدفوع',
    });
  }

  return rows;
}

export interface VatReportRow {
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
}

export async function getVatReport(
  tenantId: string,
  fromDate?: string,
  toDate?: string
): Promise<{
  rows: VatReportRow[];
  totalSubtotal: number;
  totalVat: number;
  totalAmount: number;
}> {
  const where: any = { tenantId };
  if (fromDate) where.issueDate = { ...where.issueDate, gte: new Date(fromDate) };
  if (toDate) where.issueDate = { ...where.issueDate, lte: new Date(toDate) };

  const invoices = await prisma.rentalInvoice.findMany({
    where,
    include: { lease: { select: { tenantName: true } } },
    orderBy: { issueDate: 'desc' },
  });

  const rows: VatReportRow[] = invoices
    .filter((inv) => Number(inv.vatAmount) > 0)
    .map((inv) => ({
      invoiceNumber: `${inv.invoicePrefix}-${inv.invoiceNumber}`,
      customerName: inv.lease.tenantName,
      issueDate: inv.issueDate.toISOString().split('T')[0],
      subtotal: Number(inv.subtotal),
      vatRate: Number(inv.vatRate),
      vatAmount: Number(inv.vatAmount),
      totalAmount: Number(inv.totalAmount),
    }));

  return {
    rows,
    totalSubtotal: rows.reduce((s, r) => s + r.subtotal, 0),
    totalVat: rows.reduce((s, r) => s + r.vatAmount, 0),
    totalAmount: rows.reduce((s, r) => s + r.totalAmount, 0),
  };
}
