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
  "lib/system-prisma-boundary.ts",
  "scripts/exec-003-evidence-digest.mjs",
  "scripts/exec-003-registry-reconcile.mjs",
  "tests/foundation/g5-exec-003-auth-bootstrap-active-user.test.ts",
  "tests/foundation/g5-exec-003-cookie-mutation-boundary.test.ts",
  "tests/foundation/g5-exec-003-entrypoint-security-matrix.test.ts",
  "tests/foundation/g5-exec-003-evidence-identity.test.ts",
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
    !/^[0-9a-f]{64}$/.test(identity.evidenceDigest)
  ) {
    throw new Error("EXEC-003 evidence identity is not sealed");
  }
  return identity;
}

export function reconcileExec003Registry(input, identity = readEvidenceIdentity()) {
  const registry = structuredClone(input);
  const packageRecord = registry.packages.find(
    (candidate) => candidate.packageId === "EXEC-003",
  );
  if (!packageRecord) throw new Error("EXEC-003 package record is missing");

  packageRecord.state = "IN_EXECUTION";
  packageRecord.currentSlice =
    "CONTROLLED_SECURITY_REMEDIATION_VALIDATED_AWAITING_INDEPENDENT_RE_REVIEW";
  packageRecord.evidenceIdentity = IDENTITY_PATH;
  packageRecord.evidenceDigestScript = "scripts/exec-003-evidence-digest.mjs";
  packageRecord.registryReconciliation =
    "scripts/exec-003-registry-reconcile.mjs";
  packageRecord.allowedPaths = uniqueSorted([
    ...(packageRecord.allowedPaths ?? []),
    ...REQUIRED_ALLOWED_PATHS,
  ]);
  packageRecord.sliceAcceptance = [
    "25 contracts and 32 operations remain frozen in code and documentation",
    "the inactive-user AUTH_BOOTSTRAP defect is fixed by requiring isActive=true in the role lookup",
    "27 eligible operations across 20 contracts invoke actual entry points and retain the real hasDatabaseRole decision",
    "inactive-user denial is proven from bearer-capable routes, Cookie-only routes, Server Actions, reads, mutations and sensitive reads",
    "C17 invokes generateAIInsight through the real requireAgentAccess decision",
    "C18 and C19 have independent executable ALLOW and DENY callbacks",
    "C14-O02 and C15-O02 independently reject Bearer-only mutation requests without requireAuth fallback",
    "a frozen C03 entry point proves Legacy allow plus Progressive deny remains DENY",
    "the Manifest is candidate-only and the TypeScript AST gate derives direct credit",
    "the AST gate blocks final-guard mocks, spies, aliases, setup overrides, indirect factories and intermediary re-exports",
    "the repository-bound evidence digest includes all executable remediation and reconciliation tooling",
    "later changes after the validated implementation head are documentation and identity records only",
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
    finalGuardMocksRemoved: ["hasDatabaseRole", "requireAgentAccess"],
    inactiveUserEntryPointMatrix: "PASS",
    distinctAllowDeny: "PASS",
    cookieMutationBearerDenial: "PASS",
    progressiveDenyEntryPoint: "PASS",
    sameFileSpillover: 0,
    outOfScopeContractsCredited: 0,
    runtimeSecurityDefectsFound: 1,
    runtimeFixesApplied: 1,
    runtimeFilesChanged: 1,
    validatedImplementationHead: identity.validatedImplementationHead,
    evidenceDigest: identity.evidenceDigest,
    digestAlgorithm: identity.digestAlgorithm,
    ciCheckoutMode: identity.checkoutMode,
    baseSha: BASE_SHA,
    finalCiIdentityLocation: "PR #108 description",
    g5Tests: "184/184",
    g5Suites: "47/47",
    status: "SUCCESS / AWAITING_INDEPENDENT_RE_REVIEW",
  };

  return registry;
}

export function stableRegistryJson(registry) {
  return `${JSON.stringify(registry, null, 2)}\n`;
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
