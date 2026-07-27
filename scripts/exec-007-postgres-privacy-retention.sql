\set ON_ERROR_STOP on

DO $$
DECLARE
  v_tenant uuid := gen_random_uuid();
  v_assignment uuid := gen_random_uuid();
  v_event uuid := gen_random_uuid();
  v_denied boolean := false;
BEGIN
  INSERT INTO exec007_retention_assignments (
    id, tenant_id, record_type, record_id, policy_version,
    retention_started_at, scheduled_disposition_at, disposition_status,
    legal_hold_status, version
  ) VALUES (
    v_assignment, v_tenant, 'ACCEPTANCE_EVIDENCE', gen_random_uuid(), 'EXEC007-RET-1',
    transaction_timestamp() - interval '1 year', transaction_timestamp() - interval '1 day',
    'SCHEDULED', 'ACTIVE', 1
  );

  BEGIN
    UPDATE exec007_retention_assignments
      SET disposition_status='DISPOSED'
      WHERE tenant_id=v_tenant AND id=v_assignment;
  EXCEPTION WHEN OTHERS THEN
    IF position('active legal hold blocks disposition' in SQLERRM) > 0 THEN
      v_denied := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'T-RET-02 legal hold did not block disposition'; END IF;

  UPDATE exec007_retention_assignments
    SET legal_hold_status='RELEASED'
    WHERE tenant_id=v_tenant AND id=v_assignment;
  v_denied := false;
  BEGIN
    UPDATE exec007_retention_assignments
      SET disposition_status='DISPOSED'
      WHERE tenant_id=v_tenant AND id=v_assignment;
  EXCEPTION WHEN OTHERS THEN
    IF position('downstream relationship end is unresolved' in SQLERRM) > 0 THEN
      v_denied := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'T-RET-03 unresolved downstream link did not block disposition'; END IF;

  INSERT INTO exec007_customer_security_events (
    id, tenant_id, event_type, raw_ip, purpose_code, recorded_at,
    scheduled_deletion_at, legal_hold_status, metadata
  ) VALUES (
    v_event, v_tenant, 'CUSTOMER_AUTH_FAILURE', '192.0.2.10', 'AUTH_ABUSE_INVESTIGATION',
    transaction_timestamp(), transaction_timestamp() + interval '90 days', 'RELEASED', '{}'::jsonb
  );

  IF (SELECT scheduled_deletion_at - recorded_at FROM exec007_customer_security_events WHERE id=v_event) <> interval '90 days' THEN
    RAISE EXCEPTION 'T-PRIV-03 invalid deletion interval';
  END IF;
END;
$$;
