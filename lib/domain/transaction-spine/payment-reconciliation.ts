import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  appendDealEventInTx,
  ensureDealCorrelationId,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";
import type { DealActorType } from "@/lib/domain/deal-passport";
import {
  findAccountByCode,
  postPaymentEntry,
  seedChartOfAccounts,
} from "@/lib/accounting";
import {
  INVOICE_STATUS,
  INSTALLMENT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_PLAN_STATUS,
  PAYMENT_STATUS,
} from "./constants";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function completePaymentTransaction(input: {
  transactionId: string;
  tenantId: string;
  amountMinorUnits: number;
  currency: string;
  providerStatus: string;
  rawPayload?: unknown;
  actorId?: string | null;
  actorType?: DealActorType;
  correlationId?: string | null;
  actorUserId?: string | null;
}) {
  const eventActorId = input.actorId || input.actorUserId || null;
  const correlationId = ensureDealCorrelationId(
    input.correlationId,
    "payment",
  );
  const amount = roundMoney(input.amountMinorUnits / 100);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Verified payment amount is invalid.");
  }

  await seedChartOfAccounts(input.tenantId);
  const cashAccount = await findAccountByCode(input.tenantId, "1.1.1");
  const receivableAccount = await findAccountByCode(input.tenantId, "1.1.3");
  if (!cashAccount || !receivableAccount) {
    throw new Error("Required accounting accounts are missing.");
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.paymentTransaction.findFirst({
      where: { id: input.transactionId, tenantId: input.tenantId },
      include: {
        installment: true,
        invoice: true,
        receipt: true,
      },
    });
    if (!payment) throw new Error("Payment transaction not found.");
    if (payment.status === PAYMENT_STATUS.COMPLETED) {
      return { payment, idempotent: true };
    }

    const expectedMinor =
      payment.expectedAmountMinor > 0
        ? payment.expectedAmountMinor
        : Math.round(Number(payment.amount) * 100);
    if (expectedMinor !== Math.round(input.amountMinorUnits)) {
      throw new Error("Verified payment amount does not match the expected amount.");
    }
    if (
      (payment.expectedCurrency || payment.currency || "SAR").toUpperCase() !==
      input.currency.toUpperCase()
    ) {
      throw new Error("Verified payment currency does not match the expected currency.");
    }

    const invoiceId = payment.invoiceId || payment.installment?.invoiceId || null;
    if (!invoiceId) throw new Error("Payment is not linked to an invoice.");

    const invoice =
      payment.invoice ||
      (await tx.invoice.findFirst({
        where: { id: invoiceId, tenantId: input.tenantId },
      }));
    if (!invoice) throw new Error("Invoice not found for payment.");

    const completedForInvoiceBefore = await tx.paymentTransaction.aggregate({
      where: {
        tenantId: input.tenantId,
        invoiceId,
        status: PAYMENT_STATUS.COMPLETED,
        id: { not: payment.id },
      },
      _sum: { netAmount: true },
    });
    const invoicePaidBefore = roundMoney(
      Number(completedForInvoiceBefore._sum.netAmount || 0),
    );
    const invoiceTotal = roundMoney(Number(invoice.totalAmount));
    if (roundMoney(invoicePaidBefore + amount) > invoiceTotal) {
      throw new Error("Payment exceeds the invoice remaining balance.");
    }

    if (payment.installment) {
      const completedForInstallment = await tx.paymentTransaction.aggregate({
        where: {
          tenantId: input.tenantId,
          installmentId: payment.installment.id,
          status: PAYMENT_STATUS.COMPLETED,
          id: { not: payment.id },
        },
        _sum: { netAmount: true },
      });
      const paidBefore = Number(completedForInstallment._sum.netAmount || 0);
      const installmentTotal = Number(payment.installment.amountSar);
      if (roundMoney(paidBefore + amount) > roundMoney(installmentTotal)) {
        throw new Error("Payment exceeds the installment remaining balance.");
      }
    }

    const updatedPayment = await tx.paymentTransaction.update({
      where: { id: payment.id },
      data: {
        invoiceId,
        amount,
        netAmount: amount,
        status: PAYMENT_STATUS.COMPLETED,
        gatewayStatus: input.providerStatus,
        paidAt: new Date(),
        processedAt: new Date(),
        webhookReceivedAt: new Date(),
        rawPayload: input.rawPayload as any,
        lastError: null,
        failureReason: null,
      },
    });

    if (payment.installment) {
      const completedForInstallment = await tx.paymentTransaction.aggregate({
        where: {
          tenantId: input.tenantId,
          installmentId: payment.installment.id,
          status: PAYMENT_STATUS.COMPLETED,
        },
        _sum: { netAmount: true },
      });
      const installmentPaid = roundMoney(
        Number(completedForInstallment._sum.netAmount || 0),
      );
      const installmentTotal = roundMoney(Number(payment.installment.amountSar));
      await tx.installment.update({
        where: { id: payment.installment.id },
        data: {
          paymentStatus:
            installmentPaid >= installmentTotal
              ? INSTALLMENT_STATUS.PAID
              : INSTALLMENT_STATUS.PARTIAL,
        },
      });
    }

    const completedForInvoice = await tx.paymentTransaction.aggregate({
      where: {
        tenantId: input.tenantId,
        invoiceId,
        status: PAYMENT_STATUS.COMPLETED,
      },
      _sum: { netAmount: true },
    });
    const invoicePaid = roundMoney(Number(completedForInvoice._sum.netAmount || 0));
    const invoiceStatus =
      invoicePaid >= invoiceTotal
        ? INVOICE_STATUS.PAID
        : invoicePaid > 0
          ? INVOICE_STATUS.PARTIAL
          : INVOICE_STATUS.UNPAID;

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: invoiceStatus,
        paidAt: invoiceStatus === INVOICE_STATUS.PAID ? new Date() : null,
        paymentMethod: payment.method,
        paymentRef: payment.providerReference || payment.id,
        gatewayProvider: payment.provider,
        gatewayStatus: input.providerStatus,
      },
    });

    const receipt = payment.receipt
      ? payment.receipt
      : await tx.receipt.create({
          data: {
            tenantId: input.tenantId,
            invoiceId,
            paymentTransactionId: payment.id,
            amount,
            paymentMethod: payment.method,
            status: "COMPLETED",
          },
        });

    if (!payment.receipt) {
      await postPaymentEntry(
        input.tenantId,
        receipt.id,
        amount,
        cashAccount.id,
        receivableAccount.id,
        tx,
      );
    }

    if (payment.installment?.paymentPlanId) {
      const remaining = await tx.installment.count({
        where: {
          paymentPlanId: payment.installment.paymentPlanId,
          paymentStatus: { not: INSTALLMENT_STATUS.PAID },
        },
      });
      if (remaining === 0) {
        await tx.paymentPlan.update({
          where: { id: payment.installment.paymentPlanId },
          data: {
            status: PAYMENT_PLAN_STATUS.COMPLETED,
            completedAt: new Date(),
          },
        });
      }
    }

    const contractId = invoice.contractId || payment.installment?.contractId || null;
    let earlySettlement:
      | {
          paymentPlanId: string;
          paymentPlanVersion: number;
          previousVersion: number;
          previousInstallmentCount: number;
          cancelledInstallmentCount: number;
          reason: string;
        }
      | null = null;

    if (
      payment.planCode === PAYMENT_METHOD.EARLY_SETTLEMENT ||
      payment.method === PAYMENT_METHOD.EARLY_SETTLEMENT
    ) {
      if (!contractId) {
        throw new Error("Early settlement payment is not linked to a contract.");
      }
      if (invoiceStatus !== INVOICE_STATUS.PAID) {
        throw new Error("Early settlement must settle the full invoice balance.");
      }

      const paymentPlan = await tx.paymentPlan.findFirst({
        where: {
          tenantId: input.tenantId,
          contractId,
        },
      });
      if (!paymentPlan) {
        throw new Error("Payment plan not found for early settlement.");
      }
      if (paymentPlan.status !== PAYMENT_PLAN_STATUS.ACTIVE) {
        throw new Error("Only active payment plans can be settled early.");
      }

      const previousInstallmentCount = await tx.installment.count({
        where: {
          tenantId: input.tenantId,
          contractId,
          paymentPlanId: paymentPlan.id,
          paymentStatus: {
            notIn: [
              INSTALLMENT_STATUS.PAID,
              INSTALLMENT_STATUS.CANCELLED,
            ],
          },
        },
      });

      const cancelled = await tx.installment.updateMany({
        where: {
          tenantId: input.tenantId,
          contractId,
          paymentPlanId: paymentPlan.id,
          paymentStatus: {
            notIn: [
              INSTALLMENT_STATUS.PAID,
              INSTALLMENT_STATUS.CANCELLED,
            ],
          },
        },
        data: {
          paymentStatus: INSTALLMENT_STATUS.CANCELLED,
        },
      });

      const completedAt = new Date();
      const completedPlan = await tx.paymentPlan.update({
        where: { id: paymentPlan.id },
        data: {
          status: PAYMENT_PLAN_STATUS.COMPLETED,
          completedAt,
          lastAmendedAt: completedAt,
          installmentCount: 0,
          scheduleJson: [],
          version: { increment: 1 },
        },
      });

      await tx.contract.update({
        where: { id: contractId },
        data: { version: { increment: 1 } },
      });

      const metadata =
        input.rawPayload &&
        typeof input.rawPayload === "object" &&
        !Array.isArray(input.rawPayload)
          ? (input.rawPayload as Record<string, unknown>)
          : {};
      const reason =
        typeof metadata.reason === "string" ? metadata.reason.trim() : "";

      earlySettlement = {
        paymentPlanId: completedPlan.id,
        paymentPlanVersion: completedPlan.version,
        previousVersion: paymentPlan.version,
        previousInstallmentCount,
        cancelledInstallmentCount: cancelled.count,
        reason,
      };

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          userId: input.actorUserId || null,
          action: "EARLY_SETTLEMENT_COMPLETED",
          tableName: "payment_plans",
          recordId: completedPlan.id,
          details: JSON.stringify({
            contractId,
            invoiceId,
            paymentTransactionId: payment.id,
            reason,
            settledAmount: amount,
            before: {
              invoiceRemaining: roundMoney(invoiceTotal - invoicePaidBefore),
              installmentCount: previousInstallmentCount,
              paymentPlanStatus: paymentPlan.status,
              version: paymentPlan.version,
            },
            after: {
              invoiceRemaining: 0,
              installmentCount: 0,
              paymentPlanStatus: completedPlan.status,
              version: completedPlan.version,
            },
          }),
        },
      });
    }

    if (contractId) {
      const deal = await resolveDealInTx(tx, {
        tenantId: input.tenantId,
        contractId,
        actorId: eventActorId,
        correlationId,
      });

      if (deal.passport) {
        await appendDealEventInTx(tx, {
          tenantId: input.tenantId,
          dealId: deal.passport.id,
          eventType: "payment.completed",
          idempotencyKey: `payment.completed:${payment.id}`,
          actorId: eventActorId,
          actorType: input.actorType,
          correlationId,
          causationId: deal.passport.lastEventId || null,
          entityType: "payment",
          entityId: payment.id,
          beforeState: {
            status: payment.status,
            invoiceStatus: invoice.status,
          },
          afterState: {
            status: PAYMENT_STATUS.COMPLETED,
            invoiceStatus,
          },
          payload: {
            invoiceId,
            installmentId: payment.installmentId,
            receiptId: receipt.id,
          },
          projection: {
            contractId,
            status: "PAYMENT_COMPLETED",
          },
        });

        if (earlySettlement) {
          const paymentEvent = await tx.dealEvent.findFirst({
            where: {
              tenantId: input.tenantId,
              idempotencyKey: `payment.completed:${payment.id}`,
            },
            select: { id: true },
          });

          await appendDealEventInTx(tx, {
            tenantId: input.tenantId,
            dealId: deal.passport.id,
            eventType: "payment_plan.early_settled",
            idempotencyKey: `payment-plan:${earlySettlement.paymentPlanId}:early-settled:v${earlySettlement.paymentPlanVersion}`,
            actorId: eventActorId,
            actorType: input.actorType,
            correlationId,
            causationId: paymentEvent?.id || null,
            entityType: "payment_plan",
            entityId: earlySettlement.paymentPlanId,
            beforeState: {
              version: earlySettlement.previousVersion,
              installmentCount: earlySettlement.previousInstallmentCount,
              invoiceRemaining: roundMoney(invoiceTotal - invoicePaidBefore),
            },
            afterState: {
              version: earlySettlement.paymentPlanVersion,
              installmentCount: 0,
              invoiceRemaining: 0,
            },
            payload: {
              paymentTransactionId: payment.id,
              settledAmount: amount,
              cancelledInstallmentCount:
                earlySettlement.cancelledInstallmentCount,
              reason: earlySettlement.reason,
            },
            projection: {
              contractId,
              status: "EARLY_SETTLED",
            },
          });
        }
      }
    }

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.actorUserId || null,
        action: "COMPLETE_PAYMENT_TRANSACTION",
        tableName: "payment_transactions",
        recordId: payment.id,
        details: JSON.stringify({
          paymentId: payment.id,
          invoiceId,
          installmentId: payment.installmentId,
          amount,
          provider: payment.provider,
          providerStatus: input.providerStatus,
          invoiceStatus,
        }),
      },
    });

    await tx.telemetryEvent
      .create({
        data: {
          tenantId: input.tenantId,
          eventType: "payment.completed",
          eventDataJson: JSON.stringify({
            paymentId: payment.id,
            invoiceId,
            installmentId: payment.installmentId,
            amount,
          }),
          createdBy: input.actorUserId || null,
        },
      })
      .catch(() => {});

    return { payment: updatedPayment, receipt, invoiceStatus, idempotent: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function failPaymentTransaction(input: {
  transactionId: string;
  tenantId: string;
  providerStatus: string;
  reason: string;
  rawPayload?: unknown;
}) {
  return prisma.paymentTransaction.updateMany({
    where: {
      id: input.transactionId,
      tenantId: input.tenantId,
      status: { not: PAYMENT_STATUS.COMPLETED },
    },
    data: {
      status: PAYMENT_STATUS.FAILED,
      gatewayStatus: input.providerStatus,
      paidAt: null,
      processedAt: new Date(),
      webhookReceivedAt: new Date(),
      rawPayload: input.rawPayload as any,
      failureReason: input.reason.slice(0, 2000),
      lastError: input.reason.slice(0, 2000),
    },
  });
}
