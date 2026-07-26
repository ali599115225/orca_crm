import type {
  EnabledBranchService,
  OrganizationScopeAssignment,
} from "@/lib/organization/contracts";

export const PARTY_TYPES = ["PERSON", "ORGANIZATION"] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

export const RECORD_LIFECYCLE_STATES = [
  "ACTIVE",
  "ARCHIVED",
  "RESTRICTED",
  "PENDING_DELETION",
  "ANONYMIZED",
  "LEGAL_HOLD",
  "MERGED",
] as const;
export type RecordLifecycleState = (typeof RECORD_LIFECYCLE_STATES)[number];

export const FIELD_PROVENANCE_SOURCES = [
  "USER_ENTERED",
  "IMPORTED",
  "INTEGRATION",
  "DERIVED",
  "VERIFIED",
  "MERGED",
  "SYSTEM",
] as const;
export type FieldProvenanceSource =
  (typeof FIELD_PROVENANCE_SOURCES)[number];

export const LEAD_LIFECYCLE_STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFYING",
  "QUALIFIED",
  "DISQUALIFIED",
  "CONVERTED",
  "ARCHIVED",
] as const;
export type LeadLifecycleStage = (typeof LEAD_LIFECYCLE_STAGES)[number];

export const OPPORTUNITY_STAGES = [
  "NEW",
  "QUALIFICATION",
  "NEEDS_ANALYSIS",
  "PROPOSAL",
  "NEGOTIATION",
  "APPROVAL",
  "WON",
  "LOST",
  "CANCELLED",
] as const;
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

export const COMMUNICATION_CHANNELS = [
  "PHONE",
  "SMS",
  "WHATSAPP",
  "EMAIL",
  "PUSH",
  "OTHER",
] as const;
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

export const COMMUNICATION_PURPOSES = [
  "SERVICE",
  "TRANSACTIONAL",
  "MARKETING",
  "SURVEY",
  "MAINTENANCE",
  "OTHER",
] as const;
export type CommunicationPurpose = (typeof COMMUNICATION_PURPOSES)[number];

export const CONSENT_STATES = [
  "GRANTED",
  "DENIED",
  "WITHDRAWN",
  "NOT_REQUIRED",
  "UNKNOWN",
] as const;
export type ConsentState = (typeof CONSENT_STATES)[number];

export const DUPLICATE_MATCH_LEVELS = [
  "DETERMINISTIC_MATCH",
  "POSSIBLE_MATCH",
] as const;
export type DuplicateMatchLevel = (typeof DUPLICATE_MATCH_LEVELS)[number];

export const CUSTOMER_RELATIONSHIP_ROLES = [
  "OWNER",
  "TENANT",
  "BUYER",
  "SELLER",
  "INVESTOR",
  "PROVIDER",
  "PARTNER",
  "OTHER",
] as const;
export type CustomerRelationshipRole =
  (typeof CUSTOMER_RELATIONSHIP_ROLES)[number];

export type ResourceScope = Readonly<{
  branchId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
}>;

export type CommandContext = Readonly<{
  actorId: string;
  tenantId: string;
  scope: ResourceScope;
  assignments: readonly OrganizationScopeAssignment[];
  enabledBranchServices?: readonly EnabledBranchService[];
  idempotencyKey?: string | null;
  expectedVersion?: number | null;
  reason?: string | null;
  timestamp?: Date;
  auditCorrelationId: string;
}>;

export type FieldHistoryEntry = Readonly<{
  value: string | null;
  source: FieldProvenanceSource;
  changedAt: Date;
  changedByActorId: string;
  correlationId: string;
}>;

export type PartyField = Readonly<{
  value: string | null;
  normalizedValue: string | null;
  source: FieldProvenanceSource;
  verified: boolean;
  protected: boolean;
  updatedAt: Date;
  updatedByActorId: string;
  history: readonly FieldHistoryEntry[];
}>;

export type Party = Readonly<{
  id: string;
  tenantId: string;
  type: PartyType;
  lifecycleState: RecordLifecycleState;
  branchId: string | null;
  departmentId: string | null;
  teamId: string | null;
  fields: Readonly<Record<string, PartyField>>;
  aliases: readonly string[];
  mergedIntoPartyId: string | null;
  legalHoldReason: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdByActorId: string;
}>;

export type CustomerAccount = Readonly<{
  id: string;
  tenantId: string;
  partyId: string;
  relationshipRoles: readonly CustomerRelationshipRole[];
  organizationContactPartyIds: readonly string[];
  lifecycleState: RecordLifecycleState;
  branchId: string | null;
  departmentId: string | null;
  teamId: string | null;
  ownerUserId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}>;

export type LeadConversion = Readonly<{
  convertedAt: Date;
  convertedByActorId: string;
  partyId: string;
  customerAccountId: string | null;
  opportunityId: string | null;
  idempotencyKey: string;
}>;

export type CustomerLead = Readonly<{
  id: string;
  tenantId: string;
  partyId: string | null;
  customerAccountId: string | null;
  legacyLeadId: string | null;
  serviceLine: string;
  projectId: string | null;
  unitId: string | null;
  source: string;
  campaignId: string | null;
  purpose: string | null;
  branchId: string;
  departmentId: string | null;
  teamId: string | null;
  ownerUserId: string | null;
  stage: LeadLifecycleStage;
  disqualificationReason: string | null;
  conversion: LeadConversion | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}>;

export type OpportunityHistoryEntry = Readonly<{
  eventType: "STAGE_CHANGED" | "REASSIGNED" | "VALUE_CHANGED" | "REOPENED";
  previousStage: OpportunityStage;
  nextStage: OpportunityStage;
  previousExpectedValue: number;
  nextExpectedValue: number;
  previousOwnerUserId: string | null;
  nextOwnerUserId: string | null;
  previousBranchId: string;
  nextBranchId: string;
  previousTeamId: string | null;
  nextTeamId: string | null;
  changedAt: Date;
  changedByActorId: string;
  correlationId: string;
  reason: string | null;
}>;

export type CustomerOpportunity = Readonly<{
  id: string;
  tenantId: string;
  partyId: string | null;
  customerAccountId: string | null;
  sourceLeadId: string | null;
  legacyOpportunityId: string | null;
  branchId: string;
  departmentId: string | null;
  teamId: string | null;
  ownerUserId: string | null;
  serviceLine: string;
  projectId: string | null;
  unitId: string | null;
  expectedValue: number;
  stage: OpportunityStage;
  probability: number;
  expectedCloseAt: Date | null;
  outcomeReason: string | null;
  creationSource: string;
  version: number;
  history: readonly OpportunityHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}>;

export type CommunicationPreference = Readonly<{
  id: string;
  tenantId: string;
  partyId: string;
  channel: CommunicationChannel;
  purpose: CommunicationPurpose;
  consentState: ConsentState;
  source: FieldProvenanceSource;
  branchId: string | null;
  serviceLine: string | null;
  recordedAt: Date;
  withdrawnAt: Date | null;
  history: readonly Readonly<{
    consentState: ConsentState;
    source: FieldProvenanceSource;
    changedAt: Date;
    changedByActorId: string;
    correlationId: string;
  }>[];
  version: number;
}>;

export type DuplicateReason = Readonly<{
  field: string;
  code:
    | "VERIFIED_IDENTITY_MATCH"
    | "VERIFIED_COMMERCIAL_REGISTRY_MATCH"
    | "TRUSTED_EXTERNAL_ID_MATCH"
    | "VERIFIED_EMAIL_MATCH"
    | "VERIFIED_PHONE_MATCH"
    | "NAME_SIMILARITY"
    | "UNVERIFIED_EMAIL_MATCH"
    | "UNVERIFIED_PHONE_MATCH"
    | "DATE_OF_BIRTH_MATCH"
    | "CITY_MATCH"
    | "EMPLOYER_MATCH"
    | "ORGANIZATION_NAME_SIMILARITY";
  explanation: string;
}>;

export type DuplicateSuggestion = Readonly<{
  reviewId: string;
  tenantId: string;
  candidatePartyId: string;
  matchedPartyId: string;
  level: DuplicateMatchLevel;
  reasons: readonly DuplicateReason[];
  autoMergeAllowed: false;
  minimalDisclosure: Readonly<{
    level: DuplicateMatchLevel;
    reasonCodes: readonly DuplicateReason["code"][];
    reviewId: string;
  }>;
}>;

export type MergeFieldChoice = Readonly<{
  field: string;
  sourcePartyId: string;
}>;

export type MergePreview = Readonly<{
  tenantId: string;
  survivorPartyId: string;
  mergedPartyId: string;
  survivorBefore: Party;
  mergedBefore: Party;
  fieldChoices: readonly MergeFieldChoice[];
  conflicts: readonly string[];
  relationshipsToTransfer: Readonly<{
    customerAccountIds: readonly string[];
    leadIds: readonly string[];
    opportunityIds: readonly string[];
    communicationPreferenceIds: readonly string[];
  }>;
}>;

export type PartyMergeRecord = Readonly<{
  id: string;
  tenantId: string;
  survivorPartyId: string;
  mergedPartyId: string;
  preview: MergePreview;
  survivorAfter: Party;
  executedByActorId: string;
  approvedByActorId: string;
  reason: string;
  idempotencyKey: string;
  executedAt: Date;
  reversedAt: Date | null;
  reversedByActorId: string | null;
  blockingDependencies: readonly Readonly<{
    type: string;
    id: string;
    createdAt: Date;
  }>[];
}>;

export type AuditEntry = Readonly<{
  sequence: number;
  tenantId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: unknown;
  afterState: unknown;
  reason: string | null;
  correlationId: string;
  occurredAt: Date;
}>;

export type CustomerIdentityState = {
  parties: Map<string, Party>;
  customerAccounts: Map<string, CustomerAccount>;
  leads: Map<string, CustomerLead>;
  opportunities: Map<string, CustomerOpportunity>;
  communicationPreferences: Map<string, CommunicationPreference>;
  duplicateSuggestions: Map<string, DuplicateSuggestion>;
  mergeRecords: Map<string, PartyMergeRecord>;
  aliases: Map<string, string>;
  idempotencyResults: Map<string, unknown>;
  audit: AuditEntry[];
  nextId: number;
  nextAuditSequence: number;
};

export type PartyFieldInput = Readonly<{
  value: string | null;
  source: FieldProvenanceSource;
  verified?: boolean;
  protected?: boolean;
}>;

export type CreatePartyCommand = Readonly<{
  context: CommandContext;
  type: PartyType;
  fields: Readonly<Record<string, PartyFieldInput>>;
}>;

export type UpdatePartyFieldCommand = Readonly<{
  context: CommandContext;
  partyId: string;
  field: string;
  value: string | null;
  source: FieldProvenanceSource;
  elevatedVerifiedOverride?: boolean;
}>;

export type CreateLeadCommand = Readonly<{
  context: CommandContext;
  partyId?: string | null;
  customerAccountId?: string | null;
  legacyLeadId?: string | null;
  serviceLine: string;
  projectId?: string | null;
  unitId?: string | null;
  source: string;
  campaignId?: string | null;
  purpose?: string | null;
  branchId: string;
  departmentId?: string | null;
  teamId?: string | null;
  ownerUserId?: string | null;
}>;

export type ConvertLeadCommand = Readonly<{
  context: CommandContext;
  leadId: string;
  createParty?: Readonly<{
    type: PartyType;
    fields: Readonly<Record<string, PartyFieldInput>>;
  }> | null;
  createCustomerAccount?: boolean;
  customerRelationshipRoles?: readonly CustomerRelationshipRole[];
  createOpportunity?: boolean;
  allowAdditionalOpportunityExplicit?: boolean;
  opportunity?: Readonly<{
    expectedValue: number;
    probability: number;
    expectedCloseAt?: Date | null;
    projectId?: string | null;
    unitId?: string | null;
    creationSource: string;
  }> | null;
}>;

export type CreateOpportunityCommand = Readonly<{
  context: CommandContext;
  partyId?: string | null;
  customerAccountId?: string | null;
  sourceLeadId?: string | null;
  legacyOpportunityId?: string | null;
  branchId: string;
  departmentId?: string | null;
  teamId?: string | null;
  ownerUserId?: string | null;
  serviceLine: string;
  projectId?: string | null;
  unitId?: string | null;
  expectedValue: number;
  probability: number;
  expectedCloseAt?: Date | null;
  creationSource: string;
}>;

export type MoveOpportunityStageCommand = Readonly<{
  context: CommandContext;
  opportunityId: string;
  nextStage: OpportunityStage;
  outcomeReason?: string | null;
  reopenAuthorized?: boolean;
  initiatedByActorId?: string | null;
}>;

export type ReassignOpportunityCommand = Readonly<{
  context: CommandContext;
  opportunityId: string;
  nextBranchId: string;
  nextDepartmentId?: string | null;
  nextTeamId?: string | null;
  nextOwnerUserId?: string | null;
}>;

export type SetCommunicationPreferenceCommand = Readonly<{
  context: CommandContext;
  partyId: string;
  channel: CommunicationChannel;
  purpose: CommunicationPurpose;
  consentState: ConsentState;
  source: FieldProvenanceSource;
  branchId?: string | null;
  serviceLine?: string | null;
}>;

export type MergePartiesCommand = Readonly<{
  context: CommandContext;
  survivorPartyId: string;
  mergedPartyId: string;
  fieldChoices: readonly MergeFieldChoice[];
  approvedByActorId: string;
  approverAssignments: readonly OrganizationScopeAssignment[];
}>;

export class CustomerIdentityError extends Error {
  constructor(
    public readonly code:
      | "MISSING_ACTOR"
      | "MISSING_TENANT"
      | "MISSING_REASON"
      | "MISSING_IDEMPOTENCY_KEY"
      | "AUTHORITY_DENIED"
      | "TENANT_SCOPE_MISMATCH"
      | "RESOURCE_SCOPE_DENIED"
      | "NOT_FOUND"
      | "INVALID_STATE_TRANSITION"
      | "REASON_REQUIRED"
      | "CONCURRENCY_CONFLICT"
      | "VERIFIED_FIELD_DOWNGRADE_DENIED"
      | "SELF_MERGE_DENIED"
      | "SELF_APPROVAL_DENIED"
      | "DUPLICATE_MERGE_DENIED"
      | "BLOCKED_BY_DEPENDENCY"
      | "LEGAL_HOLD"
      | "ALIAS_REUSE_DENIED"
      | "VALIDATION_ERROR",
    message: string,
    public readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = "CustomerIdentityError";
  }
}
