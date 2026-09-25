import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  appendDealEventInTx,
  ensureDealCorrelationId,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";

export class W1ContractLifecycleError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "W1ContractLifecycleError";
  }
}

export type CreateContractDraftInput = {
  tenantId: string;
  templateId: string;
  templateVersionId: string;
  contractId?: string | null;
  financeCaseId?: string | null;
  title: string;
  contentJson: Prisma.InputJsonValue;
  dataBindingsJson: Prisma.InputJsonValue;
  clauseOverridesJson?: Prisma.InputJsonValue;
  createdBy: string;
};

export type RequestContractApprovalInput = {
  tenantId: string;
  draftId: string;
  riskTier: string;
  requestedBy: string;
  reason?: string | null;
  evidenceJson?: Prisma.InputJsonValue;
};

export type DecideContractApprovalInput = {
  tenantId: string;
  approvalId: string;
  decision: "APPROVED" | "REJECTED";
  decidedBy: string;
  reason?: string | null;
  evidenceJson?: Prisma.InputJsonValue;
};

export async function createContractDraft(input: CreateContractDraftInput) {
  if (
    !input.tenantId ||
    !input.templateId ||
    !input.templateVersionId ||
    !input.title.trim() ||
    !input.createdBy
  ) {
    throw new W1ContractLifecycleError("W1_CONTRACT_DRAFT_REQUIRED_FIELDS_MISSING");
  }

  return await prisma.$transaction(
    async (tx) => {
      const templateVersion = await tx.contractTemplateVersion.findFirst({
        where: {
          id: input.templateVersionId,
          tenantId: input.tenantId,
          templateId: input.templateId,
        },
        select: {
          id: true,
          status: true,
          template: { select: { id: true, status: true } },
        },
      });

      if (!templateVersion) {
        throw new W1ContractLifecycleError("W1_TEMPLATE_VERSION_NOT_FOUND_FOR_TENANT");
      }
      if (templateVersion.template.status !== "PUBLISHED" || templateVersion.status !== "PUBLISHED") {
        throw new W1ContractLifecycleError("W1_TEMPLATE_VERSION_NOT_PUBLISHED");
      }

      let contract: { id: string } | null = null;
      if (input.contractId) {
        contract = await tx.contract.findFirst({
          where: { id: input.contractId, tenantId: input.tenantId },
          select: { id: true },
        });
        if (!contract) {
          throw new W1ContractLifecycleError("W1_CONTRACT_NOT_FOUND_FOR_TENANT");
        }
      }

      let financeCase: { id: string; contractId: string | null } | null = null;
      if (input.financeCaseId) {
        financeCase = await tx.financeCase.findFirst({
          where: { id: input.financeCaseId, tenantId: input.tenantId },
          select: { id: true, contractId: true },
        });
        if (!financeCase) {
          throw new W1ContractLifecycleError("W1_FINANCE_CASE_NOT_FOUND_FOR_TENANT");
        }
      }

      if (contract && financeCase?.contractId && financeCase.contractId !== contract.id) {
        throw new W1ContractLifecycleError("W1_DRAFT_FINANCE_CONTRACT_MISMATCH");
      }

      return await tx.contractDraft.create({
        data: {
          tenantId: input.tenantId,
          templateId: input.templateId,
          templateVersionId: input.templateVersionId,
          contractId: contract?.id ?? null,
          financeCaseId: financeCase?.id ?? null,
          title: input.title.trim(),
          status: "DRAFT",
          contentJson: input.contentJson,
          dataBindingsJson: input.dataBindingsJson,
          clauseOverridesJson: input.clauseOverridesJson ?? [],
          createdBy: input.createdBy,
          updatedBy: input.createdBy,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function requestContractApproval(input: RequestContractApprovalInput) {
  if (!input.tenantId || !input.draftId || !input.riskTier.trim() || !input.requestedBy) {
    throw new W1ContractLifecycleError("W1_APPROVAL_REQUEST_REQUIRED_FIELDS_MISSING");
  }

  return await prisma.$transaction(
    async (tx) => {
      const draft = await tx.contractDraft.findFirst({
        where: { id: input.draftId, tenantId: input.tenantId },
        select: { id: true, status: true, contractId: true },
      });
      if (!draft) {
        throw new W1ContractLifecycleError("W1_DRAFT_NOT_FOUND_FOR_TENANT");
      }
      if (draft.status !== "DRAFT" && draft.status !== "APPROVAL_PENDING") {
        throw new W1ContractLifecycleError("W1_APPROVAL_REQUEST_INVALID_DRAFT_STATE");
      }

      const approval = await tx.contractApproval.create({
        data: {
          tenantId: input.tenantId,
          draftId: draft.id,
          riskTier: input.riskTier.trim(),
          status: "PENDING",
          requestedBy: input.requestedBy,
          reason: input.reason ?? null,
          evidenceJson: input.evidenceJson,
        },
      });

      if (draft.status === "DRAFT") {
        await tx.contractDraft.update({
          where: { id: draft.id },
          data: { status: "APPROVAL_PENDING", updatedBy: input.requestedBy },
        });
      }

      if (draft.contractId !== null) {
        const correlationId =
          ensureDealCorrelationId(undefined, "contract-approval");

        const deal = await resolveDealInTx(tx, {
          tenantId: input.tenantId,
          contractId: draft.contractId,
          actorId: input.requestedBy,
          correlationId,
        });

        if (deal.passport) {
          await appendDealEventInTx(tx, {
            tenantId: input.tenantId,
            dealId: deal.passport.id,
            eventType: "contract.approval.requested",
            idempotencyKey: `contract.approval.requested:${approval.id}`,
            correlationId,
            causationId: deal.passport.lastEventId || null,
            actorType: "USER",
            actorId: input.requestedBy,
            entityType: "approval",
            entityId: approval.id,
            beforeState: {
              draftStatus: draft.status,
            },
            afterState: {
              draftStatus: "APPROVAL_PENDING",
              approvalStatus: "PENDING",
            },
            payload: {
              draftId: draft.id,
              approvalId: approval.id,
              riskTier: approval.riskTier,
              reason: approval.reason ?? null,
            },
            projection: {
              contractId: draft.contractId,
            },
          });
        }
      }

      return approval;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function decideContractApproval(input: DecideContractApprovalInput) {
  if (!input.tenantId || !input.approvalId || !input.decidedBy) {
    throw new W1ContractLifecycleError("W1_APPROVAL_DECISION_REQUIRED_FIELDS_MISSING");
  }

  return await prisma.$transaction(
    async (tx) => {
      const approval = await tx.contractApproval.findFirst({
        where: { id: input.approvalId, tenantId: input.tenantId },
        select: {
          id: true,
          status: true,
          draftId: true,
          reason: true,
          evidenceJson: true,
          requestedBy: true,
          requestedAt: true,
          draft: { select: { status: true, contractId: true } },
        },
      });
      if (!approval) {
        throw new W1ContractLifecycleError("W1_APPROVAL_NOT_FOUND_FOR_TENANT");
      }
      if (approval.status !== "PENDING" || approval.draft.status !== "APPROVAL_PENDING") {
        throw new W1ContractLifecycleError("W1_APPROVAL_DECISION_INVALID_STATE");
      }
      if (approval.requestedBy && approval.requestedBy === input.decidedBy) {
        throw new W1ContractLifecycleError("W1_APPROVAL_SELF_APPROVAL_REJECTED");
      }

      const preservedApprovalEvidence: Prisma.InputJsonValue = {
        request: {
          requestedBy: approval.requestedBy ?? "",
          requestedAt: approval.requestedAt.toISOString(),
          reason: approval.reason ?? "",
          evidence: approval.evidenceJson ?? {},
        },
        decision: {
          decidedBy: input.decidedBy,
          decision: input.decision,
          reason: input.reason ?? "",
          evidence: input.evidenceJson ?? {},
        },
      };

      const decided = await tx.contractApproval.update({
        where: { id: approval.id },
        data: {
          status: input.decision,
          decidedBy: input.decidedBy,
          decidedAt: new Date(),
          reason: input.reason ?? null,
          evidenceJson: preservedApprovalEvidence,
        },
      });

      if (input.decision === "REJECTED") {
        await tx.contractDraft.update({
          where: { id: approval.draftId },
          data: { status: "REJECTED", updatedBy: input.decidedBy },
        });
      }

      if (approval.draft.contractId !== null) {
        const correlationId =
          ensureDealCorrelationId(undefined, "contract-approval");

        const deal = await resolveDealInTx(tx, {
          tenantId: input.tenantId,
          contractId: approval.draft.contractId,
          actorId: input.decidedBy,
          correlationId,
        });

        if (deal.passport) {
          await appendDealEventInTx(tx, {
            tenantId: input.tenantId,
            dealId: deal.passport.id,
            eventType:
              input.decision === "APPROVED"
                ? "contract.approval.approved"
                : "contract.approval.rejected",
            idempotencyKey:
              input.decision === "APPROVED"
                ? `contract.approval.approved:${approval.id}`
                : `contract.approval.rejected:${approval.id}`,
            correlationId,
            causationId: deal.passport.lastEventId || null,
            actorType: "USER",
            actorId: input.decidedBy,
            entityType: "approval",
            entityId: approval.id,
            beforeState: {
              approvalStatus: "PENDING",
              draftStatus: approval.draft.status,
            },
            afterState:
              input.decision === "APPROVED"
                ? {
                    approvalStatus: "APPROVED",
                    draftStatus: approval.draft.status,
                  }
                : {
                    approvalStatus: "REJECTED",
                    draftStatus: "REJECTED",
                  },
            payload: {
              approvalId: approval.id,
              draftId: approval.draftId,
              decision: input.decision,
              reason: input.reason ?? null,
            },
            projection: {
              contractId: approval.draft.contractId,
            },
          });
        }
      }

      return decided;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/**
 * Canonical signing approval boundary (design-freeze rule 11): proves, inside
 * the signing transaction, that an approved draft canonically links to this
 * operational contract before a final signing transition may occur. Reuses
 * ContractDraft.contractId as the sole linkage (no Contract.approvedDraftId,
 * no second approval model) and the existing ISSUED ContractSnapshot as the
 * canonical approved snapshot proof.
 */
export async function assertContractApprovalBoundaryInTx(
  tx: {
    contractDraft: { findFirst: (args: any) => Promise<any> };
    contractSnapshot: { findFirst: (args: any) => Promise<any> };
  },
  tenantId: string,
  contractId: string,
): Promise<void> {
  const draft = await tx.contractDraft.findFirst({
    where: { tenantId, contractId, status: "APPROVED" },
    select: {
      id: true,
      contractId: true,
      approvals: { select: { status: true } },
    },
  });
  if (!draft || draft.contractId !== contractId) {
    throw new W1ContractLifecycleError("W1_APPROVAL_BOUNDARY_NOT_ESTABLISHED");
  }
  if (
    draft.approvals.length === 0 ||
    draft.approvals.some((approval: { status: string }) => approval.status !== "APPROVED")
  ) {
    throw new W1ContractLifecycleError("W1_APPROVAL_BOUNDARY_LIFECYCLE_INCOMPLETE");
  }

  const approvedSnapshot = await tx.contractSnapshot.findFirst({
    where: { tenantId, draftId: draft.id, snapshotType: "ISSUED" },
    select: { id: true },
  });
  if (!approvedSnapshot) {
    throw new W1ContractLifecycleError("W1_APPROVAL_BOUNDARY_SNAPSHOT_MISSING");
  }
}

export async function finalizeContractDraftApproval(
  tenantId: string,
  draftId: string,
  approvedBy: string,
) {
  if (!tenantId || !draftId || !approvedBy) {
    throw new W1ContractLifecycleError("W1_DRAFT_FINAL_APPROVAL_IDENTITY_REQUIRED");
  }

  return await prisma.$transaction(
    async (tx) => {
      const draft = await tx.contractDraft.findFirst({
        where: { id: draftId, tenantId },
        select: {
          id: true,
          status: true,
          approvals: { select: { status: true } },
        },
      });
      if (!draft) {
        throw new W1ContractLifecycleError("W1_DRAFT_NOT_FOUND_FOR_TENANT");
      }
      if (draft.status !== "APPROVAL_PENDING") {
        throw new W1ContractLifecycleError("W1_DRAFT_FINAL_APPROVAL_INVALID_STATE");
      }
      if (draft.approvals.length === 0) {
        throw new W1ContractLifecycleError("W1_DRAFT_APPROVALS_REQUIRED");
      }
      if (draft.approvals.some((approval) => approval.status !== "APPROVED")) {
        throw new W1ContractLifecycleError("W1_DRAFT_APPROVALS_INCOMPLETE");
      }

      return await tx.contractDraft.update({
        where: { id: draft.id },
        data: { status: "APPROVED", updatedBy: approvedBy },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
