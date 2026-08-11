import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(process.cwd(), "prisma/migrations/20260811080000_exec_010_document_privacy_reporting_controls/migration.sql");
const migration = readFileSync(migrationPath, "utf8");
const service = readFileSync(join(process.cwd(), "lib/document-governance/service.ts"), "utf8");
const repository = readFileSync(join(process.cwd(), "lib/document-governance/sql-repository.ts"), "utf8");

describe("EXEC-010 — frozen schema and package boundary", () => {
  it("creates only additive provider-neutral evidence tables and guards", () => {
    for (const table of ["exec010_document_evidence","exec010_privacy_requests","exec010_metric_definitions","exec010_metric_results","exec010_export_audits"]) {
      expect(migration).toContain(`CREATE TABLE \"${table}\"`);
    }
    expect(migration).toContain("EXEC010_APPEND_ONLY");
    expect(migration).toContain("EXEC010_DOCUMENT_EVIDENCE_IMMUTABLE");
    expect(migration).toContain("EXEC010_LEGAL_HOLD_BLOCKS_EXPIRY");
    expect(migration).toContain("EXEC010_METRIC_TENANT_SCOPE_MISMATCH");
  });

  it("contains no customer-data backfill or provider/storage/scanner activation", () => {
    expect(migration).not.toMatch(/INSERT\s+INTO\s+(documents|leads|parties|contracts|offers|payment_transactions)\b/i);
    expect(migration).not.toMatch(/UPDATE\s+(documents|leads|parties|contracts|offers|payment_transactions)\b/i);
    expect([service, repository, migration].join("\n")).not.toMatch(/S3_|AWS_ACCESS|AZURE_STORAGE|CLAMAV|VIRUSTOTAL|GOOGLE_APPLICATION_CREDENTIALS|OPENAI_API_KEY/);
  });

  it("uses sealed EXEC-004 authority and does not introduce parallel roles", () => {
    expect(service).toContain("evaluateOrganizationAuthority");
    expect(service).toContain('"export.execute"');
    expect(service).not.toMatch(/PLATFORM_OWNER|SYSTEM_ADMINISTRATOR/);
  });

  it("does not overwrite EXEC-005 through EXEC-009 upstream truth", () => {
    const source = [service, repository].join("\n");
    expect(source).not.toMatch(/UPDATE\s+(parties|unit_commitments|offers|exec008_|exec009_)/i);
    expect(source).not.toMatch(/DELETE\s+FROM\s+(parties|unit_commitments|offers|exec008_|exec009_)/i);
  });
});
