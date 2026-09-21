import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDatabaseSession, TENANT_ROLES } from "@/lib/api-auth-guard";
import { ErrorCode } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireDatabaseSession(_request, TENANT_ROLES);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const session = auth.session;
    const project = await prisma.project.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        _count: { select: { leads: true, units: true } },
        units: {
          select: { id: true, unitNumber: true, status: true, priceSar: true, type: true, area: true }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ success: false, error: "المشروع غير موجود" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...project,
        minPrice: project.minPrice ? Number(project.minPrice) : null,
        maxPrice: project.maxPrice ? Number(project.maxPrice) : null,
      }
    });
  } catch (error: any) {
    return httpErrorResponse(_request, ErrorCode.INTERNAL_ERROR, "GET /api/projects/[id] failed", error, 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireDatabaseSession(request, TENANT_ROLES);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, city, status, unitsTotal, unitsSold, unitsBooked, minPrice, maxPrice } = body;

    const session = auth.session;
    const existing = await prisma.project.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "المشروع غير موجود أو لا تملك صلاحية الوصول" }, { status: 404 });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        name: name ?? undefined,
        city: city ?? undefined,
        status: status ?? undefined,
        unitsTotal: unitsTotal !== undefined ? parseInt(unitsTotal) : undefined,
        unitsSold: unitsSold !== undefined ? parseInt(unitsSold) : undefined,
        unitsBooked: unitsBooked !== undefined ? parseInt(unitsBooked) : undefined,
        minPrice: minPrice !== undefined ? (minPrice ? parseFloat(minPrice) : null) : undefined,
        maxPrice: maxPrice !== undefined ? (maxPrice ? parseFloat(maxPrice) : null) : undefined,
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "PUT /api/projects/[id] failed", error, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireDatabaseSession(request, TENANT_ROLES);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const session = auth.session;
    const existing = await prisma.project.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "المشروع غير موجود أو لا تملك صلاحية حذفه" }, { status: 404 });
    }

    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "تم حذف المشروع" });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "DELETE /api/projects/[id] failed", error, 500);
  }
}
