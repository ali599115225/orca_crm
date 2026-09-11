import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assembleCanonicalContractSnapshotWithTx,
  type CanonicalContractSnapshotAssembly,
} from "./canonical-snapshot-assembler";
import { renderCanonicalContract } from "./contract-renderer";
import {
  computeContractSnapshotDigest,
  persistCanonicalIssuedSnapshotWithTx,
  W1SnapshotIntegrityError,
} from "./contract-snapshot-service";

export type CanonicalContractSnapshotIssuanceInput = {
  tenantId: string;
  draftId: string;
  createdBy?: string | null;
};

function canonicalDigest(
  input: CanonicalContractSnapshotIssuanceInput,
  assembly: CanonicalContractSnapshotAssembly,
  renderedContent: string,
): string {
  return computeContractSnapshotDigest({
    tenantId: input.tenantId,
    draftId: input.draftId,
    templateVersionId: assembly.templateVersionId,
    contractId: assembly.contractId,
    snapshotType: "ISSUED",
    renderedContent,
    structuredFacts: assembly.structuredFacts,
    clauseSnapshot: assembly.clauseSnapshot,
    paymentPlanSnapshot: assembly.paymentPlanSnapshot,
    approvalSnapshot: assembly.approvalSnapshot,
    signedAt: null,
  });
}

export async function issueCanonicalApprovedContractSnapshot(
  input: CanonicalContractSnapshotIssuanceInput,
) {
  if (!input.tenantId || !input.draftId) {
    throw new W1SnapshotIntegrityError("W1_SNAPSHOT_REQUIRED_IDENTITY_MISSING");
  }

  let attemptedAssembly: CanonicalContractSnapshotAssembly | null = null;
  let attemptedRenderedContent: string | null = null;

  try {
    return await prisma.$transaction(
      async (tx) => {
        const assembly = await assembleCanonicalContractSnapshotWithTx(tx, {
          tenantId: input.tenantId,
          draftId: input.draftId,
        });
        const renderedContent = renderCanonicalContract({
          sourceContentJson: assembly.sourceContentJson,
          structuredFacts: assembly.structuredFacts,
          clauseSnapshot: assembly.clauseSnapshot,
        });

        attemptedAssembly = assembly;
        attemptedRenderedContent = renderedContent;

        return await persistCanonicalIssuedSnapshotWithTx(tx, {
          tenantId: input.tenantId,
          draftId: input.draftId,
          templateVersionId: assembly.templateVersionId,
          contractId: assembly.contractId,
          renderedContent,
          structuredFacts: assembly.structuredFacts,
          clauseSnapshot: assembly.clauseSnapshot,
          paymentPlanSnapshot: assembly.paymentPlanSnapshot,
          approvalSnapshot: assembly.approvalSnapshot,
          createdBy: input.createdBy ?? null,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof W1SnapshotIntegrityError) throw error;

    if (
      attemptedAssembly &&
      attemptedRenderedContent !== null &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const attemptedDigest = canonicalDigest(input, attemptedAssembly, attemptedRenderedContent);
      const existing = await prisma.contractSnapshot.findFirst({
        where: {
          tenantId: input.tenantId,
          draftId: input.draftId,
          snapshotType: "ISSUED",
        },
      });
      if (existing?.digest === attemptedDigest) return existing;
      throw new W1SnapshotIntegrityError("W1_SNAPSHOT_ALREADY_ISSUED_DIFFERENT_DIGEST");
    }

    throw error;
  }
}
