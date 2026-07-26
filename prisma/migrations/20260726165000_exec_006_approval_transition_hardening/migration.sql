-- EXEC-006 approval transition hardening.
-- Corrects approval-policy trigger scope after the real expiry race proved that
-- a status-only EXPIRED transition was incorrectly revalidated as a zero-minute
-- duration. No Production execution, customer-data mutation or Backfill.

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
  v_validate_duration BOOLEAN := FALSE;
  v_validate_active_reservation BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_validate_duration := TRUE;
  ELSIF NEW."expires_at" IS DISTINCT FROM OLD."expires_at" THEN
    v_validate_duration := TRUE;
  END IF;

  IF v_validate_duration THEN
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

  IF NEW."commitment_type" = 'RESERVATION' AND
     NEW."status" = 'ACTIVE' AND
     NEW."converted_from_commitment_id" IS NULL THEN
    IF TG_OP = 'INSERT' THEN
      v_validate_active_reservation := TRUE;
    ELSIF NEW."status" IS DISTINCT FROM OLD."status" OR
          NEW."approved_by_user_id" IS DISTINCT FROM OLD."approved_by_user_id" OR
          NEW."approval_evidence" IS DISTINCT FROM OLD."approval_evidence" THEN
      v_validate_active_reservation := TRUE;
    END IF;
  END IF;

  IF v_validate_active_reservation THEN
    PERFORM "exec006_assert_independent_approval"(
      NEW."tenant_id",
      NEW."branch_id",
      NEW."unit_id",
      NEW."initiated_by_user_id",
      NEW."approved_by_user_id",
      NEW."approval_evidence",
      'RESERVATION_APPROVE',
      COALESCE(NEW."updated_at", NEW."starts_at")
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION "exec006_validate_commitment_approval_policy" IS
  'Validates bounded duration only on INSERT/expiry changes and independent approval only on active Reservation approval transitions; terminal status updates remain valid.';
