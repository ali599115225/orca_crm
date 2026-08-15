import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const W1_SCHEMA = readFileSync(join(ROOT, "prisma", "w1-contract-finance.prisma"), "utf8");
const MIGRATION = readFileSync(
  join(ROOT, "prisma", "migrations", "20260815004500_w1d_snapshot_offer_integrity", "migration.sql"),
  "utf8",
);
const SNAPSHOT_SOURCE = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "contract-snapshot-service.ts"),
  "utf8",
);
const OFFER_SOURCE = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "provider-offer-service.ts"),
  "utf8",
);
const FINANCE_SOURCE = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "finance-case-service.ts"),
  "utf8",
);

describe("W1D snapshot idempotency + provider offer lifecycle", () => {
  it("adds only the two frozen W1D database uniqueness constraints", () => {
    expect(W1_SCHEMA).toContain(
      '@@unique([tenantId, draftId, snapshotType], map: "uq_contract_snapshots_tenant_draft_type")',
    );
    expect(W1_SCHEMA).toContain(
      '@@unique([tenantId, financeCaseId, provider, providerReference], map: "uq_finance_provider_offers_case_provider_reference")',
    );

    const uniqueIndexes = [...MIGRATION.matchAll(/CREATE UNIQUE INDEX\s+"([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(uniqueIndexes).toEqual([
      "uq_contract_snapshots_tenant_draft_type",
      "uq_finance_provider_offers_case_provider_reference",
    ]);
    expect(MIGRATION).not.toMatch(/^\s*(?:UPDATE|INSERT|DELETE)\b/gim);
    expect(MIGRATION).not.toMatch(/\bALTER\s+TABLE\b/i);
    expect(MIGRATION).not.toMatch(/\bDROP\s+(?:TABLE|COLUMN|CONSTRAINT|INDEX)\b/i);
  });

  it("makes ISSUED snapshot creation idempotent and fail-closed on a different digest", () => {
    expect(SNAPSHOT_SOURCE).toContain('snapshotType: "ISSUED"');
    expect(SNAPSHOT_SOURCE).toContain("const existing = await tx.contractSnapshot.findFirst");
    expect(SNAPSHOT_SOURCE).toContain("if (existing.digest === digest) return existing");
    expect(SNAPSHOT_SOURCE).toContain("W1_SNAPSHOT_ALREADY_ISSUED_DIFFERENT_DIGEST");
    expect(SNAPSHOT_SOURCE).toContain('error.code === "P2002"');
    expect(SNAPSHOT_SOURCE).toContain("existing?.digest === attemptedDigest");
    expect(SNAPSHOT_SOURCE).not.toMatch(/contractSnapshot\.(?:update|updateMany|delete|deleteMany|upsert)\s*\(/);
  });

  it("records provider offers only with evidence, actor, positive amount, and positive term", () => {
    expect(OFFER_SOURCE).toContain("!input.actorId");
    expect(OFFER_SOURCE).toContain("input.evidenceJson === null");
    expect(OFFER_SOURCE).toContain("input.evidenceJson === undefined");
    expect(OFFER_SOURCE).toContain("!Number.isInteger(input.termMonths)");
    expect(OFFER_SOURCE).toContain("input.termMonths <= 0");
    expect(OFFER_SOURCE).toContain("W1_PROVIDER_OFFER_AMOUNT_INVALID");
    expect(OFFER_SOURCE).toContain('financeCase.internalStatus !== "AWAITING_PROVIDER"');
    expect(OFFER_SOURCE).toContain('financeCase.internalStatus !== "OFFERS_RECEIVED"');
    expect(OFFER_SOURCE).toContain('recordStatus: "RECEIVED"');
    expect(OFFER_SOURCE).toContain('eventType: "finance_case.provider_offer_received"');
    expect(OFFER_SOURCE).toContain("Prisma.TransactionIsolationLevel.Serializable");
  });

  it("treats provider + reference as idempotency identity and rejects changed commercial terms", () => {
    expect(OFFER_SOURCE).toContain("providerReference: normalized.providerReference");
    expect(OFFER_SOURCE).toContain("providerOfferMatches(existing, normalized)");
    expect(OFFER_SOURCE).toContain("W1_PROVIDER_OFFER_REFERENCE_CONFLICT");
    expect(OFFER_SOURCE).toContain('error.code === "P2002"');
    expect(OFFER_SOURCE).toContain("decimalEqual(existing.amount, normalized.amount)");
    expect(OFFER_SOURCE).toContain("existing.termMonths === normalized.termMonths");
    expect(OFFER_SOURCE).toContain("existing.expiresAt?.getTime()");
  });

  it("selects exactly one non-expired received offer and advances the case atomically", () => {
    const selectStart = OFFER_SOURCE.indexOf("export async function selectProviderOffer");
    const selectSource = OFFER_SOURCE.slice(selectStart);

    expect(selectSource).toContain('financeCase.internalStatus === "OFFER_SELECTED"');
    expect(selectSource).toContain('offer.recordStatus === "SELECTED"');
    expect(selectSource).toContain('financeCase.internalStatus !== "OFFERS_RECEIVED"');
    expect(selectSource).toContain('offer.recordStatus !== "RECEIVED"');
    expect(selectSource).toContain("offer.expiresAt.getTime() <= Date.now()");
    expect(selectSource).toContain('recordStatus: "SELECTED"');
    expect(selectSource).toContain('internalStatus: "OFFER_SELECTED"');
    expect(selectSource).toContain('eventType: "finance_case.provider_offer_selected"');
    expect(selectSource).toContain("Prisma.TransactionIsolationLevel.Serializable");
  });

  it("binds provider-approved progression to the currently selected offer provider", () => {
    const transitionStart = FINANCE_SOURCE.indexOf("export async function transitionFinanceCaseInternalStatus");
    const authorityStart = FINANCE_SOURCE.indexOf("export async function recordFinanceAuthorityEvidence");
    const transitionSource = FINANCE_SOURCE.slice(transitionStart, authorityStart);

    expect(transitionSource).toContain('recordStatus: "SELECTED"');
    expect(transitionSource).toContain("selectedOffer.provider !== financeCase.authorityProvider");
    expect(transitionSource).toContain("W1_FINANCE_SELECTED_OFFER_PROVIDER_MISMATCH");
    expect(transitionSource).toContain("selectedProviderOfferId = selectedOffer.id");
    expect(transitionSource).toContain("selectedProviderOfferId,");
    expect(transitionSource).toContain('nextStatus === "PROVIDER_APPROVED"');
    expect(transitionSource).toContain('nextStatus === "READY_FOR_TRANSACTION"');
  });

  it("does not cross into Transaction Spine or provider network integration", () => {
    for (const source of [SNAPSHOT_SOURCE, OFFER_SOURCE, FINANCE_SOURCE]) {
      expect(source).not.toMatch(/paymentPlan\.(?:create|update|delete|upsert)/);
      expect(source).not.toMatch(/installment\.(?:create|update|delete|upsert)/);
      expect(source).not.toMatch(/invoice\.(?:create|update|delete|upsert)/);
      expect(source).not.toMatch(/offer\.(?:create|update|delete|upsert)/);
      expect(source).not.toContain("fetch(");
      expect(source).not.toContain("axios");
    }
  });
});
