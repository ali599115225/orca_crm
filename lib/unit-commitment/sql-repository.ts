import { createHash } from "node:crypto";
import type { QueryResult, QueryResultRow } from "pg";

import type {
  ApprovalEvidence,
  AvailabilityDecision,
  CustomerReference,
  ReconcileExpiredCommitmentsResult,
  UnitCommitmentType,
} from "@/lib/unit-commitment/contracts";

export interface Exec006SqlExecutor {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
}

export type AuthenticatedSqlCommandContext = Readonly<{
  /** Resolved from the authenticated server session, never from request Body. */
  actorUserId: string;
  /** Resolved from the authenticated server session, never from request Body. */
  tenantId: string;
  /** Loaded from persisted EXEC-004 assignments after session binding. */
  assignmentId: string;
  correlationId: string;
  idempotencyKey: string;
  expectedVersion?: number | null;
  reason?: string | null;
  serverNow?: Date;
}>;

export type SqlCreateCommitmentInput = Readonly<{
  context: AuthenticatedSqlCommandContext;
  branchId: string;
  unitId: string;
  type: UnitCommitmentType;
  status?: "ACTIVE" | "PENDING_APPROVAL";
  customer: CustomerReference;
  expiresAt: Date;
  approvedByUserId?: string | null;
  approvalEvidence?: ApprovalEvidence | null;
  evidenceReference?: string | null;
}>;

export type SqlCreateTourInput = Readonly<{
  context: AuthenticatedSqlCommandContext;
  branchId: string;
  unitId?: string | null;
  staffUserId: string;
  operationalResourceId?: string | null;
  customer: CustomerReference;
  startAtUtc: Date;
  endAtUtc: Date;
  timezone: string;
  location: string;
}>;

type AvailabilityRow = QueryResultRow & {
  availability_state: AvailabilityDecision["state"];
  unit_id: string;
  tenant_id: string;
  branch_id: string | null;
  evaluated_at: Date;
  blocking_commitment_id: string | null;
  blocking_type: UnitCommitmentType | null;
  blocking_until: Date | null;
  reason_code: string;
  policy_version: string;
  source_version: number;
};

type IdRow = QueryResultRow & { id: string };
type ReconcileRow = QueryResultRow & {
  processed: number;
  expired: number;
  next_cursor: string | null;
};

function now(context: AuthenticatedSqlCommandContext): Date {
  return context.serverNow ?? new Date();
}

function requireTrustedContext(context: AuthenticatedSqlCommandContext): void {
  if (
    !context.actorUserId.trim() ||
    !context.tenantId.trim() ||
    !context.assignmentId.trim() ||
    !context.correlationId.trim() ||
    !context.idempotencyKey.trim()
  ) {
    throw new Error(
      "Authenticated actor, tenant, persisted assignment, correlation and idempotency evidence are required",
    );
  }
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

function payloadHash(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(payload)))
    .digest("hex");
}

function requireId(result: QueryResult<IdRow>, operation: string): string {
  const id = result.rows[0]?.id;
  if (!id) throw new Error(`${operation} returned no entity ID`);
  return id;
}

export class PostgresUnitCommitmentRepository {
  constructor(private readonly executor: Exec006SqlExecutor) {}

  async evaluateUnitAvailability(input: Readonly<{
    tenantId: string;
    unitId: string;
    serverNow?: Date;
  }>): Promise<AvailabilityDecision> {
    if (!input.tenantId.trim() || !input.unitId.trim()) {
      throw new Error("Tenant and Unit are required");
    }
    const evaluatedAt = input.serverNow ?? new Date();
    const result = await this.executor.query<AvailabilityRow>(
      `SELECT * FROM "exec006_evaluate_unit_availability"($1::uuid,$2::uuid,$3::timestamptz)`,
      [input.tenantId, input.unitId, evaluatedAt],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Availability decision returned no row");
    return {
      state: row.availability_state,
      unitId: row.unit_id,
      tenantId: row.tenant_id,
      branchId: row.branch_id ?? "",
      evaluatedAt: row.evaluated_at,
      blockingCommitmentId: row.blocking_commitment_id,
      blockingType: row.blocking_type,
      blockingUntil: row.blocking_until,
      reasonCode: row.reason_code,
      policyVersion: row.policy_version,
      sourceVersion: row.source_version,
      blockingCustomerReference: null,
    };
  }

  async createCommitment(input: SqlCreateCommitmentInput): Promise<string> {
    requireTrustedContext(input.context);
    const createdAt = now(input.context);
    const status =
      input.status ??
      (input.type === "HOLD" ? "ACTIVE" : "PENDING_APPROVAL");
    const fingerprint = payloadHash({
      branchId: input.branchId,
      unitId: input.unitId,
      type: input.type,
      status,
      customer: input.customer,
      expiresAt: input.expiresAt,
      approvedByUserId: input.approvedByUserId ?? null,
      approvalEvidence: input.approvalEvidence ?? null,
      evidenceReference: input.evidenceReference ?? null,
      reason: input.context.reason ?? null,
    });
    const result = await this.executor.query<IdRow>(
      `SELECT "exec006_create_commitment"(
        $1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::uuid,$7::uuid,
        $8::uuid,$9::timestamptz,$10::uuid,$11::uuid,$12::uuid,$13::jsonb,
        $14::text,$15::text,$16::text,$17::text,$18::text,$19::timestamptz
      ) AS id`,
      [
        input.context.tenantId,
        input.branchId,
        input.unitId,
        input.type,
        status,
        input.customer.partyId ?? null,
        input.customer.customerAccountId ?? null,
        input.customer.opportunityId ?? null,
        input.expiresAt,
        input.context.actorUserId,
        input.context.assignmentId,
        input.approvedByUserId ?? null,
        input.approvalEvidence
          ? JSON.stringify(input.approvalEvidence)
          : null,
        input.evidenceReference ?? null,
        input.context.reason ?? null,
        input.context.correlationId,
        input.context.idempotencyKey,
        fingerprint,
        createdAt,
      ],
    );
    return requireId(result, "Create commitment");
  }

  async approveReservation(input: Readonly<{
    context: AuthenticatedSqlCommandContext;
    reservationId: string;
    approvalReference: string;
  }>): Promise<string> {
    requireTrustedContext(input.context);
    if (input.context.expectedVersion == null) {
      throw new Error("Expected version is required for approval");
    }
    const fingerprint = payloadHash({
      reservationId: input.reservationId,
      expectedVersion: input.context.expectedVersion,
      approvalReference: input.approvalReference,
      reason: input.context.reason ?? null,
    });
    const result = await this.executor.query<IdRow>(
      `SELECT "exec006_approve_reservation"(
        $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::integer,$6::text,$7::text,
        $8::text,$9::text,$10::text,$11::timestamptz
      ) AS id`,
      [
        input.context.tenantId,
        input.reservationId,
        input.context.actorUserId,
        input.context.assignmentId,
        input.context.expectedVersion,
        input.approvalReference,
        input.context.reason ?? null,
        input.context.correlationId,
        input.context.idempotencyKey,
        fingerprint,
        now(input.context),
      ],
    );
    return requireId(result, "Approve Reservation");
  }

  async convertHoldToReservation(input: Readonly<{
    context: AuthenticatedSqlCommandContext;
    holdId: string;
    expiresAt: Date;
    evidenceReference?: string | null;
  }>): Promise<string> {
    requireTrustedContext(input.context);
    if (input.context.expectedVersion == null) {
      throw new Error("Expected version is required for conversion");
    }
    const fingerprint = payloadHash({
      holdId: input.holdId,
      expectedVersion: input.context.expectedVersion,
      expiresAt: input.expiresAt,
      evidenceReference: input.evidenceReference ?? null,
      reason: input.context.reason ?? null,
    });
    const result = await this.executor.query<IdRow>(
      `SELECT "exec006_convert_hold_to_reservation"(
        $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::integer,$6::timestamptz,
        $7::text,$8::text,$9::text,$10::text,$11::text,$12::timestamptz
      ) AS id`,
      [
        input.context.tenantId,
        input.holdId,
        input.context.actorUserId,
        input.context.assignmentId,
        input.context.expectedVersion,
        input.expiresAt,
        input.evidenceReference ?? null,
        input.context.reason ?? null,
        input.context.correlationId,
        input.context.idempotencyKey,
        fingerprint,
        now(input.context),
      ],
    );
    return requireId(result, "Convert Hold to Reservation");
  }

  async extendCommitment(input: Readonly<{
    context: AuthenticatedSqlCommandContext;
    commitmentId: string;
    newExpiresAt: Date;
    approvalEvidence?: ApprovalEvidence | null;
  }>): Promise<string> {
    requireTrustedContext(input.context);
    if (input.context.expectedVersion == null) {
      throw new Error("Expected version is required for extension");
    }
    const fingerprint = payloadHash({
      commitmentId: input.commitmentId,
      newExpiresAt: input.newExpiresAt,
      expectedVersion: input.context.expectedVersion,
      approvalEvidence: input.approvalEvidence ?? null,
      reason: input.context.reason ?? null,
    });
    const result = await this.executor.query<IdRow>(
      `SELECT "exec006_extend_commitment"(
        $1::uuid,$2::uuid,$3::timestamptz,$4::uuid,$5::uuid,$6::integer,
        $7::jsonb,$8::text,$9::text,$10::text,$11::text,$12::timestamptz
      ) AS id`,
      [
        input.context.tenantId,
        input.commitmentId,
        input.newExpiresAt,
        input.context.actorUserId,
        input.context.assignmentId,
        input.context.expectedVersion,
        input.approvalEvidence
          ? JSON.stringify(input.approvalEvidence)
          : null,
        input.context.reason ?? null,
        input.context.correlationId,
        input.context.idempotencyKey,
        fingerprint,
        now(input.context),
      ],
    );
    return requireId(result, "Extend commitment");
  }

  async releaseOrCancelCommitment(input: Readonly<{
    context: AuthenticatedSqlCommandContext;
    commitmentId: string;
    targetStatus: "RELEASED" | "CANCELLED";
  }>): Promise<string> {
    requireTrustedContext(input.context);
    if (input.context.expectedVersion == null) {
      throw new Error("Expected version is required for release/cancellation");
    }
    const fingerprint = payloadHash({
      commitmentId: input.commitmentId,
      targetStatus: input.targetStatus,
      expectedVersion: input.context.expectedVersion,
      reason: input.context.reason ?? null,
    });
    const result = await this.executor.query<IdRow>(
      `SELECT "exec006_release_commitment"(
        $1::uuid,$2::uuid,$3::text,$4::uuid,$5::uuid,$6::integer,$7::text,
        $8::text,$9::text,$10::text,$11::timestamptz
      ) AS id`,
      [
        input.context.tenantId,
        input.commitmentId,
        input.targetStatus,
        input.context.actorUserId,
        input.context.assignmentId,
        input.context.expectedVersion,
        input.context.reason ?? null,
        input.context.correlationId,
        input.context.idempotencyKey,
        fingerprint,
        now(input.context),
      ],
    );
    return requireId(result, "Release/cancel commitment");
  }

  async reconcileExpiredCommitments(input: Readonly<{
    context: Omit<AuthenticatedSqlCommandContext, "idempotencyKey">;
    limit?: number;
    cursor?: string | null;
  }>): Promise<ReconcileExpiredCommitmentsResult> {
    const context = { ...input.context, idempotencyKey: "reconcile-batch" };
    requireTrustedContext(context);
    const result = await this.executor.query<ReconcileRow>(
      `SELECT * FROM "exec006_reconcile_expired_commitments"(
        $1::uuid,$2::uuid,$3::uuid,$4::integer,$5::uuid,$6::text,$7::timestamptz
      )`,
      [
        context.tenantId,
        context.actorUserId,
        context.assignmentId,
        Math.max(1, Math.min(input.limit ?? 100, 500)),
        input.cursor ?? null,
        context.correlationId,
        now(context),
      ],
    );
    const row = result.rows[0];
    return {
      processed: row?.processed ?? 0,
      expired: row?.expired ?? 0,
      nextCursor: row?.next_cursor ?? null,
    };
  }

  async createTourAppointment(input: SqlCreateTourInput): Promise<string> {
    requireTrustedContext(input.context);
    const fingerprint = payloadHash({
      branchId: input.branchId,
      unitId: input.unitId ?? null,
      staffUserId: input.staffUserId,
      operationalResourceId: input.operationalResourceId ?? null,
      customer: input.customer,
      startAtUtc: input.startAtUtc,
      endAtUtc: input.endAtUtc,
      timezone: input.timezone,
      location: input.location,
      reason: input.context.reason ?? null,
    });
    const result = await this.executor.query<IdRow>(
      `SELECT "exec006_create_tour_appointment"(
        $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text,$6::uuid,$7::uuid,
        $8::uuid,$9::timestamptz,$10::timestamptz,$11::text,$12::text,
        $13::uuid,$14::uuid,$15::text,$16::text,$17::text,$18::text,$19::timestamptz
      ) AS id`,
      [
        input.context.tenantId,
        input.branchId,
        input.unitId ?? null,
        input.staffUserId,
        input.operationalResourceId ?? null,
        input.customer.partyId ?? null,
        input.customer.customerAccountId ?? null,
        input.customer.opportunityId ?? null,
        input.startAtUtc,
        input.endAtUtc,
        input.timezone,
        input.location,
        input.context.actorUserId,
        input.context.assignmentId,
        input.context.reason ?? null,
        input.context.correlationId,
        input.context.idempotencyKey,
        fingerprint,
        now(input.context),
      ],
    );
    return requireId(result, "Create Tour Appointment");
  }

  async rescheduleTourAppointment(input: Readonly<{
    context: AuthenticatedSqlCommandContext;
    tourId: string;
    startAtUtc: Date;
    endAtUtc: Date;
    timezone: string;
  }>): Promise<string> {
    requireTrustedContext(input.context);
    if (input.context.expectedVersion == null) {
      throw new Error("Expected version is required for Tour reschedule");
    }
    const fingerprint = payloadHash({
      tourId: input.tourId,
      startAtUtc: input.startAtUtc,
      endAtUtc: input.endAtUtc,
      timezone: input.timezone,
      expectedVersion: input.context.expectedVersion,
      reason: input.context.reason ?? null,
    });
    const result = await this.executor.query<IdRow>(
      `SELECT "exec006_reschedule_tour_appointment"(
        $1::uuid,$2::uuid,$3::timestamptz,$4::timestamptz,$5::text,$6::uuid,
        $7::uuid,$8::integer,$9::text,$10::text,$11::text,$12::text,$13::timestamptz
      ) AS id`,
      [
        input.context.tenantId,
        input.tourId,
        input.startAtUtc,
        input.endAtUtc,
        input.timezone,
        input.context.actorUserId,
        input.context.assignmentId,
        input.context.expectedVersion,
        input.context.reason ?? null,
        input.context.correlationId,
        input.context.idempotencyKey,
        fingerprint,
        now(input.context),
      ],
    );
    return requireId(result, "Reschedule Tour Appointment");
  }

  async transitionTourAppointment(input: Readonly<{
    context: AuthenticatedSqlCommandContext;
    tourId: string;
    targetStatus:
      | "CONFIRMED"
      | "COMPLETED"
      | "NO_SHOW"
      | "CANCELLED"
      | "REJECTED";
  }>): Promise<string> {
    requireTrustedContext(input.context);
    if (input.context.expectedVersion == null) {
      throw new Error("Expected version is required for Tour transition");
    }
    const fingerprint = payloadHash({
      tourId: input.tourId,
      targetStatus: input.targetStatus,
      expectedVersion: input.context.expectedVersion,
      reason: input.context.reason ?? null,
    });
    const result = await this.executor.query<IdRow>(
      `SELECT "exec006_transition_tour_appointment"(
        $1::uuid,$2::uuid,$3::text,$4::uuid,$5::uuid,$6::integer,$7::text,
        $8::text,$9::text,$10::text,$11::timestamptz
      ) AS id`,
      [
        input.context.tenantId,
        input.tourId,
        input.targetStatus,
        input.context.actorUserId,
        input.context.assignmentId,
        input.context.expectedVersion,
        input.context.reason ?? null,
        input.context.correlationId,
        input.context.idempotencyKey,
        fingerprint,
        now(input.context),
      ],
    );
    return requireId(result, "Transition Tour Appointment");
  }
}