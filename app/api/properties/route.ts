import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runWithDatabaseSession,
  TENANT_ROLES,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { rateLimit } from "@/lib/rate-limit";
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

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    const rl = await rateLimit(`properties:${session.tenantId}`);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "طلبات كثيرة جداً. حاول لاحقاً.",
          retryAfter: Math.ceil(rl.resetIn / 1000),
        },
        { status: 429 },
      );
    }

    try {
      const { searchParams } = new URL(request.url);
      const search = searchParams.get("search") || "";
      const status = searchParams.get("status") || "";
      const projectId = searchParams.get("projectId") || "";

      const where: any = { tenantId: session.tenantId };

      if (status) where.status = status;
      if (projectId) where.projectId = projectId;

      const units = await prisma.unit.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      let list = units.map(formatUnit);

      if (search) {
        const q = search.toLowerCase();
        list = list.filter(
          (unit) =>
            unit.sku.toLowerCase().includes(q) ||
            unit.type.toLowerCase().includes(q) ||
            unit.project.toLowerCase().includes(q),
        );
      }

      return NextResponse.json({ success: true, data: list });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "GET /api/properties failed",
        error,
        500,
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_WRITE_ROLES, async (session) => {
    try {
      const body = await request.json();
      const {
        projectId,
        unitNumber,
        floorPosition,
        priceSar,
        type,
        area,
        beds,
        city,
        district,
        lat,
        lng,
        agentName,
        description,
        media,
        docs,
        events,
        handovers,
        tourType,
        tourUrl,
        status,
      } = body;

      if (!projectId || !unitNumber || !priceSar) {
        return NextResponse.json(
          {
            success: false,
            error: "حقل projectId, unitNumber, priceSar إلزامية",
          },
          { status: 400 },
        );
      }

      const project = await prisma.project.findFirst({
        where: { id: projectId, tenantId: session.tenantId },
        select: { id: true },
      });
      if (!project) {
        return NextResponse.json(
          {
            success: false,
            error: "المشروع غير موجود أو لا ينتمي لشركتك",
          },
          { status: 404 },
        );
      }

      const parsedPrice = Number(priceSar);
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        return NextResponse.json(
          { success: false, error: "سعر الوحدة غير صالح." },
          { status: 400 },
        );
      }

      const newUnit = await prisma.unit.create({
        data: {
          tenantId: session.tenantId,
          projectId: project.id,
          unitNumber,
          floorPosition: floorPosition || 0,
          priceSar: parsedPrice,
          type: type || "شقة سكنية",
          area: area || "120 م²",
          beds: beds || null,
          city: city || null,
          district: district || null,
          lat: lat ? Number(lat) : null,
          lng: lng ? Number(lng) : null,
          agentName: agentName || null,
          description: description || null,
          media: media || [],
          docs: docs || [],
          events: events || [],
          handovers: handovers || [],
          tourType: tourType || null,
          tourUrl: tourUrl || null,
          status: status || "Available",
        },
        include: { project: { select: { id: true, name: true } } },
      });

      return NextResponse.json(
        { success: true, data: formatUnit(newUnit) },
        { status: 201 },
      );
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "POST /api/properties failed",
        error,
        500,
      );
    }
  });
}
