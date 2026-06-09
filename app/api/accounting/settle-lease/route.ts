import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import {
  postInvoiceEntry,
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

export async function POST(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { leaseId, amount } = body;

    if (!leaseId || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Missing leaseId or amount for accounting settlement',
      }, { status: 400 });
    }

    const tenantId = session.tenantId as string;
    await seedChartOfAccounts(tenantId);

    const lease = await prisma.rentalLease.findFirst({
      where: { id: leaseId, tenantId },
    });
    if (!lease) {
      return NextResponse.json({ success: false, error: 'عقد الإيجار غير موجود' }, { status: 404 });
    }

    const vatRate = 15.00;
    const subtotal = parseFloat(amount);
    const vatAmount = Math.round(subtotal * vatRate) / 100;
    const totalAmount = subtotal + vatAmount;

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.update({
        where: { id: tenantId },
        data: { nextInvoiceNumber: { increment: 1 } },
      });
      const invoiceNumber = tenant.nextInvoiceNumber - 1;

      const invoice = await tx.rentalInvoice.create({
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
      return invoice;
    });

    const receivableAccount = await findAccountByCode(tenantId, '1.1.3');
    const revenueAccount = await findAccountByCode(tenantId, '4.1');
    const vatPayableAccount = await findAccountByCode(tenantId, '2.1.1');

    if (receivableAccount && revenueAccount) {
      await postInvoiceEntry(
        tenantId,
        result.id,
        subtotal,
        vatAmount,
        totalAmount,
        receivableAccount.id,
        revenueAccount.id,
        vatPayableAccount?.id || ''
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تمت تسوية عقد الإيجار في دفتر الأستاذ',
      settlement: {
        id: result.id,
        leaseId,
        gross: subtotal,
        vat: vatAmount,
        net: totalAmount,
        status: 'completed',
        ledgerRef: `GL-SETTLE-${result.invoiceNumber}`,
      },
    });
  } catch (err: any) {
    console.error('[settle-lease]', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
