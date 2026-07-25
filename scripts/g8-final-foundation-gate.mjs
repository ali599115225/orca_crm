import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const ARTIFACTS = join(ROOT, "artifacts");
const LEDGER_PATH = join(ROOT, "ORCA_FOUNDATION_STAGE_LEDGER.json");
const G7_SCRIPT = join(ROOT, "scripts/g7-remediation-reconciliation.mjs");
const G7_OUTPUT = join(ARTIFACTS, "g7-remediation-reconciliation.json");
const ACTIVATION_PATH = join(
  ROOT,
  "docs/reports/activation/ORCA_PRODUCTION_ACTIVATION_EVIDENCE.json",
);
const OUTPUT_JSON = join(ARTIFACTS, "g8-final-foundation-gate.json");
const OUTPUT_MD = join(ARTIFACTS, "g8-final-foundation-gate.md");

const REPORTS = {
  G3: "docs/reports/foundation/ORCA_G3_FINAL_CLOSURE.md",
  G4: "docs/reports/foundation/ORCA_G4_FINAL_CLOSURE.md",
  G5: "docs/reports/foundation/ORCA_G5_FINAL_CLOSURE.md",
  G6: "docs/reports/foundation/ORCA_G6_FINAL_CLOSURE.md",
  G7: "docs/reports/foundation/ORCA_G7_FINAL_CLOSURE.md",
};

const REQUIRED_ACTIVATION_CHECKS = [
  "productionApproval",
  "protectedMainMerge",
  "productionMigration",
  "productionBackfill",
  "constraintsAndIndexes",
  "rbacStagedEnforcement",
  "providerRecoveryWindow",
  "representativeRestore",
  "productionRtoRpo",
  "p0p1DirectTests",
  "launchVisualProof",
  "criticalStagingE2E",
  "externalProviderDecisionsAndSecrets",
  "productionHealthAndRollback",
];

const RELEASE_CONDITIONS = [
  {
    id: "G8-ACT-01",
    name: "Owner approval and protected main merge",
    owner: "Owner / Release Engineering",
    requiredChecks: ["productionApproval", "protectedMainMerge"],
  },
  {
    id: "G8-ACT-02",
    name: "G3 Production data-plane activation and staged RBAC",
    owner: "Database / Security",
    requiredChecks: [
      "productionMigration",
      "productionBackfill",
      "constraintsAndIndexes",
      "rbacStagedEnforcement",
    ],
  },
  {
    id: "G8-ACT-03",
    name: "Provider recovery, representative restore, and Production RTO/RPO",
    owner: "Operations / Database",
    requiredChecks: [
      "providerRecoveryWindow",
      "representativeRestore",
      "productionRtoRpo",
    ],
  },
  {
    id: "G8-ACT-04",
    name: "Launch-critical direct tests and visual proof",
    owner: "Quality / Product / Security",
    requiredChecks: ["p0p1DirectTests", "launchVisualProof"],
  },
  {
    id: "G8-ACT-05",
    name: "Deterministic critical staging browser journeys",
    owner: "Quality / Release Engineering",
    requiredChecks: ["criticalStagingE2E"],
  },
  {
    id: "G8-ACT-06",
    name: "Company provider decisions, secrets, Production health, and rollback",
    owner: "Company Owner / Security / Operations",
    requiredChecks: [
      "externalProviderDecisionsAndSecrets",
      "productionHealthAndRollback",
    ],
  },
];

function read(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function toPosix(path) {
  return path.split(sep).join("/");
}

function validSha(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validTimestamp(value) {
  return nonEmpty(value) && !Number.isNaN(Date.parse(value));
}

function inspectActivationEvidence() {
  const path = toPosix(relative(ROOT, ACTIVATION_PATH));
  if (!existsSync(ACTIVATION_PATH)) {
    return {
      exists: false,
      valid: false,
      path,
      missingOrInvalid: ["activation evidence file"],
      checks: {},
    };
  }

  let evidence;
  try {
    evidence = JSON.parse(readFileSync(ACTIVATION_PATH, "utf8"));
  } catch {
    return {
      exists: true,
      valid: false,
      path,
      missingOrInvalid: ["valid JSON"],
      checks: {},
    };
  }

  const missingOrInvalid = [];
  if (evidence.schemaVersion !== 1) missingOrInvalid.push("schemaVersion=1");
  if (evidence.decisionRequest !== "GO") missingOrInvalid.push("decisionRequest=GO");
  if (!validSha(evidence.approvedCentralSha)) missingOrInvalid.push("approvedCentralSha");
  if (!validSha(evidence.mainMergeSha)) missingOrInvalid.push("mainMergeSha");
  if (!nonEmpty(evidence.productionDeploymentId)) {
    missingOrInvalid.push("productionDeploymentId");
  }
  if (!validTimestamp(evidence.approvedAt)) missingOrInvalid.push("approvedAt");
  if (!nonEmpty(evidence.approvalEvidenceRef)) {
    missingOrInvalid.push("approvalEvidenceRef");
  }

  const checks = evidence.checks ?? {};
  for (const checkName of REQUIRED_ACTIVATION_CHECKS) {
    const check = checks[checkName];
    if (
      !check ||
      check.status !== "VERIFIED" ||
      !nonEmpty(check.evidenceRef) ||
      !validTimestamp(check.verifiedAt)
    ) {
      missingOrInvalid.push(`checks.${checkName}`);
    }
  }

  const serialized = JSON.stringify(evidence);
  const prohibitedPatterns = [
    /postgres(?:ql)?:\/\//i,
    /DATABASE_URL/i,
    /DIRECT_URL/i,
    /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/i,
    /"(?:password|secret|token|apiKey|privateKey)"\s*:/i,
  ];
  if (prohibitedPatterns.some((pattern) => pattern.test(serialized))) {
    missingOrInvalid.push("credential-or-sensitive-value-prohibited");
  }

  return {
    exists: true,
    valid: missingOrInvalid.length === 0,
    path,
    missingOrInvalid,
    checks,
    approvedCentralSha: evidence.approvedCentralSha ?? null,
    mainMergeSha: evidence.mainMergeSha ?? null,
    productionDeploymentId: evidence.productionDeploymentId ?? null,
  };
}

mkdirSync(ARTIFACTS, { recursive: true });

execFileSync(process.execPath, [G7_SCRIPT], {
  cwd: ROOT,
  stdio: "pipe",
});
const g7 = JSON.parse(readFileSync(G7_OUTPUT, "utf8"));
const ledger = JSON.parse(readFileSync(LEDGER_PATH, "utf8"));
const plan = read("ORCA_CENTRAL_BASELINE_PLAN.md");
const addendum = read("ORCA_CENTRAL_BASELINE_PLAN_ADDENDUM.md");
const g5 = read(REPORTS.G5);
const g6 = read(REPORTS.G6);

const repositoryBlockers = [];
const expectedStageIds = ["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"];
const actualStageIds = ledger.stages?.map((stage) => stage.id) ?? [];
if (JSON.stringify(actualStageIds) !== JSON.stringify(expectedStageIds)) {
  repositoryBlockers.push({
    id: "FOUNDATION_STAGE_SEQUENCE_DRIFT",
    expected: expectedStageIds,
    actual: actualStageIds,
  });
}

for (const stage of ledger.stages ?? []) {
  if (stage.id === "G8") continue;
  if (stage.status !== "PASS / CLOSED") {
    repositoryBlockers.push({
      id: "PRIOR_STAGE_NOT_CLOSED",
      stage: stage.id,
      status: stage.status,
    });
  }
  if (!Array.isArray(stage.evidenceRefs) || stage.evidenceRefs.length === 0) {
    repositoryBlockers.push({ id: "STAGE_EVIDENCE_MISSING", stage: stage.id });
  }
  if (!nonEmpty(stage.closureBasis)) {
    repositoryBlockers.push({ id: "STAGE_CLOSURE_BASIS_MISSING", stage: stage.id });
  }
}

for (const [stage, path] of Object.entries(REPORTS)) {
  const content = read(path);
  if (!/PASS\s*\/\s*CLOSED/.test(content)) {
    repositoryBlockers.push({ id: "STAGE_REPORT_NOT_CLOSED", stage, path });
  }
}

if (!plan.includes("VERIFIED — SINGLE INDEPENDENT COMPANY")) {
  repositoryBlockers.push({ id: "OPERATING_MODEL_NOT_VERIFIED" });
}
if (!plan.includes("INTEGRATION OWNERSHIP | `COMPANY OWNER`")) {
  repositoryBlockers.push({ id: "INTEGRATION_OWNERSHIP_NOT_VERIFIED" });
}
if (!addendum.includes("يمنع القفز من G6 إلى G8")) {
  repositoryBlockers.push({ id: "G7_TRANSITION_RULE_MISSING" });
}

if (
  g7.repositoryStatus !== "PASS" ||
  g7.reconciliationStatus !== "RECONCILED" ||
  g7.g8TransitionAllowed !== true ||
  g7.summary?.blockingFindings !== 0 ||
  g7.summary?.unownedHighPriorityItems !== 0
) {
  repositoryBlockers.push({
    id: "G7_RECONCILIATION_NOT_ACCEPTABLE",
    evidence: {
      repositoryStatus: g7.repositoryStatus,
      reconciliationStatus: g7.reconciliationStatus,
      g8TransitionAllowed: g7.g8TransitionAllowed,
      blockingFindings: g7.summary?.blockingFindings,
      unownedHighPriorityItems: g7.summary?.unownedHighPriorityItems,
    },
  });
}

const expectedG7Summary = {
  totalItems: 58,
  generatedVisualItems: 37,
  directTestGaps: 34,
  highPriorityDirectTestGaps: 0,
  lowerPriorityDirectTestGaps: 34,
  productionActivationBlockers: 6,
};
for (const [field, expected] of Object.entries(expectedG7Summary)) {
  if (g7.summary?.[field] !== expected) {
    repositoryBlockers.push({
      id: "G7_EXPECTED_COUNT_DRIFT",
      field,
      expected,
      actual: g7.summary?.[field],
    });
  }
}

if (!/`CRITICAL`: \*\*0\*\*/.test(g5) || !/`HIGH`: \*\*0\*\*/.test(g5)) {
  repositoryBlockers.push({ id: "HIGH_OR_CRITICAL_RUNTIME_RISK_PRESENT" });
}
if (!/All \*\*129\*\* API routes carry a recorded security-boundary classification/.test(g5)) {
  repositoryBlockers.push({ id: "API_SECURITY_CLASSIFICATION_INCOMPLETE" });
}
if (!/\*\*6\/6\*\* scheduled contracts classified `READY`/.test(g6)) {
  repositoryBlockers.push({ id: "SCHEDULED_CRON_READINESS_INCOMPLETE" });
}
if (!/All \*\*4\/4\*\* current health contracts are present/.test(g6)) {
  repositoryBlockers.push({ id: "HEALTH_CONTRACT_READINESS_INCOMPLETE" });
}

const activation = inspectActivationEvidence();
const releaseConditions = RELEASE_CONDITIONS.map((condition) => {
  const missingChecks = condition.requiredChecks.filter((checkName) => {
    const check = activation.checks?.[checkName];
    return (
      !check ||
      check.status !== "VERIFIED" ||
      !nonEmpty(check.evidenceRef) ||
      !validTimestamp(check.verifiedAt)
    );
  });
  return {
    ...condition,
    status: activation.valid && missingChecks.length === 0 ? "VERIFIED" : "UNVERIFIED",
    missingChecks,
  };
});

const repositoryFoundationVerdict = repositoryBlockers.length === 0 ? "GO" : "NO_GO";
const productionLaunchVerdict =
  repositoryBlockers.length > 0
    ? "NO_GO"
    : activation.valid && releaseConditions.every((condition) => condition.status === "VERIFIED")
      ? "GO"
      : "CONDITIONAL_GO";
const g8RepositoryStageResult =
  repositoryBlockers.length === 0 && ["GO", "CONDITIONAL_GO"].includes(productionLaunchVerdict)
    ? "PASS / CLOSED"
    : "FAIL / OPEN";

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  authority: "ORCA G8 Final Foundation Gate",
  g8RepositoryStageResult,
  repositoryFoundationVerdict,
  productionLaunchVerdict,
  productionGoAuthorized: productionLaunchVerdict === "GO",
  automaticProductionActionAuthorized: false,
  ownerReleaseInstructionRequired: true,
  nextAuthorizedState:
    productionLaunchVerdict === "CONDITIONAL_GO"
      ? "CONTROLLED_ACTIVATION_PLANNING_ONLY"
      : productionLaunchVerdict === "GO"
        ? "AWAIT_EXPLICIT_OWNER_RELEASE_INSTRUCTION"
        : "FOUNDATION_REMEDIATION_REQUIRED",
  operatingModel: "SINGLE_INDEPENDENT_COMPANY",
  integrationOwnership: "COMPANY_OWNER",
  stageLedger: ledger.stages,
  repositoryBlockers,
  releaseConditions,
  activationEvidence: {
    exists: activation.exists,
    valid: activation.valid,
    path: activation.path,
    missingOrInvalid: activation.missingOrInvalid,
    approvedCentralSha: activation.approvedCentralSha ?? null,
    mainMergeSha: activation.mainMergeSha ?? null,
    productionDeploymentId: activation.productionDeploymentId ?? null,
  },
  evidenceSummary: {
    priorStagesClosed: (ledger.stages ?? []).filter(
      (stage) => stage.id !== "G8" && stage.status === "PASS / CLOSED",
    ).length,
    expectedPriorStages: 8,
    g7TotalDecisions: g7.summary.totalItems,
    g7VisualDecisions: g7.summary.generatedVisualItems,
    directTestGaps: g7.summary.directTestGaps,
    p0p1DirectTestGaps: g7.summary.highPriorityDirectTestGaps,
    lowerPriorityDirectTestGaps: g7.summary.lowerPriorityDirectTestGaps,
    productionBlockerCategories: g7.summary.productionActivationBlockers,
    unownedHighPriorityItems: g7.summary.unownedHighPriorityItems,
    reconciliationBlockers: g7.summary.blockingFindings,
    apiRoutesClassified: 129,
    scheduledCronContractsReady: 6,
    healthContractsPresent: 4,
  },
  decisionPolicy: {
    NO_GO:
      "A repository foundation, security, quality, operations, evidence, or reconciliation contract fails.",
    CONDITIONAL_GO:
      "G0-G8 repository foundation is closed, but one or more Production activation conditions remain unverified.",
    GO:
      "The repository foundation and every required Production activation evidence check are verified for one approved release SHA. A separate explicit owner instruction is still required before any Production action.",
  },
};

writeFileSync(OUTPUT_JSON, `${JSON.stringify(result, null, 2)}\n`);

const markdown = [
  "# ORCA G8 Final Foundation Gate",
  "",
  `Generated: ${result.generatedAt}`,
  "",
  "## Final decision",
  "",
  `- G8 repository stage: **${g8RepositoryStageResult}**`,
  `- Repository foundation: **${repositoryFoundationVerdict}**`,
  `- Production launch: **${productionLaunchVerdict}**`,
  `- Production GO authorized: **${result.productionGoAuthorized ? "yes" : "no"}**`,
  "- Automatic Production action authorized: **no**",
  `- Next authorized state: **${result.nextAuthorizedState}**`,
  "",
  "## Evidence summary",
  "",
  `- Prior stages closed: **${result.evidenceSummary.priorStagesClosed}/${result.evidenceSummary.expectedPriorStages}**`,
  `- G7 reconciled decisions: **${result.evidenceSummary.g7TotalDecisions}**`,
  `- Item-level visual decisions: **${result.evidenceSummary.g7VisualDecisions}**`,
  `- Direct-test gaps: **${result.evidenceSummary.directTestGaps}**`,
  `- P0/P1 direct-test gaps: **${result.evidenceSummary.p0p1DirectTestGaps}**`,
  `- Production blocker categories: **${result.evidenceSummary.productionBlockerCategories}**`,
  `- Unowned High/Critical items: **${result.evidenceSummary.unownedHighPriorityItems}**`,
  `- Reconciliation blockers: **${result.evidenceSummary.reconciliationBlockers}**`,
  `- API routes classified: **${result.evidenceSummary.apiRoutesClassified}/129**`,
  `- Scheduled Cron contracts ready: **${result.evidenceSummary.scheduledCronContractsReady}/6**`,
  `- Health contracts present: **${result.evidenceSummary.healthContractsPresent}/4**`,
  "",
  "## Production activation conditions",
  "",
  "| ID | Condition | Status | Owner | Missing checks |",
  "|---|---|---|---|---|",
  ...releaseConditions.map(
    (condition) =>
      `| \`${condition.id}\` | ${condition.name} | ${condition.status} | ${condition.owner} | ${condition.missingChecks.join(", ") || "—"} |`,
  ),
  "",
  `Activation evidence path: \`${activation.path}\``,
  "",
  "A missing or incomplete activation package results in CONDITIONAL_GO, never implicit GO. This gate performs no deployment, migration, backfill, restore, provider activation, secret change, domain change, or data write.",
  "",
].join("\n");
writeFileSync(OUTPUT_MD, markdown);

console.log(
  JSON.stringify(
    {
      output: toPosix(relative(ROOT, OUTPUT_JSON)),
      g8RepositoryStageResult,
      repositoryFoundationVerdict,
      productionLaunchVerdict,
      repositoryBlockers: repositoryBlockers.length,
      unverifiedReleaseConditions: releaseConditions.filter(
        (condition) => condition.status !== "VERIFIED",
      ).length,
    },
    null,
    2,
  ),
);

if (repositoryBlockers.length > 0) process.exitCode = 1;
