import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  FINANCE_WRITE_ROLES,
  TENANT_ROLES,
  runWithDatabaseSession,
} from "@/lib/api-auth-guard";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";

function parsePositiveMoney(value: unknown): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
    return null;
  }
  return Math.round(amount * 100) / 100;
}

function parseNonNegativeMoney(value: unknown): number | null {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) {
    return null;
  }
  return Math.round(amount * 100) / 100;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const leases = await prisma.rentalLease.findMany({
        where: { tenantId: session.tenantId },
        include: { _count: { select: { invoices: true } } },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        success: true,
        leases: leases.map((lease) => ({
          id: lease.id,
          unit: lease.unitName,
          tenant: lease.tenantName,
          start: lease.startDate.toISOString().split("T")[0],
          end: lease.endDate.toISOString().split("T")[0],
          rent: Number(lease.rentAmount),
          currency: lease.currency,
          status: lease.status,
          deposit: Number(lease.deposit),
          financialRef: lease.financialRef,
          invoiceCount: lease._count.invoices,
        })),
      });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "GET /api/v1/leases failed",
        error,
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return runWithDatabaseSession(request, FINANCE_WRITE_ROLES, async (session) => {
    try {
      const body = await request.json();
      const unit = typeof body.unit === "string" ? body.unit.trim() : "";
      const tenantName = typeof body.tenant === "string" ? body.tenant.trim() : "";
      const startDate = parseDate(body.start);
      const endDate = parseDate(body.end);
      const rentAmount = parsePositiveMoney(body.rent);
      const deposit = parseNonNegativeMoney(body.deposit);

      if (!unit || !tenantName || !startDate || !endDate || rentAmount === null || deposit === null) {
        return NextResponse.json(
          {
            success: false,
            error: "الحقول unit, tenant, start, end, rent إلزامية ويجب أن تكون صالحة",
          },
          { status: 400 },
        );
      }

      if (endDate <= startDate) {
        return NextResponse.json(
          { success: false, error: "تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية" },
          { status: 400 },
        );
      }

      const lease = await prisma.rentalLease.create({
        data: {
          tenantId: session.tenantId,
          unitName: unit,
          tenantName,
          startDate,
          endDate,
          rentAmount,
          deposit,
          currency: "SAR",
          status: "active",
        },
      });

      return NextResponse.json(
        {
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
        },
        { status: 201 },
      );
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "POST /api/v1/leases failed",
        error,
      );
    }
  });
}

export async function PUT(request: NextRequest) {
  return runWithDatabaseSession(request, FINANCE_WRITE_ROLES, async (session) => {
    try {
      const body = await request.json();
      const id = typeof body.id === "string" ? body.id.trim() : "";
      const status = typeof body.status === "string" ? body.status.trim() : undefined;
      const financialRef =
        typeof body.financialRef === "string" ? body.financialRef.trim() : undefined;

      if (!id) {
        return NextResponse.json(
          { success: false, error: "معرّف العقد (id) مطلوب" },
          { status: 400 },
        );
      }

      const existing = await prisma.rentalLease.findFirst({
        where: { id, tenantId: session.tenantId },
        select: { id: true },
      });

      if (!existing) {
        return NextResponse.json(
          { success: false, error: "العقد غير موجود" },
          { status: 404 },
        );
      }

      const updated = await prisma.rentalLease.update({
        where: { id, tenantId: session.tenantId },
        data: {
          status,
          financialRef,
        },
      });

      return NextResponse.json({ success: true, lease: updated });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "PUT /api/v1/leases failed",
        error,
      );
    }
  });
}
