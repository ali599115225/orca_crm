import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";

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

function formatUnit(unit: any) {
  return {
    id: unit.id,
    sku: unit.unitNumber,
    unitNumber: unit.unitNumber,
    floorPosition: unit.floorPosition,
    type: unit.type || "شقة سكنية",
    area: unit.area || "120 م²",
    price: Number(unit.priceSar),
    priceStr: Number(unit.priceSar).toLocaleString() + " ر.س",
    status: unit.status,
    desc: unit.description || "",
    media: unit.media || [],
    docs: unit.docs || [],
    events: unit.events || [],
    handovers: unit.handovers || [],
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, unitNumber, floorPosition, priceSar, type, area, description, media, docs, events, handovers, status } = body;

    if (!projectId || !unitNumber || !priceSar) {
      return NextResponse.json({ success: false, error: "حقل projectId, unitNumber, priceSar إلزامية" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId: session.tenantId },
    });
    if (!project) {
      return NextResponse.json({ success: false, error: "المشروع غير موجود أو لا ينتمي لشركتك" }, { status: 404 });
    }

    const newUnit = await prisma.unit.create({
      data: {
        projectId,
        unitNumber,
        floorPosition: floorPosition || 0,
        priceSar: parseFloat(priceSar),
        type: type || "شقة سكنية",
        area: area || "120 م²",
        description: description || null,
        media: media || [],
        docs: docs || [],
        events: events || [],
        handovers: handovers || [],
        status: status || "Available",
      },
      include: { project: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, data: formatUnit(newUnit) }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
