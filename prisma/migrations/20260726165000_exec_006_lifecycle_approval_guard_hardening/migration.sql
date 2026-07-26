-- EXEC-006 lifecycle/approval trigger hardening.
-- Replaces only the approval-policy trigger function after disposable
-- PostgreSQL demonstrated that a status-only EXPIRED transition was being
-- misclassified as a zero-duration request.
-- No Production execution, customer-data mutation or Backfill is authorized.

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

COMMENT ON FUNCTION "exec006_validate_commitment_approval_policy" IS
  'Validates bounded duration only on creation/expiry changes and validates independent approval on direct Reservation activation; lifecycle-only state transitions remain valid.';