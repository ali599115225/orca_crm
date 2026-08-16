import "server-only";

import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant-context";
import { selectProviderOffer } from "@/lib/domain/contract-finance/provider-offer-service";
import {
  buildDirectMonthlyEjarPlan,
  buildExternalRnpl12Quote,
  type RentFlex12Installment,
  type RentFlex12Mode,
} from "./rent-flex-12";
import {
  RentFlexP1Error,
  assertRentFlexCommandContext,
  assertRentFlexSettlementAmounts,
  dateOnlyString,
  digestRentFlexSchedule,
  isRentFlexSelectionTransitionAllowed,
  isRentFlexSettlementTransitionAllowed,
  normalizeRentFlexMoney,
  parseRentFlexDateOnly,
  parseRentFlexScheduleJson,
  type RentFlexSelectionStatus,
  type RentFlexSettlementStatus,
} from "./rent-flex-12-persistence-contract";

const RENT_FLEX_MODE_DIRECT: RentFlex12Mode = "DIRECT_MONTHLY_EJAR";
const RENT_FLEX_MODE_EXTERNAL: RentFlex12Mode = "EXTERNAL_RNPL_12";
const RENT_FLEX_PURPOSE = "RENT_FLEX_12";
const RENT_FLEX_TERM_MONTHS = 12;

type AuditWriter = Pick<typeof prisma, "auditLog">;
type RentFlexReferenceReader = Pick<typeof prisma, "unit" | "lead">;

export type RentFlexMoneyInput = Prisma.Decimal | number | string;

function requireIdentity(tenantId: string, actorId: string): void {
  assertRentFlexCommandContext(requireTenantContext(), tenantId, actorId);
}

function inputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function moneyDecimal(
  value: RentFlexMoneyInput,
  code: string,
  allowZero = false,
): Prisma.Decimal {
  const normalized = normalizeRentFlexMoney(Number(value), code, allowZero);
  return new Prisma.Decimal(normalized.toFixed(2));
}

function asSelectionStatus(value: string): RentFlexSelectionStatus {
  if (["DRAFT", "SELECTED", "LOCKED", "CANCELLED"].includes(value)) {
    return value as RentFlexSelectionStatus;
  }
  throw new RentFlexP1Error("RENT_FLEX_P1_SELECTION_STATE_UNKNOWN");
}

function asSettlementStatus(value: string): RentFlexSettlementStatus {
  if (["EXPECTED", "PARTIAL", "RECEIVED", "FAILED", "CANCELLED"].includes(value)) {
    return value as RentFlexSettlementStatus;
  }
  throw new RentFlexP1Error("RENT_FLEX_P1_SETTLEMENT_STATE_UNKNOWN");
}

function asMode(value: string): RentFlex12Mode {
  if (value === RENT_FLEX_MODE_DIRECT || value === RENT_FLEX_MODE_EXTERNAL) {
    return value;
  }
  throw new RentFlexP1Error("RENT_FLEX_P1_MODE_UNKNOWN");
}

function scheduleJson(schedule: RentFlex12Installment[]): Prisma.InputJsonValue {
  return inputJson(
    schedule.map((item) => ({
      installmentNumber: item.installmentNumber,
      dueDate: item.dueDate,
      amountSar: item.amountSar,
    })),
  );
}

function quoteDigest(input: {
  tenantId: string;
  selectionId: string;
  financeProviderOfferId: string;
  provider: string;
  providerReference: string | null;
  annualRentSar: number;
  ownerSettlementAmountSar: number;
  totalTenantPayableSar: number;
  firstDueDate: string;
  schedule: RentFlex12Installment[];
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        tenantId: input.tenantId,
        selectionId: input.selectionId,
        financeProviderOfferId: input.financeProviderOfferId,
        provider: input.provider,
        providerReference: input.providerReference,
        annualRentSar: input.annualRentSar,
        ownerSettlementAmountSar: input.ownerSettlementAmountSar,
        totalTenantPayableSar: input.totalTenantPayableSar,
        firstDueDate: input.firstDueDate,
        schedule: input.schedule,
      }),
    )
    .digest("hex");
}

async function audit(
  db: AuditWriter,
  input: {
    tenantId: string;
    actorId: string;
    action: string;
    tableName: string;
    recordId: string;
    details: Record<string, unknown>;
  },
): Promise<void> {
  await db.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.actorId,
      action: input.action,
      tableName: input.tableName,
      recordId: input.recordId,
      details: JSON.stringify(input.details),
    },
  });
}

async function assertUnitAndOptionalLead(
  db: RentFlexReferenceReader,
  tenantId: string,
  unitId: string,
  leadId?: string | null,
): Promise<void> {
  const unit = await db.unit.findFirst({
    where: { id: unitId, tenantId },
    select: { id: true },
  });
  if (!unit) {
    throw new RentFlexP1Error("RENT_FLEX_P1_UNIT_NOT_FOUND_FOR_TENANT");
  }

  if (leadId) {
    const lead = await db.lead.findFirst({
      where: { id: leadId, tenantId },
      select: { id: true },
    });
    if (!lead) {
      throw new RentFlexP1Error("RENT_FLEX_P1_LEAD_NOT_FOUND_FOR_TENANT");
    }
  }
}

export async function configureRentFlexForUnit(input: {
  tenantId: string;
  unitId: string;
  externalRnplEnabled: boolean;
  status?: "ACTIVE" | "DISABLED";
  actorId: string;
}) {
  requireIdentity(input.tenantId, input.actorId);
  if (!input.unitId || typeof input.externalRnplEnabled !== "boolean") {
    throw new RentFlexP1Error("RENT_FLEX_P1_UNIT_CONFIG_INPUT_INVALID");
  }
  const status = input.status ?? "ACTIVE";

  return prisma.$transaction(
    async (tx) => {
      await assertUnitAndOptionalLead(tx, input.tenantId, input.unitId);
      const existing = await tx.rentFlexUnitConfig.findFirst({
        where: { tenantId: input.tenantId, unitId: input.unitId },
      });

      const record = existing
        ? await tx.rentFlexUnitConfig.update({
            where: { id: existing.id },
            data: {
              externalRnplEnabled: input.externalRnplEnabled,
              status,
              updatedBy: input.actorId,
            },
          })
        : await tx.rentFlexUnitConfig.create({
            data: {
              tenantId: input.tenantId,
              unitId: input.unitId,
              externalRnplEnabled: input.externalRnplEnabled,
              status,
              createdBy: input.actorId,
              updatedBy: input.actorId,
            },
          });

      await audit(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: existing
          ? "RENT_FLEX_UNIT_CONFIG_UPDATED"
          : "RENT_FLEX_UNIT_CONFIG_CREATED",
        tableName: "rent_flex_unit_configs",
        recordId: record.id,
        details: {
          unitId: input.unitId,
          externalRnplEnabled: input.externalRnplEnabled,
          status,
        },
      });
      return record;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function createDirectMonthlySelection(input: {
  tenantId: string;
  unitId: string;
  leadId?: string | null;
  annualRentAmount: RentFlexMoneyInput;
  firstDueDate: string;
  actorId: string;
}) {
  requireIdentity(input.tenantId, input.actorId);
  const annualRent = moneyDecimal(
    input.annualRentAmount,
    "RENT_FLEX_P1_ANNUAL_RENT_INVALID",
  );
  const plan = buildDirectMonthlyEjarPlan({
    annualRentSar: Number(annualRent),
    firstDueDate: input.firstDueDate,
  });
  const firstDueDate = parseRentFlexDateOnly(input.firstDueDate);
  const digest = digestRentFlexSchedule(
    RENT_FLEX_MODE_DIRECT,
    plan.annualRentSar,
    input.firstDueDate,
    plan.schedule,
  );

  return prisma.$transaction(
    async (tx) => {
      await assertUnitAndOptionalLead(
        tx,
        input.tenantId,
        input.unitId,
        input.leadId,
      );
      const selectedAt = new Date();
      const selection = await tx.rentFlexSelection.create({
        data: {
          tenantId: input.tenantId,
          unitId: input.unitId,
          leadId: input.leadId ?? null,
          mode: RENT_FLEX_MODE_DIRECT,
          annualRentAmount: annualRent,
          currency: "SAR",
          firstDueDate,
          companyScheduleJson: scheduleJson(plan.schedule),
          scheduleDigest: digest,
          status: "SELECTED",
          createdBy: input.actorId,
          updatedBy: input.actorId,
          selectedAt,
        },
      });
      await audit(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: "RENT_FLEX_DIRECT_SELECTION_CREATED",
        tableName: "rent_flex_selections",
        recordId: selection.id,
        details: {
          unitId: input.unitId,
          leadId: input.leadId ?? null,
          scheduleDigest: digest,
        },
      });
      return selection;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function createExternalRnplSelection(input: {
  tenantId: string;
  unitId: string;
  leadId?: string | null;
  annualRentAmount: RentFlexMoneyInput;
  firstDueDate: string;
  actorId: string;
}) {
  requireIdentity(input.tenantId, input.actorId);
  const annualRent = moneyDecimal(
    input.annualRentAmount,
    "RENT_FLEX_P1_ANNUAL_RENT_INVALID",
  );
  const firstDueDate = parseRentFlexDateOnly(input.firstDueDate);

  return prisma.$transaction(
    async (tx) => {
      await assertUnitAndOptionalLead(
        tx,
        input.tenantId,
        input.unitId,
        input.leadId,
      );
      const selection = await tx.rentFlexSelection.create({
        data: {
          tenantId: input.tenantId,
          unitId: input.unitId,
          leadId: input.leadId ?? null,
          mode: RENT_FLEX_MODE_EXTERNAL,
          annualRentAmount: annualRent,
          currency: "SAR",
          firstDueDate,
          status: "DRAFT",
          createdBy: input.actorId,
          updatedBy: input.actorId,
        },
      });
      await audit(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: "RENT_FLEX_EXTERNAL_SELECTION_CREATED",
        tableName: "rent_flex_selections",
        recordId: selection.id,
        details: { unitId: input.unitId, leadId: input.leadId ?? null },
      });
      return selection;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function attachExternalFinanceCase(input: {
  tenantId: string;
  selectionId: string;
  financeCaseId: string;
  actorId: string;
}) {
  requireIdentity(input.tenantId, input.actorId);

  return prisma.$transaction(
    async (tx) => {
      const selection = await tx.rentFlexSelection.findFirst({
        where: { id: input.selectionId, tenantId: input.tenantId },
      });
      if (!selection) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_SELECTION_NOT_FOUND_FOR_TENANT",
        );
      }
      if (asMode(selection.mode) !== RENT_FLEX_MODE_EXTERNAL) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_FINANCE_CASE_REQUIRES_EXTERNAL_MODE",
        );
      }
      const status = asSelectionStatus(selection.status);
      if (status === "LOCKED" || status === "CANCELLED") {
        throw new RentFlexP1Error("RENT_FLEX_P1_SELECTION_IMMUTABLE");
      }
      if (selection.financeCaseId) {
        if (selection.financeCaseId === input.financeCaseId) return selection;
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_FINANCE_CASE_ALREADY_ATTACHED",
        );
      }

      const financeCase = await tx.financeCase.findFirst({
        where: { id: input.financeCaseId, tenantId: input.tenantId },
        select: {
          id: true,
          unitId: true,
          leadId: true,
          purpose: true,
          requestedAmount: true,
          termMonths: true,
        },
      });
      if (!financeCase) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_FINANCE_CASE_NOT_FOUND_FOR_TENANT",
        );
      }
      if (
        financeCase.purpose !== RENT_FLEX_PURPOSE ||
        financeCase.termMonths !== RENT_FLEX_TERM_MONTHS
      ) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_FINANCE_CASE_CONTRACT_INVALID",
        );
      }
      if (financeCase.unitId !== selection.unitId) {
        throw new RentFlexP1Error("RENT_FLEX_P1_FINANCE_CASE_UNIT_MISMATCH");
      }
      if (
        selection.leadId &&
        financeCase.leadId &&
        selection.leadId !== financeCase.leadId
      ) {
        throw new RentFlexP1Error("RENT_FLEX_P1_FINANCE_CASE_LEAD_MISMATCH");
      }
      if (
        !financeCase.requestedAmount ||
        !financeCase.requestedAmount.eq(selection.annualRentAmount)
      ) {
        throw new RentFlexP1Error("RENT_FLEX_P1_FINANCE_CASE_AMOUNT_MISMATCH");
      }
      if (!isRentFlexSelectionTransitionAllowed(status, "SELECTED")) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_SELECTION_TRANSITION_INVALID",
        );
      }

      const selectedAt = selection.selectedAt ?? new Date();
      const updated = await tx.rentFlexSelection.update({
        where: { id: selection.id },
        data: {
          financeCaseId: financeCase.id,
          status: "SELECTED",
          selectedAt,
          updatedBy: input.actorId,
        },
      });
      await audit(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: "RENT_FLEX_FINANCE_CASE_ATTACHED",
        tableName: "rent_flex_selections",
        recordId: selection.id,
        details: { financeCaseId: financeCase.id },
      });
      return updated;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function attachExternalOfferTerms(input: {
  tenantId: string;
  selectionId: string;
  financeProviderOfferId: string;
  ownerSettlementAmount: RentFlexMoneyInput;
  totalTenantPayable: RentFlexMoneyInput;
  firstDueDate: string;
  actorId: string;
}) {
  requireIdentity(input.tenantId, input.actorId);
  const firstDueDate = parseRentFlexDateOnly(input.firstDueDate);
  const ownerSettlement = moneyDecimal(
    input.ownerSettlementAmount,
    "RENT_FLEX_P1_OWNER_SETTLEMENT_INVALID",
  );
  const totalTenantPayable = moneyDecimal(
    input.totalTenantPayable,
    "RENT_FLEX_P1_TOTAL_TENANT_PAYABLE_INVALID",
  );

  return prisma.$transaction(
    async (tx) => {
      const selection = await tx.rentFlexSelection.findFirst({
        where: { id: input.selectionId, tenantId: input.tenantId },
      });
      if (!selection) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_SELECTION_NOT_FOUND_FOR_TENANT",
        );
      }
      if (
        asMode(selection.mode) !== RENT_FLEX_MODE_EXTERNAL ||
        !selection.financeCaseId
      ) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_EXTERNAL_FINANCE_CASE_REQUIRED",
        );
      }
      const status = asSelectionStatus(selection.status);
      if (status !== "SELECTED") {
        throw new RentFlexP1Error("RENT_FLEX_P1_OFFER_TERMS_STATE_INVALID");
      }
      if (!ownerSettlement.eq(selection.annualRentAmount)) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_OWNER_SETTLEMENT_MUST_EQUAL_ANNUAL_RENT",
        );
      }
      if (dateOnlyString(selection.firstDueDate) !== input.firstDueDate) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_OFFER_FIRST_DUE_DATE_MISMATCH",
        );
      }

      const offer = await tx.financeProviderOffer.findFirst({
        where: {
          id: input.financeProviderOfferId,
          tenantId: input.tenantId,
          financeCaseId: selection.financeCaseId,
        },
        select: {
          id: true,
          provider: true,
          providerReference: true,
          downPayment: true,
          termMonths: true,
        },
      });
      if (!offer) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_PROVIDER_OFFER_NOT_FOUND_FOR_TENANT",
        );
      }
      if (offer.termMonths !== RENT_FLEX_TERM_MONTHS) {
        throw new RentFlexP1Error("RENT_FLEX_P1_PROVIDER_OFFER_TERM_INVALID");
      }

      const quote = buildExternalRnpl12Quote({
        providerName: offer.provider,
        annualRentSar: Number(selection.annualRentAmount),
        totalTenantPayableSar: Number(totalTenantPayable),
        downPaymentSar: Number(offer.downPayment ?? 0),
        firstDueDate: input.firstDueDate,
      });
      const digest = quoteDigest({
        tenantId: input.tenantId,
        selectionId: selection.id,
        financeProviderOfferId: offer.id,
        provider: offer.provider,
        providerReference: offer.providerReference,
        annualRentSar: quote.annualRentSar,
        ownerSettlementAmountSar: Number(ownerSettlement),
        totalTenantPayableSar: quote.totalTenantPayableSar,
        firstDueDate: input.firstDueDate,
        schedule: quote.externalRepaymentSchedule,
      });

      const existing = await tx.rentFlexOfferTerms.findFirst({
        where: {
          tenantId: input.tenantId,
          financeProviderOfferId: offer.id,
        },
      });
      if (existing) {
        if (existing.quoteDigest === digest) return existing;
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_PROVIDER_OFFER_TERMS_CONFLICT",
        );
      }

      const terms = await tx.rentFlexOfferTerms.create({
        data: {
          tenantId: input.tenantId,
          financeProviderOfferId: offer.id,
          ownerSettlementAmount: ownerSettlement,
          totalTenantPayable,
          tenantCostDelta: new Prisma.Decimal(
            quote.tenantCostDeltaSar.toFixed(2),
          ),
          firstDueDate,
          repaymentScheduleJson: scheduleJson(
            quote.externalRepaymentSchedule,
          ),
          quoteDigest: digest,
        },
      });
      await audit(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: "RENT_FLEX_PROVIDER_TERMS_ATTACHED",
        tableName: "rent_flex_offer_terms",
        recordId: terms.id,
        details: {
          selectionId: selection.id,
          financeProviderOfferId: offer.id,
          quoteDigest: digest,
        },
      });
      return terms;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function selectExternalRnplOffer(input: {
  tenantId: string;
  selectionId: string;
  financeProviderOfferId: string;
  actorId: string;
}) {
  requireIdentity(input.tenantId, input.actorId);

  const selection = await prisma.rentFlexSelection.findFirst({
    where: { id: input.selectionId, tenantId: input.tenantId },
  });
  if (!selection) {
    throw new RentFlexP1Error("RENT_FLEX_P1_SELECTION_NOT_FOUND_FOR_TENANT");
  }
  if (
    asMode(selection.mode) !== RENT_FLEX_MODE_EXTERNAL ||
    !selection.financeCaseId
  ) {
    throw new RentFlexP1Error("RENT_FLEX_P1_EXTERNAL_FINANCE_CASE_REQUIRED");
  }
  const status = asSelectionStatus(selection.status);
  if (status === "LOCKED") {
    if (selection.selectedProviderOfferId === input.financeProviderOfferId) {
      return selection;
    }
    throw new RentFlexP1Error("RENT_FLEX_P1_SELECTION_IMMUTABLE");
  }
  if (status !== "SELECTED") {
    throw new RentFlexP1Error("RENT_FLEX_P1_OFFER_SELECTION_STATE_INVALID");
  }

  const offer = await prisma.financeProviderOffer.findFirst({
    where: {
      id: input.financeProviderOfferId,
      tenantId: input.tenantId,
      financeCaseId: selection.financeCaseId,
    },
    select: { id: true },
  });
  if (!offer) {
    throw new RentFlexP1Error(
      "RENT_FLEX_P1_PROVIDER_OFFER_NOT_FOUND_FOR_TENANT",
    );
  }
  const terms = await prisma.rentFlexOfferTerms.findFirst({
    where: {
      tenantId: input.tenantId,
      financeProviderOfferId: offer.id,
    },
    select: { id: true },
  });
  if (!terms) {
    throw new RentFlexP1Error("RENT_FLEX_P1_PROVIDER_OFFER_TERMS_REQUIRED");
  }

  await selectProviderOffer(
    input.tenantId,
    selection.financeCaseId,
    offer.id,
    input.actorId,
  );

  return prisma.$transaction(
    async (tx) => {
      const current = await tx.rentFlexSelection.findFirst({
        where: { id: input.selectionId, tenantId: input.tenantId },
      });
      if (!current) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_SELECTION_NOT_FOUND_FOR_TENANT",
        );
      }
      if (
        current.selectedProviderOfferId &&
        current.selectedProviderOfferId !== offer.id
      ) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_DIFFERENT_PROVIDER_OFFER_ALREADY_SELECTED",
        );
      }
      const selectedOffer = await tx.financeProviderOffer.findFirst({
        where: {
          id: offer.id,
          tenantId: input.tenantId,
          financeCaseId: current.financeCaseId ?? undefined,
          recordStatus: "SELECTED",
        },
        select: { id: true, providerReference: true },
      });
      if (!selectedOffer) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_PROVIDER_OFFER_NOT_SELECTED_IN_W1",
        );
      }

      const updated = await tx.rentFlexSelection.update({
        where: { id: current.id },
        data: {
          selectedProviderOfferId: selectedOffer.id,
          updatedBy: input.actorId,
        },
      });
      await audit(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: "RENT_FLEX_PROVIDER_OFFER_SELECTED",
        tableName: "rent_flex_selections",
        recordId: current.id,
        details: {
          financeProviderOfferId: selectedOffer.id,
          providerReference: selectedOffer.providerReference,
        },
      });
      return updated;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function attachRentFlexSelectionToLease(input: {
  tenantId: string;
  selectionId: string;
  rentalLeaseId: string;
  actorId: string;
}) {
  requireIdentity(input.tenantId, input.actorId);

  return prisma.$transaction(
    async (tx) => {
      const selection = await tx.rentFlexSelection.findFirst({
        where: { id: input.selectionId, tenantId: input.tenantId },
      });
      if (!selection) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_SELECTION_NOT_FOUND_FOR_TENANT",
        );
      }
      const status = asSelectionStatus(selection.status);
      if (status !== "SELECTED" && status !== "LOCKED") {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_LEASE_ATTACHMENT_STATE_INVALID",
        );
      }
      if (selection.rentalLeaseId) {
        if (selection.rentalLeaseId === input.rentalLeaseId) return selection;
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_SELECTION_ALREADY_ATTACHED_TO_LEASE",
        );
      }

      const lease = await tx.rentalLease.findFirst({
        where: { id: input.rentalLeaseId, tenantId: input.tenantId },
        select: { id: true, unitId: true },
      });
      if (!lease) {
        throw new RentFlexP1Error("RENT_FLEX_P1_LEASE_NOT_FOUND_FOR_TENANT");
      }
      if (lease.unitId && lease.unitId !== selection.unitId) {
        throw new RentFlexP1Error("RENT_FLEX_P1_LEASE_UNIT_MISMATCH");
      }
      const conflicting = await tx.rentFlexSelection.findFirst({
        where: {
          tenantId: input.tenantId,
          rentalLeaseId: lease.id,
          NOT: { id: selection.id },
        },
        select: { id: true },
      });
      if (conflicting) {
        throw new RentFlexP1Error("RENT_FLEX_P1_LEASE_ALREADY_HAS_SELECTION");
      }

      const updated = await tx.rentFlexSelection.update({
        where: { id: selection.id },
        data: { rentalLeaseId: lease.id, updatedBy: input.actorId },
      });
      await audit(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: "RENT_FLEX_SELECTION_ATTACHED_TO_LEASE",
        tableName: "rent_flex_selections",
        recordId: selection.id,
        details: { rentalLeaseId: lease.id },
      });
      return updated;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function lockRentFlexSelection(input: {
  tenantId: string;
  selectionId: string;
  actorId: string;
}) {
  requireIdentity(input.tenantId, input.actorId);

  return prisma.$transaction(
    async (tx) => {
      const selection = await tx.rentFlexSelection.findFirst({
        where: { id: input.selectionId, tenantId: input.tenantId },
      });
      if (!selection) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_SELECTION_NOT_FOUND_FOR_TENANT",
        );
      }
      const status = asSelectionStatus(selection.status);
      if (status === "LOCKED") return selection;
      if (!isRentFlexSelectionTransitionAllowed(status, "LOCKED")) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_SELECTION_TRANSITION_INVALID",
        );
      }

      const mode = asMode(selection.mode);
      if (mode === RENT_FLEX_MODE_DIRECT) {
        if (
          !selection.companyScheduleJson ||
          !selection.scheduleDigest ||
          selection.financeCaseId ||
          selection.selectedProviderOfferId
        ) {
          throw new RentFlexP1Error("RENT_FLEX_P1_DIRECT_LOCK_SHAPE_INVALID");
        }
        const firstDueDate = dateOnlyString(selection.firstDueDate);
        const storedSchedule = parseRentFlexScheduleJson(
          selection.companyScheduleJson,
        );
        const storedDigest = digestRentFlexSchedule(
          RENT_FLEX_MODE_DIRECT,
          Number(selection.annualRentAmount),
          firstDueDate,
          storedSchedule,
        );
        const expectedPlan = buildDirectMonthlyEjarPlan({
          annualRentSar: Number(selection.annualRentAmount),
          firstDueDate,
        });
        const expectedDigest = digestRentFlexSchedule(
          RENT_FLEX_MODE_DIRECT,
          expectedPlan.annualRentSar,
          firstDueDate,
          expectedPlan.schedule,
        );
        if (
          selection.scheduleDigest !== storedDigest ||
          storedDigest !== expectedDigest
        ) {
          throw new RentFlexP1Error(
            "RENT_FLEX_P1_DIRECT_SCHEDULE_DIGEST_MISMATCH",
          );
        }
      } else {
        if (
          selection.companyScheduleJson ||
          selection.scheduleDigest ||
          !selection.financeCaseId ||
          !selection.selectedProviderOfferId
        ) {
          throw new RentFlexP1Error(
            "RENT_FLEX_P1_EXTERNAL_LOCK_SHAPE_INVALID",
          );
        }
        const financeCase = await tx.financeCase.findFirst({
          where: { id: selection.financeCaseId, tenantId: input.tenantId },
          select: {
            purpose: true,
            termMonths: true,
            unitId: true,
            requestedAmount: true,
          },
        });
        if (
          !financeCase ||
          financeCase.purpose !== RENT_FLEX_PURPOSE ||
          financeCase.termMonths !== RENT_FLEX_TERM_MONTHS ||
          financeCase.unitId !== selection.unitId ||
          !financeCase.requestedAmount?.eq(selection.annualRentAmount)
        ) {
          throw new RentFlexP1Error(
            "RENT_FLEX_P1_EXTERNAL_FINANCE_CASE_INVALID_AT_LOCK",
          );
        }
        const offer = await tx.financeProviderOffer.findFirst({
          where: {
            id: selection.selectedProviderOfferId,
            tenantId: input.tenantId,
            financeCaseId: selection.financeCaseId,
            recordStatus: "SELECTED",
          },
          select: {
            id: true,
            provider: true,
            providerReference: true,
            downPayment: true,
            termMonths: true,
            expiresAt: true,
          },
        });
        if (!offer || offer.termMonths !== RENT_FLEX_TERM_MONTHS) {
          throw new RentFlexP1Error(
            "RENT_FLEX_P1_EXTERNAL_SELECTED_OFFER_INVALID_AT_LOCK",
          );
        }
        if (offer.expiresAt && offer.expiresAt.getTime() <= Date.now()) {
          throw new RentFlexP1Error(
            "RENT_FLEX_P1_EXTERNAL_SELECTED_OFFER_EXPIRED",
          );
        }
        const terms = await tx.rentFlexOfferTerms.findFirst({
          where: {
            tenantId: input.tenantId,
            financeProviderOfferId: offer.id,
          },
        });
        const firstDueDate = dateOnlyString(selection.firstDueDate);
        if (
          !terms ||
          !terms.ownerSettlementAmount.eq(selection.annualRentAmount) ||
          dateOnlyString(terms.firstDueDate) !== firstDueDate
        ) {
          throw new RentFlexP1Error(
            "RENT_FLEX_P1_EXTERNAL_OFFER_TERMS_INVALID_AT_LOCK",
          );
        }

        const storedSchedule = parseRentFlexScheduleJson(
          terms.repaymentScheduleJson,
        );
        const expectedQuote = buildExternalRnpl12Quote({
          providerName: offer.provider,
          annualRentSar: Number(selection.annualRentAmount),
          totalTenantPayableSar: Number(terms.totalTenantPayable),
          downPaymentSar: Number(offer.downPayment ?? 0),
          firstDueDate,
        });
        const expectedDelta = new Prisma.Decimal(
          expectedQuote.tenantCostDeltaSar.toFixed(2),
        );
        if (!terms.tenantCostDelta.eq(expectedDelta)) {
          throw new RentFlexP1Error(
            "RENT_FLEX_P1_EXTERNAL_OFFER_TERMS_INVALID_AT_LOCK",
          );
        }
        const storedDigest = quoteDigest({
          tenantId: input.tenantId,
          selectionId: selection.id,
          financeProviderOfferId: offer.id,
          provider: offer.provider,
          providerReference: offer.providerReference,
          annualRentSar: Number(selection.annualRentAmount),
          ownerSettlementAmountSar: Number(terms.ownerSettlementAmount),
          totalTenantPayableSar: Number(terms.totalTenantPayable),
          firstDueDate,
          schedule: storedSchedule,
        });
        const expectedDigest = quoteDigest({
          tenantId: input.tenantId,
          selectionId: selection.id,
          financeProviderOfferId: offer.id,
          provider: offer.provider,
          providerReference: offer.providerReference,
          annualRentSar: expectedQuote.annualRentSar,
          ownerSettlementAmountSar: Number(terms.ownerSettlementAmount),
          totalTenantPayableSar: expectedQuote.totalTenantPayableSar,
          firstDueDate,
          schedule: expectedQuote.externalRepaymentSchedule,
        });
        if (
          terms.quoteDigest !== storedDigest ||
          storedDigest !== expectedDigest
        ) {
          throw new RentFlexP1Error(
            "RENT_FLEX_P1_EXTERNAL_QUOTE_DIGEST_MISMATCH",
          );
        }
      }

      const lockedAt = new Date();
      const locked = await tx.rentFlexSelection.update({
        where: { id: selection.id },
        data: { status: "LOCKED", lockedAt, updatedBy: input.actorId },
      });
      await audit(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: "RENT_FLEX_SELECTION_LOCKED",
        tableName: "rent_flex_selections",
        recordId: selection.id,
        details: { mode, lockedAt: lockedAt.toISOString() },
      });
      return locked;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function recordRentFlexSettlement(input: {
  tenantId: string;
  selectionId: string;
  status: RentFlexSettlementStatus;
  receivedAmount?: RentFlexMoneyInput | null;
  providerReference?: string | null;
  evidenceJson?: Prisma.InputJsonValue | null;
  actorId: string;
}) {
  requireIdentity(input.tenantId, input.actorId);
  asSettlementStatus(input.status);

  return prisma.$transaction(
    async (tx) => {
      const selection = await tx.rentFlexSelection.findFirst({
        where: { id: input.selectionId, tenantId: input.tenantId },
      });
      if (!selection) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_SELECTION_NOT_FOUND_FOR_TENANT",
        );
      }
      if (
        asMode(selection.mode) !== RENT_FLEX_MODE_EXTERNAL ||
        asSelectionStatus(selection.status) !== "LOCKED" ||
        !selection.financeCaseId ||
        !selection.selectedProviderOfferId
      ) {
        throw new RentFlexP1Error(
          "RENT_FLEX_P1_SETTLEMENT_REQUIRES_LOCKED_EXTERNAL_SELECTION",
        );
      }

      const terms = await tx.rentFlexOfferTerms.findFirst({
        where: {
          tenantId: input.tenantId,
          financeProviderOfferId: selection.selectedProviderOfferId,
        },
      });
      if (!terms) {
        throw new RentFlexP1Error("RENT_FLEX_P1_PROVIDER_OFFER_TERMS_REQUIRED");
      }

      const amounts = assertRentFlexSettlementAmounts({
        expectedAmount: Number(terms.ownerSettlementAmount),
        receivedAmount:
          input.receivedAmount === null || input.receivedAmount === undefined
            ? null
            : Number(input.receivedAmount),
        status: input.status,
      });
      const receivedDecimal =
        amounts.receivedAmount === null
          ? null
          : new Prisma.Decimal(amounts.receivedAmount.toFixed(2));

      const existing = await tx.rentFlexSettlement.findFirst({
        where: {
          tenantId: input.tenantId,
          rentFlexSelectionId: selection.id,
        },
      });
      if (existing) {
        const currentStatus = asSettlementStatus(existing.status);
        if (!isRentFlexSettlementTransitionAllowed(currentStatus, input.status)) {
          throw new RentFlexP1Error(
            "RENT_FLEX_P1_SETTLEMENT_TRANSITION_INVALID",
          );
        }
        if (
          currentStatus === input.status &&
          Number(existing.receivedAmount ?? 0) === Number(receivedDecimal ?? 0)
        ) {
          return existing;
        }
      }

      const receivedAt =
        input.status === "RECEIVED"
          ? new Date()
          : input.status === "EXPECTED" ||
              input.status === "FAILED" ||
              input.status === "CANCELLED"
            ? null
            : existing?.receivedAt ?? null;
      const evidenceValue =
        input.evidenceJson === null
          ? Prisma.JsonNull
          : input.evidenceJson ?? undefined;

      const settlement = existing
        ? await tx.rentFlexSettlement.update({
            where: { id: existing.id },
            data: {
              receivedAmount: receivedDecimal,
              status: input.status,
              providerReference:
                input.providerReference?.trim() || existing.providerReference,
              receivedAt,
              evidenceJson: evidenceValue,
              updatedBy: input.actorId,
            },
          })
        : await tx.rentFlexSettlement.create({
            data: {
              tenantId: input.tenantId,
              rentFlexSelectionId: selection.id,
              financeCaseId: selection.financeCaseId,
              financeProviderOfferId: selection.selectedProviderOfferId,
              rentalLeaseId: selection.rentalLeaseId,
              expectedAmount: new Prisma.Decimal(
                amounts.expectedAmount.toFixed(2),
              ),
              receivedAmount: receivedDecimal,
              currency: selection.currency,
              status: input.status,
              providerReference: input.providerReference?.trim() || null,
              receivedAt,
              evidenceJson: evidenceValue,
              createdBy: input.actorId,
              updatedBy: input.actorId,
            },
          });

      await audit(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: "RENT_FLEX_SETTLEMENT_RECORDED",
        tableName: "rent_flex_settlements",
        recordId: settlement.id,
        details: {
          selectionId: selection.id,
          status: input.status,
          expectedAmount: amounts.expectedAmount,
          receivedAmount: amounts.receivedAmount,
        },
      });
      return settlement;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
