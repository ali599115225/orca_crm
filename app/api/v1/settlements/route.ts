import { NextRequest, NextResponse } from "next/server";
import { TENANT_ROLES, runWithDatabaseSession } from "@/lib/api-auth-guard";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const [salePayments, rentalLeases] = await Promise.all([
        prisma.paymentTransaction.findMany({
          where: {
            tenantId: session.tenantId,
            status: "COMPLETED",
            method: "EARLY_SETTLEMENT",
            invoiceId: { not: null },
          },
          orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
          take: 100,
          include: {
            invoice: {
              select: {
                contractId: true,
                invoiceNumber: true,
                invoicePrefix: true,
                contract: {
                  select: {
                    buyerName: true,
                    unit: {
                      select: {
                        unitNumber: true,
                        project: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        prisma.rentalLease.findMany({
          where: {
            tenantId: session.tenantId,
            financialRef: { not: null },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            invoices: {
              select: {
                paymentTransactions: {
                  where: { status: "COMPLETED" },
                  select: {
                    amount: true,
                    fee: true,
                    netAmount: true,
                    paidAt: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      const saleSettlements = salePayments.flatMap((payment) => {
        const contractId = payment.invoice?.contractId;
        const contract = payment.invoice?.contract;
        if (!contractId || !contract) return [];

        return [
          {
            id: payment.id,
            type: "SALE" as const,
            contractId,
            leaseId: null,
            customerName: contract.buyerName,
            unitName: `${contract.unit.project.name} · ${contract.unit.unitNumber}`,
            gross: Number(payment.amount),
            deductions: Number(payment.fee),
            net: Number(payment.netAmount),
            currency: payment.currency,
            status: "completed" as const,
            reference:
              payment.providerReference ||
              `${payment.invoice?.invoicePrefix}-${payment.invoice?.invoiceNumber}`,
            date: (payment.paidAt || payment.createdAt).toISOString(),
          },
        ];
      });

      const rentalSettlements = rentalLeases.map((lease) => {
        const transactions = lease.invoices.flatMap(
          (invoice) => invoice.paymentTransactions,
        );
        const gross = transactions.reduce(
          (sum, payment) => sum + Number(payment.amount),
          0,
        );
        const deductions = transactions.reduce(
          (sum, payment) => sum + Number(payment.fee),
          0,
        );
        const net = transactions.reduce(
          (sum, payment) => sum + Number(payment.netAmount),
          0,
        );
        const latestDate = transactions
          .map((payment) => payment.paidAt || payment.createdAt)
          .sort((left, right) => right.getTime() - left.getTime())[0];

        return {
          id: `lease:${lease.id}`,
          type: "RENTAL" as const,
          contractId: lease.id,
          leaseId: lease.id,
          customerName: lease.tenantName,
          unitName: lease.unitName,
          gross,
          deductions,
          net,
          currency: lease.currency,
          status: "completed" as const,
          reference: lease.financialRef,
          date: (latestDate || lease.createdAt).toISOString(),
        };
      });

      const settlements = [...saleSettlements, ...rentalSettlements].sort(
        (left, right) =>
          new Date(right.date).getTime() - new Date(left.date).getTime(),
      );

      return NextResponse.json({ success: true, settlements });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "GET /api/v1/settlements failed",
        error,
      );
    }
  });
}
