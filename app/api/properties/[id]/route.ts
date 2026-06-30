import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDatabaseSession, TENANT_ROLES } from "@/lib/api-auth-guard";
import { ErrorCode } from "@/lib/errors";

function formatUnit(unit: any) {
  return {
    id: unit.id,
    sku: unit.unitNumber,
    unitNumber: unit.unitNumber,
    floorPosition: unit.floorPosition,
    type: unit.type || "شقة سكنية",
    area: unit.area || "120 م²",
    beds: unit.beds,
    city: unit.city,
    district: unit.district,
    lat: unit.lat,
    lng: unit.lng,
    agentName: unit.agentName,
    price: Number(unit.priceSar),
    priceStr: Number(unit.priceSar).toLocaleString() + " ر.س",
    status: unit.status,
    desc: unit.description || "",
    media: unit.media || [],
    docs: unit.docs || [],
    events: unit.events || [],
    handovers: unit.handovers || [],
    tourType: unit.tourType,
    tourUrl: unit.tourUrl,
    project: unit.project?.name || "",
    projectId: unit.projectId,
    contractId: null as string | null,
    financialSettlementId: null as string | null,
    createdAt: unit.createdAt,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireDatabaseSession(_request, TENANT_ROLES);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const session = auth.session;
    const unit = await prisma.unit.findFirst({
      where: { id, project: { tenantId: session.tenantId } },
      include: { project: { select: { id: true, name: true } } },
    });

    if (!unit) {
      return NextResponse.json({ success: false, error: "الوحدة غير موجودة" }, { status: 404 });
    }

    const formatted = formatUnit(unit);

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    return httpErrorResponse(_request, ErrorCode.INTERNAL_ERROR, "GET /api/properties/[id] failed", error, 500);
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

    const session = auth.session;
    const existing = await prisma.unit.findFirst({
      where: { id, project: { tenantId: session.tenantId } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "الوحدة غير موجودة أو لا تملك صلاحية الوصول" }, { status: 404 });
    }

    const updateData: any = {};
    if (body.unitNumber !== undefined) updateData.unitNumber = body.unitNumber;
    if (body.floorPosition !== undefined) updateData.floorPosition = body.floorPosition;
    if (body.priceSar !== undefined) updateData.priceSar = parseFloat(body.priceSar);
    if (body.type !== undefined) updateData.type = body.type;
    if (body.area !== undefined) updateData.area = body.area;
    if (body.beds !== undefined) updateData.beds = body.beds;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.district !== undefined) updateData.district = body.district;
    if (body.lat !== undefined) updateData.lat = parseFloat(body.lat);
    if (body.lng !== undefined) updateData.lng = parseFloat(body.lng);
    if (body.agentName !== undefined) updateData.agentName = body.agentName;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.media !== undefined) updateData.media = body.media;
    if (body.docs !== undefined) updateData.docs = body.docs;
    if (body.events !== undefined) updateData.events = body.events;
    if (body.handovers !== undefined) updateData.handovers = body.handovers;
    if (body.tourType !== undefined) updateData.tourType = body.tourType;
    if (body.tourUrl !== undefined) updateData.tourUrl = body.tourUrl;
    if (body.status !== undefined) updateData.status = body.status;

    const updated = await prisma.unit.update({
      where: { id },
      data: updateData,
      include: { project: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "PUT /api/properties/[id] failed", error, 500);
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
    const existing = await prisma.unit.findFirst({
      where: { id, project: { tenantId: session.tenantId } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "الوحدة غير موجودة" }, { status: 404 });
    }

    await prisma.unit.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "تم حذف الوحدة" });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "DELETE /api/properties/[id] failed", error, 500);
  }
}
