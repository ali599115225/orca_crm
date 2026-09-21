import { Prisma } from "@prisma/client";
import type {
  PricingPolicyContract,
  PricingPolicyResolutionContext,
  PricingResolutionLevelTrace,
  PricingScopeType,
  PricingSourceType,
  ResolvedPricingPolicy,
} from "./pricing-contracts";

const EXPECTED_SERVICE_LINE = {
  SALE: "SALES",
  LEASE: "LEASING",
} as const;

function sourceTypeForLevel(
  offerKind: PricingPolicyResolutionContext["offerKind"],
  scopeType: PricingScopeType,
): PricingSourceType {
  if (offerKind === "LEASE") return "LEASE_RENT_SCHEDULE";
  return scopeType === "UNIT" ? "SALE_UNIT_PRICE_BOOK" : "SALE_PROJECT_PRICE_BOOK";
}

export function resolvePricingPolicy(
  context: PricingPolicyResolutionContext,
  policies: readonly PricingPolicyContract[],
): ResolvedPricingPolicy {
  if (context.serviceLine !== EXPECTED_SERVICE_LINE[context.offerKind]) {
    throw new Error("offer kind and pricing service line must match");
  }

  const levels: ReadonlyArray<{ scopeType: PricingScopeType; scopeId: string }> = [
    { scopeType: "UNIT", scopeId: context.unitId },
    { scopeType: "PROJECT", scopeId: context.projectId },
    { scopeType: "BRANCH", scopeId: context.branchId },
    { scopeType: "TENANT", scopeId: context.tenantId },
  ];
  const eligible = policies.filter(
    (policy) =>
      policy.tenantId === context.tenantId &&
      policy.offerKind === context.offerKind &&
      policy.effectiveFrom <= context.trustedAt &&
      (!policy.effectiveTo || context.trustedAt < policy.effectiveTo),
  );
  const evaluatedLevels: PricingResolutionLevelTrace[] = [];

  for (const level of levels) {
    const expectedSourceType = sourceTypeForLevel(context.offerKind, level.scopeType);
    const matches = eligible.filter(
      (policy) =>
        policy.scopeType === level.scopeType &&
        policy.scopeId === level.scopeId &&
        policy.sourceType === expectedSourceType,
    );
    evaluatedLevels.push({
      scopeType: level.scopeType,
      scopeId: level.scopeId,
      eligiblePolicyIds: matches.map((policy) => policy.id).sort(),
    });
    if (matches.length > 1) {
      throw new Error(`ambiguous effective pricing policy at ${level.scopeType} precedence`);
    }
    const selected = matches[0];
    if (selected) {
      return {
        ...selected,
        resolutionTrace: {
          selectedScopeType: level.scopeType,
          selectedScopeId: level.scopeId,
          selectedPolicyId: selected.id,
          evaluatedLevels,
        },
      };
    }
  }

  throw new Error(`no effective versioned ${context.offerKind} pricing policy`);
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
