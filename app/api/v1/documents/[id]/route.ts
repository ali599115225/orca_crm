import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const { id } = await params;

    const prismaAny = prisma as any;
    const doc = await prismaAny.document.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!doc) {
      return NextResponse.json({ success: false, error: 'الملف غير موجود' }, { status: 404 });
    }

    await prismaAny.document.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'تم حذف الملف' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
