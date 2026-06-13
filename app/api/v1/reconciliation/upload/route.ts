import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { parseCsvStatement, reconcileBankStatement } from '@/lib/accounting/bank-reconciliation';

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

export async function POST(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 });
  }

  const signature = request.headers.get('x-signature') || request.headers.get('X-Signature');
  if (signature) {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: 'WEBHOOK_SECRET not configured' }, { status: 500 });
    }
    const rawBody = await request.clone().text();
    const hmac = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    if (signature !== hmac) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
    }
  }

  try {
    const tenantId = session.tenantId as string;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mode = (formData.get('mode') as string) || 'invoice';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const fileContent = await file.text();

    if (mode === 'bank') {
      const statementLines = parseCsvStatement(fileContent);
      if (statementLines.length === 0) {
        return NextResponse.json({ success: false, error: 'تعذر تحليل كشف الحساب — تأكد من صيغة CSV' }, { status: 400 });
      }

      const result = await reconcileBankStatement(tenantId, statementLines);

      return NextResponse.json({
        success: true,
        mode: 'bank',
        message: `تمت معالجة ${statementLines.length} حركة بنكية — ${result.matches.length} مطابقة`,
        ...result,
      });
    }

    const unpaidInvoices = await prisma.rentalInvoice.findMany({
      where: { tenantId, status: { not: 'paid' } },
      include: { lease: true },
      orderBy: { dueDate: 'asc' },
    });

    const payments = await prisma.paymentTransaction.findMany({
      where: { tenantId, status: 'COMPLETED' },
      orderBy: { paidAt: 'desc' },
      select: { id: true, invoiceId: true, amount: true, paidAt: true, status: true },
      take: 50,
    });

    const matches: any[] = [];
    const exceptions: any[] = [];

    for (const inv of unpaidInvoices) {
      const matchedPayment = payments.find((p) => {
        if (p.invoiceId === inv.id) return true;
        return Math.abs(Number(p.amount) - Number(inv.totalAmount)) < 1;
      });
      if (matchedPayment) {
        matches.push({
          transactionId: matchedPayment.id,
          amount: Number(matchedPayment.amount),
          invoiceId: inv.id,
          confidence: 0.95,
          note: `تمت المطابقة مع ${inv.lease.tenantName}`,
        });
      } else {
        exceptions.push({
          transactionId: `UNMATCHED-${inv.id.slice(0, 8)}`,
          amount: Number(inv.totalAmount),
          note: `فاتورة غير مدفوعة: ${inv.lease.tenantName} - ${inv.lease.unitName}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      mode: 'invoice',
      message: `تمت معالجة ${file.name}`,
      matches,
      exceptions,
    });
  } catch (err: any) {
    console.error('[reconciliation]', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
