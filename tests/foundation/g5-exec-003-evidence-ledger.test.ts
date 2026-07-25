import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXEC_003_OPERATION_ASSIGNMENTS } from "@/lib/auth/exec-003-permission-assignments";

const ROOT = process.cwd();
const LEDGER_PATH = path.join(
  ROOT,
  "docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_LEDGER.md",
);

function unquote(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("`") && trimmed.endsWith("`")
    ? trimmed.slice(1, -1)
    : trimmed;
}

function operationRows(): Array<{
  operationId: string;
  contractId: string;
  permissionKey: string;
  testFile: string;
  testName: string;
  evidence: string;
}> {
  const ledger = fs.readFileSync(LEDGER_PATH, "utf8");
  return ledger
    .split(/\r?\n/)
    .filter((line) => /^\| `EXEC-003-C\d{2}-O\d{2}`/.test(line))
    .map((line) => {
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());
      return {
        operationId: unquote(cells[0] ?? ""),
        contractId: `EXEC-003-${unquote(cells[1] ?? "")}`,
        permissionKey: unquote(cells[4] ?? ""),
        testFile: unquote(cells[6] ?? ""),
        testName: unquote(cells[7] ?? ""),
        evidence: unquote(cells[8] ?? ""),
      };
    });
}

describe("EXEC-003 v2 direct behavioral evidence ledger", () => {
  it("credits exactly 25 frozen contracts and 32 frozen operations", () => {
    const rows = operationRows();

    expect(rows).toHaveLength(32);
    expect(new Set(rows.map((row) => row.operationId)).size).toBe(32);
    expect(new Set(rows.map((row) => row.contractId)).size).toBe(25);
    expect(rows.every((row) => row.evidence === "DIRECT_BEHAVIORAL / PASS")).toBe(
      true,
    );
  });

  it("matches every frozen permission assignment exactly once", () => {
    const rows = operationRows();
    const ledgerPermissions = rows.map((row) => row.permissionKey).sort();
    const assignedPermissions = EXEC_003_OPERATION_ASSIGNMENTS.map(
      (operation) => operation.permissionKey,
    ).sort();

    expect(ledgerPermissions).toEqual(assignedPermissions);
  });

  it("binds each credit to an exact test name in an executable test file", () => {
    for (const row of operationRows()) {
      expect(row.testFile).toMatch(
        /^tests\/foundation\/g5-exec-003-.*\.test\.ts$/,
      );
      expect(row.testFile).not.toBe(
        "tests/foundation/g5-exec-003-contract-wiring.test.ts",
      );
      const testSource = fs.readFileSync(path.join(ROOT, row.testFile), "utf8");
      expect(
        testSource.includes(row.testName),
        `${row.operationId} must reference an exact executable test name`,
      ).toBe(true);
    }
  });

  it("records the successful PR-merge-ref evidence head without exact-head wording", () => {
    const ledger = fs.readFileSync(LEDGER_PATH, "utf8");

    expect(ledger).toContain(
      "Evidence head SHA:** `3dc4b8d865212716e5bfdb844a85e7d9c90e17ea`",
    );
    expect(ledger).toContain("ORCA CI:** `#365 / SUCCESS`");
    expect(ledger).toContain("CI checkout mode:** `PR_MERGE_REF`");
    expect(ledger).toContain(
      "CI validated the synthetic PR merge commit `0ea28c491d67fee8356f566a34861daf0b956474`",
    );
    expect(ledger).not.toContain("CI passed on the exact head SHA");
  });

  it("retains the corrected 59 to 34 accounting without same-file spillover", () => {
    const ledger = fs.readFileSync(LEDGER_PATH, "utf8");

    expect(ledger).toContain("Test gaps: 59 → 34");
    expect(ledger).toContain("P0 remaining: 0");
    expect(ledger).toContain("P1 mutation remaining: 0");
    expect(ledger).toContain("P1 sensitive read remaining: 0");
    expect(ledger).toContain("Out-of-scope contracts credited: 0");
  });
});
