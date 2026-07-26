import { describe, expect, it } from "vitest";

import type {
  OrganizationScopeAssignment,
  OrganizationSecurityRole,
} from "@/lib/organization/contracts";
import {
  UnitCommitmentError,
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
const NOW = new Date("2026-07-26T12:00:00.000Z");

function assignment(
  userId: string,
  options: Partial<OrganizationScopeAssignment> & {
    securityRole?: OrganizationSecurityRole;
  } = {},
): OrganizationScopeAssignment {
  const scopeType = options.scopeType ?? "BRANCH";
  return {
    id: options.id ?? `assignment-${userId}-${scopeType}-${options.branchId ?? "company"}`,
    tenantId: options.tenantId ?? TENANT,
    userId,
    securityRole: options.securityRole ?? "SALES_LEASING_MANAGER",
    scopeType,
    branchId: scopeType === "COMPANY" ? null : options.branchId ?? BRANCH_A,
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
    reason: overrides.reason ?? "verified security reason",
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

function setup(units = [unit()]) {
  const repository = new InMemoryUnitCommitmentRepository({
    units: new Map(units.map((record) => [record.id, record])),
  });
  const service = new UnitCommitmentService(repository);
  return { repository, service };
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

function hold(service: UnitCommitmentService, key = "hold-a") {
  return service.createUnitHold({
    context: context(key),
    unitId: "unit-a",
    customer: { partyId: "party-a" },
  });
}

function pendingReservation(
  service: UnitCommitmentService,
  key = "reservation-pending",
) {
  return service.createReservation({
    context: context(key),
    unitId: "unit-a",
    customer: { partyId: "party-a" },
  });
}

describe("EXEC-006 direct security, concurrency and integrity behavior", () => {
  it("31 denies cross-tenant Unit access", () => {
    const { service } = setup();
    expectCode(
      () =>
        service.evaluateUnitAvailability({
          context: context(null, {
            tenantId: OTHER_TENANT,
            assignments: [
              assignment(ACTOR, { tenantId: OTHER_TENANT }),
            ],
          }),
          unitId: "unit-a",
        }),
      "TENANT_SCOPE_MISMATCH",
    );
  });

  it("32 denies cross-branch Hold creation", () => {
    const { service } = setup();
    expectCode(
      () =>
        service.createUnitHold({
          context: context("cross-branch", {
            scope: { branchId: BRANCH_B },
            assignments: [assignment(ACTOR, { branchId: BRANCH_B })],
          }),
          unitId: "unit-a",
          customer: { partyId: "party-a" },
        }),
      "RESOURCE_SCOPE_DENIED",
    );
  });

  it("33 rejects a forged Tour branch", () => {
    const { service } = setup();
    expectCode(
      () =>
        service.createTourAppointment({
          context: context("forged-tour", {
            assignments: [
              assignment(ACTOR, { scopeType: "COMPANY" }),
            ],
          }),
          branchId: BRANCH_B,
          unitId: "unit-a",
          staffUserId: ACTOR,
          customer: { partyId: "party-a" },
          startAtUtc: new Date("2026-07-27T06:00:00.000Z"),
          endAtUtc: new Date("2026-07-27T07:00:00.000Z"),
          timezone: "Asia/Riyadh",
          location: "forged",
        }),
      "RESOURCE_SCOPE_DENIED",
    );
  });

  it("34 denies an expired persisted assignment", () => {
    const { service } = setup();
    expectCode(
      () =>
        service.createUnitHold({
          context: context("expired-assignment", {
            assignments: [
              assignment(ACTOR, {
                endsAt: new Date("2026-07-26T11:59:59.000Z"),
              }),
            ],
          }),
          unitId: "unit-a",
          customer: { partyId: "party-a" },
        }),
      "AUTHORITY_DENIED",
    );
  });

  it("35 fails closed when actor evidence is missing", () => {
    const { service } = setup();
    expectCode(
      () =>
        service.createUnitHold({
          context: context("missing-actor", { actorId: "" }),
          unitId: "unit-a",
          customer: { partyId: "party-a" },
        }),
      "MISSING_ACTOR",
    );
  });

  it("36 fails Reservation approval without initiator evidence", () => {
    const { service } = setup();
    const reservation = pendingReservation(service);
    expectCode(
      () =>
        service.approveReservation({
          context: context("approve-missing-initiator", {
            actorId: APPROVER,
            assignments: [
              assignment(APPROVER, { securityRole: "BRANCH_MANAGER" }),
            ],
            expectedVersion: reservation.version,
          }),
          reservationId: reservation.id,
          approvalReference: "approval-a",
        }),
      "MISSING_INITIATOR",
    );
  });

  it("37 denies self-approval", () => {
    const { service } = setup();
    const reservation = pendingReservation(service);
    expectCode(
      () =>
        service.approveReservation({
          context: context("approve-self", {
            expectedVersion: reservation.version,
          }),
          reservationId: reservation.id,
          initiatedByActorId: ACTOR,
          approvalReference: "approval-self",
        }),
      "SELF_APPROVAL_DENIED",
    );
  });

  it("38 allows a distinct authorized approver", () => {
    const { service } = setup();
    const reservation = pendingReservation(service);
    const approved = service.approveReservation({
      context: context("approve-distinct", {
        actorId: APPROVER,
        assignments: [
          assignment(APPROVER, { securityRole: "BRANCH_MANAGER" }),
        ],
        expectedVersion: reservation.version,
      }),
      reservationId: reservation.id,
      initiatedByActorId: ACTOR,
      approvalReference: "approval-distinct",
    });
    expect(approved.status).toBe("ACTIVE");
    expect(approved.approvalEvidence?.approvedByActorId).toBe(APPROVER);
  });

  it("39 gives Platform Owner no automatic Hold authority", () => {
    const { service } = setup();
    expectCode(
      () =>
        service.createUnitHold({
          context: context("platform-owner-write", {
            actorId: "platform-owner",
            assignments: [
              assignment("platform-owner", {
                securityRole: "PLATFORM_OWNER",
                scopeType: "COMPANY",
              }),
            ],
          }),
          unitId: "unit-a",
          customer: { partyId: "party-a" },
        }),
      "AUTHORITY_DENIED",
    );
  });

  it("40 gives System Administrator no Reservation authority", () => {
    const { service } = setup();
    expectCode(
      () =>
        service.createReservation({
          context: context("system-admin-write", {
            actorId: "system-admin",
            assignments: [
              assignment("system-admin", {
                securityRole: "SYSTEM_ADMINISTRATOR",
                scopeType: "COMPANY",
              }),
            ],
          }),
          unitId: "unit-a",
          customer: { partyId: "party-a" },
        }),
      "AUTHORITY_DENIED",
    );
  });

  it("41 makes exactly one of two competing Hold requests succeed", () => {
    const { repository, service } = setup();
    const outcomes = ["race-hold-a", "race-hold-b"].map((key) => {
      try {
        service.createUnitHold({
          context: context(key),
          unitId: "unit-a",
          customer: { partyId: key },
        });
        return "fulfilled";
      } catch {
        return "rejected";
      }
    });
    expect(outcomes.filter((outcome) => outcome === "fulfilled")).toHaveLength(1);
    expect(
      [...repository.snapshot().commitments.values()].filter(
        (item) => item.status === "ACTIVE",
      ),
    ).toHaveLength(1);
  });

  it("42 makes exactly one competing Hold and Reservation succeed", () => {
    const { repository, service } = setup();
    const outcomes: string[] = [];
    try {
      hold(service, "race-hold");
      outcomes.push("hold");
    } catch {
      outcomes.push("hold-rejected");
    }
    try {
      pendingReservation(service, "race-reservation");
      outcomes.push("reservation");
    } catch {
      outcomes.push("reservation-rejected");
    }
    expect(outcomes).toContain("hold");
    expect(outcomes).toContain("reservation-rejected");
    expect(
      [...repository.snapshot().commitments.values()].filter(
        (item) => item.status === "ACTIVE" || item.status === "PENDING_APPROVAL",
      ),
    ).toHaveLength(1);
  });

  it("43 resolves conversion versus expiry to one consistent outcome", () => {
    const { repository, service } = setup();
    const source = service.createUnitHold({
      context: context("expiry-race-source"),
      unitId: "unit-a",
      customer: { partyId: "party-a" },
      requestedDurationHours: 1,
    });
    const expiryTime = new Date("2026-07-26T13:00:00.000Z");
    expectCode(
      () =>
        service.convertHoldToReservation({
          context: context("expiry-race-convert", {
            timestamp: expiryTime,
            expectedVersion: source.version,
          }),
          holdId: source.id,
        }),
      "INVALID_STATE_TRANSITION",
    );
    const expired = service.expireUnitHold({
      context: context("expiry-race-expire", {
        timestamp: expiryTime,
        expectedVersion: source.version,
      }),
      holdId: source.id,
    });
    expect(expired.status).toBe("EXPIRED");
    expect(repository.snapshot().commitments).toHaveLength(1);
  });

  it("44 denies a stale expected version", () => {
    const { service } = setup();
    const source = hold(service);
    expectCode(
      () =>
        service.releaseUnitHold({
          context: context("stale-release", {
            expectedVersion: source.version - 1,
          }),
          holdId: source.id,
        }),
      "CONCURRENCY_CONFLICT",
    );
  });

  it("45 returns the previous result for the same idempotency key and payload", () => {
    const { repository, service } = setup();
    const command = {
      context: context("same-idempotency"),
      unitId: "unit-a",
      customer: { partyId: "party-a" },
    } as const;
    const first = service.createUnitHold(command);
    const second = service.createUnitHold(command);
    expect(second).toEqual(first);
    expect(repository.snapshot().commitments).toHaveLength(1);
  });

  it("46 denies the same idempotency key with a different payload", () => {
    const { service } = setup();
    service.createUnitHold({
      context: context("payload-mismatch"),
      unitId: "unit-a",
      customer: { partyId: "party-a" },
    });
    expectCode(
      () =>
        service.createUnitHold({
          context: context("payload-mismatch"),
          unitId: "unit-a",
          customer: { partyId: "party-b" },
        }),
      "IDEMPOTENCY_PAYLOAD_MISMATCH",
    );
  });

  it("47 keeps Audit append-only through cloned snapshots", () => {
    const { repository, service } = setup();
    hold(service);
    const snapshot = repository.snapshot();
    const originalLength = snapshot.audit.length;
    (snapshot.audit as unknown[]).splice(0);
    expect(repository.snapshot().audit).toHaveLength(originalLength);
  });

  it("48 keeps History append-only through cloned snapshots", () => {
    const { repository, service } = setup();
    hold(service);
    const snapshot = repository.snapshot();
    const originalLength = snapshot.commitmentHistory.length;
    (snapshot.commitmentHistory as unknown[]).splice(0);
    expect(repository.snapshot().commitmentHistory).toHaveLength(originalLength);
  });

  it("49 rejects a missing Unit reference", () => {
    const { service } = setup();
    expectCode(
      () =>
        service.createUnitHold({
          context: context("missing-unit"),
          unitId: "missing",
          customer: { partyId: "party-a" },
        }),
      "NOT_FOUND",
    );
  });

  it("50 rejects a missing Party/Account/Opportunity reference", () => {
    const { service } = setup();
    expectCode(
      () =>
        service.createReservation({
          context: context("missing-customer"),
          unitId: "unit-a",
          customer: {},
        }),
      "VALIDATION_ERROR",
    );
  });

  it("51 rejects invalid Tour timezone", () => {
    const { service } = setup();
    expectCode(
      () =>
        service.createTourAppointment({
          context: context("invalid-timezone"),
          branchId: BRANCH_A,
          unitId: "unit-a",
          staffUserId: ACTOR,
          customer: { partyId: "party-a" },
          startAtUtc: new Date("2026-07-27T06:00:00.000Z"),
          endAtUtc: new Date("2026-07-27T07:00:00.000Z"),
          timezone: "Not/A-Timezone",
          location: "Unit A",
        }),
      "VALIDATION_ERROR",
    );
  });

  it("52 denies unbounded duration even with approval evidence", () => {
    const { service } = setup();
    expectCode(
      () =>
        service.createUnitHold({
          context: context("unbounded-hold"),
          unitId: "unit-a",
          customer: { partyId: "party-a" },
          requestedDurationHours: 24 * 31,
          approvalEvidence: {
            approvedByActorId: APPROVER,
            approverAssignments: [
              assignment(APPROVER, {
                securityRole: "OPERATIONS_MANAGER",
                scopeType: "COMPANY",
              }),
            ],
            approvedAt: NOW,
            approvalReference: "approval-unbounded",
            reason: "not sufficient to bypass absolute maximum",
          },
        }),
      "DURATION_LIMIT_EXCEEDED",
    );
  });
});