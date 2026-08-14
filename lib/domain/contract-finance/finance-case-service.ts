import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertW1LegacyReferenceIntegrity } from "./legacy-reference-guard";

export class W1FinanceLifecycleError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "W1FinanceLifecycleError";
  }
}

export type FinanceInternalStatus =
  | "DRAFT"
  | "ASSESSMENT"
  | "READY_FOR_SUBMISSION"
  | "AWAITING_PROVIDER"
  | "OFFERS_RECEIVED"
  | "OFFER_SELECTED"
  | "PROVIDER_APPROVED"
  | "READY_FOR_TRANSACTION"
  | "COMPLETED"
  | "CANCELLED";

const FINANCE_INTERNAL_STATUSES = new Set<FinanceInternalStatus>([
  "DRAFT",
  "ASSESSMENT",
  "READY_FOR_SUBMISSION",
  "AWAITING_PROVIDER",
  "OFFERS_RECEIVED",
  "OFFER_SELECTED",
  "PROVIDER_APPROVED",
  "READY_FOR_TRANSACTION",
  "COMPLETED",
  "CANCELLED",
]);

const NEXT_STATUS: Record<Exclude<FinanceInternalStatus, "COMPLETED" | "CANCELLED">, readonly FinanceInternalStatus[]> = {
  DRAFT: ["ASSESSMENT", "CANCELLED"],
  ASSESSMENT: ["READY_FOR_SUBMISSION", "CANCELLED"],
  READY_FOR_SUBMISSION: ["AWAITING_PROVIDER", "CANCELLED"],
  AWAITING_PROVIDER: ["OFFERS_RECEIVED", "CANCELLED"],
  OFFERS_RECEIVED: ["OFFER_SELECTED", "CANCELLED"],
  OFFER_SELECTED: ["PROVIDER_APPROVED", "CANCELLED"],
  PROVIDER_APPROVED: ["READY_FOR_TRANSACTION", "CANCELLED"],
  READY_FOR_TRANSACTION: ["COMPLETED", "CANCELLED"],
};

export function isFinanceInternalStatus(value: string): value is FinanceInternalStatus {
  return FINANCE_INTERNAL_STATUSES.has(value as FinanceInternalStatus);
}

export function isFinanceInternalTransitionAllowed(
  from: FinanceInternalStatus,
  to: FinanceInternalStatus,
): boolean {
  if (from === "COMPLETED" || from === "CANCELLED") return false;
  return NEXT_STATUS[from].includes(to);
}

export type CreateFinanceCaseInput = {
  tenantId: string;
  caseNumber: string;
  leadId?: string | null;
  unitId?: string | null;
  contractId?: string | null;
  purpose: string;
  propertySource: string;
  requestedAmount?: Prisma.Decimal | number | string | null;
  propertyValue?: Prisma.Decimal | number | string | null;
  downPayment?: Prisma.Decimal | number | string | null;
  termMonths?: number | null;
  annualRate?: Prisma.Decimal | number | string | null;
  monthlyIncome?: Prisma.Decimal | number | string | null;
  monthlyCommitments?: Prisma.Decimal | number | string | null;
  advisoryDsrLimit?: Prisma.Decimal | number | string | null;
  metadata?: Prisma.InputJsonValue;
  createdBy: string;
};

export type RecordFinanceAuthorityInput = {
  tenantId: string;
  financeCaseId: string;
  authorityStatus: string;
  provider: string;
  providerReference: string;
  evidenceJson: Prisma.InputJsonValue;
  actorId: string;
};

export async function createFinanceCase(input: CreateFinanceCaseInput) {
  if (
    !input.tenantId ||
    !input.caseNumber.trim() ||
    !input.purpose.trim() ||
    !input.propertySource.trim() ||
    !input.createdBy
  ) {
    throw new W1FinanceLifecycleError("W1_FINANCE_CASE_REQUIRED_FIELDS_MISSING");
  }

  return await prisma.$transaction(
    async (tx) => {
      await assertW1LegacyReferenceIntegrity(
        {
          tenantId: input.tenantId,
          leadId: input.leadId,
          unitId: input.unitId,
          contractId: input.contractId,
        },
        {
          async findLead(tenantId, id) {
            return await tx.lead.findFirst({ where: { id, tenantId }, select: { id: true } });
          },
          async findUnit(tenantId, id) {
            return await tx.unit.findFirst({ where: { id, tenantId }, select: { id: true } });
          },
          async findContract(tenantId, id) {
            return await tx.contract.findFirst({
              where: { id, tenantId },
              select: { id: true, unitId: true, leadId: true },
            });
          },
        },
      );

      const financeCase = await tx.financeCase.create({
        data: {
          tenantId: input.tenantId,
          caseNumber: input.caseNumber.trim(),
          leadId: input.leadId ?? null,
          unitId: input.unitId ?? null,
          contractId: input.contractId ?? null,
          purpose: input.purpose.trim(),
          propertySource: input.propertySource.trim(),
          internalStatus: "DRAFT",
          authorityStatus: null,
          authorityProvider: null,
          authorityReference: null,
          requestedAmount: input.requestedAmount ?? null,
          propertyValue: input.propertyValue ?? null,
          downPayment: input.downPayment ?? null,
          termMonths: input.termMonths ?? null,
          annualRate: input.annualRate ?? null,
          monthlyIncome: input.monthlyIncome ?? null,
          monthlyCommitments: input.monthlyCommitments ?? null,
          advisoryDsrLimit: input.advisoryDsrLimit ?? null,
          metadata: input.metadata ?? {},
          createdBy: input.createdBy,
          updatedBy: input.createdBy,
        },
      });

      await tx.financeCaseEvent.create({
        data: {
          tenantId: input.tenantId,
          financeCaseId: financeCase.id,
          eventType: "finance_case.created",
          internalStatus: "DRAFT",
          actorId: input.createdBy,
        },
      });

      return financeCase;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function transitionFinanceCaseInternalStatus(
  tenantId: string,
  financeCaseId: string,
  nextStatus: FinanceInternalStatus,
  actorId: string,
) {
  if (!tenantId || !financeCaseId || !actorId) {
    throw new W1FinanceLifecycleError("W1_FINANCE_TRANSITION_IDENTITY_REQUIRED");
  }

  return await prisma.$transaction(
    async (tx) => {
      const financeCase = await tx.financeCase.findFirst({
        where: { id: financeCaseId, tenantId },
        select: {
          id: true,
          internalStatus: true,
          authorityStatus: true,
          authorityProvider: true,
          authorityReference: true,
        },
      });
      if (!financeCase) {
        throw new W1FinanceLifecycleError("W1_FINANCE_CASE_NOT_FOUND_FOR_TENANT");
      }
      if (!isFinanceInternalStatus(financeCase.internalStatus)) {
        throw new W1FinanceLifecycleError("W1_FINANCE_INTERNAL_STATE_UNKNOWN");
      }

      const currentStatus = financeCase.internalStatus;
      if (!isFinanceInternalTransitionAllowed(currentStatus, nextStatus)) {
        throw new W1FinanceLifecycleError("W1_FINANCE_INTERNAL_TRANSITION_INVALID");
      }

      let providerApprovalEvidenceEventId: string | null = null;
      let selectedProviderOfferId: string | null = null;
      if (nextStatus === "PROVIDER_APPROVED" || nextStatus === "READY_FOR_TRANSACTION") {
        if (
          financeCase.authorityStatus !== "APPROVED" ||
          !financeCase.authorityProvider ||
          !financeCase.authorityReference
        ) {
          throw new W1FinanceLifecycleError("W1_FINANCE_PROVIDER_APPROVAL_EVIDENCE_REQUIRED");
        }

        const selectedOffer = await tx.financeProviderOffer.findFirst({
          where: {
            tenantId,
            financeCaseId: financeCase.id,
            recordStatus: "SELECTED",
          },
          select: { id: true, provider: true, providerReference: true },
        });
        if (
          !selectedOffer ||
          selectedOffer.provider !== financeCase.authorityProvider ||
          !selectedOffer.providerReference
        ) {
          throw new W1FinanceLifecycleError("W1_FINANCE_SELECTED_OFFER_PROVIDER_MISMATCH");
        }
        selectedProviderOfferId = selectedOffer.id;

        const providerApprovalEvidence = await tx.financeCaseEvent.findFirst({
          where: {
            tenantId,
            financeCaseId: financeCase.id,
            eventType: "finance_case.authority_evidence_recorded",
            authorityStatus: "APPROVED",
            provider: financeCase.authorityProvider,
          },
          orderBy: { occurredAt: "desc" },
          select: { id: true, evidenceJson: true },
        });

        if (!providerApprovalEvidence?.evidenceJson) {
          throw new W1FinanceLifecycleError("W1_FINANCE_PROVIDER_APPROVAL_EVIDENCE_REQUIRED");
        }
        providerApprovalEvidenceEventId = providerApprovalEvidence.id;
      }

      const updated = await tx.financeCase.update({
        where: { id: financeCase.id },
        data: { internalStatus: nextStatus, updatedBy: actorId },
      });

      await tx.financeCaseEvent.create({
        data: {
          tenantId,
          financeCaseId: financeCase.id,
          eventType: "finance_case.internal_status_changed",
          internalStatus: nextStatus,
          actorId,
          evidenceJson: {
            from: currentStatus,
            to: nextStatus,
            providerApprovalEvidenceEventId,
            selectedProviderOfferId,
          },
        },
      });

      return updated;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function recordFinanceAuthorityEvidence(input: RecordFinanceAuthorityInput) {
  if (
    !input.tenantId ||
    !input.financeCaseId ||
    !input.authorityStatus.trim() ||
    !input.provider.trim() ||
    !input.providerReference.trim() ||
    !input.actorId ||
    input.evidenceJson === null
  ) {
    throw new W1FinanceLifecycleError("W1_FINANCE_AUTHORITY_EVIDENCE_REQUIRED");
  }

  return await prisma.$transaction(
    async (tx) => {
      const financeCase = await tx.financeCase.findFirst({
        where: { id: input.financeCaseId, tenantId: input.tenantId },
        select: { id: true, internalStatus: true },
      });
      if (!financeCase) {
        throw new W1FinanceLifecycleError("W1_FINANCE_CASE_NOT_FOUND_FOR_TENANT");
      }
      if (!isFinanceInternalStatus(financeCase.internalStatus)) {
        throw new W1FinanceLifecycleError("W1_FINANCE_INTERNAL_STATE_UNKNOWN");
      }

      const updated = await tx.financeCase.update({
        where: { id: financeCase.id },
        data: {
          authorityStatus: input.authorityStatus.trim(),
          authorityProvider: input.provider.trim(),
          authorityReference: input.providerReference.trim(),
          updatedBy: input.actorId,
        },
      });

      await tx.financeCaseEvent.create({
        data: {
          tenantId: input.tenantId,
          financeCaseId: financeCase.id,
          eventType: "finance_case.authority_evidence_recorded",
          internalStatus: financeCase.internalStatus,
          authorityStatus: input.authorityStatus.trim(),
          provider: input.provider.trim(),
          actorId: input.actorId,
          evidenceJson: {
            providerReference: input.providerReference.trim(),
            evidence: input.evidenceJson,
          },
        },
      });

      return updated;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
