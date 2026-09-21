import "server-only";

import { prisma } from "@/lib/prisma";
import { dateOnlyString, RentFlexP1Error } from "./rent-flex-12-persistence-contract";

export type RentFlexSelectionListOptions = Readonly<{
  mode?: "DIRECT_MONTHLY_EJAR" | "EXTERNAL_RNPL_12";
  status?: "DRAFT" | "SELECTED" | "LOCKED" | "CANCELLED";
  unitId?: string;
  rentalLeaseId?: string;
  limit?: number;
}>;

function decimalString(value: { toFixed(digits: number): string } | null): string | null {
  return value ? value.toFixed(2) : null;
}

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function selectionSummary(selection: {
  id: string;
  unitId: string;
  leadId: string | null;
  rentalLeaseId: string | null;
  financeCaseId: string | null;
  selectedProviderOfferId: string | null;
  mode: string;
  annualRentAmount: { toFixed(digits: number): string };
  currency: string;
  firstDueDate: Date;
  status: string;
  selectedAt: Date | null;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: selection.id,
    unitId: selection.unitId,
    leadId: selection.leadId,
    rentalLeaseId: selection.rentalLeaseId,
    financeCaseId: selection.financeCaseId,
    selectedProviderOfferId: selection.selectedProviderOfferId,
    mode: selection.mode,
    annualRentAmount: selection.annualRentAmount.toFixed(2),
    currency: selection.currency,
    firstDueDate: dateOnlyString(selection.firstDueDate),
    status: selection.status,
    selectedAt: iso(selection.selectedAt),
    lockedAt: iso(selection.lockedAt),
    createdAt: selection.createdAt.toISOString(),
    updatedAt: selection.updatedAt.toISOString(),
  };
}

export async function getRentFlexUnitConfigReadModel(
  tenantId: string,
  unitId: string,
) {
  if (!tenantId || !unitId) {
    throw new RentFlexP1Error("RENT_FLEX_P2_READ_IDENTITY_REQUIRED");
  }

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, tenantId },
    select: { id: true },
  });
  if (!unit) {
    throw new RentFlexP1Error("RENT_FLEX_P1_UNIT_NOT_FOUND_FOR_TENANT");
  }

  const config = await prisma.rentFlexUnitConfig.findFirst({
    where: { tenantId, unitId },
    select: {
      id: true,
      unitId: true,
      externalRnplEnabled: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return config
    ? {
        ...config,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      }
    : null;
}

export async function listRentFlexSelectionsReadModel(
  tenantId: string,
  options: RentFlexSelectionListOptions = {},
) {
  if (!tenantId) {
    throw new RentFlexP1Error("RENT_FLEX_P2_READ_IDENTITY_REQUIRED");
  }

  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const selections = await prisma.rentFlexSelection.findMany({
    where: {
      tenantId,
      ...(options.mode ? { mode: options.mode } : {}),
      ...(options.status ? { status: options.status } : {}),
      ...(options.unitId ? { unitId: options.unitId } : {}),
      ...(options.rentalLeaseId ? { rentalLeaseId: options.rentalLeaseId } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: {
      id: true,
      unitId: true,
      leadId: true,
      rentalLeaseId: true,
      financeCaseId: true,
      selectedProviderOfferId: true,
      mode: true,
      annualRentAmount: true,
      currency: true,
      firstDueDate: true,
      status: true,
      selectedAt: true,
      lockedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return selections.map(selectionSummary);
}

export async function getRentFlexSelectionReadModel(
  tenantId: string,
  selectionId: string,
) {
  if (!tenantId || !selectionId) {
    throw new RentFlexP1Error("RENT_FLEX_P2_READ_IDENTITY_REQUIRED");
  }

  const selection = await prisma.rentFlexSelection.findFirst({
    where: { id: selectionId, tenantId },
  });
  if (!selection) {
    throw new RentFlexP1Error("RENT_FLEX_P1_SELECTION_NOT_FOUND_FOR_TENANT");
  }

  const financeAuthority = selection.financeCaseId
    ? await prisma.financeCase.findFirst({
        where: { id: selection.financeCaseId, tenantId },
        select: {
          internalStatus: true,
          authorityStatus: true,
          authorityProvider: true,
          authorityReference: true,
        },
      })
    : null;

  const offers = selection.financeCaseId
    ? await prisma.financeProviderOffer.findMany({
        where: { tenantId, financeCaseId: selection.financeCaseId },
        orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          provider: true,
          productName: true,
          recordStatus: true,
          providerReference: true,
          amount: true,
          downPayment: true,
          monthlyPayment: true,
          fees: true,
          termMonths: true,
          expiresAt: true,
          receivedAt: true,
          selectedAt: true,
        },
      })
    : [];

  const offerIds = offers.map((offer) => offer.id);
  const terms = offerIds.length
    ? await prisma.rentFlexOfferTerms.findMany({
        where: { tenantId, financeProviderOfferId: { in: offerIds } },
      })
    : [];
  const termsByOffer = new Map(terms.map((item) => [item.financeProviderOfferId, item]));

  const settlement = await prisma.rentFlexSettlement.findFirst({
    where: { tenantId, rentFlexSelectionId: selection.id },
    select: {
      id: true,
      financeCaseId: true,
      financeProviderOfferId: true,
      rentalLeaseId: true,
      expectedAmount: true,
      receivedAmount: true,
      currency: true,
      status: true,
      providerReference: true,
      receivedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const providerApprovalLifecycleStates = new Set([
    "PROVIDER_APPROVED",
    "READY_FOR_TRANSACTION",
    "COMPLETED",
  ]);

  return {
    ...selectionSummary(selection),
    companySchedule: selection.companyScheduleJson,
    scheduleDigest: selection.scheduleDigest,
    offers: offers.map((offer) => {
      const rentFlexTerms = termsByOffer.get(offer.id);
      const canonicalProviderApproval = Boolean(
        selection.selectedProviderOfferId === offer.id &&
          financeAuthority &&
          financeAuthority.authorityStatus === "APPROVED" &&
          financeAuthority.authorityProvider &&
          financeAuthority.authorityReference &&
          offer.provider &&
          offer.providerReference &&
          financeAuthority.authorityProvider === offer.provider &&
          financeAuthority.authorityReference === offer.providerReference &&
          providerApprovalLifecycleStates.has(financeAuthority.internalStatus),
      );
      return {
        id: offer.id,
        provider: offer.provider,
        productName: offer.productName,
        recordStatus: offer.recordStatus,
        authorityStatus: canonicalProviderApproval ? "APPROVED" : null,
        providerReference: offer.providerReference,
        amount: decimalString(offer.amount),
        downPayment: decimalString(offer.downPayment),
        monthlyPayment: decimalString(offer.monthlyPayment),
        fees: decimalString(offer.fees),
        termMonths: offer.termMonths,
        expiresAt: iso(offer.expiresAt),
        receivedAt: offer.receivedAt.toISOString(),
        selectedAt: iso(offer.selectedAt),
        rentFlexTerms: rentFlexTerms
          ? {
              ownerSettlementAmount: rentFlexTerms.ownerSettlementAmount.toFixed(2),
              totalTenantPayable: rentFlexTerms.totalTenantPayable.toFixed(2),
              tenantCostDelta: rentFlexTerms.tenantCostDelta.toFixed(2),
              firstDueDate: dateOnlyString(rentFlexTerms.firstDueDate),
              repaymentSchedule: rentFlexTerms.repaymentScheduleJson,
              quoteDigest: rentFlexTerms.quoteDigest,
            }
          : null,
      };
    }),
    settlement: settlement
      ? {
          id: settlement.id,
          financeCaseId: settlement.financeCaseId,
          financeProviderOfferId: settlement.financeProviderOfferId,
          rentalLeaseId: settlement.rentalLeaseId,
          expectedAmount: settlement.expectedAmount.toFixed(2),
          receivedAmount: decimalString(settlement.receivedAmount),
          currency: settlement.currency,
          status: settlement.status,
          providerReference: settlement.providerReference,
          receivedAt: iso(settlement.receivedAt),
          createdAt: settlement.createdAt.toISOString(),
          updatedAt: settlement.updatedAt.toISOString(),
        }
      : null,
  };
}
