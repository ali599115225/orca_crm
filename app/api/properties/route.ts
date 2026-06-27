import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { tenantContext } from "@/lib/tenant-context";
import { ErrorCode, publicError } from "@/lib/errors";

async function authenticateRequest(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (sessionToken) {
    const payload = await decrypt(sessionToken);
    if (payload && payload.tenantId) {
      tenantContext.enterWith({ tenantId: payload.tenantId as string, userId: (payload.userId as string) || undefined });
      return payload;
    }
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = await decrypt(token);
    if (payload && payload.tenantId) {
      tenantContext.enterWith({ tenantId: payload.tenantId as string, userId: (payload.userId as string) || undefined });
      return payload;
    }
  }

  return null;
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
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

    const rl = await rateLimit(`properties:${session.tenantId}`);
    if (!rl.allowed) {
    return NextResponse.json({ error: "طلبات كثيرة جداً. حاول لاحقاً.", retryAfter: Math.ceil(rl.resetIn / 1000) }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const projectId = searchParams.get("projectId") || "";

    const where: any = { tenantId: session.tenantId as string };

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
        (u) =>
          u.sku.toLowerCase().includes(q) ||
          u.type.toLowerCase().includes(q) ||
          u.project.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: publicError(ErrorCode.INTERNAL_ERROR, "GET /api/properties failed", error).messageAr }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, unitNumber, floorPosition, priceSar, type, area, beds, city, district, lat, lng, agentName, description, media, docs, events, handovers, tourType, tourUrl, status } = body;

    if (!projectId || !unitNumber || !priceSar) {
      return NextResponse.json({ success: false, error: "حقل projectId, unitNumber, priceSar إلزامية" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId: session.tenantId as string },
    });
    if (!project) {
      return NextResponse.json({ success: false, error: "المشروع غير موجود أو لا ينتمي لشركتك" }, { status: 404 });
    }

    const newUnit = await prisma.unit.create({
      data: {
        tenantId: session.tenantId as string,
        projectId,
        unitNumber,
        floorPosition: floorPosition || 0,
        priceSar: parseFloat(priceSar),
        type: type || "شقة سكنية",
        area: area || "120 م²",
        beds: beds || null,
        city: city || null,
        district: district || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
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

    return NextResponse.json({ success: true, data: formatUnit(newUnit) }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: publicError(ErrorCode.INTERNAL_ERROR, "POST /api/properties failed", error).messageAr }, { status: 500 });
  }
}
