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

const EXPECTED_STATES = {
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
} as const;

const EXPECTED_SUMMARY = {
  registeredPackages: 14,
  closed: 3,
  evidenceReady: 0,
  ownerDecisionPending: 8,
  deferredOrBlocked: 3,
  inExecution: 0,
  coveredGapIds: 32,
} as const;

type Registry = {
  summary: Record<string, number>;
  packages: Array<{
    packageId: string;
    state: string;
    closure?: Record<string, unknown>;
    directEvidence?: Record<string, unknown>;
    [key: string]: unknown;
  }>;
};

function readRegistry(): Registry {
  return JSON.parse(fs.readFileSync(REGISTRY, "utf8")) as Registry;
}

describe("EXEC-003 v2 execution-package closure reconciliation", () => {
  it("matches the deterministic closed-package reconciliation", () => {
    execFileSync(process.execPath, [SCRIPT, "--check"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
    });
  });

  it("pins the complete package state matrix and closure summary", () => {
    const registry = readRegistry();
    const states = Object.fromEntries(
      registry.packages.map((packageRecord) => [
        packageRecord.packageId,
        packageRecord.state,
      ]),
    );

    expect(states).toEqual(EXPECTED_STATES);
    expect(registry.summary).toEqual(EXPECTED_SUMMARY);
    expect(states["EXEC-003"]).not.toBe("IN_EXECUTION");
    expect(states["EXEC-004"]).toBe("OWNER_DECISION_PENDING");
  });

  it("pins PR #108, central merge, CI #453 and accepted evidence accounting", () => {
    const exec003 = readRegistry().packages.find(
      (packageRecord) => packageRecord.packageId === "EXEC-003",
    );
    expect(exec003).toBeDefined();
    expect(exec003?.closure).toMatchObject({
      pullRequest: 108,
      finalHeadSha: "abc43ab5e1a76b5f2d99f5deb0f5d1e35451a618",
      centralMergeSha: "b0369b50eb2d49001e5322eea90b3b6dae22a882",
      orcaCi: "SUCCESS",
      orcaCiRun: 453,
      validatedImplementationHead:
        "d17acb09354a54aee7946b6de8e67a2a9b55fbd5",
      directContracts: 25,
      directOperations: 32,
      remainingGap: 34,
      g5Tests: "200/200",
      runtimeDefectsRemaining: 0,
      vercelValidation: "SKIP_BY_DEFAULT",
    });
    expect(exec003?.directEvidence).toMatchObject({
      creditedFrozenContracts: 25,
      directlyTestedOperations: 32,
      remainingUnprovenContracts: 34,
      runtimeSecurityDefectsRemaining: 0,
      g5Tests: "200/200",
      status: "SUCCESS / CLOSED",
    });
  });
});
