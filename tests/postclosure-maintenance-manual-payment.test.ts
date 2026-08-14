import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("post-closure manual payment integrity", () => {
  it("recovers failed idempotent payments and charges only the remaining minor-unit balance", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/api/v1/invoices/[id]/pay/route.ts"),
      "utf8",
    );
    expect(source).toContain("state: 'failed' as const");
    expect(source).toContain("paymentTransactionId: transaction.id");
    expect(source).toContain("tx.paymentTransaction.aggregate");
    expect(source).toContain("invoiceTotalMinor");
    expect(source).toContain("paidBeforeMinor");
    expect(source).toContain("remainingMinor");
    expect(source).toContain("amountMinorUnits: created.amountMinorUnits");
    expect(source).toContain("manual payment retry is already in progress");
    expect(source).toContain("payment receipt was not created");
    expect(source).toContain("status: 'FAILED'");
    expect(source).toContain("invoice has no remaining balance");
    expect(source).not.toContain("id: transaction.providerTransactionId");
    expect(source).not.toContain("id: created.paymentTransaction.id,\n        receivedDate: new Date()");
  });
});
