import { describe, expect, it } from "vitest";
import type { ResolvedPricingPolicy } from "@/lib/offer-management/pricing-contracts";
import { buildPricingSnapshot } from "@/lib/offer-management/pricing-snapshot";

const policy: ResolvedPricingPolicy = {
  id: "p",
  tenantId: "t",
  sourceType: "SALE_UNIT_PRICE_BOOK",
  sourceRecordId: "s",
  sourceVersion: "1",
  scopeType: "UNIT",
  scopeId: "unit-a",
  offerKind: "SALE",
  standardValidityDays: 15,
  normalMaxValidityDays: 30,
  effectiveFrom: new Date("2026-01-01T00:00:00Z"),
  effectiveTo: null,
  resolutionTrace: {
    selectedScopeType: "UNIT",
    selectedScopeId: "unit-a",
    selectedPolicyId: "p",
    evaluatedLevels: [
      {
        scopeType: "UNIT",
        scopeId: "unit-a",
        eligiblePolicyIds: ["p"],
      },
    ],
  },
};

describe("EXEC-007 Decimal contract", () => {
  it("T-DEC-01/T-DEC-02 preserves Decimal strings and six-place rates", () => {
    const snapshot = buildPricingSnapshot({
      offerKind: "SALE",
      policy,
      taxBasis: "EXCLUSIVE",
      components: [{ code: "BASE_SALE_PRICE", label: "Base", amount: "999999999999.994", rate: "0.1234567", payerType: "CUSTOMER", isCustomerObligation: true }],
    });
    expect(snapshot.components[0]?.amount).toBe("999999999999.99");
    expect(snapshot.components[0]?.rate).toBe("0.123457");
  });

  it("T-DEC-03 uses HALF_UP at the monetary boundary", () => {
    const snapshot = buildPricingSnapshot({
      offerKind: "SALE",
      policy,
      taxBasis: "EXCLUSIVE",
      components: [{ code: "BASE_SALE_PRICE", label: "Base", amount: "10.005", payerType: "CUSTOMER", isCustomerObligation: true }],
    });
    expect(snapshot.customerTotal).toBe("10.01");
  });
});
