import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const MIGRATION_PATH = join(ROOT, "prisma", "migrations", "20260816203000_rent_flex_12_persistence_accounting", "migration.sql");
const MIGRATION = readFileSync(MIGRATION_PATH, "utf8");
const WORKFLOW = readFileSync(join(ROOT, ".github", "workflows", "rf12-migration-readiness.yml"), "utf8");
const SCRIPT = readFileSync(join(ROOT, "scripts", "rf12-migration-readiness.mjs"), "utf8");
const GATE = readFileSync(join(ROOT, "docs", "product-extension", "RENT_FLEX_12_MIGRATION_READINESS_GATE.md"), "utf8");

const stripComments = (value: string) => value.replace(/--.*$/gm, "");
const statements = stripComments(MIGRATION).split(";").map((s) => s.trim()).filter(Boolean);

describe("RF12 isolated migration readiness", () => {
  it("pins the exact pre-RF12 architecture head and exact candidate head", () => {
    expect(WORKFLOW).toContain("PRE_RF12_SHA: 7762b851738b4600d6f87edc7b94140b39fc8d9c");
    expect(WORKFLOW).toContain("ref: ${{ github.event.pull_request.head.sha || github.sha }}");
    expect(WORKFLOW).toContain('test "$candidate" = "$event_head"');
    expect(WORKFLOW).toContain("test ! -e pre/prisma/rent-flex-12.prisma");
    expect(WORKFLOW).toContain("test ! -e pre/prisma/rent-flex-12-accounting.prisma");
    expect(WORKFLOW).toContain("test -e pre/prisma/w1-contract-finance.prisma");
  });

  it("keeps the migration additive and scoped to five RF12 tables", () => {
    expect(statements.filter((s) => /^CREATE\s+TABLE\b/i.test(s))).toHaveLength(5);
    expect(statements.filter((s) => /^CREATE\s+UNIQUE\s+INDEX\b/i.test(s))).toHaveLength(11);
    expect(statements.filter((s) => /^CREATE\s+INDEX\b/i.test(s))).toHaveLength(8);
    expect(statements.every((s) => /^CREATE\s+(?:TABLE|UNIQUE\s+INDEX|INDEX)\b/i.test(s))).toBe(true);
    expect(stripComments(MIGRATION)).not.toMatch(/\b(?:ALTER|DROP|TRUNCATE|INSERT|UPDATE|DELETE)\b/i);
    expect(stripComments(MIGRATION)).not.toMatch(/\bREFERENCES\b/i);
    for (const table of ["rent_flex_unit_configs","rent_flex_selections","rent_flex_offer_terms","rent_flex_settlements","rent_flex_direct_invoice_links"]) expect(MIGRATION).toContain(`CREATE TABLE "${table}"`);
  });

  it("preserves the frozen scalar-reference boundary", () => {
    expect(MIGRATION).not.toContain('REFERENCES "units"');
    expect(MIGRATION).not.toContain('REFERENCES "rental_leases"');
    expect(MIGRATION).not.toContain('REFERENCES "finance_cases"');
    expect(MIGRATION).not.toContain('REFERENCES "finance_provider_offers"');
    expect(MIGRATION).not.toContain('REFERENCES "invoices"');
  });

  it("rehearses only on local PostgreSQL 16 with no production secrets", () => {
    expect(WORKFLOW).toContain("image: postgres:16");
    expect(WORKFLOW).toContain("127.0.0.1:5432/orca_rf12mr_");
    expect(WORKFLOW).not.toMatch(/\$\{\{\s*secrets\./);
    expect(WORKFLOW).not.toContain("neon.tech");
    expect(WORKFLOW).not.toContain("supabase.co");
    expect(SCRIPT).toContain("RF12MR_NON_LOCAL_DATABASE_FORBIDDEN");
    expect(SCRIPT).toContain("RF12MR_NON_REHEARSAL_DATABASE_FORBIDDEN");
  });

  it("reconstructs the exact pre-RF12 supported schema using the proven W1F split", () => {
    const materialize = WORKFLOW.indexOf("name: Materialize supported pre-RF12 base schema");
    const w1 = WORKFLOW.indexOf("name: Apply exact pre-RF12 W1 schema migrations");
    const capture = WORKFLOW.indexOf("name: Capture legacy fingerprint before RF12");
    const apply = WORKFLOW.indexOf("name: Apply RF12 migration to isolated database");
    const verify = WORKFLOW.indexOf("name: Verify exact schema drift and legacy preservation");
    expect(materialize).toBeGreaterThanOrEqual(0);
    expect(w1).toBeGreaterThan(materialize);
    expect(capture).toBeGreaterThan(w1);
    expect(apply).toBeGreaterThan(capture);
    expect(verify).toBeGreaterThan(apply);
    expect(WORKFLOW).toContain('DATABASE_URL="$UPGRADE_URL" DIRECT_URL="$UPGRADE_URL" RF12MR_PRE_PRISMA_DIR=pre/prisma');
    expect(WORKFLOW).toContain("cp evidence/pre-rf12-base-schema.sql evidence/pre-rf12-base-schema.raw.txt");
    expect(WORKFLOW).toContain("const marker = '-- CreateSchema';");
    expect(WORKFLOW).toContain("RF12MR_PRE_BASE_SQL_MARKER_MISSING");
    expect(WORKFLOW).toContain("RF12MR_PRE_BASE_SQL_PREAMBLE_NOT_STRIPPED");
    expect(WORKFLOW).toContain("if (/^◇\\s/m.test(sql))");
    expect(SCRIPT).toContain('const supportedBaseFiles = ["schema.prisma", "rbac.prisma"]');
    expect(SCRIPT).toContain("RF12MR_BASE_SCHEMA_UNEXPECTED_W1_MODEL");
    expect(SCRIPT).toContain("while (attempt <= 5)");
    expect(SCRIPT).toContain('result.output.includes("Error in Schema engine")');
    for (const migration of ["20260815001500_w1_contract_finance_foundation","20260815004500_w1d_snapshot_offer_integrity","20260815010000_w1_schema_alignment"]) expect(WORKFLOW).toContain(migration);
  });

  it("requires zero Prisma drift and legacy fingerprint preservation after RF12", () => {
    expect(SCRIPT).toContain('"--from-config-datasource"');
    expect(SCRIPT).toContain('"--to-schema","prisma"');
    expect(SCRIPT).toContain("const zeroDrift = drift.status === 0");
    expect(SCRIPT).toContain("legacyPreserved");
  });

  it("requires all RF12 uniqueness and lookup indexes", () => {
    for (const index of ["uq_rent_flex_unit_configs_tenant_unit","uq_rent_flex_selections_tenant_lease","uq_rent_flex_selections_tenant_finance_case","uq_rent_flex_selections_tenant_selected_offer","uq_rent_flex_offer_terms_tenant_offer","uq_rent_flex_settlements_tenant_selection","uq_rf12_direct_invoice_link_selection_period","uq_rf12_direct_invoice_link_invoice","idx_rf12_direct_invoice_link_lease","idx_rf12_direct_invoice_link_selection"]) expect(MIGRATION).toContain(`"${index}"`);
  });

  it("remains readiness-only and requires separate production authorization", () => {
    expect(GATE).toContain("no production migration application");
    expect(GATE).toContain("does not authorize `ORCA_RENT_FLEX_12_SCHEMA_READY=true`");
    expect(GATE).toContain("separate owner authorization");
    expect(WORKFLOW).not.toContain("environment: production");
    expect(WORKFLOW).not.toContain("vercel");
  });

  it("always cleans up and uploads durable evidence", () => {
    expect(WORKFLOW).toContain("name: Cleanup isolated database");
    expect(WORKFLOW).toContain("if: always()");
    expect(WORKFLOW).toContain("dropdb -h 127.0.0.1 -U postgres --if-exists orca_rf12mr_upgrade");
    expect(WORKFLOW).toContain("name: rf12-migration-readiness-evidence");
    expect(WORKFLOW).toContain("retention-days: 14");
  });
});
