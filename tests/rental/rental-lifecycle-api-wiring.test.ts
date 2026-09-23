import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("rental lifecycle API wiring", () => {
  it("wires the dedicated closure lifecycle routes", () => {
    const routes = [
      ["app/api/v1/leases/[id]/closure/route.ts", "closeRentalLease"],
      [
        "app/api/v1/leases/[id]/deposit-settlement/route.ts",
        "settleRentalDeposit",
      ],
      ["app/api/v1/leases/[id]/handover/route.ts", "linkRentalHandover"],
      ["app/api/v1/leases/[id]/terminate/route.ts", "terminateRentalLease"],
      ["app/api/v1/leases/[id]/renew/route.ts", "renewRentalLease"],
      [
        "app/api/v1/leases/[id]/ejar-reconciliation/route.ts",
        "reconcileRentalEjarPayment",
      ],
    ] as const;

    for (const [path, serviceFunction] of routes) {
      const text = source(path);
      expect(text).toContain("runWithDatabaseSession");
      expect(text).toContain("FINANCE_WRITE_ROLES");
      expect(text).toContain(serviceFunction);
      expect(text).toContain("rentalClosureApiErrorResponse");
    }
  });

  it("prevents generic lease PUT from bypassing lifecycle gates", () => {
    const text = source("app/api/v1/leases/route.ts");
    expect(text).toContain(
      "تغييرات دورة عقد الإيجار النهائية تمر عبر مسارات renewal/terminate/closure المخصصة",
    );
    expect(text).toContain('existing.status.toLowerCase() !== "active"');
  });

  it("wires true partial manual payment allocation without changing omitted-amount behavior", () => {
    const text = source("app/api/v1/invoices/[id]/pay/route.ts");
    expect(text).toContain("parseOptionalPaymentAmount");
    expect(text).toContain("resolvePaymentAllocationMinor");
    expect(text).toContain("expectedAmountMinor: requestedMinor");
    expect(text).toContain("amountMinorUnits: requestedMinor");
    expect(text).toContain(
      "manual payment idempotency key was reused with a different amount",
    );
  });
});
