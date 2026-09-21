import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDatabaseSession, TENANT_ROLES, TENANT_WRITE_ROLES } from "@/lib/api-auth-guard";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";
import { writeAuditLog } from "@/lib/audit";

const ALLOWED_STATUS = new Set([
  "Available",
  "Hold",
  "Reserved",
  "Sold",
  "Leased",
  "Maintenance",
]);

function numeric(value: unknown): number | null {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

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
    priceSar: Number(unit.priceSar),
    priceStr: `${Number(unit.priceSar).toLocaleString()} ر.س`,
    status: unit.status,
    desc: unit.description || "",
    description: unit.description || "",
    media: Array.isArray(unit.media) ? unit.media : [],
    docs: Array.isArray(unit.docs) ? unit.docs : [],
    events: Array.isArray(unit.events) ? unit.events : [],
    handovers: Array.isArray(unit.handovers) ? unit.handovers : [],
    tourType: unit.tourType,
    tourUrl: unit.tourUrl,
    project: unit.project?.name || "",
    projectId: unit.projectId,
    contractId: unit.contract?.id || null,
    financialSettlementId: null,
    linkedTours: unit.tours || [],
    linkedOffers: unit.offers || [],
    createdAt: unit.createdAt,
    updatedAt: unit.updatedAt,
  };
}

async function activeLeaseForUnit(tenantId: string, unitId: string) {
  return prisma.rentalLease.findFirst({
    where: {
      tenantId,
      unitId,
      status: { in: ["active", "ACTIVE"] },
    },
    select: { id: true },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireDatabaseSession(request, TENANT_ROLES);
  if (auth.error) return auth.error;
  const session = auth.session;

  try {
    const { id } = await params;
    const unit = await prisma.unit.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        project: { select: { id: true, name: true, city: true } },
        contract: { select: { id: true, status: true } },
        tours: {
          orderBy: { startAt: "desc" },
          take: 10,
          select: {
            id: true,
            startAt: true,
            endAt: true,
            status: true,
            lead: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        offers: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            price: true,
            status: true,
            validUntil: true,
          },
        },
      },
    });

    if (!unit) {
      return NextResponse.json(
        { success: false, error: "الوحدة غير موجودة." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: formatUnit(unit),
    });
  } catch (error: unknown) {
    return httpErrorResponse(
      request,
      ErrorCode.INTERNAL_ERROR,
      "GET /api/properties/[id] failed",
      error,
      500,
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireDatabaseSession(request, TENANT_WRITE_ROLES);
  if (auth.error) return auth.error;
  const session = auth.session;

  try {
    const { id } = await params;
    const body = await request.json();
    const current = await prisma.unit.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { contract: { select: { id: true, status: true } } },
    });

    if (!current) {
      return NextResponse.json(
        { success: false, error: "الوحدة غير موجودة." },
        { status: 404 },
      );
    }

    const nextStatus =
      body.status === undefined
        ? current.status
        : String(body.status || "").trim();

    if (!ALLOWED_STATUS.has(nextStatus)) {
      return NextResponse.json(
        { success: false, error: "حالة الوحدة غير صالحة." },
        { status: 400 },
      );
    }

    const activeLease =
      nextStatus === "Leased" || nextStatus === "Available"
        ? await activeLeaseForUnit(session.tenantId, id)
        : null;

    if (nextStatus === "Sold" && !current.contract) {
      return NextResponse.json(
        {
          success: false,
          error: "حالة مباع تُستمد من عقد البيع ولا تسجل يدويًا.",
        },
        { status: 409 },
      );
    }

    if (nextStatus === "Leased" && !activeLease) {
      return NextResponse.json(
        {
          success: false,
          error: "حالة مؤجرة تُستمد من عقد إيجار نشط ولا تسجل يدويًا.",
        },
        { status: 409 },
      );
    }

    if (
      nextStatus === "Available" &&
      current.contract &&
      !["CANCELLED", "EXPIRED"].includes(current.contract.status)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "لا يمكن إتاحة وحدة مرتبطة بعقد بيع نشط.",
        },
        { status: 409 },
      );
    }

    if (nextStatus === "Available" && activeLease) {
      return NextResponse.json(
        {
          success: false,
          error: "لا يمكن إتاحة وحدة مرتبطة بعقد إيجار نشط.",
        },
        { status: 409 },
      );
    }

    const price =
      body.priceSar === undefined
        ? Number(current.priceSar)
        : Number(body.priceSar);

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { success: false, error: "السعر غير صالح." },
        { status: 400 },
      );
    }

    const tourUrl =
      body.tourUrl === undefined
        ? current.tourUrl
        : String(body.tourUrl || "").trim() || null;

    if (tourUrl) {
      try {
        const parsed = new URL(tourUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("INVALID_PROTOCOL");
        }
      } catch {
        return NextResponse.json(
          { success: false, error: "رابط الجولة الافتراضية غير صالح." },
          { status: 400 },
        );
      }
    }

    const data: any = {
      priceSar: price,
      status: nextStatus,
      tourUrl,
    };

    const stringFields = [
      "type",
      "area",
      "city",
      "district",
      "agentName",
      "description",
      "tourType",
    ];

    for (const field of stringFields) {
      if (body[field] !== undefined) {
        data[field] = String(body[field] || "").trim() || null;
      }
    }

    if (body.floorPosition !== undefined) {
      data.floorPosition = Number(body.floorPosition || 0);
    }
    if (body.beds !== undefined) data.beds = numeric(body.beds);
    if (body.lat !== undefined) data.lat = numeric(body.lat);
    if (body.lng !== undefined) data.lng = numeric(body.lng);
    if (Array.isArray(body.media)) data.media = body.media;
    if (Array.isArray(body.docs)) data.docs = body.docs;

    const updated = await prisma.unit.updateMany({
      where: { id, tenantId: session.tenantId },
      data,
    });

    if (updated.count !== 1) {
      return NextResponse.json(
        { success: false, error: "تعذر تحديث الوحدة." },
        { status: 409 },
      );
    }

    await writeAuditLog({
      tenantId: session.tenantId,
      userId: session.userId,
      action: "PROPERTY_UNIT_UPDATED",
      tableName: "units",
      recordId: id,
      details: JSON.stringify({
        status: { before: current.status, after: nextStatus },
        price: { before: Number(current.priceSar), after: price },
      }),
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error: unknown) {
    return httpErrorResponse(
      request,
      ErrorCode.INTERNAL_ERROR,
      "PUT /api/properties/[id] failed",
      error,
      500,
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireDatabaseSession(request, TENANT_WRITE_ROLES);
  if (auth.error) return auth.error;
  const session = auth.session;

  try {
    const { id } = await params;
    const unit = await prisma.unit.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        contract: { select: { id: true } },
        _count: {
          select: { tours: true, offers: true, opportunities: true },
        },
      },
    });

    if (!unit) {
      return NextResponse.json(
        { success: false, error: "الوحدة غير موجودة." },
        { status: 404 },
      );
    }

    const activeLease = await activeLeaseForUnit(session.tenantId, id);

    if (
      unit.contract ||
      activeLease ||
      unit._count.tours ||
      unit._count.offers ||
      unit._count.opportunities
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "لا يمكن حذف وحدة مرتبطة بعقد أو جولة أو عرض أو فرصة.",
        },
        { status: 409 },
      );
    }

    const deleted = await prisma.unit.deleteMany({
      where: { id, tenantId: session.tenantId },
    });

    if (deleted.count !== 1) {
      return NextResponse.json(
        { success: false, error: "تعذر حذف الوحدة." },
        { status: 409 },
      );
    }

    await writeAuditLog({
      tenantId: session.tenantId,
      userId: session.userId,
      action: "PROPERTY_UNIT_DELETED",
      tableName: "units",
      recordId: id,
      details: "Unlinked unit deleted",
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return httpErrorResponse(
      request,
      ErrorCode.INTERNAL_ERROR,
      "DELETE /api/properties/[id] failed",
      error,
      500,
    );
  }
}
