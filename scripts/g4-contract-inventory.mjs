import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";

const ROOT = process.cwd();
const OUTPUT_DIR = join(ROOT, "artifacts");
const JSON_OUTPUT = join(OUTPUT_DIR, "g4-contract-inventory.json");
const MD_OUTPUT = join(OUTPUT_DIR, "g4-contract-inventory.md");

const ROOTS = [
  "app",
  "components",
  "features",
  "lib",
  "prisma",
  "tests",
  "docs/architecture",
  "docs/reports/foundation",
];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".prisma", ".md"]);
const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "dist",
  "build",
  "artifacts",
  ".vercel",
]);
const API_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];
const OVERLAY_PATTERN = /<([A-Z][A-Za-z0-9]*(?:Dialog|Modal|Drawer|Sheet|Popover|AlertDialog|Command)[A-Za-z0-9]*)\b/g;
const PRISMA_PATTERN = /\bprisma\.([a-zA-Z][a-zA-Z0-9_]*)\b/g;
const PERMISSION_PATTERN = /["'`]([a-z][a-z0-9_]*(?:\.[a-z0-9_]+){1,3})["'`]/g;
const EXPORT_FUNCTION_PATTERN = /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g;
const EXPORT_CONST_PATTERN = /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g;
const IMPORT_PATTERN = /(?:import|export)\s+(?:[^"']+?\s+from\s+)?["']([^"']+)["']/g;
const TAB_VALUE_PATTERN = /<(?:TabsTrigger|Tab)[^>]*\bvalue=["']([^"']+)["'][^>]*>/g;
const ROLE_TAB_PATTERN = /\brole=["']tab["']/g;
const EMPTY_PATTERN = /\bEmptyState\b|لا\s+توجد|لا\s+يوجد|no\s+(?:items?|records?|results?|data)\b|empty\s+state/gi;
const ERROR_PATTERN = /\bErrorBoundary\b|\berror\.(?:tsx?|jsx?)\b|حدث\s+خطأ|تعذر|failed\s+to\s+load/gi;
const LOADING_PATTERN = /\bSuspense\b|\bLoading\b|جاري\s+التحميل|loading\.(?:tsx?|jsx?)\b/gi;

function toPosix(path) {
  return path.split(sep).join("/");
}

function walk(path, files) {
  if (!existsSync(path)) return;
  for (const entry of readdirSync(path)) {
    if (EXCLUDED_DIRECTORIES.has(entry)) continue;
    const absolute = join(path, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) walk(absolute, files);
    else if (SOURCE_EXTENSIONS.has(extname(entry)) || entry === "schema.prisma") files.push(absolute);
  }
}

function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function hash(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function unique(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
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

function appRouteFromPath(repoPath) {
  const segments = repoPath.split("/");
  if (segments[0] !== "app") return null;
  const file = segments.at(-1);
  if (!file || !/^(page|route|loading|error|not-found|default|layout)\.(?:ts|tsx|js|jsx)$/.test(file)) return null;
  const routeSegments = segments.slice(1, -1).filter((segment) => {
    if (/^\(.+\)$/.test(segment)) return false;
    if (segment.startsWith("@")) return false;
    return true;
  });
  return `/${routeSegments.join("/")}`.replace(/\/{2,}/g, "/") || "/";
}

function routeKind(repoPath) {
  const file = repoPath.split("/").at(-1) ?? "";
  if (file.startsWith("page.")) return "PAGE";
  if (file.startsWith("route.")) return "API";
  if (file.startsWith("loading.")) return "LOADING_STATE";
  if (file.startsWith("error.")) return "ERROR_STATE";
  if (file.startsWith("not-found.")) return "NOT_FOUND_STATE";
  if (file.startsWith("layout.")) return "LAYOUT";
  return "APP_CONTRACT";
}

function permissionKeys(content) {
  const lines = content.split(/\r?\n/).filter((line) => /permission|authorize|requirePermission|rbac/i.test(line));
  const found = [];
  for (const line of lines) found.push(...matches(PERMISSION_PATTERN, line));
  return unique(found.filter((value) => !value.startsWith("http.")));
}

function testEvidenceFor(contract, tests) {
  const basename = contract.source.split("/").at(-1)?.replace(/\.[^.]+$/, "") ?? "";
  const route = contract.route;
  const candidates = [];
  for (const test of tests) {
    if ((route && route !== "/" && test.content.includes(route)) || (basename.length > 3 && test.content.includes(basename))) {
      candidates.push(test.path);
    }
  }
  return unique(candidates).slice(0, 20);
}

function visualEvidenceFor(contract, documents) {
  const routeTokens = (contract.route ?? "")
    .split("/")
    .filter(Boolean)
    .filter((token) => !token.startsWith("["))
    .map((token) => token.toLowerCase());
  const basename = contract.source.split("/").at(-1)?.replace(/\.[^.]+$/, "").toLowerCase() ?? "";
  return documents
    .filter((document) => {
      const haystack = `${document.path}\n${document.content}`.toLowerCase();
      return routeTokens.some((token) => token.length > 3 && haystack.includes(token)) || (basename.length > 4 && haystack.includes(basename));
    })
    .map((document) => document.path)
    .slice(0, 20);
}

const absoluteFiles = [];
for (const root of ROOTS) walk(join(ROOT, root), absoluteFiles);

const files = absoluteFiles.map((absolute) => {
  const content = read(absolute);
  return {
    absolute,
    path: toPosix(relative(ROOT, absolute)),
    content,
    hash: hash(content),
  };
});

const tests = files.filter((file) => file.path.startsWith("tests/") || /(?:^|\/)__tests__(?:\/|$)/.test(file.path));
const documents = files.filter((file) => file.path.startsWith("docs/") && file.path.endsWith(".md"));
const sourceFiles = files.filter((file) => !file.path.startsWith("tests/") && !file.path.startsWith("docs/"));

const contracts = [];
const actions = [];
const overlays = [];
const tabs = [];

for (const file of sourceFiles) {
  const route = appRouteFromPath(file.path);
  const imports = unique(matches(IMPORT_PATTERN, file.content));
  const models = unique(matches(PRISMA_PATTERN, file.content));
  const permissions = permissionKeys(file.content);
  const exportedFunctions = unique([
    ...matches(EXPORT_FUNCTION_PATTERN, file.content),
    ...matches(EXPORT_CONST_PATTERN, file.content),
  ]);
  const overlayComponents = unique(matches(OVERLAY_PATTERN, file.content));
  const tabValues = unique(matches(TAB_VALUE_PATTERN, file.content));
  const roleTabCount = matches(ROLE_TAB_PATTERN, file.content, 0).length;
  const isServerAction = file.path.startsWith("app/actions/") || /["']use server["']/.test(file.content);
  const stateEvidence = {
    loading: LOADING_PATTERN.test(file.content) || file.path.includes("/loading."),
    empty: EMPTY_PATTERN.test(file.content),
    error: ERROR_PATTERN.test(file.content) || file.path.includes("/error."),
  };
  LOADING_PATTERN.lastIndex = 0;
  EMPTY_PATTERN.lastIndex = 0;
  ERROR_PATTERN.lastIndex = 0;

  if (route) {
    const kind = routeKind(file.path);
    const apiMethods = kind === "API" ? API_METHODS.filter((method) => new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b|export\\s+const\\s+${method}\\b`).test(file.content)) : [];
    contracts.push({
      id: `${kind}:${route}:${file.path}`,
      kind,
      route,
      source: file.path,
      sourceHash: file.hash,
      apiMethods,
      imports,
      modelDependencies: models,
      permissions,
      stateEvidence,
      exportedFunctions,
    });
  }

  if (isServerAction) {
    for (const name of exportedFunctions) {
      actions.push({
        id: `SERVER_ACTION:${file.path}:${name}`,
        kind: "SERVER_ACTION",
        name,
        source: file.path,
        sourceHash: file.hash,
        modelDependencies: models,
        permissions,
      });
    }
  }

  for (const component of overlayComponents) {
    overlays.push({
      id: `OVERLAY:${file.path}:${component}`,
      kind: /Drawer|Sheet/.test(component) ? "DRAWER" : "MODAL_OR_OVERLAY",
      component,
      source: file.path,
      sourceHash: file.hash,
      modelDependencies: models,
      permissions,
      stateEvidence,
    });
  }

  if (tabValues.length > 0 || roleTabCount > 0) {
    tabs.push({
      id: `TAB_SET:${file.path}`,
      kind: "TAB_SET",
      source: file.path,
      sourceHash: file.hash,
      values: tabValues,
      explicitRoleTabCount: roleTabCount,
      stateEvidence,
      permissions,
    });
  }
}

const allContracts = [...contracts, ...actions, ...overlays, ...tabs].map((contract) => {
  const runtimeEvidence = testEvidenceFor(contract, tests);
  const historicalVisualEvidence = visualEvidenceFor(contract, documents);
  const functionalStatus = runtimeEvidence.length > 0 ? "VERIFIED_BY_TEST_REFERENCE" : "SOURCE_ONLY";
  const visualStatus = historicalVisualEvidence.length > 0 ? "HISTORICAL_EVIDENCE_REQUIRES_CURRENT_MATCH" : "NOT_PROVEN";
  return {
    ...contract,
    runtimeEvidence,
    historicalVisualEvidence,
    functionalStatus,
    visualStatus,
  };
});

const duplicateIds = Object.entries(
  allContracts.reduce((acc, contract) => {
    acc[contract.id] = (acc[contract.id] ?? 0) + 1;
    return acc;
  }, {}),
).filter(([, count]) => count > 1);

const summary = {
  generatedAt: new Date().toISOString(),
  repository: process.env.GITHUB_REPOSITORY ?? "local",
  commit: process.env.GITHUB_SHA ?? "local",
  scannedFiles: files.length,
  sourceFiles: sourceFiles.length,
  testFiles: tests.length,
  documentationFiles: documents.length,
  pages: allContracts.filter((item) => item.kind === "PAGE").length,
  apis: allContracts.filter((item) => item.kind === "API").length,
  serverActions: actions.length,
  tabSets: tabs.length,
  overlays: overlays.length,
  routeStates: allContracts.filter((item) => ["LOADING_STATE", "ERROR_STATE", "NOT_FOUND_STATE"].includes(item.kind)).length,
  contractsWithRuntimeEvidence: allContracts.filter((item) => item.runtimeEvidence.length > 0).length,
  contractsWithHistoricalVisualEvidence: allContracts.filter((item) => item.historicalVisualEvidence.length > 0).length,
  duplicateContractIds: duplicateIds.length,
};

const inventory = {
  schemaVersion: 1,
  summary,
  duplicateIds,
  contracts: allContracts.sort((a, b) => a.id.localeCompare(b.id)),
};

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(JSON_OUTPUT, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

const unresolved = allContracts.filter((item) => item.functionalStatus === "SOURCE_ONLY" || item.visualStatus === "NOT_PROVEN");
const markdown = [
  "# G4 Contract Inventory — Generated Evidence",
  "",
  `- Repository: \`${summary.repository}\``,
  `- Commit: \`${summary.commit}\``,
  `- Generated: \`${summary.generatedAt}\``,
  `- Scanned files: **${summary.scannedFiles}**`,
  `- Pages: **${summary.pages}**`,
  `- APIs: **${summary.apis}**`,
  `- Server actions: **${summary.serverActions}**`,
  `- Tab sets: **${summary.tabSets}**`,
  `- Modals/drawers/overlays: **${summary.overlays}**`,
  `- Route-level loading/error/not-found states: **${summary.routeStates}**`,
  `- Contracts with referenced runtime tests: **${summary.contractsWithRuntimeEvidence}**`,
  `- Contracts with historical visual evidence: **${summary.contractsWithHistoricalVisualEvidence}**`,
  "",
  "## Status semantics",
  "",
  "- `VERIFIED_BY_TEST_REFERENCE`: a current test references the route or source symbol; manual semantic validation is still required.",
  "- `SOURCE_ONLY`: source exists but no direct test reference was identified by the scanner.",
  "- `HISTORICAL_EVIDENCE_REQUIRES_CURRENT_MATCH`: a report/document references the page or component; this does not automatically prove current visual closure.",
  "- `NOT_PROVEN`: no current repository evidence was found.",
  "",
  "## Unresolved sample",
  "",
  "| Kind | Route/name | Source | Functional | Visual |",
  "|---|---|---|---|---|",
  ...unresolved.slice(0, 100).map((item) => `| ${item.kind} | ${item.route ?? item.name ?? item.component ?? "—"} | \`${item.source}\` | ${item.functionalStatus} | ${item.visualStatus} |`),
  "",
  "The JSON artifact is the canonical machine-readable inventory. No secret values or file contents are emitted.",
  "",
].join("\n");
writeFileSync(MD_OUTPUT, markdown, "utf8");

console.log(JSON.stringify(summary, null, 2));
if (duplicateIds.length > 0) {
  console.error(`Duplicate contract IDs detected: ${duplicateIds.length}`);
  process.exitCode = 1;
}
