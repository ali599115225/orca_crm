import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  forbiddenResponse,
  hasDatabaseRole,
  requireAuth,
  unauthorizedResponse,
} from '@/lib/api-auth-guard';
import {
  ErrorCode,
  publicError,
  statusForErrorCode,
} from '@/lib/errors';
import { redactPiiFromPayload } from '@/lib/privacy-mask';

export const runtime = 'nodejs';

const PROVIDER = 'paylink';
const ALLOWED_PAYLINK_HOSTS = new Set([
  'restpilot.paylink.sa',
  'restapi.paylink.sa',
]);

class ProviderError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = 'ProviderError';
  }
}

function errorResponse(
  code: (typeof ErrorCode)[keyof typeof ErrorCode],
  context: string,
  error?: unknown,
  status = statusForErrorCode(code)
): NextResponse {
  return NextResponse.json(publicError(code, context, error), { status });
}

function providerBaseUrl(): string | null {
  try {
    const url = new URL(
      process.env.PAYLINK_BASE_URL || 'https://restpilot.paylink.sa'
    );
    if (url.protocol !== 'https:' || !ALLOWED_PAYLINK_HOSTS.has(url.host)) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function appBaseUrl(): string | null {
  try {
    const url = new URL(
      process.env.NEXT_PUBLIC_APP_URL || 'https://orca.az-ez.pro'
    );
    if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function providerReference(tenantId: string, invoiceId: string): string {
  return createHash('sha256')
    .update(`${PROVIDER}:create:${tenantId}:${invoiceId}`)
    .digest('hex');
}

async function providerRequest(
  url: string,
  init: RequestInit
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') data = parsed;
  } catch {
    // Provider returned a non-JSON body; do not expose it publicly.
  }
  if (!response.ok) {
    throw new ProviderError(`Paylink HTTP ${response.status}`, 502);
  }
  return data;
}

async function authenticatePaylink(baseUrl: string): Promise<string> {
  const apiId = process.env.PAYLINK_API_ID?.trim() ?? '';
  const secretKey = process.env.PAYLINK_SECRET_KEY?.trim() ?? '';
  if (!apiId || secretKey.length < 16 || secretKey === 'test_secret_key_placeholder') {
    throw new ProviderError('Paylink credentials are unavailable', 503);
  }

  const data = await providerRequest(`${baseUrl}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ apiId, secretKey, persistToken: 'false' }),
  });
  const token = String(data.id_token || data.token || data.access_token || '');
  if (!token) throw new ProviderError('Paylink auth token is missing');
  return token;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse();
  if (!(await hasDatabaseRole(session, ['ADMIN', 'SALES_MANAGER']))) {
    return forbiddenResponse();
  }

  const { id } = await params;
  const tenantId = session.tenantId;
  const baseUrl = providerBaseUrl();
  const appUrl = appBaseUrl();
  if (!baseUrl || !appUrl) {
    return errorResponse(
      ErrorCode.SERVICE_UNAVAILABLE,
      'Paylink URL configuration is invalid'
    );
  }

  const mobile = (process.env.PAYLINK_FALLBACK_MOBILE ?? '').replace(/\D/g, '');
  if (!/^\d{9,15}$/.test(mobile)) {
    return errorResponse(
      ErrorCode.SERVICE_UNAVAILABLE,
      'PAYLINK_FALLBACK_MOBILE is missing or invalid'
    );
  }

  const reference = providerReference(tenantId, id);
  let claimId: string | null = null;

  try {
    const invoice = await prisma.rentalInvoice.findFirst({
      where: { id, tenantId },
      include: {
        lease: { select: { unitName: true, tenantName: true } },
      },
    });

    if (!invoice) return errorResponse(ErrorCode.NOT_FOUND, 'Paylink invoice not found');
    if (invoice.status === 'paid') {
      return errorResponse(ErrorCode.CONFLICT, 'Paylink invoice already paid');
    }

    if (
      invoice.paymentUrl &&
      invoice.gatewayProvider === PROVIDER &&
      invoice.gatewayStatus === 'pending'
    ) {
      return NextResponse.json({
        success: true,
        status: 'existing',
        paymentUrl: invoice.paymentUrl,
      });
    }

    const amount = Number(invoice.totalAmount);
    const expectedAmountMinor = Math.round(amount * 100);
    if (!Number.isFinite(amount) || amount <= 0 || expectedAmountMinor <= 0) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Paylink invoice amount invalid');
    }

    let claim = await prisma.paymentTransaction.findUnique({
      where: {
        provider_providerReference: {
          provider: PROVIDER,
          providerReference: reference,
        },
      },
    });

    if (claim?.paymentUrl && ['PENDING', 'COMPLETED'].includes(claim.status)) {
      return NextResponse.json({
        success: true,
        status: 'existing',
        paymentUrl: claim.paymentUrl,
      });
    }

    if (!claim) {
      try {
        claim = await prisma.paymentTransaction.create({
          data: {
            tenantId,
            invoiceId: id,
            amount,
            netAmount: amount,
            currency: 'SAR',
            method: PROVIDER,
            status: 'INITIATING',
            provider: PROVIDER,
            providerReference: reference,
            idempotencyKey: reference,
            expectedAmountMinor,
            expectedCurrency: 'SAR',
          },
        });
      } catch (error: unknown) {
        const code =
          typeof error === 'object' && error !== null
            ? (error as { code?: unknown }).code
            : null;
        if (code !== 'P2002') throw error;
        claim = await prisma.paymentTransaction.findUnique({
          where: {
            provider_providerReference: {
              provider: PROVIDER,
              providerReference: reference,
            },
          },
        });
      }
    } else {
      claim = await prisma.paymentTransaction.update({
        where: { id: claim.id },
        data: {
          status: 'INITIATING',
          lastError: null,
          expectedAmountMinor,
          expectedCurrency: 'SAR',
        },
      });
    }

    if (!claim) {
      return errorResponse(ErrorCode.CONFLICT, 'Paylink request already in progress');
    }
    claimId = claim.id;

    const token = await authenticatePaylink(baseUrl);
    const orderNumber = `ORCA-${invoice.invoicePrefix || 'INV'}-${invoice.invoiceNumber}`;
    const data = await providerRequest(`${baseUrl}/api/addInvoice`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: expectedAmountMinor,
        currency: 'SAR',
        orderNumber,
        clientName: invoice.lease.tenantName || 'عميل',
        clientMobile: mobile,
        callBackUrl: `${appUrl}/api/payment/callback`,
        cancelUrl: `${appUrl}/operations/rental`,
        products: [
          {
            title: `فاتورة #${invoice.invoiceNumber} — ${invoice.lease.unitName}`,
            price: expectedAmountMinor,
            qty: 1,
          },
        ],
        note: `ORCA invoice ${invoice.invoiceNumber}`,
      }),
    });

    const paymentUrl = String(data.url || data.payment_url || data.checkoutUrl || '');
    const transactionNo = String(
      data.transactionNo || data.transaction_no || data.transactionId || ''
    );
    if (!paymentUrl || !transactionNo) {
      throw new ProviderError('Paylink response is missing required fields');
    }

    await prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.update({
        where: { id: claim!.id },
        data: {
          status: 'PENDING',
          providerTransactionId: transactionNo,
          providerInvoiceId: transactionNo,
          paymentUrl,
          gatewayStatus: String(data.orderStatus || 'Pending'),
          rawPayload: redactPiiFromPayload(data) as never,
        },
      });

      await tx.rentalInvoice.updateMany({
        where: { id, tenantId, status: { not: 'paid' } },
        data: {
          gatewayProvider: PROVIDER,
          gatewayStatus: 'pending',
          paymentUrl,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: session.userId,
          action: 'PAYLINK_LINK_CREATED',
          tableName: 'rental_invoices',
          recordId: id,
          details: `Paylink transaction created: ${transactionNo}`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      status: 'created',
      paymentUrl,
      paylinkTransactionNo: transactionNo,
    });
  } catch (error: unknown) {
    if (claimId) {
      await prisma.paymentTransaction
        .update({
          where: { id: claimId },
          data: { status: 'FAILED', lastError: 'PAYLINK_CREATE_FAILED' },
        })
        .catch(() => undefined);
    }

    const status = error instanceof ProviderError ? error.status : 500;
    const code =
      status === 503 ? ErrorCode.SERVICE_UNAVAILABLE : ErrorCode.PAYMENT_ERROR;
    return errorResponse(code, 'Paylink creation failed', error, status);
  }
}
