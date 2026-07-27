\set ON_ERROR_STOP on

DO $$
DECLARE
  v_tenant uuid := gen_random_uuid();
  v_assignment uuid := gen_random_uuid();
  v_hold uuid := gen_random_uuid();
  v_event uuid := gen_random_uuid();
  v_offer uuid := gen_random_uuid();
  v_version uuid := gen_random_uuid();
  v_policy uuid := gen_random_uuid();
  v_snapshot uuid := gen_random_uuid();
  v_component uuid := gen_random_uuid();
  v_denied boolean;
  v_mode "Exec007CutoverMode";
BEGIN
  -- T-CUT-01: a real EXEC-007 write is denied while LEGACY_ONLY is authoritative.
  v_denied := false;
  BEGIN
    INSERT INTO exec007_retention_assignments (
      id, tenant_id, record_type, record_id, policy_version,
      retention_started_at, scheduled_disposition_at, disposition_status,
      legal_hold_status, version
    ) VALUES (
      v_assignment, v_tenant, 'ACCEPTANCE_EVIDENCE', gen_random_uuid(), 'EXEC007-RET-1',
      transaction_timestamp() - interval '1 year', transaction_timestamp() - interval '1 day',
      'SCHEDULED', 'RELEASED', 1
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE='42501' AND position('EXEC-007 writes denied in mode LEGACY_ONLY' in SQLERRM) > 0 THEN
      v_denied := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'T-CUT-01 EXEC-007 INSERT succeeded in LEGACY_ONLY'; END IF;

  UPDATE exec007_cutover_control
     SET mode='EXEC007_READY', version=version+1, authorized_release_sha=repeat('a',40)
   WHERE singleton_key=1 AND version=1;

  -- EXEC007_READY is a no-write bridge: both writer classes fail closed.
  v_denied := false;
  BEGIN
    INSERT INTO exec007_retention_assignments (
      id, tenant_id, record_type, record_id, policy_version,
      retention_started_at, scheduled_disposition_at, disposition_status,
      legal_hold_status, version
    ) VALUES (
      v_assignment, v_tenant, 'ACCEPTANCE_EVIDENCE', gen_random_uuid(), 'EXEC007-RET-1',
      transaction_timestamp() - interval '1 year', transaction_timestamp() - interval '1 day',
      'SCHEDULED', 'RELEASED', 1
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE='42501' AND position('EXEC-007 writes denied in mode EXEC007_READY' in SQLERRM) > 0 THEN
      v_denied := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'T-CUT-01 EXEC-007 INSERT succeeded in EXEC007_READY'; END IF;

  v_denied := false;
  BEGIN
    INSERT INTO offers (id, tenant_id, linked_opportunity_id, price, valid_until, status)
    VALUES (gen_random_uuid(), v_tenant, gen_random_uuid(), 1, transaction_timestamp()+interval '1 day', 'PENDING');
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE='42501' AND position('Legacy commercial writes denied in mode EXEC007_READY' in SQLERRM) > 0 THEN
      v_denied := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'T-CUT-02 Legacy INSERT succeeded in EXEC007_READY'; END IF;

  -- A stale cutover version cannot transition authority.
  v_denied := false;
  BEGIN
    UPDATE exec007_cutover_control
       SET mode='EXEC007_ACTIVE', version=version+2, authorized_release_sha=repeat('b',40)
     WHERE singleton_key=1;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE='40001' AND position('expected version mismatch' in SQLERRM) > 0 THEN
      v_denied := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'T-CHG-02 stale cutover version was accepted'; END IF;

  UPDATE exec007_cutover_control
     SET mode='EXEC007_ACTIVE', version=version+1, authorized_release_sha=repeat('b',40)
   WHERE singleton_key=1 AND version=2;

  -- T-CUT-02: an actual Legacy table write is denied after EXEC-007 activation.
  v_denied := false;
  BEGIN
    INSERT INTO offers (id, tenant_id, linked_opportunity_id, price, valid_until, status)
    VALUES (gen_random_uuid(), v_tenant, gen_random_uuid(), 1, transaction_timestamp()+interval '1 day', 'PENDING');
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE='42501' AND position('Legacy commercial writes denied in mode EXEC007_ACTIVE' in SQLERRM) > 0 THEN
      v_denied := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'T-CUT-02 Legacy INSERT succeeded in EXEC007_ACTIVE'; END IF;

  INSERT INTO exec007_retention_assignments (
    id, tenant_id, record_type, record_id, policy_version,
    retention_started_at, scheduled_disposition_at, disposition_status,
    legal_hold_status, version
  ) VALUES (
    v_assignment, v_tenant, 'ACCEPTANCE_EVIDENCE', gen_random_uuid(), 'EXEC007-RET-1',
    transaction_timestamp() - interval '1 year', transaction_timestamp() - interval '1 day',
    'SCHEDULED', 'RELEASED', 1
  );

  IF (SELECT first_exec007_write_at FROM exec007_cutover_control WHERE singleton_key=1) IS NULL THEN
    RAISE EXCEPTION 'T-CUT-02 first EXEC-007 write latch was not persisted';
  END IF;

  -- T-RET-02: the authoritative Legal Hold record synchronizes and blocks disposal.
  INSERT INTO exec007_legal_hold_records (
    id, tenant_id, retention_assignment_id, status, reason, placed_by_user_id
  ) VALUES (
    v_hold, v_tenant, v_assignment, 'ACTIVE', 'governed test hold', gen_random_uuid()
  );

  IF (SELECT legal_hold_status FROM exec007_retention_assignments WHERE id=v_assignment) <> 'ACTIVE' THEN
    RAISE EXCEPTION 'T-RET-02 active Legal Hold did not synchronize to retention assignment';
  END IF;

  v_denied := false;
  BEGIN
    UPDATE exec007_retention_assignments SET legal_hold_status='RELEASED' WHERE id=v_assignment;
  EXCEPTION WHEN OTHERS THEN
    IF position('inconsistent with authoritative hold records' in SQLERRM) > 0 THEN v_denied := true; ELSE RAISE; END IF;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'T-RET-02 copied legal-hold state could diverge from authoritative record'; END IF;

  v_denied := false;
  BEGIN
    UPDATE exec007_retention_assignments SET disposition_status='DISPOSED' WHERE id=v_assignment;
  EXCEPTION WHEN OTHERS THEN
    IF position('active legal hold blocks disposition' in SQLERRM) > 0 THEN v_denied := true; ELSE RAISE; END IF;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'T-RET-02 active Legal Hold did not block disposition'; END IF;

  UPDATE exec007_legal_hold_records
     SET status='RELEASED', released_by_user_id=gen_random_uuid(),
         released_at=transaction_timestamp(), release_reason='test release'
   WHERE id=v_hold;

  IF (SELECT legal_hold_status FROM exec007_retention_assignments WHERE id=v_assignment) <> 'RELEASED' THEN
    RAISE EXCEPTION 'T-RET-02 released Legal Hold did not synchronize';
  END IF;

  v_denied := false;
  BEGIN
    UPDATE exec007_retention_assignments SET disposition_status='DISPOSED' WHERE id=v_assignment;
  EXCEPTION WHEN OTHERS THEN
    IF position('downstream relationship end is unresolved' in SQLERRM) > 0 THEN v_denied := true; ELSE RAISE; END IF;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'T-RET-03 unresolved downstream link did not block disposition'; END IF;

  UPDATE exec007_retention_assignments
     SET downstream_relationship_ended_at=transaction_timestamp(), disposition_status='DISPOSED'
   WHERE id=v_assignment;

  -- Seed a frozen commercial graph without exercising unrelated prerequisite FKs.
  PERFORM set_config('session_replication_role','replica',true);
  INSERT INTO exec007_commercial_offers (
    id,tenant_id,opportunity_id,unit_id,branch_id,subject_party_id,offer_kind,service_line,
    state,created_by_user_id,version
  ) VALUES (
    v_offer,v_tenant,gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),
    'SALE','SALES','OPEN',gen_random_uuid(),1
  );
  INSERT INTO exec007_offer_versions (
    id,tenant_id,offer_id,version_number,state,is_current,offer_kind,subject_party_id,
    branch_id,unit_id,opportunity_id,confirmation_text_version,content_hash,pricing_hash,
    terms_hash,validity_policy_version,valid_until_local_date,valid_until_utc,issued_at_utc,
    created_by_user_id,last_commercial_editor_id,row_version
  ) VALUES (
    v_version,v_tenant,v_offer,1,'ISSUED',true,'SALE',gen_random_uuid(),gen_random_uuid(),
    gen_random_uuid(),gen_random_uuid(),'CONFIRM-1',repeat('1',64),repeat('2',64),repeat('3',64),
    'VALIDITY-1',current_date+1,transaction_timestamp()+interval '1 day',transaction_timestamp(),
    gen_random_uuid(),gen_random_uuid(),1
  );
  INSERT INTO exec007_pricing_policy_versions (
    id,tenant_id,source_type,scope_type,scope_id,version_number,standard_validity_days,
    effective_from,created_by_user_id
  ) VALUES (
    v_policy,v_tenant,'SALE_UNIT_PRICE_BOOK','UNIT',gen_random_uuid(),1,7,
    transaction_timestamp()-interval '1 day',gen_random_uuid()
  );
  INSERT INTO exec007_offer_pricing_snapshots (
    id,tenant_id,offer_version_id,offer_kind,policy_version_id,source_type,source_record_id,
    source_version,tax_basis,base_amount,customer_total,pricing_hash
  ) VALUES (
    v_snapshot,v_tenant,v_version,'SALE',v_policy,'SALE_UNIT_PRICE_BOOK',gen_random_uuid(),
    '1','EXCLUSIVE',100,100,repeat('2',64)
  );
  INSERT INTO exec007_offer_pricing_components (
    id,tenant_id,pricing_snapshot_id,component_code,label,amount,payer_type,
    is_customer_obligation,ordinal
  ) VALUES (
    v_component,v_tenant,v_snapshot,'BASE_SALE_PRICE','Base',100,'CUSTOMER',true,0
  );
  PERFORM set_config('session_replication_role','origin',true);

  v_denied := false;
  BEGIN
    UPDATE exec007_offer_versions
       SET confirmation_text_version='CONFIRM-2', row_version=row_version+1
     WHERE id=v_version;
  EXCEPTION WHEN OTHERS THEN
    IF position('governed version fields are frozen' in SQLERRM) > 0 THEN v_denied := true; ELSE RAISE; END IF;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'T-FREEZE-02 frozen OfferVersion field was mutable'; END IF;

  v_denied := false;
  BEGIN DELETE FROM exec007_offer_versions WHERE id=v_version;
  EXCEPTION WHEN OTHERS THEN
    IF position('frozen version cannot be deleted' in SQLERRM) > 0 THEN v_denied := true; ELSE RAISE; END IF;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'T-FREEZE-02 frozen OfferVersion was deleted'; END IF;

  v_denied := false;
  BEGIN UPDATE exec007_offer_pricing_components SET amount=101 WHERE id=v_component;
  EXCEPTION WHEN OTHERS THEN
    IF position('frozen pricing snapshot and components are immutable' in SQLERRM) > 0 THEN v_denied := true; ELSE RAISE; END IF;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'T-PRICE-03 frozen Pricing Component was updated'; END IF;

  v_denied := false;
  BEGIN DELETE FROM exec007_offer_pricing_components WHERE id=v_component;
  EXCEPTION WHEN OTHERS THEN
    IF position('frozen pricing snapshot and components are immutable' in SQLERRM) > 0 THEN v_denied := true; ELSE RAISE; END IF;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'T-PRICE-03 frozen Pricing Component was deleted'; END IF;

  v_denied := false;
  BEGIN
    INSERT INTO exec007_offer_pricing_components (
      tenant_id,pricing_snapshot_id,component_code,label,amount,payer_type,is_customer_obligation,ordinal
    ) VALUES (v_tenant,v_snapshot,'LATE_FEE','Late',1,'CUSTOMER',true,1);
  EXCEPTION WHEN OTHERS THEN
    IF position('frozen pricing snapshot and components are immutable' in SQLERRM) > 0 THEN v_denied := true; ELSE RAISE; END IF;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'T-PRICE-03 component was added after pricing freeze'; END IF;

  v_denied := false;
  BEGIN UPDATE exec007_offer_pricing_snapshots SET customer_total=101 WHERE id=v_snapshot;
  EXCEPTION WHEN OTHERS THEN
    IF position('frozen pricing snapshot and components are immutable' in SQLERRM) > 0 THEN v_denied := true; ELSE RAISE; END IF;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'T-PRICE-03 frozen Pricing Snapshot was updated'; END IF;

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

  SELECT mode INTO v_mode FROM exec007_cutover_control WHERE singleton_key=1;
  IF v_mode <> 'EXEC007_ACTIVE' THEN RAISE EXCEPTION 'T-CUT-02 cutover mode changed unexpectedly'; END IF;
END;
$$;
