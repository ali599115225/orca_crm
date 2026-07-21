import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SCRIPT = join(ROOT, "scripts/g7-remediation-reconciliation.mjs");
const OUTPUT = join(ROOT, "artifacts/g7-remediation-reconciliation.json");
const POLICY = join(ROOT, "ORCA_G7_REMEDIATION_POLICY.json");
const PLAN_ADDENDUM = join(ROOT, "ORCA_CENTRAL_BASELINE_PLAN_ADDENDUM.md");
const REGISTER = join(ROOT, "docs/architecture/ORCA_G7_REMEDIATION_REGISTER.md");
const WORKFLOW = join(ROOT, ".github/workflows/orca-ci.yml");
const PACKAGE = join(ROOT, "package.json");

interface G7Item {
  id: string;
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status:
    | "CLOSED"
    | "DEFERRED_WITH_APPROVAL"
    | "OUT_OF_SCOPE"
    | "ACCEPTED_RESIDUAL_RISK"
    | "PRODUCTION_ACTIVATION_BLOCKER";
  owner: string;
  targetStage: string;
  evidenceRefs: string[];
  sourceKind?: string;
  sourceStatus?: string;
}

interface G7Result {
  schemaVersion: number;
  repositoryStatus: "PASS" | "FAIL";
  reconciliationStatus: "RECONCILED" | "BLOCKED";
  g8TransitionAllowed: boolean;
  productionLaunchAuthorized: boolean;
  summary: {
    curatedItems: number;
    generatedVisualItems: number;
    totalItems: number;
    directTestGaps: number;
    highPriorityDirectTestGaps: number;
    lowerPriorityDirectTestGaps: number;
    productionActivationBlockers: number;
    unownedHighPriorityItems: number;
    blockingFindings: number;
  };
  byStatus: Record<string, number>;
  stageEvidence: Array<{ stage: string; closed: boolean }>;
  blockingFindings: unknown[];
  items: G7Item[];
}

let cached: G7Result | null = null;

function runG7(): G7Result {
  if (cached) return cached;
  execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, stdio: "pipe" });
  cached = JSON.parse(readFileSync(OUTPUT, "utf8")) as G7Result;
  return cached;
}

describe("G7 — remediation reconciliation and closure", () => {
  it("completes the formal G0 through G8 execution map and forbids skipping G7", () => {
    const addendum = readFileSync(PLAN_ADDENDUM, "utf8");

    for (const gate of ["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"]) {
      expect(addendum).toContain(`${gate} —`);
    }
    expect(addendum).toContain("يمنع القفز من G6 إلى G8");
    expect(addendum).toContain("G7 — Remediation Reconciliation & Closure");
    expect(addendum).toContain("G8 — Final Foundation Gate");
  });

  it("reconciles every item into an allowed terminal decision with owner and evidence", () => {
    const result = runG7();
    const allowed = new Set([
      "CLOSED",
      "DEFERRED_WITH_APPROVAL",
      "OUT_OF_SCOPE",
      "ACCEPTED_RESIDUAL_RISK",
      "PRODUCTION_ACTIVATION_BLOCKER",
    ]);

    expect(result.schemaVersion).toBe(1);
    expect(result.repositoryStatus).toBe("PASS");
    expect(result.reconciliationStatus).toBe("RECONCILED");
    expect(result.blockingFindings).toEqual([]);
    expect(result.summary.blockingFindings).toBe(0);

    const ids = new Set<string>();
    for (const item of result.items) {
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
      expect(allowed.has(item.status)).toBe(true);
      expect(item.owner.trim().length).toBeGreaterThan(0);
      expect(item.targetStage.trim().length).toBeGreaterThan(0);
      expect(item.evidenceRefs.length).toBeGreaterThan(0);
    }
  });

  it("requires G3 through G6 to remain closed before allowing G8", () => {
    const result = runG7();

    expect(result.stageEvidence.map((stage) => stage.stage)).toEqual([
      "G3",
      "G4",
      "G5",
      "G6",
    ]);
    expect(result.stageEvidence.every((stage) => stage.closed)).toBe(true);
    expect(result.g8TransitionAllowed).toBe(true);
    expect(result.productionLaunchAuthorized).toBe(false);
  });

  it("carries all direct-test gaps without hiding P0 or P1 release risk", () => {
    const result = runG7();
    const p0p1 = result.items.find((item) => item.id === "G7-TEST-001");
    const lower = result.items.find((item) => item.id === "G7-TEST-002");

    expect(result.summary.directTestGaps).toBe(59);
    expect(result.summary.highPriorityDirectTestGaps).toBe(25);
    expect(result.summary.lowerPriorityDirectTestGaps).toBe(34);
    expect(p0p1?.status).toBe("PRODUCTION_ACTIVATION_BLOCKER");
    expect(p0p1?.severity).toBe("CRITICAL");
    expect(lower?.status).toBe("DEFERRED_WITH_APPROVAL");
  });

  it("expands all 37 open G4 visual contracts into owned remediation records", () => {
    const result = runG7();
    const children = result.items.filter((item) => item.id.startsWith("G7-VISUAL-") && item.sourceKind);

    expect(result.summary.generatedVisualItems).toBe(37);
    expect(children).toHaveLength(37);
    expect(children.every((item) => item.status === "DEFERRED_WITH_APPROVAL")).toBe(true);
    expect(children.every((item) => item.owner === "Product / UI")).toBe(true);
    expect(new Set(children.map((item) => item.sourceKind))).toEqual(
      new Set(["PAGE", "TAB_SET", "OVERLAY"]),
    );
  });

  it("retains Production-only work as explicit activation blockers", () => {
    const result = runG7();
    const requiredBlockers = [
      "G7-ARCH-002",
      "G7-TEST-001",
      "G7-OPS-002",
      "G7-INTEGRATION-001",
      "G7-E2E-001",
      "G7-RELEASE-001",
    ];

    expect(result.summary.productionActivationBlockers).toBe(requiredBlockers.length);
    for (const id of requiredBlockers) {
      const item = result.items.find((candidate) => candidate.id === id);
      expect(item?.status).toBe("PRODUCTION_ACTIVATION_BLOCKER");
      expect(item?.owner.trim().length).toBeGreaterThan(0);
    }
    expect(result.summary.unownedHighPriorityItems).toBe(0);
  });

  it("binds the policy, register, command, CI artifacts, and executable tests", () => {
    const policy = JSON.parse(readFileSync(POLICY, "utf8")) as {
      schemaVersion: number;
      items: unknown[];
    };
    const register = readFileSync(REGISTER, "utf8");
    const workflow = readFileSync(WORKFLOW, "utf8");
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(policy.schemaVersion).toBe(1);
    expect(policy.items.length).toBeGreaterThanOrEqual(20);
    expect(register).toContain("G8 may begin only when");
    expect(packageJson.scripts["g7:reconcile"]).toContain(
      "g7-remediation-reconciliation.mjs",
    );
    expect(workflow).toContain("G7 remediation reconciliation");
    expect(workflow).toContain("g7-remediation-reconciliation-evidence");
    expect(workflow).toContain("tests/foundation/g7-*.test.ts");
  });
});
