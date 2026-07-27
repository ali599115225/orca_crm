import { createHash, randomUUID } from "node:crypto";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const admin = new Client({ connectionString });
const left = new Client({ connectionString });
const right = new Client({ connectionString });
await Promise.all([admin.connect(), left.connect(), right.connect()]);

const now = new Date("2026-07-27T12:00:00.000Z");
const iso = (minutes) => new Date(now.getTime() + minutes * 60_000).toISOString();
const hash = (character) => character.repeat(64);
const sha256 = (value) => createHash("sha256").update(String(value)).digest("hex");
const ids = {
  tenantA: "00000000-0000-0000-0000-000000007101",
  tenantB: "00000000-0000-0000-0000-000000007102",
  actor: "00000000-0000-0000-0000-000000007201",
  grantor: "00000000-0000-0000-0000-000000007202",
  branchA: "00000000-0000-0000-0000-000000007301",
  branchB: "00000000-0000-0000-0000-000000007302",
  assignment: "00000000-0000-0000-0000-000000007401",
  projectA: "00000000-0000-0000-0000-000000007501",
  projectB: "00000000-0000-0000-0000-000000007502",
  party: "00000000-0000-0000-0000-000000007601",
  account: "00000000-0000-0000-0000-000000007701",
  principal: "00000000-0000-0000-0000-000000007801",
  identity: "00000000-0000-0000-0000-000000007802",
  grant: "00000000-0000-0000-0000-000000007803",
  session: "00000000-0000-0000-0000-000000007804",
};

async function activateCutoverWithConcurrencyRegression() {
  await left.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  await right.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  const locked = await left.query(
    'SELECT mode,version FROM exec007_cutover_control WHERE singleton_key=1 FOR UPDATE',
  );
  if (locked.rows[0]?.mode !== "LEGACY_ONLY") throw new Error("Batch 1 cutover initial state is not LEGACY_ONLY");
  const version = Number(locked.rows[0].version);
  const blocked = right.query(
    `UPDATE exec007_cutover_control SET mode='EXEC007_READY',version=version+1,authorized_release_sha=$1
      WHERE singleton_key=1 AND version=$2`,
    ["a".repeat(40), version],
  );
  await left.query(
    `UPDATE exec007_cutover_control SET mode='EXEC007_READY',version=version+1,authorized_release_sha=$1
      WHERE singleton_key=1 AND version=$2`,
    ["b".repeat(40), version],
  );
  await left.query("COMMIT");
  let staleFailed = false;
  try {
    const result = await blocked;
    await right.query("COMMIT");
    staleFailed = result.rowCount === 0;
  } catch (error) {
    await right.query("ROLLBACK");
    staleFailed = ["40001", "40P01"].includes(error?.code);
  }
  if (!staleFailed) throw new Error("Batch 1 concurrent stale cutover did not fail closed");
  await admin.query(
    `UPDATE exec007_cutover_control SET mode='EXEC007_ACTIVE',version=version+1,authorized_release_sha=$1
      WHERE singleton_key=1 AND mode='EXEC007_READY'`,
    ["c".repeat(40)],
  );
  return true;
}

async function seedFoundation() {
  const units = Array.from({ length: 12 }, (_, index) => ({
    id: `00000000-0000-0000-0000-${String(7901 + index).padStart(12, "0")}`,
    opportunity: `00000000-0000-0000-0000-${String(8001 + index).padStart(12, "0")}`,
    number: `B2-${index + 1}`,
  }));

  await admin.query("BEGIN");
  try {
    await admin.query(
      `INSERT INTO tenants(id,company_name,subdomain) VALUES ($1,'EXEC007 B2 A','exec007-b2-a'),($2,'EXEC007 B2 B','exec007-b2-b')`,
      [ids.tenantA, ids.tenantB],
    );
    await admin.query(
      `INSERT INTO users(id,tenant_id,name,email,password_hash,role) VALUES
       ($1,$3,'Acceptance Actor','exec007-b2-actor@example.test','x','ADMIN'),
       ($2,$3,'Grantor','exec007-b2-grantor@example.test','x','ADMIN')`,
      [ids.actor, ids.grantor, ids.tenantA],
    );
    await admin.query(
      `INSERT INTO projects(id,tenant_id,name,city,status) VALUES
       ($1,$3,'Batch2 Project','Riyadh','PLANNING'),($2,$4,'Other Tenant Project','Riyadh','PLANNING')`,
      [ids.projectA, ids.projectB, ids.tenantA, ids.tenantB],
    );
    await admin.query(
      `INSERT INTO organization_branches(id,tenant_id,code,name,is_central) VALUES
       ($1,$3,'B2A','Batch2 Branch',TRUE),($2,$4,'B2B','Other Branch',TRUE)`,
      [ids.branchA, ids.branchB, ids.tenantA, ids.tenantB],
    );
    await admin.query(
      `INSERT INTO user_scope_assignments(id,tenant_id,user_id,security_role,scope_type,branch_id,is_active,assigned_by_user_id)
       VALUES ($1,$2,$3,'SALES_LEASING_MANAGER','BRANCH',$4,TRUE,$5)`,
      [ids.assignment, ids.tenantA, ids.actor, ids.branchA, ids.grantor],
    );
    await admin.query(
      `INSERT INTO customer_parties(id,tenant_id,party_type,branch_id,created_by_user_id)
       VALUES ($1,$2,'PERSON',$3,$4)`,
      [ids.party, ids.tenantA, ids.branchA, ids.actor],
    );
    await admin.query(
      `INSERT INTO customer_accounts_v2(id,tenant_id,party_id,relationship_roles,lifecycle_state,branch_id,owner_user_id)
       VALUES ($1,$2,$3,ARRAY['BUYER'],'ACTIVE',$4,$5)`,
      [ids.account, ids.tenantA, ids.party, ids.branchA, ids.actor],
    );
    await admin.query(
      `INSERT INTO exec007_customer_principals(id,tenant_id,status,auth_version) VALUES ($1,$2,'ACTIVE',1)`,
      [ids.principal, ids.tenantA],
    );
    await admin.query(
      `INSERT INTO exec007_customer_principal_identities(id,tenant_id,principal_id,identity_type,status,normalized_identifier_hash,verified_at)
       VALUES ($1,$2,$3,'VERIFIED_EMAIL','ACTIVE',$4,$5::timestamptz)`,
      [ids.identity, ids.tenantA, ids.principal, hash("a"), iso(-60)],
    );
    await admin.query(
      `INSERT INTO exec007_customer_principal_subject_grants(
         id,tenant_id,principal_id,actor_party_id,subject_party_id,customer_account_id,status,grant_version,branch_id,service_line,resource_scope,effective_at,expires_at
       ) VALUES ($1,$2,$3,$4,$4,$5,'ACTIVE',1,$6,'SALES','{}'::jsonb,$7::timestamptz,$8::timestamptz)`,
      [ids.grant, ids.tenantA, ids.principal, ids.party, ids.account, ids.branchA, iso(-60), iso(1440)],
    );
    await admin.query(
      `INSERT INTO exec007_customer_sessions(
         id,tenant_id,principal_id,subject_grant_id,status,assurance_level,session_token_hash,auth_version,grant_version,last_seen_at,decision_step_up_at,idle_expires_at,absolute_expires_at
       ) VALUES ($1,$2,$3,$4,'ACTIVE','CUSTOMER_DECISION_STEP_UP',$5,1,1,$6::timestamptz,$6::timestamptz,$7::timestamptz,$8::timestamptz)`,
      [ids.session, ids.tenantA, ids.principal, ids.grant, hash("b"), iso(-60), iso(120), iso(1440)],
    );

    for (const [index, unit] of units.entries()) {
      await admin.query(
        `INSERT INTO units(id,tenant_id,project_id,unit_number,floor_position,price_sar,type,area,status)
         VALUES ($1,$2,$3,$4,$5,100000,'Apartment','100 m2','Available')`,
        [unit.id, ids.tenantA, ids.projectA, unit.number, index + 1],
      );
      await admin.query(
        `INSERT INTO customer_opportunities_v2(
           id,tenant_id,party_id,customer_account_id,branch_id,owner_user_id,service_line,project_id,unit_id,expected_value,stage,probability,creation_source
         ) VALUES ($1,$2,$3,$4,$5,$6,'SALES',$7,$8,100000,'PROPOSAL',50,'EXEC007_BATCH2_TEST')`,
        [unit.opportunity, ids.tenantA, ids.party, ids.account, ids.branchA, ids.actor, ids.projectA, unit.id],
      );
      await admin.query(
        `INSERT INTO unit_availability_sources(
           tenant_id,unit_id,branch_id,project_id,unit_type,base_state,consistency_state,source_version,policy_version,legacy_projection_status,updated_by_user_id
         ) VALUES ($1,$2,$3,$4,'Apartment','ACTIVE','CONSISTENT',1,'EXEC-006-v1','Available',$5)`,
        [ids.tenantA, unit.id, ids.branchA, ids.projectA, ids.actor],
      );
    }
    await admin.query("COMMIT");
  } catch (error) {
    await admin.query("ROLLBACK");
    throw error;
  }
  return units;
}

async function createFixture(unit, options = {}) {
  const offerId = randomUUID();
  const versionId = randomUUID();
  const policyId = randomUUID();
  const snapshotId = randomUUID();
  const challengeId = randomUUID();
  const holdId = randomUUID();
  const challengeStatus = options.challengeStatus ?? "PENDING";
  const challengeAction = options.challengeAction ?? "ACCEPT";
  const challengeExpires = options.challengeExpires ?? iso(60);
  const consumedAt = challengeStatus === "CONSUMED" ? iso(-1) : null;
  const contentHash = hash("c");
  const pricingHash = hash("d");
  const termsHash = hash("e");

  await admin.query("BEGIN");
  try {
    await admin.query(
      `INSERT INTO exec007_commercial_offers(
         id,tenant_id,opportunity_id,unit_id,branch_id,subject_party_id,customer_account_id,offer_kind,service_line,state,created_by_user_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,'SALE','SALES','DRAFT',$8)`,
      [offerId, ids.tenantA, unit.opportunity, unit.id, ids.branchA, ids.party, ids.account, ids.actor],
    );
    await admin.query(
      `INSERT INTO exec007_offer_versions(
         id,tenant_id,offer_id,version_number,state,is_current,offer_kind,subject_party_id,customer_account_id,branch_id,unit_id,opportunity_id,
         content_payload,scope_snapshot,subject_snapshot,confirmation_text_version,content_hash,pricing_hash,terms_hash,validity_policy_version,
         valid_until_local_date,valid_until_utc,issued_at_utc,created_by_user_id,last_commercial_editor_id,row_version
       ) VALUES ($1,$2,$3,1,'DRAFT',FALSE,'SALE',$4,$5,$6,$7,$8,'{}','{}','{}','CONFIRM-1',$9,$10,$11,'VALIDITY-1',DATE '2026-07-28',$12::timestamptz,$13::timestamptz,$14,$14,1)`,
      [versionId, ids.tenantA, offerId, ids.party, ids.account, ids.branchA, unit.id, unit.opportunity, contentHash, pricingHash, termsHash, iso(120), iso(-5), ids.actor],
    );
    await admin.query(
      `INSERT INTO exec007_pricing_policy_versions(
         id,tenant_id,source_type,scope_type,scope_id,version_number,standard_validity_days,effective_from,created_by_user_id
       ) VALUES ($1,$2,'SALE_UNIT_PRICE_BOOK','UNIT',$3,1,7,$4::timestamptz,$5)`,
      [policyId, ids.tenantA, unit.id, iso(-5), ids.actor],
    );
    await admin.query(
      `INSERT INTO exec007_offer_pricing_snapshots(
         id,tenant_id,offer_version_id,offer_kind,policy_version_id,source_type,source_record_id,source_version,tax_basis,base_amount,customer_total,pricing_hash
       ) VALUES ($1,$2,$3,'SALE',$4,'SALE_UNIT_PRICE_BOOK',$5,'1','EXCLUSIVE',100000,100000,$6)`,
      [snapshotId, ids.tenantA, versionId, policyId, unit.id, pricingHash],
    );
    await admin.query(
      `UPDATE exec007_offer_versions SET state='ISSUED',is_current=TRUE,issued_at_utc=$1::timestamptz WHERE tenant_id=$2 AND id=$3`,
      [iso(-5), ids.tenantA, versionId],
    );
    await admin.query(
      `UPDATE exec007_commercial_offers SET state='OPEN',current_issued_version_id=$1 WHERE tenant_id=$2 AND id=$3`,
      [versionId, ids.tenantA, offerId],
    );
    await admin.query(
      `INSERT INTO exec007_customer_auth_challenges(
         id,tenant_id,principal_id,identity_type,challenge_type,status,action,token_hash,attempt_count,expires_at,consumed_at
       ) VALUES ($1,$2,$3,'VERIFIED_EMAIL','OTP',$4,$5,$6,0,$7::timestamptz,$8::timestamptz)`,
      [challengeId, ids.tenantA, ids.principal, challengeStatus, challengeAction, sha256(challengeId), challengeExpires, consumedAt],
    );
    await admin.query(
      `INSERT INTO unit_commitments(
         id,tenant_id,branch_id,unit_id,commitment_type,status,party_id,customer_account_id,opportunity_id,starts_at,expires_at,version,initiated_by_user_id,reason
       ) VALUES ($1,$2,$3,$4,'HOLD','ACTIVE',$5,$6,$7,$8::timestamptz,$9::timestamptz,1,$10,'Batch2 test hold')`,
      [holdId, ids.tenantA, ids.branchA, unit.id, ids.party, ids.account, unit.opportunity, iso(-5), iso(90), ids.actor],
    );
    await admin.query("COMMIT");
  } catch (error) {
    await admin.query("ROLLBACK");
    throw error;
  }
  return { offerId, versionId, challengeId, holdId, unit, contentHash, pricingHash, termsHash };
}

function args(fixture, key, payload = hash("1"), evidencePayload = null) {
  return [
    ids.tenantA,
    fixture.versionId,
    ids.principal,
    ids.grant,
    ids.session,
    fixture.challengeId,
    fixture.holdId,
    ids.actor,
    ids.assignment,
    1,
    iso(180),
    "PORTAL_STEP_UP",
    JSON.stringify(
      evidencePayload ?? { action: "ACCEPT", offerVersionId: fixture.versionId, challengeId: fixture.challengeId },
    ),
    hash("2"),
    `corr-${key}`,
    hash(key),
    payload,
    now.toISOString(),
  ];
}

async function accept(client, fixture, key, payload = hash("1"), evidencePayload = null) {
  const result = await client.query(
    `SELECT * FROM fn_exec007_complete_conditional_acceptance(
      $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7::uuid,$8::uuid,$9::uuid,
      $10::integer,$11::timestamptz,$12::text,$13::jsonb,$14::text,$15::text,$16::text,$17::text,$18::timestamptz
    )`,
    args(fixture, key, payload, evidencePayload),
  );
  return result.rows[0];
}

async function counts(fixture) {
  const result = await admin.query(
    `SELECT
      (SELECT count(*)::int FROM exec007_acceptance_evidence WHERE tenant_id=$1 AND offer_version_id=$2) AS evidence,
      (SELECT count(*)::int FROM exec007_acceptance_completion_attempts WHERE tenant_id=$1 AND offer_version_id=$2) AS completion,
      (SELECT count(*)::int FROM exec007_preparation_requests WHERE tenant_id=$1 AND offer_version_id=$2) AS preparation,
      (SELECT count(*)::int FROM unit_commitments WHERE tenant_id=$1 AND converted_from_commitment_id=$3 AND commitment_type='RESERVATION') AS reservation,
      (SELECT status FROM unit_commitments WHERE tenant_id=$1 AND id=$3) AS hold_status`,
    [ids.tenantA, fixture.versionId, fixture.holdId],
  );
  return result.rows[0];
}

async function expectRejected(action, pattern) {
  try {
    await action();
  } catch (error) {
    if (!pattern || pattern.test(error.message)) return true;
    throw error;
  }
  return false;
}

try {
  const cutoverSingleWinner = await activateCutoverWithConcurrencyRegression();
  const units = await seedFoundation();
  const beforeForbidden = await admin.query(
    `SELECT
      (SELECT count(*)::int FROM contracts) AS contracts,
      (SELECT count(*)::int FROM invoices) AS invoices,
      (SELECT count(*)::int FROM payment_plans) AS payment_plans,
      (SELECT count(*)::int FROM payment_transactions) AS payment_transactions,
      (SELECT count(*)::int FROM commission_payments) AS commission_payments,
      (SELECT count(*)::int FROM payroll_commissions) AS payroll_commissions`,
  );

  const success = await createFixture(units[0]);
  const successResult = await accept(admin, success, "3");
  const successCounts = await counts(success);
  const reservation = await admin.query(
    `SELECT commitment_type,status,converted_from_commitment_id FROM unit_commitments WHERE tenant_id=$1 AND id=$2`,
    [ids.tenantA, successResult.reservation_id],
  );
  const atomicSuccessFourRecords =
    successCounts.evidence === 1 && successCounts.completion === 1 && successCounts.preparation === 1 &&
    successCounts.reservation === 1 && reservation.rows[0]?.commitment_type === "RESERVATION" && reservation.rows[0]?.status === "ACTIVE";
  const reservationActive = reservation.rows[0]?.status === "ACTIVE";

  const replayResult = await accept(admin, success, "3");
  const replayCounts = await counts(success);
  const idempotentReplay =
    replayResult.completion_attempt_id === successResult.completion_attempt_id &&
    replayCounts.evidence === 1 && replayCounts.completion === 1 && replayCounts.preparation === 1 && replayCounts.reservation === 1;
  const idempotencyMismatchRejected = await expectRejected(
    () => accept(admin, success, "3", hash("4")),
    /idempotency payload mismatch/i,
  );

  const reservationFailure = await createFixture(units[1]);
  await admin.query(`CREATE FUNCTION exec007_test_reject_reservation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced reservation failure'; END $$ LANGUAGE plpgsql;
    CREATE TRIGGER trg_exec007_test_reject_reservation BEFORE INSERT ON unit_commitments FOR EACH ROW WHEN (NEW.commitment_type='RESERVATION') EXECUTE FUNCTION exec007_test_reject_reservation()`);
  const reservationRejected = await expectRejected(() => accept(admin, reservationFailure, "5"), /forced reservation failure/i);
  await admin.query(`DROP TRIGGER trg_exec007_test_reject_reservation ON unit_commitments; DROP FUNCTION exec007_test_reject_reservation()`);
  const reservationFailureCounts = await counts(reservationFailure);
  const reservationRollback = reservationRejected && reservationFailureCounts.evidence === 0 && reservationFailureCounts.completion === 0 && reservationFailureCounts.preparation === 0 && reservationFailureCounts.reservation === 0 && reservationFailureCounts.hold_status === "ACTIVE";

  const preparationFailure = await createFixture(units[2]);
  await admin.query(`CREATE FUNCTION exec007_test_reject_preparation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced preparation failure'; END $$ LANGUAGE plpgsql;
    CREATE TRIGGER "trg_exec007_test_reject_preparation" BEFORE INSERT ON exec007_preparation_requests FOR EACH ROW EXECUTE FUNCTION exec007_test_reject_preparation()`);
  const preparationRejected = await expectRejected(() => accept(admin, preparationFailure, "6"), /forced preparation failure/i);
  await admin.query(`DROP TRIGGER "trg_exec007_test_reject_preparation" ON exec007_preparation_requests; DROP FUNCTION exec007_test_reject_preparation()`);
  const preparationFailureCounts = await counts(preparationFailure);
  const preparationRollback = preparationRejected && preparationFailureCounts.evidence === 0 && preparationFailureCounts.completion === 0 && preparationFailureCounts.preparation === 0 && preparationFailureCounts.reservation === 0 && preparationFailureCounts.hold_status === "ACTIVE";

  const consumed = await createFixture(units[3], { challengeStatus: "CONSUMED" });
  const consumedChallengeRejected = await expectRejected(() => accept(admin, consumed, "7"), /challenge is invalid/i);
  const expired = await createFixture(units[4], { challengeStatus: "EXPIRED", challengeExpires: iso(-1) });
  const expiredChallengeRejected = await expectRejected(() => accept(admin, expired, "8"), /challenge is invalid/i);
  const revoked = await createFixture(units[5], { challengeStatus: "REVOKED" });
  const revokedChallengeRejected = await expectRejected(() => accept(admin, revoked, "9"), /challenge is invalid/i);
  const wrongAction = await createFixture(units[6], { challengeAction: "DECLINE" });
  const wrongActionRejected = await expectRejected(() => accept(admin, wrongAction, "a"), /challenge is invalid/i);
  const payloadMismatch = await createFixture(units[7]);
  const versionPayloadMismatchRejected = await expectRejected(
    () => accept(admin, payloadMismatch, "b", hash("1"), { action: "ACCEPT", offerVersionId: randomUUID(), challengeId: payloadMismatch.challengeId }),
    /not bound to the exact ACCEPT challenge and OfferVersion/i,
  );

  const concurrent = await createFixture(units[8]);
  const concurrentResults = await Promise.allSettled([
    accept(left, concurrent, "c"),
    accept(right, concurrent, "d"),
  ]);
  const concurrentCounts = await counts(concurrent);
  const concurrentSingleWinner =
    concurrentResults.filter((item) => item.status === "fulfilled").length === 1 &&
    concurrentResults.filter((item) => item.status === "rejected").length === 1 &&
    concurrentCounts.evidence === 1 && concurrentCounts.completion === 1 && concurrentCounts.preparation === 1 && concurrentCounts.reservation === 1;

  const tenantFixture = await createFixture(units[9]);
  const tenantArgs = args(tenantFixture, "e");
  tenantArgs[0] = ids.tenantB;
  const tenantIsolation = await expectRejected(
    () => admin.query(
      `SELECT * FROM fn_exec007_complete_conditional_acceptance(
        $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7::uuid,$8::uuid,$9::uuid,
        $10::integer,$11::timestamptz,$12::text,$13::jsonb,$14::text,$15::text,$16::text,$17::text,$18::timestamptz
      )`,
      tenantArgs,
    ),
    /OfferVersion is not currently acceptable/i,
  );
  const tenantCounts = await counts(tenantFixture);
  const tenantIsolationNoEffects = tenantIsolation && tenantCounts.evidence === 0 && tenantCounts.completion === 0 && tenantCounts.preparation === 0 && tenantCounts.reservation === 0;

  const afterForbidden = await admin.query(
    `SELECT
      (SELECT count(*)::int FROM contracts) AS contracts,
      (SELECT count(*)::int FROM invoices) AS invoices,
      (SELECT count(*)::int FROM payment_plans) AS payment_plans,
      (SELECT count(*)::int FROM payment_transactions) AS payment_transactions,
      (SELECT count(*)::int FROM commission_payments) AS commission_payments,
      (SELECT count(*)::int FROM payroll_commissions) AS payroll_commissions,
      (SELECT count(*)::int FROM units WHERE tenant_id=$1 AND status <> 'Available') AS changed_units`,
    [ids.tenantA],
  );
  const forbiddenWritersUntouched =
    JSON.stringify(beforeForbidden.rows[0]) === JSON.stringify({
      contracts: afterForbidden.rows[0].contracts,
      invoices: afterForbidden.rows[0].invoices,
      payment_plans: afterForbidden.rows[0].payment_plans,
      payment_transactions: afterForbidden.rows[0].payment_transactions,
      commission_payments: afterForbidden.rows[0].commission_payments,
      payroll_commissions: afterForbidden.rows[0].payroll_commissions,
    }) && afterForbidden.rows[0].changed_units === 0;

  const results = {
    result: "PASS",
    cutoverSingleWinner,
    atomicSuccessFourRecords,
    successPath: atomicSuccessFourRecords,
    reservationActive,
    reservationRollback,
    preparationRollback,
    idempotentReplay,
    idempotencyMismatchRejected,
    consumedChallengeRejected,
    expiredChallengeRejected,
    revokedChallengeRejected,
    wrongActionRejected,
    versionPayloadMismatchRejected,
    concurrentSingleWinner,
    concurrentWinnerOneOnly: concurrentSingleWinner,
    tenantIsolation: tenantIsolationNoEffects,
    forbiddenWritersUntouched,
  };
  const failed = Object.entries(results).filter(([key, value]) => key !== "result" && value !== true);
  if (failed.length) throw new Error(`Batch 2 behavioral assertions failed: ${JSON.stringify(failed)}`);
  console.log(JSON.stringify(results, null, 2));
} finally {
  await Promise.allSettled([admin.end(), left.end(), right.end()]);
}
