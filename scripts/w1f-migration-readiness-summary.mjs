import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import pg from "pg";

const { Client } = pg;

const W1_TABLES = [
  "contract_amendments",
  "contract_approvals",
  "contract_clause_definitions",
  "contract_drafts",
  "contract_snapshots",
  "contract_template_versions",
  "contract_templates",
  "finance_case_events",
  "finance_cases",
  "finance_provider_offers",
];

const W1_MIGRATIONS = [
  "20260815001500_w1_contract_finance_foundation",
  "20260815004500_w1d_snapshot_offer_integrity",
];

const W1_UNIQUE_INDEXES = [
  "uq_contract_snapshots_tenant_draft_type",
  "uq_finance_provider_offers_case_provider_reference",
];

const HISTORICAL_NON_TRANSACTIONAL_MIGRATION =
  "20260721020000_g3_rbac_constraints_indexes";
const HISTORICAL_NON_TRANSACTIONAL_PATH = path.join(
  "prisma",
  "migrations",
  HISTORICAL_NON_TRANSACTIONAL_MIGRATION,
  "migration.sql",
);
const HISTORICAL_FAILURE_MARKERS = [
  "P3018",
  `Migration name: ${HISTORICAL_NON_TRANSACTIONAL_MIGRATION}`,
  "CREATE INDEX CONCURRENTLY cannot run inside a transaction block",
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`W1F_REQUIRED_ENV_MISSING:${name}`);
  return value;
}

function assertIsolatedDatabaseUrl(rawUrl, label) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`W1F_INVALID_DATABASE_URL:${label}`);
  }

  if (!['postgresql:', 'postgres:'].includes(parsed.protocol)) {
    throw new Error(`W1F_NON_POSTGRES_DATABASE_URL:${label}`);
  }
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
    throw new Error(`W1F_NON_LOCAL_DATABASE_FORBIDDEN:${label}`);
  }
  if (parsed.port && parsed.port !== '5432') {
    throw new Error(`W1F_UNEXPECTED_DATABASE_PORT:${label}`);
  }

  const database = parsed.pathname.replace(/^\//, '');
  if (!database.startsWith('orca_w1f_')) {
    throw new Error(`W1F_NON_REHEARSAL_DATABASE_FORBIDDEN:${label}`);
  }

  return rawUrl;
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function writeText(filePath, content) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function runCommand(command, args, { cwd, env, outputPath, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: env ?? process.env,
    encoding: "utf8",
    shell: false,
  });

  if (result.error) throw result.error;

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (outputPath) writeText(outputPath, output);

  const status = result.status ?? 1;
  if (!allowFailure && status !== 0) {
    throw new Error(
      `W1F_COMMAND_FAILED:${command}:${args.slice(0, 3).join(" ")}:exit=${status}\n${output.slice(-4000)}`,
    );
  }

  return { status, output };
}

function prismaEnv(databaseUrl) {
  return {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
  };
}

async function withClient(url, operation) {
  assertIsolatedDatabaseUrl(url, "pg-client");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return await operation(client);
  } finally {
    await client.end();
  }
}

async function legacyFingerprint(url, { excludeW1 = false } = {}) {
  return await withClient(url, async (client) => {
    const tableParams = excludeW1 ? W1_TABLES : [];
    const tablePredicate = excludeW1
      ? `AND tablename <> ALL($1::text[])`
      : "";
    const columnPredicate = excludeW1
      ? `AND table_name <> ALL($1::text[])`
      : "";
    const constraintPredicate = excludeW1
      ? `AND rel.relname <> ALL($1::text[])`
      : "";

    const tables = await client.query(
      `SELECT tablename
         FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> '_prisma_migrations'
          ${tablePredicate}
        ORDER BY tablename`,
      tableParams.length ? [tableParams] : [],
    );

    const columns = await client.query(
      `SELECT table_name,
              ordinal_position,
              column_name,
              data_type,
              udt_name,
              is_nullable,
              COALESCE(column_default, '') AS column_default
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name <> '_prisma_migrations'
          ${columnPredicate}
        ORDER BY table_name, ordinal_position`,
      tableParams.length ? [tableParams] : [],
    );

    const constraints = await client.query(
      `SELECT rel.relname AS table_name,
              con.conname AS constraint_name,
              con.contype AS constraint_type,
              pg_get_constraintdef(con.oid, true) AS definition
         FROM pg_constraint con
         JOIN pg_class rel ON rel.oid = con.conrelid
         JOIN pg_namespace ns ON ns.oid = rel.relnamespace
        WHERE ns.nspname = 'public'
          AND rel.relname <> '_prisma_migrations'
          ${constraintPredicate}
        ORDER BY rel.relname, con.conname`,
      tableParams.length ? [tableParams] : [],
    );

    return {
      tables: tables.rows.map((row) => row.tablename),
      tableCount: tables.rowCount,
      columnsSha256: digest(columns.rows),
      constraintsSha256: digest(constraints.rows),
      columnCount: columns.rowCount,
      constraintCount: constraints.rowCount,
    };
  });
}

async function fullReplay() {
  const replayUrl = assertIsolatedDatabaseUrl(
    requiredEnv("W1F_REPLAY_URL"),
    "full-replay",
  );
  const headDir = path.resolve(requiredEnv("W1F_HEAD_DIR"));
  const evidenceDir = path.resolve(requiredEnv("W1F_EVIDENCE_DIR"));
  ensureDirectory(evidenceDir);

  const env = prismaEnv(replayUrl);
  const initial = runCommand(
    "npx",
    ["prisma", "migrate", "deploy"],
    {
      cwd: headDir,
      env,
      outputPath: path.join(evidenceDir, "full-replay-deploy-initial.txt"),
      allowFailure: true,
    },
  );

  const historicalException = {
    migration: HISTORICAL_NON_TRANSACTIONAL_MIGRATION,
    detected: false,
    manuallyExecutedOutsideTransaction: false,
    resolvedApplied: false,
  };

  if (initial.status !== 0) {
    const exactHistoricalFailure = HISTORICAL_FAILURE_MARKERS.every((marker) =>
      initial.output.includes(marker),
    );
    if (!exactHistoricalFailure) {
      throw new Error(
        `W1F_UNEXPECTED_FULL_REPLAY_FAILURE\n${initial.output.slice(-5000)}`,
      );
    }

    historicalException.detected = true;
    const migrationPath = path.join(
      headDir,
      HISTORICAL_NON_TRANSACTIONAL_PATH,
    );
    if (!fs.existsSync(migrationPath)) {
      throw new Error("W1F_HISTORICAL_MIGRATION_FILE_MISSING");
    }

    runCommand(
      "psql",
      [replayUrl, "-v", "ON_ERROR_STOP=1", "-f", migrationPath],
      {
        cwd: headDir,
        outputPath: path.join(
          evidenceDir,
          "full-replay-historical-nontransactional-apply.txt",
        ),
      },
    );
    historicalException.manuallyExecutedOutsideTransaction = true;

    runCommand(
      "npx",
      [
        "prisma",
        "migrate",
        "resolve",
        "--applied",
        HISTORICAL_NON_TRANSACTIONAL_MIGRATION,
      ],
      {
        cwd: headDir,
        env,
        outputPath: path.join(evidenceDir, "full-replay-historical-resolve.txt"),
      },
    );
    historicalException.resolvedApplied = true;

    runCommand(
      "npx",
      ["prisma", "migrate", "deploy"],
      {
        cwd: headDir,
        env,
        outputPath: path.join(evidenceDir, "full-replay-deploy-resumed.txt"),
      },
    );
  }

  runCommand(
    "npx",
    ["prisma", "migrate", "status"],
    {
      cwd: headDir,
      env,
      outputPath: path.join(evidenceDir, "full-replay-status.txt"),
    },
  );

  runCommand(
    "npx",
    [
      "prisma",
      "migrate",
      "diff",
      "--exit-code",
      "--from-config-datasource",
      "--to-schema",
      "prisma",
    ],
    {
      cwd: headDir,
      env,
      outputPath: path.join(evidenceDir, "full-replay-drift.txt"),
    },
  );

  writeText(
    path.join(evidenceDir, "full-replay-historical-exception.json"),
    `${JSON.stringify(historicalException, null, 2)}\n`,
  );
}

async function materializePreW1a() {
  const headDir = path.resolve(requiredEnv("W1F_HEAD_DIR"));
  const preW1aSchema = path.resolve(requiredEnv("W1F_PRE_W1A_SCHEMA"));
  const output = path.resolve(requiredEnv("W1F_OUTPUT"));

  if (!fs.existsSync(preW1aSchema)) {
    throw new Error("W1F_PRE_W1A_SCHEMA_MISSING");
  }

  runCommand(
    "npx",
    [
      "prisma",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema",
      preW1aSchema,
      "--script",
      "--output",
      output,
    ],
    { cwd: headDir },
  );
}

async function targetedDrift() {
  const upgradeUrl = assertIsolatedDatabaseUrl(
    requiredEnv("W1F_UPGRADE_URL"),
    "targeted-upgrade",
  );
  const headDir = path.resolve(requiredEnv("W1F_HEAD_DIR"));
  const output = path.resolve(requiredEnv("W1F_OUTPUT"));

  runCommand(
    "npx",
    [
      "prisma",
      "migrate",
      "diff",
      "--exit-code",
      "--from-config-datasource",
      "--to-schema",
      "prisma",
    ],
    {
      cwd: headDir,
      env: prismaEnv(upgradeUrl),
      outputPath: output,
    },
  );
}

async function captureLegacy() {
  const url = assertIsolatedDatabaseUrl(
    requiredEnv("DATABASE_URL"),
    "capture-legacy",
  );
  const output = requiredEnv("W1F_OUTPUT");
  const result = await legacyFingerprint(url);
  writeText(output, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

async function summarize() {
  const replayUrl = assertIsolatedDatabaseUrl(
    requiredEnv("W1F_REPLAY_URL"),
    "summary-replay",
  );
  const upgradeUrl = assertIsolatedDatabaseUrl(
    requiredEnv("W1F_UPGRADE_URL"),
    "summary-upgrade",
  );
  const beforePath = requiredEnv("W1F_LEGACY_BEFORE_PATH");
  const output = requiredEnv("W1F_OUTPUT");
  const preW1aSha = requiredEnv("W1F_PRE_W1A_SHA");
  const headSha = requiredEnv("W1F_HEAD_SHA");

  const before = JSON.parse(fs.readFileSync(beforePath, "utf8"));
  const afterLegacy = await legacyFingerprint(upgradeUrl, { excludeW1: true });

  const targeted = await withClient(upgradeUrl, async (client) => {
    const tables = await client.query(
      `SELECT tablename
         FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename = ANY($1::text[])
        ORDER BY tablename`,
      [W1_TABLES],
    );

    const indexes = await client.query(
      `SELECT indexname, indexdef
         FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = ANY($1::text[])
        ORDER BY indexname`,
      [W1_UNIQUE_INDEXES],
    );

    return {
      w1Tables: tables.rows.map((row) => row.tablename),
      uniqueIndexes: indexes.rows,
    };
  });

  const replayMigrations = await withClient(replayUrl, async (client) => {
    const result = await client.query(
      `SELECT migration_name,
              finished_at IS NOT NULL AS finished,
              rolled_back_at IS NULL AS not_rolled_back
         FROM _prisma_migrations
        WHERE migration_name = ANY($1::text[])
        ORDER BY migration_name`,
      [W1_MIGRATIONS],
    );
    return result.rows;
  });

  const legacyPreserved =
    before.tableCount === afterLegacy.tableCount &&
    before.columnCount === afterLegacy.columnCount &&
    before.constraintCount === afterLegacy.constraintCount &&
    before.columnsSha256 === afterLegacy.columnsSha256 &&
    before.constraintsSha256 === afterLegacy.constraintsSha256 &&
    JSON.stringify(before.tables) === JSON.stringify(afterLegacy.tables);

  const tablesComplete =
    targeted.w1Tables.length === W1_TABLES.length &&
    JSON.stringify(targeted.w1Tables) === JSON.stringify([...W1_TABLES].sort());

  const indexesComplete =
    targeted.uniqueIndexes.length === W1_UNIQUE_INDEXES.length &&
    targeted.uniqueIndexes.every((row) => /CREATE UNIQUE INDEX/i.test(row.indexdef));

  const replayComplete =
    replayMigrations.length === W1_MIGRATIONS.length &&
    replayMigrations.every((row) => row.finished === true && row.not_rolled_back === true);

  const summary = {
    verdict:
      legacyPreserved && tablesComplete && indexesComplete && replayComplete
        ? "PASS"
        : "FAIL",
    preW1aSha,
    headSha,
    legacy: {
      before,
      after: afterLegacy,
      preserved: legacyPreserved,
    },
    targeted: {
      expectedW1Tables: W1_TABLES,
      actualW1Tables: targeted.w1Tables,
      tablesComplete,
      expectedUniqueIndexes: W1_UNIQUE_INDEXES,
      actualUniqueIndexes: targeted.uniqueIndexes,
      indexesComplete,
      addedTableCount: W1_TABLES.length,
    },
    replay: {
      expectedMigrations: W1_MIGRATIONS,
      actualMigrations: replayMigrations,
      complete: replayComplete,
    },
  };

  writeText(output, `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary)}\n`);

  if (summary.verdict !== "PASS") process.exit(1);
}

const command = process.argv[2];
if (command === "full-replay") {
  await fullReplay();
} else if (command === "materialize-prew1a") {
  await materializePreW1a();
} else if (command === "targeted-drift") {
  await targetedDrift();
} else if (command === "capture-legacy") {
  await captureLegacy();
} else if (command === "summarize") {
  await summarize();
} else {
  throw new Error(
    "W1F_COMMAND_REQUIRED:full-replay|materialize-prew1a|targeted-drift|capture-legacy|summarize",
  );
}
