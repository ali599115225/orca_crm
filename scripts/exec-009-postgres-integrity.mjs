import fs from "node:fs";
import pg from "pg";

const { Client } = pg;
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL_REQUIRED");
const evidencePath = process.env.EXEC009_POSTGRES_EVIDENCE_PATH || "exec-009-postgres-evidence.json";

async function client() {
  const c = new Client({ connectionString: url });
  await c.connect();
  return c;
}

async function expectFailure(work, pattern) {
  try {
    await work();
  } catch (error) {
    const message = String(error?.message || error);
    if (!pattern.test(message)) throw error;
    return true;
  }
  throw new Error(`EXPECTED_FAILURE_NOT_OBSERVED:${pattern}`);
}

const c = await client();
const ids = {
  tenant: "11111111-1111-4111-8111-111111111111",
  tenant2: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  user: "22222222-2222-4222-8222-222222222222",
  user2: "33333333-3333-4333-8333-333333333333",
  workflow: "44444444-4444-4444-8444-444444444444",
  workflow2: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  version: "55555555-5555-4555-8555-555555555555",
  run: "66666666-6666-4666-8666-666666666666",
  thread: "77777777-7777-4777-8777-777777777777",
};

try {
  await c.query("BEGIN");
  await c.query(`INSERT INTO tenants (id, company_name, subdomain) VALUES ($1,'EXEC009 Tenant','exec009-a'),($2,'EXEC009 Tenant 2','exec009-b')`, [ids.tenant, ids.tenant2]);
  await c.query(`INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES ($1,$2,'Requester','exec009-a@example.test','x','ADMIN'),($3,$2,'Approver','exec009-b@example.test','x','ADMIN')`, [ids.user, ids.tenant, ids.user2]);
  await c.query(`INSERT INTO automation_workflows (id, tenant_id, name, trigger_event, actions_json, is_active, created_by, updated_by) VALUES ($1,$2,'W1','lead.created','[]',true,$3,$3),($4,$5,'W2','lead.created','[]',true,$3,$3)`, [ids.workflow, ids.tenant, ids.user, ids.workflow2, ids.tenant2]);
  await c.query("COMMIT");

  await c.query(`INSERT INTO exec009_workflow_versions (id,tenant_id,workflow_id,version,definition_hash,trigger_event,actions_json,approval_required,approval_permission,resource_scope,created_by) VALUES ($1,$2,$3,1,$4,'lead.created','[]',true,'discount.approve',$5::jsonb,$6)`, [ids.version, ids.tenant, ids.workflow, "a".repeat(64), JSON.stringify({ tenantId: ids.tenant, resourceType: "AUTOMATION_WORKFLOW", resourceId: ids.workflow }), ids.user]);

  const versionImmutable = await expectFailure(
    () => c.query(`UPDATE exec009_workflow_versions SET trigger_event='changed' WHERE id=$1`, [ids.version]),
    /EXEC009_IMMUTABLE/,
  );
  const crossTenantVersionDenied = await expectFailure(
    () => c.query(`INSERT INTO exec009_workflow_versions (tenant_id,workflow_id,version,definition_hash,trigger_event,actions_json,approval_required,resource_scope,created_by) VALUES ($1,$2,2,$3,'x','[]',false,$4::jsonb,$5)`, [ids.tenant, ids.workflow2, "b".repeat(64), JSON.stringify({ tenantId: ids.tenant }), ids.user]),
    /EXEC009_TENANT_SCOPE_MISMATCH/,
  );

  await c.query(`INSERT INTO exec009_workflow_runs (id,tenant_id,workflow_version_id,idempotency_key_hash,payload_hash,state,requested_by_user_id,max_attempts) VALUES ($1,$2,$3,$4,$5,'PENDING',$6,2)`, [ids.run, ids.tenant, ids.version, "c".repeat(64), "d".repeat(64), ids.user]);
  const selfApprovalDenied = await expectFailure(
    () => c.query(`UPDATE exec009_workflow_runs SET approved_by_user_id=$1 WHERE id=$2`, [ids.user, ids.run]),
    /check constraint|exec009_workflow_runs_no_self_approval_ck/i,
  );

  await c.query(`UPDATE exec009_workflow_runs SET state='DEAD_LETTER', attempt_count=2, last_error='TEMP' WHERE id=$1`, [ids.run]);
  const terminalImmutable = await expectFailure(
    () => c.query(`UPDATE exec009_workflow_runs SET state='COMPLETED' WHERE id=$1`, [ids.run]),
    /EXEC009_TERMINAL_RUN_IMMUTABLE/,
  );

  const timeoutRun = "88888888-8888-4888-8888-888888888888";
  await c.query(`INSERT INTO exec009_workflow_runs (id,tenant_id,workflow_version_id,idempotency_key_hash,payload_hash,state,requested_by_user_id,max_attempts,deadline_at) VALUES ($1,$2,$3,$4,$5,'PENDING',$6,2,now()-interval '1 second')`, [timeoutRun, ids.tenant, ids.version, "e".repeat(64), "f".repeat(64), ids.user]);
  const timeoutNotSuccess = await expectFailure(
    () => c.query(`UPDATE exec009_workflow_runs SET state='COMPLETED', result_hash=$1 WHERE id=$2`, ["1".repeat(64), timeoutRun]),
    /EXEC009_TIMEOUT_NOT_SUCCESS/,
  );

  await c.query(`INSERT INTO exec009_workflow_attempts (tenant_id,run_id,attempt_number,outcome,error_code) VALUES ($1,$2,1,'FAILED','TEMP')`, [ids.tenant, ids.run]);
  const attemptAppendOnly = await expectFailure(
    () => c.query(`UPDATE exec009_workflow_attempts SET error_code='CHANGED' WHERE run_id=$1`, [ids.run]),
    /EXEC009_IMMUTABLE/,
  );

  await c.query(`INSERT INTO exec009_communication_threads (id,tenant_id,channel,identity_hash) VALUES ($1,$2,'WHATSAPP',$3)`, [ids.thread, ids.tenant, "2".repeat(64)]);
  const verifiedWithoutPartyDenied = await expectFailure(
    () => c.query(`UPDATE exec009_communication_threads SET identity_state='VERIFIED' WHERE id=$1`, [ids.thread]),
    /check constraint|exec009_threads_party_state_ck/i,
  );
  const crossTenantEventDenied = await expectFailure(
    () => c.query(`INSERT INTO exec009_communication_events (tenant_id,thread_id,channel,provider_identity,provider_identity_hash,direction,purpose,content_hash,occurred_at) VALUES ($1,$2,'WHATSAPP','wamid.cross',$3,'INBOUND','OPERATIONAL',$4,now())`, [ids.tenant2, ids.thread, "3".repeat(64), "4".repeat(64)]),
    /EXEC009_TENANT_SCOPE_MISMATCH/,
  );

  const providerHash = "5".repeat(64);
  await c.query(`INSERT INTO exec009_communication_events (tenant_id,thread_id,channel,provider_identity,provider_identity_hash,direction,purpose,content_hash,occurred_at) VALUES ($1,$2,'WHATSAPP','wamid.1',$3,'INBOUND','OPERATIONAL',$4,now())`, [ids.tenant, ids.thread, providerHash, "6".repeat(64)]);
  const eventAppendOnly = await expectFailure(
    () => c.query(`UPDATE exec009_communication_events SET purpose='SERVICE' WHERE provider_identity_hash=$1`, [providerHash]),
    /EXEC009_IMMUTABLE/,
  );

  await c.query(`INSERT INTO exec009_communication_consents (tenant_id,thread_id,purpose,state,source,effective_at) VALUES ($1,$2,'MARKETING','OPTED_IN','TEST',now()),($1,$2,'MARKETING','OPTED_OUT','TEST',now()+interval '1 second')`, [ids.tenant, ids.thread]);
  const consentAppendOnly = await expectFailure(
    () => c.query(`UPDATE exec009_communication_consents SET state='OPTED_IN' WHERE state='OPTED_OUT' AND thread_id=$1`, [ids.thread]),
    /EXEC009_IMMUTABLE/,
  );

  const raceKey = "7".repeat(64);
  const racePayload = "8".repeat(64);
  const c1 = await client();
  const c2 = await client();
  const insertRun = (db, id) => db.query(`INSERT INTO exec009_workflow_runs (id,tenant_id,workflow_version_id,idempotency_key_hash,payload_hash,state,requested_by_user_id,max_attempts) VALUES ($1,$2,$3,$4,$5,'PENDING',$6,3)`, [id, ids.tenant, ids.version, raceKey, racePayload, ids.user]);
  const raceResults = await Promise.allSettled([
    insertRun(c1, "99999999-9999-4999-8999-999999999991"),
    insertRun(c2, "99999999-9999-4999-8999-999999999992"),
  ]);
  await c1.end(); await c2.end();
  const runIdempotencyConcurrencyBounded = raceResults.filter((r) => r.status === "fulfilled").length === 1;
  const runCount = Number((await c.query(`SELECT count(*)::int AS n FROM exec009_workflow_runs WHERE tenant_id=$1 AND idempotency_key_hash=$2`, [ids.tenant, raceKey])).rows[0].n);

  const p1 = await client();
  const p2 = await client();
  const providerRaceHash = "9".repeat(64);
  const insertEvent = (db, id) => db.query(`INSERT INTO exec009_communication_events (id,tenant_id,thread_id,channel,provider_identity,provider_identity_hash,direction,purpose,content_hash,occurred_at) VALUES ($1,$2,$3,'WHATSAPP','wamid.race',$4,'INBOUND','OPERATIONAL',$5,now())`, [id, ids.tenant, ids.thread, providerRaceHash, "0".repeat(64)]);
  const eventRaceResults = await Promise.allSettled([
    insertEvent(p1, "99999999-9999-4999-8999-999999999993"),
    insertEvent(p2, "99999999-9999-4999-8999-999999999994"),
  ]);
  await p1.end(); await p2.end();
  const providerIdentityConcurrencyBounded = eventRaceResults.filter((r) => r.status === "fulfilled").length === 1;
  const providerCount = Number((await c.query(`SELECT count(*)::int AS n FROM exec009_communication_events WHERE tenant_id=$1 AND provider_identity_hash=$2`, [ids.tenant, providerRaceHash])).rows[0].n);

  const tests = {
    versionImmutable,
    crossTenantVersionDenied,
    selfApprovalDenied,
    terminalImmutable,
    timeoutNotSuccess,
    attemptAppendOnly,
    verifiedWithoutPartyDenied,
    crossTenantEventDenied,
    eventAppendOnly,
    consentAppendOnly,
    runIdempotencyConcurrencyBounded,
    runCount,
    providerIdentityConcurrencyBounded,
    providerCount,
  };
  const pass = Object.entries(tests).every(([key, value]) =>
    key.endsWith("Count") ? value === 1 : value === true,
  );
  const evidence = {
    result: pass ? "PASS" : "FAIL",
    postgresMajor: Number((await c.query("SHOW server_version_num")).rows[0].server_version_num.slice(0, 2)),
    tests,
  };
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify(evidence));
  if (!pass) process.exitCode = 1;
} finally {
  await c.end();
}
