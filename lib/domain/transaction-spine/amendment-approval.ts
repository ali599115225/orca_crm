import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  appendDealEventInTx,
  ensureDealCorrelationId,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";
import { canonicalSha256 } from "./signed-contract-snapshot";
import { AMENDMENT_SNAPSHOT_TYPE } from "./amendment-draft";
import { CONTRACT_STATUS } from "./constants";
import type { ApproveAmendmentInput } from "./types";

export const AMENDMENT_APPROVAL_CONTRACT_NOT_FOUND = "AMENDMENT_APPROVAL_CONTRACT_NOT_FOUND";
export const AMENDMENT_APPROVAL_NOT_FOUND = "AMENDMENT_APPROVAL_NOT_FOUND";
export const AMENDMENT_APPROVAL_CONTRACT_MISMATCH = "AMENDMENT_APPROVAL_CONTRACT_MISMATCH";
export const AMENDMENT_APPROVAL_NOT_DRAFT = "AMENDMENT_APPROVAL_NOT_DRAFT";
export const AMENDMENT_APPROVAL_CONTRACT_NOT_ELIGIBLE = "AMENDMENT_APPROVAL_CONTRACT_NOT_ELIGIBLE";
export const AMENDMENT_APPROVAL_STALE_VERSION = "AMENDMENT_APPROVAL_STALE_VERSION";
export const AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_MISSING = "AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_MISSING";
export const AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_INVALID = "AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_INVALID";
export const AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_DIGEST_MISMATCH =
  "AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_DIGEST_MISMATCH";
export const AMENDMENT_APPROVAL_SELF_APPROVAL_REJECTED = "AMENDMENT_APPROVAL_SELF_APPROVAL_REJECTED";
export const AMENDMENT_APPROVAL_IDEMPOTENCY_KEY_TYPE_MISMATCH =
  "AMENDMENT_APPROVAL_IDEMPOTENCY_KEY_TYPE_MISMATCH";
export const AMENDMENT_APPROVAL_IDEMPOTENCY_KEY_CONTENT_CONFLICT =
  "AMENDMENT_APPROVAL_IDEMPOTENCY_KEY_CONTENT_CONFLICT";

export class AmendmentApprovalError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "AmendmentApprovalError";
  }
}

function hashAmendmentApprovalIdempotencyKey(tenantId: string, contractId: string, key: string): string {
  return createHash("sha256")
    .update(`${tenantId}:${contractId}:AMENDMENT_APPROVE:${key}`)
    .digest("hex");
}

function computeApprovalRequestDigest(input: {
  tenantId: string;
  contractId: string;
  amendmentId: string;
  approvedBy: string;
}): string {
  return canonicalSha256({
    tenantId: input.tenantId,
    contractId: input.contractId,
    amendmentId: input.amendmentId,
    approvedBy: input.approvedBy,
  });
}

/**
 * Read-side verification of a stored AMENDMENT_SOURCE snapshot: recomputes
 * its digest from the exact same identity+facts tuple the draft-creation
 * builder used, and fails closed on any mismatch (tamper or corruption).
 */
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
    throw new AmendmentApprovalError(AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_DIGEST_MISMATCH);
  }
}

/**
 * Canonical amendment DRAFT -> APPROVED transition (design-freeze F3-3).
 * No Contract.version increment, no financial mutation, no AMENDMENT_RESULT
 * snapshot — all deferred to a future APPLY stage. Atomic with the
 * amendment.approved DealEvent, in one Serializable transaction.
 */
export async function approveAmendmentDraft(input: ApproveAmendmentInput) {
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

  const idempotencyKey = hashAmendmentApprovalIdempotencyKey(tenantId, contractId, idempotencyKeyRaw);
  const requestDigest = computeApprovalRequestDigest({
    tenantId,
    contractId,
    amendmentId,
    approvedBy: userId,
  });

  return prisma.$transaction(
    async (tx) => {
      // 1. Explicit pre-write idempotency lookup — first operation.
      const existingEvent = await tx.dealEvent.findFirst({
        where: { tenantId, idempotencyKey },
      });
      if (existingEvent) {
        if (existingEvent.eventType !== "amendment.approved" || existingEvent.entityType !== "amendment") {
          throw new AmendmentApprovalError(AMENDMENT_APPROVAL_IDEMPOTENCY_KEY_TYPE_MISMATCH);
        }
        if (existingEvent.entityId !== amendmentId) {
          throw new AmendmentApprovalError(AMENDMENT_APPROVAL_IDEMPOTENCY_KEY_TYPE_MISMATCH);
        }
        const existingAmendment = await (tx as any).contractAmendment.findFirst({
          where: { id: amendmentId, tenantId },
        });
        if (!existingAmendment || existingAmendment.contractId !== contractId) {
          throw new AmendmentApprovalError(AMENDMENT_APPROVAL_IDEMPOTENCY_KEY_TYPE_MISMATCH);
        }
        const payload = (existingEvent.payload as any) || {};
        if (payload.requestDigest !== requestDigest) {
          throw new AmendmentApprovalError(AMENDMENT_APPROVAL_IDEMPOTENCY_KEY_CONTENT_CONFLICT);
        }
        return { amendment: existingAmendment, idempotent: true as const };
      }

      // 2. Tenant-owned Contract + ContractAmendment.
      const contract = await tx.contract.findFirst({
        where: { id: contractId, tenantId },
      });
      if (!contract) throw new AmendmentApprovalError(AMENDMENT_APPROVAL_CONTRACT_NOT_FOUND);

      const amendment = await (tx as any).contractAmendment.findFirst({
        where: { id: amendmentId, tenantId },
      });
      if (!amendment) throw new AmendmentApprovalError(AMENDMENT_APPROVAL_NOT_FOUND);
      if (amendment.contractId !== contractId) {
        throw new AmendmentApprovalError(AMENDMENT_APPROVAL_CONTRACT_MISMATCH);
      }
      if (amendment.status !== "DRAFT") {
        throw new AmendmentApprovalError(AMENDMENT_APPROVAL_NOT_DRAFT);
      }

      // 3. Contract must remain eligible and unchanged since DRAFT creation.
      if (
        contract.status !== CONTRACT_STATUS.SIGNED ||
        contract.spineVersion < 2 ||
        contract.legacyFinancial
      ) {
        throw new AmendmentApprovalError(AMENDMENT_APPROVAL_CONTRACT_NOT_ELIGIBLE);
      }
      if (contract.version !== amendment.sourceContractVersion) {
        throw new AmendmentApprovalError(AMENDMENT_APPROVAL_STALE_VERSION);
      }

      // 4. Source snapshot must exist, be the right type/identity, and its
      // digest must still verify against its own persisted facts.
      const sourceSnapshot = await tx.contractSnapshot.findFirst({
        where: { id: amendment.sourceSnapshotId, tenantId },
      });
      if (!sourceSnapshot) {
        throw new AmendmentApprovalError(AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_MISSING);
      }
      if (
        sourceSnapshot.snapshotType !== AMENDMENT_SNAPSHOT_TYPE ||
        sourceSnapshot.contractId !== contractId ||
        sourceSnapshot.contractVersion !== amendment.sourceContractVersion
      ) {
        throw new AmendmentApprovalError(AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_INVALID);
      }
      verifyAmendmentSourceSnapshotDigest(sourceSnapshot);

      // 5. Self-approval guard.
      if (!amendment.createdBy || amendment.createdBy === userId) {
        throw new AmendmentApprovalError(AMENDMENT_APPROVAL_SELF_APPROVAL_REJECTED);
      }

      // 6. Atomic transition: DRAFT -> APPROVED only (no version increment,
      // no financial mutation, no AMENDMENT_RESULT snapshot). Conditioned on
      // status = DRAFT at write time as a defensive state-transition guard.
      const approvedAt = new Date();
      const updated = await (tx as any).contractAmendment.updateMany({
        where: { id: amendment.id, tenantId, status: "DRAFT" },
        data: {
          status: "APPROVED",
          approvedBy: userId,
          approvedAt,
        },
      });
      if (updated.count !== 1) {
        throw new AmendmentApprovalError(AMENDMENT_APPROVAL_NOT_DRAFT);
      }
      const approvedAmendment = await (tx as any).contractAmendment.findFirst({
        where: { id: amendment.id, tenantId },
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
          eventType: "amendment.approved",
          idempotencyKey,
          correlationId,
          actorId: eventActorId,
          entityType: "amendment",
          entityId: amendment.id,
          beforeState: { status: "DRAFT" },
          afterState: {
            status: "APPROVED",
            sourceContractVersion: amendment.sourceContractVersion,
          },
          payload: {
            contractId: contract.id,
            sourceSnapshotId: amendment.sourceSnapshotId,
            sourceContractVersion: amendment.sourceContractVersion,
            approvedBy: userId,
            requestDigest,
          },
          projection: { contractId: contract.id },
        });
      }

      return { amendment: approvedAmendment, idempotent: false as const };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
