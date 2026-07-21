import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const PLAN_ONLY = "PLAN_ONLY";
const EXECUTE = "EXECUTE";
const ALLOWED_TYPES = new Set(["ci", "daily", "weekly", "monthly", "manual"]);

function fail(message) {
  console.error(`G6 backup refused: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const values = new Map();
  const flags = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    if (["--execute", "--upload-s3"].includes(token)) {
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

function postgresConnection(urlValue) {
  let url;
  try {
    url = new URL(urlValue);
  } catch {
    fail("Database URL is not a valid PostgreSQL URL.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    fail("Database URL must use postgres:// or postgresql://.");
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database) fail("Database URL must include a database name.");
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
const type = values.get("--type") ?? "manual";
if (!ALLOWED_TYPES.has(type)) fail(`Unsupported backup type: ${type}`);
const outputDirectoryValue = values.get("--output-dir") ?? "artifacts/g6-backups";
const outputDirectory = isAbsolute(outputDirectoryValue)
  ? outputDirectoryValue
  : resolve(ROOT, outputDirectoryValue);
const uploadS3 = flags.has("--upload-s3");

const plan = {
  schemaVersion: 1,
  mode,
  type,
  outputDirectory,
  uploadS3,
  safety: {
    executeGate: "ORCA_G6_BACKUP_EXECUTE=true",
    changeApprovalGate: "ORCA_G6_CHANGE_APPROVED=true",
    productionApprovalGate: "ORCA_G6_PRODUCTION_APPROVED=true when running in Production",
    localArchiveDeletion: false,
    shellInterpolation: false,
  },
};

if (mode === PLAN_ONLY) {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

if (process.env.ORCA_G6_BACKUP_EXECUTE !== "true") {
  fail("ORCA_G6_BACKUP_EXECUTE=true is required.");
}
if (process.env.ORCA_G6_CHANGE_APPROVED !== "true") {
  fail("ORCA_G6_CHANGE_APPROVED=true is required.");
}
const productionEnvironment =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production" ||
  process.env.ORCA_ENV === "production";
if (productionEnvironment && process.env.ORCA_G6_PRODUCTION_APPROVED !== "true") {
  fail("Production backup requires ORCA_G6_PRODUCTION_APPROVED=true.");
}

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!databaseUrl) fail("DIRECT_URL or DATABASE_URL is required.");
const connection = postgresConnection(databaseUrl);

mkdirSync(outputDirectory, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = join(outputDirectory, `orca-${type}-${timestamp}.dump`);

run(
  "pg_dump",
  [
    `--dbname=${connection.database}`,
    "--format=custom",
    "--compress=9",
    "--no-owner",
    "--no-acl",
    `--file=${backupFile}`,
  ],
  connection.env,
);
run("pg_restore", ["--list", backupFile], connection.env);

const bytes = statSync(backupFile).size;
const sha256 = createHash("sha256").update(readFileSync(backupFile)).digest("hex");
const manifest = {
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  type,
  file: basename(backupFile),
  absolutePath: backupFile,
  bytes,
  sha256,
  integrityVerifiedWith: "pg_restore --list",
  uploaded: false,
};

if (uploadS3) {
  const bucket = process.env.S3_BACKUP_BUCKET?.trim();
  if (!bucket) fail("S3_BACKUP_BUCKET is required with --upload-s3.");
  const region = process.env.AWS_REGION?.trim() || "me-central-1";
  const key = `${type}/${basename(backupFile)}`;
  const args = ["s3", "cp", backupFile, `s3://${bucket}/${key}`, "--region", region];
  const kmsKey = process.env.S3_BACKUP_KMS_KEY_ID?.trim();
  if (kmsKey) {
    args.push("--sse", "aws:kms", "--sse-kms-key-id", kmsKey);
  } else {
    args.push("--sse", "AES256");
  }
  run("aws", args, process.env);
  manifest.uploaded = true;
  manifest.s3 = { bucket, key, region, encryption: kmsKey ? "SSE-KMS" : "SSE-S3" };
}

const manifestPath = `${backupFile}.manifest.json`;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ ...plan, result: manifest, manifestPath }, null, 2));
