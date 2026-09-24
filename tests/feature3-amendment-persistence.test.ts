import fs from "node:fs";
import path from "node:path";
import {
  describe,
  expect,
  it,
} from "vitest";

function source(relativePath: string): string {
  return fs.readFileSync(
    path.join(process.cwd(), relativePath),
    "utf8",
  );
}

const migrationPath =
  "prisma/migrations/20260924190000_feature3_amendment_persistence/migration.sql";

describe("Feature 3 amendment persistence foundation", () => {
  it("enables Prisma partial-index representation", () => {
    const schema = source("prisma/schema.prisma");

    expect(schema).toContain(
      'previewFeatures = ["partialIndexes"]',
    );
  });

  it("binds ContractAmendment to the tenant-scoped Contract identity", () => {
    const schema = source("prisma/schema.prisma");
    const w1 = source("prisma/w1-contract-finance.prisma");

    expect(schema).toMatch(
      /amendments\s+ContractAmendment\[\]/,
    );

    expect(w1).toMatch(
      /contract\s+Contract\s+@relation\(fields: \[tenantId, contractId\], references: \[tenantId, id\], onDelete: Restrict\)/,
    );

    expect(w1).toMatch(
      /sourceContractVersion\s+Int\s+@map\("source_contract_version"\)/,
    );
  });

  it("scopes snapshot uniqueness to ISSUED and SIGNED_OPERATIONAL only", () => {
    const w1 = source("prisma/w1-contract-finance.prisma");

    expect(w1).toContain(
      '@@unique([tenantId, draftId, snapshotType], map: "uq_contract_snapshots_tenant_draft_type", where: { snapshotType: "ISSUED" })',
    );

    expect(w1).toContain(
      '@@unique([tenantId, contractId, snapshotType, contractVersion], map: "uq_contract_snapshots_tenant_contract_type_version", where: { snapshotType: "SIGNED_OPERATIONAL" })',
    );

    expect(w1).not.toContain(
      '@@unique([tenantId, draftId, snapshotType], map: "uq_contract_snapshots_tenant_draft_type")',
    );

    expect(w1).not.toContain(
      '@@unique([tenantId, contractId, snapshotType, contractVersion], map: "uq_contract_snapshots_tenant_contract_type_version")',
    );
  });

  it("contains only the approved structural migration operations", () => {
    const migration = source(migrationPath);

    expect(migration).toContain(
      'ADD COLUMN "source_contract_version" INTEGER NOT NULL',
    );

    expect(migration).toContain(
      'ADD CONSTRAINT "contract_amendments_tenant_id_contract_id_fkey"',
    );

    expect(migration).toContain(
      'FOREIGN KEY ("tenant_id", "contract_id")',
    );

    expect(migration).toContain(
      'REFERENCES "contracts"("tenant_id", "id")',
    );

    expect(migration).toContain(
      'DROP INDEX "uq_contract_snapshots_tenant_draft_type"',
    );

    expect(migration).toContain(
      `WHERE "snapshot_type" = 'ISSUED'`,
    );

    expect(migration).toContain(
      'DROP INDEX "uq_contract_snapshots_tenant_contract_type_version"',
    );

    expect(migration).toContain(
      `WHERE "snapshot_type" = 'SIGNED_OPERATIONAL'`,
    );
  });

  it("fails closed instead of inventing source versions for historical amendment rows", () => {
    const migration = source(migrationPath);

    expect(migration).toContain(
      'IF EXISTS (',
    );

    expect(migration).toContain(
      'FROM "contract_amendments"',
    );

    expect(migration).toContain(
      "FEATURE3_AMENDMENT_PERSISTENCE_BLOCKED",
    );

    expect(migration).not.toMatch(
      /\bINSERT\s+INTO\b/i,
    );

    expect(migration).not.toMatch(
      /\bUPDATE\s+"contract_amendments"\b/i,
    );

    expect(migration).not.toMatch(
      /\bDELETE\s+FROM\b/i,
    );
  });

  it("does not touch invoices, payments, rentals, or RF12 persistence", () => {
    const migration = source(migrationPath);

    expect(migration).not.toMatch(
      /ALTER TABLE "invoices"/,
    );

    expect(migration).not.toMatch(
      /ALTER TABLE "installments"/,
    );

    expect(migration).not.toMatch(
      /ALTER TABLE "payment_transactions"/,
    );

    expect(migration).not.toMatch(
      /rental_/i,
    );

    expect(migration).not.toMatch(
      /rf12/i,
    );
  });

  it("wraps the persistence migration in one explicit PostgreSQL transaction", () => {
    const migration = source(migrationPath);

    expect(migration).toMatch(
      /(^|\r?\n)BEGIN;\r?\n/,
    );

    expect(migration.trimEnd()).toMatch(
      /COMMIT;$/,
    );
  });
});