import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ARTIFACT_DIR = join(ROOT, "artifacts");
const RAW_PATH = join(ARTIFACT_DIR, "g4-contract-inventory.json");
const OUTPUT_JSON = join(ARTIFACT_DIR, "g4-contract-registry.json");
const OUTPUT_MD = join(ARTIFACT_DIR, "g4-contract-registry.md");
const OVERRIDES_PATH = join(ROOT, "docs/architecture/ORCA_G4_VISUAL_STATUS_OVERRIDES.json");
const PERMISSION_REGISTRY_PATH = join(ROOT, "lib/authz/permission-registry.ts");

const VISUAL_KINDS = new Set(["PAGE", "TAB_SET", "MODAL_OR_OVERLAY", "DRAWER"]);
const ROUTE_STATE_KINDS = new Set(["LOADING_STATE", "ERROR_STATE", "NOT_FOUND_STATE"]);
const PERMISSION_PATTERN = /["'`]([a-z][a-z0-9_]*(?:\.[a-z0-9_]+){1,3})["'`]/g;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function matches(regex, content, group = 1) {
  const values = [];
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    values.push(match[group] ?? match[0]);
    if (match.index === regex.lastIndex) regex.lastIndex += 1;
  }
  return values;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function countBy(values, selector) {
  return values.reduce((acc, value) => {
    const key = selector(value);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function decisionFor(contract, overrides) {
  if (!VISUAL_KINDS.has(contract.kind)) {
    if (ROUTE_STATE_KINDS.has(contract.kind)) {
      return { status: "SOURCE_STATE_PRESENT", evidence: `Current ${contract.kind.toLowerCase()} file is present at ${contract.source}.` };
    }
    if (contract.kind === "LAYOUT") {
      return { status: "SOURCE_PRESENT", evidence: `Current layout source is present at ${contract.source}.` };
    }
    return { status: "NOT_APPLICABLE", evidence: "This contract has no visual surface." };
  }

  const routeOverride = contract.route ? overrides.routes?.[contract.route] : undefined;
  const sourceOverride = overrides.sources?.[contract.source];
  if (sourceOverride) return sourceOverride;
  if (routeOverride) return routeOverride;
  if ((contract.historicalVisualEvidence ?? []).length > 0) {
    return {
      status: "HISTORICAL_EVIDENCE_ONLY",
      evidence: "Retained documentation references this surface, but no current visual closure decision is asserted.",
    };
  }
  return { status: "NOT_PROVEN", evidence: "No current visual closure decision or retained matching evidence was found." };
}

function riskFlags(contract) {
  const flags = [];
  if ((contract.runtimeEvidence ?? []).length === 0) flags.push("NO_DIRECT_TEST_REFERENCE");
  if (contract.kind === "API" && (contract.apiMethods ?? []).length === 0) flags.push("API_METHOD_NOT_DETECTED");
  if (["PARTIAL", "PARTIAL_DOCUMENTED_ISSUE"].includes(contract.visualStatus)) flags.push("VISUAL_WORK_OPEN");
  if (contract.visualStatus === "NOT_PROVEN") flags.push("VISUAL_NOT_PROVEN");
  if (contract.visualStatus === "HISTORICAL_EVIDENCE_ONLY") flags.push("CURRENT_VISUAL_MATCH_NOT_PROVEN");
  if (contract.visualStatus === "LEGACY_DISABLED") flags.push("LEGACY_DISABLED");
  return flags;
}

if (!existsSync(RAW_PATH)) throw new Error(`Missing raw G4 inventory: ${RAW_PATH}`);
if (!existsSync(OVERRIDES_PATH)) throw new Error(`Missing G4 visual overrides: ${OVERRIDES_PATH}`);
if (!existsSync(PERMISSION_REGISTRY_PATH)) throw new Error(`Missing canonical permission registry: ${PERMISSION_REGISTRY_PATH}`);

const raw = readJson(RAW_PATH);
const overrides = readJson(OVERRIDES_PATH);
const permissionRegistryContent = readFileSync(PERMISSION_REGISTRY_PATH, "utf8");
const validPermissionKeys = new Set(matches(PERMISSION_PATTERN, permissionRegistryContent));

const contracts = raw.contracts.map((contract) => {
  const visualDecision = decisionFor(contract, overrides);
  const permissions = unique((contract.permissions ?? []).filter((permission) => validPermissionKeys.has(permission)));
  const directPermissions = unique((contract.directPermissions ?? []).filter((permission) => validPermissionKeys.has(permission)));
  const curated = {
    id: contract.id,
    kind: contract.kind,
    route: contract.route,
    name: contract.name,
    component: contract.component,
    source: contract.source,
    sourceHash: contract.sourceHash,
    apiMethods: contract.apiMethods ?? [],
    tabValues: contract.values ?? [],
    explicitRoleTabCount: contract.explicitRoleTabCount ?? 0,
    modelDependencies: contract.modelDependencies ?? [],
    directModelDependencies: contract.directModelDependencies ?? [],
    permissions,
    directPermissions,
    states: contract.stateEvidence ?? {},
    functionalContract: contract.functionalContract,
    functionalStatus: (contract.runtimeEvidence ?? []).length > 0 ? "EVIDENCE_REFERENCED" : "NOT_PROVEN",
    runtimeEvidence: contract.runtimeEvidence ?? [],
    visualStatus: visualDecision.status,
    visualDecisionEvidence: visualDecision.evidence,
    historicalVisualEvidence: contract.historicalVisualEvidence ?? [],
    coverageStatus: "RECORDED",
  };
  curated.riskFlags = riskFlags(curated);
  return curated;
});

const duplicateIds = Object.entries(countBy(contracts, (contract) => contract.id)).filter(([, count]) => count > 1);
const invalidPermissions = unique(contracts.flatMap((contract) => [...contract.permissions, ...contract.directPermissions]).filter((permission) => !validPermissionKeys.has(permission)));
const missingContracts = contracts.filter((contract) => !contract.functionalContract || !contract.source || !contract.kind);

const summary = {
  schemaVersion: 1,
  sourceInventorySchemaVersion: raw.schemaVersion,
  sourceInventoryCommit: raw.summary.commit,
  totalContracts: contracts.length,
  byKind: countBy(contracts, (contract) => contract.kind),
  byFunctionalStatus: countBy(contracts, (contract) => contract.functionalStatus),
  byVisualStatus: countBy(contracts, (contract) => contract.visualStatus),
  contractsWithModels: contracts.filter((contract) => contract.modelDependencies.length > 0).length,
  contractsWithPermissions: contracts.filter((contract) => contract.permissions.length > 0).length,
  contractsWithRuntimeEvidence: contracts.filter((contract) => contract.runtimeEvidence.length > 0).length,
  contractsWithRiskFlags: contracts.filter((contract) => contract.riskFlags.length > 0).length,
  duplicateContractIds: duplicateIds.length,
  invalidPermissionKeys: invalidPermissions.length,
  malformedContracts: missingContracts.length,
};

const registry = {
  schemaVersion: 1,
  generatedFrom: {
    repository: raw.summary.repository,
    commit: raw.summary.commit,
    inventorySchemaVersion: raw.schemaVersion,
    visualOverrideSchemaVersion: overrides.schemaVersion,
  },
  statusSemantics: {
    functional: {
      EVIDENCE_REFERENCED: "A current test references the route, source path, symbol, or component; semantic completeness remains separately reviewable.",
      NOT_PROVEN: "No direct current test reference was detected."
    },
    visual: {
      CLOSED_RETAINED: "Previously closed and not reopened because no current documented regression was found.",
      PARTIAL: "The visual contract remains incomplete.",
      PARTIAL_DOCUMENTED_ISSUE: "A current documented visual issue prevents closure.",
      LEGACY_DISABLED: "The surface is retained only as a disabled legacy entry point.",
      HISTORICAL_EVIDENCE_ONLY: "A retained report exists, but current matching is not proven.",
      NOT_PROVEN: "No current visual decision is available.",
      SOURCE_PRESENT: "A current non-page visual source exists.",
      SOURCE_STATE_PRESENT: "A current loading/error/not-found state file exists.",
      NOT_APPLICABLE: "The contract has no visual surface."
    }
  },
  summary,
  contracts: contracts.sort((a, b) => a.id.localeCompare(b.id))
};

mkdirSync(ARTIFACT_DIR, { recursive: true });
writeFileSync(OUTPUT_JSON, `${JSON.stringify(registry, null, 2)}\n`, "utf8");

const pages = contracts.filter((contract) => contract.kind === "PAGE").sort((a, b) => a.route.localeCompare(b.route));
const tabs = contracts.filter((contract) => contract.kind === "TAB_SET").sort((a, b) => a.source.localeCompare(b.source));
const overlays = contracts.filter((contract) => ["MODAL_OR_OVERLAY", "DRAWER"].includes(contract.kind)).sort((a, b) => a.source.localeCompare(b.source));
const apis = contracts.filter((contract) => contract.kind === "API").sort((a, b) => a.route.localeCompare(b.route));
const actionsBySource = Object.entries(contracts.filter((contract) => contract.kind === "SERVER_ACTION").reduce((acc, contract) => {
  (acc[contract.source] ??= []).push(contract);
  return acc;
}, {})).sort(([left], [right]) => left.localeCompare(right));

const lines = [
  "# ORCA G4 Page and Operational Contract Registry",
  "",
  `- Source inventory commit: \`${summary.sourceInventoryCommit}\``,
  `- Total contracts: **${summary.totalContracts}**`,
  `- Pages: **${summary.byKind.PAGE ?? 0}**`,
  `- APIs: **${summary.byKind.API ?? 0}**`,
  `- Server actions: **${summary.byKind.SERVER_ACTION ?? 0}**`,
  `- Tab sets: **${summary.byKind.TAB_SET ?? 0}**`,
  `- Modals/drawers: **${(summary.byKind.MODAL_OR_OVERLAY ?? 0) + (summary.byKind.DRAWER ?? 0)}**`,
  `- Route states: **${(summary.byKind.LOADING_STATE ?? 0) + (summary.byKind.ERROR_STATE ?? 0) + (summary.byKind.NOT_FOUND_STATE ?? 0)}**`,
  "",
  "## Pages",
  "",
  "| Route | Source | Models | Permissions | States | Runtime evidence | Visual status |",
  "|---|---|---:|---:|---|---:|---|",
  ...pages.map((contract) => `| \`${contract.route}\` | \`${contract.source}\` | ${contract.modelDependencies.length} | ${contract.permissions.length} | ${Object.entries(contract.states).filter(([, value]) => value).map(([key]) => key).join(", ") || "—"} | ${contract.runtimeEvidence.length} | ${contract.visualStatus} |`),
  "",
  "## Tab sets",
  "",
  "| Source | Values | Runtime evidence | Visual status |",
  "|---|---|---:|---|",
  ...tabs.map((contract) => `| \`${contract.source}\` | ${contract.tabValues.map((value) => `\`${value}\``).join(", ") || "detected without static values"} | ${contract.runtimeEvidence.length} | ${contract.visualStatus} |`),
  "",
  "## Modals, drawers, and overlays",
  "",
  "| Component | Source | Runtime evidence | Visual status |",
  "|---|---|---:|---|",
  ...overlays.map((contract) => `| \`${contract.component}\` | \`${contract.source}\` | ${contract.runtimeEvidence.length} | ${contract.visualStatus} |`),
  "",
  "## APIs",
  "",
  "| Route | Methods | Models | Permissions | Runtime evidence |",
  "|---|---|---:|---:|---:|",
  ...apis.map((contract) => `| \`${contract.route}\` | ${contract.apiMethods.join(", ") || "not statically detected"} | ${contract.modelDependencies.length} | ${contract.permissions.length} | ${contract.runtimeEvidence.length} |`),
  "",
  "## Server actions",
  "",
  ...actionsBySource.flatMap(([source, actions]) => [
    `### \`${source}\``,
    "",
    actions.sort((a, b) => a.name.localeCompare(b.name)).map((action) => `- \`${action.name}\` — models: ${action.modelDependencies.length}; permissions: ${action.permissions.length}; tests: ${action.runtimeEvidence.length}; status: ${action.functionalStatus}.`).join("\n"),
    ""
  ]),
  "## Open evidence classifications",
  "",
  `- Functional NOT_PROVEN: **${summary.byFunctionalStatus.NOT_PROVEN ?? 0}**`,
  `- Visual PARTIAL/PARTIAL_DOCUMENTED_ISSUE: **${(summary.byVisualStatus.PARTIAL ?? 0) + (summary.byVisualStatus.PARTIAL_DOCUMENTED_ISSUE ?? 0)}**`,
  `- Visual NOT_PROVEN: **${summary.byVisualStatus.NOT_PROVEN ?? 0}**`,
  `- Historical visual evidence only: **${summary.byVisualStatus.HISTORICAL_EVIDENCE_ONLY ?? 0}**`,
  "",
  "These classifications are registry outcomes, not hidden passes. G4 records the current contract surface and preserves known closure decisions; unresolved evidence is carried forward to G5/G6/G8 rather than guessed closed.",
  ""
].join("\n");
writeFileSync(OUTPUT_MD, lines, "utf8");

console.log(JSON.stringify(summary, null, 2));
if (duplicateIds.length || invalidPermissions.length || missingContracts.length) {
  console.error(JSON.stringify({ duplicateIds, invalidPermissions, missingContracts: missingContracts.map((contract) => contract.id) }, null, 2));
  process.exitCode = 1;
}
