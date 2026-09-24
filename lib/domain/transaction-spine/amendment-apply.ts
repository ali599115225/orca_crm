import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  appendDealEventInTx,
  ensureDealCorrelationId,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";
import { canonicalSerialize, canonicalSha256 } from "./signed-contract-snapshot";
import {
  AMENDMENT_SNAPSHOT_TYPE,
  buildAmendmentSourceSnapshot,
} from "./amendment-draft";
import {
  CONTRACT_STATUS,
  INSTALLMENT_STATUS,
  PAYMENT_PLAN_STATUS,
  PAYMENT_STATUS,
} from "./constants";
import type {
  AmendmentResultApprovalSnapshot,
  AmendmentScheduleProposalItem,
  ApplyAmendmentInput,
} from "./types";

export const AMENDMENT_RESULT_SNAPSHOT_TYPE = "AMENDMENT_RESULT";

export const AMENDMENT_APPLY_CONTRACT_NOT_FOUND = "AMENDMENT_APPLY_CONTRACT_NOT_FOUND";
export const AMENDMENT_APPLY_NOT_FOUND = "AMENDMENT_APPLY_NOT_FOUND";
export const AMENDMENT_APPLY_CONTRACT_MISMATCH = "AMENDMENT_APPLY_CONTRACT_MISMATCH";
export const AMENDMENT_APPLY_NOT_APPROVED = "AMENDMENT_APPLY_NOT_APPROVED";
export const AMENDMENT_APPLY_APPROVAL_EVIDENCE_MISSING = "AMENDMENT_APPLY_APPROVAL_EVIDENCE_MISSING";
export const AMENDMENT_APPLY_CONTRACT_NOT_ELIGIBLE = "AMENDMENT_APPLY_CONTRACT_NOT_ELIGIBLE";
export const AMENDMENT_APPLY_STALE_VERSION = "AMENDMENT_APPLY_STALE_VERSION";
export const AMENDMENT_APPLY_SALE_INVOICE_REQUIRED = "AMENDMENT_APPLY_SALE_INVOICE_REQUIRED";
export const AMENDMENT_APPLY_PAYMENT_PLAN_REQUIRED = "AMENDMENT_APPLY_PAYMENT_PLAN_REQUIRED";
export const AMENDMENT_APPLY_SOURCE_SNAPSHOT_MISSING = "AMENDMENT_APPLY_SOURCE_SNAPSHOT_MISSING";
export const AMENDMENT_APPLY_SOURCE_SNAPSHOT_INVALID = "AMENDMENT_APPLY_SOURCE_SNAPSHOT_INVALID";
export const AMENDMENT_APPLY_SOURCE_SNAPSHOT_DIGEST_MISMATCH = "AMENDMENT_APPLY_SOURCE_SNAPSHOT_DIGEST_MISMATCH";
export const AMENDMENT_APPLY_PENDING_PAYMENTS_EXIST = "AMENDMENT_APPLY_PENDING_PAYMENTS_EXIST";
export const AMENDMENT_APPLY_LIVE_SOURCE_DRIFT = "AMENDMENT_APPLY_LIVE_SOURCE_DRIFT";
export const AMENDMENT_APPLY_UNALLOCATED_COMPLETED_PAYMENT = "AMENDMENT_APPLY_UNALLOCATED_COMPLETED_PAYMENT";
export const AMENDMENT_APPLY_PROPOSAL_INVALID = "AMENDMENT_APPLY_PROPOSAL_INVALID";
export const AMENDMENT_APPLY_PROPOSAL_DUPLICATE_INSTALLMENT = "AMENDMENT_APPLY_PROPOSAL_DUPLICATE_INSTALLMENT";
export const AMENDMENT_APPLY_PROPOSAL_FOREIGN_INSTALLMENT = "AMENDMENT_APPLY_PROPOSAL_FOREIGN_INSTALLMENT";
export const AMENDMENT_APPLY_PROPOSAL_INSTALLMENT_NUMBER_MISMATCH = "AMENDMENT_APPLY_PROPOSAL_INSTALLMENT_NUMBER_MISMATCH";
export const AMENDMENT_APPLY_PROPOSAL_MISSING_INSTALLMENT = "AMENDMENT_APPLY_PROPOSAL_MISSING_INSTALLMENT";
export const AMENDMENT_APPLY_PROPOSAL_ZERO_DELTA_VIOLATION = "AMENDMENT_APPLY_PROPOSAL_ZERO_DELTA_VIOLATION";
export const AMENDMENT_APPLY_CONCURRENT_CONFLICT = "AMENDMENT_APPLY_CONCURRENT_CONFLICT";
export const AMENDMENT_APPLY_IDEMPOTENCY_KEY_TYPE_MISMATCH = "AMENDMENT_APPLY_IDEMPOTENCY_KEY_TYPE_MISMATCH";
export const AMENDMENT_APPLY_IDEMPOTENCY_KEY_CONTENT_CONFLICT = "AMENDMENT_APPLY_IDEMPOTENCY_KEY_CONTENT_CONFLICT";
export const AMENDMENT_APPLY_RESULT_SNAPSHOT_DIGEST_MISMATCH = "AMENDMENT_APPLY_RESULT_SNAPSHOT_DIGEST_MISMATCH";

export class AmendmentApplyError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "AmendmentApplyError";
  }
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toMinorUnits(value: number): number {
  return Math.round(roundMoney(value) * 100);
}

function textOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function isoDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function hashAmendmentApplyIdempotencyKey(tenantId: string, contractId: string, key: string): string {
  return createHash("sha256")
    .update(`${tenantId}:${contractId}:AMENDMENT_APPLY:${key}`)
    .digest("hex");
}

export function computeApplyRequestDigest(input: {
  tenantId: string;
  contractId: string;
  amendmentId: string;
  appliedBy: string;
}): string {
  return canonicalSha256({
    tenantId: input.tenantId,
    contractId: input.contractId,
    amendmentId: input.amendmentId,
    appliedBy: input.appliedBy,
  });
}

function paidAmountForInstallment(installment: any): number {
  return roundMoney(
    (installment.payments || []).reduce(
      (sum: number, payment: any) =>
        payment.status === PAYMENT_STATUS.COMPLETED ? sum + Number(payment.netAmount) : sum,
      0,
    ),
  );
}

function isEligibleInstallment(installment: any, now: Date): boolean {
  const paid = paidAmountForInstallment(installment);
  const dueDate = installment.dueDate instanceof Date ? installment.dueDate : new Date(installment.dueDate);
  return (
    dueDate.getTime() > now.getTime() &&
    paid === 0 &&
    (installment.paymentStatus === INSTALLMENT_STATUS.PENDING ||
      installment.paymentStatus === INSTALLMENT_STATUS.PARTIAL)
  );
}

function verifyAmendmentSourceSnapshotDigest(snapshot: {
  tenantId: string;
  contractId: string | null;
  contractVersion: number | null;
  snapshotType: string;
  structuredFacts: unknown;
  paymentPlanSnapshot: unknown;
  digest: string;
}): void {
  const expected = canonicalSha256({
    tenantId: snapshot.tenantId,
    contractId: snapshot.contractId,
    contractVersion: snapshot.contractVersion,
    snapshotType: snapshot.snapshotType,
    structuredFacts: snapshot.structuredFacts,
    paymentPlanSnapshot: snapshot.paymentPlanSnapshot,
  });
  if (expected !== snapshot.digest) {
    throw new AmendmentApplyError(AMENDMENT_APPLY_SOURCE_SNAPSHOT_DIGEST_MISMATCH);
  }
}

export function verifyAmendmentResultSnapshotDigest(snapshot: {
  tenantId: string;
  contractId: string | null;
  contractVersion: number | null;
  snapshotType: string;
  structuredFacts: unknown;
  paymentPlanSnapshot: unknown;
  approvalSnapshot: unknown;
  digest: string;
}): void {
  const expected = canonicalSha256({
    tenantId: snapshot.tenantId,
    contractId: snapshot.contractId,
    contractVersion: snapshot.contractVersion,
    snapshotType: snapshot.snapshotType,
    structuredFacts: snapshot.structuredFacts,
    paymentPlanSnapshot: snapshot.paymentPlanSnapshot,
    approvalSnapshot: snapshot.approvalSnapshot,
  });
  if (expected !== snapshot.digest) {
    throw new AmendmentApplyError(AMENDMENT_APPLY_RESULT_SNAPSHOT_DIGEST_MISMATCH);
  }
}

function parseProposedSchedule(changesJson: unknown): AmendmentScheduleProposalItem[] {
  if (!changesJson || typeof changesJson !== "object") {
    throw new AmendmentApplyError(AMENDMENT_APPLY_PROPOSAL_INVALID);
  }
  const rawSchedule = (changesJson as any).proposedSchedule;
  if (!Array.isArray(rawSchedule) || rawSchedule.length === 0) {
    throw new AmendmentApplyError(AMENDMENT_APPLY_PROPOSAL_INVALID);
  }
  return rawSchedule.map((item: any) => {
    if (
      !item ||
      typeof item.installmentId !== "string" ||
      !item.installmentId.trim() ||
      typeof item.installmentNumber !== "number" ||
      !Number.isInteger(item.installmentNumber) ||
      typeof item.amountSar !== "number" ||
      !Number.isFinite(item.amountSar) ||
      item.amountSar <= 0 ||
      typeof item.dueDate !== "string"
    ) {
      throw new AmendmentApplyError(AMENDMENT_APPLY_PROPOSAL_INVALID);
    }
    const date = new Date(item.dueDate);
    if (Number.isNaN(date.getTime())) {
      throw new AmendmentApplyError(AMENDMENT_APPLY_PROPOSAL_INVALID);
    }
    return {
      installmentId: item.installmentId.trim(),
      installmentNumber: item.installmentNumber,
      amountSar: roundMoney(item.amountSar),
      dueDate: date.toISOString().slice(0, 10),
    };
  });
}

/**
 * Canonical amendment APPROVED -> APPLIED transition (design-freeze F3-4).
 * Enforces live source drift protection, invoice-level completed payment
 * invariant, bijection over future unpaid installments, updates schedule,
 * increments Contract.version and PaymentPlan.version by +1, creates the
 * immutable AMENDMENT_RESULT snapshot, and appends amendment.applied.
 * Entire operation runs inside one Serializable transaction.
 */
export async function applyAmendment(input: ApplyAmendmentInput) {
  const {
    tenantId,
    userId,
    contractId,
    amendmentId,
    actorId,
    correlationId: requestedCorrelationId,
  } = input;
  if (!userId) throw new Error("Authenticated user is required.");

  const eventActorId = actorId || userId;
  const correlationId = ensureDealCorrelationId(requestedCorrelationId, "amendment");

  const idempotencyKeyRaw = String(input.idempotencyKey || "").trim();
  if (!idempotencyKeyRaw) throw new Error("Idempotency key is required.");

  const idempotencyKey = hashAmendmentApplyIdempotencyKey(tenantId, contractId, idempotencyKeyRaw);
  const requestDigest = computeApplyRequestDigest({
    tenantId,
    contractId,
    amendmentId,
    appliedBy: userId,
  });

  return prisma.$transaction(
    async (tx) => {
      // 1. Explicit pre-write idempotency lookup — first operation.
      const existingEvent = await tx.dealEvent.findFirst({
        where: { tenantId, idempotencyKey },
      });
      if (existingEvent) {
        if (existingEvent.eventType !== "amendment.applied" || existingEvent.entityType !== "amendment") {
          throw new AmendmentApplyError(AMENDMENT_APPLY_IDEMPOTENCY_KEY_TYPE_MISMATCH);
        }
        if (existingEvent.entityId !== amendmentId) {
          throw new AmendmentApplyError(AMENDMENT_APPLY_IDEMPOTENCY_KEY_TYPE_MISMATCH);
        }
        const existingAmendment = await (tx as any).contractAmendment.findFirst({
          where: { id: amendmentId, tenantId },
        });
        if (!existingAmendment || existingAmendment.contractId !== contractId) {
          throw new AmendmentApplyError(AMENDMENT_APPLY_IDEMPOTENCY_KEY_TYPE_MISMATCH);
        }
        const payload = (existingEvent.payload as any) || {};
        if (payload.requestDigest !== requestDigest) {
          throw new AmendmentApplyError(AMENDMENT_APPLY_IDEMPOTENCY_KEY_CONTENT_CONFLICT);
        }
        if (!existingAmendment.resultingSnapshotId) {
          throw new AmendmentApplyError(AMENDMENT_APPLY_IDEMPOTENCY_KEY_TYPE_MISMATCH);
        }
        const existingSnapshot = await tx.contractSnapshot.findFirst({
          where: { id: existingAmendment.resultingSnapshotId, tenantId },
        });
        if (
          !existingSnapshot ||
          existingSnapshot.contractId !== contractId ||
          existingSnapshot.snapshotType !== AMENDMENT_RESULT_SNAPSHOT_TYPE
        ) {
          throw new AmendmentApplyError(AMENDMENT_APPLY_IDEMPOTENCY_KEY_TYPE_MISMATCH);
        }
        const currentContract = await tx.contract.findFirst({
          where: { id: contractId, tenantId },
        });
        const currentPlan = await tx.paymentPlan.findFirst({
          where: { contractId, tenantId },
        });
        return {
          amendment: existingAmendment,
          resultingSnapshot: existingSnapshot,
          contract: currentContract
            ? { id: currentContract.id, version: currentContract.version }
            : { id: contractId, version: payload.resultingContractVersion },
          paymentPlan: currentPlan
            ? { id: currentPlan.id, version: currentPlan.version }
            : null,
          idempotent: true as const,
        };
      }

      // 2. Capture single authoritative apply execution instant.
      const appliedAt = new Date();

      // 3. Fetch contract with SALE invoices, installments, and payment plan.
      const contract = await tx.contract.findFirst({
        where: { id: contractId, tenantId },
        include: {
          invoices: {
            where: { type: "SALE" },
            include: {
              installments: {
                include: { payments: true },
                orderBy: { installmentNumber: "asc" },
              },
            },
          },
          paymentPlan: true,
        },
      });
      if (!contract) throw new AmendmentApplyError(AMENDMENT_APPLY_CONTRACT_NOT_FOUND);

      if (
        contract.status !== CONTRACT_STATUS.SIGNED ||
        contract.spineVersion < 2 ||
        contract.legacyFinancial
      ) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_CONTRACT_NOT_ELIGIBLE);
      }

      if (contract.invoices.length !== 1) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_SALE_INVOICE_REQUIRED);
      }
      const invoice = contract.invoices[0];

      if (!contract.paymentPlan || contract.paymentPlan.status !== PAYMENT_PLAN_STATUS.ACTIVE) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_PAYMENT_PLAN_REQUIRED);
      }
      const paymentPlan = contract.paymentPlan;

      // 4. Fetch amendment and verify status and approval evidence.
      const amendment = await (tx as any).contractAmendment.findFirst({
        where: { id: amendmentId, tenantId },
      });
      if (!amendment) throw new AmendmentApplyError(AMENDMENT_APPLY_NOT_FOUND);
      if (amendment.contractId !== contractId) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_CONTRACT_MISMATCH);
      }
      if (amendment.status !== "APPROVED") {
        throw new AmendmentApplyError(AMENDMENT_APPLY_NOT_APPROVED);
      }
      if (!amendment.approvedBy || !amendment.approvedAt) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_APPROVAL_EVIDENCE_MISSING);
      }
      if (contract.version !== amendment.sourceContractVersion) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_STALE_VERSION);
      }

      // 5. Source snapshot integrity and verification.
      const sourceSnapshot = await tx.contractSnapshot.findFirst({
        where: { id: amendment.sourceSnapshotId, tenantId },
      });
      if (!sourceSnapshot) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_SOURCE_SNAPSHOT_MISSING);
      }
      if (
        sourceSnapshot.snapshotType !== AMENDMENT_SNAPSHOT_TYPE ||
        sourceSnapshot.contractId !== contractId ||
        sourceSnapshot.contractVersion !== amendment.sourceContractVersion
      ) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_SOURCE_SNAPSHOT_INVALID);
      }
      verifyAmendmentSourceSnapshotDigest(sourceSnapshot);

      // 6. In-flight payment transaction guard.
      const activePayments = await tx.paymentTransaction.count({
        where: {
          tenantId,
          invoiceId: invoice.id,
          status: { in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING] },
        },
      });
      if (activePayments > 0) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_PENDING_PAYMENTS_EXIST);
      }

      // 7. Live source drift check — compare rebuilt facts digest against persisted sourceSnapshot.
      const livePreApply = buildAmendmentSourceSnapshot({
        tenantId,
        contract,
        invoice,
        paymentPlan,
      });
      if (livePreApply.digest !== sourceSnapshot.digest) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_LIVE_SOURCE_DRIFT);
      }

      // 8. Invoice-level completed payments invariant.
      const completedPayments = await tx.paymentTransaction.findMany({
        where: {
          tenantId,
          invoiceId: invoice.id,
          status: PAYMENT_STATUS.COMPLETED,
        },
        select: { id: true, installmentId: true, netAmount: true },
      });

      const hasUnallocated = completedPayments.some((p) => p.installmentId === null);
      if (hasUnallocated) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_UNALLOCATED_COMPLETED_PAYMENT);
      }

      const totalCompletedPaymentsMinor = completedPayments.reduce(
        (sum, p) => sum + toMinorUnits(Number(p.netAmount)),
        0,
      );
      const totalInstallmentsPaidMinor = (invoice.installments || []).reduce(
        (sum: number, inst: any) => sum + toMinorUnits(paidAmountForInstallment(inst)),
        0,
      );
      if (totalCompletedPaymentsMinor !== totalInstallmentsPaidMinor) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_UNALLOCATED_COMPLETED_PAYMENT);
      }

      // 9. Proposal validation and live eligible set revalidation.
      const proposedSchedule = parseProposedSchedule(amendment.changesJson);
      const proposalIds = proposedSchedule.map((item) => item.installmentId);
      const uniqueProposalIds = new Set(proposalIds);
      if (uniqueProposalIds.size !== proposalIds.length) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_PROPOSAL_DUPLICATE_INSTALLMENT);
      }

      const eligible = (invoice.installments || []).filter((item: any) =>
        isEligibleInstallment(item, appliedAt),
      );
      const eligibleById = new Map(eligible.map((item: any) => [item.id as string, item]));

      for (const proposalItem of proposedSchedule) {
        const realInstallment = eligibleById.get(proposalItem.installmentId);
        if (!realInstallment) {
          throw new AmendmentApplyError(AMENDMENT_APPLY_PROPOSAL_FOREIGN_INSTALLMENT);
        }
        if (proposalItem.installmentNumber !== realInstallment.installmentNumber) {
          throw new AmendmentApplyError(AMENDMENT_APPLY_PROPOSAL_INSTALLMENT_NUMBER_MISMATCH);
        }
        const propDate = new Date(proposalItem.dueDate);
        if (propDate.getTime() <= appliedAt.getTime()) {
          throw new AmendmentApplyError(AMENDMENT_APPLY_PROPOSAL_FOREIGN_INSTALLMENT);
        }
      }
      if (uniqueProposalIds.size !== eligibleById.size) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_PROPOSAL_MISSING_INSTALLMENT);
      }

      const eligibleTotalMinor = eligible.reduce(
        (sum: number, item: any) => sum + toMinorUnits(Number(item.amountSar)),
        0,
      );
      const proposedTotalMinor = proposedSchedule.reduce(
        (sum, item) => sum + toMinorUnits(item.amountSar),
        0,
      );
      if (eligibleTotalMinor !== proposedTotalMinor) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_PROPOSAL_ZERO_DELTA_VIOLATION);
      }

      // 10. Financial mutations: update installments (preserving current paymentStatus).
      for (const item of proposedSchedule) {
        await tx.installment.updateMany({
          where: { id: item.installmentId, tenantId, contractId: contract.id },
          data: {
            amountSar: item.amountSar,
            dueDate: new Date(item.dueDate),
          },
        });
      }

      // 11. PaymentPlan update: re-read resulting active installments.
      const activeInstallments = await tx.installment.findMany({
        where: {
          tenantId,
          contractId: contract.id,
          paymentStatus: { not: INSTALLMENT_STATUS.CANCELLED },
        },
        orderBy: [{ installmentNumber: "asc" }, { id: "asc" }],
      });

      const resultingPlanScheduleJson = activeInstallments.map((item: any) => ({
        installmentNumber: item.installmentNumber,
        amountSar: roundMoney(Number(item.amountSar)),
        dueDate:
          item.dueDate instanceof Date
            ? item.dueDate.toISOString()
            : new Date(item.dueDate).toISOString(),
      }));

      const resultingPlanVersion = paymentPlan.version + 1;
      const planUpdate = await tx.paymentPlan.updateMany({
        where: { id: paymentPlan.id, tenantId },
        data: {
          scheduleJson: resultingPlanScheduleJson,
          installmentCount: activeInstallments.length,
          version: { increment: 1 },
          lastAmendedAt: appliedAt,
        },
      });
      if (planUpdate.count !== 1) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_CONCURRENT_CONFLICT);
      }

      // 12. Contract update: guarded version increment.
      const resultingContractVersion = contract.version + 1;
      const contractUpdate = await tx.contract.updateMany({
        where: { id: contract.id, tenantId, version: contract.version },
        data: { version: { increment: 1 } },
      });
      if (contractUpdate.count !== 1) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_CONCURRENT_CONFLICT);
      }

      // 13. Create AMENDMENT_RESULT snapshot.
      const approvalSnapshot: AmendmentResultApprovalSnapshot = {
        amendmentId: amendment.id,
        sourceSnapshotId: amendment.sourceSnapshotId,
        sourceContractVersion: amendment.sourceContractVersion,
        approvedBy: amendment.approvedBy,
        approvedAt: amendment.approvedAt.toISOString(),
        appliedBy: userId,
        appliedAt: appliedAt.toISOString(),
      };

      const structuredFacts = {
        contract: {
          id: contract.id,
          tenantId: contract.tenantId,
          status: contract.status,
          version: resultingContractVersion,
          spineVersion: contract.spineVersion,
          legacyFinancial: contract.legacyFinancial,
          totalVolumeSar: textOrNull(contract.totalVolumeSar),
          vatType: contract.vatType,
          vatRate: textOrNull(contract.vatRate),
        },
        saleInvoice: {
          id: invoice.id,
          invoiceNumber: textOrNull(invoice.invoiceNumber),
          invoicePrefix: textOrNull(invoice.invoicePrefix),
          subtotal: textOrNull(invoice.subtotal),
          vatAmount: textOrNull(invoice.vatAmount),
          totalAmount: textOrNull(invoice.totalAmount),
          status: invoice.status,
        },
      };

      const paymentPlanSnapshot = {
        id: paymentPlan.id,
        template: paymentPlan.template,
        status: paymentPlan.status,
        totalAmount: textOrNull(paymentPlan.totalAmount),
        scheduleJson: JSON.parse(canonicalSerialize(resultingPlanScheduleJson)),
        installmentCount: activeInstallments.length,
        version: resultingPlanVersion,
        activatedAt: paymentPlan.activatedAt
          ? paymentPlan.activatedAt.toISOString()
          : null,
        lastAmendedAt: appliedAt.toISOString(),
        installments: [...activeInstallments]
          .sort((left: any, right: any) =>
            left.installmentNumber !== right.installmentNumber
              ? left.installmentNumber - right.installmentNumber
              : String(left.id).localeCompare(String(right.id)),
          )
          .map((item: any) => ({
            id: item.id,
            installmentNumber: item.installmentNumber,
            amountSar: textOrNull(item.amountSar),
            dueDate: isoDateOnly(item.dueDate instanceof Date ? item.dueDate : new Date(item.dueDate)),
            paymentStatus: item.paymentStatus,
            paidAmount: textOrNull(paidAmountForInstallment(item)),
          })),
      };

      const renderedContent = canonicalSerialize({
        structuredFacts,
        paymentPlanSnapshot,
        approvalSnapshot,
      });

      const digest = canonicalSha256({
        tenantId,
        contractId: contract.id,
        contractVersion: resultingContractVersion,
        snapshotType: AMENDMENT_RESULT_SNAPSHOT_TYPE,
        structuredFacts,
        paymentPlanSnapshot,
        approvalSnapshot,
      });

      const resultingSnapshot = await tx.contractSnapshot.create({
        data: {
          tenantId,
          contractId: contract.id,
          contractVersion: resultingContractVersion,
          snapshotType: AMENDMENT_RESULT_SNAPSHOT_TYPE,
          draftId: null,
          templateVersionId: null,
          signatureEvidenceHash: null,
          signedAt: null,
          clauseSnapshot: [],
          approvalSnapshot: approvalSnapshot as unknown as Prisma.InputJsonValue,
          renderedContent,
          structuredFacts: structuredFacts as unknown as Prisma.InputJsonValue,
          paymentPlanSnapshot: paymentPlanSnapshot as unknown as Prisma.InputJsonValue,
          digest,
          createdBy: userId,
          issuedAt: appliedAt,
        },
      });

      // 14. Finalize ContractAmendment: APPROVED -> APPLIED with resultingSnapshotId.
      const amendmentUpdate = await (tx as any).contractAmendment.updateMany({
        where: { id: amendment.id, tenantId, status: "APPROVED" },
        data: {
          status: "APPLIED",
          resultingSnapshotId: resultingSnapshot.id,
        },
      });
      if (amendmentUpdate.count !== 1) {
        throw new AmendmentApplyError(AMENDMENT_APPLY_NOT_APPROVED);
      }

      const appliedAmendment = await (tx as any).contractAmendment.findFirst({
        where: { id: amendment.id, tenantId },
      });

      // 15. Deal Event: amendment.applied with DealPassport status preservation.
      const deal = await resolveDealInTx(tx, {
        tenantId,
        contractId: contract.id,
        actorId: eventActorId,
        correlationId,
      });

      if (deal.passport) {
        await appendDealEventInTx(tx, {
          tenantId,
          dealId: deal.passport.id,
          eventType: "amendment.applied",
          idempotencyKey,
          correlationId,
          actorId: eventActorId,
          entityType: "amendment",
          entityId: amendment.id,
          occurredAt: appliedAt,
          beforeState: {
            status: "APPROVED",
            contractVersion: contract.version,
            paymentPlanVersion: paymentPlan.version,
          },
          afterState: {
            status: "APPLIED",
            contractVersion: resultingContractVersion,
            paymentPlanVersion: resultingPlanVersion,
            resultingSnapshotId: resultingSnapshot.id,
          },
          payload: {
            contractId: contract.id,
            sourceSnapshotId: amendment.sourceSnapshotId,
            resultingSnapshotId: resultingSnapshot.id,
            sourceContractVersion: amendment.sourceContractVersion,
            resultingContractVersion,
            appliedBy: userId,
            requestDigest,
          },
          projection: { contractId: contract.id },
        });
      }

      return {
        amendment: appliedAmendment,
        resultingSnapshot,
        contract: {
          id: contract.id,
          version: resultingContractVersion,
        },
        paymentPlan: {
          id: paymentPlan.id,
          version: resultingPlanVersion,
        },
        idempotent: false as const,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
