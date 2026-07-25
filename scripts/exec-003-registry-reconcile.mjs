import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REGISTRY_PATH =
  "docs/zero-based/Z8/ORCA_Z8_EXECUTION_PACKAGE_REGISTRY.json";
const IDENTITY_PATH =
  "docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_IDENTITY.json";
const BASE_SHA = "001b2c853e99ea055f161dcd294d968bbf25c9ad";

const REQUIRED_ALLOWED_PATHS = [
  "docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_IDENTITY.json",
  "scripts/exec-003-evidence-digest.mjs",
  "scripts/exec-003-registry-reconcile.mjs",
  "tests/foundation/g5-exec-003-auth-bootstrap-active-user.test.ts",
  "tests/foundation/g5-exec-003-behavior-evidence-manifest.ts",
  "tests/foundation/g5-exec-003-evidence-identity.test.ts",
  "tests/foundation/g5-exec-003-evidence-ledger.test.ts",
  "tests/foundation/g5-exec-003-registry-reconciliation.test.ts",
];

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function readEvidenceIdentity(root = process.cwd()) {
  const identity = JSON.parse(
    readFileSync(resolve(root, IDENTITY_PATH), "utf8"),
  );
  if (
    !/^[0-9a-f]{40}$/.test(identity.validatedImplementationHead) ||
    !/^[0-9a-f]{64}$/.test(identity.evidenceDigest) ||
    identity.digestAlgorithm !==
      "sha256-path-length-content-v2-derived-manifest" ||
    !Array.isArray(identity.derivedEvidenceFiles) ||
    identity.derivedEvidenceFiles.length === 0
  ) {
    throw new Error("EXEC-003 derived evidence identity is not sealed");
  }
  return identity;
}

export function reconcileExec003Registry(input, identity = readEvidenceIdentity()) {
  const registry = structuredClone(input);
  if (!Array.isArray(registry.packages) || registry.packages.length !== 14) {
    throw new Error("Execution Package Registry must retain 14 package records");
  }

  const packageRecord = registry.packages.find(
    (candidate) => candidate.packageId === "EXEC-003",
  );
  const nextPackage = registry.packages.find(
    (candidate) => candidate.packageId === "EXEC-004",
  );
  if (!packageRecord) throw new Error("EXEC-003 package record is missing");
  if (!nextPackage) throw new Error("EXEC-004 package record is missing");
  if (nextPackage.state !== "OWNER_DECISION_PENDING") {
    throw new Error("EXEC-004 must remain OWNER_DECISION_PENDING");
  }

  packageRecord.state = "IN_EXECUTION";
  packageRecord.currentSlice =
    "FINAL_NARROW_EVIDENCE_GATE_REMEDIATION_AWAITING_INDEPENDENT_RE_REVIEW";
  packageRecord.evidenceIdentity = IDENTITY_PATH;
  packageRecord.evidenceDigestScript = "scripts/exec-003-evidence-digest.mjs";
  packageRecord.registryReconciliation =
    "scripts/exec-003-registry-reconcile.mjs";
  packageRecord.allowedPaths = uniqueSorted([
    ...(packageRecord.allowedPaths ?? []),
    ...REQUIRED_ALLOWED_PATHS,
  ]);
  packageRecord.sliceAcceptance = [
    "25 contracts and 32 operations remain frozen and directly credited only after semantic validation",
    "the evidence digest derives all frozen Entry Points from the Manifest and includes final guards, delegated guards, security core files, evidence tests, tools and actual Vitest configuration",
    "missing files, omitted Entry Points, omitted final or delegated guards and unreadable evidence paths fail closed",
    "registered actual Entry Point modules and exports remain unmocked and unmodified",
    "test ownership is enforced at Operation ID level and operation-level spillover remains zero",
    "AUTH_BOOTSTRAP database lookup exceptions return null and grant no role",
    "Tenant Context may be established inside requireAgentAccess solely for the tenant-scoped authorization lookup",
    "no AI provider call, domain operation or post-authorization downstream work executes before requireAgentAccess succeeds",
    "C18 and C19 retain exact-claim boundaries with independent ALLOW and DENY callbacks",
    "C14-O02 and C15-O02 retain Cookie-only mutation boundaries",
    "signed boundaries remain original and out-of-scope credit remains zero",
    "no Runtime file is changed by the final narrow evidence-gate remediation",
    "Legacy authentication channels, Permission Keys and Legacy role sets are unchanged",
    "C25 has no Platform Owner bypass",
  ];

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
    digestCoverage: "DERIVED_FROM_MANIFEST / PASS",
    derivedEvidenceFileCount: identity.derivedEvidenceFiles.length,
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
    baseSha: BASE_SHA,
    finalCiIdentityLocation: "PR #108 description",
    g5Tests: "194/194",
    status: "SUCCESS / AWAITING_INDEPENDENT_RE_REVIEW",
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
