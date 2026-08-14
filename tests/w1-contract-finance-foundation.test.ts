import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { REQUIRED_TENANT_MODELS } from "@/lib/tenant-model-policy";

const W1A_MODELS = [
  "ContractTemplate",
  "ContractTemplateVersion",
  "ContractClauseDefinition",
  "ContractDraft",
  "ContractSnapshot",
  "ContractApproval",
  "ContractAmendment",
  "FinanceCase",
  "FinanceProviderOffer",
  "FinanceCaseEvent",
] as const;

const MIGRATION_TABLES = [
  "contract_templates",
  "contract_template_versions",
  "contract_clause_definitions",
  "contract_drafts",
  "contract_snapshots",
  "contract_approvals",
  "contract_amendments",
  "finance_cases",
  "finance_provider_offers",
  "finance_case_events",
] as const;

function readSchema(): string {
  return fs.readFileSync(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");
}

function readMigration(): string {
  return fs.readFileSync(
    path.join(
      process.cwd(),
      "prisma",
      "migrations",
      "20260815001500_w1_contract_finance_foundation",
      "migration.sql",
    ),
    "utf8",
  );
}

function extractModelBlock(schema: string, modelName: string): string {
  const pattern = new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)(?:\\r?\\n)\\}`);
  const match = schema.match(pattern);
  if (!match) {
    throw new Error(`model ${modelName} not found in schema.prisma`);
  }
  return match[1];
}

describe("W1A contract finance foundation — schema", () => {
  const schema = readSchema();

  it("declares exactly the ten frozen W1A models", () => {
    for (const model of W1A_MODELS) {
      const occurrences = schema.match(new RegExp(`model\\s+${model}\\s*\\{`, "g")) ?? [];
      expect(occurrences).toHaveLength(1);
    }
  });

  it.each(W1A_MODELS)("model %s declares tenantId and a Tenant relation", (model) => {
    const block = extractModelBlock(schema, model);
    expect(block).toMatch(/tenantId\s+String\s+@map\("tenant_id"\)\s+@db\.Uuid/);
    expect(block).toMatch(/tenant\s+Tenant\s+@relation\(fields:\s*\[tenantId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/);
  });

  it("keeps existing Contract.unitId required and unique", () => {
    const block = extractModelBlock(schema, "Contract");
    expect(block).toMatch(/unitId\s+String\s+@unique\s+@map\("unit_id"\)/);
    expect(block).not.toMatch(/unitId\s+String\?/);
  });

  it("keeps existing PaymentPlan.contractId unique and adds no financeCaseId", () => {
    const block = extractModelBlock(schema, "PaymentPlan");
    expect(block).toMatch(/contractId\s+String\s+@unique\s+@map\("contract_id"\)/);
    expect(block).not.toMatch(/financeCaseId/);
  });

  it("keeps FinanceCase unitId, leadId, and contractId nullable", () => {
    const block = extractModelBlock(schema, "FinanceCase");
    expect(block).toMatch(/leadId\s+String\?\s+@map\("lead_id"\)/);
    expect(block).toMatch(/unitId\s+String\?\s+@map\("unit_id"\)/);
    expect(block).toMatch(/contractId\s+String\?\s+@map\("contract_id"\)/);
  });

  it("keeps FinanceCase internalStatus and authorityStatus as separate fields", () => {
    const block = extractModelBlock(schema, "FinanceCase");
    expect(block).toMatch(/internalStatus\s+String\s+@default\("DRAFT"\)\s+@map\("internal_status"\)/);
    expect(block).toMatch(/authorityStatus\s+String\?\s+@map\("authority_status"\)/);
  });

  it("keeps ContractSnapshot free of a mutable updatedAt column", () => {
    const block = extractModelBlock(schema, "ContractSnapshot");
    expect(block).not.toMatch(/updatedAt/);
  });
});

describe("W1A contract finance foundation — tenant model policy", () => {
  it("registers all ten W1A models as required tenant models", () => {
    for (const model of W1A_MODELS) {
      expect(REQUIRED_TENANT_MODELS).toContain(model);
    }
  });

  it("expects the required tenant model registry to have exactly 108 entries", () => {
    expect(REQUIRED_TENANT_MODELS).toHaveLength(108);
  });
});

describe("W1A contract finance foundation — migration", () => {
  const migration = readMigration();
  // SQL comment lines are prose (they may reference keywords descriptively);
  // statement-level assertions run against the executable SQL only.
  const executableSql = migration
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  it("creates all ten W1A tables", () => {
    for (const table of MIGRATION_TABLES) {
      expect(executableSql).toMatch(new RegExp(`CREATE TABLE "${table}"`));
    }
  });

  it("contains no data mutation or backfill statements", () => {
    // Distinguish DML "UPDATE <table> SET" statements from the legitimate
    // "ON UPDATE CASCADE" foreign key action clause used throughout the FKs.
    expect(executableSql).not.toMatch(/(?:^|;)\s*UPDATE\s+"/im);
    expect(executableSql).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(executableSql).not.toMatch(/\bINSERT\s+INTO\b/i);
  });

  it("contains no destructive column alterations", () => {
    expect(executableSql).not.toMatch(/\bDROP\s+COLUMN\b/i);
    expect(executableSql).not.toMatch(/\bALTER\s+COLUMN\b/i);
  });

  it("does not alter existing payment_plans, installments, or contracts tables", () => {
    expect(executableSql).not.toMatch(/ALTER TABLE\s+"payment_plans"/i);
    expect(executableSql).not.toMatch(/ALTER TABLE\s+"installments"/i);
    expect(executableSql).not.toMatch(/ALTER TABLE\s+"contracts"/i);
  });
});