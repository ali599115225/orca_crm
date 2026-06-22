import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { calculateEarlySettlementAmount } from "@/lib/domain/transaction-spine";

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Early settlement", () => {
  it("calculates the exact remaining invoice balance", () => {
    expect(calculateEarlySettlementAmount(1_000_000, 275_000)).toBe(725_000);
    expect(calculateEarlySettlementAmount(100, 99.99)).toBe(0.01);
  });

  it("never returns a negative settlement amount", () => {
    expect(calculateEarlySettlementAmount(100, 120)).toBe(0);
  });

  it("keeps settlement amount server-owned and finalizes in reconciliation", () => {
    const command = source(
      "lib/domain/transaction-spine/early-settlement.ts",
    );
    const route = source(
      "app/api/v1/contracts/[id]/early-settlement/route.ts",
    );
    const reconciliation = source(
      "lib/domain/transaction-spine/payment-reconciliation.ts",
    );

    expect(route).not.toContain("body.amount");
    expect(command).toContain("calculateEarlySettlementAmount");
    expect(command).toContain("PAYMENT_METHOD.EARLY_SETTLEMENT");
    expect(reconciliation).toContain(
      'action: "EARLY_SETTLEMENT_COMPLETED"',
    );
    expect(reconciliation).toContain(
      'eventType: "payment_plan.early_settled"',
    );
    expect(reconciliation).toContain("INSTALLMENT_STATUS.CANCELLED");
    expect(reconciliation).toContain(
      "Payment exceeds the invoice remaining balance.",
    );

    const dealTypes = source("lib/domain/deal-passport/types.ts");
    const appendEvent = source("lib/domain/deal-passport/append-event.ts");
    expect(dealTypes).toContain('"payment_plan.early_settled"');
    expect(dealTypes).toContain('"EARLY_SETTLED"');
    expect(appendEvent).toContain(
      'eventType === "payment_plan.early_settled"',
    );
  });

  it("prevents full settlement through the restructure command", () => {
    const restructure = source(
      "lib/domain/transaction-spine/restructure-payment-plan.ts",
    );
    expect(restructure).toContain(
      "Use the dedicated early settlement command.",
    );
  });
});