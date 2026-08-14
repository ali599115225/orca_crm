import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyTenantIsolationToQuery } from "@/lib/tenant-prisma-enforcement";
import { REQUIRED_TENANT_MODELS } from "@/lib/tenant-model-policy";

const ROOT = process.cwd();
const LEGACY_SCHEMA = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8");
const W1_SCHEMA = readFileSync(join(ROOT, "prisma", "w1-contract-finance.prisma"), "utf8");
const MIGRATION = readFileSync(
  join(ROOT, "prisma", "migrations", "20260815001500_w1_contract_finance_foundation", "migration.sql"),
  "utf8",
);

const W1_MODELS = [
  "ContractTemplate",
  "ContractTemplateVersion",
  "ContractClauseDefinition",
  "ContractDraft",
  "ContractSnapshot",
  "ContractApproval",
  "ContractAmment",
  "FinanceCase",
  "FinanceProviderOffer",
  "FinanceCaseEvent",
] as const;

const W1_TABLES = [
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

function modelBlock(source: string, model: string): string {
  const match = source.match(new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!match) throw new Error(`Missing Prisma model ${model}`);
  return match[0];
}

describe("W1A Contract Studio + Finance Case foundation", () => {
  it("defines exactly the ten frozen W1A models in the additive Prisma domain", () => {
    for (const model of W1_MODELS) {
      expect(W1_SCHEMA.match(new RegExp(`model\\s+${model}\\s*\\{`, "g")) ?? []).toHaveLength(1);
      expect(modelBlock(W1_SCHEMA, model)).toMatch(/tenantId\s+String\s+@map\("tenant_id"\)\s+@db\.Uuid/);
      expect(modelBlock(W1_SCHEMA, model)).toContain("@@unique([tenantId, id]");
    }

    const declaredW1Models = [...W1_SCHEMA.matchAll(/^model\s+(\w+)\s*\{/gm)].map((match) => match[1]);
    expect(declaredW1Models).toEqual([...W1_MODELS]);
  });

  it("preserves the existing Transaction Spine contract and company PaymentPlan invariants", () => {
    const contract = modelBlock(LEGACY_SCHEMA, "Contract");
    const paymentPlan = modelBlock(LEGACY_SCHEMA, "PaymentPlan");

    expect(contract).toMatch(/unitId\s+String\s+@unique\s+@map\("unit_id"\)\s+@db\.Uuid/);
    expect(paymentPlan).toMatch(/contractId\s+String\s+@unique\s+@map\("contract_id"\)\s+@db\.Uuid/);
    expect(paymentPlan).not.toContain("financeCaseId");
  });

  it("keeps finance workflow state separate from provider authority state and legacy links nullable", () => {
    const financeCase = modelBlock(W1_SCHEMA, "FinanceCase");

    expect(financeCase).toMatch(/leadId\s+String\?/);
    expect(financeCase).toMatch(/unitId\s+String\?/);
    expect(financeCase).toMatch(/contractId\s+String\?/);
    expect(financeCase).toMatch(/internalStatus\s+String\s+@default\("DRAFT"\)/);
    expect(financeCase).toMatch(/authorityStatus\s+String\?/);
    expect(financeCase).toMatch(/authorityProvider\s+String\?/);
    expect(financeCase).toMatch(/authorityReference\s+String\?/);
  });

  it("keeps issued/signed ContractSnapshot append-oriented and without updatedAt", () => {
    const snapshot = modelBlock(W1_SCHEMA, "ContractSnapshot");

    expect(snapshot).not.toMatch(/\bupdatedAt\b/);
    expect(snapshot).toMatch(/renderedContent\s+String/);
    expect(snapshot).toMatch(/structuredFacts\s+Json/);
    expect(snapshot).toMatch(/clauseSnapshot\s+Json/);
    expect(snapshot).toMatch(/approvalSnapshot\s+Json/);
    expect(snapshot).toMatch(/digest\s+String\s+@db\.VarChar\(64\)/);
    expect(snapshot).toMatch(/issuedAt\s+DateTime\s+@default\(now\(\)\)/);
  });

  it("registers all W1A models as required tenant models", () => {
    expect(REQUIRED_TENANT_MODELS).toHaveLength(108);
    for (const model of W1_MODELS) {
      expect(REQUIRED_TENANT_MODELS).toContain(model);
    }
  });

  it("injects tenant isolation for representative ContractDraft and FinanceCase reads/writes", () => {
    const context = { tenantId: "tenant-w1", userId: "user-w1" } as const;

    expect(
      applyTenantIsolationToQuery(
        { where: { status: "DRAFT", tenantId: "other" } },
        { model: "ContractDraft", operation: "findMany", context, failClosed: true },
      ),
    ).toEqual({ where: { status: "DRAFT", tenantId: "tenant-w1" } });

    expect(
      applyTenantIsolationToQuery(
        { data: { tenantId: "other", caseNumber: "FIN-1", purpose: "CASH_PURCHASE" } },
        { model: "FinanceCase", operation: "create", context, failClosed: true },
      ),
    ).toEqual({ data: { tenantId: "tenant-w1", caseNumber: "FIN-1", purpose: "CASH_PURCHASE" } });
  });

  it("keeps the W1A migration additive and limited to the ten new tables", () => {
    const createTables = [...MIGRATION.matchAll(/CREATE TABLE\s+"([^"]+)"/g)].map((match) => match[1]);
    expect(createTables).toHaveLength(10);
    expect(new Set(createTables)).toEqual(new Set(W1_TABLES));

    expect(MIGRATION).not.toMatch(/^\s*UPDATE\s+/gim);
    expect(MIGRATION).not.toMatch(/^\s*DELETE\s+FROM\s+/gim);
    expect(MIGRATION).not.toMatch(/^\s*INSERT\s+INTO\s+/gim);
    expect(MIGRATION).not.toMatch(/\bALTER\s+TABLE\b/i);
    expect(MIGRATION).not.toMatch(/\bDROP\s+(?:TABLE|COLUMN|CONSTRAINT)\b/i);

    expect(MIGRATION).not.toContain('REFERENCES "contracts"');
    expect(MIGRATION).not.toContain('REFERENCES "payment_plans"');
    expect(MIGRATION).not.toContain('REFERENCES "installments"');
  });

  it("matches critical immutable and authority columns in the migration artifact", () => {
    const snapshotTable = MIGRATION.match(/CREATE TABLE "contract_snapshots" \(([\s\S]*?)\n\);/)?.[1] ?? "";
    const financeTable = MIGRATION.match(/CREATE TABLE "finance_cases" \(([\s\S]*?)\n\);/)?.[1] ?? "";

    expect(snapshotTable).not.toContain('"updated_at"');
    expect(snapshotTable).toContain('"digest" VARCHAR(64) NOT NULL');
    expect(financeTable).toContain('"internal_status" TEXT NOT NULL DEFAULT \'DRAFT\'');
    expect(financeTable).toContain('"authority_status" TEXT');
    expect(financeTable).toContain('"authority_provider" TEXT');
  });
});
