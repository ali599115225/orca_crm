import { prisma } from '@/lib/prisma';
import { getPeriod } from './utils';

type PostingTransactionClient = Pick<
  typeof prisma,
  'journalEntry' | 'accountBalance'
>;

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

function assertFiniteNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new PostingError(`${field} must be a finite non-negative number`);
  }
}

function validatePostingInput(input: JournalEntryInput): void {
  if (!input.tenantId || !input.description || !input.source) {
    throw new PostingError('Tenant, description, and source are required');
  }

  if (!Array.isArray(input.lines) || input.lines.length < 2) {
    throw new PostingError('Journal entry must have at least 2 lines');
  }

  for (const line of input.lines) {
    if (!line.accountId) {
      throw new PostingError('Every journal line requires an account');
    }

    assertFiniteNonNegative(line.debit, 'Debit');
    assertFiniteNonNegative(line.credit, 'Credit');

    if (line.debit > 0 && line.credit > 0) {
      throw new PostingError(
        'A journal line cannot contain both debit and credit'
      );
    }
  }

  const totalDebit = round2(
    input.lines.reduce((sum, line) => sum + line.debit, 0)
  );
  const totalCredit = round2(
    input.lines.reduce((sum, line) => sum + line.credit, 0)
  );

  if (totalDebit <= 0 || totalCredit <= 0) {
    throw new PostingError('Journal totals must be greater than zero');
  }

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new PostingError(
      `Debit (${totalDebit}) does not equal Credit (${totalCredit})`
    );
  }
}

export async function postJournalEntry(
  input: JournalEntryInput,
  transaction?: PostingTransactionClient
): Promise<any> {
  validatePostingInput(input);

  const { tenantId, description, source, sourceId, lines } = input;

  const execute = async (tx: PostingTransactionClient) => {
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
          create: lines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            description: line.description,
          })),
        },
      },
      include: { lines: true },
    });

    const period = getPeriod();

    for (const line of lines) {
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
  };

  return transaction
    ? execute(transaction)
    : prisma.$transaction(async (tx) => execute(tx));
}

export async function reverseJournalEntry(
  entryId: string,
  tenantId: string,
  reason: string
): Promise<any> {
  if (!entryId || !tenantId || !reason.trim()) {
    throw new PostingError(
      'Entry ID, tenant ID, and reversal reason are required'
    );
  }

  return prisma.$transaction(async (tx) => {
    const original = await tx.journalEntry.findFirst({
      where: { id: entryId, tenantId },
      include: { lines: true },
    });

    if (!original) {
      throw new PostingError('Journal entry not found');
    }

    if (original.status === 'REVERSED') {
      throw new PostingError('Journal entry is already reversed');
    }

    const reversalLines: JournalLineInput[] = original.lines.map((line) => ({
      accountId: line.accountId,
      debit: Number(line.credit),
      credit: Number(line.debit),
      description: `عكس: ${line.description || original.description}`,
    }));

    const reversal = await postJournalEntry(
      {
        tenantId,
        description: `عكس القيد رقم ${original.entryNumber}: ${reason.trim()}`,
        source: 'REVERSAL',
        sourceId: entryId,
        lines: reversalLines,
      },
      tx
    );

    await tx.journalEntry.update({
      where: { id: entryId },
      data: {
        status: 'REVERSED',
        reversedById: reversal.id,
      },
    });

    return reversal;
  });
}

export function validateEntryBalance(
  lines: { debit: number; credit: number }[]
): boolean {
  if (!Array.isArray(lines) || lines.length < 2) return false;

  if (
    lines.some(
      (line) =>
        !Number.isFinite(line.debit) ||
        !Number.isFinite(line.credit) ||
        line.debit < 0 ||
        line.credit < 0
    )
  ) {
    return false;
  }

  const totalDebit = round2(
    lines.reduce((sum, line) => sum + line.debit, 0)
  );
  const totalCredit = round2(
    lines.reduce((sum, line) => sum + line.credit, 0)
  );

  return (
    totalDebit > 0 &&
    totalCredit > 0 &&
    Math.abs(totalDebit - totalCredit) < 0.01
  );
}

export async function postInvoiceEntry(
  tenantId: string,
  invoiceId: string,
  subtotal: number,
  vatAmount: number,
  totalAmount: number,
  receivableAccountId: string,
  revenueAccountId: string,
  vatPayableAccountId: string,
  transaction?: PostingTransactionClient
): Promise<any> {
  assertFiniteNonNegative(subtotal, 'Subtotal');
  assertFiniteNonNegative(vatAmount, 'VAT amount');
  assertFiniteNonNegative(totalAmount, 'Total amount');

  if (Math.abs(round2(subtotal + vatAmount) - round2(totalAmount)) > 0.01) {
    throw new PostingError(
      'Invoice total does not equal subtotal plus VAT'
    );
  }

  if (!receivableAccountId || !revenueAccountId) {
    throw new PostingError('Required invoice accounts are missing');
  }

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
    if (!vatPayableAccountId) {
      throw new PostingError('VAT payable account is required');
    }

    lines.push({
      accountId: vatPayableAccountId,
      debit: 0,
      credit: vatAmount,
      description: 'ضريبة القيمة المضافة',
    });
  }

  return postJournalEntry(
    {
      tenantId,
      description: 'ترحيل فاتورة إيجار',
      source: 'INVOICE',
      sourceId: invoiceId,
      lines,
    },
    transaction
  );
}

export async function postPaymentEntry(
  tenantId: string,
  receiptId: string,
  amount: number,
  cashAccountId: string,
  receivableAccountId: string,
  transaction?: PostingTransactionClient
): Promise<any> {
  return postJournalEntry(
    {
      tenantId,
      description: 'تحصيل دفعة',
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
    },
    transaction
  );
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
    description: 'صرف عمولة مبيعات',
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
    description: 'رد مبلغ فاتورة',
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
  const normalizedVat = vatAmount ?? 0;

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

  if (normalizedVat > 0) {
    if (!vatPayableAccountId) {
      throw new PostingError('VAT payable account is required');
    }

    lines.push({
      accountId: vatPayableAccountId,
      debit: 0,
      credit: normalizedVat,
      description: 'ضريبة القيمة المضافة',
    });
  }

  return postJournalEntry({
    tenantId,
    description: 'ترحيل قسط عقد',
    source: 'INSTALLMENT',
    sourceId: installmentId,
    lines,
  });
}
