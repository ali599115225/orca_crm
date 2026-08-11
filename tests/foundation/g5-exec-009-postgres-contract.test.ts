import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const workflowPath = join(ROOT, ".github/workflows/exec-009-migration-validation.yml");
const scriptPath = join(ROOT, "scripts/exec-009-postgres-integrity.mjs");

describe("EXEC-009 — PostgreSQL evidence contract", () => {
  it("binds PostgreSQL 16 validation to the single governed migration and probe", () => {
    expect(existsSync(workflowPath)).toBe(true);
    expect(existsSync(scriptPath)).toBe(true);
    const workflow = readFileSync(workflowPath, "utf8");
    const script = readFileSync(scriptPath, "utf8");

    expect(workflow).toContain("postgres:16");
    expect(workflow).toContain("20260811050000_exec_009_workflow_communication_truth/migration.sql");
    expect(workflow).toContain("scripts/exec-009-postgres-integrity.mjs");
    expect(workflow).toContain("g5-exec-009-postgres-contract.test.ts");
    expect(workflow).not.toMatch(/production[-_ ]data|customer[-_ ]data|backfill/i);

    expect(script).toContain("EXEC009_IMMUTABLE");
    expect(script).toContain("EXEC009_TENANT_SCOPE_MISMATCH");
    expect(script).toContain("EXEC009_TERMINAL_RUN_IMMUTABLE");
    expect(script).toContain("EXEC009_TIMEOUT_NOT_SUCCESS");
  });

  it("accepts only complete real PostgreSQL evidence from the dedicated workflow", () => {
    const evidencePath = process.env.EXEC009_POSTGRES_EVIDENCE;
    if (!evidencePath) {
      expect(existsSync(workflowPath)).toBe(true);
      return;
    }

    const evidence = JSON.parse(readFileSync(evidencePath, "utf8")) as {
      result: string;
      postgresMajor: number;
      tests: Record<string, boolean | number>;
    };

    expect(evidence.result).toBe("PASS");
    expect(evidence.postgresMajor).toBe(16);
    expect(evidence.tests).toMatchObject({
      versionImmutable: true,
      crossTenantVersionDenied: true,
      selfApprovalDenied: true,
      terminalImmutable: true,
      timeoutNotSuccess: true,
      attemptAppendOnly: true,
      verifiedWithoutPartyDenied: true,
      crossTenantEventDenied: true,
      eventAppendOnly: true,
      consentAppendOnly: true,
      runIdempotencyConcurrencyBounded: true,
      runCount: 1,
      providerIdentityConcurrencyBounded: true,
      providerCount: 1,
    });
  });
});
