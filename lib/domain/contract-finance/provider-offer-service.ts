import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isFinanceInternalStatus } from "./finance-case-service";

export class W1ProviderOfferError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "W1ProviderOfferError";
  }
}

export type RecordProviderOfferInput = {
  tenantId: string;
  financeCaseId: string;
  provider: string;
  providerReference: string;
  productName?: string | null;
  amount: Prisma.Decimal | number | string;
  downPayment?: Prisma.Decimal | number | string | null;
  monthlyPayment?: Prisma.Decimal | number | string | null;
  fees?: Prisma.Decimal | number | string | null;
  termMonths: number;
  annualRate?: Prisma.Decimal | number | string | null;
  expiresAt?: Date | null;
  evidenceJson: Prisma.InputJsonValue;
  actorId: string;
};

function assertPositiveMoney(value: Prisma.Decimal | number | string, code: string): void {
  const decimal = new Prisma.Decimal(value);
  if (!decimal.isFinite() || decimal.lte(0)) {
    throw new W1ProviderOfferError(code);
  }
}

export async function recordProviderOffer(input: RecordProviderOfferInput) {
  if (
    !input.tenantId ||
    !input.financeCaseId ||
    !input.provider.trim() ||
    !input.providerReference.trim() ||
    !input.actorId ||
    input.evidenceJson === null ||
    !Number.isInteger(input.termMonths) ||
    input.termMonths <= 0
  ) {
    throw new W1ProviderOfferError("W1_PROVIDER_OFFER_REQUIRED_FIELDS_MISSING");
  }
  assertPositiveMoney(input.amount, "W1_PROVIDER_OFFER_AMOUNT_INVALID");

  return await prisma.$transaction(
    async (tx) => {
      const financeCase = await tx.financeCase.findFirst({
        where: { id: input.financeCaseId, tenantId: input.tenantId },
        select: { id: true, internalStatus: true },
      });
      if (!financeCase) {
        throw new W1ProviderOfferError("W1_PROVIDER_OFFER_CASE_NOT_FOUND_FOR_TENANT");
      }
      if (!isFinanceInternalStatus(financeCase.internalStatus)) {
        throw new W1ProviderOfferError("W1_PROVIDER_OFFER_CASE_STATE_UNKNOWN");
      }
      if (
        financeCase.internalStatus !== "AWAITING_PROVIDER" &&
        financeCase.internalStatus !== "OFFERS_RECEIVED"
      ) {
        throw new W1ProviderOfferError("W1_PROVIDER_OFFER_CASE_STATE_INVALID");
      }

      const existing = await tx.financeProviderOffer.findFirst({
        where: {
          tenantId: input.tenantId,
          financeCaseId: financeCase.id,
          provider: input.provider.trim(),
          providerReference: input.providerReference.trim(),
        },
      });
      if (existing) return existing;

      const offer = await tx.financeProviderOffer.create({
        data: {
          tenantId: input.tenantId,
          financeCaseId: financeCase.id,
          provider: input.provider.trim(),
          productName: input.productName?.trim() || null,
          recordStatus: "RECEIVED",
          authorityStatus: null,
          providerReference: input.providerReference.trim(),
          amount: input.amount,
          downPayment: input.downPayment ?? null,
          monthlyPayment: input.monthlyPayment ?? null,
          fees: input.fees ?? null,
          termMonths: input.termMonths,
          annualRate: input.annualRate ?? null,
          expiresAt: input.expiresAt ?? null,
          evidenceJson: input.evidenceJson,
        },
      });

      const nextStatus =
        financeCase.internalStatus === "AWAITING_PROVIDER"
          ? "OFFERS_RECEIVED"
          : financeCase.internalStatus;

      if (nextStatus !== financeCase.internalStatus) {
        await tx.financeCase.update({
          where: { id: financeCase.id },
          data: { internalStatus: nextStatus, updatedBy: input.actorId },
        });
      }

      await tx.financeCaseEvent.create({
        data: {
          tenantId: input.tenantId,
          financeCaseId: financeCase.id,
          eventType: "finance_case.provider_offer_received",
          internalStatus: nextStatus,
          provider: offer.provider,
          actorId: input.actorId,
          evidenceJson: {
            offerId: offer.id,
            providerReference: offer.providerReference,
            evidence: input.evidenceJson,
          },
        },
      });

      return offer;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function selectProviderOffer(
  tenantId: string,
  financeCaseId: string,
  offerId: string,
  actorId: string,
) {
  if (!tenantId || !financeCaseId || !offerId || !actorId) {
    throw new W1ProviderOfferError("W1_PROVIDER_OFFER_SELECTION_IDENTITY_REQUIRED");
  }

  return await prisma.$transaction(
    async (tx) => {
      const financeCase = await tx.financeCase.findFirst({
        where: { id: financeCaseId, tenantId },
        select: { id: true, internalStatus: true },
      });
      if (!financeCase) {
        throw new W1ProviderOfferError("W1_PROVIDER_OFFER_CASE_NOT_FOUND_FOR_TENANT");
      }

      const offer = await tx.financeProviderOffer.findFirst({
        where: { id: offerId, tenantId, financeCaseId: financeCase.id },
      });
      if (!offer) {
        throw new W1ProviderOfferError("W1_PROVIDER_OFFER_NOT_FOUND_FOR_TENANT");
      }

      if (financeCase.internalStatus === "OFFER_SELECTED") {
        if (offer.recordStatus === "SELECTED") return offer;
        throw new W1ProviderOfferError("W1_PROVIDER_OFFER_ALREADY_SELECTED");
      }
      if (financeCase.internalStatus !== "OFFERS_RECEIVED") {
        throw new W1ProviderOfferError("W1_PROVIDER_OFFER_SELECTION_CASE_STATE_INVALID");
      }
      if (offer.recordStatus !== "RECEIVED") {
        throw new W1ProviderOfferError("W1_PROVIDER_OFFER_SELECTION_OFFER_STATE_INVALID");
      }
      if (offer.expiresAt && offer.expiresAt.getTime() <= Date.now()) {
        throw new W1ProviderOfferError("W1_PROVIDER_OFFER_EXPIRED");
      }

      const alreadySelected = await tx.financeProviderOffer.findFirst({
        where: {
          tenantId,
          financeCaseId: financeCase.id,
          recordStatus: "SELECTED",
        },
        select: { id: true },
      });
      if (alreadySelected && alreadySelected.id !== offer.id) {
        throw new W1ProviderOfferError("W1_PROVIDER_OFFER_ALREADY_SELECTED");
      }

      const selectedAt = new Date();
      const selected = await tx.financeProviderOffer.update({
        where: { id: offer.id },
        data: { recordStatus: "SELECTED", selectedAt },
      });

      await tx.financeCase.update({
        where: { id: financeCase.id },
        data: { internalStatus: "OFFER_SELECTED", updatedBy: actorId },
      });

      await tx.financeCaseEvent.create({
        data: {
          tenantId,
          financeCaseId: financeCase.id,
          eventType: "finance_case.provider_offer_selected",
          internalStatus: "OFFER_SELECTED",
          provider: selected.provider,
          actorId,
          evidenceJson: {
            offerId: selected.id,
            providerReference: selected.providerReference,
            selectedAt: selectedAt.toISOString(),
          },
        },
      });

      return selected;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
