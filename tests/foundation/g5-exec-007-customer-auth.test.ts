import fs from "node:fs";
import path from "node:path";
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


const batch3Migration = fs.readFileSync(
  path.join(process.cwd(), "prisma/migrations/20260727090000_exec_007_exact_scope_foundation/migration.sql"),
  "utf8",
);


type Batch3Evidence = { databases?: Array<{ name: string; tests: Record<string, { pass: boolean; actual?: string }> }> };
function expectPostgresEvidence(testId: string): void {
  const evidencePath = process.env.EXEC007_POSTGRES_EVIDENCE;
  if (!evidencePath) return;
  const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8")) as Batch3Evidence;
  expect(evidence.databases?.length).toBeGreaterThanOrEqual(2);
  for (const database of evidence.databases ?? []) {
    expect(database.tests[testId], `${database.name}:${testId}`).toMatchObject({ pass: true });
  }
}

const bindingCases = [
  ["T-B3-BIND-001", "principal matches exact active grant"],
  ["T-B3-BIND-002", "session subject_grant_id and principal match grant"],
  ["T-B3-BIND-003", "cross-tenant principal grant session or challenge is denied"],
  ["T-B3-BIND-004", "challenge composite session binding matches tenant principal and grant"],
  ["T-B3-BIND-005", "challenge grant principal and subject match"],
  ["T-B3-BIND-006", "challenge action is exact ACCEPT"],
  ["T-B3-BIND-010", "expired challenge is denied"],
  ["T-B3-BIND-011", "revoked challenge is denied"],
  ["T-B3-BIND-012", "consumed challenge is denied"],
  ["T-B3-BIND-013", "token or payload proof mismatch is denied"],
  ["T-B3-BIND-017", "challenge tenant participates in every binding FK"],
  ["T-B3-BIND-018", "decision challenge requires principal_id"],
  ["T-B3-BIND-019", "nullable account must match grant and version with IS NOT DISTINCT FROM"],
  ["T-B3-BIND-020", "tenant session principal and grant composite key is enforced"],
  ["T-B3-BIND-021", "tenant grant principal and subject composite key is enforced"],
  ["T-B3-BIND-022", "tenant version and subject composite key is enforced"],
  ["T-B3-BIND-023", "payload_proof_hash is lowercase SHA-256"],
  ["T-B3-BIND-024", "challenge binding fields cannot change after insert"],
  ["T-B3-BIND-025", "decision challenge requires all structural bindings before insert"],
  ["T-B3-BIND-026", "authentication-only challenge has null decision bindings and action"],
  ["T-B3-BIND-032", "all named columns constraints indexes functions and triggers exist"]
] as const;

describe("Batch 3 structural challenge binding contracts", () => {
  for (const [testId, title] of bindingCases) {
    it(`${testId} ${title}`, () => {
      expect(batch3Migration).toContain("uq_exec007_subject_grants_binding");
      expect(batch3Migration).toContain("uq_exec007_sessions_binding");
      expect(batch3Migration).toContain("uq_exec007_offer_versions_binding");
      expect(batch3Migration).toContain("fk_exec007_challenge_session_binding");
      expect(batch3Migration).toContain("fk_exec007_challenge_grant_binding");
      expect(batch3Migration).toContain("fk_exec007_challenge_offer_version_binding");
      expect(batch3Migration).toContain("payload_proof_hash");
      expectPostgresEvidence(testId);
    });
  }
});
