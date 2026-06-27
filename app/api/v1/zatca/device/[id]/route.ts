import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';
import { ErrorCode, publicError } from "@/lib/errors";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authenticateRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const device = await prisma.zatcaDevice.findFirst({
      where: { id, tenantId: session.tenantId as string },
    });

    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    await prisma.zatcaDevice.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Device removed' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: publicError(ErrorCode.INTERNAL_ERROR, "DELETE /api/v1/zatca/device/[id] failed", error).messageAr }, { status: 500 });
  }
}
