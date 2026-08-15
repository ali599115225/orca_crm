import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const ASSEMBLER_SOURCE = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "canonical-snapshot-assembler.ts"),
  "utf8",
);
const W1_SCHEMA = readFileSync(join(ROOT, "prisma", "w1-contract-finance.prisma"), "utf8");
const LEGACY_SCHEMA = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8");

function sourceBlock(start: string, end: string): string {
  const startIndex = ASSEMBLER_SOURCE.indexOf(start);
  const endIndex = ASSEMBLER_SOURCE.indexOf(end, startIndex);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return ASSEMBLER_SOURCE.slice(startIndex, endIndex);
}

describe("W1I canonical snapshot assembler", () => {
  it("uses only tenant + approved draft identity as caller input", () => {
    const inputType = sourceBlock(
      "export type CanonicalContractSnapshotAssemblyInput = {",
      "export type CanonicalContractSnapshotAssembly = {",
    );

    expect(inputType).toContain("tenantId: string;");
    expect(inputType).toContain("draftId: string;");
    expect(inputType).not.toContain("renderedContent");
    expect(inputType).not.toContain("structuredFacts");
    expect(inputType).not.toContain("paymentPlanSnapshot");
    expect(inputType).not.toContain("approvalSnapshot");
  });

  it("loads the approved draft and every persisted canonical source server-side", () => {
    expect(ASSEMBLER_SOURCE).toContain("const draft = await tx.contractDraft.findFirst");
    expect(ASSEMBLER_SOURCE).toContain('if (draft.status !== "APPROVED")');
    expect(ASSEMBLER_SOURCE).toContain("draft.approvals.length === 0");
    expect(ASSEMBLER_SOURCE).toContain('approval.status !== "APPROVED"');
    expect(ASSEMBLER_SOURCE).toContain("template: {");
    expect(ASSEMBLER_SOURCE).toContain("templateVersion: {");
    expect(ASSEMBLER_SOURCE).toContain("contentJson: true");
    expect(ASSEMBLER_SOURCE).toContain("dataBindingsJson: true");
    expect(ASSEMBLER_SOURCE).toContain("clauseOverridesJson: true");
    expect(ASSEMBLER_SOURCE).toContain("financeCase: {");
    expect(ASSEMBLER_SOURCE).toContain("const contract = draft.contractId");
    expect(ASSEMBLER_SOURCE).toContain("paymentPlan: {");
    expect(ASSEMBLER_SOURCE).toContain("unit: {");
  });

  it("proves the source fields exist on the frozen schemas without adding a migration", () => {
    expect(W1_SCHEMA).toContain("contentJson         Json");
    expect(W1_SCHEMA).toContain("dataBindingsJson    Json");
    expect(W1_SCHEMA).toContain("clauseOverridesJson Json");
    expect(W1_SCHEMA).toContain("structuredFacts     Json");
    expect(W1_SCHEMA).toContain("clauseSnapshot      Json");
    expect(W1_SCHEMA).toContain("paymentPlanSnapshot Json?");
    expect(W1_SCHEMA).toContain("approvalSnapshot    Json");
    expect(LEGACY_SCHEMA).toContain("paymentPlan          PaymentPlan?");
    expect(LEGACY_SCHEMA).toContain("scheduleJson     Json");
  });

  it("normalizes money and dates into deterministic digest-safe facts", () => {
    expect(ASSEMBLER_SOURCE).toContain("value?.toString() ?? null");
    expect(ASSEMBLER_SOURCE).toContain("value?.toISOString() ?? null");
    expect(ASSEMBLER_SOURCE).toContain("contract.totalVolumeSar.toString()");
    expect(ASSEMBLER_SOURCE).toContain("contract.paymentPlan.totalAmount.toString()");
    expect(ASSEMBLER_SOURCE).toContain('schemaVersion: "W1I_CANONICAL_SNAPSHOT_FACTS_V1"');
    expect(ASSEMBLER_SOURCE).toContain('schemaVersion: "W1I_CLAUSE_SOURCE_V1"');
    expect(ASSEMBLER_SOURCE).toContain('orderBy: [{ requestedAt: "asc" }, { id: "asc" }]');
  });

  it("fails closed on broken cross-source linkage, legacy tenant drift, or ambiguous financing", () => {
    expect(ASSEMBLER_SOURCE).toContain("W1_CANONICAL_SNAPSHOT_CONTRACT_NOT_FOUND_FOR_TENANT");
    expect(ASSEMBLER_SOURCE).toContain("W1_CANONICAL_SNAPSHOT_FINANCE_CONTRACT_MISMATCH");
    expect(ASSEMBLER_SOURCE).toContain("W1_CANONICAL_SNAPSHOT_PROPERTY_TENANT_MISMATCH");
    expect(ASSEMBLER_SOURCE).toContain("W1_CANONICAL_SNAPSHOT_PAYMENT_PLAN_TENANT_MISMATCH");
    expect(ASSEMBLER_SOURCE).toContain("contract.unit.tenantId !== input.tenantId");
    expect(ASSEMBLER_SOURCE).toContain("contract.paymentPlan.tenantId !== input.tenantId");
    expect(ASSEMBLER_SOURCE).toContain("W1_CANONICAL_SNAPSHOT_MULTIPLE_SELECTED_PROVIDER_OFFERS");
    expect(ASSEMBLER_SOURCE).toContain('where: { recordStatus: "SELECTED" }');
    expect(ASSEMBLER_SOURCE).toContain("take: 2");
    expect(ASSEMBLER_SOURCE).toContain("Prisma.TransactionIsolationLevel.Serializable");
  });

  it("preserves approved source content without inventing a renderer or template language", () => {
    expect(ASSEMBLER_SOURCE).toContain("sourceContentJson: draft.contentJson");
    expect(ASSEMBLER_SOURCE).toContain("structureJson: draft.templateVersion.structureJson");
    expect(ASSEMBLER_SOURCE).toContain("clauseOverridesJson: draft.clauseOverridesJson");
    expect(ASSEMBLER_SOURCE).not.toMatch(/interpolat|mustache|handlebars|liquid|compileTemplate/i);
    expect(ASSEMBLER_SOURCE).not.toContain("renderedContent:");
  });

  it("is read-only and does not cross into provider, network, or Transaction Spine mutation", () => {
    expect(ASSEMBLER_SOURCE).not.toMatch(/\.(?:create|update|updateMany|delete|deleteMany|upsert)\s*\(/);
    expect(ASSEMBLER_SOURCE).not.toContain("fetch(");
    expect(ASSEMBLER_SOURCE).not.toContain("axios");
    expect(ASSEMBLER_SOURCE).not.toMatch(/installment\.(?:create|update|delete|upsert)/);
    expect(ASSEMBLER_SOURCE).not.toMatch(/invoice\.(?:create|update|delete|upsert)/);
  });
});
