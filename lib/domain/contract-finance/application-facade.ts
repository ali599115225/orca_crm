import "server-only";

import type { Prisma } from "@prisma/client";
import {
  authorizeW1eActor,
  type W1eActor,
  type W1ePermissionKey,
} from "@/lib/auth/w1e-contract-finance-permissions";
import { runWithTenantContext } from "@/lib/tenant-context";
import {
  createContractDraft,
  decideContractApproval,
  finalizeContractDraftApproval,
  requestContractApproval,
  type CreateContractDraftInput,
  type DecideContractApprovalInput,
  type RequestContractApprovalInput,
} from "./contract-draft-service";
import {
  issueApprovedContractSnapshot,
  type ContractSnapshotIssueInput,
} from "./contract-snapshot-service";
import {
  createFinanceCase,
  recordFinanceAuthorityEvidence,
  transitionFinanceCaseInternalStatus,
  type CreateFinanceCaseInput,
  type FinanceInternalStatus,
  type RecordFinanceAuthorityInput,
} from "./finance-case-service";
import {
  recordProviderOffer,
  selectProviderOffer,
  type RecordProviderOfferInput,
} from "./provider-offer-service";
import {
  getContractDraftReadModel,
  getContractSnapshotReadModel,
  getFinanceCaseReadModel,
  listContractDraftsReadModel,
  listFinanceCasesReadModel,
  type ContractDraftListOptions,
  type FinanceCaseListOptions,
} from "./read-model-service";

async function runAuthorizedW1eOperation<T>(
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

export type W1eCreateFinanceCaseInput = Omit<
  CreateFinanceCaseInput,
  "tenantId" | "createdBy"
>;

export type W1eRecordFinanceAuthorityInput = Omit<
  RecordFinanceAuthorityInput,
  "tenantId" | "financeCaseId" | "actorId"
>;

export type W1eRecordProviderOfferInput = Omit<
  RecordProviderOfferInput,
  "tenantId" | "financeCaseId" | "actorId"
>;

export type W1eCreateContractDraftInput = Omit<
  CreateContractDraftInput,
  "tenantId" | "createdBy"
>;

export type W1eRequestContractApprovalInput = Omit<
  RequestContractApprovalInput,
  "tenantId" | "draftId" | "requestedBy"
>;

export type W1eDecideContractApprovalInput = Omit<
  DecideContractApprovalInput,
  "tenantId" | "approvalId" | "decidedBy"
>;

export type W1eIssueContractSnapshotInput = Omit<
  ContractSnapshotIssueInput,
  "tenantId" | "createdBy" | "contractId"
>;

export async function w1eListFinanceCases(
  session: unknown,
  options: FinanceCaseListOptions = {},
) {
  return await runAuthorizedW1eOperation(
    session,
    "finance-case.read",
    async (actor) => await listFinanceCasesReadModel(actor.tenantId, options),
  );
}

export async function w1eGetFinanceCase(
  session: unknown,
  financeCaseId: string,
) {
  return await runAuthorizedW1eOperation(
    session,
    "finance-case.read",
    async (actor) => await getFinanceCaseReadModel(actor.tenantId, financeCaseId),
  );
}

export async function w1eCreateFinanceCase(
  session: unknown,
  input: W1eCreateFinanceCaseInput,
) {
  return await runAuthorizedW1eOperation(
    session,
    "finance-case.create",
    async (actor) =>
      await createFinanceCase({
        ...input,
        tenantId: actor.tenantId,
        createdBy: actor.userId,
      }),
  );
}

export async function w1eTransitionFinanceCase(
  session: unknown,
  financeCaseId: string,
  nextStatus: FinanceInternalStatus,
) {
  return await runAuthorizedW1eOperation(
    session,
    "finance-case.transition",
    async (actor) =>
      await transitionFinanceCaseInternalStatus(
        actor.tenantId,
        financeCaseId,
        nextStatus,
        actor.userId,
      ),
  );
}

export async function w1eRecordFinanceAuthorityEvidence(
  session: unknown,
  financeCaseId: string,
  input: W1eRecordFinanceAuthorityInput,
) {
  return await runAuthorizedW1eOperation(
    session,
    "finance-case.authority-record",
    async (actor) =>
      await recordFinanceAuthorityEvidence({
        ...input,
        tenantId: actor.tenantId,
        financeCaseId,
        actorId: actor.userId,
      }),
  );
}

export async function w1eRecordProviderOffer(
  session: unknown,
  financeCaseId: string,
  input: W1eRecordProviderOfferInput,
) {
  return await runAuthorizedW1eOperation(
    session,
    "finance-case.offer-record",
    async (actor) =>
      await recordProviderOffer({
        ...input,
        tenantId: actor.tenantId,
        financeCaseId,
        actorId: actor.userId,
      }),
  );
}

export async function w1eSelectProviderOffer(
  session: unknown,
  financeCaseId: string,
  offerId: string,
) {
  return await runAuthorizedW1eOperation(
    session,
    "finance-case.offer-select",
    async (actor) =>
      await selectProviderOffer(
        actor.tenantId,
        financeCaseId,
        offerId,
        actor.userId,
      ),
  );
}

export async function w1eListContractDrafts(
  session: unknown,
  options: ContractDraftListOptions = {},
) {
  return await runAuthorizedW1eOperation(
    session,
    "contract-studio.read",
    async (actor) => await listContractDraftsReadModel(actor.tenantId, options),
  );
}

export async function w1eGetContractDraft(
  session: unknown,
  draftId: string,
) {
  return await runAuthorizedW1eOperation(
    session,
    "contract-studio.read",
    async (actor) => await getContractDraftReadModel(actor.tenantId, draftId),
  );
}

export async function w1eGetContractSnapshot(
  session: unknown,
  snapshotId: string,
) {
  return await runAuthorizedW1eOperation(
    session,
    "contract-studio.read",
    async (actor) => await getContractSnapshotReadModel(actor.tenantId, snapshotId),
  );
}

export async function w1eCreateContractDraft(
  session: unknown,
  input: W1eCreateContractDraftInput,
) {
  return await runAuthorizedW1eOperation(
    session,
    "contract-studio.draft-create",
    async (actor) =>
      await createContractDraft({
        ...input,
        tenantId: actor.tenantId,
        createdBy: actor.userId,
      }),
  );
}

export async function w1eRequestContractApproval(
  session: unknown,
  draftId: string,
  input: W1eRequestContractApprovalInput,
) {
  return await runAuthorizedW1eOperation(
    session,
    "contract-studio.approval-request",
    async (actor) =>
      await requestContractApproval({
        ...input,
        tenantId: actor.tenantId,
        draftId,
        requestedBy: actor.userId,
      }),
  );
}

export async function w1eDecideContractApproval(
  session: unknown,
  approvalId: string,
  input: W1eDecideContractApprovalInput,
) {
  return await runAuthorizedW1eOperation(
    session,
    "contract-studio.approval-decide",
    async (actor) =>
      await decideContractApproval({
        ...input,
        tenantId: actor.tenantId,
        approvalId,
        decidedBy: actor.userId,
      }),
  );
}

export async function w1eFinalizeContractDraftApproval(
  session: unknown,
  draftId: string,
) {
  return await runAuthorizedW1eOperation(
    session,
    "contract-studio.approval-finalize",
    async (actor) =>
      await finalizeContractDraftApproval(
        actor.tenantId,
        draftId,
        actor.userId,
      ),
  );
}

export async function w1eIssueApprovedContractSnapshot(
  session: unknown,
  input: W1eIssueContractSnapshotInput,
) {
  return await runAuthorizedW1eOperation(
    session,
    "contract-studio.snapshot-issue",
    async (actor) =>
      await issueApprovedContractSnapshot({
        ...input,
        tenantId: actor.tenantId,
        createdBy: actor.userId,
      }),
  );
}

// Compile-time evidence that W1E inputs are business payloads only. The
// identity fields below intentionally do not appear in any exported W1E write
// input type and are injected solely from authorizeW1eActor().
export type W1eForbiddenCallerIdentityFields =
  | "tenantId"
  | "createdBy"
  | "updatedBy"
  | "requestedBy"
  | "decidedBy"
  | "approvedBy"
  | "actorId";

export type W1eJsonInput = Prisma.InputJsonValue;
