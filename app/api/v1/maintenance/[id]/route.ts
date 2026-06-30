import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantAndUser } from '@/lib/api-helpers';
import { ErrorCode } from "@/lib/errors";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) return NextResponse.json({ error: 'معرف المنشأة مفقود.' }, { status: 400 });

    const { id } = await params;
    const body = await request.json();
    const data: Record<string, any> = {};

    if (body.status !== undefined) data.status = body.status;
    if (body.assignedTo !== undefined) data.assignedTo = body.assignedTo;
    if (body.estimatedCost !== undefined) data.estimatedCost = body.estimatedCost;
    if (body.actualCost !== undefined) data.actualCost = body.actualCost;
    if (body.scheduledDate !== undefined) data.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
    if (body.completedDate !== undefined) data.completedDate = body.completedDate ? new Date(body.completedDate) : null;

    if (body.status === 'completed') data.completedDate = new Date();

    const ticket = await prisma.maintenanceTicket.update({
      where: { id, tenantId },
      data,
    });

    return NextResponse.json({ success: true, ticket });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "PATCH /api/v1/maintenance/[id] failed", error, 500);
  }
}
