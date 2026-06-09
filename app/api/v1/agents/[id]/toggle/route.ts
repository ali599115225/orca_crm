import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';

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
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isActive must be boolean' },
        { status: 400 }
      );
    }

    const agent = await prisma.agentSlot.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!agent) {
      return NextResponse.json({ success: false, error: 'الوكيل غير موجود' }, { status: 404 });
    }

    await prisma.agentSlot.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json({
      success: true,
      agentId: id,
      isActive,
      message: isActive ? 'تم تفعيل الوكيل بنجاح.' : 'تم إيقاف الوكيل.',
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'خطأ داخلي.' }, { status: 500 });
  }
}
