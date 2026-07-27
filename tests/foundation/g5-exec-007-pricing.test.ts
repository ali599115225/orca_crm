import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { buildPricingSnapshot } from "@/lib/offer-management/pricing-snapshot";
import { requiresPricingException, resolvePricingPolicy } from "@/lib/offer-management/pricing-policy";

const now = new Date("2026-07-27T12:00:00.000Z");
const salePolicy = {
  id: "policy-sale",
  tenantId: "tenant",
  sourceType: "SALE_PROJECT_PRICE_BOOK" as const,
  sourceRecordId: "source",
  sourceVersion: "v1",
  offerKind: "SALE" as const,
  floorAmount: "900.00",
  maxDiscountRate: "0.100000",
  standardValidityDays: 15,
  normalMaxValidityDays: 30 as const,
  effectiveFrom: new Date("2026-01-01T00:00:00Z"),
  effectiveTo: null,
};

const leasePolicy = {
  ...salePolicy,
  id: "policy-lease",
  sourceType: "LEASE_RENT_SCHEDULE" as const,
  offerKind: "LEASE" as const,
  standardValidityDays: 7,
};

describe("EXEC-007 pricing", () => {
  it("T-PRICE-01/T-PRICE-02 resolves only effective kind-specific versioned sources", () => {
    expect(resolvePricingPolicy("SALE", [leasePolicy, salePolicy], now).id).toBe("policy-sale");
    expect(resolvePricingPolicy("LEASE", [salePolicy, leasePolicy], now).id).toBe("policy-lease");
    expect(() => resolvePricingPolicy("LEASE", [salePolicy], now)).toThrow(/no effective/);
  });

  it("T-PRICE-04/T-PRICE-08/T-PRICE-09 builds explicit tax/payer components and customer-only total", () => {
    const result = buildPricingSnapshot({
      offerKind: "SALE",
      policy: salePolicy,
      taxBasis: "EXCLUSIVE",
      components: [
        { code: "BASE_SALE_PRICE", label: "Base", amount: "1000.005", payerType: "CUSTOMER", isCustomerObligation: true },
        { code: "BROKER_COMMISSION", label: "Commission", amount: "20.00", payerType: "OWNER", isCustomerObligation: false },
      ],
    });
    expect(result.components[0]?.amount).toBe("1000.01");
    expect(result.customerTotal).toBe("1000.01");
    expect(result.currency).toBe("SAR");
    expect(result.taxBasis).toBe("EXCLUSIVE");
    expect(result.components[0]?.payerType).toBe("CUSTOMER");
    expect(result.components[1]?.isCustomerObligation).toBe(false);
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

  it("T-PRICE-03/T-PRICE-07 requires independent approval for manual adjustment", () => {
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
