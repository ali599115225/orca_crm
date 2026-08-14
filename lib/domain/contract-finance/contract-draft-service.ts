import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
  createdBy?: string | null;
};

export type RequestContractApprovalInput = {
  tenantId: string;
  draftId: string;
  riskTier: string;
  requestedBy?: string | null;
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
  if (!input.tenantId || !input.templateId || !input.templateVersionId || !input.title.trim()) {
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
          createdBy: input.createdBy ?? null,
          updatedBy: input.createdBy ?? null,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function requestContractApproval(input: RequestContractApprovalInput) {
  if (!input.tenantId || !input.draftId || !input.riskTier.trim()) {
    throw new W1ContractLifecycleError("W1_APPROVAL_REQUEST_REQUIRED_FIELDS_MISSING");
  }

  return await prisma.$transaction(
    async (tx) => {
      const draft = await tx.contractDraft.findFirst({
        where: { id: input.draftId, tenantId: input.tenantId },
        select: { id: true, status: true },
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
          requestedBy: input.requestedBy ?? null,
          reason: input.reason ?? null,
          evidenceJson: input.evidenceJson,
        },
      });

      if (draft.status === "DRAFT") {
        await tx.contractDraft.update({
          where: { id: draft.id },
          data: { status: "APPROVAL_PENDING", updatedBy: input.requestedBy ?? null },
        });
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
          draft: { select: { status: true } },
        },
      });
      if (!approval) {
        throw new W1ContractLifecycleError("W1_APPROVAL_NOT_FOUND_FOR_TENANT");
      }
      if (approval.status !== "PENDING" || approval.draft.status !== "APPROVAL_PENDING") {
        throw new W1ContractLifecycleError("W1_APPROVAL_DECISION_INVALID_STATE");
      }

      const decided = await tx.contractApproval.update({
        where: { id: approval.id },
        data: {
          status: input.decision,
          decidedBy: input.decidedBy,
          decidedAt: new Date(),
          reason: input.reason ?? null,
          evidenceJson: input.evidenceJson,
        },
      });

      if (input.decision === "REJECTED") {
        await tx.contractDraft.update({
          where: { id: approval.draftId },
          data: { status: "REJECTED", updatedBy: input.decidedBy },
        });
      }

      return decided;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
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
