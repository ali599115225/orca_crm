import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';

const PAYLINK_BASE = process.env.PAYLINK_BASE_URL || 'https://restpilot.paylink.sa';
const PAYLINK_SECRET = process.env.PAYLINK_SECRET_KEY || '';
const PAYLINK_API_ID = process.env.PAYLINK_API_ID || '';

async function authenticateRequest(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  if (sessionToken) {
    const payload = await decrypt(sessionToken);
    if (payload?.tenantId) return payload;
  }
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = await decrypt(token);
    if (payload?.tenantId) return payload;
  }
  return null;
}

function generateIdempotencyKey(): string {
  return `orca-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ── Debug: safe diagnostics (no secrets) ──
function getDiagnostics() {
  return {
    hasBaseUrl: !!PAYLINK_BASE,
    hasSecretKey: !!(PAYLINK_SECRET && PAYLINK_SECRET !== 'test_secret_key_placeholder'),
    hasApiId: !!PAYLINK_API_ID,
    baseUrlHost: PAYLINK_BASE ? new URL(PAYLINK_BASE).host : 'not-set',
    endpointPath: `${PAYLINK_BASE}/api/v1/invoice`,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = session.tenantId as string;

  try {
    const invoice = await prisma.rentalInvoice.findFirst({
      where: { id, tenantId },
      include: { lease: { select: { unitName: true, tenantName: true } }, tenant: true },
    });
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'الفاتورة غير موجودة' }, { status: 404 });
    }
    if (invoice.status === 'paid') {
      return NextResponse.json({ success: false, error: 'الفاتورة مدفوعة مسبقاً' }, { status: 409 });
    }

    // Return existing Paylink URL if already created
    if (invoice.paymentUrl && invoice.gatewayProvider === 'paylink' && invoice.gatewayStatus === 'pending') {
      return NextResponse.json({
        success: true, status: 'existing', paymentUrl: invoice.paymentUrl,
        message: 'رابط الدفع موجود مسبقاً',
      });
    }

    // ── Check Paylink configuration ──
    if (!PAYLINK_SECRET || PAYLINK_SECRET === 'test_secret_key_placeholder') {
      return NextResponse.json({
        success: false,
        error: 'بوابة الدفع Paylink غير مفعلة حالياً — PAYLINK_SECRET_KEY غير مضبوط',
        diagnostics: getDiagnostics(),
      }, { status: 503 });
    }

    const idempotencyKey = generateIdempotencyKey();
    const amountHalalas = Math.round(Number(invoice.totalAmount) * 100);
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://orca.az-ez.pro'}/api/payment/callback`;

    console.error('[Paylink] Attempting:', getDiagnostics().endpointPath);

    // ── Call Paylink sandbox API ──
    let paylinkResp: Response;
    try {
      paylinkResp = await fetch(`${PAYLINK_BASE}/api/v1/invoice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYLINK_SECRET}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          amount: amountHalalas,
          currency: 'SAR',
          clientName: invoice.lease.tenantName,
          clientMobile: '',
          description: `فاتورة #${invoice.invoiceNumber} — ${invoice.lease.unitName}`,
          note: `ORCA invoice ${invoice.invoiceNumber}`,
          orderNumber: String(invoice.invoiceNumber),
          products: [{
            title: `فاتورة #${invoice.invoiceNumber}`,
            price: amountHalalas,
            qty: 1,
          }],
          callbackUrl: callbackUrl,
          cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://orca.az-ez.pro'}/operations/rental`,
          metadata: { tenantId, invoiceId: id, invoiceNumber: String(invoice.invoiceNumber) },
        }),
      });
    } catch (fetchErr: any) {
      console.error('[Paylink] Network error:', fetchErr.message);
      return NextResponse.json({
        success: false,
        error: 'PAYLINK_NETWORK_ERROR',
        message: 'تعذر الاتصال ببوابة Paylink',
        diagnostics: getDiagnostics(),
      }, { status: 502 });
    }

    // ── Handle Paylink response ──
    const respText = await paylinkResp.text();
    let respData: any = {};
    try { respData = JSON.parse(respText); } catch {}

    if (!paylinkResp.ok) {
      console.error('[Paylink] Rejected:', paylinkResp.status, respText.substring(0, 200));
      return NextResponse.json({
        success: false,
        error: 'PAYLINK_CREATE_FAILED',
        message: 'فشل إنشاء رابط الدفع عبر Paylink',
        providerStatus: paylinkResp.status,
        providerMessage: respData.message || respData.error || respText.substring(0, 100),
        diagnostics: getDiagnostics(),
      }, { status: 502 });
    }

    const paymentUrl = respData.url || respData.payment_url || respData.checkout_url || '';
    const paylinkInvoiceId = respData.id || respData.invoice_id || respData.transaction_id || '';

    if (!paymentUrl) {
      console.error('[Paylink] No URL in response:', Object.keys(respData).join(','));
      return NextResponse.json({
        success: false,
        error: 'PAYLINK_NO_URL',
        message: 'لم يتم استلام رابط الدفع من Paylink',
        diagnostics: getDiagnostics(),
      }, { status: 502 });
    }

    const paylinkTransactionId = respData.transaction_id || respData.id || '';

    await prisma.rentalInvoice.update({
      where: { id },
      data: { gatewayProvider: 'paylink', gatewayStatus: 'pending', paymentUrl },
    });

    await prisma.paymentTransaction.create({
      data: {
        tenantId, invoiceId: id, amount: Number(invoice.totalAmount),
        fee: 0, netAmount: Number(invoice.totalAmount), currency: 'SAR',
        method: 'paylink', status: 'PENDING', provider: 'paylink',
        providerTransactionId: paylinkTransactionId, providerInvoiceId: paylinkInvoiceId,
        paymentUrl, gatewayStatus: 'pending', idempotencyKey,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          tenantId, userId: (session as any).userId || null,
          action: 'PAYLINK_LINK_CREATED', tableName: 'rental_invoices', recordId: id,
          details: `Paylink link created for invoice #${invoice.invoiceNumber}, Paylink: ${paylinkInvoiceId}`,
        },
      });
    } catch (auditErr) {
      console.error('[audit] Paylink log failed:', auditErr);
    }

    return NextResponse.json({
      success: true, status: 'created', paymentUrl, paylinkInvoiceId, paylinkTransactionId,
      message: 'تم إنشاء رابط الدفع بنجاح',
    });
  } catch (error: any) {
    console.error('[Paylink Create] Unexpected:', error.message);
    return NextResponse.json({
      success: false,
      error: 'PAYLINK_INTERNAL_ERROR',
      message: 'حدث خطأ داخلي أثناء إنشاء رابط الدفع',
      diagnostics: getDiagnostics(),
    }, { status: 500 });
  }
}
