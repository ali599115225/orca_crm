import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  appendDealEventInTx,
  ensureDealCorrelationId,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";
import { assertTenantOwnership } from "./validate-tenant";
import { recordPayment } from "./record-payment";
import {
  CONTRACT_STATUS,
  INSTALLMENT_STATUS,
  PAYMENT_PLAN_STATUS,
  PAYMENT_STATUS,
  RESTRUCTURE_MODE,
} from "./constants";
import type {
  RestructurePaymentPlanInput,
  RestructureMode,
} from "./types";

const COLLECTIBLE_STATUSES = new Set([
  INSTALLMENT_STATUS.PENDING,
  INSTALLMENT_STATUS.PARTIAL,
  INSTALLMENT_STATUS.OVERDUE,
]);

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function splitEvenly(total: number, count: number): number[] {
  if (!Number.isFinite(total) || total < 0) {
    throw new Error("Remaining balance is invalid.");
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("Installment count must be at least 1.");
  }

  const totalMinor = Math.round(total * 100);
  const baseMinor = Math.floor(totalMinor / count);
  const remainder = totalMinor - baseMinor * count;

  return Array.from({ length: count }, (_, index) =>
    (baseMinor + (index < remainder ? 1 : 0)) / 100,
  );
}

export function buildRestructureAmounts(input: {
  remainingBalance: number;
  mode: RestructureMode;
  currentAmounts: number[];
  desiredInstallmentCount?: number;
}): number[] {
  const remainingBalance = roundMoney(input.remainingBalance);
  const currentAmounts = input.currentAmounts
    .map((value) => roundMoney(Number(value)))
    .filter((value) => value > 0);

  if (remainingBalance <= 0) return [];
  if (currentAmounts.length === 0) {
    throw new Error("No unpaid installments are available for restructuring.");
  }

  if (input.mode === RESTRUCTURE_MODE.REDUCE_INSTALLMENT) {
    return splitEvenly(remainingBalance, currentAmounts.length);
  }

  if (input.mode === RESTRUCTURE_MODE.REDUCE_TERM) {
    const requested = input.desiredInstallmentCount;
    let count: number;

    if (requested != null) {
      if (!Number.isInteger(requested) || requested < 1) {
        throw new Error("Desired installment count must be at least 1.");
      }
      if (requested > currentAmounts.length) {
        throw new Error(
          "Desired installment count cannot exceed the current remaining count.",
        );
      }
      count = requested;
      return splitEvenly(remainingBalance, count);
    }

    const target = Math.max(currentAmounts[0], 0.01);
    count = Math.max(1, Math.ceil(remainingBalance / target));
    count = Math.min(count, currentAmounts.length);

    if (count === 1) return [remainingBalance];

    const amounts: number[] = [];
    let allocated = 0;
    for (let index = 0; index < count - 1; index += 1) {
      const amount = Math.min(target, roundMoney(remainingBalance - allocated));
      amounts.push(amount);
      allocated = roundMoney(allocated + amount);
    }
    amounts.push(roundMoney(remainingBalance - allocated));

    if (amounts.some((value) => value <= 0)) {
      return splitEvenly(remainingBalance, count);
    }
    return amounts;
  }

  throw new Error("Unsupported payment plan restructure mode.");
}

function hashRestructureKey(tenantId: string, contractId: string, key: string) {
  return createHash("sha256")
    .update(`${tenantId}:${contractId}:RESTRUCTURE:${key}`)
    .digest("hex");
}

async function getContractSnapshot(
  tenantId: string,
  contractId: string,
  client: any = prisma,
) {
  return client.contract.findFirst({
    where: { id: contractId, tenantId },
    include: {
      paymentPlan: true,
      invoices: {
        where: { type: "SALE" },
        orderBy: { createdAt: "asc" },
        include: {
          installments: {
            orderBy: [{ dueDate: "asc" }, { installmentNumber: "asc" }],
            include: {
              payments: {
                where: { status: PAYMENT_STATUS.COMPLETED },
                select: { netAmount: true },
              },
            },
          },
          paymentTransactions: {
            where: { status: PAYMENT_STATUS.COMPLETED },
            select: {
              id: true,
              installmentId: true,
              netAmount: true,
            },
          },
        },
      },
    },
  });
}

function calculateSnapshot(contract: any) {
  const invoice = contract?.invoices?.[0] || null;
  if (!invoice) throw new Error("SALE invoice is missing.");

  const installments = invoice.installments || [];
  const invoicePaid = roundMoney(
    (invoice.paymentTransactions || []).reduce(
      (sum: number, payment: any) => sum + Number(payment.netAmount),
      0,
    ),
  );
  const invoiceTotal = roundMoney(Number(invoice.totalAmount));
  const invoiceRemaining = roundMoney(Math.max(0, invoiceTotal - invoicePaid));

  const locked = installments.filter((item: any) => {
    const paid = roundMoney(
      (item.payments || []).reduce(
        (sum: number, payment: any) => sum + Number(payment.netAmount),
        0,
      ),
    );
    return paid > 0 || item.paymentStatus === INSTALLMENT_STATUS.PAID;
  });

  const mutable = installments.filter((item: any) => {
    const paid = roundMoney(
      (item.payments || []).reduce(
        (sum: number, payment: any) => sum + Number(payment.netAmount),
        0,
      ),
    );
    return (
      paid === 0 &&
      COLLECTIBLE_STATUSES.has(item.paymentStatus) &&
      item.paymentStatus !== INSTALLMENT_STATUS.CANCELLED
    );
  });

  const lockedOutstanding = roundMoney(
    locked.reduce((sum: number, item: any) => {
      const paid = roundMoney(
        (item.payments || []).reduce(
          (paymentSum: number, payment: any) =>
            paymentSum + Number(payment.netAmount),
          0,
        ),
      );
      return sum + Math.max(0, Number(item.amountSar) - paid);
    }, 0),
  );

  const mutableBalance = roundMoney(
    Math.max(0, invoiceRemaining - lockedOutstanding),
  );

  return {
    invoice,
    installments,
    locked,
    mutable,
    invoicePaid,
    invoiceTotal,
    invoiceRemaining,
    lockedOutstanding,
    mutableBalance,
  };
}

export async function restructurePaymentPlan(
  input: RestructurePaymentPlanInput,
) {
  const {
    tenantId,
    userId,
    contractId,
    prepaymentAmount,
    mode,
    desiredInstallmentCount,
    reason,
    method,
    idempotencyKey,
    actorId,
    correlationId: requestedCorrelationId,
  } = input;
  const eventActorId = actorId || userId;
  const correlationId = ensureDealCorrelationId(
    requestedCorrelationId,
    "restructure",
  );

  if (!userId) throw new Error("Authenticated user is required.");
  if (!Number.isFinite(prepaymentAmount) || prepaymentAmount <= 0) {
    throw new Error("Advance payment amount must be positive.");
  }
  if (!reason?.trim()) {
    throw new Error("Restructure reason is required.");
  }
  if (!idempotencyKey?.trim()) {
    throw new Error("Idempotency key is required.");
  }
  if (
    mode !== RESTRUCTURE_MODE.REDUCE_INSTALLMENT &&
    mode !== RESTRUCTURE_MODE.REDUCE_TERM
  ) {
    throw new Error("Unsupported payment plan restructure mode.");
  }

  await assertTenantOwnership(
    tenantId,
    "contract",
    contractId,
    "Contract not found in this tenant.",
  );

  const preflight = await getContractSnapshot(tenantId, contractId);
  if (!preflight) throw new Error("Contract not found.");
  if (preflight.legacyFinancial || preflight.spineVersion < 2) {
    throw new Error("Legacy contract payment plans are read-only.");
  }
  if (preflight.status !== CONTRACT_STATUS.SIGNED) {
    throw new Error("Only signed contracts can be restructured.");
  }
  if (!preflight.paymentPlan) {
    throw new Error("Active payment plan is missing.");
  }
  if (preflight.paymentPlan.status !== PAYMENT_PLAN_STATUS.ACTIVE) {
    throw new Error("Only active payment plans can be restructured.");
  }
  if (preflight.invoices.length !== 1) {
    throw new Error("Contract must have exactly one SALE invoice.");
  }

  const activePayments = await prisma.paymentTransaction.count({
    where: {
      tenantId,
      invoiceId: preflight.invoices[0].id,
      status: { in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING] },
    },
  });
  if (activePayments > 0) {
    throw new Error(
      "Complete or cancel pending payment transactions before restructuring.",
    );
  }

  const before = calculateSnapshot(preflight);
  if (prepaymentAmount > before.invoiceRemaining + 0.01) {
    throw new Error("Advance payment exceeds the invoice remaining balance.");
  }
  if (prepaymentAmount >= before.invoiceRemaining - 0.01) {
    throw new Error("Use the dedicated early settlement command.");
  }
  if (prepaymentAmount > before.mutableBalance + 0.01) {
    throw new Error(
      "Advance payment cannot exceed the fully unpaid installment balance while partially paid installments remain locked.",
    );
  }
  if (
    prepaymentAmount < before.invoiceRemaining - 0.01 &&
    before.mutable.length === 0
  ) {
    throw new Error("No unpaid installments are available for restructuring.");
  }

  const paymentResult = await recordPayment({
    tenantId,
    userId,
    invoiceId: before.invoice.id,
    amount: roundMoney(prepaymentAmount),
    method: method || "BANK_TRANSFER_ADVANCE",
    idempotencyKey: hashRestructureKey(
      tenantId,
      contractId,
      idempotencyKey.trim(),
    ),
    actorId: eventActorId,
    correlationId,
  });

  const existingAudit = await prisma.auditLog.findFirst({
    where: {
      tenantId,
      action: "RESTRUCTURE_PAYMENT_PLAN",
      recordId: paymentResult.payment.id,
    },
  });

  if (existingAudit) {
    const current = await getContractSnapshot(tenantId, contractId);
    return {
      payment: paymentResult.payment,
      contract: current,
      idempotent: true,
    };
  }

  return prisma.$transaction(
    async (tx) => {
      const contract = await getContractSnapshot(tenantId, contractId, tx);
      if (!contract) throw new Error("Contract not found.");
      if (!contract.paymentPlan) throw new Error("Payment plan is missing.");

      const stillActive = await tx.paymentTransaction.count({
        where: {
          tenantId,
          invoiceId: contract.invoices[0]?.id,
          status: { in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING] },
        },
      });
      if (stillActive > 0) {
        throw new Error(
          "A pending payment transaction appeared during restructuring.",
        );
      }

      const afterPayment = calculateSnapshot(contract);
      const mutable = afterPayment.mutable;
      const currentAmounts = mutable.map((item: any) =>
        Number(item.amountSar),
      );

      const newAmounts = buildRestructureAmounts({
        remainingBalance: afterPayment.mutableBalance,
        mode,
        currentAmounts,
        desiredInstallmentCount,
      });

      if (newAmounts.length > mutable.length) {
        throw new Error("Restructured schedule cannot add new installments.");
      }

      for (let index = 0; index < newAmounts.length; index += 1) {
        await tx.installment.update({
          where: { id: mutable[index].id },
          data: {
            amountSar: newAmounts[index],
            paymentStatus: INSTALLMENT_STATUS.PENDING,
          },
        });
      }

      const surplus = mutable.slice(newAmounts.length);
      if (surplus.length > 0) {
        await tx.installment.deleteMany({
          where: {
            tenantId,
            contractId,
            id: { in: surplus.map((item: any) => item.id) },
          },
        });
      }

      const activeInstallments = await tx.installment.findMany({
        where: {
          tenantId,
          contractId,
          paymentStatus: { not: INSTALLMENT_STATUS.CANCELLED },
        },
        orderBy: [{ dueDate: "asc" }, { installmentNumber: "asc" }],
      });

      const scheduleJson = activeInstallments.map((item: any) => ({
        installmentNumber: item.installmentNumber,
        amountSar: Number(item.amountSar),
        dueDate: item.dueDate.toISOString(),
      }));

      const planStatus =
        afterPayment.invoiceRemaining <= 0.01
          ? PAYMENT_PLAN_STATUS.COMPLETED
          : PAYMENT_PLAN_STATUS.ACTIVE;

      const paymentPlan = await tx.paymentPlan.update({
        where: { id: contract.paymentPlan.id },
        data: {
          scheduleJson,
          installmentCount: activeInstallments.length,
          version: { increment: 1 },
          lastAmendedAt: new Date(),
          status: planStatus,
          completedAt:
            planStatus === PAYMENT_PLAN_STATUS.COMPLETED ? new Date() : null,
        },
      });

      await tx.contract.update({
        where: { id: contractId },
        data: { version: { increment: 1 } },
      });

      const deal = await resolveDealInTx(tx, {
        tenantId,
        contractId,
        actorId: eventActorId,
        correlationId,
      });
      if (deal.passport) {
        const paymentEvent = await tx.dealEvent.findFirst({
          where: {
            tenantId,
            idempotencyKey: `payment.completed:${paymentResult.payment.id}`,
          },
          select: { id: true },
        });
        await appendDealEventInTx(tx, {
          tenantId,
          dealId: deal.passport.id,
          eventType: "payment_plan.restructured",
          idempotencyKey: `payment-plan:${paymentPlan.id}:restructured:v${paymentPlan.version}`,
          correlationId,
          causationId: paymentEvent?.id || null,
          actorId: eventActorId,
          entityType: "payment_plan",
          entityId: paymentPlan.id,
          beforeState: {
            version: contract.paymentPlan.version,
            installmentCount: before.mutable.length,
            invoiceRemaining: before.invoiceRemaining,
          },
          afterState: {
            version: paymentPlan.version,
            installmentCount: activeInstallments.length,
            invoiceRemaining: afterPayment.invoiceRemaining,
          },
          payload: {
            paymentTransactionId: paymentResult.payment.id,
            mode,
            prepaymentAmount: roundMoney(prepaymentAmount),
          },
          projection: {
            contractId,
            status: "PAYMENT_PLAN_RESTRUCTURED",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: "RESTRUCTURE_PAYMENT_PLAN",
          tableName: "payment_plans",
          recordId: paymentResult.payment.id,
          details: JSON.stringify({
            contractId,
            paymentPlanId: paymentPlan.id,
            invoiceId: afterPayment.invoice.id,
            paymentTransactionId: paymentResult.payment.id,
            reason: reason.trim(),
            mode,
            prepaymentAmount: roundMoney(prepaymentAmount),
            before: {
              invoiceRemaining: before.invoiceRemaining,
              mutableBalance: before.mutableBalance,
              mutableInstallmentCount: before.mutable.length,
            },
            after: {
              invoiceRemaining: afterPayment.invoiceRemaining,
              mutableBalance: afterPayment.mutableBalance,
              mutableInstallmentCount: newAmounts.length,
              amounts: newAmounts,
            },
          }),
        },
      });

      await tx.telemetryEvent
        .create({
          data: {
            tenantId,
            eventType: "payment_plan.restructured",
            eventDataJson: JSON.stringify({
              contractId,
              paymentPlanId: paymentPlan.id,
              paymentTransactionId: paymentResult.payment.id,
              mode,
              prepaymentAmount: roundMoney(prepaymentAmount),
            }),
            createdBy: userId,
          },
        })
        .catch(() => {});

      return {
        payment: paymentResult.payment,
        paymentPlan,
        installments: activeInstallments,
        idempotent: false,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
