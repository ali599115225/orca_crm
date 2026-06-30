import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';
import { ErrorCode } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    const where: any = { tenantId: session.tenantId as string };
    if (status) where.status = status;

    const queueItems = await prisma.zatcaQueue.findMany({
      where,
      include: {
        invoice: {
          select: { invoiceNumber: true, invoicePrefix: true, zatcaUuid: true, zatcaStatus: true, totalAmount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, queue: queueItems });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "GET /api/v1/zatca/queue failed", error, 500);
  }
}
