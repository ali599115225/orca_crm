import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SCRIPT = join(ROOT, "scripts", "prisma-production-migration-chain-guard.mjs");

function runGuard(root = ROOT): string {
  return execFileSync(process.execPath, [SCRIPT], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ORCA_MIGRATION_CHAIN_ROOT: root },
  });
}

describe("Prisma production migration deploy-chain quarantine", () => {
  it("keeps exactly the approved production deploy chain and verifies all 13 evidence blobs", () => {
    const output = runGuard();
    const result = JSON.parse(output) as {
      verdict: string;
      productionMigrationCount: number;
      allowedProductionMigrationCount: number;
      quarantinedMigrationCount: number;
      evidence: Array<{ match: boolean }>;
      errors: string[];
    };

    expect(result.verdict).toBe("PASS");
    expect(result.productionMigrationCount).toBe(9);
    expect(result.allowedProductionMigrationCount).toBe(9);
    expect(result.quarantinedMigrationCount).toBe(13);
    expect(result.evidence).toHaveLength(13);
    expect(result.evidence.every((entry) => entry.match)).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("fails closed if a quarantined migration re-enters prisma/migrations", () => {
    const sandbox = mkdtempSync(join(tmpdir(), "orca-migration-chain-"));
    try {
      cpSync(join(ROOT, "prisma", "migrations"), join(sandbox, "prisma", "migrations"), { recursive: true });
      cpSync(
        join(ROOT, "prisma", "migration-evidence", "non-production"),
        join(sandbox, "prisma", "migration-evidence", "non-production"),
        { recursive: true },
      );
      const reintroduced = join(
        sandbox,
        "prisma",
        "migrations",
        "20260727090000_exec_007_exact_scope_foundation",
      );
      mkdirSync(reintroduced, { recursive: true });
      writeFileSync(join(reintroduced, "migration.sql"), "-- forbidden re-entry\n", "utf8");

      expect(() => runGuard(sandbox)).toThrow();
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
