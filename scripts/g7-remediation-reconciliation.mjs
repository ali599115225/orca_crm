import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const ARTIFACTS = join(ROOT, "artifacts");
const POLICY_PATH = join(ROOT, "ORCA_G7_REMEDIATION_POLICY.json");
const PLAN_ADDENDUM_PATH = join(ROOT, "ORCA_CENTRAL_BASELINE_PLAN_ADDENDUM.md");
const OUTPUT_JSON = join(ARTIFACTS, "g7-remediation-reconciliation.json");
const OUTPUT_MD = join(ARTIFACTS, "g7-remediation-reconciliation.md");

const REPORTS = {
  G3: "docs/reports/foundation/ORCA_G3_FINAL_CLOSURE.md",
  G4: "docs/reports/foundation/ORCA_G4_FINAL_CLOSURE.md",
  G5: "docs/reports/foundation/ORCA_G5_FINAL_CLOSURE.md",
  G6: "docs/reports/foundation/ORCA_G6_FINAL_CLOSURE.md",
};

const VISUAL_SOURCE = "docs/architecture/ORCA_G4_PAGES_AND_SURFACES.md";
const G5_REGISTER = "docs/architecture/ORCA_G5_SECURITY_QUALITY_REGISTER.md";

function read(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function toPosix(path) {
  return path.split(sep).join("/");
}

function numberFrom(content, pattern, label) {
  const match = content.match(pattern);
  if (!match) throw new Error(`Unable to derive ${label}.`);
  return Number(match[1]);
}

function parseTable(content, heading, expectedColumns) {
  const lines = content.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  if (headingIndex < 0) throw new Error(`Missing section ${heading}.`);

  const rows = [];
  let started = false;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line.startsWith("## ") && started) break;
    if (!line.startsWith("|")) {
      if (started && line !== "") break;
      continue;
    }
    started = true;
    const cells = line
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    if (cells.length !== expectedColumns) continue;
    if (cells.every((cell) => /^-+$/.test(cell.replaceAll(":", "")))) continue;
    rows.push(cells);
  }

  if (rows.length < 2) throw new Error(`No data rows found in ${heading}.`);
  return rows.slice(1);
}

function visualSeverity(status) {
  if (status === "PARTIAL_DOCUMENTED_ISSUE") return "HIGH";
  if (status === "PARTIAL") return "MEDIUM";
  if (status === "NOT_PROVEN") return "MEDIUM";
  return "LOW";
}

function createVisualChildren(content) {
  const openStatuses = new Set([
    "PARTIAL",
    "PARTIAL_DOCUMENTED_ISSUE",
    "NOT_PROVEN",
    "HISTORICAL_EVIDENCE_ONLY",
  ]);

  const sections = [
    {
      heading: "## Pages",
      columns: 7,
      kind: "PAGE",
      keyIndex: 0,
      sourceIndex: 1,
      statusIndex: 6,
    },
    {
      heading: "## Tab sets",
      columns: 4,
      kind: "TAB_SET",
      keyIndex: 0,
      sourceIndex: 0,
      statusIndex: 3,
    },
    {
      heading: "## Modals, dialogs, drawers, and overlays",
      columns: 5,
      kind: "OVERLAY",
      keyIndex: 0,
      sourceIndex: 2,
      statusIndex: 4,
    },
  ];

  const children = [];
  for (const section of sections) {
    const rows = parseTable(content, section.heading, section.columns);
    let localIndex = 0;
    for (const cells of rows) {
      const status = cells[section.statusIndex].replaceAll("`", "");
      if (!openStatuses.has(status)) continue;
      localIndex += 1;
      const key = cells[section.keyIndex].replaceAll("`", "");
      const source = cells[section.sourceIndex].replaceAll("`", "");
      children.push({
        id: `G7-VISUAL-${section.kind}-${String(localIndex).padStart(3, "0")}`,
        title: `${section.kind}: ${key}`,
        category: "VISUAL_EVIDENCE",
        severity: visualSeverity(status),
        status: "DEFERRED_WITH_APPROVAL",
        owner: "Product / UI",
        targetStage: "G8 launch-scope scoring and visual closeout",
        evidenceRefs: [VISUAL_SOURCE, source],
        dependencies: [
          "approved launch-critical scope",
          "current visual and interaction evidence",
        ],
        rationale: `Current G4 visual classification is ${status}; G7 converts it into an owned remediation decision without claiming closure.`,
        sourceStatus: status,
        sourceKind: section.kind,
        sourceKey: key,
      });
    }
  }
  return children;
}

mkdirSync(ARTIFACTS, { recursive: true });

const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8"));
const planAddendum = readFileSync(PLAN_ADDENDUM_PATH, "utf8");
const visualSource = read(VISUAL_SOURCE);
const g5Register = read(G5_REGISTER);

const blockingFindings = [];
const seenIds = new Set();
const allowedStatuses = new Set(policy.allowedStatuses);
const forbiddenStatuses = new Set(policy.forbiddenTerminalStatuses);

for (const item of policy.items) {
  if (!item.id || seenIds.has(item.id)) {
    blockingFindings.push({ id: "DUPLICATE_OR_MISSING_ID", item: item.id ?? null });
  }
  seenIds.add(item.id);

  if (!allowedStatuses.has(item.status) || forbiddenStatuses.has(item.status)) {
    blockingFindings.push({ id: "INVALID_TERMINAL_STATUS", item: item.id, status: item.status });
  }
  for (const field of ["title", "category", "severity", "owner", "targetStage", "rationale"]) {
    if (typeof item[field] !== "string" || item[field].trim() === "") {
      blockingFindings.push({ id: "MISSING_REQUIRED_FIELD", item: item.id, field });
    }
  }
  if (!Array.isArray(item.evidenceRefs) || item.evidenceRefs.length === 0) {
    blockingFindings.push({ id: "MISSING_EVIDENCE", item: item.id });
  }
  if ((item.severity === "CRITICAL" || item.severity === "HIGH") && !item.owner) {
    blockingFindings.push({ id: "UNOWNED_HIGH_PRIORITY_ITEM", item: item.id });
  }
}

const stageEvidence = Object.entries(REPORTS).map(([stage, path]) => {
  const content = read(path);
  const closed = /PASS\s*\/\s*CLOSED/.test(content);
  if (!closed) blockingFindings.push({ id: "FOUNDATION_STAGE_NOT_CLOSED", stage, path });
  return { stage, path, closed };
});

const expectedGateSequence = ["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"];
for (const gate of expectedGateSequence) {
  if (!planAddendum.includes(`${gate} —`)) {
    blockingFindings.push({ id: "MISSING_PLAN_GATE", gate });
  }
}
if (!planAddendum.includes("يمنع القفز من G6 إلى G8")) {
  blockingFindings.push({ id: "MISSING_G7_TRANSITION_RULE" });
}

const directTestGaps = numberFrom(
  g5Register,
  /Contracts without a direct current test reference: \*\*(\d+)\*\*/,
  "direct-test gaps",
);
const p0 = numberFrom(g5Register, /`P0_SECURITY_CRITICAL_SURFACE` \| (\d+)/, "P0 gaps");
const p1Mutation = numberFrom(g5Register, /`P1_MUTATION_SURFACE` \| (\d+)/, "P1 mutation gaps");
const p1Sensitive = numberFrom(
  g5Register,
  /`P1_SENSITIVE_READ_SURFACE` \| (\d+)/,
  "P1 sensitive-read gaps",
);
const p2 = numberFrom(g5Register, /`P2_READ_SURFACE` \| (\d+)/, "P2 gaps");
const p3 = numberFrom(g5Register, /`P3_UI_SURFACE` \| (\d+)/, "P3 gaps");
const p4 = numberFrom(g5Register, /`P4_SOURCE_STATE` \| (\d+)/, "P4 gaps");
const highPriorityDirectTestGaps = p0 + p1Mutation + p1Sensitive;
const lowerPriorityDirectTestGaps = p2 + p3 + p4;

if (directTestGaps !== highPriorityDirectTestGaps + lowerPriorityDirectTestGaps) {
  blockingFindings.push({ id: "DIRECT_TEST_COUNT_RECONCILIATION_FAILED" });
}

const expectedItems = new Map(policy.items.map((item) => [item.id, item]));
if (expectedItems.get("G7-TEST-001")?.status !== "PRODUCTION_ACTIVATION_BLOCKER") {
  blockingFindings.push({ id: "P0_P1_NOT_PRODUCTION_BLOCKER" });
}
if (expectedItems.get("G7-TEST-002")?.status !== "DEFERRED_WITH_APPROVAL") {
  blockingFindings.push({ id: "LOWER_TEST_GAPS_NOT_DEFERRED" });
}
if (expectedItems.get("G7-OPS-002")?.status !== "PRODUCTION_ACTIVATION_BLOCKER") {
  blockingFindings.push({ id: "PRODUCTION_RECOVERY_NOT_BLOCKED" });
}
if (expectedItems.get("G7-ARCH-002")?.status !== "PRODUCTION_ACTIVATION_BLOCKER") {
  blockingFindings.push({ id: "PRODUCTION_DATA_PLANE_NOT_BLOCKED" });
}

const visualChildren = createVisualChildren(visualSource);
if (visualChildren.length !== 37) {
  blockingFindings.push({
    id: "VISUAL_OPEN_COUNT_DRIFT",
    expected: 37,
    actual: visualChildren.length,
  });
}

for (const child of visualChildren) {
  if (seenIds.has(child.id)) blockingFindings.push({ id: "DUPLICATE_VISUAL_CHILD_ID", item: child.id });
  seenIds.add(child.id);
}

const allItems = [...policy.items, ...visualChildren];
const byStatus = Object.fromEntries(
  policy.allowedStatuses.map((status) => [
    status,
    allItems.filter((item) => item.status === status).length,
  ]),
);
const bySeverity = Object.fromEntries(
  ["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((severity) => [
    severity,
    allItems.filter((item) => item.severity === severity).length,
  ]),
);
const productionActivationBlockers = allItems.filter(
  (item) => item.status === "PRODUCTION_ACTIVATION_BLOCKER",
);
const unownedHighPriority = allItems.filter(
  (item) =>
    (item.severity === "CRITICAL" || item.severity === "HIGH") &&
    (!item.owner || item.owner.trim() === ""),
);
if (unownedHighPriority.length > 0) {
  blockingFindings.push({
    id: "UNOWNED_HIGH_PRIORITY_ITEMS",
    items: unownedHighPriority.map((item) => item.id),
  });
}

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  authority: policy.authority,
  repositoryStatus: blockingFindings.length === 0 ? "PASS" : "FAIL",
  reconciliationStatus: blockingFindings.length === 0 ? "RECONCILED" : "BLOCKED",
  g8TransitionAllowed: blockingFindings.length === 0,
  productionLaunchAuthorized: false,
  summary: {
    curatedItems: policy.items.length,
    generatedVisualItems: visualChildren.length,
    totalItems: allItems.length,
    directTestGaps,
    highPriorityDirectTestGaps,
    lowerPriorityDirectTestGaps,
    productionActivationBlockers: productionActivationBlockers.length,
    unownedHighPriorityItems: unownedHighPriority.length,
    blockingFindings: blockingFindings.length,
  },
  byStatus,
  bySeverity,
  stageEvidence,
  blockingFindings,
  items: allItems,
};

writeFileSync(OUTPUT_JSON, `${JSON.stringify(result, null, 2)}\n`);

const rows = allItems.map(
  (item) =>
    `| \`${item.id}\` | ${item.title} | ${item.severity} | ${item.status} | ${item.owner} | ${item.targetStage} |`,
);
const markdown = [
  "# ORCA G7 Remediation Reconciliation",
  "",
  `Generated: ${result.generatedAt}`,
  "",
  "## Result",
  "",
  `- Repository status: **${result.repositoryStatus}**`,
  `- Reconciliation: **${result.reconciliationStatus}**`,
  `- G8 transition allowed: **${result.g8TransitionAllowed ? "yes" : "no"}**`,
  "- Production launch authorized: **no**",
  "",
  "## Counts",
  "",
  `- Curated remediation decisions: **${result.summary.curatedItems}**`,
  `- Generated item-level visual decisions: **${result.summary.generatedVisualItems}**`,
  `- Total reconciled items: **${result.summary.totalItems}**`,
  `- Direct-test gaps: **${directTestGaps}**`,
  `- P0/P1 direct-test gaps: **${highPriorityDirectTestGaps}**`,
  `- Lower-priority direct-test gaps: **${lowerPriorityDirectTestGaps}**`,
  `- Production activation blockers: **${productionActivationBlockers.length}**`,
  `- Unowned High/Critical items: **${unownedHighPriority.length}**`,
  `- Blocking reconciliation findings: **${blockingFindings.length}**`,
  "",
  "## Status totals",
  "",
  "| Status | Count |",
  "|---|---:|",
  ...Object.entries(byStatus).map(([status, count]) => `| ${status} | ${count} |`),
  "",
  "## Full reconciliation register",
  "",
  "| ID | Item | Severity | Terminal status | Owner | Target |",
  "|---|---|---|---|---|---|",
  ...rows,
  "",
  "G7 closes classification and ownership. It does not execute Production migration, backfill, provider activation, restore, deployment, or data changes.",
  "",
].join("\n");
writeFileSync(OUTPUT_MD, markdown);

console.log(
  JSON.stringify(
    {
      output: toPosix(relative(ROOT, OUTPUT_JSON)),
      repositoryStatus: result.repositoryStatus,
      reconciliationStatus: result.reconciliationStatus,
      totalItems: result.summary.totalItems,
      productionActivationBlockers: result.summary.productionActivationBlockers,
      blockingFindings: result.summary.blockingFindings,
    },
    null,
    2,
  ),
);

if (blockingFindings.length > 0) process.exitCode = 1;
