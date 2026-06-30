import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantAndUser } from '@/lib/api-helpers';
import { Priority } from '@prisma/client';
import { ErrorCode } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) return NextResponse.json({ error: 'معرف المنشأة مفقود.' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const tickets = await prisma.maintenanceTicket.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, tickets });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "GET /api/v1/maintenance failed", error, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId) return NextResponse.json({ error: 'معرف المنشأة مفقود.' }, { status: 400 });

    const body = await request.json();
    const { title, description, unitId, category, priority, reportedBy, estimatedCost } = body;

    if (!title) return NextResponse.json({ error: 'العنوان مطلوب.' }, { status: 400 });

    let priorityEnum: Priority = 'MEDIUM';
    if (priority === 'HIGH') priorityEnum = 'HIGH';
    if (priority === 'LOW') priorityEnum = 'LOW';

    const ticket = await prisma.maintenanceTicket.create({
      data: {
        tenantId,
        title,
        description: description || '',
        unitId: unitId || null,
        category: category || 'other',
        priority: priorityEnum,
        reportedBy: reportedBy || userId || null,
        estimatedCost: estimatedCost || null,
        status: 'pending',
      },
    });

    return NextResponse.json({ success: true, ticket }, { status: 201 });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "POST /api/v1/maintenance failed", error, 500);
  }
}
