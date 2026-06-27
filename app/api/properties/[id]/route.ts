import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { ErrorCode, publicError } from "@/lib/errors";

async function authenticateRequest(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (sessionToken) {
    const payload = await decrypt(sessionToken);
    if (payload && payload.tenantId) return payload;
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = await decrypt(token);
    if (payload && payload.tenantId) return payload;
  }

  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authenticateRequest(_request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const unit = await prisma.unit.findFirst({
      where: { id, project: { tenantId: session.tenantId as string } },
      include: { project: { select: { id: true, name: true } } },
    });

    if (!unit) {
      return NextResponse.json({ success: false, error: "الوحدة غير موجودة" }, { status: 404 });
    }

    const formatted = {
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

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: publicError(ErrorCode.INTERNAL_ERROR, "GET /api/properties/[id] failed", error).messageAr }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.unit.findFirst({
      where: { id, project: { tenantId: session.tenantId as string } },
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
    return NextResponse.json({ success: false, error: publicError(ErrorCode.INTERNAL_ERROR, "PUT /api/properties/[id] failed", error).messageAr }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existing = await prisma.unit.findFirst({
      where: { id, project: { tenantId: session.tenantId as string } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "الوحدة غير موجودة" }, { status: 404 });
    }

    await prisma.unit.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "تم حذف الوحدة" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: publicError(ErrorCode.INTERNAL_ERROR, "DELETE /api/properties/[id] failed", error).messageAr }, { status: 500 });
  }
}
