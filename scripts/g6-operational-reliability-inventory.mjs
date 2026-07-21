import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

const ROOT = process.cwd();
const ARTIFACTS = join(ROOT, "artifacts");
const OUTPUT_JSON = join(ARTIFACTS, "g6-operational-reliability-inventory.json");
const OUTPUT_MD = join(ARTIFACTS, "g6-operational-reliability-inventory.md");
const VERCEL_CONFIG = join(ROOT, "vercel.json");
const CRON_ROOT = join(ROOT, "app/api/cron");
const TEST_ROOT = join(ROOT, "tests");

const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".vercel",
  "artifacts",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".sh", ".md", ".yml", ".yaml", ".json"]);
const AUTH_MARKERS = [
  "CRON_SECRET",
  "verifyCronSecret",
  "isAuthorizedCronRequest",
  "authorizeTrustedJob",
  "timingSafeEqual",
  "Bearer ${",
];
const HEARTBEAT_MARKERS = ["recordHeartbeat", "reconcileStaleHeartbeats"];
const RATE_LIMIT_MARKERS = ["rateLimit(", "rateLimit ("];

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
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function routeFromCronFile(absolute) {
  const relativePath = toPosix(relative(ROOT, absolute));
  return `/${relativePath.replace(/^app\//, "").replace(/\/route\.(?:ts|js)$/, "")}`;
}

function testReferences(route, source, tests) {
  const routeToken = route.replace(/^\//, "");
  const sourceToken = source.replace(/^app\//, "");
  return tests.filter((test) => test.content.includes(route) || test.content.includes(routeToken) || test.content.includes(source) || test.content.includes(sourceToken));
}

if (!existsSync(VERCEL_CONFIG)) {
  throw new Error("Missing vercel.json");
}

mkdirSync(ARTIFACTS, { recursive: true });

const vercel = JSON.parse(read(VERCEL_CONFIG));
const scheduledCrons = Array.isArray(vercel.crons) ? vercel.crons : [];
const scheduledByPath = new Map(scheduledCrons.map((cron) => [cron.path, cron.schedule]));

const cronFiles = [];
walk(CRON_ROOT, cronFiles);
const cronRouteFiles = cronFiles
  .filter((file) => /\/route\.(?:ts|js)$/.test(toPosix(file)))
  .map((absolute) => ({
    absolute,
    source: toPosix(relative(ROOT, absolute)),
    route: routeFromCronFile(absolute),
    content: read(absolute),
  }));
const routeByPath = new Map(cronRouteFiles.map((file) => [file.route, file]));

const testFiles = [];
walk(TEST_ROOT, testFiles);
const tests = testFiles.map((absolute) => ({
  source: toPosix(relative(ROOT, absolute)),
  content: read(absolute),
}));

const allCronPaths = unique([...scheduledByPath.keys(), ...routeByPath.keys()]);
const cronContracts = allCronPaths.map((route) => {
  const file = routeByPath.get(route);
  const refs = file ? testReferences(route, file.source, tests) : [];
  const content = file?.content ?? "";
  const scheduled = scheduledByPath.has(route);
  const authEvidence = AUTH_MARKERS.filter((marker) => content.includes(marker));
  const heartbeatEvidence = HEARTBEAT_MARKERS.filter((marker) => content.includes(marker));
  const rateLimitEvidence = RATE_LIMIT_MARKERS.filter((marker) => content.includes(marker));

  let status = "READY";
  const reasons = [];
  if (scheduled && !file) {
    status = "BLOCKING";
    reasons.push("Scheduled Cron has no route source.");
  }
  if (scheduled && file && authEvidence.length === 0) {
    status = "BLOCKING";
    reasons.push("Scheduled Cron has no detected shared-secret/trusted-job boundary.");
  }
  if (scheduled && file && refs.length === 0) {
    status = "BLOCKING";
    reasons.push("Scheduled Cron has no direct current test reference.");
  }
  if (!scheduled) {
    status = "MANUAL_OR_DISABLED";
    reasons.push("Route exists but is not scheduled by vercel.json.");
  }

  return {
    route,
    source: file?.source ?? null,
    scheduled,
    schedule: scheduledByPath.get(route) ?? null,
    authEvidence,
    rateLimitEvidence,
    heartbeatEvidence,
    testRefs: refs.map((ref) => ref.source),
    status,
    reasons,
  };
});

const healthContracts = [
  { route: "/api/health/live", source: "app/api/health/live/route.ts", purpose: "process liveness" },
  { route: "/api/health/ready", source: "app/api/health/ready/route.ts", purpose: "database readiness" },
  { route: "/api/health/deployment", source: "app/api/health/deployment/route.ts", purpose: "deployment identity" },
  { route: "/api/v1/health", source: "app/api/v1/health/route.ts", purpose: "legacy compatibility" },
].map((contract) => {
  const sourcePath = join(ROOT, contract.source);
  const content = read(sourcePath);
  return {
    ...contract,
    exists: existsSync(sourcePath),
    noStore: /Cache-Control[\s\S]{0,120}no-store/.test(content),
    databaseProbe: content.includes("SELECT 1") || content.includes("$queryRaw"),
    testRefs: testReferences(contract.route, contract.source, tests).map((ref) => ref.source),
  };
});

const operationalFiles = {
  legacyBackupWrapper: "scripts/backup-db.sh",
  backupCommand: "scripts/g6-backup-plan.mjs",
  restoreCommand: "scripts/g6-restore-drill.mjs",
  runbook: "docs/runbooks/ORCA_G6_BACKUP_RESTORE_RUNBOOK.md",
  register: "docs/architecture/ORCA_G6_OPERATIONS_RECOVERY_REGISTER.md",
};

const operationalEvidence = Object.fromEntries(
  Object.entries(operationalFiles).map(([key, path]) => {
    const content = read(join(ROOT, path));
    return [
      key,
      {
        path,
        exists: existsSync(join(ROOT, path)),
        planOnlyDefault: content.includes("PLAN_ONLY"),
        executeGate: /ORCA_G6_(?:BACKUP|RESTORE)_EXECUTE/.test(content),
        approvalGate: content.includes("ORCA_G6_CHANGE_APPROVED"),
        productionRestoreRefusal: content.includes("REFUSE_PRODUCTION_RESTORE"),
        nonProductionConfirmation: content.includes("RESTORE_NON_PRODUCTION"),
        removesBackup: /\brm\s+-f\b|rmSync\s*\(/.test(content),
      },
    ];
  }),
);

const findings = [];
for (const cron of cronContracts) {
  if (cron.status === "BLOCKING") {
    findings.push({
      id: "CRON_CONTRACT_BLOCKING",
      severity: "BLOCKING",
      path: cron.source ?? "vercel.json",
      evidence: `${cron.route}: ${cron.reasons.join(" ")}`,
    });
  }
}
for (const health of healthContracts) {
  if (!health.exists) {
    findings.push({
      id: "HEALTH_CONTRACT_MISSING",
      severity: "BLOCKING",
      path: health.source,
      evidence: `${health.route} is missing.`,
    });
  }
}
if (!operationalEvidence.backupCommand.exists || !operationalEvidence.backupCommand.planOnlyDefault || !operationalEvidence.backupCommand.executeGate || !operationalEvidence.backupCommand.approvalGate) {
  findings.push({
    id: "BACKUP_SAFETY_CONTRACT_MISSING",
    severity: "BLOCKING",
    path: operationalFiles.backupCommand,
    evidence: "Backup command must be plan-only by default and require explicit execute/change gates.",
  });
}
if (!operationalEvidence.restoreCommand.exists || !operationalEvidence.restoreCommand.planOnlyDefault || !operationalEvidence.restoreCommand.executeGate || !operationalEvidence.restoreCommand.approvalGate || !operationalEvidence.restoreCommand.productionRestoreRefusal || !operationalEvidence.restoreCommand.nonProductionConfirmation) {
  findings.push({
    id: "RESTORE_SAFETY_CONTRACT_MISSING",
    severity: "BLOCKING",
    path: operationalFiles.restoreCommand,
    evidence: "Restore drill must default to plan-only, require explicit gates, and refuse Production.",
  });
}
if (operationalEvidence.legacyBackupWrapper.removesBackup) {
  findings.push({
    id: "LEGACY_BACKUP_DELETES_ARCHIVE",
    severity: "BLOCKING",
    path: operationalFiles.legacyBackupWrapper,
    evidence: "Backup compatibility wrapper must not delete the generated archive.",
  });
}
if (!operationalEvidence.runbook.exists || !operationalEvidence.register.exists) {
  findings.push({
    id: "DURABLE_RECOVERY_DOCUMENTATION_MISSING",
    severity: "BLOCKING",
    path: "docs",
    evidence: "G6 requires a current runbook and operations/recovery register.",
  });
}

const summary = {
  scheduledCrons: scheduledCrons.length,
  cronRoutes: cronRouteFiles.length,
  scheduledCronContractsReady: cronContracts.filter((cron) => cron.scheduled && cron.status === "READY").length,
  unscheduledCronRoutes: cronContracts.filter((cron) => !cron.scheduled).length,
  healthContracts: healthContracts.length,
  healthContractsPresent: healthContracts.filter((health) => health.exists).length,
  blockingFindings: findings.filter((finding) => finding.severity === "BLOCKING").length,
  repositoryRecoveryControlsPresent: Object.values(operationalEvidence).filter((entry) => entry.exists).length,
};

const inventory = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  summary,
  cronContracts,
  healthContracts,
  operationalEvidence,
  findings,
  historicalEvidencePolicy: {
    archiveReportsAreAuthoritative: false,
    reason: "Archived reports contain contradictory and unverified backup/restore claims; only executable current-source evidence is accepted by G6.",
  },
};

writeFileSync(OUTPUT_JSON, `${JSON.stringify(inventory, null, 2)}\n`);

const md = [
  "# ORCA G6 Operational Reliability Inventory",
  "",
  `Generated: ${inventory.generatedAt}`,
  "",
  "## Summary",
  "",
  `- Scheduled Crons: **${summary.scheduledCrons}**`,
  `- Cron route sources: **${summary.cronRoutes}**`,
  `- Scheduled Cron contracts ready: **${summary.scheduledCronContractsReady}**`,
  `- Unscheduled/manual Cron routes: **${summary.unscheduledCronRoutes}**`,
  `- Health contracts present: **${summary.healthContractsPresent}/${summary.healthContracts}**`,
  `- Blocking findings: **${summary.blockingFindings}**`,
  "",
  "## Cron contracts",
  "",
  "| Route | Schedule | Auth | Tests | Heartbeat | Status |",
  "|---|---|---:|---:|---:|---|",
  ...cronContracts.map((cron) => `| \`${cron.route}\` | ${cron.schedule ?? "manual/disabled"} | ${cron.authEvidence.length} | ${cron.testRefs.length} | ${cron.heartbeatEvidence.length} | ${cron.status} |`),
  "",
  "## Findings",
  "",
  ...(findings.length === 0 ? ["No blocking repository findings."] : findings.map((finding) => `- **${finding.severity}** \`${finding.id}\` — ${finding.path}: ${finding.evidence}`)),
  "",
  "Archived backup and recovery reports are historical context only and are not accepted as current execution evidence.",
  "",
];
writeFileSync(OUTPUT_MD, md.join("\n"));

console.log(JSON.stringify({ output: toPosix(relative(ROOT, OUTPUT_JSON)), summary }, null, 2));
