import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateVat, validateVatInput } from "@/lib/vat/engine";
import type { VatType } from "@/lib/vat/types";
import {
  buildQrPayload,
  encodeQrCode,
  generateQrImage,
  formatInvoiceLabel,
} from "@/lib/zatca/qr";
import { ErrorCode } from "@/lib/errors";
import { EXEC_003_DATABASE_ROLES } from "@/lib/auth/exec-003-permission-assignments";
import { runWithExec003CookiePermission } from "@/lib/auth/exec-003-shared-guard";

function parseDueDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithExec003CookiePermission(
    request,
    EXEC_003_DATABASE_ROLES,
    "leases.invoices.create",
    async (session) => {
      const { id: leaseId } = await params;

      try {
        const body = await request.json();
        const { subtotal, vatType, dueDate } = body;
        const subtotalNum = Number(subtotal);
        const normalizedVatType =
          typeof vatType === "string" ? vatType.trim().toUpperCase() : "";
        const parsedDueDate = parseDueDate(dueDate);

        if (!parsedDueDate) {
          return NextResponse.json(
            { success: false, error: "Invalid due date" },
            { status: 400 },
          );
        }

        const lease = await prisma.rentalLease.findFirst({
          where: { id: leaseId, tenantId: session.tenantId },
          include: { tenant: true },
        });
        if (!lease) {
          return NextResponse.json(
            { success: false, error: "Lease not found" },
            { status: 404 },
          );
        }

        if (!normalizedVatType) {
          return NextResponse.json(
            {
              success: false,
              error: "subtotal, vatType and dueDate are required",
            },
            { status: 400 },
          );
        }

        const vatValidationError = validateVatInput(
          subtotalNum,
          normalizedVatType,
        );
        if (vatValidationError) {
          return NextResponse.json(
            { success: false, error: vatValidationError },
            { status: 400 },
          );
        }

        const tenant = lease.tenant;
        const vatBreakdown = calculateVat(
          subtotalNum,
          normalizedVatType as VatType,
        );

        const qrPayload = buildQrPayload({
          sellerName: tenant.companyName,
          vatNumber: tenant.vatNumber || "",
          total: vatBreakdown.totalAmount,
          vatTotal: vatBreakdown.vatAmount,
        });
        const qrCode = encodeQrCode(qrPayload);
        const qrImage = await generateQrImage(qrCode);

        const result = await prisma.$transaction(async (tx) => {
          const counter = await tx.tenant.update({
            where: { id: tenant.id },
            data: { nextInvoiceNumber: { increment: 1 } },
          });
          const invoiceNumber = counter.nextInvoiceNumber - 1;

          const invoice = await tx.invoice.create({
            data: {
              tenantId: session.tenantId,
              leaseId,
              invoiceNumber,
              invoicePrefix: tenant.invoicePrefix || "INV",
              dueDate: parsedDueDate,
              subtotal: vatBreakdown.subtotal,
              vatRate: vatBreakdown.vatRate,
              vatAmount: vatBreakdown.vatAmount,
              totalAmount: vatBreakdown.totalAmount,
              qrPayload: JSON.stringify(qrPayload),
              qrCode,
              qrImage,
              status: "unpaid",
            },
            include: {
              lease: { select: { unitName: true, tenantName: true } },
            },
          });
          return { invoice, tenant };
        });

        const inv = result.invoice;
        return NextResponse.json(
          {
            success: true,
            invoice: {
              id: inv.id,
              invoiceNumber: inv.invoiceNumber,
              invoicePrefix: inv.invoicePrefix,
              invoiceLabel: formatInvoiceLabel(
                inv.invoicePrefix,
                inv.issueDate.getFullYear(),
                inv.invoiceNumber,
              ),
              zatcaUuid: inv.zatcaUuid,
              issueDate: inv.issueDate.toISOString().split("T")[0],
              dueDate: inv.dueDate.toISOString().split("T")[0],
              sellerName: result.tenant.companyName,
              sellerVat: result.tenant.vatNumber || "",
              subtotal: Number(inv.subtotal),
              vatRate: Number(inv.vatRate),
              vatAmount: Number(inv.vatAmount),
              totalAmount: Number(inv.totalAmount),
              qrCode: inv.qrCode,
              qrImage: inv.qrImage,
              zatcaStatus: inv.zatcaStatus,
              status: inv.status,
              leaseId: inv.leaseId,
              unitName: inv.lease?.unitName || null,
            },
          },
          { status: 201 },
        );
      } catch (error: any) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "POST /api/v1/leases/[id]/invoices failed",
          error,
          500,
        );
      }
    },
  );
}