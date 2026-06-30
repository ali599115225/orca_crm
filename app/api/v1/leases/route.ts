import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDatabaseSession, TENANT_ROLES } from "@/lib/api-auth-guard";
import { ErrorCode } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const auth = await requireDatabaseSession(request, TENANT_ROLES);
  if (auth.error) return auth.error;

  try {
    const session = auth.session;
    const leases = await prisma.rentalLease.findMany({
      where: { tenantId: session.tenantId },
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
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "GET /api/v1/leases failed", error, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireDatabaseSession(request, TENANT_ROLES);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { unit, tenant, start, end, rent, deposit } = body;
    if (!unit || !tenant || !start || !end || !rent) {
      return NextResponse.json({ success: false, error: "الحقول unit, tenant, start, end, rent إلزامية" }, { status: 400 });
    }

    const session = auth.session;
    const lease = await prisma.rentalLease.create({
      data: {
        tenantId: session.tenantId,
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
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "POST /api/v1/leases failed", error, 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireDatabaseSession(request, TENANT_ROLES);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { id, status, financialRef } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "معرّف العقد (id) مطلوب" }, { status: 400 });
    }

    const session = auth.session;
    const existing = await prisma.rentalLease.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "العقد غير موجود" }, { status: 404 });
    }

    const updated = await prisma.rentalLease.update({
      where: { id, tenantId: session.tenantId },
      data: {
        status: status ?? undefined,
        financialRef: financialRef ?? undefined,
      },
    });

    return NextResponse.json({ success: true, lease: updated });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "PUT /api/v1/leases failed", error, 500);
  }
}
