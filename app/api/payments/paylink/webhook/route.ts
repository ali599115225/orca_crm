import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findAccountByCode, postPaymentEntry } from '@/lib/accounting';
import { rateLimit } from '@/lib/rate-limit';
import { redactPiiFromPayload } from '@/lib/privacy-mask';
import { ErrorCode, publicError } from '@/lib/errors';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 64 * 1024;
const SUCCESS = new Set(['paid', 'success', 'completed']);
const FAILURE_STATUS: Record<string, string> = {
  failed: 'FAILED',
  expired: 'EXPIRED',
  cancelled: 'CANCELLED',
  canceled: 'CANCELLED',
};

function secureTokenEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function clean(value: unknown, max = 200): string {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max)
    : '';
}

function requestIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

function amountMatches(value: unknown, expectedMinor: number): boolean {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || expectedMinor <= 0) return false;
  return (
    Math.round(amount) === expectedMinor ||
    Math.round(amount * 100) === expectedMinor
  );
}

export async function POST(request: NextRequest) {
  const limit = await rateLimit(
    `paylink:webhook:ip:${requestIp(request)}`,
    60,
    60_000,
    true
  );
  if (!limit.allowed) {
    return NextResponse.json(
      publicError(ErrorCode.RATE_LIMITED, 'Paylink webhook rate limited'),
      { status: 429 }
    );
  }

  const secret = process.env.PAYLINK_WEBHOOK_SECRET?.trim() ?? '';
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : '';
  if (secret.length < 32) {
    return NextResponse.json(
      publicError(ErrorCode.SERVICE_UNAVAILABLE, 'Paylink webhook not configured'),
      { status: 503 }
    );
  }
  if (!secureTokenEqual(token, secret)) {
    return NextResponse.json(
      publicError(ErrorCode.WEBHOOK_INVALID, 'Paylink webhook authentication failed'),
      { status: 401 }
    );
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(publicError(ErrorCode.BAD_REQUEST, 'Paylink body too large'), { status: 413 });
  }

  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      return NextResponse.json(publicError(ErrorCode.BAD_REQUEST, 'Paylink body too large'), { status: 413 });
    }

    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json(publicError(ErrorCode.BAD_REQUEST, 'Paylink body invalid'), { status: 400 });
    }
    const body = parsed as Record<string, unknown>;
    const paymentRef = clean(body.transaction_id || body.payment_id || body.reference);
    const providerInvoiceId = clean(body.id || body.invoice_id);
    const status = clean(body.status, 40).toLowerCase();
    if ((!paymentRef && !providerInvoiceId) || (!SUCCESS.has(status) && !FAILURE_STATUS[status])) {
      return NextResponse.json(publicError(ErrorCode.WEBHOOK_INVALID, 'Paylink webhook fields invalid'), { status: 400 });
    }

    const references = [
      ...(paymentRef
        ? [
            { providerTransactionId: paymentRef },
            { providerReference: paymentRef },
          ]
        : []),
      ...(providerInvoiceId ? [{ providerInvoiceId }] : []),
    ];

    const payment = await prisma.paymentTransaction.findFirst({
      where: { provider: 'paylink', OR: references },
    });
    if (!payment || !payment.invoiceId) {
      return NextResponse.json(publicError(ErrorCode.NOT_FOUND, 'Paylink transaction not found'), { status: 404 });
    }
    if (payment.status === 'COMPLETED') {
      return NextResponse.json({ status: 'already_processed' });
    }

    const redactedPayload = redactPiiFromPayload(body) as never;

    if (!SUCCESS.has(status)) {
      await prisma.$transaction(async (tx) => {
        await tx.paymentTransaction.update({
          where: { id: payment.id },
          data: {
            status: FAILURE_STATUS[status],
            gatewayStatus: status,
            rawPayload: redactedPayload,
            webhookReceivedAt: new Date(),
            failureReason: clean(body.failure_reason || body.error, 500) || null,
          },
        });
        await tx.rentalInvoice.updateMany({
          where: { id: payment.invoiceId!, tenantId: payment.tenantId },
          data: { gatewayStatus: status },
        });
        await tx.auditLog.create({
          data: {
            tenantId: payment.tenantId,
            userId: null,
            action: 'PAYLINK_PAYMENT_FAILED',
            tableName: 'payment_transactions',
            recordId: payment.id,
            details: `Paylink payment status: ${status}`,
          },
        });
      });
      return NextResponse.json({ status: 'recorded' });
    }

    const expectedMinor =
      payment.expectedAmountMinor > 0
        ? payment.expectedAmountMinor
        : Math.round(Number(payment.amount) * 100);
    if (!amountMatches(body.amount ?? body.amount_total, expectedMinor)) {
      return NextResponse.json(publicError(ErrorCode.WEBHOOK_INVALID, 'Paylink amount mismatch'), { status: 400 });
    }
    const currency = clean(body.currency, 10).toUpperCase();
    if (currency && currency !== (payment.expectedCurrency || 'SAR').toUpperCase()) {
      return NextResponse.json(publicError(ErrorCode.WEBHOOK_INVALID, 'Paylink currency mismatch'), { status: 400 });
    }

    const [cashAccount, receivableAccount] = await Promise.all([
      findAccountByCode(payment.tenantId, '1.1.1'),
      findAccountByCode(payment.tenantId, '1.1.3'),
    ]);
    if (!cashAccount || !receivableAccount) {
      return NextResponse.json(publicError(ErrorCode.SERVICE_UNAVAILABLE, 'Paylink accounting accounts missing'), { status: 503 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.paymentTransaction.findFirst({
        where: { id: payment.id, tenantId: payment.tenantId },
      });
      if (!current || current.status === 'COMPLETED') {
        return { alreadyProcessed: true } as const;
      }

      const invoice = await tx.rentalInvoice.findFirst({
        where: { id: payment.invoiceId!, tenantId: payment.tenantId },
      });
      if (!invoice) throw new Error('Paylink invoice missing');
      if (invoice.status === 'paid') {
        await tx.paymentTransaction.update({
          where: { id: payment.id },
          data: {
            status: 'REVIEW_REQUIRED',
            gatewayStatus: 'completed',
            rawPayload: redactedPayload,
            webhookReceivedAt: new Date(),
            lastError: 'INVOICE_ALREADY_PAID',
          },
        });
        return { reviewRequired: true } as const;
      }

      const amount = Number(invoice.totalAmount);
      const receipt = await tx.receipt.create({
        data: {
          tenantId: payment.tenantId,
          invoiceId: invoice.id,
          amount,
          paymentMethod: 'paylink',
          status: 'COMPLETED',
          receivedDate: new Date(),
        },
      });

      const updated = await tx.rentalInvoice.updateMany({
        where: { id: invoice.id, tenantId: payment.tenantId, status: { not: 'paid' } },
        data: {
          status: 'paid',
          paidAt: new Date(),
          paymentMethod: 'paylink',
          paymentRef: receipt.id,
          gatewayStatus: 'completed',
        },
      });
      if (updated.count !== 1) throw new Error('Paylink invoice changed concurrently');

      await postPaymentEntry(
        payment.tenantId,
        receipt.id,
        amount,
        cashAccount.id,
        receivableAccount.id,
        tx
      );

      await tx.paymentTransaction.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          gatewayStatus: 'completed',
          gatewayRef: paymentRef || providerInvoiceId,
          paidAt: new Date(),
          processedAt: new Date(),
          webhookReceivedAt: new Date(),
          rawPayload: redactedPayload,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: payment.tenantId,
          userId: null,
          action: 'PAYMENT_RECEIVED',
          tableName: 'payment_transactions',
          recordId: payment.id,
          details: `Paylink payment confirmed for invoice ${invoice.id}`,
        },
      });

      return { processed: true, id: payment.id } as const;
    });

    if ('alreadyProcessed' in result) return NextResponse.json({ status: 'already_processed' });
    if ('reviewRequired' in result) return NextResponse.json({ status: 'review_required' });
    return NextResponse.json({ status: 'processed', id: result.id });
  } catch (error: unknown) {
    return NextResponse.json(
      publicError(ErrorCode.INTERNAL_ERROR, 'Paylink webhook failed', error),
      { status: 500 }
    );
  }
}
