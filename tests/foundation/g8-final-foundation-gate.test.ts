import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SCRIPT = join(ROOT, "scripts/g8-final-foundation-gate.mjs");
const OUTPUT = join(ROOT, "artifacts/g8-final-foundation-gate.json");
const LEDGER = join(ROOT, "ORCA_FOUNDATION_STAGE_LEDGER.json");
const CENTRAL_REPORT = join(ROOT, "ORCA_CENTRAL_BASELINE_REPORT.md");
const GATE_CONTRACT = join(
  ROOT,
  "docs/architecture/ORCA_G8_FINAL_FOUNDATION_GATE.md",
);
const FINAL_REPORT = join(
  ROOT,
  "docs/reports/foundation/ORCA_G8_FINAL_CLOSURE.md",
);
const ACTIVATION_EVIDENCE = join(
  ROOT,
  "docs/reports/activation/ORCA_PRODUCTION_ACTIVATION_EVIDENCE.json",
);
const PACKAGE = join(ROOT, "package.json");
const WORKFLOW = join(ROOT, ".github/workflows/orca-ci.yml");

interface ReleaseCondition {
  id: string;
  status: "VERIFIED" | "UNVERIFIED";
  owner: string;
  requiredChecks: string[];
  missingChecks: string[];
}

interface GateResult {
  schemaVersion: number;
  g8RepositoryStageResult: "PASS / CLOSED" | "FAIL / OPEN";
  repositoryFoundationVerdict: "GO" | "NO_GO";
  productionLaunchVerdict: "GO" | "CONDITIONAL_GO" | "NO_GO";
  productionGoAuthorized: boolean;
  automaticProductionActionAuthorized: boolean;
  ownerReleaseInstructionRequired: boolean;
  nextAuthorizedState: string;
  operatingModel: string;
  integrationOwnership: string;
  stageLedger: Array<{
    id: string;
    status: string;
    evidenceRefs: string[];
    closureBasis: string;
  }>;
  repositoryBlockers: unknown[];
  releaseConditions: ReleaseCondition[];
  activationEvidence: {
    exists: boolean;
    valid: boolean;
    path: string;
    missingOrInvalid: string[];
  };
  evidenceSummary: {
    priorStagesClosed: number;
    expectedPriorStages: number;
    g7TotalDecisions: number;
    g7VisualDecisions: number;
    directTestGaps: number;
    p0p1DirectTestGaps: number;
    lowerPriorityDirectTestGaps: number;
    productionBlockerCategories: number;
    unownedHighPriorityItems: number;
    reconciliationBlockers: number;
    apiRoutesClassified: number;
    scheduledCronContractsReady: number;
    healthContractsPresent: number;
  };
}

let cached: GateResult | null = null;

function runGate(): GateResult {
  if (cached) return cached;
  execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, stdio: "pipe" });
  cached = JSON.parse(readFileSync(OUTPUT, "utf8")) as GateResult;
  return cached;
}

describe("G8 — final foundation gate", () => {
  it("requires the complete G0 through G8 ledger and eight closed prior stages", () => {
    const decision = runGate();
    const ledger = JSON.parse(readFileSync(LEDGER, "utf8")) as {
      schemaVersion: number;
      stages: Array<{ id: string; status: string }>;
    };

    expect(ledger.schemaVersion).toBe(1);
    expect(ledger.stages.map((stage) => stage.id)).toEqual([
      "G0",
      "G1",
      "G2",
      "G3",
      "G4",
      "G5",
      "G6",
      "G7",
      "G8",
    ]);
    expect(
      ledger.stages.slice(0, 8).every((stage) => stage.status === "PASS / CLOSED"),
    ).toBe(true);
    expect(decision.evidenceSummary.priorStagesClosed).toBe(8);
    expect(decision.evidenceSummary.expectedPriorStages).toBe(8);
  });

  it("closes G8 at repository level while returning CONDITIONAL_GO for Production", () => {
    const decision = runGate();

    expect(decision.schemaVersion).toBe(1);
    expect(decision.g8RepositoryStageResult).toBe("PASS / CLOSED");
    expect(decision.repositoryFoundationVerdict).toBe("GO");
    expect(decision.productionLaunchVerdict).toBe("CONDITIONAL_GO");
    expect(decision.productionGoAuthorized).toBe(false);
    expect(decision.automaticProductionActionAuthorized).toBe(false);
    expect(decision.ownerReleaseInstructionRequired).toBe(true);
    expect(decision.nextAuthorizedState).toBe("CONTROLLED_ACTIVATION_PLANNING_ONLY");
    expect(decision.repositoryBlockers).toEqual([]);
  });

  it("consumes the closed G7 register without losing counts or ownership", () => {
    const decision = runGate();

    expect(decision.evidenceSummary).toEqual({
      priorStagesClosed: 8,
      expectedPriorStages: 8,
      g7TotalDecisions: 58,
      g7VisualDecisions: 37,
      directTestGaps: 59,
      p0p1DirectTestGaps: 25,
      lowerPriorityDirectTestGaps: 34,
      productionBlockerCategories: 6,
      unownedHighPriorityItems: 0,
      reconciliationBlockers: 0,
      apiRoutesClassified: 129,
      scheduledCronContractsReady: 6,
      healthContractsPresent: 4,
    });
  });

  it("keeps all six Production activation groups unverified while evidence is absent", () => {
    const decision = runGate();

    expect(existsSync(ACTIVATION_EVIDENCE)).toBe(false);
    expect(decision.activationEvidence.exists).toBe(false);
    expect(decision.activationEvidence.valid).toBe(false);
    expect(decision.activationEvidence.path).toBe(
      "docs/reports/activation/ORCA_PRODUCTION_ACTIVATION_EVIDENCE.json",
    );
    expect(decision.releaseConditions).toHaveLength(6);
    expect(
      decision.releaseConditions.every(
        (condition) =>
          condition.status === "UNVERIFIED" &&
          condition.owner.trim().length > 0 &&
          condition.requiredChecks.length > 0 &&
          condition.missingChecks.length === condition.requiredChecks.length,
      ),
    ).toBe(true);
  });

  it("retains the single-company and company-owned provider decisions", () => {
    const decision = runGate();
    const central = readFileSync(CENTRAL_REPORT, "utf8");

    expect(decision.operatingModel).toBe("SINGLE_INDEPENDENT_COMPANY");
    expect(decision.integrationOwnership).toBe("COMPANY_OWNER");
    expect(central).toContain("VERIFIED — SINGLE INDEPENDENT COMPANY");
    expect(central).toContain("COMPANY OWNER");
    expect(central).toContain("Developer-owned Production credentials");
  });

  it("requires activation references without allowing credentials or sensitive values", () => {
    const contract = readFileSync(GATE_CONTRACT, "utf8");
    const finalReport = readFileSync(FINAL_REPORT, "utf8");
    const central = readFileSync(CENTRAL_REPORT, "utf8");

    for (const content of [contract, finalReport, central]) {
      expect(content).toContain(
        "docs/reports/activation/ORCA_PRODUCTION_ACTIVATION_EVIDENCE.json",
      );
      expect(content).toContain("CONDITIONAL_GO");
      expect(content).toContain("CONTROLLED_ACTIVATION_PLANNING_ONLY");
    }
    expect(contract).toContain("Sensitive-evidence prohibition");
    expect(contract).toContain("A separate explicit owner instruction remains mandatory");
    expect(finalReport).toContain("Automatic Production action authorized:** no");
  });

  it("binds the executable G8 decision and evidence artifacts to permanent CI", () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8")) as {
      scripts: Record<string, string>;
    };
    const workflow = readFileSync(WORKFLOW, "utf8");

    expect(packageJson.scripts["g8:gate"]).toContain(
      "g8-final-foundation-gate.mjs",
    );
    expect(workflow).toContain("G8 final foundation gate");
    expect(workflow).toContain("g8-final-foundation-evidence");
    expect(workflow).toContain("tests/foundation/g8-*.test.ts");
    expect(workflow).toContain("ORCA_CENTRAL_BASELINE_REPORT.md");
  });
});
