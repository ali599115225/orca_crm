import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Phase 02 full closure architecture", () => {
  it("keeps causation, correlation, audit deltas, and tenant payment idempotency in the schema", () => {
    const schema = source("prisma/schema.prisma");
    expect(schema).toContain('causationId    String?      @map("causation_id")');
    expect(schema).toContain('correlationId  String       @map("correlation_id")');
    expect(schema).toContain('beforeState    Json?        @map("before_state")');
    expect(schema).toContain('afterState     Json?        @map("after_state")');
    expect(schema).toContain(
      '@@unique([tenantId, idempotencyKey], map: "payment_transactions_tenant_idempotency_uq")',
    );
  });

  it("uses the clean baseline migration for the Phase 02 schema", () => {
    const migration = source("prisma/migrations/000000000000_baseline/migration.sql");
    expect(migration).toContain('"causation_id" UUID');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "payment_transactions_tenant_idempotency_uq"',
    );
    expect(migration).toContain('ADD CONSTRAINT "opportunities_lead_id_fkey"');
    expect(migration).not.toMatch(/\b(?:DROP\s+TABLE|TRUNCATE|DELETE\s+FROM)\b/i);
  });

  it("removes the direct manual payment bypass", () => {
    const finance = source("app/actions/finance.ts");
    expect(finance).toContain("recordPayment");
    expect(finance).not.toContain("tx.receipt.create");
    expect(finance).not.toContain("tx.invoice.update");
  });

  it("keeps payment completion, receipt linkage, and deal events transactionally guarded", () => {
    const reconciliation = source(
      "lib/domain/transaction-spine/payment-reconciliation.ts",
    );
    const manualRoute = source("app/api/v1/invoices/[id]/pay/route.ts");
    const paylinkRoute = source("app/api/payments/paylink/webhook/route.ts");

    expect(reconciliation).toContain(
      "Prisma.TransactionIsolationLevel.Serializable",
    );
    const paymentCreateStart = manualRoute.indexOf(
      "const paymentTransaction = await tx.paymentTransaction.create",
    );
    const receiptCreateStart = manualRoute.indexOf(
      "const receipt = await tx.receipt.create",
    );
    expect(paymentCreateStart).toBeGreaterThanOrEqual(0);
    expect(receiptCreateStart).toBeGreaterThan(paymentCreateStart);
    expect(
      manualRoute.slice(paymentCreateStart, receiptCreateStart),
    ).not.toContain("paymentTransactionId:");
    expect(manualRoute.slice(receiptCreateStart)).toContain(
      "paymentTransactionId: paymentTransaction.id",
    );
    expect(manualRoute).toContain("Prisma.TransactionIsolationLevel.Serializable");
    expect(paylinkRoute).toContain("paymentTransactionId: payment.id");
    expect(paylinkRoute).toContain("Prisma.TransactionIsolationLevel.Serializable");
  });

  it("routes authorized opportunity and tour writes through the transaction spine", () => {
    const opportunities = source("app/api/v1/opportunities/route.ts");
    const tours = source("app/api/v1/tours/route.ts");
    const tourStatus = source("app/api/v1/tours/[id]/status/route.ts");
    expect(opportunities).toContain("createOpportunity");
    expect(opportunities).toContain("runWithDatabaseSession");
    expect(opportunities).toContain("TENANT_WRITE_ROLES");
    expect(tours).toContain("scheduleTour");
    expect(tours).toContain("runWithDatabaseSession");
    expect(tours).toContain("TENANT_WRITE_ROLES");
    expect(tourStatus).toContain("updateTourStatus");
    expect(tourStatus).toContain("runWithDatabaseSession");
    expect(tourStatus).toContain("TENANT_WRITE_ROLES");
  });
});

