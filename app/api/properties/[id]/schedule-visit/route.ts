import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';
import { writeAuditLog } from '@/lib/audit';
import {
  enforceProgressiveAuthorization,
  isEnforcementDomainEnabled,
} from '@/lib/authz/enforcement';

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
    const tenantId = typeof session.tenantId === 'string' ? session.tenantId : '';
    const userId = typeof session.userId === 'string' ? session.userId : '';
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    if (!userId && isEnforcementDomainEnabled('sales')) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالصلاحية' }, { status: 403 });
    }

    if (userId) {
      const access = await enforceProgressiveAuthorization(
        {
          tenantId,
          userId,
          role: typeof session.role === 'string' ? session.role : '',
        },
        true,
        {
          domain: 'sales',
          permissionKey: 'properties.schedule-visit',
          source: 'POST:/api/properties/:id/schedule-visit',
          requestId: request.headers.get('x-request-id'),
          resource: {
            tenantId,
            resourceType: 'Unit',
            resourceId: id,
          },
        },
      );
      if (!access.effectiveAllowed) {
        return NextResponse.json({ success: false, error: 'غير مصرح بالصلاحية' }, { status: 403 });
      }
    }

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
        { success: false, error: 'رقم الهاتف غير صحيح.' },
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

    await writeAuditLog({
      tenantId,
      userId: userId || null,
      action: 'LEAD_CREATED',
      tableName: 'units',
      recordId: id,
      details: JSON.stringify({ visitId, userName: userName.trim(), phone, datetime, type: 'schedule_visit' }),
    });

    return NextResponse.json({
      success: true,
      visitId,
      confirmation: {
        message: 'تم تسجيل حجز الجولة بنجاح.',
        datetime,
        propertyId: id,
        reminder: 'سيصلك تذكير قبل ساعتين من موعد الجولة.',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'خطأ داخلي. يرجى المحاولة لاحقاً.' },
      { status: 500 }
    );
  }
}
