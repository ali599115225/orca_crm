import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_ROOT = process.cwd();

const ALLOWED_PRODUCTION_MIGRATIONS = Object.freeze([
  "000000000000_baseline",
  "20260705100000_lead_status_officialization",
  "20260712233000_marketing_campaign_foundation",
  "20260713015500_custom_advertising_provider",
  "20260714001500_document_repository",
  "20260815001500_w1_contract_finance_foundation",
  "20260815004500_w1d_snapshot_offer_integrity",
  "20260815010000_w1_schema_alignment",
  "20260816203000_rent_flex_12_persistence_accounting",
]);

const QUARANTINED_MIGRATIONS = Object.freeze({
  "20260721010000_g3_rbac_expand": "8f145508eabe19c99fe4dc951f364ea42f55c8f9",
  "20260721020000_g3_rbac_constraints_indexes": "591401b331e0c07338c19644aef14c193dd675cc",
  "20260726043000_exec_004_organization_authority": "717d44df2759dfd23e8b07b34e0b00530c45212c",
  "20260726123000_exec_005_customer_identity_lifecycle": "4c9473cfa37e4a6f28f931dcf4525edc12fd74dc",
  "20260726124500_exec_005_customer_identity_integrity_hardening": "717cfbafe299a7edb0face5d2dc7292ee376097a",
  "20260726160000_exec_006_unit_commitment_reservation_tours": "a73517d0cb5a2add5ebdd150b2d3bd492ff3547f",
  "20260726161000_exec_006_unit_commitment_integrity_hardening": "6e8dfce9e8c98c555fcec7f233c59f2e1eac3dbb",
  "20260726162000_exec_006_authority_availability_hardening": "70501ddb5804f3f79e0b66e404f5b8fe0055374f",
  "20260726163000_exec_006_availability_disambiguation": "0c7cd92526e3ab806814a876d5453262e6be8561",
  "20260726164000_exec_006_reconciliation_race_hardening": "c144f86a35917b17100d0eca9cc9a070c2e51675",
  "20260726165000_exec_006_lifecycle_approval_guard_hardening": "d55889ae00851f0c1b069517a9c01974ea130fb1",
  "20260726166000_exec_006_exact_scope_hardening": "7a8c84e4165c7e9b94ab03a2a9a9f6889619b6c6",
  "20260727090000_exec_007_exact_scope_foundation": "f38b7b28ae4d89860ba7751424d67d9dea5351a4",
});

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`, "utf8");
  return createHash("sha1").update(header).update(buffer).digest("hex");
}

export function validateMigrationChain(root = DEFAULT_ROOT) {
  const productionRoot = resolve(root, "prisma", "migrations");
  const evidenceRoot = resolve(root, "prisma", "migration-evidence", "non-production");
  const errors = [];

  if (!existsSync(productionRoot)) {
    errors.push("PRODUCTION_MIGRATION_ROOT_MISSING");
    return { verdict: "FAIL", errors };
  }
  if (!existsSync(evidenceRoot)) errors.push("NON_PRODUCTION_EVIDENCE_ROOT_MISSING");

  const entries = readdirSync(productionRoot, { withFileTypes: true });
  const migrationDirectories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const allowed = [...ALLOWED_PRODUCTION_MIGRATIONS].sort();
  const unexpected = migrationDirectories.filter((name) => !ALLOWED_PRODUCTION_MIGRATIONS.includes(name));
  const missing = allowed.filter((name) => !migrationDirectories.includes(name));

  if (unexpected.length) errors.push(`UNAUTHORIZED_PRODUCTION_MIGRATIONS:${unexpected.join(",")}`);
  if (missing.length) errors.push(`REQUIRED_PRODUCTION_MIGRATIONS_MISSING:${missing.join(",")}`);
  if (!existsSync(resolve(productionRoot, "migration_lock.toml"))) errors.push("MIGRATION_LOCK_MISSING");

  for (const name of ALLOWED_PRODUCTION_MIGRATIONS) {
    if (!existsSync(resolve(productionRoot, name, "migration.sql"))) {
      errors.push(`PRODUCTION_MIGRATION_SQL_MISSING:${name}`);
    }
  }

  const evidence = [];
  for (const [name, expectedBlobSha] of Object.entries(QUARANTINED_MIGRATIONS)) {
    const forbiddenProductionPath = resolve(productionRoot, name, "migration.sql");
    if (existsSync(forbiddenProductionPath)) errors.push(`QUARANTINED_MIGRATION_REENTERED_PRODUCTION:${name}`);

    const evidencePath = resolve(evidenceRoot, name, "migration.sql");
    if (!existsSync(evidencePath)) {
      errors.push(`QUARANTINED_EVIDENCE_MISSING:${name}`);
      continue;
    }
    const actualBlobSha = gitBlobSha(readFileSync(evidencePath));
    evidence.push({ name, expectedBlobSha, actualBlobSha, match: actualBlobSha === expectedBlobSha });
    if (actualBlobSha !== expectedBlobSha) {
      errors.push(`QUARANTINED_EVIDENCE_BLOB_MISMATCH:${name}:${actualBlobSha}`);
    }
  }

  return {
    verdict: errors.length ? "FAIL" : "PASS",
    productionMigrationCount: migrationDirectories.length,
    allowedProductionMigrationCount: ALLOWED_PRODUCTION_MIGRATIONS.length,
    quarantinedMigrationCount: Object.keys(QUARANTINED_MIGRATIONS).length,
    evidence,
    errors,
  };
}

const root = process.env.ORCA_MIGRATION_CHAIN_ROOT || DEFAULT_ROOT;
const result = validateMigrationChain(root);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.verdict !== "PASS") process.exitCode = 1;
