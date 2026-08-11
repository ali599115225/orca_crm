import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "prisma/migrations/20260811050000_exec_009_workflow_communication_truth/migration.sql"),
  "utf8",
);

describe("EXEC-009 — schema contract", () => {
  it("creates immutable workflow versions and version-pinned idempotent runs", () => {
    expect(migration).toContain('CREATE TABLE "exec009_workflow_versions"');
    expect(migration).toContain('CREATE TABLE "exec009_workflow_runs"');
    expect(migration).toContain("exec009_workflow_versions_immutable");
    expect(migration).toContain("exec009_workflow_runs_idempotency_uq");
    expect(migration).toContain("EXEC009_RUN_IDENTITY_IMMUTABLE");
    expect(migration).toContain("EXEC009_TERMINAL_RUN_IMMUTABLE");
    expect(migration).toContain("EXEC009_TIMEOUT_NOT_SUCCESS");
  });

  it("makes attempt, communication event, and consent history append-only", () => {
    expect(migration).toContain("exec009_workflow_attempts_append_only");
    expect(migration).toContain("exec009_communication_events_append_only");
    expect(migration).toContain("exec009_communication_consents_append_only");
    expect(migration).toContain("EXEC009_IMMUTABLE");
  });

  it("enforces tenant scope and prevents refund-like self approval semantics for workflow approval", () => {
    expect(migration).toContain("EXEC009_TENANT_SCOPE_MISMATCH");
    expect(migration).toContain("exec009_workflow_runs_no_self_approval_ck");
    expect(migration).toContain('"approved_by_user_id" <> "requested_by_user_id"');
  });

  it("keeps communication identity separate from party identity and retention configurable", () => {
    expect(migration).toContain('"identity_state"');
    expect(migration).toContain('"party_id" UUID');
    expect(migration).toContain('"retention_policy_key" TEXT');
    expect(migration).toContain('"retention_until" TIMESTAMPTZ');
    expect(migration).toContain('"legal_hold" BOOLEAN');
    expect(migration).not.toMatch(/retention_until[^\n]+DEFAULT\s+\(/i);
  });

  it("contains no provider credential or destructive customer-data mutation", () => {
    expect(migration).not.toMatch(/access[_ ]?token|client[_ ]?secret|api[_ ]?key|credential/i);
    expect(migration).not.toMatch(/\b(?:INSERT|UPDATE|DELETE)\b[^;]*(?:backfill|production)/i);
    expect(migration).not.toMatch(/UPDATE\s+(whatsapp_|email_|leads|parties|offers|contracts)/i);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+(whatsapp_|email_|leads|parties|offers|contracts)/i);
  });
});
