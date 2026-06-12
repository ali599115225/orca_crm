import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import {
  postPaymentEntry,
  findAccountByCode,
  seedChartOfAccounts,
} from '@/lib/accounting';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 });
  }

  const { id } = await params;
  const idempotencyKey = request.headers.get('idempotency-key') || request.headers.get('Idempotency-Key');

  if (!idempotencyKey) {
    return NextResponse.json({
      success: false,
      error: 'Missing Idempotency-Key header',
    }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { amount, method } = body;

    if (!amount || !method) {
      return NextResponse.json({
        success: false,
        error: 'Missing payment amount or method',
      }, { status: 400 });
    }

    const tenantId = session.tenantId as string;
    await seedChartOfAccounts(tenantId);

    const invoice = await prisma.rentalInvoice.findFirst({
      where: { id, tenantId },
    });
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'الفاتورة غير موجودة' }, { status: 404 });
    }
    if (invoice.status === 'paid') {
      return NextResponse.json({ success: false, error: 'الفاتورة مدفوعة مسبقاً' }, { status: 409 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          tenantId,
          invoiceId: id,
          amount: parseFloat(amount),
          paymentMethod: method,
          status: 'COMPLETED',
          receivedDate: new Date(),
        },
      });

      await tx.rentalInvoice.update({
        where: { id },
        data: {
          status: 'paid',
          paidAt: new Date(),
          paymentMethod: method,
          paymentRef: receipt.id,
        },
      });

      return receipt;
    });

    // ── Audit log for manual payment recording ──
    try {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: (session as any).userId || null,
          action: 'RECORD_PAYMENT',
          tableName: 'rental_invoices',
          recordId: id,
          details: `Manual payment recorded for invoice ${id}, amount: ${amount} SAR, method: ${method}, receipt: ${result.id}`,
        },
      });
    } catch (auditErr) {
      console.error('[audit] Failed to log payment:', auditErr);
    }

    const cashAccount = await findAccountByCode(tenantId, '1.1.1');
    const receivableAccount = await findAccountByCode(tenantId, '1.1.3');

    if (cashAccount && receivableAccount) {
      await postPaymentEntry(
        tenantId,
        result.id,
        parseFloat(amount),
        cashAccount.id,
        receivableAccount.id
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل الدفعة بنجاح',
      idempotencyCached: false,
      payment: {
        id: result.id,
        invoiceId: id,
        amount: parseFloat(amount),
        method,
        date: result.receivedDate.toISOString().split('T')[0],
      },
    });
  } catch (err: any) {
    console.error('[PAY]', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
