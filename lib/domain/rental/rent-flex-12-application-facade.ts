import "server-only";

import type { Prisma } from "@prisma/client";
import {
  authorizeW1eActor,
  type W1eActor,
  type W1ePermissionKey,
} from "@/lib/auth/w1e-contract-finance-permissions";
import { runWithTenantContext } from "@/lib/tenant-context";
import {
  attachExternalFinanceCase,
  attachExternalOfferTerms,
  attachRentFlexSelectionToLease,
  configureRentFlexForUnit,
  createDirectMonthlySelection,
  createExternalRnplSelection,
  lockRentFlexSelection,
  recordRentFlexSettlement,
  selectExternalRnplOffer,
  type RentFlexMoneyInput,
} from "./rent-flex-12-service";
import {
  getRentFlexSelectionReadModel,
  getRentFlexUnitConfigReadModel,
  listRentFlexSelectionsReadModel,
  type RentFlexSelectionListOptions,
} from "./rent-flex-12-read-service";
import type { RentFlexSettlementStatus } from "./rent-flex-12-persistence-contract";

async function runAuthorizedRentFlexOperation<T>(
  session: unknown,
  permissionKey: W1ePermissionKey,
  operation: (actor: W1eActor) => Promise<T>,
): Promise<T> {
  const actor = await authorizeW1eActor(session, permissionKey);
  return await runWithTenantContext(
    { tenantId: actor.tenantId, userId: actor.userId },
    () => operation(actor),
  );
}

export async function rf12GetUnitConfig(session: unknown, unitId: string) {
  return await runAuthorizedRentFlexOperation(
    session,
    "finance-case.read",
    async (actor) => await getRentFlexUnitConfigReadModel(actor.tenantId, unitId),
  );
}

export async function rf12ConfigureUnit(
  session: unknown,
  unitId: string,
  input: { externalRnplEnabled: boolean; status?: "ACTIVE" | "DISABLED" },
) {
  return await runAuthorizedRentFlexOperation(
    session,
    "finance-case.create",
    async (actor) =>
      await configureRentFlexForUnit({
        tenantId: actor.tenantId,
        unitId,
        externalRnplEnabled: input.externalRnplEnabled,
        status: input.status,
        actorId: actor.userId,
      }),
  );
}

export async function rf12ListSelections(
  session: unknown,
  options: RentFlexSelectionListOptions = {},
) {
  return await runAuthorizedRentFlexOperation(
    session,
    "finance-case.read",
    async (actor) => await listRentFlexSelectionsReadModel(actor.tenantId, options),
  );
}

export async function rf12GetSelection(session: unknown, selectionId: string) {
  return await runAuthorizedRentFlexOperation(
    session,
    "finance-case.read",
    async (actor) => await getRentFlexSelectionReadModel(actor.tenantId, selectionId),
  );
}

export async function rf12CreateSelection(
  session: unknown,
  input: {
    mode: "DIRECT_MONTHLY_EJAR" | "EXTERNAL_RNPL_12";
    unitId: string;
    leadId?: string | null;
    annualRentAmount: RentFlexMoneyInput;
    firstDueDate: string;
  },
) {
  return await runAuthorizedRentFlexOperation(
    session,
    "finance-case.create",
    async (actor) => {
      const base = {
        tenantId: actor.tenantId,
        unitId: input.unitId,
        leadId: input.leadId,
        annualRentAmount: input.annualRentAmount,
        firstDueDate: input.firstDueDate,
        actorId: actor.userId,
      };
      return input.mode === "DIRECT_MONTHLY_EJAR"
        ? await createDirectMonthlySelection(base)
        : await createExternalRnplSelection(base);
    },
  );
}

export async function rf12AttachFinanceCase(
  session: unknown,
  selectionId: string,
  financeCaseId: string,
) {
  return await runAuthorizedRentFlexOperation(
    session,
    "finance-case.offer-record",
    async (actor) =>
      await attachExternalFinanceCase({
        tenantId: actor.tenantId,
        selectionId,
        financeCaseId,
        actorId: actor.userId,
      }),
  );
}

export async function rf12AttachOfferTerms(
  session: unknown,
  selectionId: string,
  input: {
    financeProviderOfferId: string;
    ownerSettlementAmount: RentFlexMoneyInput;
    totalTenantPayable: RentFlexMoneyInput;
    firstDueDate: string;
  },
) {
  return await runAuthorizedRentFlexOperation(
    session,
    "finance-case.offer-record",
    async (actor) =>
      await attachExternalOfferTerms({
        tenantId: actor.tenantId,
        selectionId,
        financeProviderOfferId: input.financeProviderOfferId,
        ownerSettlementAmount: input.ownerSettlementAmount,
        totalTenantPayable: input.totalTenantPayable,
        firstDueDate: input.firstDueDate,
        actorId: actor.userId,
      }),
  );
}

export async function rf12SelectOffer(
  session: unknown,
  selectionId: string,
  financeProviderOfferId: string,
) {
  return await runAuthorizedRentFlexOperation(
    session,
    "finance-case.offer-select",
    async (actor) =>
      await selectExternalRnplOffer({
        tenantId: actor.tenantId,
        selectionId,
        financeProviderOfferId,
        actorId: actor.userId,
      }),
  );
}

export async function rf12AttachLease(
  session: unknown,
  selectionId: string,
  rentalLeaseId: string,
) {
  return await runAuthorizedRentFlexOperation(
    session,
    "finance-case.create",
    async (actor) =>
      await attachRentFlexSelectionToLease({
        tenantId: actor.tenantId,
        selectionId,
        rentalLeaseId,
        actorId: actor.userId,
      }),
  );
}

export async function rf12LockSelection(session: unknown, selectionId: string) {
  return await runAuthorizedRentFlexOperation(
    session,
    "finance-case.transition",
    async (actor) =>
      await lockRentFlexSelection({
        tenantId: actor.tenantId,
        selectionId,
        actorId: actor.userId,
      }),
  );
}

export async function rf12RecordSettlement(
  session: unknown,
  selectionId: string,
  input: {
    status: RentFlexSettlementStatus;
    receivedAmount?: RentFlexMoneyInput | null;
    providerReference?: string;
    evidenceJson?: Prisma.InputJsonValue | null;
  },
) {
  return await runAuthorizedRentFlexOperation(
    session,
    "finance-case.offer-record",
    async (actor) =>
      await recordRentFlexSettlement({
        tenantId: actor.tenantId,
        selectionId,
        status: input.status,
        receivedAmount: input.receivedAmount,
        providerReference: input.providerReference,
        evidenceJson: input.evidenceJson,
        actorId: actor.userId,
      }),
  );
}
