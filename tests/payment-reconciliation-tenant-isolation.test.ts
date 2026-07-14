import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "lib/domain/transaction-spine/payment-reconciliation.ts"),
  "utf8",
);

describe("payment reconciliation tenant isolation", () => {
  it("does not trust unscoped linked invoice or installment records", () => {
    expect(source).not.toContain("payment.invoice ||");
    expect(source).toContain(
      "where: { id: invoiceId, tenantId: input.tenantId }",
    );
    expect(source).toContain(
      "where: { id: payment.installmentId, tenantId: input.tenantId }",
    );
  });
});
