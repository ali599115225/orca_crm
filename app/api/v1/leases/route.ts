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
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = await decrypt(token);
    if (payload && payload.tenantId) return payload;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const leases = await prisma.rentalLease.findMany({
      where: { tenantId: session.tenantId as string },
      include: { _count: { select: { invoices: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      leases: leases.map((l) => ({
        id: l.id,
        unit: l.unitName,
        tenant: l.tenantName,
        start: l.startDate.toISOString().split("T")[0],
        end: l.endDate.toISOString().split("T")[0],
        rent: Number(l.rentAmount),
        currency: l.currency,
        status: l.status,
        deposit: Number(l.deposit),
        financialRef: l.financialRef,
        invoiceCount: l._count.invoices,
      })),
    });
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
    const { unit, tenant, start, end, rent, deposit } = body;
    if (!unit || !tenant || !start || !end || !rent) {
      return NextResponse.json({ success: false, error: "الحقول unit, tenant, start, end, rent إلزامية" }, { status: 400 });
    }

    const lease = await prisma.rentalLease.create({
      data: {
        tenantId: session.tenantId as string,
        unitName: unit,
        tenantName: tenant,
        startDate: new Date(start),
        endDate: new Date(end),
        rentAmount: parseFloat(rent),
        deposit: deposit ? parseFloat(deposit) : 0,
        currency: "SAR",
        status: "active",
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم تسجيل عقد الإيجار",
      lease: {
        id: lease.id,
        unit: lease.unitName,
        tenant: lease.tenantName,
        start: lease.startDate.toISOString().split("T")[0],
        end: lease.endDate.toISOString().split("T")[0],
        rent: Number(lease.rentAmount),
        currency: lease.currency,
        status: lease.status,
        deposit: Number(lease.deposit),
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status, financialRef } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "معرّف العقد (id) مطلوب" }, { status: 400 });
    }

    const existing = await prisma.rentalLease.findFirst({ where: { id, tenantId: session.tenantId as string } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "العقد غير موجود" }, { status: 404 });
    }

    const updated = await prisma.rentalLease.update({
      where: { id },
      data: {
        status: status ?? undefined,
        financialRef: financialRef ?? undefined,
      },
    });

    return NextResponse.json({ success: true, lease: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
