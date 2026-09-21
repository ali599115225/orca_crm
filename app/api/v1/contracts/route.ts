import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  TENANT_ROLES,
  runWithDatabaseSession,
} from "@/lib/api-auth-guard";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status")?.trim();
      const take = Math.min(
        Math.max(Number(searchParams.get("take") || 100), 1),
        200,
      );

      const contracts = await prisma.contract.findMany({
        where: {
          tenantId: session.tenantId,
          ...(status ? { status } : {}),
        },
        include: {
          unit: {
            select: {
              id: true,
              unitNumber: true,
              status: true,
              project: { select: { id: true, name: true } },
            },
          },
          lead: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          offer: {
            select: {
              id: true,
              status: true,
              price: true,
              linkedOpportunityId: true,
            },
          },
          paymentPlan: true,
          invoices: {
            where: { type: "SALE" },
            orderBy: { createdAt: "asc" },
            include: {
              installments: {
                orderBy: [{ dueDate: "asc" }, { installmentNumber: "asc" }],
                include: {
                  payments: {
                    where: { status: "COMPLETED" },
                    select: { netAmount: true },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        take,
      });

      const data = contracts.map((contract) => {
        const saleInvoice = contract.invoices[0] || null;
        const installments = (saleInvoice?.installments || []).map((installment) => {
          const paidAmount = installment.payments.reduce(
            (sum, payment) => sum + Number(payment.netAmount),
            0,
          );

          return {
            id: installment.id,
            installmentNumber: installment.installmentNumber,
            amountSar: Number(installment.amountSar),
            paidAmount,
            remainingAmount: Math.max(
              0,
              Number(installment.amountSar) - paidAmount,
            ),
            dueDate: installment.dueDate.toISOString().slice(0, 10),
            paymentStatus: installment.paymentStatus,
          };
        });

        return {
          id: contract.id,
          status: contract.status,
          buyerName: contract.buyerName,
          buyerPhone: contract.buyerPhone,
          totalVolumeSar: Number(contract.totalVolumeSar),
          acceptedAt: contract.acceptedAt.toISOString(),
          reservationExpiresAt:
            contract.reservationExpiresAt?.toISOString() || null,
          signedAt: contract.signedAt?.toISOString() || null,
          version: contract.version,
          spineVersion: contract.spineVersion,
          legacyFinancial: contract.legacyFinancial,
          legacyReason: contract.legacyReason,
          unit: contract.unit,
          lead: contract.lead,
          offer: contract.offer
            ? { ...contract.offer, price: Number(contract.offer.price) }
            : null,
          paymentPlan: contract.paymentPlan
            ? {
                id: contract.paymentPlan.id,
                template: contract.paymentPlan.template,
                status: contract.paymentPlan.status,
                totalAmount: Number(contract.paymentPlan.totalAmount),
                installmentCount: contract.paymentPlan.installmentCount,
                schedule: contract.paymentPlan.scheduleJson,
                activatedAt:
                  contract.paymentPlan.activatedAt?.toISOString() || null,
                completedAt:
                  contract.paymentPlan.completedAt?.toISOString() || null,
              }
            : null,
          invoice: saleInvoice
            ? {
                id: saleInvoice.id,
                invoiceNumber: saleInvoice.invoiceNumber,
                invoicePrefix: saleInvoice.invoicePrefix,
                totalAmount: Number(saleInvoice.totalAmount),
                status: saleInvoice.status,
                dueDate: saleInvoice.dueDate.toISOString().slice(0, 10),
              }
            : null,
          installments,
        };
      });

      return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "GET /api/v1/contracts failed",
        error,
      );
    }
  });
}
