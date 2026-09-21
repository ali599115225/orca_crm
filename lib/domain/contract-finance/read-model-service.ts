import "server-only";

import { prisma } from "@/lib/prisma";
import { readContractSnapshot } from "./contract-snapshot-service";

export class W1eReadModelError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "W1eReadModelError";
  }
}

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;
const MAX_EVENT_LIMIT = 100;

function requireTenantId(tenantId: string): void {
  if (!tenantId) throw new W1eReadModelError("W1E_READ_TENANT_REQUIRED");
}

function boundedLimit(limit?: number): number {
  if (limit === undefined) return DEFAULT_LIST_LIMIT;
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new W1eReadModelError("W1E_READ_LIMIT_INVALID");
  }
  return Math.min(limit, MAX_LIST_LIMIT);
}

export type FinanceCaseListOptions = {
  internalStatus?: string;
  limit?: number;
};

export async function listFinanceCasesReadModel(
  tenantId: string,
  options: FinanceCaseListOptions = {},
) {
  requireTenantId(tenantId);
  const take = boundedLimit(options.limit);

  return await prisma.financeCase.findMany({
    where: {
      tenantId,
      ...(options.internalStatus
        ? { internalStatus: options.internalStatus }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      caseNumber: true,
      leadId: true,
      unitId: true,
      contractId: true,
      purpose: true,
      propertySource: true,
      internalStatus: true,
      authorityStatus: true,
      authorityProvider: true,
      authorityReference: true,
      requestedAmount: true,
      propertyValue: true,
      downPayment: true,
      termMonths: true,
      annualRate: true,
      monthlyIncome: true,
      monthlyCommitments: true,
      advisoryDsrLimit: true,
      createdBy: true,
      updatedBy: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          providerOffers: true,
          events: true,
          contractDrafts: true,
        },
      },
    },
  });
}

export async function getFinanceCaseReadModel(
  tenantId: string,
  financeCaseId: string,
) {
  requireTenantId(tenantId);
  if (!financeCaseId) {
    throw new W1eReadModelError("W1E_FINANCE_CASE_ID_REQUIRED");
  }

  return await prisma.financeCase.findFirst({
    where: { id: financeCaseId, tenantId },
    select: {
      id: true,
      caseNumber: true,
      leadId: true,
      unitId: true,
      contractId: true,
      purpose: true,
      propertySource: true,
      internalStatus: true,
      authorityStatus: true,
      authorityProvider: true,
      authorityReference: true,
      requestedAmount: true,
      propertyValue: true,
      downPayment: true,
      termMonths: true,
      annualRate: true,
      monthlyIncome: true,
      monthlyCommitments: true,
      advisoryDsrLimit: true,
      metadata: true,
      createdBy: true,
      updatedBy: true,
      createdAt: true,
      updatedAt: true,
      providerOffers: {
        orderBy: { receivedAt: "desc" },
        select: {
          id: true,
          provider: true,
          productName: true,
          recordStatus: true,
          authorityStatus: true,
          providerReference: true,
          amount: true,
          downPayment: true,
          monthlyPayment: true,
          fees: true,
          termMonths: true,
          annualRate: true,
          expiresAt: true,
          evidenceJson: true,
          receivedAt: true,
          selectedAt: true,
        },
      },
      events: {
        orderBy: { occurredAt: "desc" },
        take: MAX_EVENT_LIMIT,
        select: {
          id: true,
          eventType: true,
          internalStatus: true,
          authorityStatus: true,
          provider: true,
          actorId: true,
          evidenceJson: true,
          occurredAt: true,
        },
      },
      contractDrafts: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          templateId: true,
          templateVersionId: true,
          contractId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

export type ContractDraftListOptions = {
  status?: string;
  financeCaseId?: string;
  contractId?: string;
  limit?: number;
};

export async function listContractDraftsReadModel(
  tenantId: string,
  options: ContractDraftListOptions = {},
) {
  requireTenantId(tenantId);
  const take = boundedLimit(options.limit);

  return await prisma.contractDraft.findMany({
    where: {
      tenantId,
      ...(options.status ? { status: options.status } : {}),
      ...(options.financeCaseId ? { financeCaseId: options.financeCaseId } : {}),
      ...(options.contractId ? { contractId: options.contractId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      templateId: true,
      templateVersionId: true,
      contractId: true,
      financeCaseId: true,
      title: true,
      status: true,
      createdBy: true,
      updatedBy: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          approvals: true,
          snapshots: true,
        },
      },
    },
  });
}

export async function getContractDraftReadModel(
  tenantId: string,
  draftId: string,
) {
  requireTenantId(tenantId);
  if (!draftId) throw new W1eReadModelError("W1E_DRAFT_ID_REQUIRED");

  return await prisma.contractDraft.findFirst({
    where: { id: draftId, tenantId },
    select: {
      id: true,
      templateId: true,
      templateVersionId: true,
      contractId: true,
      financeCaseId: true,
      title: true,
      status: true,
      contentJson: true,
      dataBindingsJson: true,
      clauseOverridesJson: true,
      createdBy: true,
      updatedBy: true,
      createdAt: true,
      updatedAt: true,
      template: {
        select: {
          id: true,
          code: true,
          name: true,
          contractType: true,
          status: true,
        },
      },
      templateVersion: {
        select: {
          id: true,
          version: true,
          status: true,
          publishedAt: true,
        },
      },
      financeCase: {
        select: {
          id: true,
          caseNumber: true,
          internalStatus: true,
          authorityStatus: true,
          authorityProvider: true,
          authorityReference: true,
        },
      },
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
      snapshots: {
        orderBy: { issuedAt: "desc" },
        select: {
          id: true,
          contractId: true,
          templateVersionId: true,
          snapshotType: true,
          digest: true,
          createdBy: true,
          issuedAt: true,
          signedAt: true,
        },
      },
    },
  });
}

export async function getContractSnapshotReadModel(
  tenantId: string,
  snapshotId: string,
) {
  requireTenantId(tenantId);
  if (!snapshotId) {
    throw new W1eReadModelError("W1E_SNAPSHOT_ID_REQUIRED");
  }

  return await readContractSnapshot(tenantId, snapshotId);
}
