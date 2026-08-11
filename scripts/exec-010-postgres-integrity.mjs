import fs from "node:fs";
import pg from "pg";

const { Client } = pg;
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL_REQUIRED");
const evidencePath = process.env.EXEC010_POSTGRES_EVIDENCE_PATH || "exec-010-postgres-evidence.json";

async function connect() { const c = new Client({ connectionString: url }); await c.connect(); return c; }
async function expectFailure(work, pattern) {
  try { await work(); } catch (error) { const message = String(error?.message || error); if (!pattern.test(message)) throw error; return true; }
  throw new Error(`EXPECTED_FAILURE_NOT_OBSERVED:${pattern}`);
}

const c = await connect();
const ids = {
  tenant: "11111111-1111-4111-8111-111111111111", tenant2: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  user: "22222222-2222-4222-8222-222222222222", user2: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  document: "33333333-3333-4333-8333-333333333333", metric: "44444444-4444-4444-8444-444444444444",
  metricUnapproved: "55555555-5555-4555-8555-555555555555", export: "66666666-6666-4666-8666-666666666666",
};
const scope = JSON.stringify({ tenantId: ids.tenant, resourceType: "DOCUMENT", resourceId: "scope-1" });
try {
  await c.query("BEGIN");
  await c.query(`INSERT INTO tenants (id,company_name,subdomain) VALUES ($1,'EXEC010 A','exec010-a'),($2,'EXEC010 B','exec010-b')`, [ids.tenant, ids.tenant2]);
  await c.query(`INSERT INTO users (id,tenant_id,name,email,password_hash,role) VALUES ($1,$2,'A','exec010-a@example.test','x','ADMIN'),($3,$4,'B','exec010-b@example.test','x','ADMIN')`, [ids.user, ids.tenant, ids.user2, ids.tenant2]);
  await c.query("COMMIT");

  await c.query(`INSERT INTO exec010_document_evidence (id,tenant_id,resource_scope,display_name,detected_media_type,content_hash,byte_length,source,actor_user_id,retention_policy_key,retention_until,legal_hold) VALUES ($1,$2,$3::jsonb,'a.pdf','application/pdf',$4,10,'UPLOAD',$5,'P1',now()-interval '1 day',true)`, [ids.document, ids.tenant, scope, "a".repeat(64), ids.user]);
  const documentIdentityImmutable = await expectFailure(() => c.query(`UPDATE exec010_document_evidence SET content_hash=$1 WHERE id=$2`, ["b".repeat(64), ids.document]), /EXEC010_DOCUMENT_EVIDENCE_IMMUTABLE/);
  const legalHoldBlocksExpiry = await expectFailure(() => c.query(`UPDATE exec010_document_evidence SET content_expired=true WHERE id=$1`, [ids.document]), /EXEC010_LEGAL_HOLD_BLOCKS_EXPIRY/);
  await c.query(`UPDATE exec010_document_evidence SET display_name='renamed.pdf' WHERE id=$1`, [ids.document]);
  const documentHashPreserved = (await c.query(`SELECT content_hash FROM exec010_document_evidence WHERE id=$1`, [ids.document])).rows[0].content_hash === "a".repeat(64);
  const crossTenantDocumentDenied = await expectFailure(() => c.query(`INSERT INTO exec010_document_evidence (tenant_id,resource_scope,display_name,detected_media_type,content_hash,byte_length,source,actor_user_id) VALUES ($1,$2::jsonb,'x.pdf','application/pdf',$3,1,'UPLOAD',$4)`, [ids.tenant2, scope, "c".repeat(64), ids.user2]), /check constraint|exec010_document_scope_tenant_ck/i);

  const privacyId = "77777777-7777-4777-8777-777777777777";
  await c.query(`INSERT INTO exec010_privacy_requests (id,tenant_id,subject_type,subject_id,request_type,purpose,request_key_hash,payload_hash,actor_user_id,state) VALUES ($1,$2,'PARTY','p1','CORRECTION','LEGAL',$3,$4,$5,'PENDING')`, [privacyId, ids.tenant, "d".repeat(64), "e".repeat(64), ids.user]);
  const privacyAppendOnly = await expectFailure(() => c.query(`UPDATE exec010_privacy_requests SET purpose='MARKETING' WHERE id=$1`, [privacyId]), /EXEC010_APPEND_ONLY/);

  await c.query(`INSERT INTO exec010_metric_definitions (id,tenant_id,metric_key,version,definition_hash,source_lineage,window_key,timezone,approved) VALUES ($1,$2,'revenue',1,$3,ARRAY['exec008_payments'],'MONTH','Asia/Riyadh',true),($4,$2,'draft',1,$5,ARRAY['unknown'],'MONTH','Asia/Riyadh',false)`, [ids.metric, ids.tenant, "f".repeat(64), ids.metricUnapproved, "1".repeat(64)]);
  const metricImmutable = await expectFailure(() => c.query(`UPDATE exec010_metric_definitions SET timezone='UTC' WHERE id=$1`, [ids.metric]), /EXEC010_APPEND_ONLY/);
  await c.query(`INSERT INTO exec010_metric_results (tenant_id,metric_definition_id,input_digest,value_minor_units) VALUES ($1,$2,$3,125007)`, [ids.tenant, ids.metric, "2".repeat(64)]);
  const metricCrossTenantDenied = await expectFailure(() => c.query(`INSERT INTO exec010_metric_results (tenant_id,metric_definition_id,input_digest,value_minor_units) VALUES ($1,$2,$3,1)`, [ids.tenant2, ids.metric, "3".repeat(64)]), /EXEC010_METRIC_TENANT_SCOPE_MISMATCH/);
  const unapprovedMetricDenied = await expectFailure(() => c.query(`INSERT INTO exec010_metric_results (tenant_id,metric_definition_id,input_digest,value_minor_units) VALUES ($1,$2,$3,1)`, [ids.tenant, ids.metricUnapproved, "4".repeat(64)]), /EXEC010_UNAPPROVED_METRIC_RESULT/);

  await c.query(`INSERT INTO exec010_export_audits (id,tenant_id,actor_user_id,resource_scope,purpose,data_class,fields,query_digest,result_count,export_format,job_key_hash,payload_hash) VALUES ($1,$2,$3,$4::jsonb,'REPORTING','FINANCE',ARRAY['id','amount'],$5,2,'CSV',$6,$7)`, [ids.export, ids.tenant, ids.user, scope, "5".repeat(64), "6".repeat(64), "7".repeat(64)]);
  const exportAppendOnly = await expectFailure(() => c.query(`DELETE FROM exec010_export_audits WHERE id=$1`, [ids.export]), /EXEC010_APPEND_ONLY/);
  const crossTenantExportDenied = await expectFailure(() => c.query(`INSERT INTO exec010_export_audits (tenant_id,actor_user_id,resource_scope,purpose,data_class,fields,query_digest,result_count,export_format,job_key_hash,payload_hash) VALUES ($1,$2,$3::jsonb,'REPORTING','X',ARRAY['id'],$4,1,'JSON',$5,$6)`, [ids.tenant2, ids.user2, scope, "8".repeat(64), "9".repeat(64), "0".repeat(64)]), /check constraint|exec010_export_scope_tenant_ck/i);

  const raceKey = "a1".repeat(32); const racePayload = "b1".repeat(32);
  const p1 = await connect(); const p2 = await connect();
  const insertPrivacy = (db, id) => db.query(`INSERT INTO exec010_privacy_requests (id,tenant_id,subject_type,subject_id,request_type,purpose,request_key_hash,payload_hash,actor_user_id,state) VALUES ($1,$2,'PARTY','p2','ACCESS','LEGAL',$3,$4,$5,'PENDING')`, [id, ids.tenant, raceKey, racePayload, ids.user]);
  const race = await Promise.allSettled([
    insertPrivacy(p1, "99999999-9999-4999-8999-999999999991"),
    insertPrivacy(p2, "99999999-9999-4999-8999-999999999992"),
  ]);
  await p1.end(); await p2.end();
  const privacyReplayConcurrencyBounded = race.filter((r) => r.status === "fulfilled").length === 1;
  const privacyRaceCount = Number((await c.query(`SELECT count(*)::int AS n FROM exec010_privacy_requests WHERE tenant_id=$1 AND request_key_hash=$2`, [ids.tenant, raceKey])).rows[0].n);

  const tests = { documentIdentityImmutable, legalHoldBlocksExpiry, documentHashPreserved, crossTenantDocumentDenied, privacyAppendOnly, metricImmutable, metricCrossTenantDenied, unapprovedMetricDenied, exportAppendOnly, crossTenantExportDenied, privacyReplayConcurrencyBounded, privacyRaceCount };
  const pass = Object.entries(tests).every(([k,v]) => k.endsWith("Count") ? v === 1 : v === true);
  const evidence = { result: pass ? "PASS" : "FAIL", postgresMajor: Number((await c.query("SHOW server_version_num")).rows[0].server_version_num.slice(0,2)), tests };
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify(evidence)); if (!pass) process.exitCode = 1;
} finally { await c.end(); }
