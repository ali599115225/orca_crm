import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';
import { ErrorCode } from "@/lib/errors";

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
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "DELETE /api/v1/zatca/device/[id] failed", error, 500);
  }
}
