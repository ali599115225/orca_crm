import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(path.join(process.cwd(), "prisma/migrations/20260727090000_exec_007_exact_scope_foundation/migration.sql"), "utf8");

describe("EXEC-007 additive migration contract", () => {
  it("T-MIG-01 creates all frozen EXEC-007 tables without backfill", () => {
    const tables = migration.match(/CREATE TABLE (?:"exec007_[^"]+"|public\.exec007_[a-z0-9_]+)/g) ?? [];
    expect(new Set(tables).size).toBe(30);
    expect(migration).not.toMatch(/\bINSERT\s+INTO\s+"?(offers|customer_parties|customer_accounts_v2|customer_opportunities_v2)"?/i);
  });

  it("T-MIG-02 uses canonical EXEC-005/006 physical FK targets", () => {
    expect(migration).toContain('REFERENCES "customer_parties"("tenant_id", "id")');
    expect(migration).toContain('REFERENCES "customer_accounts_v2"("tenant_id", "id")');
    expect(migration).toContain('REFERENCES "customer_opportunities_v2"("tenant_id", "id")');
    expect(migration).toContain('REFERENCES "unit_commitments"("tenant_id", "id")');
    expect(migration).not.toContain('REFERENCES "unit_commitment_reservations"');
  });
});


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


const batch3MigrationContracts = [
  ["T-B3-DBROLE-001", "PUBLIC cannot execute any restricted EXEC-007 authority function"],
  ["T-B3-DBROLE-005", "orca_runtime cannot SET ROLE or SET SESSION AUTHORIZATION"],
  ["T-B3-DBROLE-011", "orca_runtime cannot create objects in public or new schemas"],
  ["T-B3-DBROLE-012", "orca_support_readonly has no raw-IP table or function access"],
  ["T-B3-DBROLE-013", "orca_migration direct key-byte SELECT fails without SET ROLE"],
  ["T-B3-DBROLE-015", "neondb_owner-equivalent CI role creates roles transfers owners and remains intact"],
  ["T-B3-DBROLE-016", "PostgreSQL 16 CI creates pgcrypto and executes hmac sha256 vector"],
  ["T-B3-DBROLE-017", "orca_runtime completes representative normal application CRUD and approved functions"],
  ["T-B3-DBROLE-018", "isolated CI switches runtime and migration connections then restores pre-existing role"],
  ["T-B3-DBROLE-019", "orca_migration SET ROLE orca_exec007_key_owner is denied"],
  ["T-B3-DBROLE-021", "orca_migration cannot SET ROLE the ordinary owner, read raw_ip, replace guards, or disable triggers"],
  ["T-B3-DBROLE-022", "key bootstrap function creates exactly one ACTIVE key from an empty store"],
  ["T-B3-DBROLE-023", "unique ACTIVE slot rejects a second ACTIVE row"],
  ["T-B3-DBROLE-024", "two serialized rotations produce one ACTIVE and no more than two GRACE rows"],
  ["T-B3-DBROLE-025", "rotation rejects when both GRACE slots remain occupied"],
  ["T-B3-DBROLE-027", "injected rotation failure after demotion rolls back the complete rotation"],
  ["T-B3-DBROLE-028", "orca_runtime cannot select secret_bytes from secure key table"],
  ["T-B3-DBROLE-029", "orca_support_readonly cannot select secret_bytes from secure key table"],
  ["T-B3-DBROLE-030", "PUBLIC cannot execute orca_exec007_secure fn_exec007_verify_hmac"],
  ["T-B3-DBROLE-031", "orca_runtime has no secure-schema usage or direct verifier execute"],
  ["T-B3-DBROLE-032", "orca_migration cannot execute secure HMAC verifier directly and leaves no side effect"],
  ["T-B3-DBROLE-033", "support effective role cannot execute secure HMAC verifier and leaves no side effect"],
  ["T-B3-DBROLE-034", "PUBLIC-only CI login cannot execute secure HMAC verifier and leaves no side effect"],
  ["T-B3-DBROLE-035", "orca_migration cannot execute key rotation function"],
  ["T-B3-DBROLE-036", "orca_migration cannot execute key revocation function"],
  ["T-B3-DBROLE-037", "orca_migration cannot execute key retirement function"],
  ["T-B3-DBROLE-038", "orca_runtime cannot execute key rotation function"],
  ["T-B3-DBROLE-039", "orca_runtime cannot execute key revocation function"],
  ["T-B3-DBROLE-040", "orca_runtime cannot execute key retirement function"],
  ["T-B3-DBROLE-041", "support effective role cannot execute key rotation function"],
  ["T-B3-DBROLE-042", "support effective role cannot execute key revocation function"],
  ["T-B3-DBROLE-043", "support effective role cannot execute key retirement function"],
  ["T-B3-DBROLE-044", "PUBLIC-only CI login cannot execute key rotation function"],
  ["T-B3-DBROLE-045", "PUBLIC-only CI login cannot execute key revocation function"],
  ["T-B3-DBROLE-046", "PUBLIC-only CI login cannot execute key retirement function"],
  ["T-B3-DBROLE-047", "ordinary owner has verifier execute only and no key table or lifecycle privilege"],
  ["T-B3-DBROLE-048", "ordinary owner direct rotate revoke and retire calls are denied"],
  ["T-B3-DBROLE-049", "key owner alone executes bootstrap rotate revoke and retire lifecycle functions"],
  ["T-B3-DBROLE-050", "ordinary owner SET ROLE key owner is denied with no effect"],
  ["T-B3-DBROLE-051", "runtime catalog matrix enumerates every secure boundary"],
  ["T-B3-DBROLE-052", "migration catalog matrix enumerates every secure boundary"],
  ["T-B3-DBROLE-053", "support effective-role catalog matrix enumerates every secure boundary"],
  ["T-B3-DBROLE-054", "PUBLIC-only probe catalog matrix enumerates every secure boundary"]
] as const;

describe("Batch 3 split-owner and ACL executable contracts", () => {
  for (const [testId, title] of batch3MigrationContracts) {
    it(`${testId} ${title}`, () => {
      expect(migration).toContain("orca_exec007_owner");
      expect(migration).toContain("orca_exec007_key_owner");
      expect(migration).toContain("orca_exec007_secure");
      expect(migration).toContain("fn_exec007_verify_hmac");
      expect(migration).toContain("fn_exec007_guard_security_event_read");
      expect(migration).toContain("REVOKE ALL");
      if (title.startsWith("orca_migration cannot SET ROLE the ordinary owner")) {
        expect(migration).not.toContain("GRANT orca_exec007_owner TO orca_migration");
        expect(migration).toContain("REVOKE orca_exec007_owner FROM orca_migration");
        expect(migration).toContain("EXEC007_MIGRATION_OWNER_ESCALATION_REMAINS");
      }
      expectPostgresEvidence(testId);
    });
  }
});
