import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';
import { writeAuditLog } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { loanParams, contactInfo } = body;

    if (!loanParams || !loanParams.price || loanParams.price <= 0) {
      return NextResponse.json(
        { success: false, error: 'سعر العقار مطلوب ويجب أن يكون أكبر من صفر.' },
        { status: 400 }
      );
    }

    const { price, downPct = 20, term = 25, rate = 4.5 } = loanParams;
    const loanAmount = price * (1 - downPct / 100);
    const months = term * 12;
    const monthlyRate = rate / 100 / 12;
    const installment =
      monthlyRate === 0
        ? Math.round(loanAmount / months)
        : Math.round(
            (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
              (Math.pow(1 + monthlyRate, months) - 1)
          );

    const requestId = `FIN-${Date.now().toString(36).toUpperCase()}`;

    await writeAuditLog({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'LEAD_CREATED',
      tableName: 'units',
      recordId: id,
      details: JSON.stringify({ requestId, type: 'finance_request', loanParams, contactInfo }),
    });

    return NextResponse.json({
      success: true,
      requestId,
      summary: {
        propertyId: id,
        loanAmount,
        estimatedInstallment: installment,
        currency: 'SAR',
        note: 'الحساب تقديري فقط. سيتم التواصل مع الجهة التمويلية المختارة.',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'خطأ داخلي في معالجة طلب التمويل.' },
      { status: 500 }
    );
  }
}
