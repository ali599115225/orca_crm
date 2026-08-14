import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertW1LegacyReferenceIntegrity } from "./legacy-reference-guard";

export class W1SnapshotIntegrityError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "W1SnapshotIntegrityError";
  }
}

export type ContractSnapshotIssueInput = {
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
  createdBy?: string | null;
  signedAt?: Date | null;
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

export function computeContractSnapshotDigest(input: ContractSnapshotIssueInput): string {
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

export async function issueContractSnapshot(input: ContractSnapshotIssueInput) {
  if (!input.tenantId || !input.draftId || !input.templateVersionId) {
    throw new W1SnapshotIntegrityError("W1_SNAPSHOT_REQUIRED_IDENTITY_MISSING");
  }
  if (!input.renderedContent.trim()) {
    throw new W1SnapshotIntegrityError("W1_SNAPSHOT_RENDERED_CONTENT_REQUIRED");
  }

  const draft = await prisma.contractDraft.findFirst({
    where: { id: input.draftId, tenantId: input.tenantId },
    select: {
      id: true,
      templateVersionId: true,
      contractId: true,
    },
  });

  if (!draft) {
    throw new W1SnapshotIntegrityError("W1_SNAPSHOT_DRAFT_NOT_FOUND_FOR_TENANT");
  }
  if (draft.templateVersionId !== input.templateVersionId) {
    throw new W1SnapshotIntegrityError("W1_SNAPSHOT_TEMPLATE_VERSION_MISMATCH");
  }
  if (input.contractId && draft.contractId && input.contractId !== draft.contractId) {
    throw new W1SnapshotIntegrityError("W1_SNAPSHOT_CONTRACT_MISMATCH");
  }

  const effectiveContractId = input.contractId ?? draft.contractId ?? null;
  if (effectiveContractId) {
    await assertW1LegacyReferenceIntegrity({
      tenantId: input.tenantId,
      contractId: effectiveContractId,
    });
  }

  const digest = computeContractSnapshotDigest({
    ...input,
    contractId: effectiveContractId,
  });

  return await prisma.contractSnapshot.create({
    data: {
      tenantId: input.tenantId,
      draftId: draft.id,
      contractId: effectiveContractId,
      templateVersionId: input.templateVersionId,
      snapshotType: input.snapshotType ?? "ISSUED",
      renderedContent: input.renderedContent,
      structuredFacts: input.structuredFacts,
      clauseSnapshot: input.clauseSnapshot,
      paymentPlanSnapshot: input.paymentPlanSnapshot,
      approvalSnapshot: input.approvalSnapshot,
      digest,
      createdBy: input.createdBy ?? null,
      signedAt: input.signedAt ?? null,
    },
  });
}

export async function readContractSnapshot(tenantId: string, snapshotId: string) {
  if (!tenantId || !snapshotId) {
    throw new W1SnapshotIntegrityError("W1_SNAPSHOT_READ_IDENTITY_REQUIRED");
  }

  return await prisma.contractSnapshot.findFirst({
    where: { id: snapshotId, tenantId },
  });
}
