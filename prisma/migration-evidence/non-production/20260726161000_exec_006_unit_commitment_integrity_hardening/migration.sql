-- EXEC-006 integrity hardening discovered during frozen pre-execution SQL review.
-- Additive command functions and guards only; no Production execution or backfill.

ALTER TABLE "unit_commitments"
  DROP CONSTRAINT "unit_commitments_approval_shape_check";

ALTER TABLE "unit_commitments"
  ADD CONSTRAINT "unit_commitments_approval_shape_check" CHECK (
    "approved_by_user_id" IS NULL OR (
      "approval_evidence" IS NOT NULL AND (
        "converted_from_commitment_id" IS NOT NULL OR
        "approved_by_user_id" <> "initiated_by_user_id"
      )
    )
  );

CREATE FUNCTION "exec006_validate_commitment_integrity"()
RETURNS TRIGGER AS $$
DECLARE
  v_source "unit_availability_sources"%ROWTYPE;
  v_account_party UUID;
  v_opportunity_party UUID;
  v_opportunity_account UUID;
  v_opportunity_branch UUID;
BEGIN
  SELECT * INTO v_source
  FROM "unit_availability_sources"
  WHERE "tenant_id" = NEW."tenant_id" AND "unit_id" = NEW."unit_id";
  IF NOT FOUND OR v_source."branch_id" <> NEW."branch_id" THEN
    RAISE EXCEPTION 'commitment unit source or branch mismatch';
  END IF;

  IF NEW."customer_account_id" IS NOT NULL THEN
    SELECT "party_id" INTO v_account_party
    FROM "customer_accounts_v2"
    WHERE "tenant_id" = NEW."tenant_id" AND "id" = NEW."customer_account_id";
    IF NOT FOUND OR
       (NEW."party_id" IS NOT NULL AND v_account_party <> NEW."party_id") THEN
      RAISE EXCEPTION 'commitment customer account subject mismatch';
    END IF;
  END IF;

  IF NEW."opportunity_id" IS NOT NULL THEN
    SELECT "party_id", "customer_account_id", "branch_id"
      INTO v_opportunity_party, v_opportunity_account, v_opportunity_branch
    FROM "customer_opportunities_v2"
    WHERE "tenant_id" = NEW."tenant_id" AND "id" = NEW."opportunity_id";
    IF NOT FOUND OR v_opportunity_branch <> NEW."branch_id" OR
       (NEW."party_id" IS NOT NULL AND v_opportunity_party IS NOT NULL AND
        v_opportunity_party <> NEW."party_id") OR
       (NEW."customer_account_id" IS NOT NULL AND v_opportunity_account IS NOT NULL AND
        v_opportunity_account <> NEW."customer_account_id") THEN
      RAISE EXCEPTION 'commitment opportunity subject or branch mismatch';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "unit_commitments_integrity_guard"
BEFORE INSERT OR UPDATE ON "unit_commitments"
FOR EACH ROW EXECUTE FUNCTION "exec006_validate_commitment_integrity"();

CREATE FUNCTION "exec006_protect_commitment_identity"()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."tenant_id" IS DISTINCT FROM NEW."tenant_id" OR
     OLD."branch_id" IS DISTINCT FROM NEW."branch_id" OR
     OLD."unit_id" IS DISTINCT FROM NEW."unit_id" OR
     OLD."commitment_type" IS DISTINCT FROM NEW."commitment_type" OR
     OLD."party_id" IS DISTINCT FROM NEW."party_id" OR
     OLD."customer_account_id" IS DISTINCT FROM NEW."customer_account_id" OR
     OLD."opportunity_id" IS DISTINCT FROM NEW."opportunity_id" OR
     OLD."starts_at" IS DISTINCT FROM NEW."starts_at" OR
     OLD."initiated_by_user_id" IS DISTINCT FROM NEW."initiated_by_user_id" OR
     OLD."created_at" IS DISTINCT FROM NEW."created_at" OR
     OLD."converted_from_commitment_id" IS DISTINCT FROM NEW."converted_from_commitment_id" THEN
    RAISE EXCEPTION 'commitment identity is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "unit_commitments_identity_guard"
BEFORE UPDATE ON "unit_commitments"
FOR EACH ROW EXECUTE FUNCTION "exec006_protect_commitment_identity"();

CREATE FUNCTION "exec006_validate_tour_integrity"()
RETURNS TRIGGER AS $$
DECLARE
  v_source "unit_availability_sources"%ROWTYPE;
  v_account_party UUID;
  v_opportunity_party UUID;
  v_opportunity_account UUID;
  v_opportunity_branch UUID;
BEGIN
  IF NEW."unit_id" IS NOT NULL THEN
    SELECT * INTO v_source
    FROM "unit_availability_sources"
    WHERE "tenant_id" = NEW."tenant_id" AND "unit_id" = NEW."unit_id";
    IF NOT FOUND OR v_source."branch_id" <> NEW."branch_id" THEN
      RAISE EXCEPTION 'tour unit source or branch mismatch';
    END IF;
  END IF;

  IF NEW."customer_account_id" IS NOT NULL THEN
    SELECT "party_id" INTO v_account_party
    FROM "customer_accounts_v2"
    WHERE "tenant_id" = NEW."tenant_id" AND "id" = NEW."customer_account_id";
    IF NOT FOUND OR
       (NEW."party_id" IS NOT NULL AND v_account_party <> NEW."party_id") THEN
      RAISE EXCEPTION 'tour customer account subject mismatch';
    END IF;
  END IF;

  IF NEW."opportunity_id" IS NOT NULL THEN
    SELECT "party_id", "customer_account_id", "branch_id"
      INTO v_opportunity_party, v_opportunity_account, v_opportunity_branch
    FROM "customer_opportunities_v2"
    WHERE "tenant_id" = NEW."tenant_id" AND "id" = NEW."opportunity_id";
    IF NOT FOUND OR v_opportunity_branch <> NEW."branch_id" OR
       (NEW."party_id" IS NOT NULL AND v_opportunity_party IS NOT NULL AND
        v_opportunity_party <> NEW."party_id") OR
       (NEW."customer_account_id" IS NOT NULL AND v_opportunity_account IS NOT NULL AND
        v_opportunity_account <> NEW."customer_account_id") THEN
      RAISE EXCEPTION 'tour opportunity subject or branch mismatch';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "tour_appointments_v2_integrity_guard"
BEFORE INSERT OR UPDATE ON "tour_appointments_v2"
FOR EACH ROW EXECUTE FUNCTION "exec006_validate_tour_integrity"();

CREATE FUNCTION "exec006_protect_tour_identity"()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."tenant_id" IS DISTINCT FROM NEW."tenant_id" OR
     OLD."branch_id" IS DISTINCT FROM NEW."branch_id" OR
     OLD."unit_id" IS DISTINCT FROM NEW."unit_id" OR
     OLD."staff_user_id" IS DISTINCT FROM NEW."staff_user_id" OR
     OLD."operational_resource_id" IS DISTINCT FROM NEW."operational_resource_id" OR
     OLD."party_id" IS DISTINCT FROM NEW."party_id" OR
     OLD."customer_account_id" IS DISTINCT FROM NEW."customer_account_id" OR
     OLD."opportunity_id" IS DISTINCT FROM NEW."opportunity_id" OR
     OLD."created_by_user_id" IS DISTINCT FROM NEW."created_by_user_id" OR
     OLD."created_at" IS DISTINCT FROM NEW."created_at" THEN
    RAISE EXCEPTION 'tour identity is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "tour_appointments_v2_identity_guard"
BEFORE UPDATE ON "tour_appointments_v2"
FOR EACH ROW EXECUTE FUNCTION "exec006_protect_tour_identity"();

CREATE FUNCTION "exec006_extend_commitment"(
  p_tenant_id UUID,
  p_commitment_id UUID,
  p_new_expires_at TIMESTAMPTZ,
  p_actor_user_id UUID,
  p_assignment_id UUID,
  p_expected_version INTEGER,
  p_approval_evidence JSONB,
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
  v_source "unit_availability_sources"%ROWTYPE;
  v_policy "unit_commitment_policies"%ROWTYPE;
  v_minutes INTEGER;
  v_standard INTEGER;
  v_absolute INTEGER;
  v_permission TEXT;
BEGIN
  IF char_length(btrim(COALESCE(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'extension reason is required';
  END IF;
  SELECT * INTO v_existing FROM "unit_commitment_idempotency"
  WHERE "tenant_id" = p_tenant_id AND "operation" = 'EXTEND_COMMITMENT'
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
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_tenant_id::TEXT || ':' || v_before."unit_id"::TEXT, 0)
  );
  v_permission := CASE WHEN v_before."commitment_type" = 'HOLD'
    THEN 'UNIT_HOLD_EXTEND' ELSE 'RESERVATION_EXTEND' END;
  PERFORM "exec006_assert_scope_assignment"(
    p_tenant_id, p_actor_user_id, p_assignment_id, v_before."branch_id",
    p_commitment_id, v_permission, p_now
  );
  IF v_before."version" <> p_expected_version THEN
    RAISE EXCEPTION 'concurrency conflict';
  END IF;
  IF v_before."status" <> 'ACTIVE' OR v_before."expires_at" <= p_now THEN
    RAISE EXCEPTION 'only a non-expired active commitment can extend';
  END IF;
  IF p_new_expires_at <= v_before."expires_at" THEN
    RAISE EXCEPTION 'new expiry must be later than current expiry';
  END IF;

  SELECT * INTO v_source FROM "unit_availability_sources"
  WHERE "tenant_id" = p_tenant_id AND "unit_id" = v_before."unit_id";
  v_policy := "exec006_resolve_policy"(
    p_tenant_id, v_before."branch_id", v_source."project_id", v_source."unit_type"
  );
  v_minutes := floor(extract(epoch FROM (p_new_expires_at - p_now)) / 60);
  IF v_before."commitment_type" = 'HOLD' THEN
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
    RAISE EXCEPTION 'elevated approval required for long extension';
  END IF;

  UPDATE "unit_commitments" SET
    "expires_at" = p_new_expires_at,
    "approval_evidence" = COALESCE(p_approval_evidence, "approval_evidence"),
    "version" = "version" + 1,
    "reason" = p_reason,
    "updated_at" = p_now
  WHERE "id" = p_commitment_id
  RETURNING * INTO v_after;

  INSERT INTO "unit_commitment_history" (
    "tenant_id", "branch_id", "unit_id", "commitment_id", "action",
    "previous_state", "next_state", "reason", "actor_user_id", "assignment_id",
    "correlation_id", "idempotency_key", "policy_version", "expiry_before",
    "expiry_after", "approval_evidence", "occurred_at"
  ) VALUES (
    p_tenant_id, v_after."branch_id", v_after."unit_id", v_after."id",
    'EXTEND_' || v_after."commitment_type", to_jsonb(v_before), to_jsonb(v_after),
    p_reason, p_actor_user_id, p_assignment_id, p_correlation_id,
    p_idempotency_key, v_policy."policy_version", v_before."expires_at",
    v_after."expires_at", p_approval_evidence, p_now
  );
  INSERT INTO "unit_commitment_audit" (
    "tenant_id", "actor_user_id", "assignment_id", "branch_id", "unit_id",
    "commitment_id", "action", "previous_state", "next_state", "reason",
    "correlation_id", "idempotency_key", "policy_version", "expiry_before",
    "expiry_after", "approval_evidence", "occurred_at"
  ) VALUES (
    p_tenant_id, p_actor_user_id, p_assignment_id, v_after."branch_id", v_after."unit_id",
    v_after."id", 'EXTEND_' || v_after."commitment_type", to_jsonb(v_before),
    to_jsonb(v_after), p_reason, p_correlation_id, p_idempotency_key,
    v_policy."policy_version", v_before."expires_at", v_after."expires_at",
    p_approval_evidence, p_now
  );
  INSERT INTO "unit_commitment_idempotency" VALUES (
    p_tenant_id, 'EXTEND_COMMITMENT', p_idempotency_key, p_payload_hash,
    v_after."commitment_type", p_commitment_id, p_now
  );
  RETURN p_commitment_id;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "exec006_reschedule_tour_appointment"(
  p_tenant_id UUID,
  p_tour_id UUID,
  p_start_at_utc TIMESTAMPTZ,
  p_end_at_utc TIMESTAMPTZ,
  p_timezone TEXT,
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
  v_before "tour_appointments_v2"%ROWTYPE;
  v_after "tour_appointments_v2"%ROWTYPE;
BEGIN
  IF p_end_at_utc <= p_start_at_utc OR
     char_length(btrim(COALESCE(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'valid Tour window and reason are required';
  END IF;
  SELECT * INTO v_existing FROM "unit_commitment_idempotency"
  WHERE "tenant_id" = p_tenant_id AND "operation" = 'RESCHEDULE_TOUR'
    AND "idempotency_key" = p_idempotency_key;
  IF FOUND THEN
    IF v_existing."payload_hash" <> p_payload_hash THEN
      RAISE EXCEPTION 'idempotency payload mismatch';
    END IF;
    RETURN v_existing."result_entity_id";
  END IF;

  SELECT * INTO v_before FROM "tour_appointments_v2"
  WHERE "tenant_id" = p_tenant_id AND "id" = p_tour_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tour not found'; END IF;
  PERFORM "exec006_assert_scope_assignment"(
    p_tenant_id, p_actor_user_id, p_assignment_id, v_before."branch_id",
    p_tour_id, 'TOUR_RESCHEDULE', p_now
  );
  IF v_before."version" <> p_expected_version THEN
    RAISE EXCEPTION 'concurrency conflict';
  END IF;
  IF v_before."status" NOT IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULED') THEN
    RAISE EXCEPTION 'Tour cannot be rescheduled from current state';
  END IF;
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_tenant_id::TEXT || ':staff:' || v_before."staff_user_id"::TEXT, 0)
  );
  IF v_before."unit_id" IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended(p_tenant_id::TEXT || ':unit-tour:' || v_before."unit_id"::TEXT, 0)
    );
  END IF;

  UPDATE "tour_appointments_v2" SET
    "status" = 'RESCHEDULED',
    "start_at_utc" = p_start_at_utc,
    "end_at_utc" = p_end_at_utc,
    "timezone" = COALESCE(NULLIF(btrim(p_timezone), ''), "timezone"),
    "version" = "version" + 1,
    "updated_by_user_id" = p_actor_user_id,
    "reason" = p_reason,
    "updated_at" = p_now
  WHERE "id" = p_tour_id
  RETURNING * INTO v_after;

  INSERT INTO "tour_appointment_history" (
    "tenant_id", "branch_id", "tour_id", "action", "previous_state",
    "next_state", "actor_user_id", "assignment_id", "reason",
    "correlation_id", "idempotency_key", "occurred_at"
  ) VALUES (
    p_tenant_id, v_after."branch_id", v_after."id", 'RESCHEDULE_TOUR_APPOINTMENT',
    to_jsonb(v_before), to_jsonb(v_after), p_actor_user_id, p_assignment_id,
    p_reason, p_correlation_id, p_idempotency_key, p_now
  );
  INSERT INTO "unit_commitment_audit" (
    "tenant_id", "actor_user_id", "assignment_id", "branch_id", "unit_id",
    "tour_id", "action", "previous_state", "next_state", "reason",
    "correlation_id", "idempotency_key", "policy_version", "occurred_at"
  ) VALUES (
    p_tenant_id, p_actor_user_id, p_assignment_id, v_after."branch_id", v_after."unit_id",
    v_after."id", 'RESCHEDULE_TOUR_APPOINTMENT', to_jsonb(v_before),
    to_jsonb(v_after), p_reason, p_correlation_id, p_idempotency_key,
    'EXEC-006-v1', p_now
  );
  INSERT INTO "unit_commitment_idempotency" VALUES (
    p_tenant_id, 'RESCHEDULE_TOUR', p_idempotency_key, p_payload_hash,
    'TOUR_APPOINTMENT', p_tour_id, p_now
  );
  RETURN p_tour_id;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "exec006_transition_tour_appointment"(
  p_tenant_id UUID,
  p_tour_id UUID,
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
  v_before "tour_appointments_v2"%ROWTYPE;
  v_after "tour_appointments_v2"%ROWTYPE;
  v_permission TEXT;
BEGIN
  IF p_target_status NOT IN ('CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'REJECTED') THEN
    RAISE EXCEPTION 'unsupported Tour target state';
  END IF;
  IF p_target_status IN ('NO_SHOW', 'CANCELLED', 'REJECTED') AND
     char_length(btrim(COALESCE(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'Tour transition reason is required';
  END IF;
  SELECT * INTO v_existing FROM "unit_commitment_idempotency"
  WHERE "tenant_id" = p_tenant_id AND "operation" = 'TRANSITION_TOUR'
    AND "idempotency_key" = p_idempotency_key;
  IF FOUND THEN
    IF v_existing."payload_hash" <> p_payload_hash THEN
      RAISE EXCEPTION 'idempotency payload mismatch';
    END IF;
    RETURN v_existing."result_entity_id";
  END IF;

  SELECT * INTO v_before FROM "tour_appointments_v2"
  WHERE "tenant_id" = p_tenant_id AND "id" = p_tour_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tour not found'; END IF;
  v_permission := CASE
    WHEN p_target_status = 'CONFIRMED' THEN 'TOUR_CONFIRM'
    WHEN p_target_status IN ('COMPLETED', 'NO_SHOW') THEN 'TOUR_COMPLETE'
    ELSE 'TOUR_CANCEL'
  END;
  PERFORM "exec006_assert_scope_assignment"(
    p_tenant_id, p_actor_user_id, p_assignment_id, v_before."branch_id",
    p_tour_id, v_permission, p_now
  );
  IF v_before."version" <> p_expected_version THEN
    RAISE EXCEPTION 'concurrency conflict';
  END IF;
  IF v_before."status" NOT IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULED') THEN
    RAISE EXCEPTION 'Tour cannot transition from current state';
  END IF;

  UPDATE "tour_appointments_v2" SET
    "status" = p_target_status,
    "version" = "version" + 1,
    "updated_by_user_id" = p_actor_user_id,
    "reason" = COALESCE(p_reason, "reason"),
    "updated_at" = p_now
  WHERE "id" = p_tour_id
  RETURNING * INTO v_after;

  INSERT INTO "tour_appointment_history" (
    "tenant_id", "branch_id", "tour_id", "action", "previous_state",
    "next_state", "actor_user_id", "assignment_id", "reason",
    "correlation_id", "idempotency_key", "occurred_at"
  ) VALUES (
    p_tenant_id, v_after."branch_id", v_after."id", 'TOUR_' || p_target_status,
    to_jsonb(v_before), to_jsonb(v_after), p_actor_user_id, p_assignment_id,
    p_reason, p_correlation_id, p_idempotency_key, p_now
  );
  INSERT INTO "unit_commitment_audit" (
    "tenant_id", "actor_user_id", "assignment_id", "branch_id", "unit_id",
    "tour_id", "action", "previous_state", "next_state", "reason",
    "correlation_id", "idempotency_key", "policy_version", "occurred_at"
  ) VALUES (
    p_tenant_id, p_actor_user_id, p_assignment_id, v_after."branch_id", v_after."unit_id",
    v_after."id", 'TOUR_' || p_target_status, to_jsonb(v_before), to_jsonb(v_after),
    p_reason, p_correlation_id, p_idempotency_key, 'EXEC-006-v1', p_now
  );
  INSERT INTO "unit_commitment_idempotency" VALUES (
    p_tenant_id, 'TRANSITION_TOUR', p_idempotency_key, p_payload_hash,
    'TOUR_APPOINTMENT', p_tour_id, p_now
  );
  RETURN p_tour_id;
END;
$$ LANGUAGE plpgsql;