// app/api/properties/[id]/request-finance/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, loanParams, contactInfo } = body;

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

    console.log('[request-finance] Request logged:', {
      requestId,
      propertyId: id,
      userId,
      installment,
      contactInfo
    });

    return NextResponse.json({
      success: true,
      requestId,
      summary: {
        propertyId: id,
        loanAmount,
        estimatedInstallment: installment,
        currency: 'SAR',
        note: 'الحساب تقديري فقط ويعتمد على معطيات التمويل المدخلة. سيتم التواصل مع الجهة التمويلية المختارة.'
      }
    });

  } catch (err) {
    console.error('[request-finance] error:', err);
    return NextResponse.json(
      { success: false, error: 'خطأ داخلي في معالجة طلب التمويل.' },
      { status: 500 }
    );
  }
}
