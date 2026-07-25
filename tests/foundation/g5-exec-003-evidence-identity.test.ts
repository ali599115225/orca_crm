import { pathToFileURL } from "node:url";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, "scripts/exec-003-evidence-digest.mjs");
const IDENTITY = path.join(
  ROOT,
  "docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_IDENTITY.json",
);

type DigestResult = {
  algorithm: string;
  evidenceDigest: string;
  manifestOperationCount: number;
  derivedEvidenceFiles: string[];
  entryPointFiles: string[];
  finalGuardFiles: string[];
  securityCoreFiles: string[];
  manifestTestFiles: string[];
  configFiles: string[];
  setupFiles: string[];
};

type EvidenceIdentity = {
  schemaVersion: number;
  package: string;
  state: string;
  validatedImplementationHead: string;
  evidenceDigest: string;
  digestAlgorithm: string;
  derivedEvidenceFiles: string[];
  baseSha: string;
  checkoutMode: string;
};

type DigestModule = {
  computeExec003EvidenceDigest(root?: string): DigestResult;
  hashExec003EvidenceFiles(root: string, files: string[]): string;
  assertExec003EvidenceCoverage(result: Omit<DigestResult, "algorithm" | "evidenceDigest">): true;
  discoverVitestConfiguration(root?: string): {
    configFiles: string[];
    setupFiles: string[];
  };
};

async function loadDigestModule(): Promise<DigestModule> {
  return (await import(
    `${pathToFileURL(SCRIPT).href}?identity-test=${Date.now()}`
  )) as DigestModule;
}

function readIdentity(): EvidenceIdentity {
  return JSON.parse(readFileSync(IDENTITY, "utf8")) as EvidenceIdentity;
}

describe("EXEC-003 v2 repository-bound evidence identity", () => {
  it("binds the derived security-influential file set to the validated implementation head", async () => {
    const digestModule = await loadDigestModule();
    const actual = digestModule.computeExec003EvidenceDigest(ROOT);
    const identity = readIdentity();

    if (
      identity.validatedImplementationHead.includes("PENDING") ||
      identity.evidenceDigest.includes("PENDING")
    ) {
      throw new Error(
        `PENDING FINAL VALIDATION is prohibited. Actual evidence digest: ${actual.evidenceDigest}. Derived files: ${JSON.stringify(actual.derivedEvidenceFiles)}`,
      );
    }

    expect(identity).toMatchObject({
      schemaVersion: 2,
      package: "EXEC-003 v2",
      state: "IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW",
      digestAlgorithm: "sha256-path-length-content-v2-derived-manifest",
      baseSha: "001b2c853e99ea055f161dcd294d968bbf25c9ad",
      checkoutMode: "PR_MERGE_REF",
    });
    expect(identity.validatedImplementationHead).toMatch(/^[0-9a-f]{40}$/);
    expect(identity.evidenceDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(actual.manifestOperationCount).toBe(32);
    expect(identity.derivedEvidenceFiles).toEqual(actual.derivedEvidenceFiles);
    expect(identity.evidenceDigest).toBe(actual.evidenceDigest);
  });

  it("contains every derived file exactly once in deterministic order", async () => {
    const digestModule = await loadDigestModule();
    const actual = digestModule.computeExec003EvidenceDigest(ROOT);
    const identity = readIdentity();

    expect(new Set(identity.derivedEvidenceFiles).size).toBe(
      identity.derivedEvidenceFiles.length,
    );
    expect(identity.derivedEvidenceFiles).toEqual(
      [...identity.derivedEvidenceFiles].sort(),
    );
    expect(identity.derivedEvidenceFiles).toEqual(actual.derivedEvidenceFiles);
    expect(actual.entryPointFiles.length).toBeGreaterThan(0);
    expect(actual.finalGuardFiles).toEqual([
      "lib/agents/access.ts",
      "lib/api-auth-guard.ts",
    ]);
  });

  it("MISSING_DIGEST_FILE_NEGATIVE rejects a missing or unreadable file", async () => {
    const digestModule = await loadDigestModule();
    const actual = digestModule.computeExec003EvidenceDigest(ROOT);
    const files = [
      ...actual.derivedEvidenceFiles,
      "tests/foundation/__missing_exec_003_digest_file__.ts",
    ].sort();

    expect(() => digestModule.hashExec003EvidenceFiles(ROOT, files)).toThrow(
      /missing or unreadable/,
    );
  });

  it("ENTRY_POINT_OMITTED_NEGATIVE rejects an Entry Point omitted from the digest", async () => {
    const digestModule = await loadDigestModule();
    const actual = digestModule.computeExec003EvidenceDigest(ROOT);
    const omitted = actual.entryPointFiles[0];

    expect(() =>
      digestModule.assertExec003EvidenceCoverage({
        manifestOperationCount: actual.manifestOperationCount,
        derivedEvidenceFiles: actual.derivedEvidenceFiles.filter(
          (file) => file !== omitted,
        ),
        entryPointFiles: actual.entryPointFiles,
        finalGuardFiles: actual.finalGuardFiles,
        securityCoreFiles: actual.securityCoreFiles,
        manifestTestFiles: actual.manifestTestFiles,
        configFiles: actual.configFiles,
        setupFiles: actual.setupFiles,
      }),
    ).toThrow(/Entry Point omitted/);
  });

  it("FINAL_GUARD_OMITTED_NEGATIVE rejects a final or delegated guard omission", async () => {
    const digestModule = await loadDigestModule();
    const actual = digestModule.computeExec003EvidenceDigest(ROOT);
    const omitted = actual.finalGuardFiles[0];

    expect(() =>
      digestModule.assertExec003EvidenceCoverage({
        manifestOperationCount: actual.manifestOperationCount,
        derivedEvidenceFiles: actual.derivedEvidenceFiles.filter(
          (file) => file !== omitted,
        ),
        entryPointFiles: actual.entryPointFiles,
        finalGuardFiles: actual.finalGuardFiles,
        securityCoreFiles: actual.securityCoreFiles,
        manifestTestFiles: actual.manifestTestFiles,
        configFiles: actual.configFiles,
        setupFiles: actual.setupFiles,
      }),
    ).toThrow(/final\/delegated guard omitted/);
  });

  it("derives setupFiles and globalSetup through variables, spreads and imported config", async () => {
    const digestModule = await loadDigestModule();
    const temporaryRoot = mkdtempSync(
      path.join(os.tmpdir(), "exec-003-vitest-config-"),
    );

    try {
      mkdirSync(path.join(temporaryRoot, "setup"), { recursive: true });
      writeFileSync(
        path.join(temporaryRoot, "vitest.shared.ts"),
        `export const sharedSetup = ["./setup/shared.ts"] as const;\n`,
      );
      writeFileSync(
        path.join(temporaryRoot, "vitest.config.ts"),
        [
          `import { defineConfig } from "vitest/config";`,
          `import { sharedSetup } from "./vitest.shared";`,
          `const localSetup = ["./setup/local.ts"];`,
          `const globalSetup = "./setup/global.ts";`,
          `export default defineConfig({`,
          `  test: { setupFiles: [...sharedSetup, ...localSetup], globalSetup },`,
          `});`,
          ``,
        ].join("\n"),
      );
      for (const file of ["shared.ts", "local.ts", "global.ts"]) {
        writeFileSync(path.join(temporaryRoot, "setup", file), "export {};\n");
      }

      expect(digestModule.discoverVitestConfiguration(temporaryRoot)).toEqual({
        configFiles: ["vitest.config.ts", "vitest.shared.ts"],
        setupFiles: [
          "setup/global.ts",
          "setup/local.ts",
          "setup/shared.ts",
        ],
      });
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
});
