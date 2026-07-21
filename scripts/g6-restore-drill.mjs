import { existsSync, statSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const PLAN_ONLY = "PLAN_ONLY";
const EXECUTE = "EXECUTE";
const REFUSE_PRODUCTION_RESTORE = "REFUSE_PRODUCTION_RESTORE";
const REQUIRED_CONFIRMATION = "RESTORE_NON_PRODUCTION";

function fail(message) {
  console.error(`G6 restore drill refused: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const values = new Map();
  const flags = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    if (token === "--execute") {
      flags.add(token);
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(`Missing value for ${token}`);
    values.set(token, value);
    index += 1;
  }
  return { values, flags };
}

function normalizeUrl(value) {
  return value?.trim().replace(/\/$/, "") || "";
}

function postgresConnection(urlValue) {
  let url;
  try {
    url = new URL(urlValue);
  } catch {
    fail("Restore target is not a valid PostgreSQL URL.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    fail("Restore target must use postgres:// or postgresql://.");
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database) fail("Restore target must include a database name.");
  const env = {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: database,
  };
  const sslMode = url.searchParams.get("sslmode");
  if (sslMode) env.PGSSLMODE = sslMode;
  return { database, env };
}

function run(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env,
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    const details = (result.stderr || result.stdout || "command failed").trim();
    fail(`${command} failed: ${details}`);
  }
  return result.stdout.trim();
}

const { values, flags } = parseArgs(process.argv.slice(2));
const mode = flags.has("--execute") ? EXECUTE : PLAN_ONLY;
const backupFileValue = values.get("--backup-file") ?? null;
const backupFile = backupFileValue
  ? isAbsolute(backupFileValue)
    ? backupFileValue
    : resolve(ROOT, backupFileValue)
  : null;

const plan = {
  schemaVersion: 1,
  mode,
  backupFile,
  targetSource: "ORCA_G6_RESTORE_DATABASE_URL",
  safety: {
    executeGate: "ORCA_G6_RESTORE_EXECUTE=true",
    changeApprovalGate: "ORCA_G6_CHANGE_APPROVED=true",
    confirmationGate: `ORCA_G6_RESTORE_CONFIRM=${REQUIRED_CONFIRMATION}`,
    productionPolicy: REFUSE_PRODUCTION_RESTORE,
    sourceTargetEqualityRefused: true,
    destructiveCleanOption: false,
    shellInterpolation: false,
  },
};

if (mode === PLAN_ONLY) {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

if (process.env.ORCA_G6_RESTORE_EXECUTE !== "true") {
  fail("ORCA_G6_RESTORE_EXECUTE=true is required.");
}
if (process.env.ORCA_G6_CHANGE_APPROVED !== "true") {
  fail("ORCA_G6_CHANGE_APPROVED=true is required.");
}
if (process.env.ORCA_G6_RESTORE_CONFIRM !== REQUIRED_CONFIRMATION) {
  fail(`ORCA_G6_RESTORE_CONFIRM=${REQUIRED_CONFIRMATION} is required.`);
}
if (
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production" ||
  process.env.ORCA_ENV === "production"
) {
  fail(REFUSE_PRODUCTION_RESTORE);
}
if (!backupFile || !existsSync(backupFile) || !statSync(backupFile).isFile()) {
  fail("--backup-file must point to an existing dump file.");
}

const targetUrl = normalizeUrl(process.env.ORCA_G6_RESTORE_DATABASE_URL);
if (!targetUrl) fail("ORCA_G6_RESTORE_DATABASE_URL is required.");
const protectedUrls = [normalizeUrl(process.env.DATABASE_URL), normalizeUrl(process.env.DIRECT_URL)].filter(Boolean);
if (protectedUrls.includes(targetUrl)) {
  fail("Restore target matches a protected source/Production connection string.");
}

const connection = postgresConnection(targetUrl);
run("pg_restore", ["--list", backupFile], connection.env);
const startedAt = new Date();
run(
  "pg_restore",
  [
    `--dbname=${connection.database}`,
    "--exit-on-error",
    "--no-owner",
    "--no-acl",
    backupFile,
  ],
  connection.env,
);
const probe = run("psql", ["--tuples-only", "--no-align", "--command=SELECT 1"], connection.env);
if (probe.trim() !== "1") fail("Post-restore connectivity probe did not return 1.");
const completedAt = new Date();

const result = {
  schemaVersion: 1,
  mode,
  backupFile: basename(backupFile),
  startedAt: startedAt.toISOString(),
  completedAt: completedAt.toISOString(),
  durationMs: completedAt.getTime() - startedAt.getTime(),
  integrityVerifiedWith: "pg_restore --list",
  connectivityProbe: "SELECT 1",
  targetDatabase: connection.database,
  productionRestoreRefused: true,
};
const resultPath = `${backupFile}.restore-drill.json`;
writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ ...plan, result, resultPath }, null, 2));
