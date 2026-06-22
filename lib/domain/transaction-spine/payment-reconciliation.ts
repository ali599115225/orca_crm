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
    const invoiceTotal = roundMoney(Number(invoice.totalAmount));
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
