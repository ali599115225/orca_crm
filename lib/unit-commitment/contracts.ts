import type {
  EnabledBranchService,
  OrganizationScopeAssignment,
} from "@/lib/organization/contracts";

export const UNIT_COMMITMENT_TYPES = ["HOLD", "RESERVATION"] as const;
export type UnitCommitmentType = (typeof UNIT_COMMITMENT_TYPES)[number];

export const HOLD_STATUSES = [
  "PENDING",
  "ACTIVE",
  "EXPIRED",
  "RELEASED",
  "CANCELLED",
  "CONVERTED",
] as const;
export type HoldStatus = (typeof HOLD_STATUSES)[number];

export const RESERVATION_STATUSES = [
  "PENDING_APPROVAL",
  "ACTIVE",
  "EXPIRED",
  "CANCELLED",
  "RELEASED",
  "CONVERTED",
  "REJECTED",
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export type UnitCommitmentStatus = HoldStatus | ReservationStatus;

export const TOUR_APPOINTMENT_STATUSES = [
  "REQUESTED",
  "CONFIRMED",
  "RESCHEDULED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
  "REJECTED",
] as const;
export type TourAppointmentStatus =
  (typeof TOUR_APPOINTMENT_STATUSES)[number];

export const AVAILABILITY_STATES = [
  "AVAILABLE",
  "HELD",
  "RESERVED",
  "CONTRACTUALLY_UNAVAILABLE",
  "OPERATIONALLY_BLOCKED",
  "INACTIVE",
  "UNKNOWN_FAIL_CLOSED",
] as const;
export type AvailabilityState = (typeof AVAILABILITY_STATES)[number];

export const EXEC006_PERMISSION_KEYS = [
  "UNIT_AVAILABILITY_READ",
  "UNIT_HOLD_CREATE",
  "UNIT_HOLD_EXTEND",
  "UNIT_HOLD_RELEASE",
  "UNIT_HOLD_OVERRIDE",
  "RESERVATION_CREATE",
  "RESERVATION_APPROVE",
  "RESERVATION_EXTEND",
  "RESERVATION_RELEASE",
  "RESERVATION_CANCEL",
  "RESERVATION_CONVERT",
  "TOUR_CREATE",
  "TOUR_CONFIRM",
  "TOUR_RESCHEDULE",
  "TOUR_COMPLETE",
  "TOUR_CANCEL",
  "COMMITMENT_AUDIT_READ",
] as const;
export type Exec006PermissionKey =
  (typeof EXEC006_PERMISSION_KEYS)[number];

export type UnitResourceScope = Readonly<{
  branchId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
}>;

export type UnitCommandContext = Readonly<{
  actorId: string;
  tenantId: string;
  scope: UnitResourceScope;
  assignments: readonly OrganizationScopeAssignment[];
  enabledBranchServices?: readonly EnabledBranchService[];
  idempotencyKey?: string | null;
  expectedVersion?: number | null;
  reason?: string | null;
  timestamp?: Date;
  auditCorrelationId: string;
}>;

export type ApprovalEvidence = Readonly<{
  approvedByActorId: string;
  approverAssignments: readonly OrganizationScopeAssignment[];
  approvedAt: Date;
  approvalReference: string;
  reason: string;
}>;

export type CustomerReference = Readonly<{
  partyId?: string | null;
  customerAccountId?: string | null;
  opportunityId?: string | null;
}>;

export type UnitBaseState = "ACTIVE" | "INACTIVE" | "UNKNOWN";
export type UnitConsistencyState = "CONSISTENT" | "INCONSISTENT" | "UNKNOWN";

export type UnitInventoryRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string;
  projectId: string | null;
  baseState: UnitBaseState;
  operationalBlocked: boolean;
  operationalReason: string | null;
  contractualUnavailable: boolean;
  contractualReferenceId: string | null;
  consistencyState: UnitConsistencyState;
  legacyProjectionStatus: string | null;
  sourceVersion: number;
  policyVersion: string;
  updatedAt: Date;
}>;

export type UnitCommitment = Readonly<{
  id: string;
  tenantId: string;
  branchId: string;
  unitId: string;
  type: UnitCommitmentType;
  status: UnitCommitmentStatus;
  partyId: string | null;
  customerAccountId: string | null;
  opportunityId: string | null;
  startsAt: Date;
  expiresAt: Date;
  version: number;
  createdByActorId: string;
  updatedByActorId: string;
  createdAt: Date;
  updatedAt: Date;
  reason: string | null;
  idempotencyKey: string;
  approvalEvidence: ApprovalEvidence | null;
  convertedFromCommitmentId: string | null;
  convertedToCommitmentId: string | null;
  evidenceReference: string | null;
}>;

export type CommitmentHistoryEntry = Readonly<{
  sequence: number;
  tenantId: string;
  branchId: string;
  unitId: string;
  commitmentId: string;
  action: string;
  previousState: UnitCommitment | null;
  nextState: UnitCommitment;
  reason: string | null;
  actorId: string;
  occurredAt: Date;
  correlationId: string;
  idempotencyKey: string | null;
  policyVersion: string;
  expiryBefore: Date | null;
  expiryAfter: Date | null;
  approvalEvidence: ApprovalEvidence | null;
}>;

export type TourAppointment = Readonly<{
  id: string;
  tenantId: string;
  branchId: string;
  unitId: string | null;
  staffUserId: string;
  operationalResourceId: string | null;
  partyId: string | null;
  customerAccountId: string | null;
  opportunityId: string | null;
  status: TourAppointmentStatus;
  startAtUtc: Date;
  endAtUtc: Date;
  timezone: string;
  location: string;
  version: number;
  createdByActorId: string;
  updatedByActorId: string;
  createdAt: Date;
  updatedAt: Date;
  reason: string | null;
  idempotencyKey: string;
}>;

export type TourHistoryEntry = Readonly<{
  sequence: number;
  tenantId: string;
  branchId: string;
  tourId: string;
  action: string;
  previousState: TourAppointment | null;
  nextState: TourAppointment;
  actorId: string;
  reason: string | null;
  occurredAt: Date;
  correlationId: string;
  idempotencyKey: string | null;
}>;

export type UnitCommitmentAuditEntry = Readonly<{
  sequence: number;
  tenantId: string;
  actorId: string;
  assignmentId: string;
  scope: UnitResourceScope;
  branchId: string;
  unitId: string | null;
  commitmentId: string | null;
  tourId: string | null;
  action: string;
  previousState: unknown;
  nextState: unknown;
  reason: string | null;
  occurredAt: Date;
  correlationId: string;
  idempotencyKey: string | null;
  policyVersion: string;
  expiryBefore: Date | null;
  expiryAfter: Date | null;
  approvalEvidence: ApprovalEvidence | null;
}>;

export type AvailabilityDecision = Readonly<{
  state: AvailabilityState;
  unitId: string;
  tenantId: string;
  branchId: string;
  evaluatedAt: Date;
  blockingCommitmentId: string | null;
  blockingType: UnitCommitmentType | null;
  blockingUntil: Date | null;
  reasonCode: string;
  policyVersion: string;
  sourceVersion: number;
  blockingCustomerReference: CustomerReference | null;
}>;

export type IdempotencyRecord = Readonly<{
  tenantId: string;
  operation: string;
  key: string;
  payloadHash: string;
  result: unknown;
  createdAt: Date;
}>;

export type UnitCommitmentPolicy = Readonly<{
  version: string;
  defaultHoldDurationHours: number;
  standardMaximumHoldHours: number;
  absoluteMaximumHoldHours: number;
  defaultReservationDurationHours: number;
  standardMaximumReservationHours: number;
  absoluteMaximumReservationHours: number;
  allowUnitTourOverlap: boolean;
  companyTimezone: string;
}>;

export const DEFAULT_UNIT_COMMITMENT_POLICY: UnitCommitmentPolicy = {
  version: "EXEC-006-v1",
  defaultHoldDurationHours: 24,
  standardMaximumHoldHours: 72,
  absoluteMaximumHoldHours: 24 * 30,
  defaultReservationDurationHours: 24 * 7,
  standardMaximumReservationHours: 24 * 30,
  absoluteMaximumReservationHours: 24 * 365,
  allowUnitTourOverlap: false,
  companyTimezone: "Asia/Riyadh",
};

export type UnitCommitmentState = {
  units: Map<string, UnitInventoryRecord>;
  commitments: Map<string, UnitCommitment>;
  tours: Map<string, TourAppointment>;
  commitmentHistory: CommitmentHistoryEntry[];
  tourHistory: TourHistoryEntry[];
  audit: UnitCommitmentAuditEntry[];
  idempotency: Map<string, IdempotencyRecord>;
  nextEntityId: number;
  nextHistorySequence: number;
  nextAuditSequence: number;
};

export type EvaluateUnitAvailabilityCommand = Readonly<{
  context: UnitCommandContext;
  unitId: string;
  discloseBlockingCustomer?: boolean;
}>;

export type CreateUnitHoldCommand = Readonly<{
  context: UnitCommandContext;
  unitId: string;
  customer: CustomerReference;
  requestedDurationHours?: number | null;
  approvalEvidence?: ApprovalEvidence | null;
}>;

export type ExtendUnitHoldCommand = Readonly<{
  context: UnitCommandContext;
  holdId: string;
  requestedDurationHours: number;
  approvalEvidence?: ApprovalEvidence | null;
}>;

export type HoldLifecycleCommand = Readonly<{
  context: UnitCommandContext;
  holdId: string;
}>;

export type ConvertHoldToReservationCommand = Readonly<{
  context: UnitCommandContext;
  holdId: string;
  requestedDurationHours?: number | null;
  approvalEvidence?: ApprovalEvidence | null;
  evidenceReference?: string | null;
}>;

export type CreateReservationCommand = Readonly<{
  context: UnitCommandContext;
  unitId: string;
  customer: CustomerReference;
  requestedDurationHours?: number | null;
  requiresApproval?: boolean;
  approvalEvidence?: ApprovalEvidence | null;
  evidenceReference?: string | null;
}>;

export type ApproveReservationCommand = Readonly<{
  context: UnitCommandContext;
  reservationId: string;
  initiatedByActorId?: string | null;
  approvalReference: string;
}>;

export type RejectReservationCommand = Readonly<{
  context: UnitCommandContext;
  reservationId: string;
  initiatedByActorId?: string | null;
}>;

export type ExtendReservationCommand = Readonly<{
  context: UnitCommandContext;
  reservationId: string;
  requestedDurationHours: number;
  approvalEvidence?: ApprovalEvidence | null;
}>;

export type ReservationLifecycleCommand = Readonly<{
  context: UnitCommandContext;
  reservationId: string;
}>;

export type MarkReservationConvertedCommand = Readonly<{
  context: UnitCommandContext;
  reservationId: string;
  downstreamReference: string;
}>;

export type ReservationConversionHandoff = Readonly<{
  reservationId: string;
  tenantId: string;
  branchId: string;
  unitId: string;
  partyId: string | null;
  customerAccountId: string | null;
  opportunityId: string | null;
  downstreamReference: string;
  convertedAt: Date;
  createsContract: false;
  createsInvoice: false;
  recordsPayment: false;
}>;

export type CreateTourAppointmentCommand = Readonly<{
  context: UnitCommandContext;
  branchId: string;
  unitId?: string | null;
  staffUserId: string;
  operationalResourceId?: string | null;
  customer: CustomerReference;
  startAtUtc: Date;
  endAtUtc: Date;
  timezone?: string | null;
  location: string;
}>;

export type TourLifecycleCommand = Readonly<{
  context: UnitCommandContext;
  tourId: string;
}>;

export type RescheduleTourAppointmentCommand = Readonly<{
  context: UnitCommandContext;
  tourId: string;
  startAtUtc: Date;
  endAtUtc: Date;
  timezone?: string | null;
}>;

export type ReconcileExpiredCommitmentsCommand = Readonly<{
  context: UnitCommandContext;
  cursor?: string | null;
  limit?: number;
}>;

export type ReconcileExpiredCommitmentsResult = Readonly<{
  processed: number;
  expired: number;
  nextCursor: string | null;
}>;

export type UnitCommitmentErrorCode =
  | "AUTHORITY_DENIED"
  | "RESOURCE_SCOPE_DENIED"
  | "TENANT_SCOPE_MISMATCH"
  | "MISSING_ACTOR"
  | "MISSING_TENANT"
  | "MISSING_INITIATOR"
  | "SELF_APPROVAL_DENIED"
  | "MISSING_REASON"
  | "MISSING_IDEMPOTENCY_KEY"
  | "IDEMPOTENCY_PAYLOAD_MISMATCH"
  | "CONCURRENCY_CONFLICT"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INVALID_STATE_TRANSITION"
  | "UNIT_NOT_AVAILABLE"
  | "COMMITMENT_CONFLICT"
  | "TOUR_CONFLICT"
  | "DURATION_LIMIT_EXCEEDED"
  | "APPROVAL_REQUIRED"
  | "APPROVAL_DENIED"
  | "NOT_EXPIRED"
  | "UNKNOWN_FAIL_CLOSED";

export class UnitCommitmentError extends Error {
  constructor(
    public readonly code: UnitCommitmentErrorCode,
    message: string,
    public readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = "UnitCommitmentError";
  }
}