-- EXEC-006 lifecycle/approval and direct tenant-reference hardening.
-- Replaces only the approval-policy trigger function after disposable
-- PostgreSQL demonstrated that a status-only EXPIRED transition was being
-- misclassified as a zero-duration request.
-- Adds an explicitly ordered Unit/Branch/source guard before all other
-- commitment triggers so direct SQL cannot cross Tenant boundaries.
-- No Production execution, customer-data mutation or Backfill is authorized.

CREATE FUNCTION "exec006_assert_direct_commitment_scope"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "units" AS persisted_unit
    WHERE persisted_unit."tenant_id" = NEW."tenant_id"
      AND persisted_unit."id" = NEW."unit_id"
  ) THEN
    RAISE EXCEPTION 'cross-tenant Unit reference mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "organization_branches" AS persisted_branch
    WHERE persisted_branch."tenant_id" = NEW."tenant_id"
      AND persisted_branch."id" = NEW."branch_id"
  ) THEN
    RAISE EXCEPTION 'cross-tenant Branch reference mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "unit_availability_sources" AS availability_source
    WHERE availability_source."tenant_id" = NEW."tenant_id"
      AND availability_source."unit_id" = NEW."unit_id"
      AND availability_source."branch_id" = NEW."branch_id"
  ) THEN
    RAISE EXCEPTION 'missing or mismatched same-tenant availability source';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "00_unit_commitments_direct_scope_guard"
BEFORE INSERT OR UPDATE ON "unit_commitments"
FOR EACH ROW EXECUTE FUNCTION "exec006_assert_direct_commitment_scope"();

CREATE OR REPLACE FUNCTION "exec006_validate_commitment_approval_policy"()
RETURNS TRIGGER AS $$
DECLARE
  v_source "unit_availability_sources"%ROWTYPE;
  v_policy "unit_commitment_policies"%ROWTYPE;
  v_reference_time TIMESTAMPTZ;
  v_minutes INTEGER;
  v_standard INTEGER;
  v_absolute INTEGER;
  v_permission TEXT;
  v_duration_changed BOOLEAN := FALSE;
  v_direct_reservation_activation BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_duration_changed := TRUE;
    v_direct_reservation_activation :=
      NEW."commitment_type" = 'RESERVATION' AND
      NEW."status" = 'ACTIVE' AND
      NEW."converted_from_commitment_id" IS NULL;
  ELSE
    v_duration_changed :=
      NEW."expires_at" IS DISTINCT FROM OLD."expires_at";
    v_direct_reservation_activation :=
      NEW."commitment_type" = 'RESERVATION' AND
      NEW."status" = 'ACTIVE' AND
      NEW."converted_from_commitment_id" IS NULL AND (
        OLD."status" IS DISTINCT FROM NEW."status" OR
        OLD."approved_by_user_id" IS DISTINCT FROM NEW."approved_by_user_id" OR
        OLD."approval_evidence" IS DISTINCT FROM NEW."approval_evidence"
      );
  END IF;

  IF v_duration_changed THEN
    SELECT availability_source.* INTO v_source
    FROM "unit_availability_sources" AS availability_source
    WHERE availability_source."tenant_id" = NEW."tenant_id"
      AND availability_source."unit_id" = NEW."unit_id";
    IF NOT FOUND THEN
      RAISE EXCEPTION 'missing availability source for commitment policy';
    END IF;

    v_policy := "exec006_resolve_policy"(
      NEW."tenant_id",
      NEW."branch_id",
      v_source."project_id",
      v_source."unit_type"
    );

    v_reference_time := CASE
      WHEN TG_OP = 'INSERT' THEN NEW."starts_at"
      ELSE NEW."updated_at"
    END;
    v_minutes := floor(
      extract(epoch FROM (NEW."expires_at" - v_reference_time)) / 60
    );

    IF NEW."commitment_type" = 'HOLD' THEN
      v_standard := v_policy."standard_max_hold_minutes";
      v_absolute := v_policy."absolute_max_hold_minutes";
      v_permission := 'UNIT_HOLD_OVERRIDE';
    ELSE
      v_standard := v_policy."standard_max_reservation_minutes";
      v_absolute := v_policy."absolute_max_reservation_minutes";
      v_permission := 'RESERVATION_APPROVE';
    END IF;

    IF v_minutes <= 0 OR v_minutes > v_absolute THEN
      RAISE EXCEPTION 'commitment duration exceeds bounded policy';
    END IF;

    IF v_minutes > v_standard THEN
      IF TG_OP = 'UPDATE' AND
         NEW."expires_at" > OLD."expires_at" AND
         NEW."approval_evidence" IS NOT DISTINCT FROM OLD."approval_evidence" THEN
        RAISE EXCEPTION 'new independent approval evidence is required for long extension';
      END IF;

      PERFORM "exec006_assert_independent_approval"(
        NEW."tenant_id",
        NEW."branch_id",
        NEW."unit_id",
        NEW."initiated_by_user_id",
        NEW."approved_by_user_id",
        NEW."approval_evidence",
        v_permission,
        v_reference_time
      );
    END IF;
  END IF;

  IF v_direct_reservation_activation THEN
    v_reference_time := CASE
      WHEN TG_OP = 'INSERT' THEN NEW."starts_at"
      ELSE NEW."updated_at"
    END;
    PERFORM "exec006_assert_independent_approval"(
      NEW."tenant_id",
      NEW."branch_id",
      NEW."unit_id",
      NEW."initiated_by_user_id",
      NEW."approved_by_user_id",
      NEW."approval_evidence",
      'RESERVATION_APPROVE',
      v_reference_time
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION "exec006_assert_direct_commitment_scope" IS
  'Runs first for every direct commitment mutation and rejects Unit, Branch or availability-source references outside the same Tenant.';
COMMENT ON FUNCTION "exec006_validate_commitment_approval_policy" IS
  'Validates bounded duration only on creation/expiry changes and validates independent approval on direct Reservation activation; lifecycle-only state transitions remain valid.';