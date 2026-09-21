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

type NormalizedProviderOffer = {
  provider: string;
  providerReference: string;
  productName: string | null;
  amount: Prisma.Decimal;
  downPayment: Prisma.Decimal | null;
  monthlyPayment: Prisma.Decimal | null;
  fees: Prisma.Decimal | null;
  termMonths: number;
  annualRate: Prisma.Decimal | null;
  expiresAt: Date | null;
};

type PersistedProviderOffer = {
  productName: string | null;
  amount: Prisma.Decimal | null;
  downPayment: Prisma.Decimal | null;
  monthlyPayment: Prisma.Decimal | null;
  fees: Prisma.Decimal | null;
  termMonths: number | null;
  annualRate: Prisma.Decimal | null;
  expiresAt: Date | null;
};

type ProviderOfferSelectionDb = Pick<
  typeof prisma,
  "financeCase" | "financeProviderOffer" | "financeCaseEvent"
>;

function decimalOrError(
  value: Prisma.Decimal | number | string,
  code: string,
): Prisma.Decimal {
  try {
    const decimal = new Prisma.Decimal(value);
    if (!decimal.isFinite()) throw new Error("non-finite");
    return decimal;
  } catch {
    throw new W1ProviderOfferError(code);
  }
}

function optionalDecimalOrError(
  value: Prisma.Decimal | number | string | null | undefined,
  code: string,
): Prisma.Decimal | null {
  if (value === null || value === undefined) return null;
  return decimalOrError(value, code);
}

function decimalEqual(
  left: Prisma.Decimal | null,
  right: Prisma.Decimal | null,
): boolean {
  if (left === null || right === null) return left === right;
  return left.eq(right);
}

function providerOfferMatches(
  existing: PersistedProviderOffer,
  normalized: NormalizedProviderOffer,
): boolean {
  return (
    existing.productName === normalized.productName &&
    decimalEqual(existing.amount, normalized.amount) &&
    decimalEqual(existing.downPayment, normalized.downPayment) &&
    decimalEqual(existing.monthlyPayment, normalized.monthlyPayment) &&
    decimalEqual(existing.fees, normalized.fees) &&
    existing.termMonths === normalized.termMonths &&
    decimalEqual(existing.annualRate, normalized.annualRate) &&
    (existing.expiresAt?.getTime() ?? null) ===
      (normalized.expiresAt?.getTime() ?? null)
  );
}

function normalizeProviderOffer(
  input: RecordProviderOfferInput,
): NormalizedProviderOffer {
  const amount = decimalOrError(
    input.amount,
    "W1_PROVIDER_OFFER_AMOUNT_INVALID",
  );
  if (amount.lte(0)) {
    throw new W1ProviderOfferError("W1_PROVIDER_OFFER_AMOUNT_INVALID");
  }

  if (input.expiresAt && Number.isNaN(input.expiresAt.getTime())) {
    throw new W1ProviderOfferError("W1_PROVIDER_OFFER_EXPIRY_INVALID");
  }

  return {
    provider: input.provider.trim(),
    providerReference: input.providerReference.trim(),
    productName: input.productName?.trim() || null,
    amount,
    downPayment: optionalDecimalOrError(
      input.downPayment,
      "W1_PROVIDER_OFFER_NUMERIC_INVALID",
    ),
    monthlyPayment: optionalDecimalOrError(
      input.monthlyPayment,
      "W1_PROVIDER_OFFER_NUMERIC_INVALID",
    ),
    fees: optionalDecimalOrError(
      input.fees,
      "W1_PROVIDER_OFFER_NUMERIC_INVALID",
    ),
    termMonths: input.termMonths,
    annualRate: optionalDecimalOrError(
      input.annualRate,
      "W1_PROVIDER_OFFER_NUMERIC_INVALID",
    ),
    expiresAt: input.expiresAt ?? null,
  };
}

export async function recordProviderOffer(input: RecordProviderOfferInput) {
  if (
    !input.tenantId ||
    !input.financeCaseId ||
    !input.provider.trim() ||
    !input.providerReference.trim() ||
    !input.actorId ||
    input.evidenceJson === null ||
    input.evidenceJson === undefined ||
    !Number.isInteger(input.termMonths) ||
    input.termMonths <= 0
  ) {
    throw new W1ProviderOfferError("W1_PROVIDER_OFFER_REQUIRED_FIELDS_MISSING");
  }

  const normalized = normalizeProviderOffer(input);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const financeCase = await tx.financeCase.findFirst({
          where: { id: input.financeCaseId, tenantId: input.tenantId },
          select: { id: true, internalStatus: true },
        });
        if (!financeCase) {
          throw new W1ProviderOfferError(
            "W1_PROVIDER_OFFER_CASE_NOT_FOUND_FOR_TENANT",
          );
        }
        if (!isFinanceInternalStatus(financeCase.internalStatus)) {
          throw new W1ProviderOfferError(
            "W1_PROVIDER_OFFER_CASE_STATE_UNKNOWN",
          );
        }
        if (
          financeCase.internalStatus !== "AWAITING_PROVIDER" &&
          financeCase.internalStatus !== "OFFERS_RECEIVED"
        ) {
          throw new W1ProviderOfferError(
            "W1_PROVIDER_OFFER_CASE_STATE_INVALID",
          );
        }

        const existing = await tx.financeProviderOffer.findFirst({
          where: {
            tenantId: input.tenantId,
            financeCaseId: financeCase.id,
            provider: normalized.provider,
            providerReference: normalized.providerReference,
          },
        });
        if (existing) {
          if (providerOfferMatches(existing, normalized)) return existing;
          throw new W1ProviderOfferError(
            "W1_PROVIDER_OFFER_REFERENCE_CONFLICT",
          );
        }

        const offer = await tx.financeProviderOffer.create({
          data: {
            tenantId: input.tenantId,
            financeCaseId: financeCase.id,
            provider: normalized.provider,
            productName: normalized.productName,
            recordStatus: "RECEIVED",
            authorityStatus: null,
            providerReference: normalized.providerReference,
            amount: normalized.amount,
            downPayment: normalized.downPayment,
            monthlyPayment: normalized.monthlyPayment,
            fees: normalized.fees,
            termMonths: normalized.termMonths,
            annualRate: normalized.annualRate,
            expiresAt: normalized.expiresAt,
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
            data: {
              internalStatus: nextStatus,
              updatedBy: input.actorId,
            },
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
  } catch (error) {
    if (error instanceof W1ProviderOfferError) throw error;

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.financeProviderOffer.findFirst({
        where: {
          tenantId: input.tenantId,
          financeCaseId: input.financeCaseId,
          provider: normalized.provider,
          providerReference: normalized.providerReference,
        },
      });
      if (existing && providerOfferMatches(existing, normalized)) {
        return existing;
      }
      throw new W1ProviderOfferError("W1_PROVIDER_OFFER_REFERENCE_CONFLICT");
    }

    throw error;
  }
}

export async function selectProviderOfferInTransaction(
  db: ProviderOfferSelectionDb,
  tenantId: string,
  financeCaseId: string,
  offerId: string,
  actorId: string,
) {
  if (!tenantId || !financeCaseId || !offerId || !actorId) {
    throw new W1ProviderOfferError(
      "W1_PROVIDER_OFFER_SELECTION_IDENTITY_REQUIRED",
    );
  }

  const financeCase = await db.financeCase.findFirst({
    where: { id: financeCaseId, tenantId },
    select: { id: true, internalStatus: true },
  });
  if (!financeCase) {
    throw new W1ProviderOfferError(
      "W1_PROVIDER_OFFER_CASE_NOT_FOUND_FOR_TENANT",
    );
  }

  const offer = await db.financeProviderOffer.findFirst({
    where: { id: offerId, tenantId, financeCaseId: financeCase.id },
  });
  if (!offer) {
    throw new W1ProviderOfferError(
      "W1_PROVIDER_OFFER_NOT_FOUND_FOR_TENANT",
    );
  }

  if (financeCase.internalStatus === "OFFER_SELECTED") {
    if (offer.recordStatus === "SELECTED") return offer;
    throw new W1ProviderOfferError("W1_PROVIDER_OFFER_ALREADY_SELECTED");
  }
  if (financeCase.internalStatus !== "OFFERS_RECEIVED") {
    throw new W1ProviderOfferError(
      "W1_PROVIDER_OFFER_SELECTION_CASE_STATE_INVALID",
    );
  }
  if (offer.recordStatus !== "RECEIVED") {
    throw new W1ProviderOfferError(
      "W1_PROVIDER_OFFER_SELECTION_OFFER_STATE_INVALID",
    );
  }
  if (offer.expiresAt && offer.expiresAt.getTime() <= Date.now()) {
    throw new W1ProviderOfferError("W1_PROVIDER_OFFER_EXPIRED");
  }

  const alreadySelected = await db.financeProviderOffer.findFirst({
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
  const selected = await db.financeProviderOffer.update({
    where: { id: offer.id },
    data: { recordStatus: "SELECTED", selectedAt },
  });

  await db.financeCase.update({
    where: { id: financeCase.id },
    data: { internalStatus: "OFFER_SELECTED", updatedBy: actorId },
  });

  await db.financeCaseEvent.create({
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
}

export async function selectProviderOffer(
  tenantId: string,
  financeCaseId: string,
  offerId: string,
  actorId: string,
) {
  return prisma.$transaction(
    (tx) =>
      selectProviderOfferInTransaction(
        tx,
        tenantId,
        financeCaseId,
        offerId,
        actorId,
      ),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
