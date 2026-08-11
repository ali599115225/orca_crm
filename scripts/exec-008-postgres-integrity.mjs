import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL;
const evidencePath = process.env.EXEC008_POSTGRES_EVIDENCE_PATH;

if (!databaseUrl) throw new Error("DATABASE_URL is required.");
if (!evidencePath) throw new Error("EXEC008_POSTGRES_EVIDENCE_PATH is required.");

function psql(sql) {
  return execFileSync(
    "psql",
    [databaseUrl, "-X", "-v", "ON_ERROR_STOP=1", "-Atc", sql],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

async function psqlAttempt(sql) {
  try {
    const { stdout, stderr } = await execFileAsync(
      "psql",
      [databaseUrl, "-X", "-v", "ON_ERROR_STOP=1", "-Atc", sql],
      { encoding: "utf8" },
    );
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    return {
      ok: false,
      stdout: String(error.stdout ?? "").trim(),
      stderr: String(error.stderr ?? error.message ?? "").trim(),
    };
  }
}

const ids = {
  tenant: "11111111-1111-4111-8111-111111111111",
  userA: "22222222-2222-4222-8222-222222222222",
  userB: "33333333-3333-4333-8333-333333333333",
  template: "44444444-4444-4444-8444-444444444444",
  obligation: "55555555-5555-4555-8555-555555555555",
  evidence: "66666666-6666-4666-8666-666666666666",
  payment: "77777777-7777-4777-8777-777777777777",
  allocationA: "88888888-8888-4888-8888-888888888888",
  allocationB: "99999999-9999-4999-8999-999999999999",
  refundA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  refundB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  correction: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  activationObligationA: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  activationObligationB: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
};

const postgresVersionNum = Number(psql("SHOW server_version_num"));
if (postgresVersionNum < 160000 || postgresVersionNum >= 170000) {
  throw new Error(`PostgreSQL 16 required, got server_version_num=${postgresVersionNum}`);
}

psql(`
INSERT INTO tenants (id, company_name, subdomain)
VALUES ('${ids.tenant}', 'EXEC008 CI', 'exec008-ci');
INSERT INTO users (id, tenant_id, name, email, password_hash, role)
VALUES
  ('${ids.userA}', '${ids.tenant}', 'Initiator', 'exec008-a@example.invalid', 'x', 'ADMIN'),
  ('${ids.userB}', '${ids.tenant}', 'Approver', 'exec008-b@example.invalid', 'x', 'ADMIN');
INSERT INTO exec008_contract_template_versions
  (id, tenant_id, template_key, version, content_hash, content_snapshot, issued_at)
VALUES
  ('${ids.template}', '${ids.tenant}', 'SALE', 1, 'template-hash', 'template-body', now());
INSERT INTO exec008_financial_obligations
  (id, tenant_id, source_type, source_id, currency, amount_minor, corrected_minor, finalized, resource_type, resource_id)
VALUES
  ('${ids.obligation}', '${ids.tenant}', 'INVOICE', 'invoice-1', 'SAR', 10000, 0, true, 'INVOICE', 'invoice-1');
INSERT INTO exec008_payment_evidence
  (id, tenant_id, provider, provider_reference, currency, amount_minor, resource_type, resource_id, verified, verified_at, payload_hash)
VALUES
  ('${ids.evidence}', '${ids.tenant}', 'CI_PROVIDER', 'provider-ref-1', 'SAR', 10000, 'INVOICE', 'invoice-1', true, now(), 'payload-hash');
INSERT INTO exec008_payments
  (id, tenant_id, evidence_id, currency, amount_minor, resource_type, resource_id, completed_at)
VALUES
  ('${ids.payment}', '${ids.tenant}', '${ids.evidence}', 'SAR', 10000, 'INVOICE', 'invoice-1', now());
INSERT INTO exec008_financial_corrections
  (id, tenant_id, obligation_id, currency, amount_minor, reason, actor_user_id)
VALUES
  ('${ids.correction}', '${ids.tenant}', '${ids.obligation}', 'SAR', -100, 'CI correction', '${ids.userA}');
`);

const templateMutation = await psqlAttempt(`
UPDATE exec008_contract_template_versions SET content_snapshot='mutated' WHERE id='${ids.template}';
`);
if (templateMutation.ok || !/EXEC008_APPEND_ONLY/.test(templateMutation.stderr)) {
  throw new Error("Template immutability guard did not deny mutation.");
}

const correctionMutation = await psqlAttempt(`
UPDATE exec008_financial_corrections SET reason='mutated' WHERE id='${ids.correction}';
`);
if (correctionMutation.ok || !/EXEC008_APPEND_ONLY/.test(correctionMutation.stderr)) {
  throw new Error("Correction append-only guard did not deny mutation.");
}

const activationObligationSql = (id) => `
BEGIN;
INSERT INTO exec008_financial_obligations
  (id, tenant_id, source_type, source_id, currency, amount_minor, corrected_minor, finalized, resource_type, resource_id)
VALUES
  ('${id}', '${ids.tenant}', 'CONTRACT_ACTIVATION', 'contract-ci-1', 'SAR', 250000, 0, true, 'CONTRACT', 'contract-ci-1');
SELECT pg_sleep(0.25);
COMMIT;
`;
const activationObligationRace = await Promise.all([
  psqlAttempt(activationObligationSql(ids.activationObligationA)),
  psqlAttempt(activationObligationSql(ids.activationObligationB)),
]);
const activationObligationSuccesses = activationObligationRace.filter((result) => result.ok).length;
const activationObligationFailures = activationObligationRace.filter((result) => !result.ok);
if (
  activationObligationSuccesses !== 1 ||
  activationObligationFailures.length !== 1 ||
  !/duplicate key|unique constraint/i.test(activationObligationFailures[0].stderr)
) {
  throw new Error(`Activation obligation race guard failed: ${JSON.stringify(activationObligationRace)}`);
}
const activationObligationCount = Number(psql(`
SELECT count(*)
FROM exec008_financial_obligations
WHERE tenant_id='${ids.tenant}'
  AND source_type='CONTRACT_ACTIVATION'
  AND source_id='contract-ci-1'
`));
if (activationObligationCount !== 1) {
  throw new Error(`Expected one activation obligation, got ${activationObligationCount}`);
}

const allocationSql = (id) => `
BEGIN;
INSERT INTO exec008_payment_allocations
  (id, tenant_id, payment_id, obligation_id, currency, amount_minor)
VALUES
  ('${id}', '${ids.tenant}', '${ids.payment}', '${ids.obligation}', 'SAR', 7000);
SELECT pg_sleep(0.25);
COMMIT;
`;
const allocationRace = await Promise.all([
  psqlAttempt(allocationSql(ids.allocationA)),
  psqlAttempt(allocationSql(ids.allocationB)),
]);
const allocationSuccesses = allocationRace.filter((result) => result.ok).length;
const allocationFailures = allocationRace.filter((result) => !result.ok);
if (allocationSuccesses !== 1 || allocationFailures.length !== 1 || !/EXEC008_OVER_ALLOCATION/.test(allocationFailures[0].stderr)) {
  throw new Error(`Allocation race guard failed: ${JSON.stringify(allocationRace)}`);
}
const allocatedMinor = Number(psql(`SELECT COALESCE(sum(amount_minor),0) FROM exec008_payment_allocations WHERE tenant_id='${ids.tenant}' AND obligation_id='${ids.obligation}'`));
if (allocatedMinor !== 7000) throw new Error(`Expected allocated_minor=7000, got ${allocatedMinor}`);

const refundSql = (id, initiator) => `
BEGIN;
INSERT INTO exec008_refunds
  (id, tenant_id, payment_id, currency, amount_minor, reason, initiated_by_user_id, state, resource_type, resource_id)
VALUES
  ('${id}', '${ids.tenant}', '${ids.payment}', 'SAR', 7000, 'CI refund', '${initiator}', 'REQUESTED', 'INVOICE', 'invoice-1');
SELECT pg_sleep(0.25);
COMMIT;
`;
const refundRace = await Promise.all([
  psqlAttempt(refundSql(ids.refundA, ids.userA)),
  psqlAttempt(refundSql(ids.refundB, ids.userB)),
]);
const refundSuccesses = refundRace.filter((result) => result.ok).length;
const refundFailures = refundRace.filter((result) => !result.ok);
if (refundSuccesses !== 1 || refundFailures.length !== 1 || !/EXEC008_REFUND_EXCEEDS_PAYMENT/.test(refundFailures[0].stderr)) {
  throw new Error(`Refund race guard failed: ${JSON.stringify(refundRace)}`);
}

const survivingRefundId = psql(`SELECT id FROM exec008_refunds WHERE tenant_id='${ids.tenant}' AND payment_id='${ids.payment}' LIMIT 1`);
const survivingInitiator = psql(`SELECT initiated_by_user_id FROM exec008_refunds WHERE id='${survivingRefundId}'`);
const selfApproval = await psqlAttempt(`
UPDATE exec008_refunds
SET state='APPROVED', approved_by_user_id='${survivingInitiator}'
WHERE id='${survivingRefundId}';
`);
if (selfApproval.ok || !/EXEC008_SELF_APPROVAL_DENIED/.test(selfApproval.stderr)) {
  throw new Error("Refund self-approval guard did not deny mutation.");
}

const independentApprover = survivingInitiator === ids.userA ? ids.userB : ids.userA;
psql(`
UPDATE exec008_refunds
SET state='APPROVED', approved_by_user_id='${independentApprover}'
WHERE id='${survivingRefundId}';
`);
const approved = psql(`SELECT state || ':' || approved_by_user_id::text FROM exec008_refunds WHERE id='${survivingRefundId}'`);
if (approved !== `APPROVED:${independentApprover}`) {
  throw new Error(`Independent approval did not persist correctly: ${approved}`);
}

const evidence = {
  result: "PASS",
  postgresMajor: 16,
  tests: {
    templateImmutable: true,
    correctionAppendOnly: true,
    activationObligationConcurrencyBounded: true,
    activationObligationCount,
    allocationConcurrencyBounded: true,
    allocatedMinor,
    refundConcurrencyBounded: true,
    refundSelfApprovalDenied: true,
    independentRefundApproval: true,
  },
};

await import("node:fs/promises").then(({ writeFile }) =>
  writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8"),
);
console.log(JSON.stringify(evidence));
