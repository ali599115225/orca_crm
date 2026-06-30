import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  findAccountByCode,
  postInvoiceEntry,
  seedChartOfAccounts,
} from '@/lib/accounting';
import {
  hasDatabaseRole,
  requireAuth,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth-guard';
import {
  ErrorCode,
  publicError,
  statusForErrorCode,
  type ErrorCodeType,
} from '@/lib/errors';

export const runtime = 'nodejs';

class SettleLeaseError extends Error {
  constructor(
    readonly code: ErrorCodeType,
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'SettleLeaseError';
  }
}

function errorResponse(
  code: ErrorCodeType,
  context: string,
  rawError?: unknown,
  status = statusForErrorCode(code)
): NextResponse {
  return NextResponse.json(publicError(code, context, rawError), { status });
}

function finiteMoney(value: unknown): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
    return null;
  }
  return Math.round(amount * 100) / 100;
}

function finiteVatRate(value: unknown): number | null {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return null;
  return Math.round(rate * 100) / 100;
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse(request);
  if (!(await hasDatabaseRole(session, ['ADMIN']))) return forbiddenResponse(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      ErrorCode.BAD_REQUEST,
      'settle-lease body is not valid JSON'
    );
  }

  const input =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const leaseId =
    typeof input.leaseId === 'string' ? input.leaseId.trim() : '';

  if (!leaseId || leaseId.length > 100) {
    return errorResponse(
      ErrorCode.VALIDATION_ERROR,
      'settle-lease lease identifier is invalid'
    );
  }

  const tenantId = session.tenantId;

  try {
    const lease = await prisma.rentalLease.findFirst({
      where: { id: leaseId, tenantId },
      select: {
        id: true,
        rentAmount: true,
        vatRate: true,
      },
    });

    if (!lease) {
      return errorResponse(
        ErrorCode.NOT_FOUND,
        'settle-lease lease not found'
      );
    }

    const subtotal = finiteMoney(lease.rentAmount);
    const vatRate = finiteVatRate(lease.vatRate);

    if (subtotal === null || vatRate === null) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        'settle-lease stored financial values are invalid'
      );
    }

    const vatAmount = Math.round(subtotal * vatRate) / 100;
    const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100;

    await seedChartOfAccounts(tenantId);

    const [receivableAccount, revenueAccount, vatPayableAccount] =
      await Promise.all([
        findAccountByCode(tenantId, '1.1.3'),
        findAccountByCode(tenantId, '4.1'),
        vatAmount > 0
          ? findAccountByCode(tenantId, '2.1.1')
          : Promise.resolve(null),
      ]);

    if (
      !receivableAccount ||
      !revenueAccount ||
      (vatAmount > 0 && !vatPayableAccount)
    ) {
      throw new SettleLeaseError(
        ErrorCode.INTERNAL_ERROR,
        500,
        'required settlement accounts are missing'
      );
    }

    const invoice = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.update({
        where: { id: tenantId },
        data: { nextInvoiceNumber: { increment: 1 } },
        select: {
          nextInvoiceNumber: true,
          invoicePrefix: true,
        },
      });

      const invoiceNumber = tenant.nextInvoiceNumber - 1;
      const createdInvoice = await tx.invoice.create({
        data: {
          tenantId,
          leaseId,
          invoiceNumber,
          invoicePrefix: tenant.invoicePrefix || 'INV',
          dueDate: new Date(),
          subtotal,
          vatRate,
          vatAmount,
          totalAmount,
          status: 'unpaid',
        },
      });

      await postInvoiceEntry(
        tenantId,
        createdInvoice.id,
        subtotal,
        vatAmount,
        totalAmount,
        receivableAccount.id,
        revenueAccount.id,
        vatPayableAccount?.id ?? '',
        tx
      );

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: session.userId,
          action: 'SETTLE_LEASE',
          tableName: 'invoices',
          recordId: createdInvoice.id,
          details: `Lease settlement invoice created for lease ${leaseId}`,
        },
      });

      return createdInvoice;
    });

    return NextResponse.json({
      success: true,
      message: 'تمت تسوية عقد الإيجار في دفتر الأستاذ',
      settlement: {
        id: invoice.id,
        leaseId,
        gross: subtotal,
        vat: vatAmount,
        net: totalAmount,
        status: 'completed',
        ledgerRef: `GL-SETTLE-${invoice.invoiceNumber}`,
      },
    });
  } catch (error: unknown) {
    if (error instanceof SettleLeaseError) {
      return errorResponse(
        error.code,
        error.message,
        undefined,
        error.status
      );
    }

    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      'settle-lease failed',
      error
    );
  }
}
