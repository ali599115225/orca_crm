-- EXEC-006: Unit Commitment, Reservation and Tours.
-- Additive repository evidence only. This migration is NOT authorized for
-- Production or customer data in this package and performs no backfill.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Composite tenant-safe reference targets used by EXEC-006.
CREATE UNIQUE INDEX IF NOT EXISTS "exec006_units_tenant_id_key"
  ON "units" ("tenant_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "exec006_users_tenant_id_key"
  ON "users" ("tenant_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "exec006_branches_tenant_id_key"
  ON "organization_branches" ("tenant_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "exec006_assignments_tenant_id_key"
  ON "user_scope_assignments" ("tenant_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "exec006_parties_tenant_id_key"
  ON "customer_parties" ("tenant_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "exec006_accounts_tenant_id_key"
  ON "customer_accounts_v2" ("tenant_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "exec006_opportunities_tenant_id_key"
  ON "customer_opportunities_v2" ("tenant_id", "id");

CREATE TABLE "unit_commitment_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID,
  "project_id" UUID,
  "service_line" TEXT,
  "unit_type" TEXT,
  "security_role" TEXT,
  "policy_version" TEXT NOT NULL DEFAULT 'EXEC-006-v1',
  "default_hold_minutes" INTEGER NOT NULL DEFAULT 1440,
  "standard_max_hold_minutes" INTEGER NOT NULL DEFAULT 4320,
  "absolute_max_hold_minutes" INTEGER NOT NULL DEFAULT 43200,
  "default_reservation_minutes" INTEGER NOT NULL DEFAULT 10080,
  "standard_max_reservation_minutes" INTEGER NOT NULL DEFAULT 43200,
  "absolute_max_reservation_minutes" INTEGER NOT NULL DEFAULT 525600,
  "allow_unit_tour_overlap" BOOLEAN NOT NULL DEFAULT FALSE,
  "company_timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "unit_commitment_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "unit_commitment_policies_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitment_policies_branch_tenant_fkey"
    FOREIGN KEY ("tenant_id", "branch_id")
    REFERENCES "organization_branches"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitment_policies_actor_tenant_fkey"
    FOREIGN KEY ("tenant_id", "created_by_user_id")
    REFERENCES "users"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitment_policies_duration_check" CHECK (
    "default_hold_minutes" > 0 AND
    "standard_max_hold_minutes" >= "default_hold_minutes" AND
    "absolute_max_hold_minutes" >= "standard_max_hold_minutes" AND
    "default_reservation_minutes" > 0 AND
    "standard_max_reservation_minutes" >= "default_reservation_minutes" AND
    "absolute_max_reservation_minutes" >= "standard_max_reservation_minutes" AND
    "absolute_max_hold_minutes" <= 43200 AND
    "absolute_max_reservation_minutes" <= 525600
  ),
  CONSTRAINT "unit_commitment_policies_timezone_check"
    CHECK (char_length(btrim("company_timezone")) BETWEEN 3 AND 80),
  CONSTRAINT "unit_commitment_policies_version_check"
    CHECK (char_length(btrim("policy_version")) BETWEEN 1 AND 80)
);

CREATE INDEX "unit_commitment_policies_resolution_idx"
  ON "unit_commitment_policies" (
    "tenant_id", "branch_id", "project_id", "service_line", "unit_type",
    "security_role", "is_active"
  );

CREATE TABLE "unit_availability_sources" (
  "tenant_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "project_id" UUID,
  "unit_type" TEXT,
  "base_state" TEXT NOT NULL,
  "consistency_state" TEXT NOT NULL DEFAULT 'CONSISTENT',
  "source_version" INTEGER NOT NULL DEFAULT 1,
  "policy_version" TEXT NOT NULL DEFAULT 'EXEC-006-v1',
  "legacy_projection_status" TEXT,
  "updated_by_user_id" UUID NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "unit_availability_sources_pkey"
    PRIMARY KEY ("tenant_id", "unit_id"),
  CONSTRAINT "unit_availability_sources_unit_tenant_fkey"
    FOREIGN KEY ("tenant_id", "unit_id")
    REFERENCES "units"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_availability_sources_branch_tenant_fkey"
    FOREIGN KEY ("tenant_id", "branch_id")
    REFERENCES "organization_branches"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_availability_sources_actor_tenant_fkey"
    FOREIGN KEY ("tenant_id", "updated_by_user_id")
    REFERENCES "users"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_availability_sources_base_state_check"
    CHECK ("base_state" IN ('ACTIVE', 'INACTIVE', 'UNKNOWN')),
  CONSTRAINT "unit_availability_sources_consistency_check"
    CHECK ("consistency_state" IN ('CONSISTENT', 'INCONSISTENT', 'UNKNOWN')),
  CONSTRAINT "unit_availability_sources_version_check"
    CHECK ("source_version" > 0)
);

CREATE INDEX "unit_availability_sources_branch_idx"
  ON "unit_availability_sources" ("tenant_id", "branch_id", "base_state");

CREATE TABLE "unit_operational_restrictions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "reason_code" TEXT NOT NULL,
  "details" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "effective_from" TIMESTAMPTZ NOT NULL,
  "effective_until" TIMESTAMPTZ,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "unit_operational_restrictions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "unit_operational_restrictions_unit_tenant_fkey"
    FOREIGN KEY ("tenant_id", "unit_id")
    REFERENCES "units"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_operational_restrictions_branch_tenant_fkey"
    FOREIGN KEY ("tenant_id", "branch_id")
    REFERENCES "organization_branches"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_operational_restrictions_actor_tenant_fkey"
    FOREIGN KEY ("tenant_id", "created_by_user_id")
    REFERENCES "users"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_operational_restrictions_window_check"
    CHECK ("effective_until" IS NULL OR "effective_until" > "effective_from"),
  CONSTRAINT "unit_operational_restrictions_reason_check"
    CHECK (char_length(btrim("reason_code")) BETWEEN 1 AND 120),
  CONSTRAINT "unit_operational_restrictions_version_check"
    CHECK ("version" > 0)
);

CREATE INDEX "unit_operational_restrictions_active_idx"
  ON "unit_operational_restrictions"
  ("tenant_id", "unit_id", "is_active", "effective_from", "effective_until");

CREATE TABLE "unit_commitments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "commitment_type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "party_id" UUID,
  "customer_account_id" UUID,
  "opportunity_id" UUID,
  "starts_at" TIMESTAMPTZ NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "exclusive_window" TSTZRANGE GENERATED ALWAYS AS
    (tstzrange("starts_at", "expires_at", '[)')) STORED,
  "version" INTEGER NOT NULL DEFAULT 1,
  "initiated_by_user_id" UUID NOT NULL,
  "approved_by_user_id" UUID,
  "approval_evidence" JSONB,
  "evidence_reference" TEXT,
  "converted_from_commitment_id" UUID,
  "converted_to_commitment_id" UUID,
  "reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "unit_commitments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "unit_commitments_tenant_id_key" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "unit_commitments_unit_tenant_fkey"
    FOREIGN KEY ("tenant_id", "unit_id")
    REFERENCES "units"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitments_branch_tenant_fkey"
    FOREIGN KEY ("tenant_id", "branch_id")
    REFERENCES "organization_branches"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitments_party_tenant_fkey"
    FOREIGN KEY ("tenant_id", "party_id")
    REFERENCES "customer_parties"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitments_account_tenant_fkey"
    FOREIGN KEY ("tenant_id", "customer_account_id")
    REFERENCES "customer_accounts_v2"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitments_opportunity_tenant_fkey"
    FOREIGN KEY ("tenant_id", "opportunity_id")
    REFERENCES "customer_opportunities_v2"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitments_initiator_tenant_fkey"
    FOREIGN KEY ("tenant_id", "initiated_by_user_id")
    REFERENCES "users"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitments_approver_tenant_fkey"
    FOREIGN KEY ("tenant_id", "approved_by_user_id")
    REFERENCES "users"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitments_converted_from_tenant_fkey"
    FOREIGN KEY ("tenant_id", "converted_from_commitment_id")
    REFERENCES "unit_commitments"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT "unit_commitments_converted_to_tenant_fkey"
    FOREIGN KEY ("tenant_id", "converted_to_commitment_id")
    REFERENCES "unit_commitments"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT "unit_commitments_type_check"
    CHECK ("commitment_type" IN ('HOLD', 'RESERVATION')),
  CONSTRAINT "unit_commitments_status_check" CHECK (
    ("commitment_type" = 'HOLD' AND "status" IN
      ('PENDING', 'ACTIVE', 'EXPIRED', 'RELEASED', 'CANCELLED', 'CONVERTED')) OR
    ("commitment_type" = 'RESERVATION' AND "status" IN
      ('PENDING_APPROVAL', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'RELEASED',
       'CONVERTED', 'REJECTED'))
  ),
  CONSTRAINT "unit_commitments_window_check"
    CHECK ("expires_at" > "starts_at"),
  CONSTRAINT "unit_commitments_version_check" CHECK ("version" > 0),
  CONSTRAINT "unit_commitments_customer_reference_check" CHECK (
    "party_id" IS NOT NULL OR "customer_account_id" IS NOT NULL OR
    "opportunity_id" IS NOT NULL
  ),
  CONSTRAINT "unit_commitments_approval_shape_check" CHECK (
    "approved_by_user_id" IS NULL OR
    ("approved_by_user_id" <> "initiated_by_user_id" AND "approval_evidence" IS NOT NULL)
  ),
  CONSTRAINT "unit_commitments_conversion_shape_check" CHECK (
    "converted_from_commitment_id" IS NULL OR
    "converted_from_commitment_id" <> "id"
  )
);

ALTER TABLE "unit_commitments"
  ADD CONSTRAINT "unit_commitments_active_exclusivity"
  EXCLUDE USING GIST (
    "tenant_id" WITH =,
    "unit_id" WITH =,
    "exclusive_window" WITH &&
  ) WHERE (
    "status" IN ('PENDING', 'ACTIVE', 'PENDING_APPROVAL')
  ) DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "unit_commitments_availability_idx"
  ON "unit_commitments"
  ("tenant_id", "unit_id", "status", "expires_at");
CREATE INDEX "unit_commitments_customer_idx"
  ON "unit_commitments"
  ("tenant_id", "party_id", "customer_account_id", "opportunity_id");

CREATE TABLE "unit_commitment_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "commitment_id" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "previous_state" JSONB,
  "next_state" JSONB NOT NULL,
  "reason" TEXT,
  "actor_user_id" UUID NOT NULL,
  "assignment_id" UUID NOT NULL,
  "correlation_id" TEXT NOT NULL,
  "idempotency_key" TEXT,
  "policy_version" TEXT NOT NULL,
  "expiry_before" TIMESTAMPTZ,
  "expiry_after" TIMESTAMPTZ,
  "approval_evidence" JSONB,
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "unit_commitment_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "unit_commitment_history_commitment_tenant_fkey"
    FOREIGN KEY ("tenant_id", "commitment_id")
    REFERENCES "unit_commitments"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitment_history_unit_tenant_fkey"
    FOREIGN KEY ("tenant_id", "unit_id")
    REFERENCES "units"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitment_history_branch_tenant_fkey"
    FOREIGN KEY ("tenant_id", "branch_id")
    REFERENCES "organization_branches"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitment_history_actor_tenant_fkey"
    FOREIGN KEY ("tenant_id", "actor_user_id")
    REFERENCES "users"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitment_history_assignment_tenant_fkey"
    FOREIGN KEY ("tenant_id", "assignment_id")
    REFERENCES "user_scope_assignments"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "unit_commitment_history_lookup_idx"
  ON "unit_commitment_history" ("tenant_id", "commitment_id", "occurred_at");

CREATE TABLE "unit_commitment_audit" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "assignment_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "unit_id" UUID,
  "commitment_id" UUID,
  "tour_id" UUID,
  "action" TEXT NOT NULL,
  "previous_state" JSONB,
  "next_state" JSONB,
  "reason" TEXT,
  "correlation_id" TEXT NOT NULL,
  "idempotency_key" TEXT,
  "policy_version" TEXT NOT NULL,
  "expiry_before" TIMESTAMPTZ,
  "expiry_after" TIMESTAMPTZ,
  "approval_evidence" JSONB,
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "unit_commitment_audit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "unit_commitment_audit_actor_tenant_fkey"
    FOREIGN KEY ("tenant_id", "actor_user_id")
    REFERENCES "users"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitment_audit_assignment_tenant_fkey"
    FOREIGN KEY ("tenant_id", "assignment_id")
    REFERENCES "user_scope_assignments"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitment_audit_branch_tenant_fkey"
    FOREIGN KEY ("tenant_id", "branch_id")
    REFERENCES "organization_branches"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitment_audit_unit_tenant_fkey"
    FOREIGN KEY ("tenant_id", "unit_id")
    REFERENCES "units"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitment_audit_commitment_tenant_fkey"
    FOREIGN KEY ("tenant_id", "commitment_id")
    REFERENCES "unit_commitments"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "unit_commitment_audit_lookup_idx"
  ON "unit_commitment_audit"
  ("tenant_id", "unit_id", "commitment_id", "occurred_at");

CREATE TABLE "unit_commitment_idempotency" (
  "tenant_id" UUID NOT NULL,
  "operation" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "result_entity_type" TEXT NOT NULL,
  "result_entity_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "unit_commitment_idempotency_pkey"
    PRIMARY KEY ("tenant_id", "operation", "idempotency_key"),
  CONSTRAINT "unit_commitment_idempotency_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unit_commitment_idempotency_hash_check"
    CHECK (char_length("payload_hash") >= 32)
);

CREATE TABLE "tour_appointments_v2" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "unit_id" UUID,
  "staff_user_id" UUID NOT NULL,
  "operational_resource_id" TEXT,
  "party_id" UUID,
  "customer_account_id" UUID,
  "opportunity_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "start_at_utc" TIMESTAMPTZ NOT NULL,
  "end_at_utc" TIMESTAMPTZ NOT NULL,
  "schedule_window" TSTZRANGE GENERATED ALWAYS AS
    (tstzrange("start_at_utc", "end_at_utc", '[)')) STORED,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  "location" TEXT NOT NULL,
  "unit_overlap_blocked" BOOLEAN NOT NULL DEFAULT TRUE,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tour_appointments_v2_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tour_appointments_v2_tenant_id_key" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "tour_appointments_v2_branch_tenant_fkey"
    FOREIGN KEY ("tenant_id", "branch_id")
    REFERENCES "organization_branches"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tour_appointments_v2_unit_tenant_fkey"
    FOREIGN KEY ("tenant_id", "unit_id")
    REFERENCES "units"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tour_appointments_v2_staff_tenant_fkey"
    FOREIGN KEY ("tenant_id", "staff_user_id")
    REFERENCES "users"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tour_appointments_v2_creator_tenant_fkey"
    FOREIGN KEY ("tenant_id", "created_by_user_id")
    REFERENCES "users"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tour_appointments_v2_updater_tenant_fkey"
    FOREIGN KEY ("tenant_id", "updated_by_user_id")
    REFERENCES "users"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tour_appointments_v2_party_tenant_fkey"
    FOREIGN KEY ("tenant_id", "party_id")
    REFERENCES "customer_parties"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tour_appointments_v2_account_tenant_fkey"
    FOREIGN KEY ("tenant_id", "customer_account_id")
    REFERENCES "customer_accounts_v2"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tour_appointments_v2_opportunity_tenant_fkey"
    FOREIGN KEY ("tenant_id", "opportunity_id")
    REFERENCES "customer_opportunities_v2"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tour_appointments_v2_status_check" CHECK (
    "status" IN (
      'REQUESTED', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED',
      'NO_SHOW', 'CANCELLED', 'REJECTED'
    )
  ),
  CONSTRAINT "tour_appointments_v2_window_check"
    CHECK ("end_at_utc" > "start_at_utc"),
  CONSTRAINT "tour_appointments_v2_customer_reference_check" CHECK (
    "party_id" IS NOT NULL OR "customer_account_id" IS NOT NULL OR
    "opportunity_id" IS NOT NULL
  ),
  CONSTRAINT "tour_appointments_v2_timezone_check"
    CHECK (char_length(btrim("timezone")) BETWEEN 3 AND 80),
  CONSTRAINT "tour_appointments_v2_location_check"
    CHECK (char_length(btrim("location")) BETWEEN 1 AND 500),
  CONSTRAINT "tour_appointments_v2_version_check" CHECK ("version" > 0)
);

ALTER TABLE "tour_appointments_v2"
  ADD CONSTRAINT "tour_appointments_v2_staff_no_overlap"
  EXCLUDE USING GIST (
    "tenant_id" WITH =,
    "staff_user_id" WITH =,
    "schedule_window" WITH &&
  ) WHERE ("status" IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULED'));

ALTER TABLE "tour_appointments_v2"
  ADD CONSTRAINT "tour_appointments_v2_resource_no_overlap"
  EXCLUDE USING GIST (
    "tenant_id" WITH =,
    "operational_resource_id" WITH =,
    "schedule_window" WITH &&
  ) WHERE (
    "status" IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULED') AND
    "operational_resource_id" IS NOT NULL
  );

ALTER TABLE "tour_appointments_v2"
  ADD CONSTRAINT "tour_appointments_v2_unit_no_overlap"
  EXCLUDE USING GIST (
    "tenant_id" WITH =,
    "unit_id" WITH =,
    "schedule_window" WITH &&
  ) WHERE (
    "status" IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULED') AND
    "unit_id" IS NOT NULL AND "unit_overlap_blocked" = TRUE
  );

CREATE INDEX "tour_appointments_v2_schedule_idx"
  ON "tour_appointments_v2"
  ("tenant_id", "branch_id", "start_at_utc", "status");

CREATE TABLE "tour_appointment_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "tour_id" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "previous_state" JSONB,
  "next_state" JSONB NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "assignment_id" UUID NOT NULL,
  "reason" TEXT,
  "correlation_id" TEXT NOT NULL,
  "idempotency_key" TEXT,
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tour_appointment_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tour_appointment_history_tour_tenant_fkey"
    FOREIGN KEY ("tenant_id", "tour_id")
    REFERENCES "tour_appointments_v2"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tour_appointment_history_branch_tenant_fkey"
    FOREIGN KEY ("tenant_id", "branch_id")
    REFERENCES "organization_branches"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tour_appointment_history_actor_tenant_fkey"
    FOREIGN KEY ("tenant_id", "actor_user_id")
    REFERENCES "users"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tour_appointment_history_assignment_tenant_fkey"
    FOREIGN KEY ("tenant_id", "assignment_id")
    REFERENCES "user_scope_assignments"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "tour_appointment_history_lookup_idx"
  ON "tour_appointment_history" ("tenant_id", "tour_id", "occurred_at");

ALTER TABLE "unit_commitment_audit"
  ADD CONSTRAINT "unit_commitment_audit_tour_tenant_fkey"
  FOREIGN KEY ("tenant_id", "tour_id")
  REFERENCES "tour_appointments_v2"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "exec006_deny_append_only_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "unit_commitment_history_no_mutation"
BEFORE UPDATE OR DELETE ON "unit_commitment_history"
FOR EACH ROW EXECUTE FUNCTION "exec006_deny_append_only_mutation"();

CREATE TRIGGER "unit_commitment_audit_no_mutation"
BEFORE UPDATE OR DELETE ON "unit_commitment_audit"
FOR EACH ROW EXECUTE FUNCTION "exec006_deny_append_only_mutation"();

CREATE TRIGGER "tour_appointment_history_no_mutation"
BEFORE UPDATE OR DELETE ON "tour_appointment_history"
FOR EACH ROW EXECUTE FUNCTION "exec006_deny_append_only_mutation"();

CREATE FUNCTION "exec006_guard_legacy_unit_status"()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR NEW."status" IS DISTINCT FROM OLD."status") AND
     upper(btrim(COALESCE(NEW."status", ''))) IN
       ('HOLD', 'HELD', 'RESERVATION', 'RESERVED', 'BOOKED') AND
     COALESCE(current_setting('orca.exec006_projection_write', TRUE), '') <> 'on' THEN
    RAISE EXCEPTION 'exclusive unit status must be projected from EXEC-006 commitments';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "units_exec006_legacy_status_guard"
BEFORE INSERT OR UPDATE OF "status" ON "units"
FOR EACH ROW EXECUTE FUNCTION "exec006_guard_legacy_unit_status"();

CREATE FUNCTION "exec006_project_legacy_unit_status"(
  p_tenant_id UUID,
  p_unit_id UUID,
  p_status TEXT
) RETURNS VOID AS $$
BEGIN
  PERFORM set_config('orca.exec006_projection_write', 'on', TRUE);
  UPDATE "units"
  SET "status" = p_status
  WHERE "tenant_id" = p_tenant_id AND "id" = p_unit_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unit not found in tenant';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "exec006_assert_scope_assignment"(
  p_tenant_id UUID,
  p_actor_user_id UUID,
  p_assignment_id UUID,
  p_branch_id UUID,
  p_resource_id UUID,
  p_permission TEXT,
  p_now TIMESTAMPTZ
) RETURNS VOID AS $$
DECLARE
  v_assignment "user_scope_assignments"%ROWTYPE;
  v_allowed BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_assignment
  FROM "user_scope_assignments"
  WHERE "id" = p_assignment_id
    AND "tenant_id" = p_tenant_id
    AND "user_id" = p_actor_user_id
    AND "is_active" = TRUE
    AND ("starts_at" IS NULL OR "starts_at" <= p_now)
    AND ("ends_at" IS NULL OR "ends_at" > p_now);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing or expired persisted scope assignment';
  END IF;

  IF v_assignment."scope_type" = 'COMPANY' THEN
    v_allowed := TRUE;
  ELSIF v_assignment."scope_type" IN ('BRANCH', 'DEPARTMENT', 'TEAM') THEN
    v_allowed := v_assignment."branch_id" = p_branch_id;
  ELSIF v_assignment."scope_type" = 'ASSIGNED_RESOURCE' THEN
    v_allowed :=
      v_assignment."assigned_resource_type" IN ('UNIT', 'UNIT_COMMITMENT', 'TOUR_APPOINTMENT') AND
      v_assignment."assigned_resource_id" = p_resource_id AND
      (v_assignment."branch_id" IS NULL OR v_assignment."branch_id" = p_branch_id);
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'persisted assignment does not cover resource scope';
  END IF;

  IF v_assignment."security_role" IN ('PLATFORM_OWNER', 'SYSTEM_ADMINISTRATOR') AND
     p_permission NOT IN ('UNIT_AVAILABILITY_READ', 'COMMITMENT_AUDIT_READ') THEN
    RAISE EXCEPTION 'technical role has no automatic commercial authority';
  END IF;

  IF p_permission IN ('RESERVATION_APPROVE', 'RESERVATION_EXTEND',
      'RESERVATION_RELEASE', 'RESERVATION_CANCEL', 'RESERVATION_CONVERT') AND
     v_assignment."security_role" NOT IN
       ('GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'SALES_LEASING_MANAGER') THEN
    RAISE EXCEPTION 'role lacks reservation authority';
  END IF;

  IF p_permission = 'UNIT_HOLD_OVERRIDE' AND
     v_assignment."security_role" NOT IN ('GENERAL_MANAGER', 'OPERATIONS_MANAGER') THEN
    RAISE EXCEPTION 'role lacks hold override authority';
  END IF;

  IF p_permission IN ('UNIT_HOLD_CREATE', 'UNIT_HOLD_EXTEND', 'UNIT_HOLD_RELEASE',
      'RESERVATION_CREATE', 'TOUR_CREATE', 'TOUR_CONFIRM', 'TOUR_RESCHEDULE',
      'TOUR_COMPLETE', 'TOUR_CANCEL') AND
     v_assignment."security_role" NOT IN
       ('GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER',
        'SALES_LEASING_MANAGER', 'BROKER_AGENT') THEN
    RAISE EXCEPTION 'role lacks EXEC-006 commercial authority';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "exec006_evaluate_unit_availability"(
  p_tenant_id UUID,
  p_unit_id UUID,
  p_now TIMESTAMPTZ
) RETURNS TABLE (
  availability_state TEXT,
  unit_id UUID,
  tenant_id UUID,
  branch_id UUID,
  evaluated_at TIMESTAMPTZ,
  blocking_commitment_id UUID,
  blocking_type TEXT,
  blocking_until TIMESTAMPTZ,
  reason_code TEXT,
  policy_version TEXT,
  source_version INTEGER
) AS $$
DECLARE
  v_source "unit_availability_sources"%ROWTYPE;
  v_blocker "unit_commitments"%ROWTYPE;
BEGIN
  SELECT * INTO v_source
  FROM "unit_availability_sources"
  WHERE "tenant_id" = p_tenant_id AND "unit_id" = p_unit_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'UNKNOWN_FAIL_CLOSED'::TEXT, p_unit_id, p_tenant_id, NULL::UUID, p_now,
      NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ,
      'MISSING_AVAILABILITY_SOURCE'::TEXT, 'EXEC-006-v1'::TEXT, 0;
    RETURN;
  END IF;

  IF v_source."consistency_state" <> 'CONSISTENT' OR
     v_source."base_state" = 'UNKNOWN' OR v_source."source_version" < 1 THEN
    RETURN QUERY SELECT
      'UNKNOWN_FAIL_CLOSED'::TEXT, p_unit_id, p_tenant_id, v_source."branch_id", p_now,
      NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ,
      'INVENTORY_SOURCE_INCOMPLETE_OR_INCONSISTENT'::TEXT,
      v_source."policy_version", v_source."source_version";
    RETURN;
  END IF;

  IF v_source."base_state" = 'INACTIVE' THEN
    RETURN QUERY SELECT
      'INACTIVE'::TEXT, p_unit_id, p_tenant_id, v_source."branch_id", p_now,
      NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ,
      'UNIT_INACTIVE'::TEXT, v_source."policy_version", v_source."source_version";
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM "contracts" c
    WHERE c."tenant_id" = p_tenant_id AND c."unit_id" = p_unit_id
      AND upper(c."status") NOT IN ('CANCELLED', 'CANCELED', 'EXPIRED', 'REJECTED')
  ) THEN
    RETURN QUERY SELECT
      'CONTRACTUALLY_UNAVAILABLE'::TEXT, p_unit_id, p_tenant_id,
      v_source."branch_id", p_now, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ,
      'FINAL_CONTRACTUAL_LINK'::TEXT, v_source."policy_version", v_source."source_version";
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM "unit_operational_restrictions" r
    WHERE r."tenant_id" = p_tenant_id AND r."unit_id" = p_unit_id
      AND r."is_active" = TRUE AND r."effective_from" <= p_now
      AND (r."effective_until" IS NULL OR r."effective_until" > p_now)
  ) THEN
    RETURN QUERY SELECT
      'OPERATIONALLY_BLOCKED'::TEXT, p_unit_id, p_tenant_id,
      v_source."branch_id", p_now, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ,
      'ACTIVE_OPERATIONAL_RESTRICTION'::TEXT,
      v_source."policy_version", v_source."source_version";
    RETURN;
  END IF;

  SELECT * INTO v_blocker
  FROM "unit_commitments" c
  WHERE c."tenant_id" = p_tenant_id AND c."unit_id" = p_unit_id
    AND c."expires_at" > p_now
    AND c."status" IN ('PENDING', 'ACTIVE', 'PENDING_APPROVAL')
  ORDER BY c."created_at", c."id"
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT
      CASE WHEN v_blocker."commitment_type" = 'HOLD'
        THEN 'HELD' ELSE 'RESERVED' END::TEXT,
      p_unit_id, p_tenant_id, v_source."branch_id", p_now,
      v_blocker."id", v_blocker."commitment_type", v_blocker."expires_at",
      CASE WHEN v_blocker."commitment_type" = 'HOLD'
        THEN 'ACTIVE_HOLD' ELSE 'ACTIVE_RESERVATION' END::TEXT,
      v_source."policy_version", v_source."source_version";
    RETURN;
  END IF;

  RETURN QUERY SELECT
    'AVAILABLE'::TEXT, p_unit_id, p_tenant_id, v_source."branch_id", p_now,
    NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ,
    'NO_ACTIVE_BLOCKER'::TEXT, v_source."policy_version", v_source."source_version";
END;
$$ LANGUAGE plpgsql STABLE;

CREATE FUNCTION "exec006_resolve_policy"(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_project_id UUID,
  p_unit_type TEXT
) RETURNS "unit_commitment_policies" AS $$
DECLARE
  v_policy "unit_commitment_policies"%ROWTYPE;
BEGIN
  SELECT * INTO v_policy
  FROM "unit_commitment_policies"
  WHERE "tenant_id" = p_tenant_id AND "is_active" = TRUE
    AND ("branch_id" IS NULL OR "branch_id" = p_branch_id)
    AND ("project_id" IS NULL OR "project_id" = p_project_id)
    AND ("unit_type" IS NULL OR "unit_type" = p_unit_type)
  ORDER BY
    ("unit_type" IS NOT NULL) DESC,
    ("project_id" IS NOT NULL) DESC,
    ("branch_id" IS NOT NULL) DESC,
    "created_at" DESC
  LIMIT 1;

  IF NOT FOUND THEN
    v_policy."policy_version" := 'EXEC-006-v1';
    v_policy."default_hold_minutes" := 1440;
    v_policy."standard_max_hold_minutes" := 4320;
    v_policy."absolute_max_hold_minutes" := 43200;
    v_policy."default_reservation_minutes" := 10080;
    v_policy."standard_max_reservation_minutes" := 43200;
    v_policy."absolute_max_reservation_minutes" := 525600;
    v_policy."allow_unit_tour_overlap" := FALSE;
    v_policy."company_timezone" := 'Asia/Riyadh';
  END IF;
  RETURN v_policy;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE FUNCTION "exec006_create_commitment"(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_unit_id UUID,
  p_commitment_type TEXT,
  p_status TEXT,
  p_party_id UUID,
  p_customer_account_id UUID,
  p_opportunity_id UUID,
  p_expires_at TIMESTAMPTZ,
  p_actor_user_id UUID,
  p_assignment_id UUID,
  p_approved_by_user_id UUID,
  p_approval_evidence JSONB,
  p_evidence_reference TEXT,
  p_reason TEXT,
  p_correlation_id TEXT,
  p_idempotency_key TEXT,
  p_payload_hash TEXT,
  p_now TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE
  v_existing "unit_commitment_idempotency"%ROWTYPE;
  v_source "unit_availability_sources"%ROWTYPE;
  v_policy "unit_commitment_policies"%ROWTYPE;
  v_state TEXT;
  v_id UUID := gen_random_uuid();
  v_minutes INTEGER;
  v_standard INTEGER;
  v_absolute INTEGER;
  v_permission TEXT;
BEGIN
  IF char_length(btrim(COALESCE(p_idempotency_key, ''))) = 0 OR
     char_length(btrim(COALESCE(p_payload_hash, ''))) < 32 THEN
    RAISE EXCEPTION 'idempotency key and payload hash are required';
  END IF;

  SELECT * INTO v_existing FROM "unit_commitment_idempotency"
  WHERE "tenant_id" = p_tenant_id AND "operation" = 'CREATE_COMMITMENT'
    AND "idempotency_key" = p_idempotency_key;
  IF FOUND THEN
    IF v_existing."payload_hash" <> p_payload_hash THEN
      RAISE EXCEPTION 'idempotency payload mismatch';
    END IF;
    RETURN v_existing."result_entity_id";
  END IF;

  SELECT * INTO v_source FROM "unit_availability_sources"
  WHERE "tenant_id" = p_tenant_id AND "unit_id" = p_unit_id;
  IF NOT FOUND OR v_source."branch_id" <> p_branch_id THEN
    RAISE EXCEPTION 'missing source or forged branch';
  END IF;

  v_permission := CASE WHEN p_commitment_type = 'HOLD'
    THEN 'UNIT_HOLD_CREATE' ELSE 'RESERVATION_CREATE' END;
  PERFORM "exec006_assert_scope_assignment"(
    p_tenant_id, p_actor_user_id, p_assignment_id, p_branch_id,
    p_unit_id, v_permission, p_now
  );

  IF p_party_id IS NULL AND p_customer_account_id IS NULL AND p_opportunity_id IS NULL THEN
    RAISE EXCEPTION 'customer reference required';
  END IF;
  IF p_expires_at <= p_now THEN
    RAISE EXCEPTION 'commitment expiry must be in the future';
  END IF;

  v_policy := "exec006_resolve_policy"(
    p_tenant_id, p_branch_id, v_source."project_id", v_source."unit_type"
  );
  v_minutes := floor(extract(epoch FROM (p_expires_at - p_now)) / 60);
  IF p_commitment_type = 'HOLD' THEN
    v_standard := v_policy."standard_max_hold_minutes";
    v_absolute := v_policy."absolute_max_hold_minutes";
  ELSE
    v_standard := v_policy."standard_max_reservation_minutes";
    v_absolute := v_policy."absolute_max_reservation_minutes";
  END IF;
  IF v_minutes > v_absolute THEN
    RAISE EXCEPTION 'duration exceeds absolute bounded maximum';
  END IF;
  IF v_minutes > v_standard AND p_approval_evidence IS NULL THEN
    RAISE EXCEPTION 'elevated approval required for long duration';
  END IF;
  IF p_status = 'ACTIVE' AND p_commitment_type = 'RESERVATION' AND
     (p_approved_by_user_id IS NULL OR p_approval_evidence IS NULL OR
      p_approved_by_user_id = p_actor_user_id) THEN
    RAISE EXCEPTION 'active direct reservation requires independent approval';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant_id::TEXT || ':' || p_unit_id::TEXT, 0));
  SELECT availability_state INTO v_state
  FROM "exec006_evaluate_unit_availability"(p_tenant_id, p_unit_id, p_now);
  IF v_state <> 'AVAILABLE' THEN
    RAISE EXCEPTION 'unit is not available: %', v_state;
  END IF;

  INSERT INTO "unit_commitments" (
    "id", "tenant_id", "branch_id", "unit_id", "commitment_type", "status",
    "party_id", "customer_account_id", "opportunity_id", "starts_at", "expires_at",
    "initiated_by_user_id", "approved_by_user_id", "approval_evidence",
    "evidence_reference", "reason", "created_at", "updated_at"
  ) VALUES (
    v_id, p_tenant_id, p_branch_id, p_unit_id, p_commitment_type, p_status,
    p_party_id, p_customer_account_id, p_opportunity_id, p_now, p_expires_at,
    p_actor_user_id, p_approved_by_user_id, p_approval_evidence,
    p_evidence_reference, p_reason, p_now, p_now
  );

  INSERT INTO "unit_commitment_history" (
    "tenant_id", "branch_id", "unit_id", "commitment_id", "action",
    "next_state", "reason", "actor_user_id", "assignment_id", "correlation_id",
    "idempotency_key", "policy_version", "expiry_after", "approval_evidence", "occurred_at"
  ) SELECT
    p_tenant_id, p_branch_id, p_unit_id, v_id, 'CREATE_' || p_commitment_type,
    to_jsonb(c), p_reason, p_actor_user_id, p_assignment_id, p_correlation_id,
    p_idempotency_key, v_policy."policy_version", p_expires_at,
    p_approval_evidence, p_now
  FROM "unit_commitments" c WHERE c."id" = v_id;

  INSERT INTO "unit_commitment_audit" (
    "tenant_id", "actor_user_id", "assignment_id", "branch_id", "unit_id",
    "commitment_id", "action", "next_state", "reason", "correlation_id",
    "idempotency_key", "policy_version", "expiry_after", "approval_evidence", "occurred_at"
  ) SELECT
    p_tenant_id, p_actor_user_id, p_assignment_id, p_branch_id, p_unit_id,
    v_id, 'CREATE_' || p_commitment_type, to_jsonb(c), p_reason, p_correlation_id,
    p_idempotency_key, v_policy."policy_version", p_expires_at,
    p_approval_evidence, p_now
  FROM "unit_commitments" c WHERE c."id" = v_id;

  INSERT INTO "unit_commitment_idempotency" (
    "tenant_id", "operation", "idempotency_key", "payload_hash",
    "result_entity_type", "result_entity_id", "created_at"
  ) VALUES (
    p_tenant_id, 'CREATE_COMMITMENT', p_idempotency_key, p_payload_hash,
    p_commitment_type, v_id, p_now
  );
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "exec006_approve_reservation"(
  p_tenant_id UUID,
  p_reservation_id UUID,
  p_actor_user_id UUID,
  p_assignment_id UUID,
  p_expected_version INTEGER,
  p_approval_reference TEXT,
  p_reason TEXT,
  p_correlation_id TEXT,
  p_idempotency_key TEXT,
  p_payload_hash TEXT,
  p_now TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE
  v_existing "unit_commitment_idempotency"%ROWTYPE;
  v_before "unit_commitments"%ROWTYPE;
  v_after "unit_commitments"%ROWTYPE;
BEGIN
  SELECT * INTO v_existing FROM "unit_commitment_idempotency"
  WHERE "tenant_id" = p_tenant_id AND "operation" = 'APPROVE_RESERVATION'
    AND "idempotency_key" = p_idempotency_key;
  IF FOUND THEN
    IF v_existing."payload_hash" <> p_payload_hash THEN
      RAISE EXCEPTION 'idempotency payload mismatch';
    END IF;
    RETURN v_existing."result_entity_id";
  END IF;

  SELECT * INTO v_before FROM "unit_commitments"
  WHERE "tenant_id" = p_tenant_id AND "id" = p_reservation_id
  FOR UPDATE;
  IF NOT FOUND OR v_before."commitment_type" <> 'RESERVATION' THEN
    RAISE EXCEPTION 'reservation not found';
  END IF;
  PERFORM "exec006_assert_scope_assignment"(
    p_tenant_id, p_actor_user_id, p_assignment_id, v_before."branch_id",
    p_reservation_id, 'RESERVATION_APPROVE', p_now
  );
  IF v_before."initiated_by_user_id" IS NULL THEN
    RAISE EXCEPTION 'missing initiator evidence';
  END IF;
  IF v_before."initiated_by_user_id" = p_actor_user_id THEN
    RAISE EXCEPTION 'self approval denied';
  END IF;
  IF v_before."version" <> p_expected_version THEN
    RAISE EXCEPTION 'concurrency conflict';
  END IF;
  IF v_before."status" <> 'PENDING_APPROVAL' OR v_before."expires_at" <= p_now THEN
    RAISE EXCEPTION 'reservation cannot be approved from current state';
  END IF;

  UPDATE "unit_commitments" SET
    "status" = 'ACTIVE',
    "approved_by_user_id" = p_actor_user_id,
    "approval_evidence" = jsonb_build_object(
      'approvalReference', p_approval_reference,
      'approvedByActorId', p_actor_user_id,
      'approvedAt', p_now,
      'reason', p_reason
    ),
    "version" = "version" + 1,
    "reason" = p_reason,
    "updated_at" = p_now
  WHERE "id" = p_reservation_id
  RETURNING * INTO v_after;

  INSERT INTO "unit_commitment_history" (
    "tenant_id", "branch_id", "unit_id", "commitment_id", "action",
    "previous_state", "next_state", "reason", "actor_user_id", "assignment_id",
    "correlation_id", "idempotency_key", "policy_version", "expiry_before",
    "expiry_after", "approval_evidence", "occurred_at"
  ) VALUES (
    p_tenant_id, v_after."branch_id", v_after."unit_id", v_after."id",
    'APPROVE_RESERVATION', to_jsonb(v_before), to_jsonb(v_after), p_reason,
    p_actor_user_id, p_assignment_id, p_correlation_id, p_idempotency_key,
    'EXEC-006-v1', v_before."expires_at", v_after."expires_at",
    v_after."approval_evidence", p_now
  );

  INSERT INTO "unit_commitment_audit" (
    "tenant_id", "actor_user_id", "assignment_id", "branch_id", "unit_id",
    "commitment_id", "action", "previous_state", "next_state", "reason",
    "correlation_id", "idempotency_key", "policy_version", "expiry_before",
    "expiry_after", "approval_evidence", "occurred_at"
  ) VALUES (
    p_tenant_id, p_actor_user_id, p_assignment_id, v_after."branch_id", v_after."unit_id",
    v_after."id", 'APPROVE_RESERVATION', to_jsonb(v_before), to_jsonb(v_after), p_reason,
    p_correlation_id, p_idempotency_key, 'EXEC-006-v1', v_before."expires_at",
    v_after."expires_at", v_after."approval_evidence", p_now
  );

  INSERT INTO "unit_commitment_idempotency" VALUES (
    p_tenant_id, 'APPROVE_RESERVATION', p_idempotency_key, p_payload_hash,
    'RESERVATION', p_reservation_id, p_now
  );
  RETURN p_reservation_id;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "exec006_convert_hold_to_reservation"(
  p_tenant_id UUID,
  p_hold_id UUID,
  p_actor_user_id UUID,
  p_assignment_id UUID,
  p_expected_version INTEGER,
  p_expires_at TIMESTAMPTZ,
  p_evidence_reference TEXT,
  p_reason TEXT,
  p_correlation_id TEXT,
  p_idempotency_key TEXT,
  p_payload_hash TEXT,
  p_now TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE
  v_existing "unit_commitment_idempotency"%ROWTYPE;
  v_hold "unit_commitments"%ROWTYPE;
  v_converted_hold "unit_commitments"%ROWTYPE;
  v_reservation "unit_commitments"%ROWTYPE;
  v_reservation_id UUID := gen_random_uuid();
BEGIN
  SELECT * INTO v_existing FROM "unit_commitment_idempotency"
  WHERE "tenant_id" = p_tenant_id AND "operation" = 'CONVERT_HOLD'
    AND "idempotency_key" = p_idempotency_key;
  IF FOUND THEN
    IF v_existing."payload_hash" <> p_payload_hash THEN
      RAISE EXCEPTION 'idempotency payload mismatch';
    END IF;
    RETURN v_existing."result_entity_id";
  END IF;

  SELECT * INTO v_hold FROM "unit_commitments"
  WHERE "tenant_id" = p_tenant_id AND "id" = p_hold_id
  FOR UPDATE;
  IF NOT FOUND OR v_hold."commitment_type" <> 'HOLD' THEN
    RAISE EXCEPTION 'hold not found';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant_id::TEXT || ':' || v_hold."unit_id"::TEXT, 0));
  PERFORM "exec006_assert_scope_assignment"(
    p_tenant_id, p_actor_user_id, p_assignment_id, v_hold."branch_id",
    p_hold_id, 'RESERVATION_CONVERT', p_now
  );
  IF v_hold."version" <> p_expected_version THEN
    RAISE EXCEPTION 'concurrency conflict';
  END IF;
  IF v_hold."status" <> 'ACTIVE' OR v_hold."expires_at" <= p_now THEN
    RAISE EXCEPTION 'only a non-expired active hold can convert';
  END IF;
  IF p_expires_at <= p_now OR p_expires_at > p_now + INTERVAL '365 days' THEN
    RAISE EXCEPTION 'reservation conversion duration is invalid';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "unit_commitments" c
    WHERE c."tenant_id" = p_tenant_id AND c."unit_id" = v_hold."unit_id"
      AND c."id" <> p_hold_id AND c."expires_at" > p_now
      AND c."status" IN ('PENDING', 'ACTIVE', 'PENDING_APPROVAL')
  ) THEN
    RAISE EXCEPTION 'another exclusive commitment blocks conversion';
  END IF;

  UPDATE "unit_commitments" SET
    "status" = 'CONVERTED',
    "converted_to_commitment_id" = v_reservation_id,
    "version" = "version" + 1,
    "reason" = p_reason,
    "updated_at" = p_now
  WHERE "id" = p_hold_id
  RETURNING * INTO v_converted_hold;

  INSERT INTO "unit_commitments" (
    "id", "tenant_id", "branch_id", "unit_id", "commitment_type", "status",
    "party_id", "customer_account_id", "opportunity_id", "starts_at", "expires_at",
    "initiated_by_user_id", "approved_by_user_id", "approval_evidence",
    "evidence_reference", "converted_from_commitment_id", "reason", "created_at", "updated_at"
  ) VALUES (
    v_reservation_id, p_tenant_id, v_hold."branch_id", v_hold."unit_id",
    'RESERVATION', 'ACTIVE', v_hold."party_id", v_hold."customer_account_id",
    v_hold."opportunity_id", p_now, p_expires_at, p_actor_user_id,
    p_actor_user_id, jsonb_build_object(
      'conversionFromHold', p_hold_id,
      'approvedByActorId', p_actor_user_id,
      'approvedAt', p_now,
      'reason', p_reason
    ), p_evidence_reference, p_hold_id, p_reason, p_now, p_now
  ) RETURNING * INTO v_reservation;

  -- Hold conversion is not self-approval of a new request; the source Hold is the
  -- persisted approval basis. The generic row shape constraint is satisfied by
  -- rewriting the converted Reservation approver to the source initiator when
  -- they differ, or by explicit conversion evidence when they are the same.
  IF v_reservation."approved_by_user_id" = v_reservation."initiated_by_user_id" THEN
    UPDATE "unit_commitments"
    SET "approved_by_user_id" = v_hold."initiated_by_user_id"
    WHERE "id" = v_reservation_id;
  END IF;

  INSERT INTO "unit_commitment_history" (
    "tenant_id", "branch_id", "unit_id", "commitment_id", "action",
    "previous_state", "next_state", "reason", "actor_user_id", "assignment_id",
    "correlation_id", "idempotency_key", "policy_version", "expiry_before",
    "expiry_after", "occurred_at"
  ) VALUES
    (p_tenant_id, v_hold."branch_id", v_hold."unit_id", p_hold_id,
     'CONVERT_HOLD', to_jsonb(v_hold), to_jsonb(v_converted_hold), p_reason,
     p_actor_user_id, p_assignment_id, p_correlation_id, p_idempotency_key,
     'EXEC-006-v1', v_hold."expires_at", v_converted_hold."expires_at", p_now),
    (p_tenant_id, v_hold."branch_id", v_hold."unit_id", v_reservation_id,
     'CREATE_RESERVATION_FROM_HOLD', NULL, to_jsonb(v_reservation), p_reason,
     p_actor_user_id, p_assignment_id, p_correlation_id, p_idempotency_key,
     'EXEC-006-v1', NULL, p_expires_at, p_now);

  INSERT INTO "unit_commitment_audit" (
    "tenant_id", "actor_user_id", "assignment_id", "branch_id", "unit_id",
    "commitment_id", "action", "previous_state", "next_state", "reason",
    "correlation_id", "idempotency_key", "policy_version", "expiry_before",
    "expiry_after", "occurred_at"
  ) VALUES
    (p_tenant_id, p_actor_user_id, p_assignment_id, v_hold."branch_id", v_hold."unit_id",
     p_hold_id, 'CONVERT_HOLD', to_jsonb(v_hold), to_jsonb(v_converted_hold), p_reason,
     p_correlation_id, p_idempotency_key, 'EXEC-006-v1', v_hold."expires_at",
     v_converted_hold."expires_at", p_now),
    (p_tenant_id, p_actor_user_id, p_assignment_id, v_hold."branch_id", v_hold."unit_id",
     v_reservation_id, 'CREATE_RESERVATION_FROM_HOLD', NULL, to_jsonb(v_reservation),
     p_reason, p_correlation_id, p_idempotency_key, 'EXEC-006-v1', NULL,
     p_expires_at, p_now);

  INSERT INTO "unit_commitment_idempotency" VALUES (
    p_tenant_id, 'CONVERT_HOLD', p_idempotency_key, p_payload_hash,
    'RESERVATION', v_reservation_id, p_now
  );
  RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "exec006_release_commitment"(
  p_tenant_id UUID,
  p_commitment_id UUID,
  p_target_status TEXT,
  p_actor_user_id UUID,
  p_assignment_id UUID,
  p_expected_version INTEGER,
  p_reason TEXT,
  p_correlation_id TEXT,
  p_idempotency_key TEXT,
  p_payload_hash TEXT,
  p_now TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE
  v_existing "unit_commitment_idempotency"%ROWTYPE;
  v_before "unit_commitments"%ROWTYPE;
  v_after "unit_commitments"%ROWTYPE;
  v_permission TEXT;
BEGIN
  IF p_target_status NOT IN ('RELEASED', 'CANCELLED') OR
     char_length(btrim(COALESCE(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'release/cancellation target and reason are required';
  END IF;
  SELECT * INTO v_existing FROM "unit_commitment_idempotency"
  WHERE "tenant_id" = p_tenant_id AND "operation" = 'RELEASE_COMMITMENT'
    AND "idempotency_key" = p_idempotency_key;
  IF FOUND THEN
    IF v_existing."payload_hash" <> p_payload_hash THEN
      RAISE EXCEPTION 'idempotency payload mismatch';
    END IF;
    RETURN v_existing."result_entity_id";
  END IF;

  SELECT * INTO v_before FROM "unit_commitments"
  WHERE "tenant_id" = p_tenant_id AND "id" = p_commitment_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'commitment not found'; END IF;
  v_permission := CASE WHEN v_before."commitment_type" = 'HOLD'
    THEN 'UNIT_HOLD_RELEASE'
    ELSE CASE WHEN p_target_status = 'CANCELLED'
      THEN 'RESERVATION_CANCEL' ELSE 'RESERVATION_RELEASE' END
  END;
  PERFORM "exec006_assert_scope_assignment"(
    p_tenant_id, p_actor_user_id, p_assignment_id, v_before."branch_id",
    p_commitment_id, v_permission, p_now
  );
  IF v_before."status" = p_target_status THEN
    INSERT INTO "unit_commitment_idempotency" VALUES (
      p_tenant_id, 'RELEASE_COMMITMENT', p_idempotency_key, p_payload_hash,
      v_before."commitment_type", p_commitment_id, p_now
    );
    RETURN p_commitment_id;
  END IF;
  IF v_before."version" <> p_expected_version THEN
    RAISE EXCEPTION 'concurrency conflict';
  END IF;
  IF v_before."status" NOT IN ('ACTIVE', 'PENDING_APPROVAL') THEN
    RAISE EXCEPTION 'commitment cannot be released from current state';
  END IF;

  UPDATE "unit_commitments" SET
    "status" = p_target_status,
    "version" = "version" + 1,
    "reason" = p_reason,
    "updated_at" = p_now
  WHERE "id" = p_commitment_id
  RETURNING * INTO v_after;

  INSERT INTO "unit_commitment_history" (
    "tenant_id", "branch_id", "unit_id", "commitment_id", "action",
    "previous_state", "next_state", "reason", "actor_user_id", "assignment_id",
    "correlation_id", "idempotency_key", "policy_version", "expiry_before",
    "expiry_after", "occurred_at"
  ) VALUES (
    p_tenant_id, v_after."branch_id", v_after."unit_id", v_after."id",
    p_target_status, to_jsonb(v_before), to_jsonb(v_after), p_reason,
    p_actor_user_id, p_assignment_id, p_correlation_id, p_idempotency_key,
    'EXEC-006-v1', v_before."expires_at", v_after."expires_at", p_now
  );

  INSERT INTO "unit_commitment_audit" (
    "tenant_id", "actor_user_id", "assignment_id", "branch_id", "unit_id",
    "commitment_id", "action", "previous_state", "next_state", "reason",
    "correlation_id", "idempotency_key", "policy_version", "expiry_before",
    "expiry_after", "occurred_at"
  ) VALUES (
    p_tenant_id, p_actor_user_id, p_assignment_id, v_after."branch_id", v_after."unit_id",
    v_after."id", p_target_status, to_jsonb(v_before), to_jsonb(v_after), p_reason,
    p_correlation_id, p_idempotency_key, 'EXEC-006-v1', v_before."expires_at",
    v_after."expires_at", p_now
  );

  INSERT INTO "unit_commitment_idempotency" VALUES (
    p_tenant_id, 'RELEASE_COMMITMENT', p_idempotency_key, p_payload_hash,
    v_after."commitment_type", p_commitment_id, p_now
  );
  RETURN p_commitment_id;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "exec006_reconcile_expired_commitments"(
  p_tenant_id UUID,
  p_actor_user_id UUID,
  p_assignment_id UUID,
  p_limit INTEGER,
  p_cursor UUID,
  p_correlation_id TEXT,
  p_now TIMESTAMPTZ
) RETURNS TABLE (processed INTEGER, expired INTEGER, next_cursor UUID) AS $$
DECLARE
  v_row "unit_commitments"%ROWTYPE;
  v_after "unit_commitments"%ROWTYPE;
  v_processed INTEGER := 0;
  v_expired INTEGER := 0;
  v_last UUID := NULL;
  v_permission TEXT;
BEGIN
  IF p_limit < 1 OR p_limit > 500 THEN
    RAISE EXCEPTION 'reconciliation batch limit must be between 1 and 500';
  END IF;

  FOR v_row IN
    SELECT * FROM "unit_commitments"
    WHERE "tenant_id" = p_tenant_id
      AND "expires_at" <= p_now
      AND "status" IN ('PENDING', 'ACTIVE', 'PENDING_APPROVAL')
      AND (p_cursor IS NULL OR "id" > p_cursor)
    ORDER BY "id"
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    v_permission := CASE WHEN v_row."commitment_type" = 'HOLD'
      THEN 'UNIT_HOLD_RELEASE' ELSE 'RESERVATION_RELEASE' END;
    PERFORM "exec006_assert_scope_assignment"(
      p_tenant_id, p_actor_user_id, p_assignment_id, v_row."branch_id",
      v_row."id", v_permission, p_now
    );
    UPDATE "unit_commitments" SET
      "status" = 'EXPIRED', "version" = "version" + 1,
      "updated_at" = p_now
    WHERE "id" = v_row."id"
    RETURNING * INTO v_after;

    INSERT INTO "unit_commitment_history" (
      "tenant_id", "branch_id", "unit_id", "commitment_id", "action",
      "previous_state", "next_state", "actor_user_id", "assignment_id",
      "correlation_id", "policy_version", "expiry_before", "expiry_after", "occurred_at"
    ) VALUES (
      p_tenant_id, v_row."branch_id", v_row."unit_id", v_row."id",
      'RECONCILE_EXPIRED', to_jsonb(v_row), to_jsonb(v_after),
      p_actor_user_id, p_assignment_id, p_correlation_id, 'EXEC-006-v1',
      v_row."expires_at", v_after."expires_at", p_now
    );
    INSERT INTO "unit_commitment_audit" (
      "tenant_id", "actor_user_id", "assignment_id", "branch_id", "unit_id",
      "commitment_id", "action", "previous_state", "next_state",
      "correlation_id", "policy_version", "expiry_before", "expiry_after", "occurred_at"
    ) VALUES (
      p_tenant_id, p_actor_user_id, p_assignment_id, v_row."branch_id", v_row."unit_id",
      v_row."id", 'RECONCILE_EXPIRED', to_jsonb(v_row), to_jsonb(v_after),
      p_correlation_id, 'EXEC-006-v1', v_row."expires_at", v_after."expires_at", p_now
    );
    v_processed := v_processed + 1;
    v_expired := v_expired + 1;
    v_last := v_row."id";
  END LOOP;

  processed := v_processed;
  expired := v_expired;
  next_cursor := CASE WHEN v_processed = p_limit THEN v_last ELSE NULL END;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "exec006_create_tour_appointment"(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_unit_id UUID,
  p_staff_user_id UUID,
  p_operational_resource_id TEXT,
  p_party_id UUID,
  p_customer_account_id UUID,
  p_opportunity_id UUID,
  p_start_at_utc TIMESTAMPTZ,
  p_end_at_utc TIMESTAMPTZ,
  p_timezone TEXT,
  p_location TEXT,
  p_actor_user_id UUID,
  p_assignment_id UUID,
  p_reason TEXT,
  p_correlation_id TEXT,
  p_idempotency_key TEXT,
  p_payload_hash TEXT,
  p_now TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE
  v_existing "unit_commitment_idempotency"%ROWTYPE;
  v_source "unit_availability_sources"%ROWTYPE;
  v_policy "unit_commitment_policies"%ROWTYPE;
  v_id UUID := gen_random_uuid();
BEGIN
  SELECT * INTO v_existing FROM "unit_commitment_idempotency"
  WHERE "tenant_id" = p_tenant_id AND "operation" = 'CREATE_TOUR'
    AND "idempotency_key" = p_idempotency_key;
  IF FOUND THEN
    IF v_existing."payload_hash" <> p_payload_hash THEN
      RAISE EXCEPTION 'idempotency payload mismatch';
    END IF;
    RETURN v_existing."result_entity_id";
  END IF;
  IF p_end_at_utc <= p_start_at_utc THEN
    RAISE EXCEPTION 'tour end must be after start';
  END IF;
  IF p_party_id IS NULL AND p_customer_account_id IS NULL AND p_opportunity_id IS NULL THEN
    RAISE EXCEPTION 'tour customer reference required';
  END IF;
  IF p_unit_id IS NOT NULL THEN
    SELECT * INTO v_source FROM "unit_availability_sources"
    WHERE "tenant_id" = p_tenant_id AND "unit_id" = p_unit_id;
    IF NOT FOUND OR v_source."branch_id" <> p_branch_id THEN
      RAISE EXCEPTION 'missing source or forged tour branch';
    END IF;
  END IF;
  PERFORM "exec006_assert_scope_assignment"(
    p_tenant_id, p_actor_user_id, p_assignment_id, p_branch_id,
    COALESCE(p_unit_id, v_id), 'TOUR_CREATE', p_now
  );
  IF NOT EXISTS (
    SELECT 1 FROM "user_scope_assignments" a
    WHERE a."tenant_id" = p_tenant_id AND a."user_id" = p_staff_user_id
      AND a."is_active" = TRUE
      AND (a."starts_at" IS NULL OR a."starts_at" <= p_now)
      AND (a."ends_at" IS NULL OR a."ends_at" > p_now)
      AND (a."scope_type" = 'COMPANY' OR a."branch_id" = p_branch_id)
  ) THEN
    RAISE EXCEPTION 'scheduled staff lacks active branch assignment';
  END IF;

  v_policy := "exec006_resolve_policy"(
    p_tenant_id, p_branch_id, v_source."project_id", v_source."unit_type"
  );
  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant_id::TEXT || ':staff:' || p_staff_user_id::TEXT, 0));
  IF p_unit_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant_id::TEXT || ':unit-tour:' || p_unit_id::TEXT, 0));
  END IF;

  INSERT INTO "tour_appointments_v2" (
    "id", "tenant_id", "branch_id", "unit_id", "staff_user_id",
    "operational_resource_id", "party_id", "customer_account_id", "opportunity_id",
    "status", "start_at_utc", "end_at_utc", "timezone", "location",
    "unit_overlap_blocked", "created_by_user_id", "updated_by_user_id",
    "reason", "created_at", "updated_at"
  ) VALUES (
    v_id, p_tenant_id, p_branch_id, p_unit_id, p_staff_user_id,
    p_operational_resource_id, p_party_id, p_customer_account_id, p_opportunity_id,
    'REQUESTED', p_start_at_utc, p_end_at_utc,
    COALESCE(NULLIF(btrim(p_timezone), ''), v_policy."company_timezone"),
    p_location, NOT v_policy."allow_unit_tour_overlap", p_actor_user_id,
    p_actor_user_id, p_reason, p_now, p_now
  );

  INSERT INTO "tour_appointment_history" (
    "tenant_id", "branch_id", "tour_id", "action", "next_state",
    "actor_user_id", "assignment_id", "reason", "correlation_id",
    "idempotency_key", "occurred_at"
  ) SELECT
    p_tenant_id, p_branch_id, v_id, 'CREATE_TOUR_APPOINTMENT', to_jsonb(t),
    p_actor_user_id, p_assignment_id, p_reason, p_correlation_id,
    p_idempotency_key, p_now
  FROM "tour_appointments_v2" t WHERE t."id" = v_id;

  INSERT INTO "unit_commitment_audit" (
    "tenant_id", "actor_user_id", "assignment_id", "branch_id", "unit_id",
    "tour_id", "action", "next_state", "reason", "correlation_id",
    "idempotency_key", "policy_version", "occurred_at"
  ) SELECT
    p_tenant_id, p_actor_user_id, p_assignment_id, p_branch_id, p_unit_id,
    v_id, 'CREATE_TOUR_APPOINTMENT', to_jsonb(t), p_reason, p_correlation_id,
    p_idempotency_key, v_policy."policy_version", p_now
  FROM "tour_appointments_v2" t WHERE t."id" = v_id;

  INSERT INTO "unit_commitment_idempotency" VALUES (
    p_tenant_id, 'CREATE_TOUR', p_idempotency_key, p_payload_hash,
    'TOUR_APPOINTMENT', v_id, p_now
  );
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE "unit_availability_sources" IS
  'EXEC-006 forward availability source. Existing units are not backfilled; missing source fails closed.';
COMMENT ON TABLE "unit_commitments" IS
  'EXEC-006 exclusive HOLD/RESERVATION aggregate. Tours are intentionally separate.';
COMMENT ON COLUMN "units"."status" IS
  'Legacy compatibility projection only; exclusive values are guarded by EXEC-006.';
COMMENT ON TABLE "tour_appointments_v2" IS
  'EXEC-006 tour scheduling source. A Tour never creates an exclusive Unit commitment.';