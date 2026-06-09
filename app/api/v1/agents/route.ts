import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const agents = await prisma.agentSlot.findMany({
      where: { tenantId: session.tenantId },
      select: {
        id: true,
        agentType: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: agents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
