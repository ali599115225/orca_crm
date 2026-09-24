import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  appendDealEventInTx,
  ensureDealCorrelationId,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";
import { canonicalSerialize, canonicalSha256 } from "./signed-contract-snapshot";
import { CONTRACT_STATUS, INSTALLMENT_STATUS } from "./constants";
import type {
  AmendmentChangeSet,
  AmendmentScheduleProposalItem,
  CreateAmendmentDraftInput,
} from "./types";

export const AMENDMENT_SNAPSHOT_TYPE = "AMENDMENT_SOURCE";

export const AMENDMENT_CONTRACT_NOT_FOUND = "AMENDMENT_CONTRACT_NOT_FOUND";
export const AMENDMENT_CONTRACT_NOT_ELIGIBLE = "AMENDMENT_CONTRACT_NOT_ELIGIBLE";
export const AMENDMENT_SALE_INVOICE_REQUIRED = "AMENDMENT_SALE_INVOICE_REQUIRED";
export const AMENDMENT_PAYMENT_PLAN_REQUIRED = "AMENDMENT_PAYMENT_PLAN_REQUIRED";
export const AMENDMENT_PROPOSAL_EMPTY = "AMENDMENT_PROPOSAL_EMPTY";
export const AMENDMENT_PROPOSAL_INVALID_ENTRY = "AMENDMENT_PROPOSAL_INVALID_ENTRY";
export const AMENDMENT_PROPOSAL_DUPLICATE_INSTALLMENT = "AMENDMENT_PROPOSAL_DUPLICATE_INSTALLMENT";
export const AMENDMENT_PROPOSAL_FOREIGN_INSTALLMENT = "AMENDMENT_PROPOSAL_FOREIGN_INSTALLMENT";
export const AMENDMENT_PROPOSAL_MISSING_INSTALLMENT = "AMENDMENT_PROPOSAL_MISSING_INSTALLMENT";
export const AMENDMENT_PROPOSAL_INSTALLMENT_NUMBER_MISMATCH = "AMENDMENT_PROPOSAL_INSTALLMENT_NUMBER_MISMATCH";
export const AMENDMENT_PROPOSAL_ZERO_DELTA_VIOLATION = "AMENDMENT_PROPOSAL_ZERO_DELTA_VIOLATION";
export const AMENDMENT_IDEMPOTENCY_KEY_TYPE_MISMATCH = "AMENDMENT_IDEMPOTENCY_KEY_TYPE_MISMATCH";
export const AMENDMENT_IDEMPOTENCY_KEY_CONTENT_CONFLICT = "AMENDMENT_IDEMPOTENCY_KEY_CONTENT_CONFLICT";

export class AmendmentDraftError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "AmendmentDraftError";
  }
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toMinorUnits(value: number): number {
  return Math.round(roundMoney(value) * 100);
}

function normalizeDueDate(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new AmendmentDraftError(AMENDMENT_PROPOSAL_INVALID_ENTRY);
  }
  return date.toISOString().slice(0, 10);
}

function normalizeTitle(value: string): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) throw new AmendmentDraftError(AMENDMENT_PROPOSAL_INVALID_ENTRY);
  return trimmed;
}

function normalizeReason(value: string | undefined | null): string | null {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed : null;
}

/**
 * Normalizes and sorts a caller-supplied proposal deterministically
 * (installmentNumber then installmentId) so the same logical proposal
 * always produces the same requestDigest/renderedContent regardless of
 * client-side ordering.
 */
function normalizeChangeSet(input: AmendmentChangeSet): AmendmentChangeSet {
  if (!input || !Array.isArray(input.proposedSchedule) || input.proposedSchedule.length === 0) {
    throw new AmendmentDraftError(AMENDMENT_PROPOSAL_EMPTY);
  }

  const normalized: AmendmentScheduleProposalItem[] = input.proposedSchedule.map((item) => {
    if (
      !item ||
      typeof item.installmentId !== "string" ||
      !item.installmentId.trim() ||
      typeof item.installmentNumber !== "number" ||
      !Number.isInteger(item.installmentNumber) ||
      typeof item.amountSar !== "number" ||
      !Number.isFinite(item.amountSar) ||
      item.amountSar <= 0
    ) {
      throw new AmendmentDraftError(AMENDMENT_PROPOSAL_INVALID_ENTRY);
    }
    return {
      installmentId: item.installmentId.trim(),
      installmentNumber: item.installmentNumber,
      amountSar: roundMoney(item.amountSar),
      dueDate: normalizeDueDate(item.dueDate),
    };
  });

  normalized.sort((a, b) =>
    a.installmentNumber !== b.installmentNumber
      ? a.installmentNumber - b.installmentNumber
      : a.installmentId < b.installmentId
        ? -1
        : a.installmentId > b.installmentId
          ? 1
          : 0,
  );

  return { proposedSchedule: normalized };
}

function hashAmendmentIdempotencyKey(tenantId: string, contractId: string, key: string): string {
  return createHash("sha256")
    .update(`${tenantId}:${contractId}:AMENDMENT_CREATE:${key}`)
    .digest("hex");
}

function computeRequestDigest(input: {
  tenantId: string;
  contractId: string;
  title: string;
  reason: string | null;
  changesJson: AmendmentChangeSet;
}): string {
  return canonicalSha256({
    tenantId: input.tenantId,
    contractId: input.contractId,
    title: input.title,
    reason: input.reason,
    changesJson: input.changesJson,
  });
}

function isEligibleInstallment(installment: any, now: Date): boolean {
  const paid = roundMoney(
    (installment.payments || []).reduce(
      (sum: number, payment: any) =>
        payment.status === "COMPLETED" ? sum + Number(payment.netAmount) : sum,
      0,
    ),
  );
  const dueDate = installment.dueDate instanceof Date ? installment.dueDate : new Date(installment.dueDate);
  return (
    dueDate.getTime() > now.getTime() &&
    paid === 0 &&
    installment.paymentStatus !== INSTALLMENT_STATUS.PAID &&
    installment.paymentStatus !== INSTALLMENT_STATUS.CANCELLED
  );
}

function paidAmountForInstallment(installment: any): number {
  return roundMoney(
    (installment.payments || []).reduce(
      (sum: number, payment: any) =>
        payment.status === "COMPLETED" ? sum + Number(payment.netAmount) : sum,
      0,
    ),
  );
}

function textOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function isoDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * Builds the deterministic AMENDMENT_SOURCE evidence for a contract at
 * DRAFT-creation time. No wall-clock capture instant enters the digest —
 * only tenant/contract/version identity plus the structured facts
 * themselves, matching the frozen F3-2B contract.
 */
export function buildAmendmentSourceSnapshot(params: {
  tenantId: string;
  contract: any;
  invoice: any;
  paymentPlan: any;
}) {
  const { tenantId, contract, invoice, paymentPlan } = params;

  const structuredFacts = {
    contract: {
      id: contract.id,
      tenantId: contract.tenantId,
      status: contract.status,
      version: contract.version,
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
    scheduleJson: JSON.parse(canonicalSerialize(paymentPlan.scheduleJson ?? [])),
    installmentCount: paymentPlan.installmentCount,
    version: paymentPlan.version,
    activatedAt: paymentPlan.activatedAt ? paymentPlan.activatedAt.toISOString() : null,
    lastAmendedAt: paymentPlan.lastAmendedAt ? paymentPlan.lastAmendedAt.toISOString() : null,
    installments: [...(invoice.installments || [])]
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

  const renderedContent = canonicalSerialize({ structuredFacts, paymentPlanSnapshot });
  const digest = canonicalSha256({
    tenantId,
    contractId: contract.id,
    contractVersion: contract.version,
    snapshotType: AMENDMENT_SNAPSHOT_TYPE,
    structuredFacts,
    paymentPlanSnapshot,
  });

  return { structuredFacts, paymentPlanSnapshot, renderedContent, digest };
}

/**
 * Canonical amendment DRAFT creation (design-freeze F3-2/F3-2B). Creates an
 * immutable AMENDMENT_SOURCE snapshot, a ContractAmendment(status=DRAFT),
 * and appends amendment.created — all inside one Serializable transaction.
 * No approval, no apply, no financial mutation.
 */
export async function createAmendmentDraft(input: CreateAmendmentDraftInput) {
  const {
    tenantId,
    userId,
    contractId,
    actorId,
    correlationId: requestedCorrelationId,
  } = input;
  if (!userId) throw new Error("Authenticated user is required.");

  const eventActorId = actorId || userId;
  const correlationId = ensureDealCorrelationId(requestedCorrelationId, "amendment");

  const title = normalizeTitle(input.title);
  const reason = normalizeReason(input.reason);
  const changesJson = normalizeChangeSet(input.changesJson);
  const idempotencyKeyRaw = String(input.idempotencyKey || "").trim();
  if (!idempotencyKeyRaw) throw new Error("Idempotency key is required.");

  const idempotencyKey = hashAmendmentIdempotencyKey(tenantId, contractId, idempotencyKeyRaw);
  const requestDigest = computeRequestDigest({ tenantId, contractId, title, reason, changesJson });

  return prisma.$transaction(
    async (tx) => {
      // 1. Explicit pre-write idempotency lookup — first operation.
      const existingEvent = await tx.dealEvent.findFirst({
        where: { tenantId, idempotencyKey },
      });
      if (existingEvent) {
        if (existingEvent.eventType !== "amendment.created" || existingEvent.entityType !== "amendment") {
          throw new AmendmentDraftError(AMENDMENT_IDEMPOTENCY_KEY_TYPE_MISMATCH);
        }
        const existingAmendment = await (tx as any).contractAmendment.findFirst({
          where: { id: existingEvent.entityId, tenantId },
        });
        if (!existingAmendment || existingAmendment.contractId !== contractId) {
          throw new AmendmentDraftError(AMENDMENT_IDEMPOTENCY_KEY_TYPE_MISMATCH);
        }
        const payload = (existingEvent.payload as any) || {};
        if (payload.requestDigest !== requestDigest) {
          throw new AmendmentDraftError(AMENDMENT_IDEMPOTENCY_KEY_CONTENT_CONFLICT);
        }
        const existingSnapshot = await tx.contractSnapshot.findFirst({
          where: { id: existingAmendment.sourceSnapshotId, tenantId },
        });
        return {
          amendment: existingAmendment,
          sourceSnapshot: existingSnapshot,
          idempotent: true as const,
        };
      }

      // 2. Create-time eligibility guards.
      const contract = await tx.contract.findFirst({
        where: { id: contractId, tenantId },
        include: {
          invoices: {
            where: { type: "SALE" },
            include: { installments: { include: { payments: true } } },
          },
          paymentPlan: true,
        },
      });
      if (!contract) throw new AmendmentDraftError(AMENDMENT_CONTRACT_NOT_FOUND);

      if (
        contract.status !== CONTRACT_STATUS.SIGNED ||
        contract.spineVersion < 2 ||
        contract.legacyFinancial
      ) {
        throw new AmendmentDraftError(AMENDMENT_CONTRACT_NOT_ELIGIBLE);
      }

      if (contract.invoices.length !== 1) {
        throw new AmendmentDraftError(AMENDMENT_SALE_INVOICE_REQUIRED);
      }
      const invoice = contract.invoices[0];

      if (!contract.paymentPlan) {
        throw new AmendmentDraftError(AMENDMENT_PAYMENT_PLAN_REQUIRED);
      }
      const paymentPlan = contract.paymentPlan;

      const now = new Date();
      const eligible = (invoice.installments || []).filter((item: any) =>
        isEligibleInstallment(item, now),
      );
      const eligibleById = new Map(eligible.map((item: any) => [item.id as string, item]));

      const proposalIds = changesJson.proposedSchedule.map((item) => item.installmentId);
      const uniqueProposalIds = new Set(proposalIds);
      if (uniqueProposalIds.size !== proposalIds.length) {
        throw new AmendmentDraftError(AMENDMENT_PROPOSAL_DUPLICATE_INSTALLMENT);
      }
      for (const proposalItem of changesJson.proposedSchedule) {
        const realInstallment = eligibleById.get(proposalItem.installmentId);
        if (!realInstallment) {
          throw new AmendmentDraftError(AMENDMENT_PROPOSAL_FOREIGN_INSTALLMENT);
        }
        // The client may not assert an installmentNumber that differs from
        // the real, persisted one for this installmentId — it is bound
        // identity, not a free-form label.
        if (proposalItem.installmentNumber !== realInstallment.installmentNumber) {
          throw new AmendmentDraftError(AMENDMENT_PROPOSAL_INSTALLMENT_NUMBER_MISMATCH);
        }
      }
      if (uniqueProposalIds.size !== eligibleById.size) {
        throw new AmendmentDraftError(AMENDMENT_PROPOSAL_MISSING_INSTALLMENT);
      }

      const eligibleTotalMinor = eligible.reduce(
        (sum: number, item: any) => sum + toMinorUnits(Number(item.amountSar)),
        0,
      );
      const proposedTotalMinor = changesJson.proposedSchedule.reduce(
        (sum, item) => sum + toMinorUnits(item.amountSar),
        0,
      );
      if (eligibleTotalMinor !== proposedTotalMinor) {
        throw new AmendmentDraftError(AMENDMENT_PROPOSAL_ZERO_DELTA_VIOLATION);
      }

      // 3. Atomic write: AMENDMENT_SOURCE snapshot + ContractAmendment DRAFT + amendment.created.
      const built = buildAmendmentSourceSnapshot({ tenantId, contract, invoice, paymentPlan });

      const sourceSnapshot = await tx.contractSnapshot.create({
        data: {
          tenantId,
          contractId: contract.id,
          contractVersion: contract.version,
          snapshotType: AMENDMENT_SNAPSHOT_TYPE,
          draftId: null,
          templateVersionId: null,
          signatureEvidenceHash: null,
          signedAt: null,
          clauseSnapshot: [],
          approvalSnapshot: {},
          renderedContent: built.renderedContent,
          structuredFacts: built.structuredFacts,
          paymentPlanSnapshot: built.paymentPlanSnapshot,
          digest: built.digest,
          createdBy: userId,
        },
      });

      const amendment = await (tx as any).contractAmendment.create({
        data: {
          tenantId,
          contractId: contract.id,
          sourceContractVersion: contract.version,
          sourceSnapshotId: sourceSnapshot.id,
          title,
          reason,
          status: "DRAFT",
          changesJson: changesJson as unknown as Prisma.InputJsonValue,
          createdBy: userId,
        },
      });

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
          eventType: "amendment.created",
          idempotencyKey,
          correlationId,
          actorId: eventActorId,
          entityType: "amendment",
          entityId: amendment.id,
          beforeState: null,
          afterState: {
            status: "DRAFT",
            sourceContractVersion: contract.version,
            title,
          },
          payload: {
            contractId: contract.id,
            sourceSnapshotId: sourceSnapshot.id,
            requestDigest,
            title,
            reason,
          },
          projection: { contractId: contract.id },
        });
      }

      return { amendment, sourceSnapshot, idempotent: false as const };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
