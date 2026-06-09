import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeNextRetryAt, isExpired } from '@/lib/zatca/queue';
import { submitReporting, submitClearance } from '@/lib/zatca/api';

export async function GET() {
  try {
    const now = new Date();

    const pendingItems = await prisma.zatcaQueue.findMany({
      where: {
        status: { in: ['PENDING', 'RETRYING'] },
        AND: [
          { nextRetryAt: null },
          { OR: [{ nextRetryAt: { lte: now } }] },
        ],
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            invoicePrefix: true,
            zatcaStatus: true,
            invoiceTypeCode: true,
          },
        },
        tenant: {
          select: { id: true },
        },
      },
      take: 10,
    });

    const results: any[] = [];

    for (const item of pendingItems) {
      try {
        if (isExpired(item.retryCount, item.maxRetries)) {
          await prisma.zatcaQueue.update({
            where: { id: item.id },
            data: { status: 'FAILED', lastError: 'Max retries exceeded' },
          });
          results.push({ queueId: item.id, status: 'FAILED', reason: 'max_retries_exceeded' });
          continue;
        }

        await prisma.zatcaQueue.update({
          where: { id: item.id },
          data: { status: 'PROCESSING' },
        });

        const device = await prisma.zatcaDevice.findFirst({
          where: { tenantId: item.tenantId, status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        });

        const payload = item.payload || '';
        let submissionResult;

        if (item.action === 'CLEAR') {
          submissionResult = await submitClearance(payload, device);
        } else {
          submissionResult = await submitReporting(payload, device);
        }

        if (submissionResult.success) {
          const newStatus = item.action === 'CLEAR' ? 'CLEARED' : 'REPORTED';
          await prisma.$transaction([
            prisma.zatcaQueue.update({
              where: { id: item.id },
              data: {
                status: 'COMPLETED',
                response: JSON.stringify(submissionResult.rawResponse || {}),
                completedAt: new Date(),
              },
            }),
            prisma.rentalInvoice.update({
              where: { id: item.invoiceId },
              data: {
                zatcaStatus: newStatus,
                zatcaResponse: JSON.stringify(submissionResult.rawResponse || {}),
                zatcaClearedAt: newStatus === 'CLEARED' ? new Date() : null,
              },
            }),
          ]);
          results.push({ queueId: item.id, status: 'COMPLETED' });
        } else {
          const nextRetry = computeNextRetryAt(item.retryCount + 1);
          await prisma.zatcaQueue.update({
            where: { id: item.id },
            data: {
              status: 'RETRYING',
              retryCount: { increment: 1 },
              nextRetryAt: nextRetry,
              lastError: submissionResult.errors?.join('; ') || 'Unknown error',
            },
          });
          results.push({ queueId: item.id, status: 'RETRYING', nextRetryAt: nextRetry });
        }
      } catch (innerError: any) {
        await prisma.zatcaQueue.update({
          where: { id: item.id },
          data: { status: 'FAILED', lastError: innerError.message },
        });
        results.push({ queueId: item.id, status: 'FAILED', error: innerError.message });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      pendingTotal: await prisma.zatcaQueue.count({ where: { status: { in: ['PENDING', 'RETRYING'] } } }),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
