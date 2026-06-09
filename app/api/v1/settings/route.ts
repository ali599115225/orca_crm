import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const dbTenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: {
        id: true,
        companyName: true,
        subdomain: true,
        subscriptionPlan: true,
        commercialRegistry: true,
        vatNumber: true,
        nationalAddress: true,
        whatsappConnected: true,
        extraAgents: true,
      },
    });

    return NextResponse.json({ success: true, data: dbTenant });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const body = await request.json();
    const { commercialRegistry, vatNumber, nationalAddress, companyName } = body;

    const updated = await prisma.tenant.update({
      where: { id: session.tenantId },
      data: {
        ...(commercialRegistry !== undefined && { commercialRegistry }),
        ...(vatNumber !== undefined && { vatNumber }),
        ...(nationalAddress !== undefined && { nationalAddress }),
        ...(companyName !== undefined && { companyName }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
