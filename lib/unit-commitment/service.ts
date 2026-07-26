import { createHash } from "node:crypto";

import type { OrganizationScopeAssignment } from "@/lib/organization/contracts";
import {
  assertIndependentApproval,
  assertUnitCommitmentAuthority,
  canDiscloseBlockingCustomer,
  validateUnitCommandContext,
} from "@/lib/unit-commitment/authority";
import {
  DEFAULT_UNIT_COMMITMENT_POLICY,
  UnitCommitmentError,
  type ApprovalEvidence,
  type ApproveReservationCommand,
  type AvailabilityDecision,
  type CommitmentHistoryEntry,
  type ConvertHoldToReservationCommand,
  type CreateReservationCommand,
  type CreateTourAppointmentCommand,
  type CreateUnitHoldCommand,
  type CustomerReference,
  type EvaluateUnitAvailabilityCommand,
  type Exec006PermissionKey,
  type ExtendReservationCommand,
  type ExtendUnitHoldCommand,
  type HoldLifecycleCommand,
  type MarkReservationConvertedCommand,
  type ReconcileExpiredCommitmentsCommand,
  type ReconcileExpiredCommitmentsResult,
  type RejectReservationCommand,
  type ReservationConversionHandoff,
  type ReservationLifecycleCommand,
  type RescheduleTourAppointmentCommand,
  type TourAppointment,
  type TourLifecycleCommand,
  type UnitCommandContext,
  type UnitCommitment,
  type UnitCommitmentPolicy,
  type UnitCommitmentState,
  type UnitInventoryRecord,
  type UnitResourceScope,
} from "@/lib/unit-commitment/contracts";
import {
  appendCommitmentHistory,
  appendTourHistory,
  appendUnitCommitmentAudit,
  nextUnitCommitmentId,
  type UnitCommitmentRepository,
} from "@/lib/unit-commitment/repository";

const BLOCKING_HOLD_STATUSES = new Set(["PENDING", "ACTIVE"]);
const BLOCKING_RESERVATION_STATUSES = new Set([
  "PENDING_APPROVAL",
  "ACTIVE",
]);
const ACTIVE_TOUR_STATUSES = new Set([
  "REQUESTED",
  "CONFIRMED",
  "RESCHEDULED",
]);

function contextNow(context: UnitCommandContext): Date {
  return context.timestamp ?? new Date();
}

function stableValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

function fingerprint(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

function requireIdempotencyKey(
  context: UnitCommandContext,
  operation: string,
): string {
  const key = context.idempotencyKey?.trim();
  if (!key) {
    throw new UnitCommitmentError(
      "MISSING_IDEMPOTENCY_KEY",
      `${operation} requires an idempotency key`,
    );
  }
  return key;
}

function requireReason(context: UnitCommandContext, operation: string): string {
  const reason = context.reason?.trim();
  if (!reason) {
    throw new UnitCommitmentError(
      "MISSING_REASON",
      `${operation} requires a reason`,
    );
  }
  return reason;
}

function assertExpectedVersion(
  expectedVersion: number | null | undefined,
  actualVersion: number,
): void {
  if (
    expectedVersion !== null &&
    expectedVersion !== undefined &&
    expectedVersion !== actualVersion
  ) {
    throw new UnitCommitmentError(
      "CONCURRENCY_CONFLICT",
      "Expected version does not match current version",
      { expectedVersion, actualVersion },
    );
  }
}

function assertCustomerReference(customer: CustomerReference): void {
  if (
    !customer.partyId?.trim() &&
    !customer.customerAccountId?.trim() &&
    !customer.opportunityId?.trim()
  ) {
    throw new UnitCommitmentError(
      "VALIDATION_ERROR",
      "A Party, Customer Account or Opportunity reference is required",
    );
  }
}

function customerFromCommitment(
  commitment: UnitCommitment,
): CustomerReference {
  return {
    partyId: commitment.partyId,
    customerAccountId: commitment.customerAccountId,
    opportunityId: commitment.opportunityId,
  };
}

function unitResource(unit: UnitInventoryRecord): UnitResourceScope {
  return {
    branchId: unit.branchId,
    resourceType: "UNIT",
    resourceId: unit.id,
  };
}

function commitmentResource(
  commitment: UnitCommitment,
): UnitResourceScope {
  return {
    branchId: commitment.branchId,
    resourceType: "UNIT_COMMITMENT",
    resourceId: commitment.id,
  };
}

function tourResource(tour: TourAppointment): UnitResourceScope {
  return {
    branchId: tour.branchId,
    resourceType: "TOUR_APPOINTMENT",
    resourceId: tour.id,
  };
}

function isCommitmentBlocking(commitment: UnitCommitment, now: Date): boolean {
  if (commitment.expiresAt <= now) return false;
  if (commitment.type === "HOLD") {
    return BLOCKING_HOLD_STATUSES.has(commitment.status);
  }
  return BLOCKING_RESERVATION_STATUSES.has(commitment.status);
}

function overlaps(
  leftStart: Date,
  leftEnd: Date,
  rightStart: Date,
  rightEnd: Date,
): boolean {
  return leftStart < rightEnd && leftEnd > rightStart;
}

function assertValidTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new UnitCommitmentError(
      "VALIDATION_ERROR",
      "Tour timezone is invalid",
      { timezone },
    );
  }
}

function assertValidWindow(startAt: Date, endAt: Date): void {
  if (
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endAt.getTime()) ||
    endAt <= startAt
  ) {
    throw new UnitCommitmentError(
      "VALIDATION_ERROR",
      "The requested time window is invalid",
    );
  }
}

function assignmentIsActive(
  assignment: OrganizationScopeAssignment,
  now: Date,
): boolean {
  if (!assignment.active) return false;
  if (assignment.startsAt && assignment.startsAt > now) return false;
  if (assignment.endsAt && assignment.endsAt <= now) return false;
  return true;
}

function validateScheduledStaff(
  context: UnitCommandContext,
  staffUserId: string,
  branchId: string,
): void {
  const now = contextNow(context);
  const assignment = context.assignments.find(
    (candidate) =>
      candidate.userId === staffUserId &&
      candidate.tenantId === context.tenantId &&
      assignmentIsActive(candidate, now) &&
      (candidate.scopeType === "COMPANY" ||
        (candidate.scopeType === "BRANCH" &&
          candidate.branchId === branchId) ||
        (candidate.scopeType === "DEPARTMENT" &&
          (!candidate.branchId || candidate.branchId === branchId)) ||
        (candidate.scopeType === "TEAM" &&
          (!candidate.branchId || candidate.branchId === branchId)) ||
        (candidate.scopeType === "ASSIGNED_RESOURCE" &&
          (!candidate.branchId || candidate.branchId === branchId))),
  );
  if (!assignment) {
    throw new UnitCommitmentError(
      "RESOURCE_SCOPE_DENIED",
      "Scheduled staff lacks an active persisted assignment for this branch",
      { staffUserId, branchId },
    );
  }
}

export class UnitCommitmentService {
  private readonly policy: UnitCommitmentPolicy;

  constructor(
    private readonly repository: UnitCommitmentRepository,
    policy: Partial<UnitCommitmentPolicy> = {},
  ) {
    this.policy = { ...DEFAULT_UNIT_COMMITMENT_POLICY, ...policy };
    if (
      this.policy.defaultHoldDurationHours <= 0 ||
      this.policy.standardMaximumHoldHours <= 0 ||
      this.policy.absoluteMaximumHoldHours <
        this.policy.standardMaximumHoldHours ||
      this.policy.defaultReservationDurationHours <= 0 ||
      this.policy.standardMaximumReservationHours <= 0 ||
      this.policy.absoluteMaximumReservationHours <
        this.policy.standardMaximumReservationHours
    ) {
      throw new UnitCommitmentError(
        "VALIDATION_ERROR",
        "Commitment duration policy is invalid",
      );
    }
    assertValidTimezone(this.policy.companyTimezone);
  }

  evaluateUnitAvailability(
    command: EvaluateUnitAvailabilityCommand,
  ): AvailabilityDecision {
    validateUnitCommandContext(command.context);
    return this.repository.read((state) => {
      const unit = this.requireUnit(
        state,
        command.context.tenantId,
        command.unitId,
      );
      assertUnitCommitmentAuthority(
        command.context,
        "UNIT_AVAILABILITY_READ",
        unitResource(unit),
      );
      const disclose =
        command.discloseBlockingCustomer === true &&
        canDiscloseBlockingCustomer(command.context, unitResource(unit));
      return this.evaluateInState(
        state,
        unit,
        contextNow(command.context),
        disclose,
      );
    });
  }

  createUnitHold(command: CreateUnitHoldCommand): UnitCommitment {
    validateUnitCommandContext(command.context);
    assertCustomerReference(command.customer);
    return this.repository.transaction((state) =>
      this.idempotent(
        state,
        command.context,
        "CreateUnitHold",
        {
          unitId: command.unitId,
          customer: command.customer,
          requestedDurationHours: command.requestedDurationHours ?? null,
          approvalEvidence: command.approvalEvidence ?? null,
        },
        () => {
          const unit = this.requireUnit(
            state,
            command.context.tenantId,
            command.unitId,
          );
          const assignment = assertUnitCommitmentAuthority(
            command.context,
            "UNIT_HOLD_CREATE",
            unitResource(unit),
          );
          const durationHours = this.validateDuration(
            command.context,
            unit,
            "HOLD",
            command.requestedDurationHours ??
              this.policy.defaultHoldDurationHours,
            command.approvalEvidence ?? null,
          );
          this.assertAvailableForExclusiveCommitment(
            state,
            unit,
            contextNow(command.context),
          );
          const timestamp = contextNow(command.context);
          const key = requireIdempotencyKey(
            command.context,
            "CreateUnitHold",
          );
          const hold: UnitCommitment = {
            id: nextUnitCommitmentId(state, "hold"),
            tenantId: command.context.tenantId,
            branchId: unit.branchId,
            unitId: unit.id,
            type: "HOLD",
            status: "ACTIVE",
            partyId: command.customer.partyId ?? null,
            customerAccountId: command.customer.customerAccountId ?? null,
            opportunityId: command.customer.opportunityId ?? null,
            startsAt: timestamp,
            expiresAt: new Date(
              timestamp.getTime() + durationHours * 60 * 60 * 1000,
            ),
            version: 1,
            createdByActorId: command.context.actorId,
            updatedByActorId: command.context.actorId,
            createdAt: timestamp,
            updatedAt: timestamp,
            reason: command.context.reason ?? null,
            idempotencyKey: key,
            approvalEvidence: command.approvalEvidence ?? null,
            convertedFromCommitmentId: null,
            convertedToCommitmentId: null,
            evidenceReference: null,
          };
          this.recordCommitmentTransition(
            state,
            command.context,
            assignment,
            "CreateUnitHold",
            null,
            hold,
          );
          return hold;
        },
      ),
    );
  }

  extendUnitHold(command: ExtendUnitHoldCommand): UnitCommitment {
    validateUnitCommandContext(command.context);
    requireReason(command.context, "ExtendUnitHold");
    return this.repository.transaction((state) =>
      this.idempotent(
        state,
        command.context,
        "ExtendUnitHold",
        {
          holdId: command.holdId,
          requestedDurationHours: command.requestedDurationHours,
          approvalEvidence: command.approvalEvidence ?? null,
          expectedVersion: command.context.expectedVersion ?? null,
        },
        () => {
          const hold = this.requireCommitment(
            state,
            command.context.tenantId,
            command.holdId,
            "HOLD",
          );
          const unit = this.requireUnit(
            state,
            command.context.tenantId,
            hold.unitId,
          );
          const assignment = assertUnitCommitmentAuthority(
            command.context,
            "UNIT_HOLD_EXTEND",
            commitmentResource(hold),
          );
          assertExpectedVersion(
            command.context.expectedVersion,
            hold.version,
          );
          const timestamp = contextNow(command.context);
          if (hold.status !== "ACTIVE" || hold.expiresAt <= timestamp) {
            throw new UnitCommitmentError(
              "INVALID_STATE_TRANSITION",
              "Only a non-expired active Hold can be extended",
            );
          }
          const durationHours = this.validateDuration(
            command.context,
            unit,
            "HOLD",
            command.requestedDurationHours,
            command.approvalEvidence ?? null,
          );
          const nextExpiry = new Date(
            timestamp.getTime() + durationHours * 60 * 60 * 1000,
          );
          if (nextExpiry <= hold.expiresAt) {
            throw new UnitCommitmentError(
              "VALIDATION_ERROR",
              "The new Hold expiry must be later than the current expiry",
            );
          }
          const next: UnitCommitment = {
            ...hold,
            expiresAt: nextExpiry,
            approvalEvidence:
              command.approvalEvidence ?? hold.approvalEvidence,
            version: hold.version + 1,
            updatedAt: timestamp,
            updatedByActorId: command.context.actorId,
            reason: command.context.reason ?? hold.reason,
          };
          this.recordCommitmentTransition(
            state,
            command.context,
            assignment,
            "ExtendUnitHold",
            hold,
            next,
          );
          return next;
        },
      ),
    );
  }

  releaseUnitHold(command: HoldLifecycleCommand): UnitCommitment {
    return this.transitionHold(command, "ReleaseUnitHold", "RELEASED");
  }

  cancelUnitHold(command: HoldLifecycleCommand): UnitCommitment {
    return this.transitionHold(command, "CancelUnitHold", "CANCELLED");
  }

  expireUnitHold(command: HoldLifecycleCommand): UnitCommitment {
    validateUnitCommandContext(command.context);
    return this.repository.transaction((state) =>
      this.idempotent(
        state,
        command.context,
        "ExpireUnitHold",
        {
          holdId: command.holdId,
          expectedVersion: command.context.expectedVersion ?? null,
        },
        () => {
          const hold = this.requireCommitment(
            state,
            command.context.tenantId,
            command.holdId,
            "HOLD",
          );
          const assignment = assertUnitCommitmentAuthority(
            command.context,
            "UNIT_HOLD_RELEASE",
            commitmentResource(hold),
          );
          if (hold.status === "EXPIRED") return hold;
          assertExpectedVersion(
            command.context.expectedVersion,
            hold.version,
          );
          if (hold.status !== "ACTIVE") {
            throw new UnitCommitmentError(
              "INVALID_STATE_TRANSITION",
              "Only an active Hold can expire",
            );
          }
          const timestamp = contextNow(command.context);
          if (hold.expiresAt > timestamp) {
            throw new UnitCommitmentError(
              "NOT_EXPIRED",
              "Hold expiry time has not been reached",
            );
          }
          const next: UnitCommitment = {
            ...hold,
            status: "EXPIRED",
            version: hold.version + 1,
            updatedAt: timestamp,
            updatedByActorId: command.context.actorId,
          };
          this.recordCommitmentTransition(
            state,
            command.context,
            assignment,
            "ExpireUnitHold",
            hold,
            next,
          );
          return next;
        },
      ),
    );
  }

  convertHoldToReservation(
    command: ConvertHoldToReservationCommand,
  ): UnitCommitment {
    validateUnitCommandContext(command.context);
    requireReason(command.context, "ConvertHoldToReservation");
    return this.repository.transaction((state) =>
      this.idempotent(
        state,
        command.context,
        "ConvertHoldToReservation",
        {
          holdId: command.holdId,
          requestedDurationHours: command.requestedDurationHours ?? null,
          approvalEvidence: command.approvalEvidence ?? null,
          evidenceReference: command.evidenceReference ?? null,
          expectedVersion: command.context.expectedVersion ?? null,
        },
        () => {
          const hold = this.requireCommitment(
            state,
            command.context.tenantId,
            command.holdId,
            "HOLD",
          );
          if (hold.status === "CONVERTED") {
            throw new UnitCommitmentError(
              "INVALID_STATE_TRANSITION",
              "Hold has already been converted",
            );
          }
          const unit = this.requireUnit(
            state,
            command.context.tenantId,
            hold.unitId,
          );
          const assignment = assertUnitCommitmentAuthority(
            command.context,
            "RESERVATION_CONVERT",
            commitmentResource(hold),
          );
          assertUnitCommitmentAuthority(
            command.context,
            "RESERVATION_CREATE",
            unitResource(unit),
          );
          assertExpectedVersion(
            command.context.expectedVersion,
            hold.version,
          );
          const timestamp = contextNow(command.context);
          if (hold.status !== "ACTIVE" || hold.expiresAt <= timestamp) {
            throw new UnitCommitmentError(
              "INVALID_STATE_TRANSITION",
              "Only a non-expired active Hold can be converted",
            );
          }
          const conflict = this.findBlockingCommitment(
            state,
            unit.id,
            timestamp,
            hold.id,
          );
          if (conflict) {
            throw new UnitCommitmentError(
              "COMMITMENT_CONFLICT",
              "Another exclusive commitment blocks conversion",
              { blockingCommitmentId: conflict.id },
            );
          }
          const durationHours = this.validateDuration(
            command.context,
            unit,
            "RESERVATION",
            command.requestedDurationHours ??
              this.policy.defaultReservationDurationHours,
            command.approvalEvidence ?? null,
          );
          const key = requireIdempotencyKey(
            command.context,
            "ConvertHoldToReservation",
          );
          const reservationId = nextUnitCommitmentId(state, "reservation");
          const convertedHold: UnitCommitment = {
            ...hold,
            status: "CONVERTED",
            convertedToCommitmentId: reservationId,
            version: hold.version + 1,
            updatedAt: timestamp,
            updatedByActorId: command.context.actorId,
            reason: command.context.reason ?? hold.reason,
          };
          const reservation: UnitCommitment = {
            id: reservationId,
            tenantId: hold.tenantId,
            branchId: hold.branchId,
            unitId: hold.unitId,
            type: "RESERVATION",
            status: "ACTIVE",
            partyId: hold.partyId,
            customerAccountId: hold.customerAccountId,
            opportunityId: hold.opportunityId,
            startsAt: timestamp,
            expiresAt: new Date(
              timestamp.getTime() + durationHours * 60 * 60 * 1000,
            ),
            version: 1,
            createdByActorId: command.context.actorId,
            updatedByActorId: command.context.actorId,
            createdAt: timestamp,
            updatedAt: timestamp,
            reason: command.context.reason ?? null,
            idempotencyKey: key,
            approvalEvidence: command.approvalEvidence ?? null,
            convertedFromCommitmentId: hold.id,
            convertedToCommitmentId: null,
            evidenceReference: command.evidenceReference ?? null,
          };
          this.recordCommitmentTransition(
            state,
            command.context,
            assignment,
            "ConvertHoldToReservation:HOLD",
            hold,
            convertedHold,
          );
          this.recordCommitmentTransition(
            state,
            command.context,
            assignment,
            "ConvertHoldToReservation:RESERVATION",
            null,
            reservation,
          );
          return reservation;
        },
      ),
    );
  }

  createReservation(command: CreateReservationCommand): UnitCommitment {
    validateUnitCommandContext(command.context);
    assertCustomerReference(command.customer);
    return this.repository.transaction((state) =>
      this.idempotent(
        state,
        command.context,
        "CreateReservation",
        {
          unitId: command.unitId,
          customer: command.customer,
          requestedDurationHours: command.requestedDurationHours ?? null,
          requiresApproval: command.requiresApproval ?? true,
          approvalEvidence: command.approvalEvidence ?? null,
          evidenceReference: command.evidenceReference ?? null,
        },
        () => {
          const unit = this.requireUnit(
            state,
            command.context.tenantId,
            command.unitId,
          );
          const assignment = assertUnitCommitmentAuthority(
            command.context,
            "RESERVATION_CREATE",
            unitResource(unit),
          );
          const durationHours = this.validateDuration(
            command.context,
            unit,
            "RESERVATION",
            command.requestedDurationHours ??
              this.policy.defaultReservationDurationHours,
            command.approvalEvidence ?? null,
          );
          this.assertAvailableForExclusiveCommitment(
            state,
            unit,
            contextNow(command.context),
          );
          const requiresApproval = command.requiresApproval ?? true;
          if (!requiresApproval) {
            this.validateApprovalEvidence(
              command.context,
              unit,
              "RESERVATION_APPROVE",
              command.approvalEvidence ?? null,
            );
          }
          const timestamp = contextNow(command.context);
          const key = requireIdempotencyKey(
            command.context,
            "CreateReservation",
          );
          const reservation: UnitCommitment = {
            id: nextUnitCommitmentId(state, "reservation"),
            tenantId: command.context.tenantId,
            branchId: unit.branchId,
            unitId: unit.id,
            type: "RESERVATION",
            status: requiresApproval ? "PENDING_APPROVAL" : "ACTIVE",
            partyId: command.customer.partyId ?? null,
            customerAccountId: command.customer.customerAccountId ?? null,
            opportunityId: command.customer.opportunityId ?? null,
            startsAt: timestamp,
            expiresAt: new Date(
              timestamp.getTime() + durationHours * 60 * 60 * 1000,
            ),
            version: 1,
            createdByActorId: command.context.actorId,
            updatedByActorId: command.context.actorId,
            createdAt: timestamp,
            updatedAt: timestamp,
            reason: command.context.reason ?? null,
            idempotencyKey: key,
            approvalEvidence: command.approvalEvidence ?? null,
            convertedFromCommitmentId: null,
            convertedToCommitmentId: null,
            evidenceReference: command.evidenceReference ?? null,
          };
          this.recordCommitmentTransition(
            state,
            command.context,
            assignment,
            "CreateReservation",
            null,
            reservation,
          );
          return reservation;
        },
      ),
    );
  }

  approveReservation(command: ApproveReservationCommand): UnitCommitment {
    validateUnitCommandContext(command.context);
    requireReason(command.context, "ApproveReservation");
    assertIndependentApproval(command.context, command.initiatedByActorId);
    if (!command.approvalReference.trim()) {
      throw new UnitCommitmentError(
        "VALIDATION_ERROR",
        "Approval reference is required",
      );
    }
    return this.repository.transaction((state) =>
      this.idempotent(
        state,
        command.context,
        "ApproveReservation",
        {
          reservationId: command.reservationId,
          initiatedByActorId: command.initiatedByActorId,
          approvalReference: command.approvalReference,
          expectedVersion: command.context.expectedVersion ?? null,
        },
        () => {
          const reservation = this.requireCommitment(
            state,
            command.context.tenantId,
            command.reservationId,
            "RESERVATION",
          );
          const assignment = assertUnitCommitmentAuthority(
            command.context,
            "RESERVATION_APPROVE",
            commitmentResource(reservation),
          );
          assertExpectedVersion(
            command.context.expectedVersion,
            reservation.version,
          );
          const timestamp = contextNow(command.context);
          if (
            reservation.status !== "PENDING_APPROVAL" ||
            reservation.expiresAt <= timestamp
          ) {
            throw new UnitCommitmentError(
              "INVALID_STATE_TRANSITION",
              "Only a non-expired pending Reservation can be approved",
            );
          }
          const conflict = this.findBlockingCommitment(
            state,
            reservation.unitId,
            timestamp,
            reservation.id,
          );
          if (conflict) {
            throw new UnitCommitmentError(
              "COMMITMENT_CONFLICT",
              "Another commitment blocks Reservation approval",
              { blockingCommitmentId: conflict.id },
            );
          }
          const approvalEvidence: ApprovalEvidence = {
            approvedByActorId: command.context.actorId,
            approverAssignments: [assignment],
            approvedAt: timestamp,
            approvalReference: command.approvalReference,
            reason: command.context.reason ?? "approved",
          };
          const next: UnitCommitment = {
            ...reservation,
            status: "ACTIVE",
            approvalEvidence,
            version: reservation.version + 1,
            updatedAt: timestamp,
            updatedByActorId: command.context.actorId,
            reason: command.context.reason ?? reservation.reason,
          };
          this.recordCommitmentTransition(
            state,
            command.context,
            assignment,
            "ApproveReservation",
            reservation,
            next,
          );
          return next;
        },
      ),
    );
  }

  rejectReservation(command: RejectReservationCommand): UnitCommitment {
    validateUnitCommandContext(command.context);
    requireReason(command.context, "RejectReservation");
    assertIndependentApproval(command.context, command.initiatedByActorId);
    return this.repository.transaction((state) =>
      this.idempotent(
        state,
        command.context,
        "RejectReservation",
        {
          reservationId: command.reservationId,
          initiatedByActorId: command.initiatedByActorId,
          expectedVersion: command.context.expectedVersion ?? null,
        },
        () => {
          const reservation = this.requireCommitment(
            state,
            command.context.tenantId,
            command.reservationId,
            "RESERVATION",
          );
          const assignment = assertUnitCommitmentAuthority(
            command.context,
            "RESERVATION_APPROVE",
            commitmentResource(reservation),
          );
          assertExpectedVersion(
            command.context.expectedVersion,
            reservation.version,
          );
          if (reservation.status === "REJECTED") return reservation;
          if (reservation.status !== "PENDING_APPROVAL") {
            throw new UnitCommitmentError(
              "INVALID_STATE_TRANSITION",
              "Only a pending Reservation can be rejected",
            );
          }
          const timestamp = contextNow(command.context);
          const next: UnitCommitment = {
            ...reservation,
            status: "REJECTED",
            version: reservation.version + 1,
            updatedAt: timestamp,
            updatedByActorId: command.context.actorId,
            reason: command.context.reason ?? reservation.reason,
          };
          this.recordCommitmentTransition(
            state,
            command.context,
            assignment,
            "RejectReservation",
            reservation,
            next,
          );
          return next;
        },
      ),
    );
  }

  extendReservation(command: ExtendReservationCommand): UnitCommitment {
    validateUnitCommandContext(command.context);
    requireReason(command.context, "ExtendReservation");
    return this.repository.transaction((state) =>
      this.idempotent(
        state,
        command.context,
        "ExtendReservation",
        {
          reservationId: command.reservationId,
          requestedDurationHours: command.requestedDurationHours,
          approvalEvidence: command.approvalEvidence ?? null,
          expectedVersion: command.context.expectedVersion ?? null,
        },
        () => {
          const reservation = this.requireCommitment(
            state,
            command.context.tenantId,
            command.reservationId,
            "RESERVATION",
          );
          const unit = this.requireUnit(
            state,
            command.context.tenantId,
            reservation.unitId,
          );
          const assignment = assertUnitCommitmentAuthority(
            command.context,
            "RESERVATION_EXTEND",
            commitmentResource(reservation),
          );
          assertExpectedVersion(
            command.context.expectedVersion,
            reservation.version,
          );
          const timestamp = contextNow(command.context);
          if (
            reservation.status !== "ACTIVE" ||
            reservation.expiresAt <= timestamp
          ) {
            throw new UnitCommitmentError(
              "INVALID_STATE_TRANSITION",
              "Only a non-expired active Reservation can be extended",
            );
          }
          const durationHours = this.validateDuration(
            command.context,
            unit,
            "RESERVATION",
            command.requestedDurationHours,
            command.approvalEvidence ?? null,
          );
          const nextExpiry = new Date(
            timestamp.getTime() + durationHours * 60 * 60 * 1000,
          );
          if (nextExpiry <= reservation.expiresAt) {
            throw new UnitCommitmentError(
              "VALIDATION_ERROR",
              "The new Reservation expiry must be later than current expiry",
            );
          }
          const next: UnitCommitment = {
            ...reservation,
            expiresAt: nextExpiry,
            approvalEvidence:
              command.approvalEvidence ?? reservation.approvalEvidence,
            version: reservation.version + 1,
            updatedAt: timestamp,
            updatedByActorId: command.context.actorId,
            reason: command.context.reason ?? reservation.reason,
          };
          this.recordCommitmentTransition(
            state,
            command.context,
            assignment,
            "ExtendReservation",
            reservation,
            next,
          );
          return next;
        },
      ),
    );
  }

  releaseReservation(command: ReservationLifecycleCommand): UnitCommitment {
    return this.transitionReservation(
      command,
      "ReleaseReservation",
      "RELEASED",
      "RESERVATION_RELEASE",
    );
  }

  cancelReservation(command: ReservationLifecycleCommand): UnitCommitment {
    return this.transitionReservation(
      command,
      "CancelReservation",
      "CANCELLED",
      "RESERVATION_CANCEL",
    );
  }

  expireReservation(command: ReservationLifecycleCommand): UnitCommitment {
    validateUnitCommandContext(command.context);
    return this.repository.transaction((state) =>
      this.idempotent(
        state,
        command.context,
        "ExpireReservation",
        {
          reservationId: command.reservationId,
          expectedVersion: command.context.expectedVersion ?? null,
        },
        () => {
          const reservation = this.requireCommitment(
            state,
            command.context.tenantId,
            command.reservationId,
            "RESERVATION",
          );
          const assignment = assertUnitCommitmentAuthority(
            command.context,
            "RESERVATION_RELEASE",
            commitmentResource(reservation),
          );
          if (reservation.status === "EXPIRED") return reservation;
          assertExpectedVersion(
            command.context.expectedVersion,
            reservation.version,
          );
          if (
            reservation.status !== "ACTIVE" &&
            reservation.status !== "PENDING_APPROVAL"
          ) {
            throw new UnitCommitmentError(
              "INVALID_STATE_TRANSITION",
              "Only an active or pending Reservation can expire",
            );
          }
          const timestamp = contextNow(command.context);
          if (reservation.expiresAt > timestamp) {
            throw new UnitCommitmentError(
              "NOT_EXPIRED",
              "Reservation expiry time has not been reached",
            );
          }
          const next: UnitCommitment = {
            ...reservation,
            status: "EXPIRED",
            version: reservation.version + 1,
            updatedAt: timestamp,
            updatedByActorId: command.context.actorId,
          };
          this.recordCommitmentTransition(
            state,
            command.context,
            assignment,
            "ExpireReservation",
            reservation,
            next,
          );
          return next;
        },
      ),
    );
  }

  markReservationConverted(
    command: MarkReservationConvertedCommand,
  ): ReservationConversionHandoff {
    validateUnitCommandContext(command.context);
    requireReason(command.context, "MarkReservationConverted");
    if (!command.downstreamReference.trim()) {
      throw new UnitCommitmentError(
        "VALIDATION_ERROR",
        "A downstream conversion reference is required",
      );
    }
    return this.repository.transaction((state) =>
      this.idempotent(
        state,
        command.context,
        "MarkReservationConverted",
        {
          reservationId: command.reservationId,
          downstreamReference: command.downstreamReference,
          expectedVersion: command.context.expectedVersion ?? null,
        },
        () => {
          const reservation = this.requireCommitment(
            state,
            command.context.tenantId,
            command.reservationId,
            "RESERVATION",
          );
          const assignment = assertUnitCommitmentAuthority(
            command.context,
            "RESERVATION_CONVERT",
            commitmentResource(reservation),
          );
          assertExpectedVersion(
            command.context.expectedVersion,
            reservation.version,
          );
          const timestamp = contextNow(command.context);
          if (
            reservation.status !== "ACTIVE" ||
            reservation.expiresAt <= timestamp
          ) {
            throw new UnitCommitmentError(
              "INVALID_STATE_TRANSITION",
              "Only a non-expired active Reservation can be converted",
            );
          }
          const next: UnitCommitment = {
            ...reservation,
            status: "CONVERTED",
            evidenceReference: command.downstreamReference,
            version: reservation.version + 1,
            updatedAt: timestamp,
            updatedByActorId: command.context.actorId,
            reason: command.context.reason ?? reservation.reason,
          };
          this.recordCommitmentTransition(
            state,
            command.context,
            assignment,
            "MarkReservationConverted",
            reservation,
            next,
          );
          return {
            reservationId: next.id,
            tenantId: next.tenantId,
            branchId: next.branchId,
            unitId: next.unitId,
            partyId: next.partyId,
            customerAccountId: next.customerAccountId,
            opportunityId: next.opportunityId,
            downstreamReference: command.downstreamReference,
            convertedAt: timestamp,
            createsContract: false,
            createsInvoice: false,
            recordsPayment: false,
          };
        },
      ),
    );
  }

  createTourAppointment(
    command: CreateTourAppointmentCommand,
  ): TourAppointment {
    validateUnitCommandContext(command.context);
    assertCustomerReference(command.customer);
    assertValidWindow(command.startAtUtc, command.endAtUtc);
    const timezone = command.timezone?.trim() || this.policy.companyTimezone;
    assertValidTimezone(timezone);
    if (!command.branchId.trim() || !command.staffUserId.trim()) {
      throw new UnitCommitmentError(
        "VALIDATION_ERROR",
        "Tour branch and staff are required",
      );
    }
    if (!command.location.trim()) {
      throw new UnitCommitmentError(
        "VALIDATION_ERROR",
        "Tour location is required",
      );
    }
    return this.repository.transaction((state) =>
      this.idempotent(
        state,
        command.context,
        "CreateTourAppointment",
        {
          branchId: command.branchId,
          unitId: command.unitId ?? null,
          staffUserId: command.staffUserId,
          operationalResourceId: command.operationalResourceId ?? null,
          customer: command.customer,
          startAtUtc: command.startAtUtc,
          endAtUtc: command.endAtUtc,
          timezone,
          location: command.location,
        },
        () => {
          const unit = command.unitId
            ? this.requireUnit(
                state,
                command.context.tenantId,
                command.unitId,
              )
            : null;
          const actualBranch = unit?.branchId ?? command.branchId;
          if (actualBranch !== command.branchId) {
            throw new UnitCommitmentError(
              "RESOURCE_SCOPE_DENIED",
              "Forged Tour branch does not match persisted Unit branch",
              { requestedBranchId: command.branchId, actualBranchId: actualBranch },
            );
          }
          const assignment = assertUnitCommitmentAuthority(
            command.context,
            "TOUR_CREATE",
            {
              branchId: actualBranch,
              resourceType: "TOUR_APPOINTMENT",
              resourceId: "NEW",
            },
          );
          validateScheduledStaff(
            command.context,
            command.staffUserId,
            actualBranch,
          );
          this.assertTourWindowAvailable(
            state,
            command.context.tenantId,
            actualBranch,
            command.staffUserId,
            command.operationalResourceId ?? null,
            unit?.id ?? null,
            command.startAtUtc,
            command.endAtUtc,
          );
          const timestamp = contextNow(command.context);
          const key = requireIdempotencyKey(
            command.context,
            "CreateTourAppointment",
          );
          const tour: TourAppointment = {
            id: nextUnitCommitmentId(state, "tour"),
            tenantId: command.context.tenantId,
            branchId: actualBranch,
            unitId: unit?.id ?? null,
            staffUserId: command.staffUserId,
            operationalResourceId: command.operationalResourceId ?? null,
            partyId: command.customer.partyId ?? null,
            customerAccountId: command.customer.customerAccountId ?? null,
            opportunityId: command.customer.opportunityId ?? null,
            status: "REQUESTED",
            startAtUtc: command.startAtUtc,
            endAtUtc: command.endAtUtc,
            timezone,
            location: command.location.trim(),
            version: 1,
            createdByActorId: command.context.actorId,
            updatedByActorId: command.context.actorId,
            createdAt: timestamp,
            updatedAt: timestamp,
            reason: command.context.reason ?? null,
            idempotencyKey: key,
          };
          this.recordTourTransition(
            state,
            command.context,
            assignment,
            "CreateTourAppointment",
            null,
            tour,
          );
          return tour;
        },
      ),
    );
  }

  confirmTourAppointment(command: TourLifecycleCommand): TourAppointment {
    return this.transitionTour(
      command,
      "ConfirmTourAppointment",
      "CONFIRMED",
      "TOUR_CONFIRM",
      new Set(["REQUESTED", "RESCHEDULED"]),
      false,
    );
  }

  rescheduleTourAppointment(
    command: RescheduleTourAppointmentCommand,
  ): TourAppointment {
    validateUnitCommandContext(command.context);
    requireReason(command.context, "RescheduleTourAppointment");
    assertValidWindow(command.startAtUtc, command.endAtUtc);
    const timezone = command.timezone?.trim() || this.policy.companyTimezone;
    assertValidTimezone(timezone);
    return this.repository.transaction((state) =>
      this.idempotent(
        state,
        command.context,
        "RescheduleTourAppointment",
        {
          tourId: command.tourId,
          startAtUtc: command.startAtUtc,
          endAtUtc: command.endAtUtc,
          timezone,
          expectedVersion: command.context.expectedVersion ?? null,
        },
        () => {
          const tour = this.requireTour(
            state,
            command.context.tenantId,
            command.tourId,
          );
          const assignment = assertUnitCommitmentAuthority(
            command.context,
            "TOUR_RESCHEDULE",
            tourResource(tour),
          );
          assertExpectedVersion(
            command.context.expectedVersion,
            tour.version,
          );
          if (!ACTIVE_TOUR_STATUSES.has(tour.status)) {
            throw new UnitCommitmentError(
              "INVALID_STATE_TRANSITION",
              "Only an active Tour can be rescheduled",
            );
          }
          this.assertTourWindowAvailable(
            state,
            tour.tenantId,
            tour.branchId,
            tour.staffUserId,
            tour.operationalResourceId,
            tour.unitId,
            command.startAtUtc,
            command.endAtUtc,
            tour.id,
          );
          const timestamp = contextNow(command.context);
          const next: TourAppointment = {
            ...tour,
            status: "RESCHEDULED",
            startAtUtc: command.startAtUtc,
            endAtUtc: command.endAtUtc,
            timezone,
            version: tour.version + 1,
            updatedAt: timestamp,
            updatedByActorId: command.context.actorId,
            reason: command.context.reason ?? tour.reason,
          };
          this.recordTourTransition(
            state,
            command.context,
            assignment,
            "RescheduleTourAppointment",
            tour,
            next,
          );
          return next;
        },
      ),
    );
  }

  completeTourAppointment(command: TourLifecycleCommand): TourAppointment {
    return this.transitionTour(
      command,
      "CompleteTourAppointment",
      "COMPLETED",
      "TOUR_COMPLETE",
      ACTIVE_TOUR_STATUSES,
      false,
    );
  }

  markTourNoShow(command: TourLifecycleCommand): TourAppointment {
    return this.transitionTour(
      command,
      "MarkTourNoShow",
      "NO_SHOW",
      "TOUR_COMPLETE",
      ACTIVE_TOUR_STATUSES,
      true,
    );
  }

  cancelTourAppointment(command: TourLifecycleCommand): TourAppointment {
    return this.transitionTour(
      command,
      "CancelTourAppointment",
      "CANCELLED",
      "TOUR_CANCEL",
      ACTIVE_TOUR_STATUSES,
      true,
    );
  }

  reconcileExpiredCommitments(
    command: ReconcileExpiredCommitmentsCommand,
  ): ReconcileExpiredCommitmentsResult {
    validateUnitCommandContext(command.context);
    const limit = Math.max(1, Math.min(command.limit ?? 100, 500));
    const cursor = command.cursor ?? null;
    return this.repository.transaction((state) => {
      const timestamp = contextNow(command.context);
      const candidates = [...state.commitments.values()]
        .filter(
          (commitment) =>
            commitment.tenantId === command.context.tenantId &&
            commitment.expiresAt <= timestamp &&
            ((commitment.type === "HOLD" &&
              commitment.status === "ACTIVE") ||
              (commitment.type === "RESERVATION" &&
                (commitment.status === "ACTIVE" ||
                  commitment.status === "PENDING_APPROVAL"))) &&
            (!cursor || commitment.id > cursor),
        )
        .sort((left, right) => left.id.localeCompare(right.id));
      const batch = candidates.slice(0, limit);
      let expired = 0;
      for (const commitment of batch) {
        const permission: Exec006PermissionKey =
          commitment.type === "HOLD"
            ? "UNIT_HOLD_RELEASE"
            : "RESERVATION_RELEASE";
        const assignment = assertUnitCommitmentAuthority(
          command.context,
          permission,
          commitmentResource(commitment),
        );
        const next: UnitCommitment = {
          ...commitment,
          status: "EXPIRED",
          version: commitment.version + 1,
          updatedAt: timestamp,
          updatedByActorId: command.context.actorId,
        };
        this.recordCommitmentTransition(
          state,
          command.context,
          assignment,
          "ReconcileExpiredCommitments",
          commitment,
          next,
        );
        expired += 1;
      }
      return {
        processed: batch.length,
        expired,
        nextCursor:
          candidates.length > batch.length
            ? batch.at(-1)?.id ?? null
            : null,
      };
    });
  }

  listCommitmentHistory(
    context: UnitCommandContext,
    unitId: string,
  ): readonly CommitmentHistoryEntry[] {
    validateUnitCommandContext(context);
    return this.repository.read((state) => {
      const unit = this.requireUnit(state, context.tenantId, unitId);
      assertUnitCommitmentAuthority(
        context,
        "COMMITMENT_AUDIT_READ",
        unitResource(unit),
      );
      return state.commitmentHistory.filter(
        (entry) =>
          entry.tenantId === context.tenantId && entry.unitId === unitId,
      );
    });
  }

  private requireUnit(
    state: Readonly<UnitCommitmentState>,
    tenantId: string,
    unitId: string,
  ): UnitInventoryRecord {
    const unit = state.units.get(unitId);
    if (!unit) {
      throw new UnitCommitmentError("NOT_FOUND", "Unit was not found", {
        unitId,
      });
    }
    if (unit.tenantId !== tenantId) {
      throw new UnitCommitmentError(
        "TENANT_SCOPE_MISMATCH",
        "Unit tenant does not match command tenant",
      );
    }
    return unit;
  }

  private requireCommitment(
    state: Readonly<UnitCommitmentState>,
    tenantId: string,
    commitmentId: string,
    type: UnitCommitment["type"],
  ): UnitCommitment {
    const commitment = state.commitments.get(commitmentId);
    if (!commitment || commitment.type !== type) {
      throw new UnitCommitmentError(
        "NOT_FOUND",
        `${type} commitment was not found`,
        { commitmentId },
      );
    }
    if (commitment.tenantId !== tenantId) {
      throw new UnitCommitmentError(
        "TENANT_SCOPE_MISMATCH",
        "Commitment tenant does not match command tenant",
      );
    }
    return commitment;
  }

  private requireTour(
    state: Readonly<UnitCommitmentState>,
    tenantId: string,
    tourId: string,
  ): TourAppointment {
    const tour = state.tours.get(tourId);
    if (!tour) {
      throw new UnitCommitmentError("NOT_FOUND", "Tour was not found", {
        tourId,
      });
    }
    if (tour.tenantId !== tenantId) {
      throw new UnitCommitmentError(
        "TENANT_SCOPE_MISMATCH",
        "Tour tenant does not match command tenant",
      );
    }
    return tour;
  }

  private evaluateInState(
    state: Readonly<UnitCommitmentState>,
    unit: UnitInventoryRecord,
    evaluatedAt: Date,
    discloseBlockingCustomer: boolean,
  ): AvailabilityDecision {
    const base = {
      unitId: unit.id,
      tenantId: unit.tenantId,
      branchId: unit.branchId,
      evaluatedAt,
      blockingCommitmentId: null,
      blockingType: null,
      blockingUntil: null,
      policyVersion: unit.policyVersion || this.policy.version,
      sourceVersion: unit.sourceVersion,
      blockingCustomerReference: null,
    } as const;
    if (
      unit.sourceVersion < 1 ||
      unit.consistencyState !== "CONSISTENT" ||
      unit.baseState === "UNKNOWN"
    ) {
      return {
        ...base,
        state: "UNKNOWN_FAIL_CLOSED",
        reasonCode: "INVENTORY_SOURCE_INCOMPLETE_OR_INCONSISTENT",
      };
    }
    if (unit.baseState === "INACTIVE") {
      return { ...base, state: "INACTIVE", reasonCode: "UNIT_INACTIVE" };
    }
    if (unit.contractualUnavailable) {
      return {
        ...base,
        state: "CONTRACTUALLY_UNAVAILABLE",
        reasonCode: "FINAL_CONTRACTUAL_LINK",
      };
    }
    if (unit.operationalBlocked) {
      return {
        ...base,
        state: "OPERATIONALLY_BLOCKED",
        reasonCode: unit.operationalReason || "OPERATIONAL_RESTRICTION",
      };
    }
    const blocker = this.findBlockingCommitment(
      state,
      unit.id,
      evaluatedAt,
    );
    if (blocker) {
      return {
        ...base,
        state: blocker.type === "HOLD" ? "HELD" : "RESERVED",
        blockingCommitmentId: blocker.id,
        blockingType: blocker.type,
        blockingUntil: blocker.expiresAt,
        reasonCode:
          blocker.type === "HOLD"
            ? "ACTIVE_HOLD"
            : "ACTIVE_RESERVATION",
        blockingCustomerReference: discloseBlockingCustomer
          ? customerFromCommitment(blocker)
          : null,
      };
    }
    return { ...base, state: "AVAILABLE", reasonCode: "NO_ACTIVE_BLOCKER" };
  }

  private findBlockingCommitment(
    state: Readonly<UnitCommitmentState>,
    unitId: string,
    now: Date,
    excludeCommitmentId?: string,
  ): UnitCommitment | null {
    return (
      [...state.commitments.values()]
        .filter(
          (commitment) =>
            commitment.unitId === unitId &&
            commitment.id !== excludeCommitmentId &&
            isCommitmentBlocking(commitment, now),
        )
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())[0] ??
      null
    );
  }

  private assertAvailableForExclusiveCommitment(
    state: Readonly<UnitCommitmentState>,
    unit: UnitInventoryRecord,
    now: Date,
  ): void {
    const decision = this.evaluateInState(state, unit, now, false);
    if (decision.state !== "AVAILABLE") {
      throw new UnitCommitmentError(
        decision.state === "UNKNOWN_FAIL_CLOSED"
          ? "UNKNOWN_FAIL_CLOSED"
          : "UNIT_NOT_AVAILABLE",
        `Unit is not available: ${decision.reasonCode}`,
        {
          availabilityState: decision.state,
          reasonCode: decision.reasonCode,
          blockingCommitmentId: decision.blockingCommitmentId,
        },
      );
    }
  }

  private validateDuration(
    context: UnitCommandContext,
    unit: UnitInventoryRecord,
    type: UnitCommitment["type"],
    requestedHours: number,
    approvalEvidence: ApprovalEvidence | null,
  ): number {
    if (!Number.isFinite(requestedHours) || requestedHours <= 0) {
      throw new UnitCommitmentError(
        "VALIDATION_ERROR",
        "Requested commitment duration must be positive",
      );
    }
    const standardMaximum =
      type === "HOLD"
        ? this.policy.standardMaximumHoldHours
        : this.policy.standardMaximumReservationHours;
    const absoluteMaximum =
      type === "HOLD"
        ? this.policy.absoluteMaximumHoldHours
        : this.policy.absoluteMaximumReservationHours;
    if (requestedHours > absoluteMaximum) {
      throw new UnitCommitmentError(
        "DURATION_LIMIT_EXCEEDED",
        "Requested duration exceeds the absolute bounded maximum",
        { type, requestedHours, absoluteMaximum },
      );
    }
    if (requestedHours > standardMaximum) {
      this.validateApprovalEvidence(
        context,
        unit,
        type === "HOLD" ? "UNIT_HOLD_OVERRIDE" : "RESERVATION_APPROVE",
        approvalEvidence,
      );
    }
    return requestedHours;
  }

  private validateApprovalEvidence(
    context: UnitCommandContext,
    unit: UnitInventoryRecord,
    permission: Exec006PermissionKey,
    approvalEvidence: ApprovalEvidence | null,
  ): void {
    if (!approvalEvidence) {
      throw new UnitCommitmentError(
        "APPROVAL_REQUIRED",
        "Independent elevated approval evidence is required",
      );
    }
    if (
      !approvalEvidence.approvedByActorId.trim() ||
      !approvalEvidence.approvalReference.trim() ||
      !approvalEvidence.reason.trim()
    ) {
      throw new UnitCommitmentError(
        "APPROVAL_DENIED",
        "Approval evidence is incomplete",
      );
    }
    if (approvalEvidence.approvedByActorId === context.actorId) {
      throw new UnitCommitmentError(
        "SELF_APPROVAL_DENIED",
        "An actor cannot approve their own elevated request",
      );
    }
    assertUnitCommitmentAuthority(context, permission, unitResource(unit), {
      actorId: approvalEvidence.approvedByActorId,
      assignments: approvalEvidence.approverAssignments,
    });
  }

  private idempotent<T>(
    state: UnitCommitmentState,
    context: UnitCommandContext,
    operation: string,
    payload: unknown,
    execute: () => T,
  ): T {
    const key = requireIdempotencyKey(context, operation);
    const storageKey = `${context.tenantId}:${operation}:${key}`;
    const payloadHash = fingerprint(payload);
    const existing = state.idempotency.get(storageKey);
    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        throw new UnitCommitmentError(
          "IDEMPOTENCY_PAYLOAD_MISMATCH",
          "Idempotency key was reused with a different payload",
          { operation, key },
        );
      }
      return structuredClone(existing.result) as T;
    }
    const result = execute();
    state.idempotency.set(storageKey, {
      tenantId: context.tenantId,
      operation,
      key,
      payloadHash,
      result: structuredClone(result),
      createdAt: contextNow(context),
    });
    return result;
  }

  private recordCommitmentTransition(
    state: UnitCommitmentState,
    context: UnitCommandContext,
    assignment: OrganizationScopeAssignment,
    action: string,
    previousState: UnitCommitment | null,
    nextState: UnitCommitment,
  ): void {
    state.commitments.set(nextState.id, nextState);
    const historyInput = {
      tenantId: nextState.tenantId,
      branchId: nextState.branchId,
      unitId: nextState.unitId,
      commitmentId: nextState.id,
      action,
      previousState,
      nextState,
      reason: context.reason ?? null,
      actorId: context.actorId,
      occurredAt: contextNow(context),
      correlationId: context.auditCorrelationId,
      idempotencyKey: context.idempotencyKey ?? null,
      policyVersion: this.policy.version,
      expiryBefore: previousState?.expiresAt ?? null,
      expiryAfter: nextState.expiresAt,
      approvalEvidence: nextState.approvalEvidence,
    };
    appendCommitmentHistory(state, historyInput);
    appendUnitCommitmentAudit(state, {
      tenantId: nextState.tenantId,
      actorId: context.actorId,
      assignmentId: assignment.id,
      scope: context.scope,
      branchId: nextState.branchId,
      unitId: nextState.unitId,
      commitmentId: nextState.id,
      tourId: null,
      action,
      previousState,
      nextState,
      reason: context.reason ?? null,
      occurredAt: contextNow(context),
      correlationId: context.auditCorrelationId,
      idempotencyKey: context.idempotencyKey ?? null,
      policyVersion: this.policy.version,
      expiryBefore: previousState?.expiresAt ?? null,
      expiryAfter: nextState.expiresAt,
      approvalEvidence: nextState.approvalEvidence,
    });
  }

  private recordTourTransition(
    state: UnitCommitmentState,
    context: UnitCommandContext,
    assignment: OrganizationScopeAssignment,
    action: string,
    previousState: TourAppointment | null,
    nextState: TourAppointment,
  ): void {
    state.tours.set(nextState.id, nextState);
    appendTourHistory(state, {
      tenantId: nextState.tenantId,
      branchId: nextState.branchId,
      tourId: nextState.id,
      action,
      previousState,
      nextState,
      actorId: context.actorId,
      reason: context.reason ?? null,
      occurredAt: contextNow(context),
      correlationId: context.auditCorrelationId,
      idempotencyKey: context.idempotencyKey ?? null,
    });
    appendUnitCommitmentAudit(state, {
      tenantId: nextState.tenantId,
      actorId: context.actorId,
      assignmentId: assignment.id,
      scope: context.scope,
      branchId: nextState.branchId,
      unitId: nextState.unitId,
      commitmentId: null,
      tourId: nextState.id,
      action,
      previousState,
      nextState,
      reason: context.reason ?? null,
      occurredAt: contextNow(context),
      correlationId: context.auditCorrelationId,
      idempotencyKey: context.idempotencyKey ?? null,
      policyVersion: this.policy.version,
      expiryBefore: null,
      expiryAfter: null,
      approvalEvidence: null,
    });
  }

  private transitionHold(
    command: HoldLifecycleCommand,
    operation: "ReleaseUnitHold" | "CancelUnitHold",
    nextStatus: "RELEASED" | "CANCELLED",
  ): UnitCommitment {
    validateUnitCommandContext(command.context);
    requireReason(command.context, operation);
    return this.repository.transaction((state) =>
      this.idempotent(
        state,
        command.context,
        operation,
        {
          holdId: command.holdId,
          expectedVersion: command.context.expectedVersion ?? null,
        },
        () => {
          const hold = this.requireCommitment(
            state,
            command.context.tenantId,
            command.holdId,
            "HOLD",
          );
          const assignment = assertUnitCommitmentAuthority(
            command.context,
            "UNIT_HOLD_RELEASE",
            commitmentResource(hold),
          );
          if (hold.status === nextStatus) return hold;
          assertExpectedVersion(
            command.context.expectedVersion,
            hold.version,
          );
          if (hold.status !== "ACTIVE") {
            throw new UnitCommitmentError(
              "INVALID_STATE_TRANSITION",
              `Only an active Hold can become ${nextStatus}`,
            );
          }
          const timestamp = contextNow(command.context);
          const next: UnitCommitment = {
            ...hold,
            status: nextStatus,
            version: hold.version + 1,
            updatedAt: timestamp,
            updatedByActorId: command.context.actorId,
            reason: command.context.reason ?? hold.reason,
          };
          this.recordCommitmentTransition(
            state,
            command.context,
            assignment,
            operation,
            hold,
            next,
          );
          return next;
        },
      ),
    );
  }

  private transitionReservation(
    command: ReservationLifecycleCommand,
    operation:
      | "ReleaseReservation"
      | "CancelReservation",
    nextStatus: "RELEASED" | "CANCELLED",
    permission: "RESERVATION_RELEASE" | "RESERVATION_CANCEL",
  ): UnitCommitment {
    validateUnitCommandContext(command.context);
    requireReason(command.context, operation);
    return this.repository.transaction((state) =>
      this.idempotent(
        state,
        command.context,
        operation,
        {
          reservationId: command.reservationId,
          expectedVersion: command.context.expectedVersion ?? null,
        },
        () => {
          const reservation = this.requireCommitment(
            state,
            command.context.tenantId,
            command.reservationId,
            "RESERVATION",
          );
          const assignment = assertUnitCommitmentAuthority(
            command.context,
            permission,
            commitmentResource(reservation),
          );
          if (reservation.status === nextStatus) return reservation;
          assertExpectedVersion(
            command.context.expectedVersion,
            reservation.version,
          );
          if (
            reservation.status !== "ACTIVE" &&
            reservation.status !== "PENDING_APPROVAL"
          ) {
            throw new UnitCommitmentError(
              "INVALID_STATE_TRANSITION",
              `Reservation cannot become ${nextStatus} from ${reservation.status}`,
            );
          }
          const timestamp = contextNow(command.context);
          const next: UnitCommitment = {
            ...reservation,
            status: nextStatus,
            version: reservation.version + 1,
            updatedAt: timestamp,
            updatedByActorId: command.context.actorId,
            reason: command.context.reason ?? reservation.reason,
          };
          this.recordCommitmentTransition(
            state,
            command.context,
            assignment,
            operation,
            reservation,
            next,
          );
          return next;
        },
      ),
    );
  }

  private assertTourWindowAvailable(
    state: Readonly<UnitCommitmentState>,
    tenantId: string,
    branchId: string,
    staffUserId: string,
    operationalResourceId: string | null,
    unitId: string | null,
    startAt: Date,
    endAt: Date,
    excludeTourId?: string,
  ): void {
    for (const tour of state.tours.values()) {
      if (
        tour.id === excludeTourId ||
        tour.tenantId !== tenantId ||
        tour.branchId !== branchId ||
        !ACTIVE_TOUR_STATUSES.has(tour.status) ||
        !overlaps(startAt, endAt, tour.startAtUtc, tour.endAtUtc)
      ) {
        continue;
      }
      if (tour.staffUserId === staffUserId) {
        throw new UnitCommitmentError(
          "TOUR_CONFLICT",
          "Tour overlaps another appointment for the same staff user",
          { blockingTourId: tour.id, conflictType: "STAFF" },
        );
      }
      if (
        operationalResourceId &&
        tour.operationalResourceId === operationalResourceId
      ) {
        throw new UnitCommitmentError(
          "TOUR_CONFLICT",
          "Tour overlaps another appointment for the same operational resource",
          { blockingTourId: tour.id, conflictType: "RESOURCE" },
        );
      }
      if (
        !this.policy.allowUnitTourOverlap &&
        unitId &&
        tour.unitId === unitId
      ) {
        throw new UnitCommitmentError(
          "TOUR_CONFLICT",
          "Tour overlaps another appointment for the same Unit",
          { blockingTourId: tour.id, conflictType: "UNIT" },
        );
      }
    }
  }

  private transitionTour(
    command: TourLifecycleCommand,
    operation: string,
    nextStatus: TourAppointment["status"],
    permission:
      | "TOUR_CONFIRM"
      | "TOUR_COMPLETE"
      | "TOUR_CANCEL",
    allowedCurrentStatuses: ReadonlySet<string>,
    reasonRequired: boolean,
  ): TourAppointment {
    validateUnitCommandContext(command.context);
    if (reasonRequired) requireReason(command.context, operation);
    return this.repository.transaction((state) =>
      this.idempotent(
        state,
        command.context,
        operation,
        {
          tourId: command.tourId,
          expectedVersion: command.context.expectedVersion ?? null,
        },
        () => {
          const tour = this.requireTour(
            state,
            command.context.tenantId,
            command.tourId,
          );
          const assignment = assertUnitCommitmentAuthority(
            command.context,
            permission,
            tourResource(tour),
          );
          if (tour.status === nextStatus) return tour;
          assertExpectedVersion(
            command.context.expectedVersion,
            tour.version,
          );
          if (!allowedCurrentStatuses.has(tour.status)) {
            throw new UnitCommitmentError(
              "INVALID_STATE_TRANSITION",
              `Tour cannot become ${nextStatus} from ${tour.status}`,
            );
          }
          const timestamp = contextNow(command.context);
          const next: TourAppointment = {
            ...tour,
            status: nextStatus,
            version: tour.version + 1,
            updatedAt: timestamp,
            updatedByActorId: command.context.actorId,
            reason: command.context.reason ?? tour.reason,
          };
          this.recordTourTransition(
            state,
            command.context,
            assignment,
            operation,
            tour,
            next,
          );
          return next;
        },
      ),
    );
  }
}