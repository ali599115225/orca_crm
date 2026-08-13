import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDealCorrelationId } from '@/lib/domain/deal-passport';
import { completePaymentTransaction } from '@/lib/domain/transaction-spine';
import {
  INSTALLMENT_STATUS,
  PAYMENT_PLAN_STATUS,
} from '@/lib/domain/transaction-spine/constants';
import {
  findAccountByCode,
  seedChartOfAccounts,
} from '@/lib/accounting';
import {
  forbiddenResponse,
  hasDatabaseRole,
  requireAuth,
  unauthorizedResponse,
} from '@/lib/api-auth-guard';
import {
  classifyError,
  ErrorCode,
  publicError,
  statusForErrorCode,
  type ErrorCodeType,
} from '@/lib/errors';

export const runtime = 'nodejs';

const MANUAL_PROVIDER = 'MANUAL';

const PAYMENT_METHOD_ALIASES: Record<string, string> = {
  CASH: 'CASH',
  CASH_PAYMENT: 'CASH',
  نقدي: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  WIRE_TRANSFER: 'BANK_TRANSFER',
  TRANSFER: 'BANK_TRANSFER',
  تحويل_بنكي: 'BANK_TRANSFER',
  CARD: 'CARD',
  CREDIT_CARD: 'CARD',
  DEBIT_CARD: 'CARD',
  بطاقة: 'CARD',
  CHECK: 'CHECK',
  CHEQUE: 'CHECK',
  شيك: 'CHECK',
  SADAD: 'SADAD',
  سداد: 'SADAD',
};

class PaymentRouteError extends Error {
  constructor(
    readonly publicCode: ErrorCodeType,
    readonly httpStatus: number,
    message: string
  ) {
    super(message);
    this.name = 'PaymentRouteError';
  }
}

function errorResponse(
  code: ErrorCodeType,
  context: string,
  error?: unknown,
  status = statusForErrorCode(code)
): NextResponse {
  return NextResponse.json(publicError(code, context, error), { status });
}

function normalizePaymentMethod(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

  return PAYMENT_METHOD_ALIASES[normalized] ?? null;
}

function buildProviderReference(
  tenantId: string,
  invoiceId: string,
  idempotencyKey: string
): string {
  return createHash('sha256')
    .update(`${tenantId}:${invoiceId}:${idempotencyKey}`)
    .digest('hex');
}

function successResponse(
  receipt: { id: string; receivedDate: Date },
  invoiceId: string,
  amount: number,
  method: string,
  idempotencyCached: boolean
): NextResponse {
  return NextResponse.json({
    success: true,
    message: 'تم تسجيل الدفعة بنجاح',
    idempotencyCached,
    payment: {
      id: receipt.id,
      invoiceId,
      amount,
      method,
      date: receipt.receivedDate.toISOString().split('T')[0],
    },
  });
}

async function findExistingPayment(
  tenantId: string,
  invoiceId: string,
  providerReference: string
) {
  const transaction = await prisma.paymentTransaction.findUnique({
    where: {
      provider_providerReference: {
        provider: MANUAL_PROVIDER,
        providerReference,
      },
    },
  });

  if (
    !transaction ||
    transaction.tenantId !== tenantId ||
    transaction.invoiceId !== invoiceId
  ) {
    return null;
  }

  if (
    transaction.status !== 'COMPLETED' ||
    !transaction.providerTransactionId
  ) {
    return { state: 'pending' as const };
  }

  const receipt = await prisma.receipt.findFirst({
    where: {
      id: transaction.providerTransactionId,
      tenantId,
      invoiceId,
    },
    select: {
      id: true,
      receivedDate: true,
    },
  });

  if (!receipt) {
    return { state: 'pending' as const };
  }

  return {
    state: 'completed' as const,
    receipt,
    amount: Number(transaction.amount),
    method: transaction.method,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse(request);

  if (!(await hasDatabaseRole(session, ['ADMIN', 'SALES_MANAGER']))) {
    return forbiddenResponse(request);
  }

  const { id } = await params;
  if (!id || id.length > 100) {
    return errorResponse(
      ErrorCode.VALIDATION_ERROR,
      'manual payment invoice ID is invalid'
    );
  }

  const idempotencyKey = request.headers
    .get('idempotency-key')
    ?.trim();

  if (
    !idempotencyKey ||
    idempotencyKey.length > 128 ||
    !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey)
  ) {
    return errorResponse(
      ErrorCode.BAD_REQUEST,
      'manual payment idempotency key is missing or invalid'
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      ErrorCode.BAD_REQUEST,
      'manual payment body is not valid JSON'
    );
  }

  const method = normalizePaymentMethod(
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>).method
      : undefined
  );

  if (!method) {
    return errorResponse(
      ErrorCode.VALIDATION_ERROR,
      'manual payment method is missing or unsupported'
    );
  }

  const tenantId = session.tenantId;
  const providerReference = buildProviderReference(
    tenantId,
    id,
    idempotencyKey
  );

  const correlationId = ensureDealCorrelationId(
    request.headers.get('x-correlation-id'),
    'manual-payment'
  );

  try {
    const existing = await findExistingPayment(
      tenantId,
      id,
      providerReference
    );

    if (existing?.state === 'completed') {
      return successResponse(
        existing.receipt,
        id,
        existing.amount,
        existing.method,
        true
      );
    }

    if (existing?.state === 'pending') {
      return errorResponse(
        ErrorCode.CONFLICT,
        'manual payment request is already in progress'
      );
    }

    await seedChartOfAccounts(tenantId);

    const [cashAccount, receivableAccount] = await Promise.all([
      findAccountByCode(tenantId, '1.1.1'),
      findAccountByCode(tenantId, '1.1.3'),
    ]);

    if (!cashAccount || !receivableAccount) {
      throw new PaymentRouteError(
        ErrorCode.INTERNAL_ERROR,
        500,
        'required payment accounts are missing'
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id, tenantId },
      });

      if (!invoice) {
        throw new PaymentRouteError(
          ErrorCode.NOT_FOUND,
          404,
          'invoice not found for tenant'
        );
      }

      if (String(invoice.status).toLowerCase() === 'paid') {
        throw new PaymentRouteError(
          ErrorCode.CONFLICT,
          409,
          'invoice is already paid'
        );
      }

      const invoiceAmount = Number(invoice.totalAmount);
      if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) {
        throw new PaymentRouteError(
          ErrorCode.VALIDATION_ERROR,
          400,
          'invoice amount is invalid'
        );
      }

      const unpaidInstallments = await tx.installment.findMany({
        where: {
          tenantId,
          invoiceId: id,
          paymentStatus: {
            notIn: [INSTALLMENT_STATUS.PAID, INSTALLMENT_STATUS.CANCELLED],
          },
        },
      });

      const paymentTransaction = await tx.paymentTransaction.create({
        data: {
          tenantId,
          invoiceId: id,
          installmentId:
            unpaidInstallments.length === 1 ? unpaidInstallments[0].id : null,
          amount: invoiceAmount,
          netAmount: invoiceAmount,
          currency: 'SAR',
          method,
          status: 'PENDING',
          provider: MANUAL_PROVIDER,
          providerReference,
          idempotencyKey: providerReference,
          expectedAmountMinor: Math.round(invoiceAmount * 100),
          expectedCurrency: 'SAR',
        },
      });

      return { invoiceAmount, paymentTransaction, unpaidInstallments };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const completed = await completePaymentTransaction({
      transactionId: created.paymentTransaction.id,
      tenantId,
      amountMinorUnits: Math.round(created.invoiceAmount * 100),
      currency: 'SAR',
      providerStatus: 'MANUAL_CONFIRMED',
      actorId: session.userId,
      actorUserId: session.userId,
      correlationId,
    });

    if (created.unpaidInstallments.length > 1) {
      const paidInvoice = await prisma.invoice.findFirst({
        where: { id, tenantId },
        select: { status: true },
      });
      if (String(paidInvoice?.status || '').toLowerCase() === 'paid') {
        await prisma.installment.updateMany({
          where: {
            tenantId,
            invoiceId: id,
            paymentStatus: {
              notIn: [INSTALLMENT_STATUS.PAID, INSTALLMENT_STATUS.CANCELLED],
            },
          },
          data: { paymentStatus: INSTALLMENT_STATUS.PAID },
        });

        const planIds = [
          ...new Set(
            created.unpaidInstallments
              .map((item) => item.paymentPlanId)
              .filter((planId): planId is string => Boolean(planId)),
          ),
        ];
        for (const paymentPlanId of planIds) {
          const remaining = await prisma.installment.count({
            where: {
              paymentPlanId,
              paymentStatus: { not: INSTALLMENT_STATUS.PAID },
            },
          });
          if (remaining === 0) {
            await prisma.paymentPlan.updateMany({
              where: { id: paymentPlanId, tenantId },
              data: {
                status: PAYMENT_PLAN_STATUS.COMPLETED,
                completedAt: new Date(),
              },
            });
          }
        }
      }
    }

    const receipt =
      completed.receipt ||
      completed.payment.receipt || {
        id: created.paymentTransaction.id,
        receivedDate: new Date(),
      };

    return successResponse(
      receipt,
      id,
      created.invoiceAmount,
      method,
      Boolean(completed.idempotent)
    );
  } catch (error: unknown) {
    if (error instanceof PaymentRouteError) {
      return errorResponse(
        error.publicCode,
        error.message,
        undefined,
        error.httpStatus
      );
    }

    const prismaCode =
      typeof error === 'object' && error !== null
        ? (error as { code?: unknown }).code
        : undefined;

    if (prismaCode === 'P2002') {
      const existing = await findExistingPayment(
        tenantId,
        id,
        providerReference
      );

      if (existing?.state === 'completed') {
        return successResponse(
          existing.receipt,
          id,
          existing.amount,
          existing.method,
          true
        );
      }

      if (existing?.state === 'pending') {
        return errorResponse(
          ErrorCode.CONFLICT,
          'manual payment duplicate request detected'
        );
      }
    }

    const code = classifyError(error);
    return errorResponse(
      code,
      'manual payment route failed',
      error
    );
  }
}
