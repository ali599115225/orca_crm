import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const REGISTRY = path.join(
  ROOT,
  "docs/zero-based/Z8/ORCA_Z8_EXECUTION_PACKAGE_REGISTRY.json",
);
const IDENTITY = path.join(
  ROOT,
  "docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_IDENTITY.json",
);
const SCRIPT = path.join(ROOT, "scripts/exec-003-registry-reconcile.mjs");

type PackageRecord = {
  packageId: string;
  state: string;
  [key: string]: unknown;
};

type Registry = {
  summary: Record<string, number>;
  packages: PackageRecord[];
  [key: string]: unknown;
};

type ReconcileModule = {
  reconcileExec003Registry(
    input: Registry,
    identity: Record<string, unknown>,
  ): Registry;
};

function readRegistry(): Registry {
  return JSON.parse(fs.readFileSync(REGISTRY, "utf8")) as Registry;
}

function readIdentity(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(IDENTITY, "utf8")) as Record<
    string,
    unknown
  >;
}

async function loadReconciler(): Promise<ReconcileModule> {
  return (await import(
    `${pathToFileURL(SCRIPT).href}?registry-test=${Date.now()}`
  )) as ReconcileModule;
}

function nonExec003States(registry: Registry): Record<string, string> {
  return Object.fromEntries(
    registry.packages
      .filter((packageRecord) => packageRecord.packageId !== "EXEC-003")
      .map((packageRecord) => [packageRecord.packageId, packageRecord.state]),
  );
}

function countState(registry: Registry, state: string): number {
  return registry.packages.filter(
    (packageRecord) => packageRecord.state === state,
  ).length;
}

describe("EXEC-003 v2 execution-package registry reconciliation", () => {
  it("matches the deterministic EXEC-003-only reconciliation", () => {
    execFileSync(process.execPath, [SCRIPT, "--check"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
    });
  });

  it("keeps EXEC-003 closed and derives summary counts from current package states", () => {
    const registry = readRegistry();
    const exec003 = registry.packages.find(
      (packageRecord) => packageRecord.packageId === "EXEC-003",
    );

    expect(exec003?.state).toBe("CLOSED");
    expect(registry).toMatchObject({
      summary: {
        registeredPackages: 14,
        coveredGapIds: 32,
        closed: countState(registry, "CLOSED"),
        ownerDecisionPending: countState(
          registry,
          "OWNER_DECISION_PENDING",
        ),
        inExecution: countState(registry, "IN_EXECUTION"),
      },
    });
  });

  it.each([
    ["EXEC-004", "OWNER_DECISION_PENDING"],
    ["EXEC-005", "CLOSED"],
    ["EXEC-012", "DEFERRED"],
  ])(
    "preserves later-package state %s=%s while reconciling EXEC-003",
    async (packageId, state) => {
      const reconciler = await loadReconciler();
      const synthetic = structuredClone(readRegistry());
      const target = synthetic.packages.find(
        (packageRecord) => packageRecord.packageId === packageId,
      );
      if (!target) throw new Error(`${packageId} missing from synthetic registry`);
      target.state = state;
      const before = nonExec003States(synthetic);

      const reconciled = reconciler.reconcileExec003Registry(
        synthetic,
        readIdentity(),
      );

      expect(nonExec003States(reconciled)).toEqual(before);
      expect(
        reconciled.packages.find(
          (packageRecord) => packageRecord.packageId === "EXEC-003",
        )?.state,
      ).toBe("CLOSED");
    },
  );
});
