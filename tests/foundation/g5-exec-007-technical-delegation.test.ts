import { describe, expect, it } from "vitest";
import { assertDelegation } from "@/lib/offer-management/technical-delegation";

const delegation = {
  tenantId: "t", operation: "COMPLETE_ACCEPTANCE", businessActorUserId: "u", technicalActorId: "worker",
  assignmentId: "a", resourceType: "OFFER_VERSION", resourceId: "v", payloadHash: "p",
  correlationId: "c", idempotencyKeyHash: "i", expiresAt: new Date("2026-07-27T12:05:00Z"), consumedAt: null,
};

describe("EXEC-007 technical delegation", () => {
  it("T-TECH-01/T-TECH-02 accepts only exact, unexpired delegation", () => {
    const { expiresAt: _expiresAt, consumedAt: _consumedAt, ...exact } = delegation;
    expect(() => assertDelegation(delegation, { ...exact, now: new Date("2026-07-27T12:00:00Z") })).not.toThrow();
  });

  it("T-TECH-03 denies replay and payload substitution", () => {
    const { expiresAt: _expiresAt, consumedAt: _consumedAt, ...exact } = delegation;
    expect(() => assertDelegation({ ...delegation, consumedAt: new Date() }, { ...exact, now: new Date("2026-07-27T12:00:00Z") })).toThrow(/replay/);
    expect(() => assertDelegation(delegation, { ...exact, payloadHash: "other", now: new Date("2026-07-27T12:00:00Z") })).toThrow(/payloadHash/);
  });
});
