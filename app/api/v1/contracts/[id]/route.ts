import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import { PAYMENT_STATUS } from "@/lib/domain/transaction-spine";

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "غير مصرح بالوصول." }, { status: 401 });
    }

    const { id } = await params;

    const contract = await prisma.contract.findFirst({
      where: { id, tenantId },
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
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
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
                  orderBy: { createdAt: "desc" },
                  include: {
                    receipt: {
                      select: {
                        id: true,
                        amount: true,
                        receivedDate: true,
                        status: true,
                      },
                    },
                  },
                },
              },
            },
            paymentTransactions: {
              orderBy: { createdAt: "desc" },
              include: {
                receipt: {
                  select: {
                    id: true,
                    amount: true,
                    receivedDate: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "عقد البيع غير موجود." }, { status: 404 });
    }

    const invoice = contract.invoices[0] || null;
    const payments = invoice?.paymentTransactions || [];
    const completedPaid = roundMoney(
      payments
        .filter((payment) => payment.status === PAYMENT_STATUS.COMPLETED)
        .reduce((sum, payment) => sum + Number(payment.netAmount), 0),
    );
    const invoiceTotal = invoice ? Number(invoice.totalAmount) : 0;
    const remainingBalance = roundMoney(Math.max(0, invoiceTotal - completedPaid));

    const installments = (invoice?.installments || []).map((installment) => {
      const paidAmount = roundMoney(
        installment.payments
          .filter((payment) => payment.status === PAYMENT_STATUS.COMPLETED)
          .reduce((sum, payment) => sum + Number(payment.netAmount), 0),
      );

      return {
        id: installment.id,
        installmentNumber: installment.installmentNumber,
        amountSar: Number(installment.amountSar),
        paidAmount,
        remainingAmount: roundMoney(
          Math.max(0, Number(installment.amountSar) - paidAmount),
        ),
        dueDate: installment.dueDate.toISOString().slice(0, 10),
        paymentStatus: installment.paymentStatus,
      };
    });

    const timelineRecordIds = [
      contract.id,
      contract.paymentPlan?.id,
      invoice?.id,
      ...installments.map((item) => item.id),
      ...payments.map((item) => item.id),
    ].filter(Boolean) as string[];

    const timeline = timelineRecordIds.length
      ? await prisma.auditLog.findMany({
          where: {
            tenantId,
            recordId: { in: timelineRecordIds },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : [];

    const restructureEvents = timeline.filter(
      (event) => event.action === "RESTRUCTURE_PAYMENT_PLAN",
    );

    const userIds = [
      ...new Set(
        restructureEvents
          .map((event) => event.userId)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    ];

    const userNames = new Map<string, string>();
    if (userIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, tenantId },
        select: { id: true, name: true },
      });
      for (const user of users) {
        userNames.set(user.id, user.name);
      }
    }

    const amendments = restructureEvents.map((event) => {
      let details: Record<string, unknown> = {};
      try {
        details = event.details ? JSON.parse(event.details) : {};
      } catch {
        details = {};
      }

      const before = (details.before as Record<string, unknown>) || {};
      const after = (details.after as Record<string, unknown>) || {};

      const numberValue = (...values: unknown[]): number | null => {
        for (const value of values) {
          if (typeof value === "number" && Number.isFinite(value)) return value;
          if (
            typeof value === "string" &&
            value.trim() !== "" &&
            Number.isFinite(Number(value))
          ) {
            return Number(value);
          }
        }
        return null;
      };

      const stringValue = (...values: unknown[]): string | null => {
        for (const value of values) {
          if (typeof value === "string" && value.trim() !== "") {
            return value;
          }
        }
        return null;
      };

      const beforeCount = numberValue(
        before.installmentCount,
        before.mutableInstallmentCount,
      );
      const afterCount = numberValue(
        after.installmentCount,
        after.mutableInstallmentCount,
      );
      const beforeBalance = numberValue(
        before.remainingBalance,
        before.invoiceRemaining,
        before.mutableBalance,
      );
      const afterBalance = numberValue(
        after.remainingBalance,
        after.invoiceRemaining,
        after.mutableBalance,
      );
      const afterAmounts = Array.isArray(after.amounts)
        ? after.amounts
            .map((value) => numberValue(value))
            .filter((value): value is number => value !== null)
        : [];

      const beforeInstallmentAmount =
        numberValue(before.installmentAmount) ??
        (beforeBalance !== null && beforeCount !== null && beforeCount > 0
          ? roundMoney(beforeBalance / beforeCount)
          : null);

      const afterInstallmentAmount =
        numberValue(after.installmentAmount, afterAmounts[0]) ??
        (afterBalance !== null && afterCount !== null && afterCount > 0
          ? roundMoney(afterBalance / afterCount)
          : null);

      const executedByName =
        typeof event.userId === "string" && event.userId.length > 0
          ? userNames.get(event.userId) || "system"
          : "system";

      return {
        id: event.id,
        version: numberValue(details.newVersion, details.version),
        type: stringValue(details.type) || "RESTRUCTURE",
        reason: stringValue(details.reason) || "",
        executedBy: executedByName,
        executedAt: event.createdAt.toISOString(),
        before: {
          prepaymentAmount: numberValue(before.prepaymentAmount),
          installmentAmount: beforeInstallmentAmount,
          installmentCount: beforeCount,
          remainingBalance: beforeBalance,
          endDate: stringValue(before.endDate),
        },
        after: {
          prepaymentAmount: numberValue(
            after.prepaymentAmount,
            details.prepaymentAmount,
          ),
          installmentAmount: afterInstallmentAmount,
          installmentCount: afterCount,
          remainingBalance: afterBalance,
          endDate: stringValue(after.endDate),
        },
      };
    });

    const data = {
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
            version: contract.paymentPlan.version,
            lastAmendedAt:
              contract.paymentPlan.lastAmendedAt?.toISOString() || null,
            activatedAt:
              contract.paymentPlan.activatedAt?.toISOString() || null,
            completedAt:
              contract.paymentPlan.completedAt?.toISOString() || null,
          }
        : null,
      invoice: invoice
        ? {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            invoicePrefix: invoice.invoicePrefix,
            totalAmount: Number(invoice.totalAmount),
            subtotal: Number(invoice.subtotal),
            vatAmount: Number(invoice.vatAmount),
            status: invoice.status,
            dueDate: invoice.dueDate.toISOString().slice(0, 10),
          }
        : null,
      financials: {
        totalPaid: completedPaid,
        remainingBalance,
        collectionPercent:
          invoiceTotal > 0
            ? Math.min(100, Math.round((completedPaid / invoiceTotal) * 10000) / 100)
            : 0,
      },
      installments,
      payments: payments.map((payment) => ({
        id: payment.id,
        installmentId: payment.installmentId,
        amount: Number(payment.amount),
        netAmount: Number(payment.netAmount),
        method: payment.method,
        provider: payment.provider,
        status: payment.status,
        providerReference: payment.providerReference,
        paidAt: payment.paidAt?.toISOString() || null,
        createdAt: payment.createdAt.toISOString(),
        receipt: payment.receipt
          ? {
              id: payment.receipt.id,
              amount: Number(payment.receipt.amount),
              receivedDate: payment.receipt.receivedDate.toISOString(),
              status: payment.receipt.status,
            }
          : null,
      })),
      timeline: timeline.map((event) => ({
        id: event.id,
        action: event.action,
        tableName: event.tableName,
        recordId: event.recordId,
        details: event.details,
        createdAt: event.createdAt.toISOString(),
      })),
      amendments,
      documents: [],
    };

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "تعذر جلب تفاصيل عقد البيع.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
