import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const REGISTRY = path.join(
  ROOT,
  "docs/zero-based/Z8/ORCA_Z8_EXECUTION_PACKAGE_REGISTRY.json",
);
const SCRIPT = path.join(ROOT, "scripts/exec-003-registry-reconcile.mjs");

type Registry = {
  packages: Array<{
    packageId: string;
    state: string;
    [key: string]: unknown;
  }>;
};

function readRegistry(): Registry {
  return JSON.parse(fs.readFileSync(REGISTRY, "utf8")) as Registry;
}

describe("EXEC-003 v2 execution-package registry reconciliation", () => {
  it("matches the deterministic EXEC-003-only reconciliation", () => {
    execFileSync(process.execPath, [SCRIPT, "--check"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
    });
  });

  it("closes EXEC-003, preserves every later package state, and keeps EXEC-004 pending", () => {
    const registry = readRegistry();
    const states = Object.fromEntries(
      registry.packages.map((packageRecord) => [
        packageRecord.packageId,
        packageRecord.state,
      ]),
    );

    expect(registry).toMatchObject({
      summary: { registeredPackages: 14, coveredGapIds: 32, inExecution: 0 },
    });

    expect(states).toMatchObject({
      "EXEC-001": "CLOSED",
      "EXEC-002": "CLOSED",
      "EXEC-003": "CLOSED",
      "EXEC-004": "OWNER_DECISION_PENDING",
      "EXEC-005": "OWNER_DECISION_PENDING",
      "EXEC-006": "OWNER_DECISION_PENDING",
      "EXEC-007": "OWNER_DECISION_PENDING",
      "EXEC-008": "OWNER_DECISION_PENDING",
      "EXEC-009": "OWNER_DECISION_PENDING",
      "EXEC-010": "OWNER_DECISION_PENDING",
      "EXEC-011": "OWNER_DECISION_PENDING",
      "EXEC-012": "BLOCKED",
      "EXEC-013": "BLOCKED",
      "EXEC-014": "BLOCKED",
    });
  });
});
