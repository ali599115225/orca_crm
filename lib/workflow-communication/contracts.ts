import type {
  EnabledBranchService,
  OrganizationPermissionKey,
  OrganizationResourceScope,
  OrganizationScopeAssignment,
} from "@/lib/organization/contracts";

export const WORKFLOW_RUN_STATES = [
  "PENDING",
  "WAITING_APPROVAL",
  "RUNNING",
  "RETRY_WAIT",
  "COMPLETED",
  "FAILED",
  "DEAD_LETTER",
  "CANCELLED",
] as const;
export type WorkflowRunState = (typeof WORKFLOW_RUN_STATES)[number];

export const COMMUNICATION_PURPOSES = ["MARKETING", "OPERATIONAL", "SERVICE"] as const;
export type CommunicationPurpose = (typeof COMMUNICATION_PURPOSES)[number];
export const COMMUNICATION_CHANNELS = ["WHATSAPP", "EMAIL", "SMS"] as const;
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];
export type CommunicationIdentityState = "UNKNOWN" | "VERIFIED" | "AMBIGUOUS";
export type ConsentState = "UNKNOWN" | "OPTED_IN" | "OPTED_OUT" | "NOT_REQUIRED";

export type WorkflowActor = Readonly<{
  tenantId: string;
  userId: string;
  assignments: readonly OrganizationScopeAssignment[];
  enabledBranchServices?: readonly EnabledBranchService[];
  now?: Date;
}>;

export type WorkflowDefinitionVersion = Readonly<{
  id: string;
  tenantId: string;
  workflowId: string;
  version: number;
  definitionHash: string;
  triggerEvent: string;
  actionsJson: string;
  approvalRequired: boolean;
  approvalPermission: OrganizationPermissionKey | null;
  resource: OrganizationResourceScope;
  createdBy: string;
  createdAt: Date;
}>;

export type WorkflowRun = Readonly<{
  id: string;
  tenantId: string;
  workflowVersionId: string;
  idempotencyKeyHash: string;
  payloadHash: string;
  state: WorkflowRunState;
  requestedByUserId: string;
  approvedByUserId: string | null;
  attemptCount: number;
  maxAttempts: number;
  deadlineAt: Date | null;
  nextAttemptAt: Date | null;
  lastError: string | null;
  resultHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type WorkflowAttempt = Readonly<{
  id: string;
  tenantId: string;
  runId: string;
  attemptNumber: number;
  outcome: "STARTED" | "FAILED" | "TIMED_OUT" | "COMPLETED";
  errorCode: string | null;
  createdAt: Date;
}>;

export type WorkflowEscalation = Readonly<{
  id: string;
  tenantId: string;
  runId: string;
  reason: string;
  state: "OPEN" | "ACKNOWLEDGED" | "CLOSED";
  createdAt: Date;
}>;

export type CommunicationThread = Readonly<{
  id: string;
  tenantId: string;
  channel: CommunicationChannel;
  identityHash: string;
  identityState: CommunicationIdentityState;
  partyId: string | null;
  retentionPolicyKey: string | null;
  retentionUntil: Date | null;
  legalHold: boolean;
}>;

export type CommunicationEvent = Readonly<{
  id: string;
  tenantId: string;
  threadId: string;
  providerIdentity: string;
  providerIdentityHash: string;
  direction: "INBOUND" | "OUTBOUND";
  purpose: CommunicationPurpose;
  contentHash: string;
  occurredAt: Date;
}>;

export type ConsentEvidence = Readonly<{
  id: string;
  tenantId: string;
  threadId: string;
  purpose: CommunicationPurpose;
  state: ConsentState;
  source: string;
  actorUserId: string | null;
  effectiveAt: Date;
}>;

export interface WorkflowCommunicationRepository {
  transaction<T>(work: (tx: WorkflowCommunicationTransaction) => Promise<T>): Promise<T>;
}

export interface WorkflowCommunicationTransaction {
  findLatestWorkflowVersion(tenantId: string, workflowId: string): Promise<WorkflowDefinitionVersion | null>;
  insertWorkflowVersion(value: WorkflowDefinitionVersion): Promise<void>;
  findWorkflowVersion(tenantId: string, versionId: string): Promise<WorkflowDefinitionVersion | null>;
  findRunByKey(tenantId: string, keyHash: string): Promise<WorkflowRun | null>;
  insertRun(value: WorkflowRun): Promise<void>;
  updateRun(value: WorkflowRun): Promise<void>;
  insertAttempt(value: WorkflowAttempt): Promise<void>;
  insertEscalation(value: WorkflowEscalation): Promise<void>;
  findThread(tenantId: string, channel: CommunicationChannel, identityHash: string): Promise<CommunicationThread | null>;
  insertThread(value: CommunicationThread): Promise<void>;
  updateThread(value: CommunicationThread): Promise<void>;
  findCommunicationEventByProviderHash(tenantId: string, channel: CommunicationChannel, providerIdentityHash: string): Promise<CommunicationEvent | null>;
  insertCommunicationEvent(value: CommunicationEvent): Promise<void>;
  latestConsent(tenantId: string, threadId: string, purpose: CommunicationPurpose): Promise<ConsentEvidence | null>;
  insertConsent(value: ConsentEvidence): Promise<void>;
}
