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
import {
  appendDealEventInTx,
  ensureDealCorrelationId,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";

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

        const existingSnapshot = await tx.contractSnapshot.findFirst({
          where: {
            tenantId: input.tenantId,
            draftId: input.draftId,
            snapshotType: "ISSUED",
          },
          select: { id: true },
        });

        const snapshot = await persistCanonicalIssuedSnapshotWithTx(tx, {
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

        if (!existingSnapshot && snapshot.contractId) {
          const correlationId =
            ensureDealCorrelationId(undefined, "contract-snapshot");
          const deal = await resolveDealInTx(tx, {
            tenantId: input.tenantId,
            contractId: snapshot.contractId,
            actorId: input.createdBy ?? null,
            correlationId,
          });
          if (deal.passport) {
            await appendDealEventInTx(tx, {
              tenantId: input.tenantId,
              dealId: deal.passport.id,
              eventType: "contract.snapshot.created",
              idempotencyKey: `contract.snapshot.created:${snapshot.id}`,
              correlationId,
              causationId: deal.passport.lastEventId || null,
              actorId: input.createdBy ?? null,
              entityType: "snapshot",
              entityId: snapshot.id,
              beforeState: null,
              afterState: {
                snapshotType: "ISSUED",
                digest: snapshot.digest,
              },
              payload: {
                snapshotId: snapshot.id,
                draftId: snapshot.draftId,
                contractId: snapshot.contractId,
                templateVersionId: snapshot.templateVersionId,
                digest: snapshot.digest,
              },
              projection: {
                contractId: snapshot.contractId,
              },
            });
          }
        }

        return snapshot;
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
