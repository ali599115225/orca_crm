import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const inventoryScript = join(ROOT, "scripts/g6-operational-reliability-inventory.mjs");
const backupScript = join(ROOT, "scripts/g6-backup-plan.mjs");
const restoreScript = join(ROOT, "scripts/g6-restore-drill.mjs");
const inventoryPath = join(ROOT, "artifacts/g6-operational-reliability-inventory.json");
const packagePath = join(ROOT, "package.json");
const workflowPath = join(ROOT, ".github/workflows/orca-ci.yml");
const registerPath = join(ROOT, "docs/architecture/ORCA_G6_OPERATIONS_RECOVERY_REGISTER.md");
const runbookPath = join(ROOT, "docs/runbooks/ORCA_G6_BACKUP_RESTORE_RUNBOOK.md");
const legacyBackupPath = join(ROOT, "scripts/backup-db.sh");

interface CronContract {
  route: string;
  scheduled: boolean;
  authEvidence: string[];
  testRefs: string[];
  status: string;
}

interface HealthContract {
  route: string;
  exists: boolean;
  noStore: boolean;
  databaseProbe: boolean;
}

interface G6Inventory {
  schemaVersion: number;
  summary: {
    scheduledCrons: number;
    cronRoutes: number;
    scheduledCronContractsReady: number;
    healthContracts: number;
    healthContractsPresent: number;
    blockingFindings: number;
  };
  cronContracts: CronContract[];
  healthContracts: HealthContract[];
  findings: Array<{ id: string; severity: string; path: string }>;
  historicalEvidencePolicy: {
    archiveReportsAreAuthoritative: boolean;
  };
}

let cached: G6Inventory | null = null;

function rebuildInventory(): G6Inventory {
  if (cached) return cached;
  execFileSync(process.execPath, [inventoryScript], { cwd: ROOT, stdio: "pipe" });
  cached = JSON.parse(readFileSync(inventoryPath, "utf8")) as G6Inventory;
  return cached;
}

function plan(script: string, args: string[] = []) {
  return JSON.parse(
    execFileSync(process.execPath, [script, ...args], {
      cwd: ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        ORCA_G6_BACKUP_EXECUTE: "",
        ORCA_G6_RESTORE_EXECUTE: "",
        ORCA_G6_CHANGE_APPROVED: "",
      },
    }),
  ) as {
    mode: string;
    safety: Record<string, unknown>;
  };
}

describe("G6 — Operations, recovery, and reliability gate", () => {
  it("records every scheduled Cron with route, authentication, and test evidence", () => {
    const inventory = rebuildInventory();
    const scheduled = inventory.cronContracts.filter((cron) => cron.scheduled);

    expect(inventory.schemaVersion).toBe(1);
    expect(inventory.summary.scheduledCrons).toBe(6);
    expect(inventory.summary.cronRoutes).toBeGreaterThanOrEqual(8);
    expect(inventory.summary.scheduledCronContractsReady).toBe(6);
    expect(scheduled).toHaveLength(6);
    expect(
      scheduled.every(
        (cron) =>
          cron.status === "READY" &&
          cron.authEvidence.length > 0 &&
          cron.testRefs.length > 0,
      ),
    ).toBe(true);
  });

  it("retains liveness, readiness, deployment identity, and compatibility health contracts", () => {
    const inventory = rebuildInventory();

    expect(inventory.summary.healthContracts).toBe(4);
    expect(inventory.summary.healthContractsPresent).toBe(4);
    expect(inventory.healthContracts.every((health) => health.exists)).toBe(true);
    expect(inventory.healthContracts.find((health) => health.route === "/api/health/live")?.noStore).toBe(true);
    expect(inventory.healthContracts.find((health) => health.route === "/api/health/ready")?.databaseProbe).toBe(true);
  });

  it("keeps backup and restore commands plan-only by default", () => {
    const backupPlan = plan(backupScript, ["--type", "manual"]);
    const restorePlan = plan(restoreScript, ["--backup-file", "artifacts/example.dump"]);

    expect(backupPlan.mode).toBe("PLAN_ONLY");
    expect(backupPlan.safety).toMatchObject({
      localArchiveDeletion: false,
      shellInterpolation: false,
    });
    expect(restorePlan.mode).toBe("PLAN_ONLY");
    expect(restorePlan.safety).toMatchObject({
      productionPolicy: "REFUSE_PRODUCTION_RESTORE",
      sourceTargetEqualityRefused: true,
      destructiveCleanOption: false,
      shellInterpolation: false,
    });
  });

  it("removes destructive behavior from the legacy backup entrypoint", () => {
    const wrapper = readFileSync(legacyBackupPath, "utf8");

    expect(wrapper).toContain("g6-backup-plan.mjs");
    expect(wrapper).not.toContain("pg_dump");
    expect(wrapper).not.toMatch(/\brm\s+-f\b/);
    expect(wrapper).not.toContain("aws s3 rm");
  });

  it("rejects contradictory archive reports as current execution evidence", () => {
    const inventory = rebuildInventory();
    const register = readFileSync(registerPath, "utf8");
    const runbook = readFileSync(runbookPath, "utf8");

    expect(inventory.historicalEvidencePolicy.archiveReportsAreAuthoritative).toBe(false);
    expect(register).toContain("Historical reports under `docs/reports/archive/` are context only");
    expect(register).toContain("**Production restore:** prohibited");
    expect(runbook).toContain("ORCA_G6_RESTORE_CONFIRM=RESTORE_NON_PRODUCTION");
    expect(runbook).toContain("Stop conditions");
  });

  it("binds G6 inventory and isolated recovery drill evidence to CI", () => {
    const inventory = rebuildInventory();
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
      scripts: Record<string, string>;
    };
    const workflow = readFileSync(workflowPath, "utf8");

    expect(inventory.summary.blockingFindings).toBe(0);
    expect(inventory.findings.filter((finding) => finding.severity === "BLOCKING")).toEqual([]);
    expect(packageJson.scripts["g6:inventory"]).toContain("g6-operational-reliability-inventory.mjs");
    expect(packageJson.scripts["g6:backup"]).toContain("g6-backup-plan.mjs");
    expect(packageJson.scripts["g6:restore-drill"]).toContain("g6-restore-drill.mjs");
    expect(workflow).toContain("G6 operational reliability inventory");
    expect(workflow).toContain("tests/foundation/g6-*.test.ts");
    expect(workflow).toContain("g6-recovery-drill");
    expect(workflow).toContain("g6_recovery_probe");
  });
});
