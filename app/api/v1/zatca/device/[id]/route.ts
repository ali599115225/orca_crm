import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDatabaseSession, TENANT_ROLES } from '@/lib/api-auth-guard';
import { ErrorCode } from "@/lib/errors";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDatabaseSession(request, TENANT_ROLES);
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const session = auth.session;
    const device = await prisma.zatcaDevice.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    await prisma.zatcaDevice.delete({ where: { id, tenantId: session.tenantId } });

    return NextResponse.json({ success: true, message: 'Device removed' });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "DELETE /api/v1/zatca/device/[id] failed", error, 500);
  }
}
