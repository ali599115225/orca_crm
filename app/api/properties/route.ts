import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runWithDatabaseSession,
  TENANT_ROLES,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { rateLimit } from "@/lib/rate-limit";
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

function jsonCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function listingReadiness(unit: any) {
  const checks = {
    priced: Number(unit.priceSar) > 0,
    described: String(unit.description || "").trim().length >= 60,
    media: jsonCount(unit.media) >= 3,
    documents: jsonCount(unit.docs) >= 1,
    location: Boolean(unit.city && unit.district),
    coordinates:
      Number.isFinite(unit.lat) && Number.isFinite(unit.lng),
    virtualTour: Boolean(unit.tourUrl),
  };
  const weights: Record<keyof typeof checks, number> = {
    priced: 15,
    described: 15,
    media: 20,
    documents: 10,
    location: 15,
    coordinates: 10,
    virtualTour: 15,
  };
  const score = (Object.keys(checks) as Array<keyof typeof checks>)
    .filter((key) => checks[key])
    .reduce((sum, key) => sum + weights[key], 0);
  return { score, ready: score >= 75, checks };
}

function formatUnit(unit: any, options?: { newlyCreated?: boolean }) {
  const readiness = listingReadiness(unit);
  const transactionReady = options?.newlyCreated ? false : readiness.ready;
  return {
    id: unit.id,
    sku: unit.unitNumber,
    unitNumber: unit.unitNumber,
    floorPosition: unit.floorPosition,
    price: Number(unit.priceSar),
    priceStr: `${Number(unit.priceSar).toLocaleString()} ر.س`,
    type: unit.type || "—",
    area: unit.area || "—",
    beds: unit.beds,
    city: unit.city,
    district: unit.district,
    lat: unit.lat,
    lng: unit.lng,
    agentName: unit.agentName,
    description: unit.description || "",
    desc: unit.description || "",
    media: Array.isArray(unit.media) ? unit.media : [],
    docs: Array.isArray(unit.docs) ? unit.docs : [],
    events: Array.isArray(unit.events) ? unit.events : [],
    handovers: Array.isArray(unit.handovers) ? unit.handovers : [],
    mediaCount: jsonCount(unit.media),
    documentCount: jsonCount(unit.docs),
    tourType: unit.tourType,
    tourUrl: unit.tourUrl,
    status: unit.status,
    projectId: unit.projectId,
    projectName: unit.project?.name || "—",
    project: unit.project?.name || "—",
    projectCity: unit.project?.city || "—",
    contractId: unit.contract?.id || null,
    financialSettlementId: null,
    contractStatus: unit.contract?.status || null,
    tourCount: unit._count?.tours || 0,
    offerCount: unit._count?.offers || 0,
    opportunityCount: unit._count?.opportunities || 0,
    readiness: {
      ...readiness,
      ready: transactionReady,
    },
    transactionReady,
    createdAt: unit.createdAt.toISOString(),
    updatedAt: unit.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    const limit = await rateLimit(`properties:${session.tenantId}`);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "طلبات كثيرة جداً. حاول لاحقاً.",
          retryAfter: Math.ceil(limit.resetIn / 1000),
        },
        { status: 429 },
      );
    }

    try {
      const { searchParams } = new URL(request.url);
      const search = String(searchParams.get("search") || "")
        .trim()
        .slice(0, 100);
      const status = String(searchParams.get("status") || "").trim();
      const projectId = String(
        searchParams.get("projectId") || "",
      ).trim();

      const where: any = { tenantId: session.tenantId };
      if (status && ALLOWED_STATUS.has(status)) where.status = status;
      if (projectId) where.projectId = projectId;
      if (search) {
        where.OR = [
          { unitNumber: { contains: search, mode: "insensitive" } },
          { type: { contains: search, mode: "insensitive" } },
          { city: { contains: search, mode: "insensitive" } },
          { district: { contains: search, mode: "insensitive" } },
          { project: { name: { contains: search, mode: "insensitive" } } },
        ];
      }

      const [units, projects] = await Promise.all([
        prisma.unit.findMany({
          where,
          include: {
            project: {
              select: { id: true, name: true, city: true, status: true },
            },
            contract: { select: { id: true, status: true } },
            _count: {
              select: { tours: true, offers: true, opportunities: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 300,
        }),
        prisma.project.findMany({
          where: { tenantId: session.tenantId },
          select: {
            id: true,
            name: true,
            city: true,
            status: true,
            unitsTotal: true,
            unitsSold: true,
            unitsBooked: true,
          },
          orderBy: { name: "asc" },
        }),
      ]);

      const rows = units.map(formatUnit);
      const stats = {
        total: rows.length,
        available: rows.filter((row) => row.status === "Available").length,
        held: rows.filter((row) =>
          ["Hold", "Reserved"].includes(row.status),
        ).length,
        soldOrLeased: rows.filter((row) =>
          ["Sold", "Leased"].includes(row.status),
        ).length,
        marketingReady: rows.filter((row) => row.transactionReady).length,
        transactionReady: rows.filter((row) => row.transactionReady).length,
        virtualTours: rows.filter((row) => Boolean(row.tourUrl)).length,
        inventoryValue: rows
          .filter((row) => row.status === "Available")
          .reduce((sum, row) => sum + row.price, 0),
      };

      return NextResponse.json({
        success: true,
        data: rows,
        stats,
        projects,
      });
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
  return runWithDatabaseSession(
    request,
    TENANT_WRITE_ROLES,
    async (session) => {
      try {
        const body = await request.json();
        const projectId = String(body.projectId || "").trim();
        const unitNumber = String(body.unitNumber || "").trim();
        const priceSar = Number(body.priceSar);
        const status = String(body.status || "Available");

        if (!projectId || !unitNumber) {
          return NextResponse.json(
            {
              success: false,
              error: "المشروع ورقم الوحدة مطلوبان.",
            },
            { status: 400 },
          );
        }
        if (!Number.isFinite(priceSar) || priceSar <= 0) {
          return NextResponse.json(
            { success: false, error: "سعر الوحدة غير صالح." },
            { status: 400 },
          );
        }
        if (!ALLOWED_STATUS.has(status)) {
          return NextResponse.json(
            { success: false, error: "حالة الوحدة غير صالحة." },
            { status: 400 },
          );
        }
        if (status === "Sold" || status === "Leased") {
          return NextResponse.json(
            {
              success: false,
              error:
                "حالة الوحدة المباعة أو المؤجرة تُستمد من العقد ولا تسجل عند الإنشاء.",
            },
            { status: 409 },
          );
        }

        const project = await prisma.project.findFirst({
          where: { id: projectId, tenantId: session.tenantId },
          select: { id: true, city: true },
        });
        if (!project) {
          return NextResponse.json(
            { success: false, error: "المشروع غير موجود." },
            { status: 404 },
          );
        }

        const duplicate = await prisma.unit.findFirst({
          where: {
            tenantId: session.tenantId,
            projectId: project.id,
            unitNumber,
          },
          select: { id: true },
        });
        if (duplicate) {
          return NextResponse.json(
            {
              success: false,
              error: "رقم الوحدة مستخدم داخل هذا المشروع.",
            },
            { status: 409 },
          );
        }

        const unit = await prisma.unit.create({
          data: {
            tenantId: session.tenantId,
            projectId: project.id,
            unitNumber,
            floorPosition: Number(body.floorPosition || 0),
            priceSar,
            type: String(body.type || "").trim() || null,
            area: String(body.area || "").trim() || null,
            beds:
              body.beds === "" || body.beds == null
                ? null
                : Number(body.beds),
            city: String(body.city || project.city || "").trim() || null,
            district: String(body.district || "").trim() || null,
            agentName: String(body.agentName || "").trim() || null,
            description: String(body.description || "").trim() || null,
            tourType: String(body.tourType || "").trim() || null,
            tourUrl: String(body.tourUrl || "").trim() || null,
            status,
            media: [],
            docs: [],
          },
          include: {
            project: {
              select: { id: true, name: true, city: true, status: true },
            },
            contract: { select: { id: true, status: true } },
            _count: {
              select: { tours: true, offers: true, opportunities: true },
            },
          },
        });

        await writeAuditLog({
          tenantId: session.tenantId,
          userId: session.userId,
          action: "PROPERTY_UNIT_CREATED",
          tableName: "units",
          recordId: unit.id,
          details: JSON.stringify({
            projectId,
            unitNumber,
            priceSar,
            status,
          }),
        });

        return NextResponse.json(
          { success: true, data: formatUnit(unit, { newlyCreated: true }) },
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
    },
  );
}
