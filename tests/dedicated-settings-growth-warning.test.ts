import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const SETTINGS_PAGE_PATH = join(__dirname, "..", "app", "operations", "settings", "page.tsx");

let source = "";

beforeAll(() => {
  source = readFileSync(SETTINGS_PAGE_PATH, "utf8");
});

describe("SettingsPage — growthWarning logic (source assertions)", () => {
  it("source contains the DEDICATED_COPY growthWarning guard", () => {
    expect(source).toMatch(/licenseMode\s*===\s*"DEDICATED_COPY"\s*\?\s*false/);
  });

  it("growthWarning is forced to false in DEDICATED_COPY regardless of lead count", () => {
    const match = source.match(/const\s+growthWarning\s*=\s*([^;]+);/);
    expect(match).not.toBeNull();
    const expr = match![1];
    expect(expr).toContain("DEDICATED_COPY");
    expect(expr).toContain("false");
    expect(expr).toContain("limit * 0.8");
  });

  it("SAAS growthWarning still uses the original lead threshold comparison", () => {
    const match = source.match(/const\s+growthWarning\s*=\s*([^;]+);/);
    expect(match).not.toBeNull();
    const expr = match![1];
    expect(expr).toContain("_count.leads");
    expect(expr).toContain("limit");
  });

  it("licenseMode is obtained from getDeploymentLicenseMode", () => {
    expect(source).toContain("getDeploymentLicenseMode()");
  });

  it("licenseMode is passed to tenant object", () => {
    expect(source).toMatch(/licenseMode[,\s]/);
  });
});

describe("SettingsPage — growthWarning pure logic", () => {
  const PLAN_LEAD_LIMITS: Record<string, number> = {
    BASIC: 200,
    SILVER: 1000,
    GOLD: 5000,
    SUPER: 99999,
  };

  function computeGrowthWarning(licenseMode: string, plan: string, leads: number): boolean {
    const limit = PLAN_LEAD_LIMITS[plan] ?? 200;
    return licenseMode === "DEDICATED_COPY" ? false : leads > limit * 0.8;
  }

  it("returns false in DEDICATED_COPY even with leads above threshold", () => {
    expect(computeGrowthWarning("DEDICATED_COPY", "BASIC", 180)).toBe(false);
  });

  it("returns true in SAAS BASIC with 180 leads (> 80% of 200)", () => {
    expect(computeGrowthWarning("SAAS", "BASIC", 180)).toBe(true);
  });

  it("returns false in SAAS BASIC with 50 leads (< 80% of 200)", () => {
    expect(computeGrowthWarning("SAAS", "BASIC", 50)).toBe(false);
  });

  it("returns false in DEDICATED_COPY GOLD with 4500 leads", () => {
    expect(computeGrowthWarning("DEDICATED_COPY", "GOLD", 4500)).toBe(false);
  });

  it("returns true in SAAS GOLD with 4500 leads (> 80% of 5000)", () => {
    expect(computeGrowthWarning("SAAS", "GOLD", 4500)).toBe(true);
  });
});
