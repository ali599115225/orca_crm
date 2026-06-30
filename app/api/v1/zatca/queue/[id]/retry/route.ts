import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';
import { isRetryable, isExpired } from '@/lib/zatca/queue';
import { ErrorCode } from "@/lib/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authenticateRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const queueItem = await prisma.zatcaQueue.findFirst({
      where: { id, tenantId: session.tenantId as string },
    });

    if (!queueItem) return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });

    if (!isRetryable(queueItem.status)) {
      return NextResponse.json({ error: 'Queue item is not retryable' }, { status: 400 });
    }

    if (isExpired(queueItem.retryCount, queueItem.maxRetries)) {
      return NextResponse.json({ error: 'Max retries exceeded' }, { status: 400 });
    }

    await prisma.zatcaQueue.update({
      where: { id },
      data: {
        status: 'PENDING',
        retryCount: { increment: 1 },
        nextRetryAt: new Date(Date.now() + 5000),
      },
    });

    return NextResponse.json({ success: true, message: 'Queue item queued for retry' });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "POST /api/v1/zatca/queue/[id]/retry failed", error, 500);
  }
}
