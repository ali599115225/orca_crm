import { readFileSync, writeFileSync } from "node:fs";

const registryPath =
  "docs/zero-based/Z8/ORCA_Z8_EXECUTION_PACKAGE_REGISTRY.json";
const roadmapPath =
  "docs/zero-based/Z8/ORCA_Z8_PRIORITIZED_EXECUTION_ROADMAP.md";

const registry = JSON.parse(readFileSync(registryPath, "utf8"));
if (!Array.isArray(registry.packages) || registry.packages.length !== 14) {
  throw new Error("Registry must retain exactly 14 packages");
}

const otherPackagesBefore = JSON.stringify(
  registry.packages.filter((record) => record.packageId !== "EXEC-005"),
);
const packageRecord = registry.packages.find(
  (record) => record.packageId === "EXEC-005",
);
if (!packageRecord) throw new Error("EXEC-005 package is missing");
if (packageRecord.state !== "OWNER_DECISION_PENDING") {
  throw new Error(`Unexpected EXEC-005 state: ${packageRecord.state}`);
}

packageRecord.state = "CLOSED";
packageRecord.currentSlice =
  "CLOSED / STRICT SELF-REVIEW PASS / IMPLEMENTATION MERGED TO CENTRAL";
packageRecord.freezeContract =
  "docs/zero-based/Z8/ORCA_Z8_EXEC_005_FREEZE.md";
packageRecord.dataImpact =
  "docs/zero-based/Z8/ORCA_Z8_EXEC_005_DATA_IMPACT.md";
packageRecord.reviewRecord =
  "docs/zero-based/Z8/ORCA_Z8_EXEC_005_REVIEW.md";
packageRecord.closureReconciliation =
  "docs/zero-based/Z8/ORCA_Z8_EXEC_005_CLOSURE_RECONCILIATION.md";
packageRecord.securityInvariant =
  "PARTY IS IDENTITY ROOT; DENY BY DEFAULT; MERGE AND REVERSAL ARE AUDITABLE";
packageRecord.authorityModel =
  "CONSUMES EXEC-004 ORGANIZATION ASSIGNMENTS; NO PARALLEL RBAC";
packageRecord.vercelValidation = "SKIP_BY_DEFAULT";
packageRecord.vercelValidationRationale =
  "No browser-only surface was introduced. Exact-head ORCA CI, direct behavioral tests, Build, disposable PostgreSQL migration validation and diff review prove the package contract.";
packageRecord.subAuthorizations = {
  ...packageRecord.subAuthorizations,
  main: false,
  migrationData: false,
  migration: false,
  backfill: false,
  providerCredential: false,
  production: false,
};
packageRecord.allowedPaths = [
  ".github/workflows/exec-005-migration-validation.yml",
  "docs/zero-based/Z8/ORCA_Z8_EXEC_005_CLOSURE_RECONCILIATION.md",
  "docs/zero-based/Z8/ORCA_Z8_EXEC_005_DATA_IMPACT.md",
  "docs/zero-based/Z8/ORCA_Z8_EXEC_005_FREEZE.md",
  "docs/zero-based/Z8/ORCA_Z8_EXEC_005_REVIEW.md",
  "lib/customer-identity/authority.ts",
  "lib/customer-identity/contracts.ts",
  "lib/customer-identity/normalize.ts",
  "lib/customer-identity/repository.ts",
  "lib/customer-identity/service.ts",
  "prisma/migrations/20260726123000_exec_005_customer_identity_lifecycle/migration.sql",
  "prisma/migrations/20260726124500_exec_005_customer_identity_integrity_hardening/migration.sql",
  "tests/foundation/g5-exec-005-customer-identity-lifecycle.test.ts",
  "tests/foundation/g5-exec-005-integrity-hardening.test.ts",
  "tests/foundation/g5-exec-005-schema-contract.test.ts",
];
packageRecord.directEvidence = {
  directBehavioralCases: 38,
  schemaContractTests: "PASS",
  integrityContractTests: "PASS",
  exec004AuthorityRegressions: "PASS",
  crossTenantDenial: "PASS",
  crossBranchDenial: "PASS",
  forgedScopeDenial: "PASS",
  expiredAssignmentDenial: "PASS",
  platformOwnerImplicitAuthority: "DENIED / PASS",
  systemAdministratorImplicitAuthority: "DENIED / PASS",
  mergeReversalDependencyBlocking: "PASS",
  runtimeDefectsRemaining: 0,
  migrationDefectsRemaining: 0,
};
packageRecord.closure = {
  implementationPullRequest: 132,
  implementationBranch:
    "work/orca-exec-005-customer-identity-lifecycle-20260726",
  finalImplementationHead: "6a327d67648f795f64b13d766672bd0f4911e8f1",
  centralImplementationMergeSha:
    "10d4b5fc00bb9dad35a3c381dd72f6be685db09a",
  closurePullRequest: 134,
  closureBranch: "work/orca-exec-005-closure-v2-20260726",
  orcaCi: "SUCCESS",
  orcaCiRun: 532,
  migrationValidation: "SUCCESS",
  migrationValidationRun: 9,
  strictSelfReview: "PASS / NON_INDEPENDENT",
  migrationExecution: "DISPOSABLE_CI_ONLY",
  productionMigration: false,
  backfill: false,
  mainAction: false,
  productionAction: false,
  customerDataAction: false,
  vercelValidation: "SKIP_BY_DEFAULT",
  closedOn: "2026-07-26",
};

if (
  JSON.stringify(
    registry.packages.filter((record) => record.packageId !== "EXEC-005"),
  ) !== otherPackagesBefore
) {
  throw new Error("A non-EXEC-005 package record changed");
}

const count = (state) =>
  registry.packages.filter((record) => record.state === state).length;
const deferredStates = new Set(["BLOCKED", "DEFERRED", "DEFERRED_OR_BLOCKED"]);
registry.summary = {
  ...registry.summary,
  registeredPackages: registry.packages.length,
  closed: count("CLOSED"),
  evidenceReady: count("EVIDENCE_READY"),
  ownerDecisionPending: count("OWNER_DECISION_PENDING"),
  deferredOrBlocked: registry.packages.filter((record) =>
    deferredStates.has(record.state),
  ).length,
  inExecution: count("IN_EXECUTION"),
};
if (
  registry.summary.closed !== 5 ||
  registry.summary.ownerDecisionPending !== 6 ||
  registry.summary.inExecution !== 0
) {
  throw new Error(`Unexpected reconciled summary: ${JSON.stringify(registry.summary)}`);
}
registry.status =
  "ACTIVE REGISTER / EXEC-001 THROUGH EXEC-005 CLOSED / NO PACKAGE IN EXECUTION";
registry.baseCentralSha = "10d4b5fc00bb9dad35a3c381dd72f6be685db09a";
registry.date = "2026-07-26";
registry.exec005ClosureReconciliation = {
  implementationPullRequest: 132,
  closurePullRequest: 134,
  finalImplementationHead: "6a327d67648f795f64b13d766672bd0f4911e8f1",
  implementationMergeSha: "10d4b5fc00bb9dad35a3c381dd72f6be685db09a",
  packagesInExecution: 0,
  nextPackageStarted: false,
};
writeFileSync(registryPath, `${JSON.stringify(registry)}\n`);

let roadmap = readFileSync(roadmapPath, "utf8");
function replaceOnce(from, to) {
  if (!roadmap.includes(from)) throw new Error(`Roadmap text missing: ${from}`);
  roadmap = roadmap.replace(from, to);
}
replaceOnce("- **Version:** 1.3", "- **Version:** 1.4");
replaceOnce(
  "- **Status:** `ACTIVE / EXEC-001 THROUGH EXEC-004 CLOSED / NO PACKAGE IN EXECUTION`",
  "- **Status:** `ACTIVE / EXEC-001 THROUGH EXEC-005 CLOSED / NO PACKAGE IN EXECUTION`",
);
replaceOnce(
  "- **Current central baseline after EXEC-004:** `8643f1858cd453c53bee60cc4184dfab2f7cebdb`",
  "- **Current central baseline after EXEC-005 implementation:** `10d4b5fc00bb9dad35a3c381dd72f6be685db09a`",
);
replaceOnce(
  "| 5 | EXEC-005 | `OWNER_DECISION_PENDING` — identity/merge survivorship, privacy purpose and consent | `REQUIRED_AT_PACKAGE_END` only when operational Preview evidence is necessary |",
  "| 5 | EXEC-005 | `CLOSED` via PR #132 — Party identity, Lead/Opportunity lifecycle, duplicate review, merge/reversal, consent and retention foundation | `SKIP_BY_DEFAULT`; exact-head CI, Build and disposable migration validation proved the non-visual contract |",
);
replaceOnce(
  "→ EXEC-004 CLOSED\n→ OWNER DECISION GATE\n→ EXEC-005 + EXEC-006 when separately authorized",
  "→ EXEC-004 CLOSED\n→ EXEC-005 CLOSED\n→ OWNER DECISION GATE\n→ EXEC-006 when separately authorized",
);
replaceOnce("CLOSED: 4", "CLOSED: 5");
replaceOnce("OWNER/REFERENCE CONDITIONAL: 7", "OWNER/REFERENCE CONDITIONAL: 6");
replaceOnce(
  "NEXT ELIGIBLE PACKAGE: EXEC-005 AFTER OWNER DECISION AND SCOPE FREEZE",
  "NEXT ELIGIBLE PACKAGE: EXEC-006 AFTER OWNER DECISION AND SCOPE FREEZE",
);
replaceOnce(
  "## 10. EXEC-004 closure reconciliation — 2026-07-26",
  "## 11. EXEC-004 closure reconciliation — 2026-07-26",
);
const marker = "## Historical Z8 post-capacity closure — 2026-07-26";
const section = `## 10. EXEC-005 closure reconciliation — 2026-07-26

- Central base before implementation: \`991afec099880565043ef578ba8084b2ece809ad\`.
- Final implementation head: \`6a327d67648f795f64b13d766672bd0f4911e8f1\`.
- Implementation PR: \`#132\`.
- Squash merge to the zero-based central branch: \`10d4b5fc00bb9dad35a3c381dd72f6be685db09a\`.
- Closure PR: \`#134\` on clean branch \`work/orca-exec-005-closure-v2-20260726\`.
- Implementation scope: \`14\` files, all within the frozen allowlist.
- ORCA CI: \`#532 / SUCCESS\`.
- Disposable PostgreSQL migration validation: \`#9 / SUCCESS\`.
- Direct behavior: \`38\` named cases plus schema and integrity contracts.
- Strict self-review: \`PASS / NON_INDEPENDENT\`.
- Vercel: \`SKIP_BY_DEFAULT\`; no browser-only surface and no Preview.
- Prepared additive migrations: Production and customer data \`NOT EXECUTED\`.
- Backfill: \`NOT PERFORMED\`.
- \`main\`, Production, providers, secrets and customer data: \`UNTOUCHED\`.
- EXEC-006 remains \`NOT STARTED / OWNER_DECISION_PENDING\`; closure grants no automatic authorization.

## Historical Z8 post-capacity closure — 2026-07-26`;
if (!roadmap.includes(marker)) throw new Error("Historical marker is missing");
roadmap = roadmap.replace(marker, section);
writeFileSync(roadmapPath, roadmap);

const exec006 = registry.packages.find((record) => record.packageId === "EXEC-006");
if (!exec006 || exec006.state !== "OWNER_DECISION_PENDING") {
  throw new Error("EXEC-006 lifecycle was changed");
}
