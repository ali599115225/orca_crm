// app/api/properties/[id]/schedule-visit/route.ts
import { NextRequest, NextResponse } from 'next/server';

// In-memory visit log (replace with Prisma in production)
const visitLog: Record<string, unknown>[] = [];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userName, phone, datetime } = body;

    if (!userName || typeof userName !== 'string' || userName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'اسم العميل مطلوب ويجب أن يكون أكثر من حرفين.' },
        { status: 400 }
      );
    }
    if (!phone || typeof phone !== 'string' || !/^\d{9,15}$/.test(phone.replace(/\D/g, ''))) {
      return NextResponse.json(
        { success: false, error: 'رقم الهاتف غير صحيح. يجب أن يكون بين 9 و15 رقماً.' },
        { status: 400 }
      );
    }
    if (!datetime || isNaN(Date.parse(datetime))) {
      return NextResponse.json(
        { success: false, error: 'التاريخ والوقت غير صحيحين.' },
        { status: 400 }
      );
    }

    const visitId = `VS-${Date.now().toString(36).toUpperCase()}`;

    const record = {
      visitId,
      propertyId: id,
      userName: userName.trim(),
      phone,
      datetime,
      createdAt: new Date().toISOString(),
      status: 'confirmed',
      audit: {
        action: 'schedule_visit',
        actor: 'client',
        at: new Date().toISOString(),
      }
    };

    visitLog.push(record);

    const reminderPayload = {
      type: 'tour.reminder_queued',
      visitId,
      propertyId: id,
      remindAt: new Date(Date.parse(datetime) - 2 * 60 * 60 * 1000).toISOString(),
      message: `تذكير: لديك جولة على عقار ${id} بتاريخ ${datetime}`
    };

    console.log('[schedule-visit] reminder queued:', reminderPayload);

    return NextResponse.json({
      success: true,
      visitId,
      confirmation: {
        message: 'تم تسجيل حجز الجولة بنجاح.',
        datetime,
        propertyId: id,
        reminder: 'سيصلك تذكير قبل ساعتين من موعد الجولة.'
      }
    });

  } catch (err) {
    console.error('[schedule-visit] error:', err);
    return NextResponse.json(
      { success: false, error: 'خطأ داخلي. يرجى المحاولة لاحقاً.' },
      { status: 500 }
    );
  }
}
