import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const ASSEMBLER = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "canonical-snapshot-assembler.ts"),
  "utf8",
);
const RENDERER = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "contract-renderer.ts"),
  "utf8",
);
const SNAPSHOT_SERVICE = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "contract-snapshot-service.ts"),
  "utf8",
);
const ISSUANCE_SERVICE = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "contract-snapshot-issuance-service.ts"),
  "utf8",
);
const FACADE = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "application-facade.ts"),
  "utf8",
);
const ROUTE_PATH = join(
  ROOT,
  "app",
  "api",
  "v1",
  "contract-finance",
  "contract-drafts",
  "[id]",
  "snapshots",
  "issue",
  "route.ts",
);
const ROUTE = readFileSync(ROUTE_PATH, "utf8");
const G4_API_ROUTE_EVIDENCE =
  "/api/v1/contract-finance/contract-drafts/[id]/snapshots/issue";
const GATE = readFileSync(
  join(ROOT, "docs", "product-extension", "W1K_SNAPSHOT_ISSUANCE_WIRING_GATE.md"),
  "utf8",
);

describe("W1K canonical snapshot issuance wiring", () => {
  it("adds the frozen route and W1K integration surfaces without schema or migration work", () => {
    expect(existsSync(ROUTE_PATH)).toBe(true);
    expect(G4_API_ROUTE_EVIDENCE).toBe(
      "/api/v1/contract-finance/contract-drafts/[id]/snapshots/issue",
    );
    expect(ISSUANCE_SERVICE).toContain("issueCanonicalApprovedContractSnapshot");
    expect(GATE).toContain("Approved ContractDraft -> W1I canonical assembly -> W1J deterministic render -> immutable ISSUED ContractSnapshot");
    expect(GATE).toContain("no Prisma schema change");
    expect(GATE).toContain("no migration or backfill");
  });

  it("exposes a tx-aware W1I helper while preserving the legacy SERIALIZABLE wrapper", () => {
    expect(ASSEMBLER).toContain("type CanonicalSnapshotAssemblerTransaction = Pick<");
    expect(ASSEMBLER).toContain('"contractDraft" | "contract"');
    expect(ASSEMBLER).toContain("export async function assembleCanonicalContractSnapshotWithTx(");
    expect(ASSEMBLER).toContain("tx: CanonicalSnapshotAssemblerTransaction");
    expect(ASSEMBLER).toContain("const draft = await tx.contractDraft.findFirst");
    expect(ASSEMBLER).toContain('orderBy: [{ requestedAt: "asc" }, { id: "asc" }]');
    expect(ASSEMBLER).toContain("async (tx) => await assembleCanonicalContractSnapshotWithTx(tx, input)");
    expect(ASSEMBLER).toContain("Prisma.TransactionIsolationLevel.Serializable");

    const wrapperStart = ASSEMBLER.indexOf(
      "export async function assembleCanonicalContractSnapshot(\n",
    );
    const authorityCheck = ASSEMBLER.indexOf(
      "assertCanonicalAssemblyAuthority(input);",
      wrapperStart,
    );
    const transactionStart = ASSEMBLER.indexOf(
      "return await prisma.$transaction(",
      wrapperStart,
    );
    expect(wrapperStart).toBeGreaterThanOrEqual(0);
    expect(authorityCheck).toBeGreaterThan(wrapperStart);
    expect(transactionStart).toBeGreaterThan(authorityCheck);
  });

  it("owns one outer SERIALIZABLE transaction and never nests legacy W1I/W1D transactions", () => {
    expect(ISSUANCE_SERVICE.match(/prisma\.\$transaction\(/g)).toHaveLength(1);
    expect(ISSUANCE_SERVICE).toContain("Prisma.TransactionIsolationLevel.Serializable");
    expect(ISSUANCE_SERVICE).toContain("assembleCanonicalContractSnapshotWithTx(tx, {");
    expect(ISSUANCE_SERVICE).toContain("persistCanonicalIssuedSnapshotWithTx(tx, {");
    expect(ISSUANCE_SERVICE).not.toContain("assembleCanonicalContractSnapshot(");
    expect(ISSUANCE_SERVICE).not.toContain("issueApprovedContractSnapshot(");
  });

  it("renders only W1I canonical input before immutable persistence", () => {
    expect(ISSUANCE_SERVICE).toContain("renderCanonicalContract({");
    expect(ISSUANCE_SERVICE).toContain("sourceContentJson: assembly.sourceContentJson");
    expect(ISSUANCE_SERVICE).toContain("structuredFacts: assembly.structuredFacts");
    expect(ISSUANCE_SERVICE).toContain("clauseSnapshot: assembly.clauseSnapshot");
    expect(RENDERER).not.toContain("@/lib/prisma");
    expect(RENDERER).not.toContain("fetch(");
  });

  it("uses W1I same-transaction approval evidence for digest and persistence", () => {
    expect(ISSUANCE_SERVICE).toContain("approvalSnapshot: assembly.approvalSnapshot");
    expect(SNAPSHOT_SERVICE).toContain("export async function persistCanonicalIssuedSnapshotWithTx(");
    expect(SNAPSHOT_SERVICE).toContain("approvalSnapshot: input.approvalSnapshot");
    expect(SNAPSHOT_SERVICE).toContain("computeContractSnapshotDigest({");
    expect(SNAPSHOT_SERVICE).toContain('snapshotType: "ISSUED"');
    expect(SNAPSHOT_SERVICE).toContain("signedAt: null");
  });

  it("preserves legacy W1D DB-derived approval behavior for compatibility", () => {
    const legacyStart = SNAPSHOT_SERVICE.indexOf("export async function issueApprovedContractSnapshot");
    expect(legacyStart).toBeGreaterThanOrEqual(0);
    const legacy = SNAPSHOT_SERVICE.slice(legacyStart);
    expect(legacy).toContain("const draft = await tx.contractDraft.findFirst");
    expect(legacy).toContain("const approvalSnapshot: Prisma.InputJsonValue = draft.approvals.map");
    expect(legacy).not.toContain("input.approvalSnapshot");
  });

  it("keeps snapshot issuance immutable and digest-idempotent including P2002 races", () => {
    expect(SNAPSHOT_SERVICE).toContain("if (existing.digest === digest) return existing");
    expect(SNAPSHOT_SERVICE).toContain("W1_SNAPSHOT_ALREADY_ISSUED_DIFFERENT_DIGEST");
    expect(ISSUANCE_SERVICE).toContain('error.code === "P2002"');
    expect(ISSUANCE_SERVICE).toContain("existing?.digest === attemptedDigest");
    expect(ISSUANCE_SERVICE).toContain("computeContractSnapshotDigest({");

    for (const source of [SNAPSHOT_SERVICE, ISSUANCE_SERVICE]) {
      expect(source).not.toMatch(/contractSnapshot\.(?:update|updateMany|delete|deleteMany|upsert)\s*\(/);
    }
  });

  it("narrows the W1E command to draft identity and derives actor authority", () => {
    expect(FACADE).toContain('export type W1eIssueContractSnapshotInput = {\n  draftId: string;\n};');
    expect(FACADE).toContain('"contract-studio.snapshot-issue"');
    expect(FACADE).toContain("issueCanonicalApprovedContractSnapshot({");
    expect(FACADE).toContain("tenantId: actor.tenantId");
    expect(FACADE).toContain("draftId: input.draftId");
    expect(FACADE).toContain("createdBy: actor.userId");
    expect(FACADE).not.toContain("ContractSnapshotIssueInput");
  });

  it("accepts only the path draft UUID and an empty network body", () => {
    expect(ROUTE).toContain("beginW1hContractCommandRequest(request)");
    expect(ROUTE).toContain("await assertW1hEmptyCommandBody(request)");
    expect(ROUTE).toContain("requiredW1gUuidValue(id)");
    expect(ROUTE).toContain("w1eIssueApprovedContractSnapshot(boundary.session, { draftId })");
    expect(ROUTE).toContain('"Cache-Control": "no-store"');
    expect(ROUTE).not.toContain("request.json");
    expect(ROUTE).not.toContain("@/lib/prisma");
    expect(ROUTE).not.toContain("contract-snapshot-service");
    for (const forbidden of [
      "renderedContent",
      "structuredFacts",
      "clauseSnapshot",
      "paymentPlanSnapshot",
      "approvalSnapshot",
      "templateVersionId",
      "contractId",
      "digest",
      "createdBy",
      "snapshotType",
      "signedAt",
    ]) {
      expect(ROUTE).not.toContain(forbidden);
    }
  });

  it("does not add provider calls, PDF/signature flow, or Transaction Spine writes", () => {
    const combined = [ISSUANCE_SERVICE, FACADE, ROUTE].join("\n");
    expect(combined).not.toContain("fetch(");
    expect(combined).not.toContain("axios");
    expect(combined).not.toContain("EJAR_API");
    expect(combined).not.toContain("signContract");
    expect(combined).not.toContain("pdf");
    expect(combined).not.toMatch(/paymentPlan\.(?:create|update|delete|upsert)/);
    expect(combined).not.toMatch(/installment\.(?:create|update|delete|upsert)/);
    expect(combined).not.toMatch(/invoice\.(?:create|update|delete|upsert)/);
  });
});
