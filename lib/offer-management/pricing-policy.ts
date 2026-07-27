import { Prisma } from "@prisma/client";
import type { OfferKind } from "./contracts";
import type { PricingPolicyContract } from "./pricing-contracts";

export function resolvePricingPolicy(
  offerKind: OfferKind,
  policies: readonly PricingPolicyContract[],
  now: Date,
): PricingPolicyContract {
  const eligible = policies.filter(
    (policy) =>
      policy.offerKind === offerKind &&
      policy.effectiveFrom <= now &&
      (!policy.effectiveTo || now < policy.effectiveTo),
  );
  const precedence = offerKind === "SALE"
    ? ["SALE_UNIT_PRICE_BOOK", "SALE_PROJECT_PRICE_BOOK"]
    : ["LEASE_RENT_SCHEDULE"];
  for (const sourceType of precedence) {
    const selected = eligible
      .filter((policy) => policy.sourceType === sourceType)
      .sort((left, right) => right.effectiveFrom.getTime() - left.effectiveFrom.getTime())[0];
    if (selected) return selected;
  }
  throw new Error(`no effective versioned ${offerKind} pricing policy`);
}

export function requiresPricingException(
  baseAmount: Prisma.Decimal.Value,
  proposedAmount: Prisma.Decimal.Value,
  policy: PricingPolicyContract,
): boolean {
  const base = new Prisma.Decimal(baseAmount);
  const proposed = new Prisma.Decimal(proposedAmount);
  if (policy.floorAmount != null && proposed.lessThan(new Prisma.Decimal(policy.floorAmount))) return true;
  if (policy.maxDiscountRate != null && base.greaterThan(0)) {
    const discountRate = base.minus(proposed).div(base);
    if (discountRate.greaterThan(new Prisma.Decimal(policy.maxDiscountRate))) return true;
  }
  return false;
}
