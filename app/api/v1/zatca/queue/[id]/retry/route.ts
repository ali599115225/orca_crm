import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDatabaseSession, TENANT_ROLES } from '@/lib/api-auth-guard';
import { isRetryable, isExpired } from '@/lib/zatca/queue';
import { ErrorCode } from "@/lib/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDatabaseSession(request, TENANT_ROLES);
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const session = auth.session;
    const queueItem = await prisma.zatcaQueue.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!queueItem) return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });

    if (!isRetryable(queueItem.status)) {
      return NextResponse.json({ error: 'Queue item is not retryable' }, { status: 400 });
    }

    if (isExpired(queueItem.retryCount, queueItem.maxRetries)) {
      return NextResponse.json({ error: 'Max retries exceeded' }, { status: 400 });
    }

    await prisma.zatcaQueue.update({
      where: { id, tenantId: session.tenantId },
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
