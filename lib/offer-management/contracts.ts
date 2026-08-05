import type { ApprovalDecisionState, CommercialOfferState, OfferVersionState } from "./state-machine";

export type Exec007Uuid = string;
export type OfferKind = "SALE" | "LEASE";
export type ServiceLine = "SALES" | "LEASING";
export type RecordOrigin = "EXEC007";

export interface ExactOfferIdentity {
  tenantId: Exec007Uuid;
  opportunityId: Exec007Uuid;
  unitId: Exec007Uuid;
  branchId: Exec007Uuid;
  subjectPartyId: Exec007Uuid;
  customerAccountId: Exec007Uuid | null;
  offerKind: OfferKind;
  serviceLine: ServiceLine;
  recordOrigin: RecordOrigin;
}

export interface CommercialOfferRecord extends ExactOfferIdentity {
  id: Exec007Uuid;
  state: CommercialOfferState;
  currentIssuedVersionId: Exec007Uuid | null;
  legacyOfferId: Exec007Uuid | null;
  createdByUserId: Exec007Uuid;
  version: number;
}

export interface OfferVersionRecord extends ExactOfferIdentity {
  id: Exec007Uuid;
  offerId: Exec007Uuid;
  versionNumber: number;
  state: OfferVersionState;
  isCurrent: boolean;
  contentHash: string;
  pricingHash: string;
  termsHash: string;
  canonicalizationVersion: "EXEC007-CANON-1";
  validUntilUtc: Date | null;
  issuedAtUtc: Date | null;
  createdByUserId: Exec007Uuid;
  lastCommercialEditorId: Exec007Uuid;
  rowVersion: number;
}

export interface ApprovalDecisionRecord {
  id: Exec007Uuid;
  tenantId: Exec007Uuid;
  requirementId: Exec007Uuid;
  offerVersionId: Exec007Uuid;
  state: ApprovalDecisionState;
  actorUserId: Exec007Uuid;
  assignmentId: Exec007Uuid;
  reason: string;
  evidenceHash: string;
}

export interface ExpectedVersion {
  expectedVersion: number;
}

export interface CommandContext {
  tenantId: Exec007Uuid;
  actorUserId: Exec007Uuid;
  assignmentId: Exec007Uuid;
  branchId: Exec007Uuid;
  serviceLine: ServiceLine;
  resourceType: string;
  resourceId: Exec007Uuid;
  permissions: ReadonlySet<string>;
  correlationId: string;
  now: Date;
}

export class Exec007DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "Exec007DomainError";
  }
}

export function assertUuidLike(value: string, field: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Exec007DomainError("INVALID_ID", `${field} must be a UUID`);
  }
}

export function assertExactOfferIdentity(identity: ExactOfferIdentity): void {
  for (const [field, value] of Object.entries(identity)) {
    if (field.endsWith("Id") && value !== null) assertUuidLike(String(value), field);
  }
  if (identity.recordOrigin !== "EXEC007") {
    throw new Exec007DomainError("INVALID_ORIGIN", "EXEC-007 records must use EXEC007 origin");
  }
  if (
    (identity.offerKind === "SALE" && identity.serviceLine !== "SALES") ||
    (identity.offerKind === "LEASE" && identity.serviceLine !== "LEASING")
  ) {
    throw new Exec007DomainError("KIND_SERVICE_MISMATCH", "offer kind and service line must match");
  }
}
