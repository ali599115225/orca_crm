import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(ROOT, path), "utf8")) as T;
}

describe("EXEC-002 repository governance lint", () => {
  it("passes the deterministic governance lint on the repository head", () => {
    const result = spawnSync(process.execPath, ["scripts/repository-governance-lint.mjs"], {
      cwd: ROOT,
      encoding: "utf8",
    });

    if (result.status !== 0) {
      throw new Error(`Governance lint failed.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    expect(result.stdout).toContain("Repository governance lint passed.");
  });

  it("binds lint before the TypeScript command used by ORCA CI", () => {
    const packageJson = readJson<{ scripts?: Record<string, string> }>("package.json");

    expect(packageJson.scripts?.lint).toBe("node scripts/repository-governance-lint.mjs");
    expect(packageJson.scripts?.pretypecheck).toBe("npm run lint");
    expect(packageJson.scripts?.typecheck).toBe("tsc --noEmit");
  });

  it("registers every dependency override with ownership and a removal trigger", () => {
    const packageJson = readJson<{ overrides?: Record<string, string> }>("package.json");
    const register = readJson<{
      overrides?: Array<{
        package: string;
        value: string;
        owner: string;
        reviewTrigger: string;
        expiryPolicy: string;
      }>;
    }>("docs/governance/ORCA_DEPENDENCY_OVERRIDE_REGISTER.json");

    const registered = new Map((register.overrides ?? []).map((entry) => [entry.package, entry]));
    expect([...registered.keys()].sort()).toEqual(Object.keys(packageJson.overrides ?? {}).sort());

    for (const [name, value] of Object.entries(packageJson.overrides ?? {})) {
      const entry = registered.get(name);
      expect(entry?.value).toBe(value);
      expect(entry?.owner.length).toBeGreaterThan(0);
      expect(entry?.reviewTrigger.length).toBeGreaterThan(0);
      expect(entry?.expiryPolicy.length).toBeGreaterThan(0);
    }
  });

  it("classifies retained work products as non-Runtime evidence", () => {
    const register = readJson<{
      families?: Array<{
        pathPattern: string;
        owner: string;
        reviewTrigger: string;
        runtimeImpact: string;
      }>;
    }>("docs/governance/ORCA_REPOSITORY_ARTIFACT_RETENTION_REGISTER.json");

    expect(register.families?.length).toBeGreaterThanOrEqual(10);
    for (const entry of register.families ?? []) {
      expect(entry.pathPattern.length).toBeGreaterThan(0);
      expect(entry.owner.length).toBeGreaterThan(0);
      expect(entry.reviewTrigger.length).toBeGreaterThan(0);
      expect(entry.runtimeImpact).toBe("NONE");
    }
  });
});
