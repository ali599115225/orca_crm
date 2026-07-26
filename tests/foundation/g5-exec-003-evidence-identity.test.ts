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
import * as ts from "typescript";
import { EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES } from "@/tests/foundation/g5-exec-003-behavior-evidence-manifest";

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, "scripts/exec-003-evidence-digest.mjs");
const IDENTITY = path.join(
  ROOT,
  "docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_IDENTITY.json",
);

const C17_DEPENDENCY_MODULE = "@/app/actions/aiActions";
const C17_DEPENDENCY_FILE = "app/actions/aiActions.ts";

type DigestResult = {
  algorithm: string;
  evidenceDigest: string;
  manifestOperationCount: number;
  derivedEvidenceFiles: string[];
  entryPointFiles: string[];
  securityDependencyModules: string[];
  securityDependencyFiles: string[];
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
  securityDependencyFiles: string[];
  baseSha: string;
  checkoutMode: string;
};

type CoverageResult = Omit<DigestResult, "algorithm" | "evidenceDigest">;

type DigestModule = {
  computeExec003EvidenceDigest(root?: string): DigestResult;
  hashExec003EvidenceFiles(root: string, files: string[]): string;
  assertExec003EvidenceCoverage(result: CoverageResult): true;
  resolveSecurityDependencyFiles(root: string, modules: string[]): string[];
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

function coverageInput(
  actual: DigestResult,
  derivedEvidenceFiles = actual.derivedEvidenceFiles,
): CoverageResult {
  return {
    manifestOperationCount: actual.manifestOperationCount,
    derivedEvidenceFiles,
    entryPointFiles: actual.entryPointFiles,
    securityDependencyModules: actual.securityDependencyModules,
    securityDependencyFiles: actual.securityDependencyFiles,
    finalGuardFiles: actual.finalGuardFiles,
    securityCoreFiles: actual.securityCoreFiles,
    manifestTestFiles: actual.manifestTestFiles,
    configFiles: actual.configFiles,
    setupFiles: actual.setupFiles,
  };
}

function parseRepositorySource(relativePath: string): ts.SourceFile {
  const absolute = path.join(ROOT, relativePath);
  return ts.createSourceFile(
    relativePath,
    readFileSync(absolute, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function importedLocalName(
  source: ts.SourceFile,
  moduleName: string,
  importedName: string,
): string | null {
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== moduleName
    ) {
      continue;
    }
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    const match = bindings.elements.find(
      (element) =>
        (element.propertyName?.text ?? element.name.text) === importedName,
    );
    return match?.name.text ?? null;
  }
  return null;
}

function functionDeclaration(
  source: ts.SourceFile,
  functionName: string,
): ts.FunctionDeclaration | null {
  return (
    source.statements.find(
      (statement): statement is ts.FunctionDeclaration =>
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === functionName &&
        statement.body !== undefined,
    ) ?? null
  );
}

function normalExecutionBlock(
  declaration: ts.FunctionDeclaration,
): ts.Block {
  const body = declaration.body;
  if (!body) throw new Error(`${declaration.name?.text} has no body`);
  const tryStatement = body.statements.find(ts.isTryStatement);
  return tryStatement?.tryBlock ?? body;
}

function callPositions(node: ts.Node, localName: string): number[] {
  const positions: number[] = [];
  function visit(current: ts.Node): void {
    if (
      ts.isCallExpression(current) &&
      ts.isIdentifier(current.expression) &&
      current.expression.text === localName
    ) {
      positions.push(current.getStart());
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return positions;
}

function awaitedCallPositions(node: ts.Node, localName: string): number[] {
  const positions: number[] = [];
  function visit(current: ts.Node): void {
    if (
      ts.isAwaitExpression(current) &&
      ts.isCallExpression(current.expression) &&
      ts.isIdentifier(current.expression.expression) &&
      current.expression.expression.text === localName
    ) {
      positions.push(current.getStart());
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return positions;
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
      schemaVersion: 3,
      package: "EXEC-003 v2",
      state: "CLOSED / INDEPENDENT FINAL REVIEW PASS / MERGED TO CENTRAL",
      digestAlgorithm:
        "sha256-path-length-content-v3-derived-security-dependencies",
      baseSha: "001b2c853e99ea055f161dcd294d968bbf25c9ad",
      checkoutMode: "PR_MERGE_REF",
    });
    expect(identity.validatedImplementationHead).toMatch(/^[0-9a-f]{40}$/);
    expect(identity.evidenceDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(actual.manifestOperationCount).toBe(32);
    expect(identity.derivedEvidenceFiles).toEqual(actual.derivedEvidenceFiles);
    expect(identity.securityDependencyFiles).toEqual(
      actual.securityDependencyFiles,
    );
    if (identity.evidenceDigest !== actual.evidenceDigest) {
      throw new Error(
        `EVIDENCE_DIGEST_MISMATCH expected=${identity.evidenceDigest} actual=${actual.evidenceDigest}`,
      );
    }
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

  it("C17_SECURITY_DEPENDENCY_INCLUDED derives aiActions into both dependency and evidence sets", async () => {
    const digestModule = await loadDigestModule();
    const actual = digestModule.computeExec003EvidenceDigest(ROOT);

    expect(actual.securityDependencyModules).toEqual([C17_DEPENDENCY_MODULE]);
    expect(actual.securityDependencyFiles).toEqual([C17_DEPENDENCY_FILE]);
    expect(actual.derivedEvidenceFiles).toContain(C17_DEPENDENCY_FILE);
  });

  it("SECURITY_DEPENDENCY_OMITTED_NEGATIVE rejects an omitted security dependency", async () => {
    const digestModule = await loadDigestModule();
    const actual = digestModule.computeExec003EvidenceDigest(ROOT);

    expect(() =>
      digestModule.assertExec003EvidenceCoverage(
        coverageInput(
          actual,
          actual.derivedEvidenceFiles.filter(
            (file) => file !== C17_DEPENDENCY_FILE,
          ),
        ),
      ),
    ).toThrow(/security dependency omitted/);
  });

  it("SECURITY_DEPENDENCY_MISSING_NEGATIVE fails closed for a registered missing module", async () => {
    const digestModule = await loadDigestModule();
    const temporaryRoot = mkdtempSync(
      path.join(os.tmpdir(), "exec-003-security-dependency-missing-"),
    );

    try {
      expect(() =>
        digestModule.resolveSecurityDependencyFiles(temporaryRoot, [
          "@/app/actions/__missing_exec_003_security_dependency__",
        ]),
      ).toThrow(/missing or unreadable/);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("SECURITY_DEPENDENCY_CONTENT_CHANGES_DIGEST changes the digest when dependency content changes", async () => {
    const digestModule = await loadDigestModule();
    const temporaryRoot = mkdtempSync(
      path.join(os.tmpdir(), "exec-003-security-dependency-content-"),
    );

    try {
      const relativeFile = "app/actions/aiActions.ts";
      const absoluteFile = path.join(temporaryRoot, relativeFile);
      mkdirSync(path.dirname(absoluteFile), { recursive: true });
      writeFileSync(absoluteFile, "export const securityBoundary = 1;\n");
      const first = digestModule.hashExec003EvidenceFiles(temporaryRoot, [
        relativeFile,
      ]);
      writeFileSync(absoluteFile, "export const securityBoundary = 2;\n");
      const second = digestModule.hashExec003EvidenceFiles(temporaryRoot, [
        relativeFile,
      ]);
      expect(second).not.toBe(first);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("C17_DEPENDENCY_METADATA_REQUIRED pins the intermediate security module", () => {
    const c17 = EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES.find(
      (candidate) => candidate.operationId === "EXEC-003-C17-O01",
    );
    expect(c17).toBeDefined();
    expect(c17?.entryPointModule).toBe("@/app/actions/aiClient");
    expect(c17?.entryPointExport).toBe("generateAIInsight");
    expect(c17?.securityDependencyModules).toEqual([
      C17_DEPENDENCY_MODULE,
    ]);
  });

  it("C17_IMPORT_CHAIN_AND_PROVIDER_ORDER uses the real AST security path", () => {
    const aiClient = parseRepositorySource("app/actions/aiClient.ts");
    const aiActions = parseRepositorySource(C17_DEPENDENCY_FILE);

    const analyzeLeadLocal = importedLocalName(
      aiClient,
      "@/app/actions/aiActions",
      "analyzeLeadAI",
    );
    expect(analyzeLeadLocal).toBe("analyzeLeadAI");
    const generateAIInsight = functionDeclaration(aiClient, "generateAIInsight");
    expect(generateAIInsight).not.toBeNull();
    if (!generateAIInsight || !analyzeLeadLocal) return;
    expect(
      callPositions(normalExecutionBlock(generateAIInsight), analyzeLeadLocal),
    ).toHaveLength(1);

    const requireAgentAccessLocal = importedLocalName(
      aiActions,
      "@/lib/agents/access",
      "requireAgentAccess",
    );
    const generateAgentJsonLocal = importedLocalName(
      aiActions,
      "@/lib/agents/gemini-client",
      "generateAgentJson",
    );
    expect(requireAgentAccessLocal).toBe("requireAgentAccess");
    expect(generateAgentJsonLocal).toBe("generateAgentJson");

    const analyzeLeadAI = functionDeclaration(aiActions, "analyzeLeadAI");
    expect(analyzeLeadAI).not.toBeNull();
    if (!analyzeLeadAI || !requireAgentAccessLocal || !generateAgentJsonLocal) {
      return;
    }
    const normalBlock = normalExecutionBlock(analyzeLeadAI);
    const guardPositions = awaitedCallPositions(
      normalBlock,
      requireAgentAccessLocal,
    );
    const providerPositions = awaitedCallPositions(
      normalBlock,
      generateAgentJsonLocal,
    );
    expect(guardPositions).toHaveLength(1);
    expect(providerPositions).toHaveLength(1);
    expect(providerPositions[0]).toBeGreaterThan(guardPositions[0]);
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
      digestModule.assertExec003EvidenceCoverage(
        coverageInput(
          actual,
          actual.derivedEvidenceFiles.filter((file) => file !== omitted),
        ),
      ),
    ).toThrow(/Entry Point omitted/);
  });

  it("FINAL_GUARD_OMITTED_NEGATIVE rejects a final or delegated guard omission", async () => {
    const digestModule = await loadDigestModule();
    const actual = digestModule.computeExec003EvidenceDigest(ROOT);
    const omitted = actual.finalGuardFiles[0];

    expect(() =>
      digestModule.assertExec003EvidenceCoverage(
        coverageInput(
          actual,
          actual.derivedEvidenceFiles.filter((file) => file !== omitted),
        ),
      ),
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

      const discovered = digestModule.discoverVitestConfiguration(temporaryRoot);
      expect(discovered.configFiles).toEqual(
        expect.arrayContaining(["vitest.config.ts", "vitest.shared.ts"]),
      );
      expect(discovered.setupFiles).toEqual(
        expect.arrayContaining([
          "setup/global.ts",
          "setup/local.ts",
          "setup/shared.ts",
        ]),
      );
      expect(new Set(discovered.configFiles).size).toBe(
        discovered.configFiles.length,
      );
      expect(new Set(discovered.setupFiles).size).toBe(
        discovered.setupFiles.length,
      );
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
});
