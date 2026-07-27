import { describe, expect, it } from "vitest";
import { createMagicLinkChallenge, createOtpChallenge, verifyChallengeToken } from "@/lib/customer-portal/challenge";
import { assertNoEmployeeCookie } from "@/lib/customer-portal/cookies";
import { assertSessionCurrent, issueCustomerSession } from "@/lib/customer-portal/session";

const now = new Date("2026-07-27T12:00:00Z");

describe("EXEC-007 customer authentication", () => {
  it("T-CUST-01 creates hash-only OTP and magic-link challenges with frozen TTLs", () => {
    const otp = createOtpChallenge(now);
    const magic = createMagicLinkChallenge(now);
    expect(otp.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(otp.expiresAt.getTime() - now.getTime()).toBe(5 * 60 * 1000);
    expect(magic.expiresAt.getTime() - now.getTime()).toBe(10 * 60 * 1000);
    expect(() => verifyChallengeToken({ presentedToken: otp.token, storedTokenHash: otp.tokenHash, status: "PENDING", expiresAt: otp.expiresAt, now })).not.toThrow();
  });

  it("T-CUST-02 invalidates stale auth/grant versions and expired step-up", () => {
    const issued = issueCustomerSession({ tenantId: "t", principalId: "p", subjectGrantId: "g", authVersion: 1, grantVersion: 1, assuranceLevel: "CUSTOMER_DECISION_STEP_UP", now });
    const session = { id: "s", ...issued.session };
    expect(() => assertSessionCurrent(session, { authVersion: 2, grantVersion: 1, now, requireDecisionStepUp: true })).toThrow(/version/);
    expect(() => assertSessionCurrent(session, { authVersion: 1, grantVersion: 1, now: new Date(now.getTime() + 11 * 60 * 1000), requireDecisionStepUp: true })).toThrow(/step-up/);
  });

  it("T-CUST-03 denies employee cookies at the customer boundary", () => {
    expect(() => assertNoEmployeeCookie({ orca_session: "employee" })).toThrow(/employee/);
  });
});
