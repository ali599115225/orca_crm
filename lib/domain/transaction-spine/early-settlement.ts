import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ensureDealCorrelationId } from "@/lib/domain/deal-passport";
import { assertTenantOwnership } from "./validate-tenant";
import { recordPayment } from "./record-payment";
import {
  CONTRACT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_PLAN_STATUS,
  PAYMENT_STATUS,
} from "./constants";
import type { EarlySettlementInput } from "./types";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateEarlySettlementAmount(
  invoiceTotal: number,
  completedPaid: number,
): number {
  const total = roundMoney(Number(invoiceTotal));
  const paid = roundMoney(Number(completedPaid));

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Invoice total is invalid.");
  }
  if (!Number.isFinite(paid) || paid < 0) {
    throw new Error("Completed payment total is invalid.");
  }

  return roundMoney(Math.max(0, total - paid));
}

function hashEarlySettlementKey(
  tenantId: string,
  contractId: string,
  key: string,
): string {
  return createHash("sha256")
    .update(`${tenantId}:${contractId}:EARLY_SETTLEMENT:${key}`)
    .digest("hex");
}

export async function earlySettlePaymentPlan(input: EarlySettlementInput) {
  const {
    tenantId,
    userId,
    actorId,
    correlationId: requestedCorrelationId,
    contractId,
    reason,
    idempotencyKey,
  } = input;

  if (!userId) throw new Error("Authenticated user is required.");
  if (!reason?.trim()) throw new Error("Early settlement reason is required.");
  if (!idempotencyKey?.trim()) {
    throw new Error("Idempotency key is required.");
  }

  await assertTenantOwnership(
    tenantId,
    "contract",
    contractId,
    "Contract not found in this tenant.",
  );

  const contract = await prisma.contract.findFirst({
    where: { id: contractId, tenantId },
    include: {
      paymentPlan: true,
      invoices: {
        where: { type: "SALE" },
        orderBy: { createdAt: "asc" },
        include: {
          paymentTransactions: {
            where: { status: PAYMENT_STATUS.COMPLETED },
            select: { netAmount: true },
          },
        },
      },
    },
  });

  if (!contract) throw new Error("Contract not found.");
  if (contract.legacyFinancial || contract.spineVersion < 2) {
    throw new Error("Legacy contract payment plans are read-only.");
  }
  if (contract.status !== CONTRACT_STATUS.SIGNED) {
    throw new Error("Only signed contracts can be settled early.");
  }
  if (!contract.paymentPlan) {
    throw new Error("Active payment plan is missing.");
  }
  if (contract.paymentPlan.status !== PAYMENT_PLAN_STATUS.ACTIVE) {
    throw new Error("Only active payment plans can be settled early.");
  }
  if (contract.invoices.length !== 1) {
    throw new Error("Contract must have exactly one SALE invoice.");
  }

  const invoice = contract.invoices[0];
  const activePayments = await prisma.paymentTransaction.count({
    where: {
      tenantId,
      invoiceId: invoice.id,
      status: {
        in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING],
      },
    },
  });
  if (activePayments > 0) {
    throw new Error(
      "Complete or cancel pending payment transactions before early settlement.",
    );
  }

  const completedPaid = invoice.paymentTransactions.reduce(
    (sum, payment) => sum + Number(payment.netAmount),
    0,
  );
  const settlementAmount = calculateEarlySettlementAmount(
    Number(invoice.totalAmount),
    completedPaid,
  );
  if (settlementAmount <= 0.01) {
    throw new Error("Invoice is already fully paid.");
  }

  const correlationId = ensureDealCorrelationId(
    requestedCorrelationId,
    "early-settlement",
  );
  const paymentResult = await recordPayment({
    tenantId,
    userId,
    actorId: actorId || userId,
    correlationId,
    invoiceId: invoice.id,
    amount: settlementAmount,
    method: PAYMENT_METHOD.EARLY_SETTLEMENT,
    planCode: PAYMENT_METHOD.EARLY_SETTLEMENT,
    metadata: {
      operation: PAYMENT_METHOD.EARLY_SETTLEMENT,
      reason: reason.trim(),
      contractId,
    },
    idempotencyKey: hashEarlySettlementKey(
      tenantId,
      contractId,
      idempotencyKey.trim(),
    ),
  });

  if (paymentResult.payment.status !== PAYMENT_STATUS.COMPLETED) {
    throw new Error("Early settlement payment was not completed.");
  }

  return {
    payment: paymentResult.payment,
    settlementAmount,
    idempotent: paymentResult.idempotent,
  };
}