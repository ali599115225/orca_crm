import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REGISTRY_PATH =
  "docs/zero-based/Z8/ORCA_Z8_EXECUTION_PACKAGE_REGISTRY.json";
const IDENTITY_PATH =
  "docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_IDENTITY.json";
const DIGEST_ALGORITHM =
  "sha256-path-length-content-v3-derived-security-dependencies";
const C17_SECURITY_DEPENDENCY_FILE = "app/actions/aiActions.ts";
const CENTRAL_MERGE_SHA = "b0369b50eb2d49001e5322eea90b3b6dae22a882";

const EXPECTED_STATES = Object.freeze({
  "EXEC-001": "CLOSED",
  "EXEC-002": "CLOSED",
  "EXEC-003": "CLOSED",
  "EXEC-004": "OWNER_DECISION_PENDING",
  "EXEC-005": "OWNER_DECISION_PENDING",
  "EXEC-006": "OWNER_DECISION_PENDING",
  "EXEC-007": "OWNER_DECISION_PENDING",
  "EXEC-008": "OWNER_DECISION_PENDING",
  "EXEC-009": "OWNER_DECISION_PENDING",
  "EXEC-010": "OWNER_DECISION_PENDING",
  "EXEC-011": "OWNER_DECISION_PENDING",
  "EXEC-012": "BLOCKED",
  "EXEC-013": "BLOCKED",
  "EXEC-014": "BLOCKED",
});

const EXPECTED_SUMMARY = Object.freeze({
  registeredPackages: 14,
  closed: 3,
  evidenceReady: 0,
  ownerDecisionPending: 8,
  deferredOrBlocked: 3,
  inExecution: 0,
  coveredGapIds: 32,
});

const REQUIRED_ALLOWED_PATHS = [
  "docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_IDENTITY.json",
  "scripts/exec-003-evidence-digest.mjs",
  "scripts/exec-003-registry-reconcile.mjs",
  "tests/foundation/g5-exec-003-auth-bootstrap-active-user.test.ts",
  "tests/foundation/g5-exec-003-behavior-evidence-manifest.ts",
  "tests/foundation/g5-exec-003-evidence-identity.test.ts",
  "tests/foundation/g5-exec-003-evidence-ledger.test.ts",
  "tests/foundation/g5-exec-003-registry-reconciliation.test.ts",
  "tests/foundation/g5-exec-003-shared-guard.test.ts",
];

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function readEvidenceIdentity(root = process.cwd()) {
  const identity = JSON.parse(
    readFileSync(resolve(root, IDENTITY_PATH), "utf8"),
  );
  if (
    identity.schemaVersion !== 3 ||
    identity.package !== "EXEC-003 v2" ||
    identity.packageClosureState !== "CLOSED" ||
    !/^[0-9a-f]{40}$/.test(identity.validatedImplementationHead) ||
    !/^[0-9a-f]{64}$/.test(identity.evidenceDigest) ||
    identity.digestAlgorithm !== DIGEST_ALGORITHM ||
    !Array.isArray(identity.derivedEvidenceFiles) ||
    identity.derivedEvidenceFiles.length === 0 ||
    !Array.isArray(identity.securityDependencyFiles) ||
    identity.securityDependencyFiles.length !== 1 ||
    identity.securityDependencyFiles[0] !== C17_SECURITY_DEPENDENCY_FILE ||
    !identity.derivedEvidenceFiles.includes(C17_SECURITY_DEPENDENCY_FILE)
  ) {
    throw new Error("EXEC-003 closed evidence identity is not sealed");
  }
  return identity;
}

function assertPackageStateMatrix(packages) {
  const actual = Object.fromEntries(
    packages.map((packageRecord) => [packageRecord.packageId, packageRecord.state]),
  );
  if (Object.keys(actual).length !== Object.keys(EXPECTED_STATES).length) {
    throw new Error("Execution Package Registry must retain 14 unique package records");
  }
  for (const [packageId, expectedState] of Object.entries(EXPECTED_STATES)) {
    if (packageId === "EXEC-003") continue;
    if (actual[packageId] !== expectedState) {
      throw new Error(`${packageId} must remain ${expectedState}`);
    }
  }
}

export function reconcileExec003Registry(input, identity = readEvidenceIdentity()) {
  const registry = structuredClone(input);
  if (!Array.isArray(registry.packages) || registry.packages.length !== 14) {
    throw new Error("Execution Package Registry must retain 14 package records");
  }
  if (new Set(registry.packages.map((record) => record.packageId)).size !== 14) {
    throw new Error("Execution Package Registry contains duplicate package IDs");
  }
  assertPackageStateMatrix(registry.packages);

  const packageRecord = registry.packages.find(
    (candidate) => candidate.packageId === "EXEC-003",
  );
  if (!packageRecord) throw new Error("EXEC-003 package record is missing");

  registry.status =
    "ACTIVE_REGISTER / EXEC-001 / EXEC-002 / EXEC-003 CLOSED / EXEC-004 OWNER_DECISION_PENDING / VERCEL_HOBBY_POLICY_ACTIVE";
  registry.baseCentralSha = CENTRAL_MERGE_SHA;
  registry.summary = { ...EXPECTED_SUMMARY };

  packageRecord.state = "CLOSED";
  packageRecord.currentSlice = "OWNER_PACKAGE_CLOSED";
  packageRecord.evidenceIdentity = IDENTITY_PATH;
  packageRecord.evidenceDigestScript = "scripts/exec-003-evidence-digest.mjs";
  packageRecord.registryReconciliation =
    "scripts/exec-003-registry-reconcile.mjs";
  packageRecord.allowedPaths = uniqueSorted([
    ...(packageRecord.allowedPaths ?? []),
    ...REQUIRED_ALLOWED_PATHS,
  ]);

  const vercelRationale =
    packageRecord.vercelValidationRationRationale ??
    packageRecord.vercelValidationRationale ??
    "Contract-level behavioral evidence is validated by actual entry-point tests, real final authorization decisions, a semantic AST gate, TypeScript, generated inventories, GitHub ORCA CI and diff review. Vercel is not required.";
  packageRecord.vercelValidationRationRationale = vercelRationale;
  delete packageRecord.vercelValidationRationale;

  packageRecord.directEvidence = {
    baselineUnprovenContracts: 59,
    startingStrictContracts: 3,
    startingStrictOperations: 3,
    startingRemainingUnprovenContracts: 56,
    creditedFrozenContracts: 25,
    directlyTestedOperations: 32,
    fullDirectBehavioralCredit: { contracts: 25, operations: 32 },
    partialContractEntryTests: 0,
    structuralOnlyFrozenContracts: 0,
    remainingUnprovenContracts: 34,
    remainingByPriority: {
      P0_SECURITY_CRITICAL_SURFACE: 0,
      P1_MUTATION_SURFACE: 0,
      P1_SENSITIVE_READ_SURFACE: 0,
      P2_READ_SURFACE: 16,
      P3_UI_SURFACE: 16,
      P4_SOURCE_STATE: 2,
    },
    candidateClass: "CANDIDATE_DIRECT_BEHAVIORAL",
    earnedEvidenceClass: "DIRECT_BEHAVIORAL",
    structuralEvidenceClass: "STRUCTURAL / SOURCE_ASSERTION",
    semanticGate: "TYPESCRIPT_AST / PASS",
    digestCoverage: "DERIVED_FROM_MANIFEST_SECURITY_DEPENDENCIES / PASS",
    derivedEvidenceFileCount: identity.derivedEvidenceFiles.length,
    securityDependencyFileCount: identity.securityDependencyFiles.length,
    securityDependencyFiles: identity.securityDependencyFiles,
    c17SecurityDependencyMetadata: "PASS",
    c17ImportChain: "PASS",
    c17RequireAgentAccessOrder: "PASS",
    c17ProviderOrder: "PASS",
    securityDependencyOmissionNegative: "PASS",
    securityDependencyMissingNegative: "PASS",
    securityDependencyContentMutation: "PASS",
    entryPointModuleMocksRejected: "PASS",
    entryPointSpiesRejected: "PASS",
    intermediaryReExportMocksRejected: "PASS",
    setupFileMocksRejected: "PASS",
    operationLevelSpillover: 0,
    outOfScopeContractsCredited: 0,
    authBootstrapExceptionPath: "FAIL_CLOSED / PASS",
    c17TenantContextContract: "AUTHORIZATION_LOOKUP_CONTEXT_ONLY / PASS",
    c17ProviderSuppression: "PASS",
    runtimeSecurityDefectsRemaining: 0,
    runtimeFilesChangedThisRemediation: 0,
    prismaChangesThisRemediation: 0,
    migrationChangesThisRemediation: 0,
    validatedImplementationHead: identity.validatedImplementationHead,
    evidenceDigest: identity.evidenceDigest,
    digestAlgorithm: identity.digestAlgorithm,
    ciCheckoutMode: identity.checkoutMode,
    baseSha: identity.baseSha,
    finalCiIdentityLocation: "PR #108 description",
    g5Tests: "200/200",
    status: "SUCCESS / CLOSED",
  };

  packageRecord.closure = {
    pullRequest: 108,
    finalHeadSha: "abc43ab5e1a76b5f2d99f5deb0f5d1e35451a618",
    centralMergeSha: CENTRAL_MERGE_SHA,
    orcaCi: "SUCCESS",
    orcaCiRun: 453,
    validatedImplementationHead: identity.validatedImplementationHead,
    evidenceDigest: identity.evidenceDigest,
    digestAlgorithm: identity.digestAlgorithm,
    directContracts: 25,
    directOperations: 32,
    remainingGap: 34,
    g5Tests: "200/200",
    typecheck: "SUCCESS",
    build: "SUCCESS",
    recoveryDrill: "SUCCESS",
    runtimeDefectsRemaining: 0,
    vercelValidation: "SKIP_BY_DEFAULT",
    scopeFiles: 53,
    closedOn: "2026-07-26",
  };

  return registry;
}

export function stableRegistryJson(registry) {
  return `${JSON.stringify(registry)}\n`;
}

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  const root = process.cwd();
  const current = readFileSync(resolve(root, REGISTRY_PATH), "utf8");
  const expected = stableRegistryJson(
    reconcileExec003Registry(JSON.parse(current), readEvidenceIdentity(root)),
  );
  if (process.argv.includes("--print")) {
    process.stdout.write(expected);
  } else if (process.argv.includes("--check")) {
    if (current !== expected) {
      process.stderr.write(
        `EXEC003_REGISTRY_EXPECTED_BASE64=${Buffer.from(expected, "utf8").toString("base64")}\n`,
      );
      process.exitCode = 1;
    }
  }
}
