import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { buildPricingSnapshot } from "@/lib/offer-management/pricing-snapshot";
import { requiresPricingException, resolvePricingPolicy } from "@/lib/offer-management/pricing-policy";
import type { PricingPolicyContract, PricingPolicyResolutionContext } from "@/lib/offer-management/pricing-contracts";

const now = new Date("2026-07-27T12:00:00.000Z");
const saleContext: PricingPolicyResolutionContext = {
  tenantId: "tenant-a",
  offerKind: "SALE",
  serviceLine: "SALES",
  unitId: "unit-a",
  projectId: "project-a",
  branchId: "branch-a",
  trustedAt: now,
};
const leaseContext: PricingPolicyResolutionContext = {
  ...saleContext,
  offerKind: "LEASE",
  serviceLine: "LEASING",
};

function policy(overrides: Partial<PricingPolicyContract> = {}): PricingPolicyContract {
  return {
    id: "policy-project",
    tenantId: "tenant-a",
    sourceType: "SALE_PROJECT_PRICE_BOOK",
    sourceRecordId: "source",
    sourceVersion: "v1",
    scopeType: "PROJECT",
    scopeId: "project-a",
    offerKind: "SALE",
    floorAmount: "900.00",
    maxDiscountRate: "0.100000",
    standardValidityDays: 15,
    normalMaxValidityDays: 30,
    effectiveFrom: new Date("2026-01-01T00:00:00Z"),
    effectiveTo: null,
    ...overrides,
  };
}

const salePolicy = resolvePricingPolicy(saleContext, [policy()]);
const leasePolicy = resolvePricingPolicy(leaseContext, [policy({
  id: "policy-lease",
  sourceType: "LEASE_RENT_SCHEDULE",
  offerKind: "LEASE",
  scopeType: "TENANT",
  scopeId: "tenant-a",
  standardValidityDays: 7,
})]);

describe("EXEC-007 pricing", () => {
  it("T-PRICE-01/T-PRICE-02 resolves only effective tenant-safe kind-specific versioned sources", () => {
    const policies = [
      policy({ id: "tenant", scopeType: "TENANT", scopeId: "tenant-a" }),
      policy({ id: "branch", scopeType: "BRANCH", scopeId: "branch-a" }),
      policy({ id: "project", scopeType: "PROJECT", scopeId: "project-a" }),
      policy({ id: "unit", sourceType: "SALE_UNIT_PRICE_BOOK", scopeType: "UNIT", scopeId: "unit-a" }),
      policy({ id: "wrong-tenant", tenantId: "tenant-b", sourceType: "SALE_UNIT_PRICE_BOOK", scopeType: "UNIT", scopeId: "unit-a" }),
      policy({ id: "future", sourceType: "SALE_UNIT_PRICE_BOOK", scopeType: "UNIT", scopeId: "unit-a", effectiveFrom: new Date("2026-08-01T00:00:00Z") }),
      policy({ id: "expired", sourceType: "SALE_UNIT_PRICE_BOOK", scopeType: "UNIT", scopeId: "unit-a", effectiveTo: new Date("2026-07-01T00:00:00Z") }),
    ];
    expect(resolvePricingPolicy(saleContext, policies).id).toBe("unit");
    expect(resolvePricingPolicy(saleContext, policies.filter((item) => item.id !== "unit")).id).toBe("project");
    expect(resolvePricingPolicy(saleContext, policies.filter((item) => !["unit", "project"].includes(item.id))).id).toBe("branch");
    expect(resolvePricingPolicy(saleContext, policies.filter((item) => !["unit", "project", "branch"].includes(item.id))).id).toBe("tenant");
    expect(resolvePricingPolicy(leaseContext, [leasePolicy]).sourceType).toBe("LEASE_RENT_SCHEDULE");
    expect(() => resolvePricingPolicy(leaseContext, [policy()])).toThrow(/no effective/);
    expect(() => resolvePricingPolicy({ ...saleContext, serviceLine: "LEASING" }, policies)).toThrow(/service line/);
  });

  it("T-PRICE-03 fails closed on equal-precedence ambiguity and records the selected resolution trace", () => {
    const unit = policy({ id: "unit-1", sourceType: "SALE_UNIT_PRICE_BOOK", scopeType: "UNIT", scopeId: "unit-a" });
    expect(() => resolvePricingPolicy(saleContext, [unit, { ...unit, id: "unit-2" }])).toThrow(/ambiguous.*UNIT/i);
    const resolved = resolvePricingPolicy(saleContext, [policy(), unit]);
    expect(resolved.resolutionTrace).toMatchObject({
      selectedScopeType: "UNIT",
      selectedScopeId: "unit-a",
      selectedPolicyId: "unit-1",
    });
    expect(resolved.resolutionTrace.evaluatedLevels[0]?.eligiblePolicyIds).toEqual(["unit-1"]);
  });

  it("T-PRICE-04/T-PRICE-08/T-PRICE-09 builds explicit components and derives customer total only from payerType", () => {
    const result = buildPricingSnapshot({
      offerKind: "SALE",
      policy: salePolicy,
      taxBasis: "EXCLUSIVE",
      components: [
        { code: "BASE_SALE_PRICE", label: "Base", amount: "1000.005", payerType: "CUSTOMER", isCustomerObligation: true },
        { code: "OWNER_FEE", label: "Owner", amount: "20.00", payerType: "OWNER", isCustomerObligation: false },
        { code: "BROKER_COMMISSION", label: "Broker", amount: "30.00", payerType: "BROKER", isCustomerObligation: false },
        { code: "OTHER", label: "Other", amount: "40.00", payerType: "OTHER_NON_CUSTOMER", isCustomerObligation: false },
      ],
    });
    expect(result.components[0]?.amount).toBe("1000.01");
    expect(result.customerTotal).toBe("1000.01");
    expect(result.currency).toBe("SAR");
    expect(result.resolutionTrace.selectedPolicyId).toBe(salePolicy.id);
    expect(() => buildPricingSnapshot({
      offerKind: "SALE",
      policy: salePolicy,
      taxBasis: "EXCLUSIVE",
      components: [
        { code: "BASE_SALE_PRICE", label: "Base", amount: "1000", payerType: "OWNER", isCustomerObligation: true },
      ],
    })).toThrow(/payer and customer-obligation flags conflict/);
  });

  it("T-PRICE-05 rejects missing and cross-kind LEASE components", () => {
    expect(() =>
      buildPricingSnapshot({
        offerKind: "LEASE",
        policy: leasePolicy,
        taxBasis: "INCLUSIVE",
        components: [{ code: "BASE_SALE_PRICE", label: "bad", amount: "1", payerType: "CUSTOMER", isCustomerObligation: true }],
      }),
    ).toThrow();
  });

  it("T-PRICE-07 requires independent approval for manual adjustment", () => {
    expect(() =>
      buildPricingSnapshot({
        offerKind: "SALE",
        policy: salePolicy,
        taxBasis: "EXCLUSIVE",
        components: [{ code: "BASE_SALE_PRICE", label: "Base", amount: "1000", payerType: "CUSTOMER", isCustomerObligation: true }],
        manualAdjustment: { amount: "-10", reason: "negotiated", initiatorUserId: "u1", independentlyApproved: false },
      }),
    ).toThrow(/independent approval/);
  });

  it("T-PRICE-06 uses versioned thresholds instead of a hardcoded percentage", () => {
    expect(requiresPricingException(new Prisma.Decimal(1000), new Prisma.Decimal(850), salePolicy)).toBe(true);
    expect(requiresPricingException(new Prisma.Decimal(1000), new Prisma.Decimal(950), salePolicy)).toBe(false);
  });
});
