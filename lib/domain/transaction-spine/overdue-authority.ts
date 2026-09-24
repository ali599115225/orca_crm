import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  appendDealEventInTx,
  ensureDealCorrelationId,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";
import {
  INSTALLMENT_STATUS,
  PAYMENT_STATUS,
} from "./constants";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface MarkSaleInstallmentsOverdueInput {
  tenantId: string;
  asOf?: Date;
  actorId?: string | null;
  correlationId?: string | null;
}

/**
 * Canonical SALE-only overdue authority.
 *
 * Delinquency and payment progress are intentionally separate:
 * - Pending + past due + zero completed allocation -> Overdue
 * - Partial stays Partial even when past due
 * - Paid / Cancelled / Processing never enter this transition
 *
 * Invoice.status is not mutated here.
 */
export async function markSaleInstallmentsOverdue(
  input: MarkSaleInstallmentsOverdueInput,
) {
  const tenantId = String(input.tenantId || "").trim();
  if (!tenantId) {
    throw new Error("Tenant ID is required for overdue processing.");
  }

  const asOf = input.asOf ?? new Date();
  if (!(asOf instanceof Date) || Number.isNaN(asOf.getTime())) {
    throw new Error("Overdue processing timestamp is invalid.");
  }

  const correlationId = ensureDealCorrelationId(
    input.correlationId,
    "installment-overdue",
  );

  const candidates = await prisma.installment.findMany({
    where: {
      tenantId,
      paymentStatus: INSTALLMENT_STATUS.PENDING,
      dueDate: { lt: asOf },
      invoice: {
        is: {
          type: "SALE",
        },
      },
      payments: {
        none: {
          status: PAYMENT_STATUS.COMPLETED,
        },
      },
    },
    select: {
      id: true,
      contractId: true,
      invoiceId: true,
      paymentPlanId: true,
      installmentNumber: true,
      amountSar: true,
      dueDate: true,
      paymentStatus: true,
    },
    orderBy: [
      { dueDate: "asc" },
      { installmentNumber: "asc" },
    ],
  });

  let processedCount = 0;

  for (const candidate of candidates) {
    const transitioned = await prisma.$transaction(
      async (tx) => {
        const update = await tx.installment.updateMany({
          where: {
            id: candidate.id,
            tenantId,
            paymentStatus: INSTALLMENT_STATUS.PENDING,
            dueDate: { lt: asOf },
            invoice: {
              is: {
                type: "SALE",
              },
            },
            payments: {
              none: {
                status: PAYMENT_STATUS.COMPLETED,
              },
            },
          },
          data: {
            paymentStatus: INSTALLMENT_STATUS.OVERDUE,
          },
        });

        if (update.count !== 1) {
          return false;
        }

        const contract = await tx.contract.findFirst({
          where: {
            id: candidate.contractId,
            tenantId,
          },
          select: {
            version: true,
          },
        });

        if (!contract) {
          throw new Error("Contract not found for overdue installment.");
        }

        const remainingAmount = roundMoney(Number(candidate.amountSar));

        await tx.auditLog.create({
          data: {
            tenantId,
            userId: input.actorId ?? null,
            action: "MARK_INSTALLMENT_OVERDUE",
            tableName: "installments",
            recordId: candidate.id,
            details: JSON.stringify({
              contractId: candidate.contractId,
              invoiceId: candidate.invoiceId,
              paymentPlanId: candidate.paymentPlanId,
              installmentNumber: candidate.installmentNumber,
              dueDate: candidate.dueDate.toISOString(),
              remainingAmount,
              before: {
                paymentStatus: INSTALLMENT_STATUS.PENDING,
              },
              after: {
                paymentStatus: INSTALLMENT_STATUS.OVERDUE,
              },
              asOf: asOf.toISOString(),
            }),
          },
        });

        const deal = await resolveDealInTx(tx, {
          tenantId,
          contractId: candidate.contractId,
          actorId: input.actorId ?? null,
          correlationId,
        });

        if (deal.passport) {
          await appendDealEventInTx(tx, {
            tenantId,
            dealId: deal.passport.id,
            eventType: "installment.overdue",
            idempotencyKey: `installment.overdue:${candidate.id}:contract-v${contract.version}`,
            correlationId,
            causationId: deal.passport.lastEventId || null,
            actorType: "SYSTEM",
            actorId: input.actorId ?? null,
            entityType: "installment",
            entityId: candidate.id,
            beforeState: {
              paymentStatus: INSTALLMENT_STATUS.PENDING,
              dueDate: candidate.dueDate.toISOString(),
              remainingAmount,
            },
            afterState: {
              paymentStatus: INSTALLMENT_STATUS.OVERDUE,
              remainingAmount,
            },
            payload: {
              contractId: candidate.contractId,
              invoiceId: candidate.invoiceId,
              paymentPlanId: candidate.paymentPlanId,
              installmentNumber: candidate.installmentNumber,
              contractVersion: contract.version,
            },
            projection: {
              contractId: candidate.contractId,
            },
          });
        }

        return true;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (transitioned) {
      processedCount += 1;
    }
  }

  return {
    success: true as const,
    processedCount,
    candidateCount: candidates.length,
    asOf,
  };
}