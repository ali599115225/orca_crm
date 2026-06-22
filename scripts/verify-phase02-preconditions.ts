import fs from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

function asNumber(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  return Number(value || 0);
}

async function scalar(prisma: any, sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe(sql);
  return asNumber(rows?.[0]?.count);
}

async function relationExists(prisma: any, relation: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT CASE WHEN to_regclass('${relation}') IS NULL THEN 0 ELSE 1 END::bigint AS count`,
  );
  return asNumber(rows?.[0]?.count) === 1;
}

async function columnExists(
  prisma: any,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  return (
    (await scalar(
      prisma,
      `SELECT COUNT(*)::bigint AS count
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = '${tableName}'
         AND column_name = '${columnName}'`,
    )) === 1
  );
}

async function main() {
  loadEnvConfig(process.cwd());
  const { rawPrisma } = await import("../lib/prisma");

  const migrationRoot = path.join(process.cwd(), "prisma", "migrations");
  const foundationMigration = "20260622110000_deal_passport_foundation";
  const closureMigration = "20260622130000_phase02_full_closure";
  const allowedPhase02Migrations = new Set([
    foundationMigration,
    closureMigration,
  ]);

  const localMigrations = fs.existsSync(migrationRoot)
    ? fs
        .readdirSync(migrationRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : [];

  const appliedRows = await rawPrisma.$queryRawUnsafe(
    `SELECT migration_name
     FROM "_prisma_migrations"
     WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
  );
  const appliedMigrations = new Set(
    (appliedRows || []).map((row: any) => String(row.migration_name)),
  );

  const unrelatedPendingMigrations = localMigrations.filter(
    (name) =>
      !allowedPhase02Migrations.has(name) && !appliedMigrations.has(name),
  );
  const expectedPendingMigrations = [...allowedPhase02Migrations].filter(
    (name) => !appliedMigrations.has(name),
  );

  const passportsExist = await relationExists(
    rawPrisma,
    "public.deal_passports",
  );
  const eventsExist = await relationExists(rawPrisma, "public.deal_events");
  const foundationApplied = appliedMigrations.has(foundationMigration);
  const closureApplied = appliedMigrations.has(closureMigration);

  const openedAtExists = passportsExist
    ? await columnExists(rawPrisma, "deal_passports", "opened_at")
    : false;
  const causationIdExists = eventsExist
    ? await columnExists(rawPrisma, "deal_events", "causation_id")
    : false;

  const foundationSchemaMismatch =
    passportsExist !== eventsExist ||
    (foundationApplied && (!passportsExist || !eventsExist)) ||
    (!foundationApplied && (passportsExist || eventsExist));

  const closureSchemaMismatch =
    (closureApplied && (!openedAtExists || !causationIdExists)) ||
    (!closureApplied && (openedAtExists || causationIdExists)) ||
    (closureApplied && !foundationApplied);

  const passportChecks =
    passportsExist && eventsExist
      ? {
          splitOpportunityContractPassports: await scalar(
            rawPrisma,
            `SELECT COUNT(*)::bigint AS count
             FROM deal_passports by_opportunity
             JOIN opportunities o ON o.id = by_opportunity.opportunity_id
             JOIN offers f ON f.linked_opportunity_id = o.id
             JOIN contracts c ON c.offer_id = f.id
             JOIN deal_passports by_contract ON by_contract.contract_id = c.id
             WHERE by_opportunity.id <> by_contract.id`,
          ),
          passportsWithoutOrigin: await scalar(
            rawPrisma,
            `SELECT COUNT(*)::bigint AS count
             FROM deal_passports
             WHERE opportunity_id IS NULL AND contract_id IS NULL`,
          ),
          passportTenantMismatch: await scalar(
            rawPrisma,
            `SELECT COUNT(*)::bigint AS count
             FROM deal_passports d
             LEFT JOIN opportunities o ON o.id = d.opportunity_id
             LEFT JOIN contracts c ON c.id = d.contract_id
             WHERE (o.id IS NOT NULL AND o.tenant_id <> d.tenant_id)
                OR (c.id IS NOT NULL AND c.tenant_id <> d.tenant_id)`,
          ),
        }
      : {
          splitOpportunityContractPassports: 0,
          passportsWithoutOrigin: 0,
          passportTenantMismatch: 0,
        };

  const checks = {
    unrelatedPendingMigrations: unrelatedPendingMigrations.length,
    unfinishedPrismaMigrations: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM "_prisma_migrations"
       WHERE finished_at IS NULL AND rolled_back_at IS NULL`,
    ),
    foundationSchemaMismatch: foundationSchemaMismatch ? 1 : 0,
    closureSchemaMismatch: closureSchemaMismatch ? 1 : 0,
    opportunityLeadOrphans: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM opportunities o
       LEFT JOIN leads l ON l.id = o.lead_id
       WHERE l.id IS NULL`,
    ),
    opportunityLeadTenantMismatch: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM opportunities o
       JOIN leads l ON l.id = o.lead_id
       WHERE o.tenant_id <> l.tenant_id`,
    ),
    opportunitiesWithMultipleContracts: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM (
         SELECT o.id
         FROM opportunities o
         JOIN offers f ON f.linked_opportunity_id = o.id
         JOIN contracts c ON c.offer_id = f.id
         GROUP BY o.id
         HAVING COUNT(DISTINCT c.id) > 1
       ) conflicts`,
    ),
    duplicatePaymentIdempotencyKeys: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM (
         SELECT tenant_id, idempotency_key
         FROM payment_transactions
         WHERE idempotency_key IS NOT NULL AND BTRIM(idempotency_key) <> ''
         GROUP BY tenant_id, idempotency_key
         HAVING COUNT(*) > 1
       ) duplicates`,
    ),
    ...passportChecks,
  };

  console.log(
    JSON.stringify(
      {
        schemaState: {
          foundationApplied,
          closureApplied,
          passportsExist,
          eventsExist,
          openedAtExists,
          causationIdExists,
        },
        checks,
        expectedPendingMigrations,
        unrelatedPendingMigrations,
      },
      null,
      2,
    ),
  );

  await rawPrisma.$disconnect();

  if (Object.values(checks).some((value) => value > 0)) {
    console.error("PHASE02_PRECONDITION_FAILED");
    process.exitCode = 2;
    return;
  }

  console.log("PHASE02_PRECONDITION_PASS");
}

main().catch((error) => {
  console.error("PHASE02_PRECONDITION_FATAL", error);
  process.exitCode = 1;
});
