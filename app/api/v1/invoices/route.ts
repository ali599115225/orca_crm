import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  FINANCE_WRITE_ROLES,
  TENANT_ROLES,
  runWithDatabaseSession,
} from "@/lib/api-auth-guard";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";
import { calculateVat, validateVatInput } from "@/lib/vat/engine";
import type { VatType } from "@/lib/vat/types";
import {
  buildQrPayload,
  encodeQrCode,
  generateQrImage,
  formatInvoiceLabel,
} from "@/lib/zatca/qr";

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const { searchParams } = new URL(request.url);
      const leaseId = searchParams.get("leaseId")?.trim() || "";
      const status = searchParams.get("status")?.trim() || "";
      const type = searchParams.get("type")?.trim() || "";

      const where: Record<string, unknown> = { tenantId: session.tenantId };
      if (leaseId) where.leaseId = leaseId;
      if (status) where.status = status;
      if (type === "SALE" || type === "RENTAL") where.type = type;

      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          lease: { select: { unitName: true, tenantName: true } },
          contract: {
            select: {
              id: true,
              buyerName: true,
              unit: {
                select: {
                  unitNumber: true,
                  project: { select: { name: true } },
                },
              },
            },
          },
          installments: {
            orderBy: [{ dueDate: "asc" }, { installmentNumber: "asc" }],
            select: {
              id: true,
              amountSar: true,
              paymentStatus: true,
              installmentNumber: true,
              dueDate: true,
            },
          },
        },
        orderBy: { invoiceNumber: "desc" },
      });

      const list = invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoicePrefix: invoice.invoicePrefix,
        invoiceLabel: formatInvoiceLabel(
          invoice.invoicePrefix,
          invoice.issueDate.getFullYear(),
          invoice.invoiceNumber,
        ),
        zatcaUuid: invoice.zatcaUuid,
        customerName: invoice.lease?.tenantName || invoice.contract?.buyerName || "",
        unitName:
          invoice.lease?.unitName ||
          (invoice.contract?.unit
            ? `${invoice.contract.unit.project.name} · ${invoice.contract.unit.unitNumber}`
            : null),
        type: invoice.type,
        contractId: invoice.contractId || null,
        leaseId: invoice.leaseId || null,
        subtotal: Number(invoice.subtotal),
        vatRate: Number(invoice.vatRate),
        vatAmount: Number(invoice.vatAmount),
        totalAmount: Number(invoice.totalAmount),
        status: invoice.status,
        issueDate: invoice.issueDate.toISOString().split("T")[0],
        dueDate: invoice.dueDate.toISOString().split("T")[0],
        due: invoice.dueDate.toISOString().split("T")[0],
        qrCode: invoice.qrCode,
        qrImage: invoice.qrImage,
        installments: invoice.installments.map((installment) => ({
          id: installment.id,
          installmentNumber: installment.installmentNumber,
          amountSar: Number(installment.amountSar),
          dueDate: installment.dueDate.toISOString().split("T")[0],
          paymentStatus: installment.paymentStatus,
        })),
      }));

      return NextResponse.json({ success: true, invoices: list });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "GET /api/v1/invoices failed",
        error,
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return runWithDatabaseSession(request, FINANCE_WRITE_ROLES, async (session) => {
    try {
      const body = await request.json();
      const leaseId = typeof body.leaseId === "string" ? body.leaseId.trim() : "";
      const subtotal = Number(body.subtotal);
      const vatType = typeof body.vatType === "string" ? body.vatType : "STANDARD";
      const dueDate = new Date(body.dueDate);

      if (!leaseId || !Number.isFinite(subtotal) || Number.isNaN(dueDate.getTime())) {
        return NextResponse.json(
          { success: false, error: "الحقول leaseId, subtotal, dueDate إلزامية ويجب أن تكون صالحة" },
          { status: 400 },
        );
      }

      const validationError = validateVatInput(subtotal, vatType);
      if (validationError) {
        return NextResponse.json(
          { success: false, error: validationError },
          { status: 400 },
        );
      }

      const lease = await prisma.rentalLease.findFirst({
        where: { id: leaseId, tenantId: session.tenantId },
        include: { tenant: true },
      });

      if (!lease) {
        return NextResponse.json(
          { success: false, error: "عقد الإيجار غير موجود" },
          { status: 404 },
        );
      }

      const tenant = lease.tenant;
      const vatBreakdown = calculateVat(subtotal, vatType as VatType);
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

        const invoice = await tx.invoice.create({
          data: {
            tenantId: session.tenantId,
            type: "RENTAL",
            leaseId,
            contractId: null,
            invoiceNumber: counter.nextInvoiceNumber - 1,
            invoicePrefix: tenant.invoicePrefix || "INV",
            dueDate,
            subtotal: vatBreakdown.subtotal,
            vatRate: vatBreakdown.vatRate,
            vatAmount: vatBreakdown.vatAmount,
            totalAmount: vatBreakdown.totalAmount,
            qrPayload: JSON.stringify(qrPayload),
            qrCode,
            qrImage,
            status: "unpaid",
          },
          include: { lease: { select: { unitName: true, tenantName: true } } },
        });

        await tx.auditLog.create({
          data: {
            tenantId: session.tenantId,
            userId: session.userId,
            action: "CREATE_RENTAL_INVOICE",
            tableName: "invoices",
            recordId: invoice.id,
            details: JSON.stringify({ leaseId, totalAmount: vatBreakdown.totalAmount }),
          },
        });

        return { invoice, tenant };
      });

      const invoice = result.invoice;
      return NextResponse.json(
        {
          success: true,
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            invoicePrefix: invoice.invoicePrefix,
            invoiceLabel: formatInvoiceLabel(
              invoice.invoicePrefix,
              invoice.issueDate.getFullYear(),
              invoice.invoiceNumber,
            ),
            zatcaUuid: invoice.zatcaUuid,
            issueDate: invoice.issueDate.toISOString().split("T")[0],
            dueDate: invoice.dueDate.toISOString().split("T")[0],
            due: invoice.dueDate.toISOString().split("T")[0],
            sellerName: result.tenant.companyName,
            sellerVat: result.tenant.vatNumber || "",
            sellerCr: result.tenant.commercialRegistry || "",
            sellerAddress: result.tenant.nationalAddress || "",
            customerName: invoice.lease?.tenantName || "",
            subtotal: Number(invoice.subtotal),
            vatRate: Number(invoice.vatRate),
            vatAmount: Number(invoice.vatAmount),
            totalAmount: Number(invoice.totalAmount),
            qrPayload: JSON.parse(invoice.qrPayload || "{}"),
            qrCode: invoice.qrCode,
            qrImage: invoice.qrImage,
            zatcaStatus: invoice.zatcaStatus,
            status: invoice.status,
            type: invoice.type,
            leaseId: invoice.leaseId,
            contractId: null,
            unitName: invoice.lease?.unitName || null,
            installments: [],
          },
        },
        { status: 201 },
      );
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "POST /api/v1/invoices failed",
        error,
      );
    }
  });
}
