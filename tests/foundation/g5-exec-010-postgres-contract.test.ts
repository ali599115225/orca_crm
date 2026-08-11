import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const workflowPath = join(ROOT, ".github/workflows/exec-010-migration-validation.yml");
const scriptPath = join(ROOT, "scripts/exec-010-postgres-integrity.mjs");

describe("EXEC-010 — PostgreSQL integrity evidence", () => {
  it("binds PostgreSQL 16 validation to the governed migration and probe", () => {
    expect(existsSync(workflowPath)).toBe(true);
    expect(existsSync(scriptPath)).toBe(true);
    const workflow = readFileSync(workflowPath, "utf8");
    const script = readFileSync(scriptPath, "utf8");
    expect(workflow).toContain("postgres:16");
    expect(workflow).toContain("20260811080000_exec_010_document_privacy_reporting_controls/migration.sql");
    expect(workflow).toContain("scripts/exec-010-postgres-integrity.mjs");
    expect(workflow).toContain("g5-exec-010-postgres-contract.test.ts");
    expect(script).toContain("EXEC010_DOCUMENT_EVIDENCE_IMMUTABLE");
    expect(script).toContain("EXEC010_LEGAL_HOLD_BLOCKS_EXPIRY");
    expect(script).toContain("EXEC010_METRIC_TENANT_SCOPE_MISMATCH");
  });

  it("accepts only complete real PostgreSQL evidence from the dedicated workflow", () => {
    const path = process.env.EXEC010_POSTGRES_EVIDENCE;
    if (!path) {
      expect(existsSync(workflowPath)).toBe(true);
      return;
    }
    const evidence = JSON.parse(readFileSync(path, "utf8"));
    expect(evidence.result).toBe("PASS");
    expect(evidence.postgresMajor).toBe(16);
    expect(evidence.tests).toMatchObject({
      documentIdentityImmutable: true,
      legalHoldBlocksExpiry: true,
      documentHashPreserved: true,
      crossTenantDocumentDenied: true,
      privacyAppendOnly: true,
      metricImmutable: true,
      metricCrossTenantDenied: true,
      unapprovedMetricDenied: true,
      exportAppendOnly: true,
      crossTenantExportDenied: true,
      privacyReplayConcurrencyBounded: true,
      privacyRaceCount: 1,
    });
  });
});
