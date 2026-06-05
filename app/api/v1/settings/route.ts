// app/api/v1/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveTenant } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  try {
    const tenant = await getActiveTenant();
    const dbTenant = await prisma.tenant.findUnique({
      where: { id: tenant.id },
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
      }
    });

    return NextResponse.json({ success: true, data: dbTenant });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenant = await getActiveTenant();
    const body = await request.json();
    const { commercialRegistry, vatNumber, nationalAddress, companyName } = body;

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        commercialRegistry: commercialRegistry !== undefined ? commercialRegistry : undefined,
        vatNumber: vatNumber !== undefined ? vatNumber : undefined,
        nationalAddress: nationalAddress !== undefined ? nationalAddress : undefined,
        companyName: companyName !== undefined ? companyName : undefined,
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
