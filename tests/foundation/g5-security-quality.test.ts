import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const scripts = {
  g4Inventory: join(ROOT, "scripts/g4-contract-inventory.mjs"),
  g4Normalize: join(ROOT, "scripts/g4-contract-normalize.mjs"),
  g4Reconcile: join(ROOT, "scripts/g4-contract-reconcile.mjs"),
  g5Inventory: join(ROOT, "scripts/g5-security-quality-inventory.mjs"),
};
const g5Path = join(ROOT, "artifacts/g5-security-quality-inventory.json");
const packagePath = join(ROOT, "package.json");
const workflowPath = join(ROOT, ".github/workflows/orca-ci.yml");
const registerPath = join(ROOT, "docs/architecture/ORCA_G5_SECURITY_QUALITY_REGISTER.md");

interface G5Finding {
  id: string;
  severity: string;
  path: string;
}

interface G5Contract {
  priority: string;
  id: string;
}

interface ApiEvidence {
  route: string;
  status: string;
}

interface DependencySpec {
  name: string;
  spec: string;
  classification: string;
}

interface G5Inventory {
  schemaVersion: number;
  summary: {
    g4Contracts: number;
    unprovenContracts: number;
    unprovenByPriority: Record<string, number>;
    apiRoutes: number;
    apiAuthEvidenceByStatus: Record<string, number>;
    runtimeRiskFindings: number;
    testSignals: {
      skipped: number;
      focused: number;
      todo: number;
    };
    controls: {
      codeql: boolean;
      dependabot: boolean;
      lockfile: boolean;
      typecheckScript: boolean;
      auditScript: boolean;
    };
  };
  dependencySpecs: DependencySpec[];
  unprovenContracts: G5Contract[];
  apiAuthEvidence: ApiEvidence[];
  runtimeRiskFindings: G5Finding[];
  toolingRiskSignals: G5Finding[];
}

let cached: G5Inventory | null = null;

function rebuildInventory(): G5Inventory {
  if (cached) return cached;
  for (const script of [
    scripts.g4Inventory,
    scripts.g4Normalize,
    scripts.g4Reconcile,
    scripts.g5Inventory,
  ]) {
    execFileSync(process.execPath, [script], { cwd: ROOT, stdio: "pipe" });
  }
  cached = JSON.parse(readFileSync(g5Path, "utf8")) as G5Inventory;
  return cached;
}

describe("G5 — Security and quality gate", () => {
  it("classifies every G4 contract without direct test evidence", () => {
    const inventory = rebuildInventory();

    expect(inventory.schemaVersion).toBe(2);
    expect(inventory.summary.g4Contracts).toBe(359);
    expect(inventory.summary.unprovenContracts).toBe(34);
    expect(inventory.unprovenContracts).toHaveLength(34);
    expect(inventory.summary.unprovenByPriority).toEqual({
      P2_READ_SURFACE: 16,
      P3_UI_SURFACE: 16,
      P4_SOURCE_STATE: 2,
    });
    expect(
      inventory.unprovenContracts.every(
        (contract) => contract.id && contract.priority,
      ),
    ).toBe(true);
  });

  it("records direct evidence for every EXEC-003 P0/P1 frozen contract", () => {
    const inventory = rebuildInventory();
    expect(inventory.summary.unprovenByPriority).not.toHaveProperty(
      "P0_SECURITY_CRITICAL_SURFACE",
    );
    expect(inventory.summary.unprovenByPriority).not.toHaveProperty(
      "P1_MUTATION_SURFACE",
    );
    expect(inventory.summary.unprovenByPriority).not.toHaveProperty(
      "P1_SENSITIVE_READ_SURFACE",
    );
  });

  it("rejects unreviewed high or critical runtime findings", () => {
    const inventory = rebuildInventory();
    const blocking = inventory.runtimeRiskFindings.filter((finding) =>
      ["CRITICAL", "HIGH"].includes(finding.severity),
    );

    expect(blocking).toEqual([]);
    expect(inventory.runtimeRiskFindings).toEqual([
      expect.objectContaining({
        id: "STATIC_DANGEROUS_HTML",
        severity: "LOW",
        path: "app/login/LoginClient.tsx",
      }),
    ]);
    expect(
      inventory.runtimeRiskFindings.some(
        (finding) => finding.id === "INSECURE_RANDOM_SECURITY_CONTEXT",
      ),
    ).toBe(false);
  });

  it("records a security boundary for all APIs", () => {
    const inventory = rebuildInventory();

    expect(inventory.summary.apiRoutes).toBe(129);
    expect(
      inventory.summary.apiAuthEvidenceByStatus.AUTH_EVIDENCE_NOT_DETECTED ?? 0,
    ).toBe(0);
    expect(inventory.apiAuthEvidence).toHaveLength(129);
    expect(
      inventory.apiAuthEvidence.every(
        (api) => api.status !== "AUTH_EVIDENCE_NOT_DETECTED",
      ),
    ).toBe(true);
  });

  it("enforces stable dependency and test controls", () => {
    const inventory = rebuildInventory();
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
      overrides: Record<string, string>;
      engines: { node: string };
    };

    expect(
      inventory.dependencySpecs.filter(
        (dependency) => dependency.classification === "UNBOUNDED",
      ),
    ).toEqual([]);
    expect(inventory.summary.testSignals).toMatchObject({
      skipped: 0,
      focused: 0,
      todo: 0,
    });
    expect(inventory.summary.controls).toMatchObject({
      codeql: true,
      dependabot: true,
      lockfile: true,
      typecheckScript: true,
      auditScript: true,
    });

    expect(packageJson.dependencies).toMatchObject({
      next: "16.2.11",
      react: "18.3.1",
      "react-dom": "18.3.1",
      "@sentry/nextjs": "10.67.0",
    });
    expect(packageJson.devDependencies.typescript).toBe("6.0.3");
    expect(packageJson.overrides).toMatchObject({
      "brace-expansion": "5.0.8",
      postcss: "$postcss",
    });
    expect(packageJson.scripts.typecheck).toBe("tsc --noEmit");
    expect(packageJson.scripts["security:audit"]).toContain(
      "npm audit --omit=dev",
    );
    expect(packageJson.engines.node).toBe("24.x");
  });

  it("binds the executable gate to CI and the durable risk register", () => {
    const workflow = readFileSync(workflowPath, "utf8");
    const register = readFileSync(registerPath, "utf8");

    expect(workflow).toContain('node-version: "24"');
    expect(workflow).toContain("npm run security:audit");
    expect(workflow).toContain("npm run typecheck");
    expect(workflow).toContain("tests/foundation/g5-*.test.ts");
    expect(register).toContain(
      "Contracts without a direct current test reference: **34**",
    );
    expect(register).toContain("EXEC-003 v2 direct evidence: **25 contracts**");
    expect(register).toContain("ACCEPTED_LOW_STATIC");
    expect(register).toContain("brace-expansion");
    expect(register).toContain("postcss");
  });
});
