import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class W1SnapshotIntegrityError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "W1SnapshotIntegrityError";
  }
}

export type ContractSnapshotDigestInput = {
  tenantId: string;
  draftId: string;
  templateVersionId: string;
  contractId?: string | null;
  snapshotType?: string;
  renderedContent: string;
  structuredFacts: Prisma.InputJsonValue;
  clauseSnapshot: Prisma.InputJsonValue;
  paymentPlanSnapshot?: Prisma.InputJsonValue;
  approvalSnapshot: Prisma.InputJsonValue;
  signedAt?: Date | null;
};

export type ContractSnapshotIssueInput = Omit<
  ContractSnapshotDigestInput,
  "snapshotType" | "approvalSnapshot" | "signedAt"
> & {
  createdBy?: string | null;
};

function canonicalize(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      if (record[key] !== undefined) {
        normalized[key] = canonicalize(record[key]);
      }
    }
    return normalized;
  }

  throw new W1SnapshotIntegrityError("W1_SNAPSHOT_UNSUPPORTED_DIGEST_VALUE");
}

export function computeContractSnapshotDigest(input: ContractSnapshotDigestInput): string {
  const digestPayload = canonicalize({
    tenantId: input.tenantId,
    draftId: input.draftId,
    templateVersionId: input.templateVersionId,
    contractId: input.contractId ?? null,
    snapshotType: input.snapshotType ?? "ISSUED",
    renderedContent: input.renderedContent,
    structuredFacts: input.structuredFacts,
    clauseSnapshot: input.clauseSnapshot,
    paymentPlanSnapshot: input.paymentPlanSnapshot ?? null,
    approvalSnapshot: input.approvalSnapshot,
    signedAt: input.signedAt ?? null,
  });

  return createHash("sha256").update(JSON.stringify(digestPayload), "utf8").digest("hex");
}

export async function issueApprovedContractSnapshot(input: ContractSnapshotIssueInput) {
  if (!input.tenantId || !input.draftId || !input.templateVersionId) {
    throw new W1SnapshotIntegrityError("W1_SNAPSHOT_REQUIRED_IDENTITY_MISSING");
  }
  if (!input.renderedContent.trim()) {
    throw new W1SnapshotIntegrityError("W1_SNAPSHOT_RENDERED_CONTENT_REQUIRED");
  }

  return await prisma.$transaction(
    async (tx) => {
      const draft = await tx.contractDraft.findFirst({
        where: { id: input.draftId, tenantId: input.tenantId },
        select: {
          id: true,
          status: true,
          templateVersionId: true,
          contractId: true,
          approvals: {
            orderBy: { requestedAt: "asc" },
            select: {
              id: true,
              riskTier: true,
              status: true,
              requestedBy: true,
              decidedBy: true,
              reason: true,
              evidenceJson: true,
              requestedAt: true,
              decidedAt: true,
            },
          },
        },
      });

      if (!draft) {
        throw new W1SnapshotIntegrityError("W1_SNAPSHOT_DRAFT_NOT_FOUND_FOR_TENANT");
      }
      if (draft.status !== "APPROVED") {
        throw new W1SnapshotIntegrityError("W1_SNAPSHOT_DRAFT_NOT_APPROVED");
      }
      if (draft.approvals.some((approval) => approval.status !== "APPROVED")) {
        throw new W1SnapshotIntegrityError("W1_SNAPSHOT_APPROVAL_PENDING_OR_REJECTED");
      }
      if (draft.templateVersionId !== input.templateVersionId) {
        throw new W1SnapshotIntegrityError("W1_SNAPSHOT_TEMPLATE_VERSION_MISMATCH");
      }
      if (input.contractId && draft.contractId && input.contractId !== draft.contractId) {
        throw new W1SnapshotIntegrityError("W1_SNAPSHOT_CONTRACT_MISMATCH");
      }

      const effectiveContractId = input.contractId ?? draft.contractId ?? null;
      if (effectiveContractId) {
        const contract = await tx.contract.findFirst({
          where: { id: effectiveContractId, tenantId: input.tenantId },
          select: { id: true },
        });
        if (!contract) {
          throw new W1SnapshotIntegrityError("W1_SNAPSHOT_CONTRACT_NOT_FOUND_FOR_TENANT");
        }
      }

      const approvalSnapshot: Prisma.InputJsonValue = draft.approvals.map((approval) => ({
        id: approval.id,
        riskTier: approval.riskTier,
        status: approval.status,
        requestedBy: approval.requestedBy,
        decidedBy: approval.decidedBy,
        reason: approval.reason,
        evidenceJson: approval.evidenceJson,
        requestedAt: approval.requestedAt.toISOString(),
        decidedAt: approval.decidedAt?.toISOString() ?? null,
      })) as Prisma.InputJsonValue;

      const digest = computeContractSnapshotDigest({
        ...input,
        contractId: effectiveContractId,
        snapshotType: "ISSUED",
        approvalSnapshot,
        signedAt: null,
      });

      return await tx.contractSnapshot.create({
        data: {
          tenantId: input.tenantId,
          draftId: draft.id,
          contractId: effectiveContractId,
          templateVersionId: input.templateVersionId,
          snapshotType: "ISSUED",
          renderedContent: input.renderedContent,
          structuredFacts: input.structuredFacts,
          clauseSnapshot: input.clauseSnapshot,
          paymentPlanSnapshot: input.paymentPlanSnapshot,
          approvalSnapshot,
          digest,
          createdBy: input.createdBy ?? null,
          signedAt: null,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function readContractSnapshot(tenantId: string, snapshotId: string) {
  if (!tenantId || !snapshotId) {
    throw new W1SnapshotIntegrityError("W1_SNAPSHOT_READ_IDENTITY_REQUIRED");
  }

  return await prisma.contractSnapshot.findFirst({
    where: { id: snapshotId, tenantId },
  });
}
