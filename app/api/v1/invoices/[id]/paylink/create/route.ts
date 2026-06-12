import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';

const PAYLINK_BASE = process.env.PAYLINK_BASE_URL || 'https://restpilot.paylink.sa';
const PAYLINK_SECRET = process.env.PAYLINK_SECRET_KEY || '';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 });
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
        success: true,
        status: 'existing',
        paymentUrl: invoice.paymentUrl,
        message: 'رابط الدفع موجود مسبقاً',
      });
    }

    if (!PAYLINK_SECRET || PAYLINK_SECRET === 'test_secret_key_placeholder') {
      return NextResponse.json({
        success: false,
        error: 'بوابة الدفع Paylink غير مفعلة حالياً',
      }, { status: 503 });
    }

    const idempotencyKey = generateIdempotencyKey();
    const amountHalalas = Math.round(Number(invoice.totalAmount) * 100);

    const paylinkResp = await fetch(`${PAYLINK_BASE}/api/v1/invoice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYLINK_SECRET}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        amount: amountHalalas,
        currency: 'SAR',
        description: `فاتورة #${invoice.invoiceNumber} — ${invoice.lease.unitName}`,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://orca.az-ez.pro'}/api/payment/callback`,
        metadata: { tenantId, invoiceId: id, invoiceNumber: String(invoice.invoiceNumber) },
      }),
    });

    if (!paylinkResp.ok) {
      const errText = await paylinkResp.text();
      console.error('[Paylink] Create failed:', errText);
      return NextResponse.json({ success: false, error: 'فشل إنشاء رابط الدفع' }, { status: 502 });
    }

    const paylinkData = await paylinkResp.json();
    const paymentUrl = paylinkData.url || paylinkData.payment_url || '';
    const paylinkInvoiceId = paylinkData.id || paylinkData.invoice_id || '';
    const paylinkTransactionId = paylinkData.transaction_id || paylinkData.id || '';

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
    console.error('[Paylink Create]', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
