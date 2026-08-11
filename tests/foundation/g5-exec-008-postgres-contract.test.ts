import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const workflowPath = join(ROOT, ".github/workflows/exec-008-migration-validation.yml");
const scriptPath = join(ROOT, "scripts/exec-008-postgres-integrity.mjs");

describe("EXEC-008 — PostgreSQL evidence contract", () => {
  it("binds the disposable PostgreSQL 16 workflow to the governed integrity probe", () => {
    const workflow = readFileSync(workflowPath, "utf8");
    const script = readFileSync(scriptPath, "utf8");

    expect(workflow).toContain("postgres:16");
    expect(workflow).toContain("20260811030000_exec_008_contract_financial_integrity/migration.sql");
    expect(workflow).toContain("scripts/exec-008-postgres-integrity.mjs");
    expect(workflow).toContain("g5-exec-008-postgres-contract.test.ts");
    expect(workflow).not.toMatch(/production|customer[-_ ]data|backfill/i);

    expect(script).toContain("CONTRACT_ACTIVATION");
    expect(script).toContain("EXEC008_OVER_ALLOCATION");
    expect(script).toContain("EXEC008_REFUND_EXCEEDS_PAYMENT");
    expect(script).toContain("EXEC008_SELF_APPROVAL_DENIED");
    expect(script).toContain("EXEC008_APPEND_ONLY");
  });

  it("validates real PostgreSQL evidence when the dedicated workflow supplies it", () => {
    const evidencePath = process.env.EXEC008_POSTGRES_EVIDENCE;
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
      templateImmutable: true,
      correctionAppendOnly: true,
      activationObligationConcurrencyBounded: true,
      activationObligationCount: 1,
      allocationConcurrencyBounded: true,
      allocatedMinor: 7000,
      refundConcurrencyBounded: true,
      refundSelfApprovalDenied: true,
      independentRefundApproval: true,
    });
  });
});
