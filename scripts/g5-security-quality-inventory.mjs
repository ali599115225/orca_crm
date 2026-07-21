import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve, sep } from "node:path";

const ROOT = process.cwd();
const ARTIFACTS = join(ROOT, "artifacts");
const G4_REGISTRY = join(ARTIFACTS, "g4-contract-registry.json");
const OUTPUT_JSON = join(ARTIFACTS, "g5-security-quality-inventory.json");
const OUTPUT_MD = join(ARTIFACTS, "g5-security-quality-inventory.md");
const PACKAGE_JSON = join(ROOT, "package.json");
const PACKAGE_LOCK = join(ROOT, "package-lock.json");

const SOURCE_ROOTS = ["app", "components", "features", "lib", "scripts", "prisma", "tests", ".github"];
const RUNTIME_PREFIXES = ["app/", "components/", "features/", "lib/"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".yml", ".yaml", ".prisma"]);
const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const EXCLUDED_DIRECTORIES = new Set([".git", ".next", "node_modules", "coverage", "dist", "build", "artifacts", "generated", ".vercel"]);
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const READ_ACTION_PREFIX = /^(?:get|list|fetch|load|search|read|check|preview|calculate|compute|resolve)/i;
const IMPORT_PATTERN = /(?:import|export)\s+(?:[^"']+?\s+from\s+)?["']([^"']+)["']/g;
const HIGH_RISK_KEYWORDS = [
  "auth", "session", "user", "staff", "role", "permission", "tenant", "settings", "payment", "pay", "invoice",
  "installment", "finance", "settlement", "contract", "webhook", "whatsapp", "email", "message", "sentinel", "cron",
  "backup", "restore", "import", "export", "upload", "secret", "token", "agent", "provider", "compliance",
];
const AUTH_MARKERS = [
  "runWithDatabaseSession", "requireDatabaseSession", "getSession(", "getVerifiedSession", "requirePermission(",
  "authorize(", "tenantContextFromSession(", "runWithTenantContext(", "assertPlatformOwner", "requirePlatformOwner",
  "verifyCronSecret", "isAuthorizedCronRequest", "verifyWebhook", "validateWebhook", "verifySignature", "verifyHmac",
  "withTrustedJob", "requireTrustedJob", "requireAuth", "getServerSession", "jwtVerify(",
];
const PUBLIC_ROUTE_MARKERS = [
  "/api/health", "/api/auth", "/api/public", "/api/webhooks", "/api/cron", "/api/realtime",
  "/api/whatsapp/webhook", "/api/revenue-integrity/webhook", "/api/v1/leads/webhook",
];
const SECURITY_RANDOM_CONTEXT = /(idempotenc|nonce|otp|token|secret|password|session|invite|reset|verification|signature|csrf)/i;

function toPosix(value) {
  return value.split(sep).join("/");
}

function walk(directory, files) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory)) {
    if (EXCLUDED_DIRECTORIES.has(entry)) continue;
    const absolute = join(directory, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) walk(absolute, files);
    else if (SOURCE_EXTENSIONS.has(extname(entry))) files.push(absolute);
  }
}

function read(path) {
  return readFileSync(path, "utf8");
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

function lineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function localContext(content, index, radius = 260) {
  return content.slice(Math.max(0, index - radius), Math.min(content.length, index + radius));
}

function resolveImport(fromPath, specifier, fileMap) {
  if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return null;
  const base = specifier.startsWith("@/")
    ? resolve(ROOT, specifier.slice(2))
    : resolve(ROOT, dirname(fromPath), specifier);
  const candidates = [
    base,
    ...CODE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...CODE_EXTENSIONS.map((extension) => join(base, `index${extension}`)),
  ];
  for (const candidate of candidates) {
    const repoPath = toPosix(relative(ROOT, normalize(candidate)));
    if (fileMap.has(repoPath)) return repoPath;
  }
  return null;
}

function collectTransitive(startPath, field, metadata, depth = 10, seen = new Set()) {
  if (depth < 0 || seen.has(startPath)) return [];
  seen.add(startPath);
  const current = metadata.get(startPath);
  if (!current) return [];
  const values = [...current[field]];
  for (const imported of current.resolvedImports) {
    values.push(...collectTransitive(imported, field, metadata, depth - 1, seen));
  }
  return unique(values);
}

function riskPriority(contract) {
  const text = `${contract.id} ${contract.route ?? ""} ${contract.name ?? ""} ${contract.source}`.toLowerCase();
  const highKeyword = HIGH_RISK_KEYWORDS.some((keyword) => text.includes(keyword));
  if (contract.kind === "API") {
    const mutates = (contract.apiMethods ?? []).some((method) => MUTATION_METHODS.has(method));
    if (mutates && highKeyword) return "P0_SECURITY_CRITICAL_SURFACE";
    if (mutates) return "P1_MUTATION_SURFACE";
    if (highKeyword) return "P1_SENSITIVE_READ_SURFACE";
    return "P2_READ_SURFACE";
  }
  if (contract.kind === "SERVER_ACTION") {
    const readsOnly = READ_ACTION_PREFIX.test(contract.name ?? "");
    if (readsOnly) return highKeyword ? "P1_SENSITIVE_READ_SURFACE" : "P2_READ_SURFACE";
    return highKeyword ? "P0_SECURITY_CRITICAL_SURFACE" : "P1_MUTATION_SURFACE";
  }
  if (["PAGE", "TAB_SET", "MODAL_OR_OVERLAY", "DRAWER"].includes(contract.kind)) return "P3_UI_SURFACE";
  return "P4_SOURCE_STATE";
}

function classifyDependencySpec(spec) {
  if (spec === "latest" || spec === "*" || spec === "x") return "UNBOUNDED";
  if (/^(?:git\+|https?:|file:|github:)/.test(spec)) return "EXTERNAL_SOURCE";
  if (/^[~^]/.test(spec)) return "RANGE";
  return "PINNED_OR_OTHER";
}

function addFinding(target, id, severity, file, index, evidence) {
  target.push({
    id,
    severity,
    path: file.path,
    line: lineNumber(file.content, index),
    evidence,
  });
}

function scanRuntimeRisks(file) {
  const findings = [];
  const patterns = [
    { id: "DYNAMIC_CODE_EVAL", severity: "CRITICAL", regex: /\beval\s*\(|\bnew\s+Function\s*\(/g },
    { id: "UNSAFE_PRISMA_RAW", severity: "HIGH", regex: /\$queryRawUnsafe\s*\(|\$executeRawUnsafe\s*\(/g },
    { id: "WEAK_HASH", severity: "MEDIUM", regex: /createHash\s*\(\s*["'](?:md5|sha1)["']\s*\)/gi },
    { id: "HARDCODED_SECRET_CANDIDATE", severity: "HIGH", regex: /\b(?:api[_-]?key|secret|password|token)\b\s*[:=]\s*["'][A-Za-z0-9_\-\/.+=]{20,}["']/gi },
  ];
  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(file.content)) !== null) {
      addFinding(findings, pattern.id, pattern.severity, file, match.index, "Direct runtime source match requiring review.");
      if (match.index === pattern.regex.lastIndex) pattern.regex.lastIndex += 1;
    }
  }

  const htmlPattern = /dangerouslySetInnerHTML/g;
  let htmlMatch;
  while ((htmlMatch = htmlPattern.exec(file.content)) !== null) {
    const context = localContext(file.content, htmlMatch.index, 900);
    const dynamic = context.includes("${") || !/__html\s*:\s*`/.test(context);
    addFinding(
      findings,
      dynamic ? "DYNAMIC_DANGEROUS_HTML" : "STATIC_DANGEROUS_HTML",
      dynamic ? "HIGH" : "LOW",
      file,
      htmlMatch.index,
      dynamic ? "HTML payload may be dynamic and requires sanitization review." : "Static inline style/template; no user input detected by the scanner.",
    );
  }

  const randomPattern = /Math\.random\s*\(/g;
  let randomMatch;
  while ((randomMatch = randomPattern.exec(file.content)) !== null) {
    const context = localContext(file.content, randomMatch.index, 360);
    if (SECURITY_RANDOM_CONTEXT.test(context)) {
      addFinding(
        findings,
        "INSECURE_RANDOM_SECURITY_CONTEXT",
        "HIGH",
        file,
        randomMatch.index,
        "Math.random is used near a security/idempotency identifier.",
      );
    }
  }

  const childProcessImport = /from\s+["'](?:node:)?child_process["']|require\s*\(\s*["'](?:node:)?child_process["']\s*\)/.test(file.content);
  if (childProcessImport) {
    const shellPattern = /\b(?:exec|execSync|spawn|spawnSync)\s*\(/g;
    let shellMatch;
    while ((shellMatch = shellPattern.exec(file.content)) !== null) {
      addFinding(findings, "CHILD_PROCESS_EXECUTION", "HIGH", file, shellMatch.index, "Runtime source imports child_process and executes a process.");
    }
  }

  return findings;
}

function scanToolingSignals(file) {
  const findings = [];
  const unsafeRaw = /\$queryRawUnsafe\s*\(|\$executeRawUnsafe\s*\(/g;
  let rawMatch;
  while ((rawMatch = unsafeRaw.exec(file.content)) !== null) {
    addFinding(findings, "TOOLING_UNSAFE_PRISMA_RAW", "REVIEW", file, rawMatch.index, "Operational script uses a dynamic SQL API; review allowlisted identifiers and dry-run safeguards.");
  }
  const childProcessImport = /from\s+["'](?:node:)?child_process["']|require\s*\(\s*["'](?:node:)?child_process["']\s*\)/.test(file.content);
  if (childProcessImport) {
    const shellPattern = /\b(?:exec|execSync|spawn|spawnSync)\s*\(/g;
    let shellMatch;
    while ((shellMatch = shellPattern.exec(file.content)) !== null) {
      addFinding(findings, "TOOLING_CHILD_PROCESS_EXECUTION", "REVIEW", file, shellMatch.index, "Repository tooling executes a child process and requires fixed arguments/no shell interpolation.");
    }
  }
  return findings;
}

if (!existsSync(G4_REGISTRY)) throw new Error(`Missing G4 registry: ${G4_REGISTRY}`);
if (!existsSync(PACKAGE_JSON) || !existsSync(PACKAGE_LOCK)) throw new Error("package.json and package-lock.json are required.");

const packageJson = JSON.parse(read(PACKAGE_JSON));
const packageLock = JSON.parse(read(PACKAGE_LOCK));
const registry = JSON.parse(read(G4_REGISTRY));

const absoluteFiles = [];
for (const root of SOURCE_ROOTS) walk(join(ROOT, root), absoluteFiles);
const files = absoluteFiles.map((absolute) => ({
  absolute,
  path: toPosix(relative(ROOT, absolute)),
  content: read(absolute),
}));
const fileMap = new Map(files.map((file) => [file.path, file]));
const codeFiles = files.filter((file) => CODE_EXTENSIONS.includes(extname(file.path)));
const metadata = new Map();
for (const file of codeFiles) {
  const imports = unique(matches(IMPORT_PATTERN, file.content));
  metadata.set(file.path, {
    resolvedImports: unique(imports.map((specifier) => resolveImport(file.path, specifier, fileMap))),
    directAuthMarkers: AUTH_MARKERS.filter((marker) => file.content.includes(marker)),
  });
}

const unprovenContracts = registry.contracts
  .filter((contract) => contract.functionalStatus === "NOT_PROVEN")
  .map((contract) => ({
    id: contract.id,
    kind: contract.kind,
    route: contract.route,
    name: contract.name,
    source: contract.source,
    apiMethods: contract.apiMethods ?? [],
    priority: riskPriority(contract),
    modelDependencies: contract.modelDependencies ?? [],
    permissions: contract.permissions ?? [],
  }))
  .sort((a, b) => a.priority.localeCompare(b.priority) || a.id.localeCompare(b.id));

const runtimeRiskFindings = files
  .filter((file) => RUNTIME_PREFIXES.some((prefix) => file.path.startsWith(prefix)))
  .flatMap(scanRuntimeRisks)
  .sort((a, b) => a.severity.localeCompare(b.severity) || a.path.localeCompare(b.path) || a.line - b.line);

const toolingRiskSignals = files
  .filter((file) => file.path.startsWith("scripts/") || file.path.startsWith("prisma/"))
  .flatMap(scanToolingSignals)
  .sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);

const apiAuthEvidence = registry.contracts
  .filter((contract) => contract.kind === "API")
  .map((contract) => {
    const lowerRoute = (contract.route ?? "").toLowerCase();
    const authMarkers = collectTransitive(contract.source, "directAuthMarkers", metadata);
    const publicCategory = PUBLIC_ROUTE_MARKERS.find((marker) => lowerRoute.startsWith(marker)) ?? null;
    return {
      route: contract.route,
      source: contract.source,
      methods: contract.apiMethods ?? [],
      mutation: (contract.apiMethods ?? []).some((method) => MUTATION_METHODS.has(method)),
      authMarkers,
      publicCategory,
      status: authMarkers.length > 0
        ? "DIRECT_OR_TRANSITIVE_AUTH_EVIDENCE"
        : publicCategory
          ? "PUBLIC_SIGNED_OR_CRON_BOUNDARY_REVIEW"
          : "AUTH_EVIDENCE_NOT_DETECTED",
    };
  })
  .sort((a, b) => a.status.localeCompare(b.status) || a.route.localeCompare(b.route));

const allDependencies = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {}),
};
const dependencySpecs = Object.entries(allDependencies).map(([name, spec]) => ({
  name,
  spec,
  lockedVersion: packageLock.packages?.[`node_modules/${name}`]?.version ?? null,
  classification: classifyDependencySpec(spec),
  production: Object.prototype.hasOwnProperty.call(packageJson.dependencies ?? {}, name),
}));

const testFiles = files.filter((file) => file.path.startsWith("tests/") && /\.(?:test|spec)\.(?:ts|tsx|js|jsx)$/.test(file.path));
const testSignals = {
  files: testFiles.length,
  skipped: testFiles.reduce((count, file) => count + (file.content.match(/\b(?:it|test|describe)\.skip\s*\(/g) ?? []).length, 0),
  focused: testFiles.reduce((count, file) => count + (file.content.match(/\b(?:it|test|describe)\.only\s*\(/g) ?? []).length, 0),
  todo: testFiles.reduce((count, file) => count + (file.content.match(/\b(?:it|test)\.todo\s*\(/g) ?? []).length, 0),
};

const controls = {
  codeql: existsSync(join(ROOT, ".github/workflows/codeql.yml")),
  dependabot: existsSync(join(ROOT, ".github/dependabot.yml")),
  lockfile: existsSync(PACKAGE_LOCK),
  packageLockVersion: packageLock.lockfileVersion ?? null,
  typecheckScript: Boolean(packageJson.scripts?.typecheck),
  lintScript: Boolean(packageJson.scripts?.lint),
  auditScript: Boolean(packageJson.scripts?.["security:audit"]),
  playwrightConfig: ["playwright.config.ts", "playwright.config.js", "playwright.config.mjs"].some((path) => existsSync(join(ROOT, path))),
  vitestConfig: ["vitest.config.ts", "vitest.config.js", "vitest.config.mjs"].some((path) => existsSync(join(ROOT, path))),
};

const summary = {
  schemaVersion: 2,
  repository: process.env.GITHUB_REPOSITORY ?? "local",
  commit: process.env.GITHUB_SHA ?? "local",
  scannedFiles: files.length,
  g4Contracts: registry.contracts.length,
  unprovenContracts: unprovenContracts.length,
  unprovenByPriority: countBy(unprovenContracts, (contract) => contract.priority),
  apiRoutes: apiAuthEvidence.length,
  apiAuthEvidenceByStatus: countBy(apiAuthEvidence, (item) => item.status),
  runtimeRiskFindings: runtimeRiskFindings.length,
  runtimeRiskFindingsBySeverity: countBy(runtimeRiskFindings, (finding) => finding.severity),
  toolingRiskSignals: toolingRiskSignals.length,
  directDependencies: Object.keys(packageJson.dependencies ?? {}).length,
  devDependencies: Object.keys(packageJson.devDependencies ?? {}).length,
  dependencySpecsByClass: countBy(dependencySpecs, (dependency) => dependency.classification),
  testSignals,
  controls,
};

const inventory = {
  schemaVersion: 2,
  summary,
  controls,
  dependencySpecs,
  testSignals,
  unprovenContracts,
  apiAuthEvidence,
  runtimeRiskFindings,
  toolingRiskSignals,
};

mkdirSync(ARTIFACTS, { recursive: true });
writeFileSync(OUTPUT_JSON, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

const markdown = [
  "# G5 Security and Quality Inventory — Generated Evidence",
  "",
  `- Repository: \`${summary.repository}\``,
  `- Commit: \`${summary.commit}\``,
  `- Scanned files: **${summary.scannedFiles}**`,
  `- G4 contracts: **${summary.g4Contracts}**`,
  `- Functional NOT_PROVEN contracts: **${summary.unprovenContracts}**`,
  `- API routes: **${summary.apiRoutes}**`,
  `- Runtime risk findings: **${summary.runtimeRiskFindings}**`,
  `- Tooling review signals: **${summary.toolingRiskSignals}**`,
  `- Test files: **${summary.testSignals.files}**`,
  "",
  "## Existing controls",
  "",
  ...Object.entries(controls).map(([key, value]) => `- ${key}: \`${value}\``),
  "",
  "## Unproven contracts by priority",
  "",
  "| Priority | Count |",
  "|---|---:|",
  ...Object.entries(summary.unprovenByPriority).sort(([a], [b]) => a.localeCompare(b)).map(([priority, count]) => `| ${priority} | ${count} |`),
  "",
  "## API authorization evidence",
  "",
  "| Status | Count |",
  "|---|---:|",
  ...Object.entries(summary.apiAuthEvidenceByStatus).sort(([a], [b]) => a.localeCompare(b)).map(([status, count]) => `| ${status} | ${count} |`),
  "",
  "## Runtime risk findings",
  "",
  "| Severity | Finding | Path | Line | Evidence |",
  "|---|---|---|---:|---|",
  ...runtimeRiskFindings.map((finding) => `| ${finding.severity} | ${finding.id} | \`${finding.path}\` | ${finding.line} | ${finding.evidence} |`),
  "",
  "## Tooling review signals",
  "",
  "| Finding | Path | Line | Evidence |",
  "|---|---|---:|---|",
  ...toolingRiskSignals.map((finding) => `| ${finding.id} | \`${finding.path}\` | ${finding.line} | ${finding.evidence} |`),
  "",
  "## Highest-priority unproven contracts",
  "",
  "| Priority | Kind | Route/name | Source |",
  "|---|---|---|---|",
  ...unprovenContracts.slice(0, 100).map((contract) => `| ${contract.priority} | ${contract.kind} | \`${contract.route ?? contract.name ?? contract.id}\` | \`${contract.source}\` |`),
  "",
  "This inventory reports current evidence and review signals. It does not convert missing evidence into a pass.",
  "",
].join("\n");
writeFileSync(OUTPUT_MD, markdown, "utf8");

console.log(JSON.stringify(summary, null, 2));
if (testSignals.focused > 0) {
  console.error(`Focused tests detected: ${testSignals.focused}`);
  process.exitCode = 1;
}
