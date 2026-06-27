import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';
import { ErrorCode, publicError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const { id } = await params;

    const lease = await prisma.rentalLease.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        invoices: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!lease) {
      return NextResponse.json({ success: false, error: 'عقد الإيجار غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: lease });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: publicError(ErrorCode.INTERNAL_ERROR, "GET /api/v1/leases/[id] failed", error).messageAr }, { status: 500 });
  }
}
