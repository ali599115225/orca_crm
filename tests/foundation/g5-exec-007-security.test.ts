import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { customerCookieOptions, CUSTOMER_SESSION_COOKIE, EMPLOYEE_SESSION_COOKIE } from "@/lib/customer-portal/cookies";
import { issueCustomerSession } from "@/lib/customer-portal/session";

const migration = fs.readFileSync(
  path.join(process.cwd(), "prisma/migrations/20260727090000_exec_007_exact_scope_foundation/migration.sql"),
  "utf8",
);

describe("EXEC-007 security boundary", () => {
  it("T-AUTH-03 keeps customer and employee sessions separate and hash-only", () => {
    const issued = issueCustomerSession({
      tenantId: "t",
      principalId: "p",
      subjectGrantId: "g",
      authVersion: 1,
      grantVersion: 1,
      assuranceLevel: "CUSTOMER_VIEW_VERIFIED",
      now: new Date("2026-07-27T12:00:00Z"),
    });
    expect(CUSTOMER_SESSION_COOKIE).not.toBe(EMPLOYEE_SESSION_COOKIE);
    expect(customerCookieOptions().path).toBe("/customer");
    expect(issued.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(issued.token).not.toBe(issued.tokenHash);
  });

  it("T-PRIV-01 excludes raw IP, cookies and tokens from immutable core evidence", () => {
    const evidenceBlock = migration.slice(
      migration.indexOf('CREATE TABLE "exec007_acceptance_evidence"'),
      migration.indexOf('CREATE TABLE "exec007_decline_evidence"'),
    );
    expect(evidenceBlock).not.toMatch(/raw_ip|cookie|token/i);
    expect(migration).toContain('CREATE TABLE "exec007_customer_security_events"');
  });
});
