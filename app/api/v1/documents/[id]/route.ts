import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';
import { ErrorCode } from "@/lib/errors";

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

    const deleted = await prismaAny.document.deleteMany({
      where: { id, tenantId: session.tenantId },
    });
    if (deleted.count !== 1) {
      return NextResponse.json({ success: false, error: 'الملف غير موجود' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'تم حذف الملف' });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "DELETE /api/v1/documents/[id] failed", error, 500);
  }
}
