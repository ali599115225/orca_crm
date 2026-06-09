import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const tenantId = session.tenantId as string;

    const statusCounts = await prisma.rentalInvoice.groupBy({
      by: ['zatcaStatus'],
      where: { tenantId },
      _count: { id: true },
    });

    const queueCounts = await prisma.zatcaQueue.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true },
    });

    const deviceCount = await prisma.zatcaDevice.count({
      where: { tenantId, status: 'ACTIVE' },
    });

    const totalInvoices = await prisma.rentalInvoice.count({ where: { tenantId } });

    const statusMap: Record<string, number> = {
      DRAFT: 0, ISSUED: 0, REPORTED: 0, CLEARED: 0, REJECTED: 0, ERROR: 0,
    };
    for (const s of statusCounts) {
      statusMap[s.zatcaStatus] = s._count.id;
    }

    const queueMap: Record<string, number> = {
      PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0,
    };
    for (const q of queueCounts) {
      queueMap[q.status] = q._count.id;
    }

    return NextResponse.json({
      success: true,
      dashboard: {
        totalInvoices,
        invoiceStatuses: statusMap,
        queueStatuses: queueMap,
        activeDevices: deviceCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
