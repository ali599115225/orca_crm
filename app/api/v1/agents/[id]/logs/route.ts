import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';

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

    const logs = await prisma.agentTelemetryLog.findMany({
      where: { agentId: id, tenantId: session.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, agentId: id, data: logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
