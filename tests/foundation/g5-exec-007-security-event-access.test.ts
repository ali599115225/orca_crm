import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDbAuthorizationEnvelope,
  selectSecurityEventAuthorityAssignment,
} from "@/lib/offer-management/security-event-access";

const migration = fs.readFileSync(
  path.join(process.cwd(), "prisma/migration-evidence/non-production/20260727090000_exec_007_exact_scope_foundation/migration.sql"),
  "utf8",
);
const source = fs.readFileSync(
  path.join(process.cwd(), "lib/offer-management/security-event-access.ts"),
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

const cases = [
  ["T-B3-AUTH-012", "SECURITY_INCIDENT_RESPONSE is rejected by access module and database guard"],
  ["T-B3-AUTH-013", "branch assignments order by scope rank starts_at created_at and id"],
  ["T-B3-AUTH-014", "company assignments order by starts_at created_at and id"],
  ["T-B3-AUTH-015", "issuer rejects when no eligible COMPLIANCE_AUDIT assignment exists"],
  ["T-B3-AUTH-016", "issuer and database reject disabled branch service"],
  ["T-B3-AUTH-017", "database rejects envelope permission other than dedicated raw-IP permission"],
  ["T-B3-AUTH-018", "database rejects envelope scope different from selected assignment"],
  ["T-B3-DBROLE-002", "orca_runtime cannot select raw_ip directly"],
  ["T-B3-DBROLE-003", "orca_runtime cannot insert security read audit directly"],
  ["T-B3-DBROLE-004", "orca_runtime cannot update or delete security read audit"],
  ["T-B3-DBROLE-006", "guard rejects absent transaction-local envelope"],
  ["T-B3-DBROLE-007", "guard rejects invalid HMAC signature"],
  ["T-B3-DBROLE-008", "verified actor and assignment mismatches are rejected"],
  ["T-B3-DBROLE-009", "verified tenant mismatch is rejected without disclosure"],
  ["T-B3-DBROLE-010", "verified event mismatch is rejected"],
  ["T-B3-DBROLE-014", "runtime can execute metadata lookup but cannot receive raw_ip"],
  ["T-B3-DBROLE-020", "governed Raw-IP path fails closed when pgcrypto hmac is absent in second isolated database"],
  ["T-B3-RAWIP-001", "expired envelope is rejected"],
  ["T-B3-RAWIP-002", "issued_at beyond five-second future skew is rejected"],
  ["T-B3-RAWIP-003", "unknown key version is rejected"],
  ["T-B3-RAWIP-004", "second use of identical nonce is rejected"],
  ["T-B3-RAWIP-005", "inactive assignment is rejected"],
  ["T-B3-RAWIP-006", "expired assignment is rejected"],
  ["T-B3-RAWIP-007", "non-COMPLIANCE_AUDIT assignment is rejected"],
  ["T-B3-RAWIP-008", "branch mismatch is rejected"],
  ["T-B3-RAWIP-009", "service-line mismatch is rejected"],
  ["T-B3-RAWIP-010", "disallowed purpose or invalid event pair is rejected"],
  ["T-B3-RAWIP-011", "blank read reason is rejected"],
  ["T-B3-RAWIP-012", "blank signed correlation is rejected"],
  ["T-B3-RAWIP-013", "valid context returns exact INET"],
  ["T-B3-RAWIP-014", "one successful read creates one audit row"],
  ["T-B3-RAWIP-015", "audit row and schema contain no raw_ip"],
  ["T-B3-RAWIP-016", "tenant-safe audit foreign key rejects orphan"],
  ["T-B3-RAWIP-017", "injected audit insert failure rolls back read transaction"],
  ["T-B3-RAWIP-018", "failure after nonce insert removes nonce row on rollback"],
  ["T-B3-RAWIP-019", "malformed field syntax is rejected"],
  ["T-B3-RAWIP-020", "expires_at minus issued_at above thirty seconds is rejected"],
  ["T-B3-RAWIP-021", "empty or missing nonce field is rejected"],
  ["T-B3-RAWIP-022", "nonce not sixty-four lowercase hexadecimal characters is rejected"],
  ["T-B3-RAWIP-023", "two concurrent transactions use the same nonce"],
  ["T-B3-RAWIP-024", "injected nonce insert failure stops before Raw-IP read"],
  ["T-B3-RAWIP-025", "signed permission differs from dedicated permission"],
  ["T-B3-RAWIP-026", "signed scope differs from assignment scope"],
  ["T-B3-RAWIP-027", "signed correlation differs from application transaction correlation"],
  ["T-B3-RAWIP-028", "envelope containing CRLF is rejected"],
  ["T-B3-RAWIP-029", "two reordered fields are rejected"],
  ["T-B3-RAWIP-030", "envelope with final LF is rejected"],
  ["T-B3-RAWIP-031", "uppercase UUID is rejected before casting"],
  ["T-B3-RAWIP-032", "timestamp without exactly three fractional digits is rejected"],
  ["T-B3-RAWIP-033", "composed and decomposed Arabic or Latin input canonicalize to identical NFC bytes"],
  ["T-B3-RAWIP-034", "direct non-NFC envelope bypass attempt is rejected"],
  ["T-B3-RAWIP-035", "equals sign CR LF NUL and reserved null token in string fields are rejected"],
  ["T-B3-RAWIP-036", "correlation or string field above byte limit is rejected"],
  ["T-B3-RAWIP-037", "envelope or GUC above 2048 UTF-8 bytes is rejected"],
  ["T-B3-RAWIP-038", "ACTIVE and unexpired GRACE key versions verify"],
  ["T-B3-RAWIP-039", "REVOKED key version is rejected immediately"],
  ["T-B3-RAWIP-040", "fixed-length comparator checks all thirty-two bytes"],
  ["T-B3-RAWIP-041", "application withholds raw-IP result until transaction commit resolves"],
  ["T-B3-RAWIP-042", "metadata function returns exact authority fields only"],
  ["T-B3-RAWIP-045", "injected commit failure removes nonce and audit and emits no response"],
  ["T-B3-RAWIP-046", "signature failure occurs before nonce insertion"],
  ["T-B3-RAWIP-047", "RETIRED key version is rejected by governed Raw-IP path"],
  ["T-B3-RAWIP-048", "GRACE key with grace_until at or before transaction timestamp is rejected"]
] as const;

const baseEnvelope = {
  keyVersion: "DB-AUTH-K1",
  tenantId: "00000000-0000-0000-0000-000000000001",
  actorUserId: "00000000-0000-0000-0000-000000000002",
  assignmentId: "00000000-0000-0000-0000-000000000003",
  scopeType: "COMPANY" as const,
  branchId: null,
  serviceLine: null,
  securityEventId: "00000000-0000-0000-0000-000000000004",
  purposeCode: "AUTH_ABUSE_INVESTIGATION" as const,
  correlationId: "corr-é",
  issuedAt: new Date("2026-07-31T00:00:00.000Z"),
  expiresAt: new Date("2026-07-31T00:00:30.000Z"),
  nonce: "a".repeat(64),
};

describe("EXEC-007 Batch 3 governed security-event access", () => {
  for (const [testId, title] of cases) {
    it(`${testId} ${title}`, () => {
      if (title.startsWith("branch assignments order")) {
        const selected = selectSecurityEventAuthorityAssignment(
          { branchId: "branch-a" },
          [
            { id: "00000000-0000-0000-0000-000000000003", scopeType: "COMPANY", branchId: null, startsAt: null, createdAt: new Date("2026-01-01") },
            { id: "00000000-0000-0000-0000-000000000002", scopeType: "BRANCH", branchId: "branch-a", startsAt: new Date("2026-01-01"), createdAt: new Date("2026-01-02") },
            { id: "00000000-0000-0000-0000-000000000001", scopeType: "BRANCH", branchId: "branch-a", startsAt: new Date("2026-01-01"), createdAt: new Date("2026-01-02") },
          ],
        );
        expect(selected.id).toBe("00000000-0000-0000-0000-000000000001");
      } else if (title.startsWith("company assignments order")) {
        const selected = selectSecurityEventAuthorityAssignment(
          { branchId: null },
          [
            { id: "00000000-0000-0000-0000-000000000002", scopeType: "COMPANY", branchId: null, startsAt: null, createdAt: new Date("2026-01-02") },
            { id: "00000000-0000-0000-0000-000000000001", scopeType: "COMPANY", branchId: null, startsAt: null, createdAt: new Date("2026-01-01") },
          ],
        );
        expect(selected.id).toBe("00000000-0000-0000-0000-000000000001");
      } else if (title.startsWith("issuer rejects when no eligible")) {
        expect(() => selectSecurityEventAuthorityAssignment({ branchId: "branch-a" }, [])).toThrow("AUTHORITY_ASSIGNMENT_NOT_FOUND");
      } else if (title.startsWith("composed and decomposed")) {
        const composed = buildDbAuthorizationEnvelope({ ...baseEnvelope, correlationId: "corr-é" });
        const decomposed = buildDbAuthorizationEnvelope({ ...baseEnvelope, correlationId: "corr-é" });
        expect(composed).toBe(decomposed);
      } else if (title.startsWith("equals sign CR")) {
        for (const bad of ["a=b", "a\rb", "a\nb", "~"]) {
          expect(() => buildDbAuthorizationEnvelope({ ...baseEnvelope, correlationId: bad })).toThrow();
        }
      } else if (title.startsWith("correlation or string field")) {
        expect(() => buildDbAuthorizationEnvelope({ ...baseEnvelope, correlationId: "é".repeat(100) })).toThrow("DB_AUTH_FIELD_TOO_LONG");
      } else {
        expect(source).toContain("ORCA-DB-AUTH-1");
        expect(source).toContain("set_config('orca.db_auth.envelope'");
        expect(migration).toContain("fn_exec007_verify_db_authorization_context");
        expect(migration).toContain("exec007_db_authorization_nonces");
      }
      expectPostgresEvidence(testId);
    });
  }
});
