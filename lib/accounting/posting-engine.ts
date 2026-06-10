import { prisma } from '@/lib/prisma';
import { JournalEntryStatus } from '@prisma/client';
import { getPeriod } from './utils';

export interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntryInput {
  tenantId: string;
  description: string;
  source: string;
  sourceId?: string;
  lines: JournalLineInput[];
}

export class PostingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PostingError';
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function postJournalEntry(input: JournalEntryInput): Promise<any> {
  const { tenantId, description, source, sourceId, lines } = input;

  if (!lines || lines.length < 2) {
    throw new PostingError('Journal entry must have at least 2 lines');
  }

  const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new PostingError(
      `Debit (${totalDebit}) does not equal Credit (${totalCredit})`
    );
  }

  return prisma.$transaction(async (tx) => {
    const lastEntry = await tx.journalEntry.findFirst({
      where: { tenantId },
      orderBy: { entryNumber: 'desc' },
      select: { entryNumber: true },
    });
    const nextNumber = (lastEntry?.entryNumber ?? 0) + 1;

    const entry = await tx.journalEntry.create({
      data: {
        tenantId,
        entryNumber: nextNumber,
        description,
        source,
        sourceId,
        status: 'POSTED',
        lines: {
          create: lines.map((l) => ({
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
            description: l.description,
          })),
        },
      },
      include: { lines: true },
    });

    for (const line of lines) {
      const period = getPeriod();
      await tx.accountBalance.upsert({
        where: {
          accountId_period_tenantId: {
            accountId: line.accountId,
            period,
            tenantId,
          },
        },
        create: {
          accountId: line.accountId,
          tenantId,
          period,
          debit: line.debit,
          credit: line.credit,
        },
        update: {
          debit: { increment: line.debit },
          credit: { increment: line.credit },
        },
      });
    }

    return entry;
  });
}

export async function reverseJournalEntry(
  entryId: string,
  tenantId: string,
  reason: string
): Promise<any> {
  const original = await prisma.journalEntry.findFirst({
    where: { id: entryId, tenantId },
    include: { lines: true },
  });

  if (!original) throw new PostingError('Journal entry not found');
  if (original.status === 'REVERSED') throw new PostingError('Already reversed');

  const reversalLines: JournalLineInput[] = original.lines.map((l) => ({
    accountId: l.accountId,
    debit: Number(l.credit),
    credit: Number(l.debit),
    description: `عكس: ${l.description || original.description}`,
  }));

  const reversal = await postJournalEntry({
    tenantId,
    description: `عكس القيد رقم ${original.entryNumber}: ${reason}`,
    source: 'REVERSAL',
    sourceId: entryId,
    lines: reversalLines,
  });

  await prisma.journalEntry.update({
    where: { id: entryId },
    data: { status: 'REVERSED', reversedById: reversal.id },
  });

  return reversal;
}

export function validateEntryBalance(lines: { debit: number; credit: number }[]): boolean {
  const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));
  return Math.abs(totalDebit - totalCredit) < 0.01;
}

export async function postInvoiceEntry(
  tenantId: string,
  invoiceId: string,
  subtotal: number,
  vatAmount: number,
  totalAmount: number,
  receivableAccountId: string,
  revenueAccountId: string,
  vatPayableAccountId: string
): Promise<any> {
  const lines: JournalLineInput[] = [
    {
      accountId: receivableAccountId,
      debit: totalAmount,
      credit: 0,
      description: 'فاتورة إيجار',
    },
    {
      accountId: revenueAccountId,
      debit: 0,
      credit: subtotal,
      description: 'إيراد الإيجار',
    },
  ];

  if (vatAmount > 0) {
    lines.push({
      accountId: vatPayableAccountId,
      debit: 0,
      credit: vatAmount,
      description: 'ضريبة القيمة المضافة',
    });
  }

  return postJournalEntry({
    tenantId,
    description: `ترحيل فاتورة إيجار`,
    source: 'INVOICE',
    sourceId: invoiceId,
    lines,
  });
}

export async function postPaymentEntry(
  tenantId: string,
  receiptId: string,
  amount: number,
  cashAccountId: string,
  receivableAccountId: string
): Promise<any> {
  return postJournalEntry({
    tenantId,
    description: `تحصيل دفعة`,
    source: 'RECEIPT',
    sourceId: receiptId,
    lines: [
      {
        accountId: cashAccountId,
        debit: amount,
        credit: 0,
        description: 'إيداع نقدي',
      },
      {
        accountId: receivableAccountId,
        debit: 0,
        credit: amount,
        description: 'تخفيض حسابات القبض',
      },
    ],
  });
}

export async function postCommissionEntry(
  tenantId: string,
  commissionId: string,
  amount: number,
  expenseAccountId: string,
  cashAccountId: string
): Promise<any> {
  return postJournalEntry({
    tenantId,
    description: `صرف عمولة مبيعات`,
    source: 'COMMISSION',
    sourceId: commissionId,
    lines: [
      {
        accountId: expenseAccountId,
        debit: amount,
        credit: 0,
        description: 'مصروف عمولة',
      },
      {
        accountId: cashAccountId,
        debit: 0,
        credit: amount,
        description: 'دفع عمولة',
      },
    ],
  });
}

export async function postRefundEntry(
  tenantId: string,
  refundId: string,
  amount: number,
  revenueAccountId: string,
  cashAccountId: string
): Promise<any> {
  return postJournalEntry({
    tenantId,
    description: `رد مبلغ فاتورة`,
    source: 'REFUND',
    sourceId: refundId,
    lines: [
      {
        accountId: revenueAccountId,
        debit: amount,
        credit: 0,
        description: 'تخفيض الإيراد (مرتجع)',
      },
      {
        accountId: cashAccountId,
        debit: 0,
        credit: amount,
        description: 'دفع مرتجع',
      },
    ],
  });
}

export async function postInstallmentEntry(
  tenantId: string,
  installmentId: string,
  amount: number,
  vatAmount: number | null,
  totalAmount: number,
  receivableAccountId: string,
  revenueAccountId: string,
  vatPayableAccountId: string
): Promise<any> {
  const lines: JournalLineInput[] = [
    {
      accountId: receivableAccountId,
      debit: totalAmount,
      credit: 0,
      description: 'قسط عقد بيع',
    },
    {
      accountId: revenueAccountId,
      debit: 0,
      credit: amount,
      description: 'إيراد مبيعات',
    },
  ];

  if (vatAmount && vatAmount > 0) {
    lines.push({
      accountId: vatPayableAccountId,
      debit: 0,
      credit: vatAmount,
      description: 'ضريبة القيمة المضافة',
    });
  }

  return postJournalEntry({
    tenantId,
    description: `ترحيل قسط عقد`,
    source: 'INSTALLMENT',
    sourceId: installmentId,
    lines,
  });
}
