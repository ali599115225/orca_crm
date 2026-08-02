import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

export const EXEC007_EXACT_AUTHORIZED_PATHS = new Set<string>([
  ".github/workflows/exec-007-migration-validation.yml",
  "lib/customer-portal/challenge.ts",
  "lib/customer-portal/contracts.ts",
  "lib/customer-portal/cookies.ts",
  "lib/customer-portal/provider-adapter.ts",
  "lib/customer-portal/session.ts",
  "lib/exec-007-cutover/contracts.ts",
  "lib/exec-007-cutover/legacy-guard.ts",
  "lib/offer-management/approval-contracts.ts",
  "lib/offer-management/approval.ts",
  "lib/offer-management/authority.ts",
  "lib/offer-management/canonicalization.ts",
  "lib/offer-management/contracts.ts",
  "lib/offer-management/decision-contracts.ts",
  "lib/offer-management/evidence.ts",
  "lib/offer-management/hmac.ts",
  "lib/offer-management/idempotency.ts",
  "lib/offer-management/pricing-contracts.ts",
  "lib/offer-management/pricing-policy.ts",
  "lib/offer-management/pricing-snapshot.ts",
  "lib/offer-management/security-event-access.ts",
  "lib/offer-management/state-machine.ts",
  "lib/offer-management/technical-delegation.ts",
  "lib/organization/authority.ts",
  "lib/organization/contracts.ts",
  "lib/tenant-model-policy.ts",
  "prisma/migrations/20260727090000_exec_007_exact_scope_foundation/migration.sql",
  "prisma/schema.prisma",
  "scripts/exec-007-postgres-concurrency.mjs",
  "scripts/exec-007-postgres-privacy-retention.sql",
  "tests/foundation/g5-exec-004-organization-authority.test.ts",
  "tests/foundation/g5-exec-007-acceptance.test.ts",
  "tests/foundation/g5-exec-007-approval.test.ts",
  "tests/foundation/g5-exec-007-architecture.test.ts",
  "tests/foundation/g5-exec-007-authority.test.ts",
  "tests/foundation/g5-exec-007-canonicalization.test.ts",
  "tests/foundation/g5-exec-007-customer-auth.test.ts",
  "tests/foundation/g5-exec-007-cutover-gate.test.ts",
  "tests/foundation/g5-exec-007-decimal.test.ts",
  "tests/foundation/g5-exec-007-exec006-integration.test.ts",
  "tests/foundation/g5-exec-007-final-allowlist.test.ts",
  "tests/foundation/g5-exec-007-legacy-coexistence.test.ts",
  "tests/foundation/g5-exec-007-migration.test.ts",
  "tests/foundation/g5-exec-007-offer-state.test.ts",
  "tests/foundation/g5-exec-007-preparation.test.ts",
  "tests/foundation/g5-exec-007-pricing.test.ts",
  "tests/foundation/g5-exec-007-privacy-retention.test.ts",
  "tests/foundation/g5-exec-007-retention.test.ts",
  "tests/foundation/g5-exec-007-schema-contract.test.ts",
  "tests/foundation/g5-exec-007-scope-change.test.ts",
  "tests/foundation/g5-exec-007-security-event-access.test.ts",
  "tests/foundation/g5-exec-007-security.test.ts",
  "tests/foundation/g5-exec-007-side-effect-boundary.test.ts",
  "tests/foundation/g5-exec-007-state-machine.test.ts",
  "tests/foundation/g5-exec-007-technical-delegation.test.ts",
  "tests/foundation/g5-exec-007-validity.test.ts",
  "tests/foundation/g5-exec-007-version-freeze.test.ts",
  "tests/r01-tenant-model-policy.test.ts",
  "tests/r01f-isolation-regression.test.ts",
]);

const BATCH4_EXACT_PATHS = new Set<string>([
  ".github/workflows/exec-007-migration-validation.yml",
  "lib/offer-management/pricing-contracts.ts",
  "lib/offer-management/pricing-policy.ts",
  "lib/offer-management/pricing-snapshot.ts",
  "tests/foundation/g5-exec-007-architecture.test.ts",
  "tests/foundation/g5-exec-007-exec006-integration.test.ts",
  "tests/foundation/g5-exec-007-final-allowlist.test.ts",
  "tests/foundation/g5-exec-007-offer-state.test.ts",
  "tests/foundation/g5-exec-007-pricing.test.ts",
  "tests/foundation/g5-exec-007-schema-contract.test.ts",
  "tests/foundation/g5-exec-007-scope-change.test.ts",
  "tests/foundation/g5-exec-007-security.test.ts",
  "tests/foundation/g5-exec-007-side-effect-boundary.test.ts",
]);

export function normalizeRepositoryPath(candidate: string): string | null {
  const normalized = candidate.replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) return null;
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
  return normalized;
}

export function isExactlyAuthorizedPath(candidate: string): boolean {
  const normalized = normalizeRepositoryPath(candidate);
  return normalized !== null && EXEC007_EXACT_AUTHORIZED_PATHS.has(normalized);
}

function gitPaths(range: string): string[] {
  return execFileSync("git", ["diff", "--name-only", range], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean).sort();
}

describe("EXEC-007 path-exact final allowlist gate", () => {
  it("accepts every exact governed PR path without prefix or wildcard authority", () => {
    expect(EXEC007_EXACT_AUTHORIZED_PATHS.size).toBe(59);
    for (const exactPath of EXEC007_EXACT_AUTHORIZED_PATHS) expect(isExactlyAuthorizedPath(exactPath)).toBe(true);
  });

  it("rejects unlisted, prefix-only, wildcard, case-variant, traversal and rename probes", () => {
    for (const probe of [
      "lib/offer-management/unlisted-batch4-probe.ts",
      "lib/offer-management/",
      "lib/offer-management/*",
      "Lib/offer-management/pricing-policy.ts",
      "lib/offer-management/../customer-portal/session.ts",
      "tests/foundation/g5-exec-007-unlisted.test.ts",
      "prisma/migrations/20260726160000_exec_006_unit_commitment_reservation_tours/migration.sql",
      "lib/offer-management/pricing-policy-renamed.ts",
    ]) expect(isExactlyAuthorizedPath(probe), probe).toBe(false);
  });

  it("normalizes separators but never broadens exact authority", () => {
    expect(isExactlyAuthorizedPath("lib\\offer-management\\pricing-policy.ts")).toBe(true);
    expect(isExactlyAuthorizedPath("lib\\offer-management\\unlisted-batch4-probe.ts")).toBe(false);
  });

  it("reconciles the original 74 and Batch 3 152 governed IDs as 226 unique contracts", () => {
    const testDir = path.join(process.cwd(), "tests/foundation");
    const files = fs.readdirSync(testDir).filter((name) => /^g5-exec-007-.*\.test\.ts$/.test(name));
    const originalPattern = /T-(?:OD|SM|FREEZE|PRICE|APP|DEC|ISSUE|AUTH|SOD|SCOPE|TECH|CUST|SIDE|EVID|ACC|HOLD|PREP|LEG|CHG|PRIV|RET|CUT|MIG|ARCH|DATE|CANON)-\d{2}/g;
    const original = files.flatMap((name) => fs.readFileSync(path.join(testDir, name), "utf8").match(originalPattern) ?? []);
    expect(original).toHaveLength(74);
    expect(new Set(original).size).toBe(74);

    const batch3Owners = [
      "tests/foundation/g5-exec-004-organization-authority.test.ts",
      "tests/foundation/g5-exec-007-security-event-access.test.ts",
      "tests/foundation/g5-exec-007-migration.test.ts",
      "scripts/exec-007-postgres-concurrency.mjs",
      "tests/foundation/g5-exec-007-privacy-retention.test.ts",
      "tests/foundation/g5-exec-007-customer-auth.test.ts",
      "tests/foundation/g5-exec-007-exec006-integration.test.ts",
    ];
    const batch3 = batch3Owners.flatMap((name) => fs.readFileSync(path.join(process.cwd(), name), "utf8").match(/T-B3-(?:AUTH|DBROLE|RAWIP|BIND)-\d{3}/g) ?? []);
    expect(batch3).toHaveLength(152);
    expect(new Set(batch3).size).toBe(152);
    expect(new Set([...original, ...batch3]).size).toBe(226);
  });

  it("reconciles actual Git paths when governed refs are supplied", () => {
    const base = process.env.EXEC007_BASE_SHA;
    const batch3Parent = process.env.EXEC007_BATCH3_PARENT;
    const batch4Parent = process.env.EXEC007_BATCH4_PARENT;
    if (!base || !batch3Parent || !batch4Parent) return;
    expect(gitPaths(`${base}...HEAD`)).toEqual([...EXEC007_EXACT_AUTHORIZED_PATHS].sort());
    expect(gitPaths(`${batch4Parent}...HEAD`)).toEqual([...BATCH4_EXACT_PATHS].sort());
    expect(gitPaths(`${batch3Parent}...${batch4Parent}`)).toHaveLength(20);
  });
});
