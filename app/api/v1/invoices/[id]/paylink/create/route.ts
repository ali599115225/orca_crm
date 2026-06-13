import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import { redactPiiFromPayload } from '@/lib/privacy-mask';

const PAYLINK_BASE = process.env.PAYLINK_BASE_URL || 'https://restpilot.paylink.sa';
const PAYLINK_API_ID = process.env.PAYLINK_API_ID || '';
const PAYLINK_SECRET_KEY = process.env.PAYLINK_SECRET_KEY || '';

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

function getDiagnostics() {
  return {
    hasBaseUrl: !!PAYLINK_BASE,
    hasApiId: !!(PAYLINK_API_ID && PAYLINK_API_ID.length > 0),
    hasSecretKey: !!(PAYLINK_SECRET_KEY && PAYLINK_SECRET_KEY !== 'test_secret_key_placeholder'),
    baseUrlHost: PAYLINK_BASE ? new URL(PAYLINK_BASE).host : 'not-set',
    authEndpoint: `${PAYLINK_BASE}/api/auth`,
    invoiceEndpoint: `${PAYLINK_BASE}/api/addInvoice`,
  };
}

// ── Step 1: Authenticate with Paylink ──
async function authenticatePaylink(): Promise<{ success: boolean; idToken?: string; error?: string; status?: number }> {
  try {
    const resp = await fetch(`${PAYLINK_BASE}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        apiId: PAYLINK_API_ID,
        secretKey: PAYLINK_SECRET_KEY,
        persistToken: "false",
      }),
    });

    const text = await resp.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch {}

    if (!resp.ok) {
      console.error('[Paylink Auth] Failed:', resp.status, text.substring(0, 300));
      return {
        success: false,
        error: data.message || data.error || data.Message || `Auth HTTP ${resp.status}: ${text.substring(0, 100)}`,
        status: resp.status,
      };
    }

    const idToken = data.id_token || data.token || data.access_token || '';
    if (!idToken) {
      return { success: false, error: 'لم يتم استلام id_token من Paylink', status: 502 };
    }

    return { success: true, idToken };
  } catch (err: any) {
    return { success: false, error: `Auth network error: ${err.message}`, status: 502 };
  }
}

// ── Step 2: Create Paylink invoice ──
async function createPaylinkInvoice(idToken: string, body: Record<string, any>): Promise<{
  success: boolean;
  transactionNo?: string;
  url?: string;
  orderStatus?: string;
  rawResponse?: any;
  error?: string;
  status?: number;
}> {
  try {
    const resp = await fetch(`${PAYLINK_BASE}/api/addInvoice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch {}

    if (!resp.ok) {
      return {
        success: false,
        error: data.message || data.error || `Invoice creation failed with status ${resp.status}`,
        status: resp.status,
      };
    }

    const url = data.url || data.payment_url || data.checkoutUrl || '';
    const transactionNo = data.transactionNo || data.transaction_no || data.transactionId || '';

    return {
      success: true,
      transactionNo,
      url,
      orderStatus: data.orderStatus || 'Pending',
      rawResponse: data,
    };
  } catch (err: any) {
    return { success: false, error: `Invoice network error: ${err.message}`, status: 502 };
  }
}

// ── POST: Create Paylink payment link ──
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

    // Return existing Paylink URL
    if (invoice.paymentUrl && invoice.gatewayProvider === 'paylink' && invoice.gatewayStatus === 'pending') {
      return NextResponse.json({
        success: true, status: 'existing', paymentUrl: invoice.paymentUrl,
        message: 'رابط الدفع موجود مسبقاً',
      });
    }

    // Verify env vars
    if (!PAYLINK_API_ID || !PAYLINK_SECRET_KEY || PAYLINK_SECRET_KEY === 'test_secret_key_placeholder') {
      return NextResponse.json({
        success: false,
        error: 'بوابة الدفع Paylink غير مفعلة — PAYLINK_API_ID أو PAYLINK_SECRET_KEY غير مضبوط',
        diagnostics: getDiagnostics(),
      }, { status: 503 });
    }

    // Step 1: Authenticate
    const authResult = await authenticatePaylink();
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: 'PAYLINK_AUTH_FAILED',
        message: 'فشل المصادقة مع بوابة Paylink — تحقق من صحة PAYLINK_API_ID و PAYLINK_SECRET_KEY',
        providerStatus: authResult.status,
        providerMessage: authResult.error,
        diagnostics: {
          ...getDiagnostics(),
          authStatus: authResult.status,
          authMessage: authResult.error,
        },
      }, { status: 502 });
    }

    const idToken = authResult.idToken!;
    const amountHalalas = Math.round(Number(invoice.totalAmount) * 100);
    const orderNumber = `ORCA-${invoice.invoicePrefix || 'INV'}-${invoice.invoiceNumber}`;

    // Step 2: Create invoice
    const paylinkResult = await createPaylinkInvoice(idToken, {
      amount: amountHalalas,
      currency: 'SAR',
      orderNumber,
      clientName: invoice.lease.tenantName || 'عميل',
      clientMobile: '0500000000', // Paylink requires mobile; fallback
      callBackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://orca.az-ez.pro'}/api/payment/callback`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://orca.az-ez.pro'}/operations/rental`,
      products: [{
        title: `فاتورة #${invoice.invoiceNumber} — ${invoice.lease.unitName}`,
        price: amountHalalas,
        qty: 1,
      }],
      note: `ORCA invoice ${invoice.invoiceNumber} for ${invoice.lease.tenantName}`,
    });

    if (!paylinkResult.success) {
      return NextResponse.json({
        success: false,
        error: 'PAYLINK_CREATE_FAILED',
        message: 'فشل إنشاء الفاتورة في Paylink',
        providerStatus: paylinkResult.status,
        providerMessage: paylinkResult.error,
        diagnostics: getDiagnostics(),
      }, { status: 502 });
    }

    if (!paylinkResult.url) {
      return NextResponse.json({
        success: false,
        error: 'PAYLINK_NO_URL',
        message: 'لم يتم استلام رابط الدفع من Paylink',
        diagnostics: {
          ...getDiagnostics(),
          hasTransactionNo: !!paylinkResult.transactionNo,
          hasUrl: false,
          orderStatus: paylinkResult.orderStatus,
        },
      }, { status: 502 });
    }

    const paymentUrl = paylinkResult.url;
    const transactionNo = paylinkResult.transactionNo;

    // Store on ORCA
    await prisma.rentalInvoice.update({
      where: { id },
      data: { gatewayProvider: 'paylink', gatewayStatus: 'pending', paymentUrl },
    });

    await prisma.paymentTransaction.create({
      data: {
        tenantId, invoiceId: id, amount: Number(invoice.totalAmount),
        fee: 0, netAmount: Number(invoice.totalAmount), currency: 'SAR',
        method: 'paylink', status: 'PENDING', provider: 'paylink',
        providerTransactionId: transactionNo, providerInvoiceId: transactionNo,
        paymentUrl, gatewayStatus: paylinkResult.orderStatus || 'Pending',
        rawPayload: redactPiiFromPayload(paylinkResult.rawResponse || undefined) as any,
      },
    });

    // Audit
    try {
      await prisma.auditLog.create({
        data: {
          tenantId, userId: (session as any).userId || null,
          action: 'PAYLINK_LINK_CREATED', tableName: 'rental_invoices', recordId: id,
          details: `Paylink link created, txn: ${transactionNo}`,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true, status: 'created', paymentUrl, paylinkTransactionNo: transactionNo,
      message: 'تم إنشاء رابط الدفع بنجاح',
    });
  } catch (error: any) {
    console.error('[Paylink] Unexpected:', error.message);
    return NextResponse.json({
      success: false,
      error: 'PAYLINK_INTERNAL_ERROR',
      message: 'حدث خطأ داخلي',
      diagnostics: getDiagnostics(),
    }, { status: 500 });
  }
}
