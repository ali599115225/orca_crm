import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class W1CanonicalSnapshotAssemblyError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "W1CanonicalSnapshotAssemblyError";
  }
}

export type CanonicalContractSnapshotAssemblyInput = {
  tenantId: string;
  draftId: string;
};

export type CanonicalContractSnapshotAssembly = {
  tenantId: string;
  draftId: string;
  templateVersionId: string;
  contractId: string | null;
  sourceContentJson: Prisma.JsonValue;
  structuredFacts: Prisma.InputJsonValue;
  clauseSnapshot: Prisma.InputJsonValue;
  paymentPlanSnapshot?: Prisma.InputJsonValue;
  approvalSnapshot: Prisma.InputJsonValue;
};

function decimalString(value: Prisma.Decimal | null): string | null {
  return value?.toString() ?? null;
}

function dateString(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function snapshotJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function assembleCanonicalContractSnapshot(
  input: CanonicalContractSnapshotAssemblyInput,
): Promise<CanonicalContractSnapshotAssembly> {
  if (!input.tenantId || !input.draftId) {
    throw new W1CanonicalSnapshotAssemblyError("W1_CANONICAL_SNAPSHOT_IDENTITY_REQUIRED");
  }

  return await prisma.$transaction(
    async (tx) => {
      const draft = await tx.contractDraft.findFirst({
        where: { id: input.draftId, tenantId: input.tenantId },
        select: {
          id: true,
          tenantId: true,
          templateId: true,
          templateVersionId: true,
          contractId: true,
          financeCaseId: true,
          title: true,
          status: true,
          contentJson: true,
          dataBindingsJson: true,
          clauseOverridesJson: true,
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
              structureJson: true,
              variableSchemaJson: true,
              publishedAt: true,
            },
          },
          approvals: {
            orderBy: [{ requestedAt: "asc" }, { id: "asc" }],
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
          financeCase: {
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
              providerOffers: {
                where: { recordStatus: "SELECTED" },
                orderBy: [{ selectedAt: "asc" }, { id: "asc" }],
                take: 2,
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
            },
          },
        },
      });

      if (!draft) {
        throw new W1CanonicalSnapshotAssemblyError(
          "W1_CANONICAL_SNAPSHOT_DRAFT_NOT_FOUND_FOR_TENANT",
        );
      }
      if (draft.status !== "APPROVED") {
        throw new W1CanonicalSnapshotAssemblyError("W1_CANONICAL_SNAPSHOT_DRAFT_NOT_APPROVED");
      }
      if (draft.approvals.length === 0) {
        throw new W1CanonicalSnapshotAssemblyError("W1_CANONICAL_SNAPSHOT_APPROVALS_REQUIRED");
      }
      if (draft.approvals.some((approval) => approval.status !== "APPROVED")) {
        throw new W1CanonicalSnapshotAssemblyError(
          "W1_CANONICAL_SNAPSHOT_APPROVAL_PENDING_OR_REJECTED",
        );
      }
      if (draft.financeCase?.providerOffers && draft.financeCase.providerOffers.length > 1) {
        throw new W1CanonicalSnapshotAssemblyError(
          "W1_CANONICAL_SNAPSHOT_MULTIPLE_SELECTED_PROVIDER_OFFERS",
        );
      }
      if (
        draft.contractId &&
        draft.financeCase?.contractId &&
        draft.contractId !== draft.financeCase.contractId
      ) {
        throw new W1CanonicalSnapshotAssemblyError(
          "W1_CANONICAL_SNAPSHOT_FINANCE_CONTRACT_MISMATCH",
        );
      }

      const contract = draft.contractId
        ? await tx.contract.findFirst({
            where: { id: draft.contractId, tenantId: input.tenantId },
            select: {
              id: true,
              unitId: true,
              leadId: true,
              offerId: true,
              buyerName: true,
              buyerPhone: true,
              totalVolumeSar: true,
              acceptedAt: true,
              reservationExpiresAt: true,
              signedAt: true,
              cancelledAt: true,
              cancelReason: true,
              endDate: true,
              status: true,
              version: true,
              spineVersion: true,
              legacyFinancial: true,
              legacyReason: true,
              vatType: true,
              vatRate: true,
              unit: {
                select: {
                  id: true,
                  tenantId: true,
                  projectId: true,
                  unitNumber: true,
                  floorPosition: true,
                  priceSar: true,
                  type: true,
                  area: true,
                  beds: true,
                  city: true,
                  district: true,
                  status: true,
                },
              },
              paymentPlan: {
                select: {
                  id: true,
                  tenantId: true,
                  contractId: true,
                  template: true,
                  status: true,
                  totalAmount: true,
                  scheduleJson: true,
                  installmentCount: true,
                  activatedAt: true,
                  completedAt: true,
                  version: true,
                  lastAmendedAt: true,
                },
              },
            },
          })
        : null;

      if (draft.contractId && !contract) {
        throw new W1CanonicalSnapshotAssemblyError(
          "W1_CANONICAL_SNAPSHOT_CONTRACT_NOT_FOUND_FOR_TENANT",
        );
      }
      if (contract?.unit.tenantId !== undefined && contract.unit.tenantId !== input.tenantId) {
        throw new W1CanonicalSnapshotAssemblyError(
          "W1_CANONICAL_SNAPSHOT_PROPERTY_TENANT_MISMATCH",
        );
      }
      if (contract?.paymentPlan && contract.paymentPlan.tenantId !== input.tenantId) {
        throw new W1CanonicalSnapshotAssemblyError(
          "W1_CANONICAL_SNAPSHOT_PAYMENT_PLAN_TENANT_MISMATCH",
        );
      }

      const approvalSnapshot = draft.approvals.map((approval) => ({
        id: approval.id,
        riskTier: approval.riskTier,
        status: approval.status,
        requestedBy: approval.requestedBy,
        decidedBy: approval.decidedBy,
        reason: approval.reason,
        evidenceJson: approval.evidenceJson ?? null,
        requestedAt: approval.requestedAt.toISOString(),
        decidedAt: dateString(approval.decidedAt),
      }));

      const selectedProviderOffer = draft.financeCase?.providerOffers[0] ?? null;
      const financeCaseFacts = draft.financeCase
        ? {
            id: draft.financeCase.id,
            caseNumber: draft.financeCase.caseNumber,
            leadId: draft.financeCase.leadId,
            unitId: draft.financeCase.unitId,
            contractId: draft.financeCase.contractId,
            purpose: draft.financeCase.purpose,
            propertySource: draft.financeCase.propertySource,
            internalStatus: draft.financeCase.internalStatus,
            authorityStatus: draft.financeCase.authorityStatus,
            authorityProvider: draft.financeCase.authorityProvider,
            authorityReference: draft.financeCase.authorityReference,
            requestedAmount: decimalString(draft.financeCase.requestedAmount),
            propertyValue: decimalString(draft.financeCase.propertyValue),
            downPayment: decimalString(draft.financeCase.downPayment),
            termMonths: draft.financeCase.termMonths,
            annualRate: decimalString(draft.financeCase.annualRate),
            monthlyIncome: decimalString(draft.financeCase.monthlyIncome),
            monthlyCommitments: decimalString(draft.financeCase.monthlyCommitments),
            advisoryDsrLimit: decimalString(draft.financeCase.advisoryDsrLimit),
            metadata: draft.financeCase.metadata,
            selectedProviderOffer: selectedProviderOffer
              ? {
                  id: selectedProviderOffer.id,
                  provider: selectedProviderOffer.provider,
                  productName: selectedProviderOffer.productName,
                  recordStatus: selectedProviderOffer.recordStatus,
                  authorityStatus: selectedProviderOffer.authorityStatus,
                  providerReference: selectedProviderOffer.providerReference,
                  amount: decimalString(selectedProviderOffer.amount),
                  downPayment: decimalString(selectedProviderOffer.downPayment),
                  monthlyPayment: decimalString(selectedProviderOffer.monthlyPayment),
                  fees: decimalString(selectedProviderOffer.fees),
                  termMonths: selectedProviderOffer.termMonths,
                  annualRate: decimalString(selectedProviderOffer.annualRate),
                  expiresAt: dateString(selectedProviderOffer.expiresAt),
                  evidenceJson: selectedProviderOffer.evidenceJson ?? null,
                  receivedAt: selectedProviderOffer.receivedAt.toISOString(),
                  selectedAt: dateString(selectedProviderOffer.selectedAt),
                }
              : null,
          }
        : null;

      const contractFacts = contract
        ? {
            id: contract.id,
            unitId: contract.unitId,
            leadId: contract.leadId,
            offerId: contract.offerId,
            buyerName: contract.buyerName,
            buyerPhone: contract.buyerPhone,
            totalVolumeSar: contract.totalVolumeSar.toString(),
            acceptedAt: contract.acceptedAt.toISOString(),
            reservationExpiresAt: dateString(contract.reservationExpiresAt),
            signedAt: dateString(contract.signedAt),
            cancelledAt: dateString(contract.cancelledAt),
            cancelReason: contract.cancelReason,
            endDate: dateString(contract.endDate),
            status: contract.status,
            version: contract.version,
            spineVersion: contract.spineVersion,
            legacyFinancial: contract.legacyFinancial,
            legacyReason: contract.legacyReason,
            vatType: contract.vatType,
            vatRate: contract.vatRate.toString(),
            property: {
              id: contract.unit.id,
              projectId: contract.unit.projectId,
              unitNumber: contract.unit.unitNumber,
              floorPosition: contract.unit.floorPosition,
              priceSar: contract.unit.priceSar.toString(),
              type: contract.unit.type,
              area: contract.unit.area,
              beds: contract.unit.beds,
              city: contract.unit.city,
              district: contract.unit.district,
              status: contract.unit.status,
            },
          }
        : null;

      const paymentPlanSnapshot = contract?.paymentPlan
        ? snapshotJson({
            id: contract.paymentPlan.id,
            contractId: contract.paymentPlan.contractId,
            template: contract.paymentPlan.template,
            status: contract.paymentPlan.status,
            totalAmount: contract.paymentPlan.totalAmount.toString(),
            scheduleJson: contract.paymentPlan.scheduleJson,
            installmentCount: contract.paymentPlan.installmentCount,
            activatedAt: dateString(contract.paymentPlan.activatedAt),
            completedAt: dateString(contract.paymentPlan.completedAt),
            version: contract.paymentPlan.version,
            lastAmendedAt: dateString(contract.paymentPlan.lastAmendedAt),
          })
        : undefined;

      return {
        tenantId: draft.tenantId,
        draftId: draft.id,
        templateVersionId: draft.templateVersionId,
        contractId: contract?.id ?? null,
        sourceContentJson: draft.contentJson,
        structuredFacts: snapshotJson({
          schemaVersion: "W1I_CANONICAL_SNAPSHOT_FACTS_V1",
          draft: {
            id: draft.id,
            title: draft.title,
            templateId: draft.templateId,
            templateVersionId: draft.templateVersionId,
            contractId: draft.contractId,
            financeCaseId: draft.financeCaseId,
            status: draft.status,
            createdAt: draft.createdAt.toISOString(),
            updatedAt: draft.updatedAt.toISOString(),
          },
          template: {
            id: draft.template.id,
            code: draft.template.code,
            name: draft.template.name,
            contractType: draft.template.contractType,
            status: draft.template.status,
          },
          templateVersion: {
            id: draft.templateVersion.id,
            version: draft.templateVersion.version,
            status: draft.templateVersion.status,
            variableSchemaJson: draft.templateVersion.variableSchemaJson,
            publishedAt: dateString(draft.templateVersion.publishedAt),
          },
          dataBindingsJson: draft.dataBindingsJson,
          contract: contractFacts,
          financeCase: financeCaseFacts,
        }),
        clauseSnapshot: snapshotJson({
          schemaVersion: "W1I_CLAUSE_SOURCE_V1",
          templateVersionId: draft.templateVersion.id,
          structureJson: draft.templateVersion.structureJson,
          clauseOverridesJson: draft.clauseOverridesJson,
        }),
        paymentPlanSnapshot,
        approvalSnapshot: snapshotJson(approvalSnapshot),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
