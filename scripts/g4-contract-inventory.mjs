import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve, sep } from "node:path";

const ROOT = process.cwd();
const OUTPUT_DIR = join(ROOT, "artifacts");
const JSON_OUTPUT = join(OUTPUT_DIR, "g4-contract-inventory.json");
const MD_OUTPUT = join(OUTPUT_DIR, "g4-contract-inventory.md");
const ROOTS = ["app", "components", "features", "lib", "prisma", "tests", "docs/architecture", "docs/reports/foundation"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".prisma", ".md"]);
const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const EXCLUDED_DIRECTORIES = new Set([".git", ".next", "node_modules", "coverage", "dist", "build", "artifacts", ".vercel"]);
const GENERIC_BASENAMES = new Set(["page", "route", "layout", "loading", "error", "default", "index", "not-found"]);
const GENERIC_ROUTE_TOKENS = new Set(["api", "app", "admin", "operations"]);
const API_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];
const OVERLAY_PATTERN = /<([A-Z][A-Za-z0-9]*(?:Dialog|Modal|Drawer|Sheet|Popover|AlertDialog|Command)[A-Za-z0-9]*)\b/g;
const PRISMA_PATTERN = /\bprisma\.([a-zA-Z][a-zA-Z0-9_]*)\b/g;
const PERMISSION_PATTERN = /["'`]([a-z][a-z0-9_]*(?:\.[a-z0-9_]+){1,3})["'`]/g;
const EXPORT_FUNCTION_PATTERN = /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g;
const EXPORT_CONST_PATTERN = /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g;
const IMPORT_PATTERN = /(?:import|export)\s+(?:[^"']+?\s+from\s+)?["']([^"']+)["']/g;
const TAB_VALUE_PATTERN = /<(?:TabsTrigger|Tab)[^>]*\bvalue=["']([^"']+)["'][^>]*>/g;
const ROLE_TAB_PATTERN = /\brole=["']tab["']/g;
const TAB_ARRAY_PATTERN = /(?:const|let)\s+[A-Za-z_$][\w$]*tabs[A-Za-z_$\w]*\s*=\s*\[([\s\S]{0,6000}?)\]\s*(?:as\s+const)?/gi;
const TAB_KEY_PATTERN = /\b(?:id|key|value)\s*:\s*["']([^"']+)["']/g;
const ACTIVE_TAB_VALUE_PATTERN = /(?:activeTab\s*===?\s*|setActiveTab\s*\()\s*["']([^"']+)["']/g;
const SIMPLE_STRING_PATTERN = /["']([^"']{1,80})["']/g;
const EMPTY_PATTERN = /\bEmptyState\b|لا\s+توجد|لا\s+يوجد|no\s+(?:items?|records?|results?|data)\b|empty\s+state/gi;
const ERROR_PATTERN = /\bErrorBoundary\b|حدث\s+خطأ|تعذر|failed\s+to\s+load/gi;
const LOADING_PATTERN = /\bSuspense\b|\bLoading\b|جاري\s+التحميل/gi;

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
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
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

function test(regex, content) {
  regex.lastIndex = 0;
  const result = regex.test(content);
  regex.lastIndex = 0;
  return result;
}

function appRouteFromPath(repoPath) {
  const segments = repoPath.split("/");
  if (segments[0] !== "app") return null;
  const file = segments.at(-1);
  if (!file || !/^(page|route|loading|error|not-found|default|layout)\.(?:ts|tsx|js|jsx)$/.test(file)) return null;
  const routeSegments = segments.slice(1, -1).filter((segment) => !/^\(.+\)$/.test(segment) && !segment.startsWith("@"));
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

function tabValues(content) {
  const found = [...matches(TAB_VALUE_PATTERN, content), ...matches(ACTIVE_TAB_VALUE_PATTERN, content)];
  TAB_ARRAY_PATTERN.lastIndex = 0;
  let block;
  while ((block = TAB_ARRAY_PATTERN.exec(content)) !== null) {
    const body = block[1] ?? "";
    const keyed = matches(TAB_KEY_PATTERN, body);
    if (keyed.length > 0) found.push(...keyed);
    else if (body.length < 1200) found.push(...matches(SIMPLE_STRING_PATTERN, body).filter((value) => value.length <= 40));
  }
  return unique(found);
}

function resolveImport(fromPath, specifier, fileMap) {
  if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return null;
  const base = specifier.startsWith("@/")
    ? resolve(ROOT, specifier.slice(2))
    : resolve(ROOT, dirname(fromPath), specifier);
  const candidates = [base, ...CODE_EXTENSIONS.map((extension) => `${base}${extension}`), ...CODE_EXTENSIONS.map((extension) => join(base, `index${extension}`))];
  for (const candidate of candidates) {
    const repoPath = toPosix(relative(ROOT, normalize(candidate)));
    if (fileMap.has(repoPath)) return repoPath;
  }
  return null;
}

function collectTransitive(startPath, field, metadata, depth = 8, seen = new Set()) {
  if (depth < 0 || seen.has(startPath)) return [];
  seen.add(startPath);
  const current = metadata.get(startPath);
  if (!current) return [];
  const values = [...current[field]];
  for (const imported of current.resolvedImports) values.push(...collectTransitive(imported, field, metadata, depth - 1, seen));
  return unique(values);
}

function evidenceFor(contract, tests) {
  const sourceWithoutExt = contract.source.replace(/\.[^.]+$/, "");
  const alias = `@/${sourceWithoutExt}`;
  const basename = sourceWithoutExt.split("/").at(-1) ?? "";
  const route = contract.route;
  const candidates = [];
  for (const item of tests) {
    const routeMatch = route && route !== "/" && item.content.includes(route);
    const sourceMatch = item.content.includes(sourceWithoutExt) || item.content.includes(alias);
    const symbolMatch = contract.name && item.content.includes(contract.name);
    const componentMatch = contract.component && item.content.includes(contract.component);
    const basenameMatch = !GENERIC_BASENAMES.has(basename) && basename.length > 4 && item.content.includes(basename);
    if (routeMatch || sourceMatch || symbolMatch || componentMatch || basenameMatch) candidates.push(item.path);
  }
  return unique(candidates).slice(0, 50);
}

function visualEvidenceFor(contract, documents) {
  const routeTokens = (contract.route ?? "")
    .split("/")
    .filter(Boolean)
    .filter((token) => !token.startsWith("[") && !GENERIC_ROUTE_TOKENS.has(token.toLowerCase()))
    .map((token) => token.toLowerCase());
  const sourceWithoutExt = contract.source.replace(/\.[^.]+$/, "");
  const basename = sourceWithoutExt.split("/").at(-1)?.toLowerCase() ?? "";
  const symbols = [contract.name, contract.component].filter(Boolean).map((value) => value.toLowerCase());
  return documents
    .filter((document) => {
      const haystack = `${document.path}\n${document.content}`.toLowerCase();
      return routeTokens.some((token) => token.length > 3 && haystack.includes(token)) ||
        symbols.some((symbol) => symbol.length > 4 && haystack.includes(symbol)) ||
        (!GENERIC_BASENAMES.has(basename) && basename.length > 4 && haystack.includes(basename));
    })
    .map((document) => document.path)
    .slice(0, 30);
}

function functionalContract(contract) {
  if (contract.kind === "PAGE") return `Render ${contract.route} from current server/client composition; mutations must remain server-authorized and recorded states must be preserved.`;
  if (contract.kind === "API") return `Expose only ${contract.apiMethods.join(", ") || "detected handler methods"} for ${contract.route}; revalidate identity, tenant scope, permission, and input server-side.`;
  if (contract.kind === "SERVER_ACTION") return `Execute ${contract.name} only on the server with current session/context validation and the recorded permission/model boundaries.`;
  if (contract.kind === "TAB_SET") return `Expose the recorded tab set without silently dropping loading, empty, error, permission, or navigation behavior.`;
  if (contract.kind === "DRAWER" || contract.kind === "MODAL_OR_OVERLAY") return `Open and close ${contract.component} with bounded focus/state behavior while preserving its server-authorized mutations.`;
  return `Preserve the current ${contract.kind.toLowerCase()} behavior for ${contract.route ?? contract.source}.`;
}

const absoluteFiles = [];
for (const root of ROOTS) walk(join(ROOT, root), absoluteFiles);
const files = absoluteFiles.map((absolute) => {
  const content = read(absolute);
  return { absolute, path: toPosix(relative(ROOT, absolute)), content, hash: hash(content) };
});
const fileMap = new Map(files.map((file) => [file.path, file]));
const prismaSchema = fileMap.get("prisma/schema.prisma")?.content ?? "";
const prismaDelegates = new Set(matches(/^model\s+([A-Za-z][A-Za-z0-9_]*)/gm, prismaSchema).map((name) => `${name[0].toLowerCase()}${name.slice(1)}`));
const tests = files.filter((file) => file.path.startsWith("tests/") || /(?:^|\/)__tests__(?:\/|$)/.test(file.path));
const documents = files.filter((file) => file.path.startsWith("docs/") && file.path.endsWith(".md"));
const sourceFiles = files.filter((file) => !file.path.startsWith("tests/") && !file.path.startsWith("docs/"));

const metadata = new Map();
for (const file of sourceFiles) {
  const imports = unique(matches(IMPORT_PATTERN, file.content));
  metadata.set(file.path, {
    imports,
    resolvedImports: unique(imports.map((specifier) => resolveImport(file.path, specifier, fileMap))),
    directModels: unique(matches(PRISMA_PATTERN, file.content).filter((model) => prismaDelegates.has(model))),
    directPermissions: permissionKeys(file.content),
  });
}

const contracts = [];
const actions = [];
const overlays = [];
const tabs = [];
for (const file of sourceFiles) {
  const meta = metadata.get(file.path);
  const route = appRouteFromPath(file.path);
  const models = collectTransitive(file.path, "directModels", metadata);
  const permissions = collectTransitive(file.path, "directPermissions", metadata);
  const exportedFunctions = unique([...matches(EXPORT_FUNCTION_PATTERN, file.content), ...matches(EXPORT_CONST_PATTERN, file.content)]);
  const isJsxSurface = /\.(?:tsx|jsx)$/.test(file.path) && /^(?:app|components|features)\//.test(file.path);
  const overlayComponents = isJsxSurface ? unique(matches(OVERLAY_PATTERN, file.content)) : [];
  const values = isJsxSurface ? tabValues(file.content) : [];
  const roleTabCount = isJsxSurface ? matches(ROLE_TAB_PATTERN, file.content, 0).length : 0;
  const isServerAction = file.path.startsWith("app/actions/") || /["']use server["']/.test(file.content);
  const stateEvidence = {
    loading: test(LOADING_PATTERN, file.content) || file.path.includes("/loading."),
    empty: test(EMPTY_PATTERN, file.content),
    error: test(ERROR_PATTERN, file.content) || file.path.includes("/error."),
    notFound: file.path.includes("/not-found."),
  };

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
      imports: meta.imports,
      resolvedImports: meta.resolvedImports,
      directModelDependencies: meta.directModels,
      modelDependencies: models,
      directPermissions: meta.directPermissions,
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
        directModelDependencies: meta.directModels,
        modelDependencies: models,
        directPermissions: meta.directPermissions,
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

  if (isJsxSurface && (values.length > 0 || roleTabCount > 0 || /\bactiveTab\b|\bsetActiveTab\b/.test(file.content))) {
    tabs.push({
      id: `TAB_SET:${file.path}`,
      kind: "TAB_SET",
      source: file.path,
      sourceHash: file.hash,
      values,
      explicitRoleTabCount: roleTabCount,
      modelDependencies: models,
      permissions,
      stateEvidence,
    });
  }
}

const allContracts = [...contracts, ...actions, ...overlays, ...tabs].map((contract) => {
  const runtimeEvidence = evidenceFor(contract, tests);
  const historicalVisualEvidence = visualEvidenceFor(contract, documents);
  return {
    ...contract,
    functionalContract: functionalContract(contract),
    runtimeEvidence,
    historicalVisualEvidence,
    functionalStatus: runtimeEvidence.length > 0 ? "EVIDENCE_REFERENCED" : "NOT_PROVEN",
    visualStatus: historicalVisualEvidence.length > 0 ? "HISTORICAL_EVIDENCE_REQUIRES_CURRENT_MATCH" : "NOT_PROVEN",
  };
});

const duplicateIds = Object.entries(allContracts.reduce((acc, contract) => {
  acc[contract.id] = (acc[contract.id] ?? 0) + 1;
  return acc;
}, {})).filter(([, count]) => count > 1);
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
const inventory = { schemaVersion: 3, summary, duplicateIds, contracts: allContracts.sort((a, b) => a.id.localeCompare(b.id)) };
mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(JSON_OUTPUT, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
const unresolved = allContracts.filter((item) => item.functionalStatus === "NOT_PROVEN" || item.visualStatus === "NOT_PROVEN");
const markdown = [
  "# G4 Contract Inventory — Generated Evidence",
  "",
  `- Schema: **${inventory.schemaVersion}**`,
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
  `- Contracts with referenced runtime evidence: **${summary.contractsWithRuntimeEvidence}**`,
  `- Contracts with historical visual evidence: **${summary.contractsWithHistoricalVisualEvidence}**`,
  "",
  "## Status semantics",
  "",
  "- `EVIDENCE_REFERENCED`: a current test references the route, source path, symbol, or component. Semantic assertions still require reconciliation.",
  "- `HISTORICAL_EVIDENCE_REQUIRES_CURRENT_MATCH`: a retained report references the surface; this does not automatically prove current visual closure.",
  "- `NOT_PROVEN`: no sufficient current repository evidence was detected.",
  "",
  "## Unresolved sample",
  "",
  "| Kind | Route/name | Source | Functional | Visual |",
  "|---|---|---|---|---|",
  ...unresolved.slice(0, 120).map((item) => `| ${item.kind} | ${item.route ?? item.name ?? item.component ?? "—"} | \`${item.source}\` | ${item.functionalStatus} | ${item.visualStatus} |`),
  "",
  "The JSON artifact is canonical machine-readable discovery evidence. It contains no source contents, secrets, environment values, or runtime records.",
  "",
].join("\n");
writeFileSync(MD_OUTPUT, markdown, "utf8");
console.log(JSON.stringify(summary, null, 2));
if (duplicateIds.length > 0) {
  console.error(`Duplicate contract IDs detected: ${duplicateIds.length}`);
  process.exitCode = 1;
}
