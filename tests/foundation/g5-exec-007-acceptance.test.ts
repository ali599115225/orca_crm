import { describe, expect, it } from "vitest";
import { buildDecisionEvidence } from "@/lib/offer-management/evidence";

const intent = {
  id: "intent",
  tenantId: "tenant",
  offerVersionId: "version",
  customerSessionId: "session",
  principalId: "principal",
  subjectPartyId: "party",
  customerAccountId: null,
  action: "ACCEPT" as const,
  state: "PENDING" as const,
  nonceHash: "a".repeat(64),
  contentHash: "b".repeat(64),
  pricingHash: "c".repeat(64),
  termsHash: "d".repeat(64),
  expiresAt: new Date("2026-07-27T12:05:00Z"),
};

describe("EXEC-007 minimized decision evidence", () => {
  it("T-EVID-01/T-ACC-01 binds exact intent/version/hashes/subject and trusted time", () => {
    const result = buildDecisionEvidence(intent, { action: "ACCEPT", confirmationTextVersion: "v1", serverConfirmedAt: new Date("2026-07-27T12:01:00Z"), assuranceLevel: "CUSTOMER_DECISION_STEP_UP" }, { version: "k1", secret: Buffer.alloc(32, 1) });
    expect(result.evidence.offerVersionId).toBe("version");
    expect(result.evidence.contentHash).toBe(intent.contentHash);
    expect(result.evidenceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.networkHmac).toMatch(/^[0-9a-f]{64}$/);
  });

  it("T-ACC-02/T-ACC-03 rejects wrong action and expired intent", () => {
    expect(() => buildDecisionEvidence(intent, { action: "DECLINE", confirmationTextVersion: "v1", serverConfirmedAt: new Date("2026-07-27T12:01:00Z"), assuranceLevel: "CUSTOMER_DECISION_STEP_UP" }, { version: "k1", secret: Buffer.alloc(32, 1) })).toThrow();
    expect(() => buildDecisionEvidence(intent, { action: "ACCEPT", confirmationTextVersion: "v1", serverConfirmedAt: intent.expiresAt, assuranceLevel: "CUSTOMER_DECISION_STEP_UP" }, { version: "k1", secret: Buffer.alloc(32, 1) })).toThrow(/expired/);
  });
});
