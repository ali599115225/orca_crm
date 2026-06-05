// app/api/v1/support/tickets/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveTenant } from '@/lib/tenant';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await getActiveTenant();
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: 'Status is required' }, { status: 400 });
    }

    const ticket = await prisma.ticket.update({
      where: {
        id,
        tenantId: tenant.id
      },
      data: { status }
    });

    return NextResponse.json({ success: true, data: ticket });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
