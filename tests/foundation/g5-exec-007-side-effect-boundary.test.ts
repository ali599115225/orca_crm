import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const roots = ["lib/offer-management", "lib/customer-portal", "lib/exec-007-cutover"];
const source = roots
  .flatMap((root) => fs.readdirSync(path.join(process.cwd(), root)).map((name) => path.join(root, name)))
  .filter((file) => file.endsWith(".ts"))
  .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
  .join("\n");
const migration = fs.readFileSync(
  path.join(process.cwd(), "prisma/migrations/20260727090000_exec_007_exact_scope_foundation/migration.sql"),
  "utf8",
);

describe("EXEC-007 downstream side-effect boundary", () => {
  it("T-SIDE-01 creates no contract, lease, invoice, payment or accounting writer", () => {
    expect(source).not.toMatch(/createContract|createRentalLease|createInvoice|createPaymentPlan|createInstallment|createPayment|createJournalEntry/);
    expect(migration).not.toMatch(/CREATE TABLE "exec007_(contract|lease|invoice|payment|installment|journal)/i);
  });

  it("T-SIDE-02 never mutates Unit.status or activates an external provider", () => {
    expect(source).not.toMatch(/\.unit\.update|Unit\.status|provider\.activate|government/i);
    expect(migration).not.toMatch(/UPDATE\s+"units"[\s\S]{0,120}"status"/i);
  });

  it("stops at a preparation request after reservation", () => {
    expect(migration).toContain('CREATE TABLE "exec007_preparation_requests"');
    expect(migration).not.toMatch(/INSERT\s+INTO\s+"contracts"/i);
  });
});
