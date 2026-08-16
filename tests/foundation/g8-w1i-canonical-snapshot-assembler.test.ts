import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  contractDraftFindFirst: vi.fn(),
  contractFindFirst: vi.fn(),
  requireTenantContext: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: dbMocks.transaction,
  },
}));
vi.mock("@/lib/tenant-context", () => ({
  requireTenantContext: dbMocks.requireTenantContext,
}));

import { assembleCanonicalContractSnapshot } from "@/lib/domain/contract-finance/canonical-snapshot-assembler";

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

function approvedDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: "draft-a",
    tenantId: "tenant-a",
    templateId: "template-a",
    templateVersionId: "template-version-a",
    contractId: null,
    financeCaseId: null,
    title: "Approved draft",
    status: "APPROVED",
    contentJson: {},
    dataBindingsJson: {},
    clauseOverridesJson: {},
    createdAt: new Date("2026-08-16T00:00:00.000Z"),
    updatedAt: new Date("2026-08-16T00:01:00.000Z"),
    template: {
      id: "template-a",
      code: "SALE",
      name: "Sale",
      contractType: "SALE",
      status: "ACTIVE",
    },
    templateVersion: {
      id: "template-version-a",
      version: 1,
      status: "PUBLISHED",
      structureJson: {},
      variableSchemaJson: {},
      publishedAt: new Date("2026-08-15T23:00:00.000Z"),
    },
    approvals: [
      {
        id: "approval-a",
        riskTier: "LEGAL",
        status: "APPROVED",
        requestedBy: "user-requester",
        decidedBy: "user-approver",
        reason: null,
        evidenceJson: null,
        requestedAt: new Date("2026-08-15T23:30:00.000Z"),
        decidedAt: new Date("2026-08-15T23:45:00.000Z"),
      },
    ],
    financeCase: null,
    ...overrides,
  };
}

async function expectAssemblyCode(code: string) {
  await expect(
    assembleCanonicalContractSnapshot({ tenantId: "tenant-a", draftId: "draft-a" }),
  ).rejects.toMatchObject({ code });
}

describe("W1I canonical snapshot assembler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.requireTenantContext.mockReturnValue({ tenantId: "tenant-a", userId: "user-a" });
    dbMocks.transaction.mockImplementation(async (operation) =>
      operation({
        contractDraft: { findFirst: dbMocks.contractDraftFindFirst },
        contract: { findFirst: dbMocks.contractFindFirst },
      }),
    );
  });

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

  it("binds caller identity to the authenticated ambient tenant before DB access", async () => {
    dbMocks.requireTenantContext.mockReturnValueOnce({ tenantId: "tenant-b", userId: "user-b" });

    await expectAssemblyCode("W1_CANONICAL_SNAPSHOT_TENANT_CONTEXT_MISMATCH");
    expect(dbMocks.transaction).not.toHaveBeenCalled();
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

  it("proves the source fields exist on the frozen schemas without depending on alignment", () => {
    expect(W1_SCHEMA).toMatch(/\bcontentJson\s+Json\b/);
    expect(W1_SCHEMA).toMatch(/\bdataBindingsJson\s+Json\b/);
    expect(W1_SCHEMA).toMatch(/\bclauseOverridesJson\s+Json\b/);
    expect(W1_SCHEMA).toMatch(/\bstructuredFacts\s+Json\b/);
    expect(W1_SCHEMA).toMatch(/\bclauseSnapshot\s+Json\b/);
    expect(W1_SCHEMA).toMatch(/\bpaymentPlanSnapshot\s+Json\?/);
    expect(W1_SCHEMA).toMatch(/\bapprovalSnapshot\s+Json\b/);
    expect(LEGACY_SCHEMA).toMatch(/\bpaymentPlan\s+PaymentPlan\?/);
    expect(LEGACY_SCHEMA).toMatch(/\bscheduleJson\s+Json\b/);
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

  it("fails closed at runtime for missing or unapproved draft state", async () => {
    dbMocks.contractDraftFindFirst.mockResolvedValueOnce(null);
    await expectAssemblyCode("W1_CANONICAL_SNAPSHOT_DRAFT_NOT_FOUND_FOR_TENANT");

    dbMocks.contractDraftFindFirst.mockResolvedValueOnce(approvedDraft({ status: "DRAFT" }));
    await expectAssemblyCode("W1_CANONICAL_SNAPSHOT_DRAFT_NOT_APPROVED");

    dbMocks.contractDraftFindFirst.mockResolvedValueOnce(approvedDraft({ approvals: [] }));
    await expectAssemblyCode("W1_CANONICAL_SNAPSHOT_APPROVALS_REQUIRED");

    dbMocks.contractDraftFindFirst.mockResolvedValueOnce(
      approvedDraft({
        approvals: [{ ...approvedDraft().approvals[0], status: "PENDING" }],
      }),
    );
    await expectAssemblyCode("W1_CANONICAL_SNAPSHOT_APPROVAL_PENDING_OR_REJECTED");
  });

  it("fails closed at runtime for ambiguous finance and broken contract linkage", async () => {
    dbMocks.contractDraftFindFirst.mockResolvedValueOnce(
      approvedDraft({
        financeCase: { contractId: null, providerOffers: [{ id: "offer-a" }, { id: "offer-b" }] },
      }),
    );
    await expectAssemblyCode("W1_CANONICAL_SNAPSHOT_MULTIPLE_SELECTED_PROVIDER_OFFERS");

    dbMocks.contractDraftFindFirst.mockResolvedValueOnce(
      approvedDraft({
        contractId: "contract-a",
        financeCase: { contractId: "contract-b", providerOffers: [] },
      }),
    );
    await expectAssemblyCode("W1_CANONICAL_SNAPSHOT_FINANCE_CONTRACT_MISMATCH");

    dbMocks.contractDraftFindFirst.mockResolvedValueOnce(approvedDraft({ contractId: "contract-a" }));
    dbMocks.contractFindFirst.mockResolvedValueOnce(null);
    await expectAssemblyCode("W1_CANONICAL_SNAPSHOT_CONTRACT_NOT_FOUND_FOR_TENANT");
  });

  it("fails closed at runtime when legacy nested rows drift across tenants", async () => {
    dbMocks.contractDraftFindFirst.mockResolvedValueOnce(approvedDraft({ contractId: "contract-a" }));
    dbMocks.contractFindFirst.mockResolvedValueOnce({
      unit: { tenantId: "tenant-b" },
      paymentPlan: null,
    });
    await expectAssemblyCode("W1_CANONICAL_SNAPSHOT_PROPERTY_TENANT_MISMATCH");

    dbMocks.contractDraftFindFirst.mockResolvedValueOnce(approvedDraft({ contractId: "contract-a" }));
    dbMocks.contractFindFirst.mockResolvedValueOnce({
      unit: { tenantId: "tenant-a" },
      paymentPlan: { tenantId: "tenant-b" },
    });
    await expectAssemblyCode("W1_CANONICAL_SNAPSHOT_PAYMENT_PLAN_TENANT_MISMATCH");
  });

  it("retains structural evidence for selected-provider and transaction invariants", () => {
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
