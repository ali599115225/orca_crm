import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

const ROOT = process.cwd();
const ARTIFACTS = join(ROOT, "artifacts");
const G4_REGISTRY = join(ARTIFACTS, "g4-contract-registry.json");
const OUTPUT_JSON = join(ARTIFACTS, "g5-security-quality-inventory.json");
const OUTPUT_MD = join(ARTIFACTS, "g5-security-quality-inventory.md");
const PACKAGE_JSON = join(ROOT, "package.json");
const PACKAGE_LOCK = join(ROOT, "package-lock.json");

const SOURCE_ROOTS = ["app", "components", "features", "lib", "scripts", "prisma", "tests", ".github"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".yml", ".yaml", ".prisma"]);
const EXCLUDED_DIRECTORIES = new Set([".git", ".next", "node_modules", "coverage", "dist", "build", "artifacts", "generated", ".vercel"]);
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const HIGH_RISK_KEYWORDS = [
  "auth", "session", "user", "staff", "role", "permission", "tenant", "settings", "payment", "pay", "invoice",
  "installment", "finance", "settlement", "contract", "webhook", "whatsapp", "email", "message", "sentinel", "cron",
  "backup", "restore", "import", "export", "upload", "secret", "token", "agent", "provider", "compliance",
];
const AUTH_MARKERS = [
  "getSession(", "requirePermission(", "authorize(", "tenantContextFromSession(", "runWithTenantContext(",
  "assertPlatformOwner", "verifyCronSecret", "verifyWebhook", "validateWebhook", "withTrustedJob", "requireTrustedJob",
  "requireAuth", "getServerSession", "jose", "jwtVerify(",
];
const PUBLIC_ROUTE_MARKERS = ["/api/health", "/api/auth", "/api/public", "/api/webhooks", "/api/cron"];

const RISK_PATTERNS = [
  { id: "DYNAMIC_CODE_EVAL", severity: "CRITICAL", regex: /\beval\s*\(|\bnew\s+Function\s*\(/g },
  { id: "UNSAFE_PRISMA_RAW", severity: "HIGH", regex: /\$queryRawUnsafe\s*\(|\$executeRawUnsafe\s*\(/g },
  { id: "SHELL_EXECUTION", severity: "HIGH", regex: /\b(?:exec|execSync)\s*\(/g },
  { id: "WEAK_HASH", severity: "MEDIUM", regex: /createHash\s*\(\s*["'](?:md5|sha1)["']\s*\)/gi },
  { id: "DANGEROUS_HTML", severity: "MEDIUM", regex: /dangerouslySetInnerHTML/g },
  { id: "INSECURE_RANDOM_SECURITY_CONTEXT", severity: "HIGH", regex: /Math\.random\s*\(/g, requiresSecurityContext: true },
  { id: "HARDCODED_SECRET_CANDIDATE", severity: "HIGH", regex: /\b(?:api[_-]?key|secret|password|token)\b\s*[:=]\s*["'][A-Za-z0-9_\-\/.+=]{20,}["']/gi },
];

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

function lineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
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
  if (contract.kind === "SERVER_ACTION") return highKeyword ? "P0_SECURITY_CRITICAL_SURFACE" : "P1_MUTATION_SURFACE";
  if (["PAGE", "TAB_SET", "MODAL_OR_OVERLAY", "DRAWER"].includes(contract.kind)) return "P3_UI_SURFACE";
  return "P4_SOURCE_STATE";
}

function classifyDependencySpec(spec) {
  if (spec === "latest" || spec === "*" || spec === "x") return "UNBOUNDED";
  if (/^(?:git\+|https?:|file:|github:)/.test(spec)) return "EXTERNAL_SOURCE";
  if (/^[~^]/.test(spec)) return "RANGE";
  return "PINNED_OR_OTHER";
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

const sourceRiskFindings = [];
for (const file of files) {
  if (file.path.startsWith("tests/") || file.path.startsWith("docs/") || file.path.endsWith("package-lock.json")) continue;
  for (const pattern of RISK_PATTERNS) {
    if (pattern.requiresSecurityContext && !/(token|secret|password|session|otp|nonce|invite|reset)/i.test(file.content)) continue;
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(file.content)) !== null) {
      sourceRiskFindings.push({
        id: pattern.id,
        severity: pattern.severity,
        path: file.path,
        line: lineNumber(file.content, match.index),
      });
      if (match.index === pattern.regex.lastIndex) pattern.regex.lastIndex += 1;
    }
  }
}

const apiAuthEvidence = registry.contracts
  .filter((contract) => contract.kind === "API")
  .map((contract) => {
    const source = fileMap.get(contract.source)?.content ?? "";
    const lowerRoute = (contract.route ?? "").toLowerCase();
    const markers = AUTH_MARKERS.filter((marker) => source.includes(marker));
    const publicCategory = PUBLIC_ROUTE_MARKERS.find((marker) => lowerRoute.startsWith(marker)) ?? null;
    return {
      route: contract.route,
      source: contract.source,
      methods: contract.apiMethods ?? [],
      mutation: (contract.apiMethods ?? []).some((method) => MUTATION_METHODS.has(method)),
      directAuthMarkers: markers,
      publicCategory,
      status: markers.length > 0 ? "DIRECT_AUTH_EVIDENCE" : publicCategory ? "PUBLIC_OR_SIGNED_BOUNDARY_REVIEW" : "AUTH_EVIDENCE_NOT_DETECTED",
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
  schemaVersion: 1,
  repository: process.env.GITHUB_REPOSITORY ?? "local",
  commit: process.env.GITHUB_SHA ?? "local",
  scannedFiles: files.length,
  g4Contracts: registry.contracts.length,
  unprovenContracts: unprovenContracts.length,
  unprovenByPriority: countBy(unprovenContracts, (contract) => contract.priority),
  apiRoutes: apiAuthEvidence.length,
  apiAuthEvidenceByStatus: countBy(apiAuthEvidence, (item) => item.status),
  sourceRiskFindings: sourceRiskFindings.length,
  sourceRiskFindingsBySeverity: countBy(sourceRiskFindings, (finding) => finding.severity),
  directDependencies: Object.keys(packageJson.dependencies ?? {}).length,
  devDependencies: Object.keys(packageJson.devDependencies ?? {}).length,
  dependencySpecsByClass: countBy(dependencySpecs, (dependency) => dependency.classification),
  testSignals,
  controls,
};

const inventory = {
  schemaVersion: 1,
  summary,
  controls,
  dependencySpecs,
  testSignals,
  unprovenContracts,
  apiAuthEvidence,
  sourceRiskFindings: sourceRiskFindings.sort((a, b) => a.severity.localeCompare(b.severity) || a.path.localeCompare(b.path) || a.line - b.line),
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
  `- Source risk signals: **${summary.sourceRiskFindings}**`,
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
  "## Source risk signals",
  "",
  "| Severity | Finding | Path | Line |",
  "|---|---|---|---:|",
  ...inventory.sourceRiskFindings.map((finding) => `| ${finding.severity} | ${finding.id} | \`${finding.path}\` | ${finding.line} |`),
  "",
  "## Highest-priority unproven contracts",
  "",
  "| Priority | Kind | Route/name | Source |",
  "|---|---|---|---|",
  ...unprovenContracts.slice(0, 100).map((contract) => `| ${contract.priority} | ${contract.kind} | \`${contract.route ?? contract.name ?? contract.id}\` | \`${contract.source}\` |`),
  "",
  "This inventory reports signals and missing evidence. It does not assign final vulnerability severity or convert missing evidence into a pass.",
  "",
].join("\n");
writeFileSync(OUTPUT_MD, markdown, "utf8");

console.log(JSON.stringify(summary, null, 2));
if (testSignals.focused > 0) {
  console.error(`Focused tests detected: ${testSignals.focused}`);
  process.exitCode = 1;
}
