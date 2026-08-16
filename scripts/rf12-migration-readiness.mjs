import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import pg from "pg";

const { Client } = pg;

const RF12_TABLES = [
  "rent_flex_direct_invoice_links",
  "rent_flex_offer_terms",
  "rent_flex_selections",
  "rent_flex_settlements",
  "rent_flex_unit_configs",
].sort();

const RF12_INDEXES = [
  "idx_rent_flex_offer_terms_tenant_digest",
  "idx_rent_flex_selections_tenant_lead",
  "idx_rent_flex_selections_tenant_unit_status",
  "idx_rent_flex_settlements_tenant_lease",
  "idx_rent_flex_settlements_tenant_status",
  "idx_rent_flex_unit_configs_tenant_status",
  "idx_rf12_direct_invoice_link_lease",
  "idx_rf12_direct_invoice_link_selection",
  "uq_rent_flex_offer_terms_tenant_id",
  "uq_rent_flex_offer_terms_tenant_offer",
  "uq_rent_flex_selections_tenant_finance_case",
  "uq_rent_flex_selections_tenant_id",
  "uq_rent_flex_selections_tenant_lease",
  "uq_rent_flex_selections_tenant_selected_offer",
  "uq_rent_flex_settlements_tenant_id",
  "uq_rent_flex_settlements_tenant_selection",
  "uq_rent_flex_unit_configs_tenant_unit",
  "uq_rf12_direct_invoice_link_invoice",
  "uq_rf12_direct_invoice_link_selection_period",
].sort();

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`RF12MR_REQUIRED_ENV_MISSING:${name}`);
  return value;
}

function assertLocalDatabase(rawUrl, label) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { throw new Error(`RF12MR_INVALID_DATABASE_URL:${label}`); }
  if (!["postgresql:", "postgres:"].includes(parsed.protocol)) throw new Error(`RF12MR_NON_POSTGRES_DATABASE:${label}`);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) throw new Error(`RF12MR_NON_LOCAL_DATABASE_FORBIDDEN:${label}`);
  if (parsed.port && parsed.port !== "5432") throw new Error(`RF12MR_UNEXPECTED_DATABASE_PORT:${label}`);
  const database = parsed.pathname.replace(/^\//, "");
  if (!database.startsWith("orca_rf12mr_")) throw new Error(`RF12MR_NON_REHEARSAL_DATABASE_FORBIDDEN:${label}`);
  return rawUrl;
}

function ensureDir(filePath) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); }
function write(filePath, content) { ensureDir(filePath); fs.writeFileSync(filePath, content, "utf8"); }

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: options.cwd, env: options.env ?? process.env, encoding: "utf8", shell: false });
  if (result.error) throw result.error;
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (options.outputPath) write(options.outputPath, output);
  const status = result.status ?? 1;
  if (!options.allowFailure && status !== 0) throw new Error(`RF12MR_COMMAND_FAILED:${command}:${args.slice(0,4).join(" ")}:exit=${status}\n${output.slice(-4000)}`);
  return { status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", output };
}

function stripSqlComments(value) { return value.replace(/--.*$/gm, ""); }
function statements(value) { return stripSqlComments(value).split(";").map((s) => s.trim()).filter(Boolean); }
function sha(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

async function withClient(url, fn) {
  assertLocalDatabase(url, "pg");
  const client = new Client({ connectionString: url });
  await client.connect();
  try { return await fn(client); } finally { await client.end(); }
}

async function fingerprint(url) {
  return withClient(url, async (client) => {
    const params = [RF12_TABLES];
    const tables = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' AND tablename <> ALL($1::text[]) ORDER BY tablename`, params);
    const columns = await client.query(`SELECT table_name, ordinal_position, column_name, data_type, udt_name, is_nullable, COALESCE(column_default,'') AS column_default FROM information_schema.columns WHERE table_schema='public' AND table_name <> '_prisma_migrations' AND table_name <> ALL($1::text[]) ORDER BY table_name, ordinal_position`, params);
    const constraints = await client.query(`SELECT rel.relname AS table_name, con.conname AS constraint_name, con.contype AS constraint_type, pg_get_constraintdef(con.oid,true) AS definition FROM pg_constraint con JOIN pg_class rel ON rel.oid=con.conrelid JOIN pg_namespace ns ON ns.oid=rel.relnamespace WHERE ns.nspname='public' AND rel.relname <> '_prisma_migrations' AND rel.relname <> ALL($1::text[]) ORDER BY rel.relname, con.conname`, params);
    const indexes = await client.query(`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename <> ALL($1::text[]) ORDER BY tablename,indexname`, params);
    return { tables: tables.rows.map((r) => r.tablename), tableCount: tables.rowCount, columnsSha256: sha(columns.rows), constraintsSha256: sha(constraints.rows), indexesSha256: sha(indexes.rows) };
  });
}

function staticCheck() {
  const migrationPath = path.resolve(requiredEnv("RF12MR_MIGRATION"));
  const output = path.resolve(requiredEnv("RF12MR_OUTPUT"));
  const sql = fs.readFileSync(migrationPath, "utf8");
  const stmts = statements(sql);
  const invalid = stmts.filter((s) => !/^CREATE\s+(?:TABLE|UNIQUE\s+INDEX|INDEX)\b/i.test(s));
  if (invalid.length) throw new Error(`RF12MR_NON_ADDITIVE_STATEMENT:${invalid[0].slice(0,120)}`);
  if (/\b(?:ALTER|DROP|TRUNCATE|INSERT|UPDATE|DELETE)\b/i.test(stripSqlComments(sql))) throw new Error("RF12MR_DML_OR_DESTRUCTIVE_SQL_FORBIDDEN");
  if (/\bREFERENCES\b/i.test(stripSqlComments(sql))) throw new Error("RF12MR_CROSS_DOMAIN_FOREIGN_KEY_FORBIDDEN");
  const tables = stmts.map((s) => s.match(/^CREATE\s+TABLE\s+"([^"]+)"/i)?.[1]).filter(Boolean).sort();
  const indexes = stmts.map((s) => s.match(/^CREATE\s+(?:UNIQUE\s+)?INDEX\s+"([^"]+)"/i)?.[1]).filter(Boolean).sort();
  if (JSON.stringify(tables) !== JSON.stringify(RF12_TABLES)) throw new Error(`RF12MR_TABLE_SET_MISMATCH:${tables.join(",")}`);
  if (JSON.stringify(indexes) !== JSON.stringify(RF12_INDEXES)) throw new Error(`RF12MR_INDEX_SET_MISMATCH:${indexes.join(",")}`);
  write(output, JSON.stringify({ verdict:"PASS", tableCount:tables.length, indexCount:indexes.length, tables, indexes }, null, 2) + "\n");
}

function materializePre() {
  const preDir = path.resolve(requiredEnv("RF12MR_PRE_PRISMA_DIR"));
  const headDir = path.resolve(requiredEnv("RF12MR_HEAD_DIR"));
  const combined = path.resolve(requiredEnv("RF12MR_COMBINED_SCHEMA"));
  const output = path.resolve(requiredEnv("RF12MR_OUTPUT"));
  const files = fs.readdirSync(preDir).filter((name) => name.endsWith(".prisma")).sort();
  if (files.includes("rent-flex-12.prisma") || files.includes("rent-flex-12-accounting.prisma")) throw new Error("RF12MR_PRE_REFERENCE_ALREADY_CONTAINS_RF12_SCHEMA");
  const text = files.map((name) => `// ${name}\n${fs.readFileSync(path.join(preDir,name),"utf8")}`).join("\n\n");
  write(combined, text);

  let result = null;
  let attempt = 1;
  const attemptsDir = path.dirname(output);
  while (attempt <= 5) {
    result = run("npx", ["prisma","migrate","diff","--from-empty","--to-schema",combined,"--script"], { cwd: headDir, allowFailure: true });
    write(path.join(attemptsDir, `pre-rf12-materialize-attempt-${attempt}.txt`), result.output);
    if (result.status === 0) break;
    if (!result.output.includes("Error in Schema engine")) {
      throw new Error(`RF12MR_PRE_SCHEMA_MATERIALIZE_FAILED:attempt=${attempt}\n${result.output.slice(-4000)}`);
    }
    if (attempt === 5) {
      throw new Error(`RF12MR_PRE_SCHEMA_ENGINE_RETRY_EXHAUSTED:attempts=${attempt}\n${result.output.slice(-4000)}`);
    }
    attempt += 1;
  }
  write(path.join(attemptsDir, "pre-rf12-materialize-retry-summary.json"), JSON.stringify({ attempts: attempt, verdict: "PASS" }, null, 2) + "\n");

  const markerCandidates = ["-- CreateSchema", "-- CreateTable", "CREATE TABLE"];
  const starts = markerCandidates.map((marker) => result.stdout.indexOf(marker)).filter((value) => value >= 0);
  if (!starts.length) throw new Error("RF12MR_PRE_SCHEMA_SQL_MARKER_MISSING");
  const sql = result.stdout.slice(Math.min(...starts));
  if (!/\bCREATE\s+TABLE\b/i.test(sql)) throw new Error("RF12MR_PRE_SCHEMA_SQL_EMPTY");
  write(output, sql);
}

async function captureBefore() {
  const url = assertLocalDatabase(requiredEnv("DATABASE_URL"), "before");
  const output = path.resolve(requiredEnv("RF12MR_OUTPUT"));
  const result = await fingerprint(url);
  write(output, JSON.stringify(result, null, 2) + "\n");
}

async function verifyUpgrade() {
  const url = assertLocalDatabase(requiredEnv("DATABASE_URL"), "upgrade");
  const headDir = path.resolve(requiredEnv("RF12MR_HEAD_DIR"));
  const before = JSON.parse(fs.readFileSync(requiredEnv("RF12MR_BEFORE"), "utf8"));
  const after = await fingerprint(url);
  const legacyPreserved = before.tableCount === after.tableCount && before.columnsSha256 === after.columnsSha256 && before.constraintsSha256 === after.constraintsSha256 && before.indexesSha256 === after.indexesSha256 && JSON.stringify(before.tables) === JSON.stringify(after.tables);
  const actual = await withClient(url, async (client) => {
    const tables = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename=ANY($1::text[]) ORDER BY tablename`, [RF12_TABLES]);
    const indexes = await client.query(`SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND indexname=ANY($1::text[]) ORDER BY indexname`, [RF12_INDEXES]);
    return { tables: tables.rows.map((r)=>r.tablename), indexes:indexes.rows };
  });
  const tablesComplete = JSON.stringify(actual.tables) === JSON.stringify(RF12_TABLES);
  const indexesComplete = actual.indexes.length === RF12_INDEXES.length;
  const env = { ...process.env, DATABASE_URL:url, DIRECT_URL:url };
  const drift = run("npx", ["prisma","migrate","diff","--exit-code","--from-config-datasource","--to-schema","prisma"], { cwd: headDir, env, outputPath: requiredEnv("RF12MR_DRIFT_OUTPUT"), allowFailure:true });
  const zeroDrift = drift.status === 0;
  const summary = { verdict: legacyPreserved && tablesComplete && indexesComplete && zeroDrift ? "PASS" : "FAIL", legacyPreserved, tablesComplete, indexesComplete, zeroDrift, expectedTables: RF12_TABLES, actualTables: actual.tables, expectedIndexes: RF12_INDEXES, actualIndexes: actual.indexes.map((r)=>r.indexname), driftExitCode: drift.status };
  write(requiredEnv("RF12MR_OUTPUT"), JSON.stringify(summary, null, 2) + "\n");
  if (summary.verdict !== "PASS") process.exit(1);
}

const command = process.argv[2];
if (command === "static") staticCheck();
else if (command === "materialize-pre") materializePre();
else if (command === "capture-before") await captureBefore();
else if (command === "verify-upgrade") await verifyUpgrade();
else throw new Error("RF12MR_COMMAND_REQUIRED:static|materialize-pre|capture-before|verify-upgrade");
