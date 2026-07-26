import { describe, expect, it } from "vitest";

import type {
  OrganizationScopeAssignment,
  OrganizationSecurityRole,
} from "@/lib/organization/contracts";
import {
  UnitCommitmentError,
  type ApprovalEvidence,
  type UnitCommandContext,
  type UnitInventoryRecord,
} from "@/lib/unit-commitment/contracts";
import { InMemoryUnitCommitmentRepository } from "@/lib/unit-commitment/repository";
import { UnitCommitmentService } from "@/lib/unit-commitment/service";

const TENANT = "tenant-a";
const OTHER_TENANT = "tenant-b";
const BRANCH_A = "branch-a";
const BRANCH_B = "branch-b";
const ACTOR = "actor-a";
const APPROVER = "approver-a";
const STAFF_B = "staff-b";
const NOW = new Date("2026-07-26T12:00:00.000Z");

function assignment(
  userId: string,
  options: Partial<OrganizationScopeAssignment> & {
    securityRole?: OrganizationSecurityRole;
  } = {},
): OrganizationScopeAssignment {
  const scopeType = options.scopeType ?? "BRANCH";
  return {
    id:
      options.id ??
      `assignment-${userId}-${scopeType}-${options.branchId ?? "company"}`,
    tenantId: options.tenantId ?? TENANT,
    userId,
    securityRole: options.securityRole ?? "SALES_LEASING_MANAGER",
    scopeType,
    branchId:
      scopeType === "COMPANY" ? null : options.branchId ?? BRANCH_A,
    departmentId: options.departmentId ?? null,
    teamId: options.teamId ?? null,
    assignedResourceType: options.assignedResourceType ?? null,
    assignedResourceId: options.assignedResourceId ?? null,
    active: options.active ?? true,
    startsAt: options.startsAt ?? null,
    endsAt: options.endsAt ?? null,
  };
}

function context(
  key: string | null,
  overrides: Partial<UnitCommandContext> = {},
): UnitCommandContext {
  const actorId = overrides.actorId ?? ACTOR;
  const tenantId = overrides.tenantId ?? TENANT;
  const branchId = overrides.scope?.branchId ?? BRANCH_A;
  return {
    actorId,
    tenantId,
    scope: {
      branchId,
      departmentId: overrides.scope?.departmentId ?? null,
      teamId: overrides.scope?.teamId ?? null,
      resourceType: overrides.scope?.resourceType ?? null,
      resourceId: overrides.scope?.resourceId ?? null,
    },
    assignments:
      overrides.assignments ??
      [assignment(actorId, { tenantId, branchId: branchId ?? BRANCH_A })],
    enabledBranchServices:
      overrides.enabledBranchServices ??
      [BRANCH_A, BRANCH_B].flatMap((branch) => [
        { branchId: branch, serviceLine: "SALES" as const, enabled: true },
        {
          branchId: branch,
          serviceLine: "PROPERTY_MANAGEMENT" as const,
          enabled: true,
        },
      ]),
    idempotencyKey: key,
    expectedVersion: overrides.expectedVersion ?? null,
    reason: overrides.reason ?? "verified test reason",
    timestamp: overrides.timestamp ?? NOW,
    auditCorrelationId: overrides.auditCorrelationId ?? `corr-${key ?? "read"}`,
  };
}

function unit(
  overrides: Partial<UnitInventoryRecord> = {},
): UnitInventoryRecord {
  return {
    id: overrides.id ?? "unit-a",
    tenantId: overrides.tenantId ?? TENANT,
    branchId: overrides.branchId ?? BRANCH_A,
    projectId: overrides.projectId ?? "project-a",
    baseState: overrides.baseState ?? "ACTIVE",
    operationalBlocked: overrides.operationalBlocked ?? false,
    operationalReason: overrides.operationalReason ?? null,
    contractualUnavailable: overrides.contractualUnavailable ?? false,
    contractualReferenceId: overrides.contractualReferenceId ?? null,
    consistencyState: overrides.consistencyState ?? "CONSISTENT",
    legacyProjectionStatus: overrides.legacyProjectionStatus ?? "Available",
    sourceVersion: overrides.sourceVersion ?? 1,
    policyVersion: overrides.policyVersion ?? "EXEC-006-v1",
    updatedAt: overrides.updatedAt ?? NOW,
  };
}

function setup(
  options: {
    units?: UnitInventoryRecord[];
    policy?: ConstructorParameters<typeof UnitCommitmentService>[1];
  } = {},
) {
  const repository = new InMemoryUnitCommitmentRepository({
    units: new Map(
      (options.units ?? [unit()]).map((record) => [record.id, record]),
    ),
  });
  const service = new UnitCommitmentService(repository, options.policy);
  return { repository, service };
}

function approval(
  overrides: Partial<ApprovalEvidence> = {},
): ApprovalEvidence {
  return {
    approvedByActorId: overrides.approvedByActorId ?? APPROVER,
    approverAssignments:
      overrides.approverAssignments ??
      [
        assignment(APPROVER, {
          securityRole: "OPERATIONS_MANAGER",
          scopeType: "COMPANY",
        }),
      ],
    approvedAt: overrides.approvedAt ?? NOW,
    approvalReference: overrides.approvalReference ?? "approval-1",
    reason: overrides.reason ?? "elevated duration approved",
  };
}

function expectCode(
  operation: () => unknown,
  expected: UnitCommitmentError["code"],
): void {
  try {
    operation();
    throw new Error(`Expected ${expected}`);
  } catch (error) {
    expect(error).toBeInstanceOf(UnitCommitmentError);
    expect((error as UnitCommitmentError).code).toBe(expected);
  }
}

function createHold(
  service: UnitCommitmentService,
  key = "hold-1",
  commandContext = context(key),
) {
  return service.createUnitHold({
    context: commandContext,
    unitId: "unit-a",
    customer: { partyId: "party-a" },
  });
}

function createPendingReservation(
  service: UnitCommitmentService,
  key = "reservation-1",
  commandContext = context(key),
) {
  return service.createReservation({
    context: commandContext,
    unitId: "unit-a",
    customer: { partyId: "party-a", opportunityId: "opportunity-a" },
  });
}

function createActiveReservation(
  service: UnitCommitmentService,
  key = "reservation-active",
  commandContext = context(key),
) {
  return service.createReservation({
    context: commandContext,
    unitId: "unit-a",
    customer: { partyId: "party-a" },
    requiresApproval: false,
    approvalEvidence: approval(),
  });
}

function tourCommand(
  key: string,
  overrides: Partial<Parameters<UnitCommitmentService["createTourAppointment"]>[0]> = {},
) {
  const commandContext = overrides.context ??
    context(key, {
      assignments: [
        assignment(ACTOR),
        assignment(STAFF_B, { securityRole: "BROKER_AGENT" }),
      ],
    });
  return {
    context: commandContext,
    branchId: overrides.branchId ?? BRANCH_A,
    unitId: overrides.unitId === undefined ? "unit-a" : overrides.unitId,
    staffUserId: overrides.staffUserId ?? ACTOR,
    operationalResourceId: overrides.operationalResourceId ?? null,
    customer: overrides.customer ?? { partyId: "party-a" },
    startAtUtc:
      overrides.startAtUtc ?? new Date("2026-07-27T06:00:00.000Z"),
    endAtUtc:
      overrides.endAtUtc ?? new Date("2026-07-27T07:00:00.000Z"),
    timezone: overrides.timezone ?? "Asia/Riyadh",
    location: overrides.location ?? "Unit A",
  };
}

describe("EXEC-006 direct unit commitment behavior", () => {
  it("01 returns AVAILABLE when no persisted blocker exists", () => {
    const { service } = setup();
    expect(
      service.evaluateUnitAvailability({
        context: context(null),
        unitId: "unit-a",
      }).state,
    ).toBe("AVAILABLE");
  });

  it("02 creates an active Hold on an available Unit", () => {
    const { service } = setup();
    const hold = createHold(service);
    expect(hold.status).toBe("ACTIVE");
    expect(hold.expiresAt.toISOString()).toBe("2026-07-27T12:00:00.000Z");
    expect(
      service.evaluateUnitAvailability({
        context: context(null),
        unitId: "unit-a",
      }).state,
    ).toBe("HELD");
  });

  it("03 rejects a second Hold", () => {
    const { service } = setup();
    createHold(service, "hold-first");
    expectCode(() => createHold(service, "hold-second"), "UNIT_NOT_AVAILABLE");
  });

  it("04 rejects a Reservation while another Hold is active", () => {
    const { service } = setup();
    createHold(service);
    expectCode(
      () => createPendingReservation(service, "reservation-blocked"),
      "UNIT_NOT_AVAILABLE",
    );
  });

  it("05 converts Hold to Reservation atomically", () => {
    const { repository, service } = setup();
    const hold = createHold(service);
    const reservation = service.convertHoldToReservation({
      context: context("convert-1", {
        expectedVersion: hold.version,
        reason: "customer confirmed reservation",
      }),
      holdId: hold.id,
    });
    const snapshot = repository.snapshot();
    expect(snapshot.commitments.get(hold.id)?.status).toBe("CONVERTED");
    expect(reservation.status).toBe("ACTIVE");
    expect(
      [...snapshot.commitments.values()].filter((item) =>
        item.expiresAt > NOW &&
        ((item.type === "HOLD" && item.status === "ACTIVE") ||
          (item.type === "RESERVATION" && item.status === "ACTIVE")),
      ),
    ).toHaveLength(1);
  });

  it("06 prevents conversion replay under a different key", () => {
    const { service } = setup();
    const hold = createHold(service);
    service.convertHoldToReservation({
      context: context("convert-first", { expectedVersion: hold.version }),
      holdId: hold.id,
    });
    expectCode(
      () =>
        service.convertHoldToReservation({
          context: context("convert-other"),
          holdId: hold.id,
        }),
      "INVALID_STATE_TRANSITION",
    );
  });

  it("07 ignores an expired Hold before reconciliation", () => {
    const { service } = setup();
    service.createUnitHold({
      context: context("short-hold"),
      unitId: "unit-a",
      customer: { partyId: "party-a" },
      requestedDurationHours: 1,
    });
    expect(
      service.evaluateUnitAvailability({
        context: context(null, {
          timestamp: new Date("2026-07-26T14:00:00.000Z"),
        }),
        unitId: "unit-a",
      }).state,
    ).toBe("AVAILABLE");
  });

  it("08 reconciles expiry idempotently", () => {
    const { repository, service } = setup();
    service.createUnitHold({
      context: context("short-reconcile"),
      unitId: "unit-a",
      customer: { partyId: "party-a" },
      requestedDurationHours: 1,
    });
    const reconcileContext = context(null, {
      timestamp: new Date("2026-07-26T14:00:00.000Z"),
    });
    expect(
      service.reconcileExpiredCommitments({
        context: reconcileContext,
        limit: 10,
      }).expired,
    ).toBe(1);
    expect(
      service.reconcileExpiredCommitments({
        context: reconcileContext,
        limit: 10,
      }).expired,
    ).toBe(0);
    expect(repository.snapshot().commitmentHistory).toHaveLength(2);
  });

  it("09 releases a Hold idempotently", () => {
    const { repository, service } = setup();
    const hold = createHold(service);
    const release = {
      context: context("release-hold", {
        expectedVersion: hold.version,
        reason: "customer withdrew",
      }),
      holdId: hold.id,
    };
    const first = service.releaseUnitHold(release);
    const second = service.releaseUnitHold(release);
    expect(second).toEqual(first);
    expect(repository.snapshot().commitmentHistory).toHaveLength(2);
  });

  it("10 cancellation preserves append-only history", () => {
    const { repository, service } = setup();
    const hold = createHold(service);
    service.cancelUnitHold({
      context: context("cancel-hold", {
        expectedVersion: hold.version,
        reason: "invalid request",
      }),
      holdId: hold.id,
    });
    const history = repository.snapshot().commitmentHistory;
    expect(history.at(-1)?.previousState?.status).toBe("ACTIVE");
    expect(history.at(-1)?.nextState.status).toBe("CANCELLED");
  });

  it("11 extends a Hold inside the standard maximum", () => {
    const { service } = setup();
    const hold = createHold(service);
    const extended = service.extendUnitHold({
      context: context("extend-hold", {
        expectedVersion: hold.version,
        reason: "customer requested extension",
      }),
      holdId: hold.id,
      requestedDurationHours: 48,
    });
    expect(extended.expiresAt.toISOString()).toBe("2026-07-28T12:00:00.000Z");
  });

  it("12 rejects a long Hold without elevated approval", () => {
    const { service } = setup();
    expectCode(
      () =>
        service.createUnitHold({
          context: context("long-hold-no-approval"),
          unitId: "unit-a",
          customer: { partyId: "party-a" },
          requestedDurationHours: 96,
        }),
      "APPROVAL_REQUIRED",
    );
  });

  it("13 accepts a bounded long Hold with independent approval", () => {
    const { service } = setup();
    const hold = service.createUnitHold({
      context: context("long-hold-approved"),
      unitId: "unit-a",
      customer: { partyId: "party-a" },
      requestedDurationHours: 96,
      approvalEvidence: approval(),
    });
    expect(hold.expiresAt.toISOString()).toBe("2026-07-30T12:00:00.000Z");
  });

  it("14 active Reservation prevents a Hold", () => {
    const { service } = setup();
    createActiveReservation(service);
    expectCode(() => createHold(service, "hold-after-reservation"), "UNIT_NOT_AVAILABLE");
  });

  it("15 active Reservation prevents a second Reservation", () => {
    const { service } = setup();
    createActiveReservation(service, "reservation-first");
    expectCode(
      () => createPendingReservation(service, "reservation-second"),
      "UNIT_NOT_AVAILABLE",
    );
  });

  it("16 Reservation expiry releases availability before reconciliation", () => {
    const { service } = setup();
    service.createReservation({
      context: context("reservation-short"),
      unitId: "unit-a",
      customer: { partyId: "party-a" },
      requestedDurationHours: 1,
    });
    expect(
      service.evaluateUnitAvailability({
        context: context(null, {
          timestamp: new Date("2026-07-26T14:00:00.000Z"),
        }),
        unitId: "unit-a",
      }).state,
    ).toBe("AVAILABLE");
  });

  it("17 Reservation conversion emits only a handoff contract", () => {
    const { service } = setup();
    const reservation = createActiveReservation(service);
    const handoff = service.markReservationConverted({
      context: context("reservation-handoff", {
        expectedVersion: reservation.version,
        reason: "handoff to later package",
      }),
      reservationId: reservation.id,
      downstreamReference: "EXEC-007-FUTURE-REF",
    });
    expect(handoff.createsContract).toBe(false);
    expect(handoff.createsInvoice).toBe(false);
    expect(handoff.recordsPayment).toBe(false);
  });

  it("18 Tour Appointment never reserves the Unit", () => {
    const { service } = setup();
    service.createTourAppointment(tourCommand("tour-no-commitment"));
    expect(
      service.evaluateUnitAvailability({
        context: context(null),
        unitId: "unit-a",
      }).state,
    ).toBe("AVAILABLE");
  });

  it("19 prevents overlapping staff Tours", () => {
    const { service } = setup();
    service.createTourAppointment(tourCommand("tour-staff-first"));
    expectCode(
      () =>
        service.createTourAppointment(
          tourCommand("tour-staff-second", {
            startAtUtc: new Date("2026-07-27T06:30:00.000Z"),
            endAtUtc: new Date("2026-07-27T07:30:00.000Z"),
          }),
        ),
      "TOUR_CONFLICT",
    );
  });

  it("20 prevents overlapping Unit Tours by default", () => {
    const { service } = setup();
    service.createTourAppointment(tourCommand("tour-unit-first"));
    expectCode(
      () =>
        service.createTourAppointment(
          tourCommand("tour-unit-second", {
            staffUserId: STAFF_B,
            startAtUtc: new Date("2026-07-27T06:30:00.000Z"),
            endAtUtc: new Date("2026-07-27T07:30:00.000Z"),
          }),
        ),
      "TOUR_CONFLICT",
    );
  });

  it("21 Reschedule preserves the previous appointment in history", () => {
    const { repository, service } = setup();
    const tour = service.createTourAppointment(tourCommand("tour-reschedule-create"));
    service.rescheduleTourAppointment({
      context: context("tour-reschedule", {
        expectedVersion: tour.version,
        reason: "customer requested a new time",
      }),
      tourId: tour.id,
      startAtUtc: new Date("2026-07-28T08:00:00.000Z"),
      endAtUtc: new Date("2026-07-28T09:00:00.000Z"),
      timezone: "Asia/Riyadh",
    });
    const history = repository.snapshot().tourHistory;
    expect(history.at(-1)?.previousState?.startAtUtc.toISOString()).toBe(
      "2026-07-27T06:00:00.000Z",
    );
    expect(history.at(-1)?.nextState.status).toBe("RESCHEDULED");
  });

  it("22 marks No-show with actor, time and reason", () => {
    const { service } = setup();
    const tour = service.createTourAppointment(tourCommand("tour-no-show-create"));
    const result = service.markTourNoShow({
      context: context("tour-no-show", {
        expectedVersion: tour.version,
        reason: "customer did not attend",
      }),
      tourId: tour.id,
    });
    expect(result.status).toBe("NO_SHOW");
  });

  it("23 completes a Tour", () => {
    const { service } = setup();
    const tour = service.createTourAppointment(tourCommand("tour-complete-create"));
    const completed = service.completeTourAppointment({
      context: context("tour-complete", { expectedVersion: tour.version }),
      tourId: tour.id,
    });
    expect(completed.status).toBe("COMPLETED");
  });

  it("24 preserves UTC instants with an explicit timezone", () => {
    const { service } = setup();
    const tour = service.createTourAppointment(
      tourCommand("tour-timezone", {
        startAtUtc: new Date("2026-07-27T06:00:00+00:00"),
        endAtUtc: new Date("2026-07-27T07:00:00+00:00"),
        timezone: "Asia/Riyadh",
      }),
    );
    expect(tour.startAtUtc.toISOString()).toBe("2026-07-27T06:00:00.000Z");
    expect(tour.timezone).toBe("Asia/Riyadh");
  });

  it("25 returns CONTRACTUALLY_UNAVAILABLE from persisted final linkage", () => {
    const { service } = setup({
      units: [
        unit({
          contractualUnavailable: true,
          contractualReferenceId: "contract-a",
        }),
      ],
    });
    expect(
      service.evaluateUnitAvailability({
        context: context(null),
        unitId: "unit-a",
      }).state,
    ).toBe("CONTRACTUALLY_UNAVAILABLE");
  });

  it("26 returns OPERATIONALLY_BLOCKED from effective restriction", () => {
    const { service } = setup({
      units: [
        unit({
          operationalBlocked: true,
          operationalReason: "MAINTENANCE_LOCK",
        }),
      ],
    });
    const decision = service.evaluateUnitAvailability({
      context: context(null),
      unitId: "unit-a",
    });
    expect(decision.state).toBe("OPERATIONALLY_BLOCKED");
    expect(decision.reasonCode).toBe("MAINTENANCE_LOCK");
  });

  it("27 returns INACTIVE for inactive inventory", () => {
    const { service } = setup({ units: [unit({ baseState: "INACTIVE" })] });
    expect(
      service.evaluateUnitAvailability({
        context: context(null),
        unitId: "unit-a",
      }).state,
    ).toBe("INACTIVE");
  });

  it("28 returns UNKNOWN_FAIL_CLOSED for inconsistent inventory", () => {
    const { service } = setup({
      units: [unit({ consistencyState: "INCONSISTENT" })],
    });
    expect(
      service.evaluateUnitAvailability({
        context: context(null),
        unitId: "unit-a",
      }).state,
    ).toBe("UNKNOWN_FAIL_CLOSED");
  });

  it("29 hides blocking customer references without audit disclosure authority", () => {
    const { service } = setup();
    createHold(service);
    const brokerContext = context(null, {
      actorId: "broker-a",
      assignments: [
        assignment("broker-a", { securityRole: "BROKER_AGENT" }),
      ],
    });
    const decision = service.evaluateUnitAvailability({
      context: brokerContext,
      unitId: "unit-a",
      discloseBlockingCustomer: true,
    });
    expect(decision.state).toBe("HELD");
    expect(decision.blockingCustomerReference).toBeNull();
  });

  it("30 discloses blocking references only with audit authority", () => {
    const { service } = setup();
    createHold(service);
    const managerContext = context(null, {
      actorId: "manager-a",
      assignments: [
        assignment("manager-a", { securityRole: "BRANCH_MANAGER" }),
      ],
    });
    const decision = service.evaluateUnitAvailability({
      context: managerContext,
      unitId: "unit-a",
      discloseBlockingCustomer: true,
    });
    expect(decision.blockingCustomerReference?.partyId).toBe("party-a");
  });
});