import { Prisma } from "@prisma/client";
import { hashCanonicalDomain } from "./canonicalization";
import type { PricingComponentInput, PricingSnapshotInput } from "./pricing-contracts";

const Decimal = Prisma.Decimal;
const MONEY_SCALE = 2;
const RATE_SCALE = 6;

function money(value: Prisma.Decimal.Value): Prisma.Decimal {
  return new Decimal(value).toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);
}

function rate(value: Prisma.Decimal.Value): Prisma.Decimal {
  return new Decimal(value).toDecimalPlaces(RATE_SCALE, Decimal.ROUND_HALF_UP);
}

function assertComponentShape(input: PricingSnapshotInput): void {
  const codes = new Set(input.components.map((component) => component.code));
  if (codes.size !== input.components.length) throw new Error("duplicate pricing component code");
  const required =
    input.offerKind === "SALE"
      ? ["BASE_SALE_PRICE"]
      : ["PERIODIC_RENT", "TERM", "DEPOSIT"];
  for (const code of required) {
    if (!codes.has(code)) throw new Error(`missing ${input.offerKind} pricing component: ${code}`);
  }
  const prohibited =
    input.offerKind === "SALE"
      ? ["PERIODIC_RENT", "TERM", "DEPOSIT", "ESCALATION", "RENEWAL"]
      : ["BASE_SALE_PRICE"];
  for (const code of prohibited) {
    if (codes.has(code)) throw new Error(`cross-kind pricing component prohibited: ${code}`);
  }
  if (input.offerKind === "LEASE" && input.policy.sourceType !== "LEASE_RENT_SCHEDULE") {
    throw new Error("LEASE requires a versioned rent schedule");
  }
  if (input.offerKind === "SALE" && input.policy.sourceType === "LEASE_RENT_SCHEDULE") {
    throw new Error("SALE cannot use a lease rent schedule");
  }
  for (const component of input.components) {
    const expectedCustomerObligation = component.payerType === "CUSTOMER";
    if (component.isCustomerObligation !== expectedCustomerObligation) {
      throw new Error(`pricing component ${component.code} payer and customer-obligation flags conflict`);
    }
  }
}

function normalizeComponent(component: PricingComponentInput) {
  return {
    code: component.code,
    label: component.label.normalize("NFC"),
    amount: money(component.amount).toFixed(2),
    rate: component.rate == null ? null : rate(component.rate).toFixed(6),
    payerType: component.payerType,
    taxBasis: component.taxBasis ?? null,
    isCustomerObligation: component.isCustomerObligation,
  };
}

export function buildPricingSnapshot(input: PricingSnapshotInput) {
  assertComponentShape(input);
  const components = input.components.map(normalizeComponent);
  const customerTotal = components
    .filter((component) => component.payerType === "CUSTOMER")
    .reduce((total, component) => total.plus(component.amount), new Decimal(0))
    .toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);

  if (input.manualAdjustment) {
    if (!input.manualAdjustment.reason.trim()) throw new Error("manual adjustment reason required");
    if (!input.manualAdjustment.independentlyApproved) {
      throw new Error("manual adjustment requires independent approval");
    }
  }

  const snapshot = {
    offerKind: input.offerKind,
    currency: "SAR" as const,
    taxBasis: input.taxBasis,
    sourceType: input.policy.sourceType,
    sourceRecordId: input.policy.sourceRecordId,
    sourceVersion: input.policy.sourceVersion,
    policyVersionId: input.policy.id,
    resolutionTrace: input.policy.resolutionTrace,
    components,
    customerTotal: customerTotal.toFixed(2),
    manualAdjustment: input.manualAdjustment
      ? {
          amount:
            input.manualAdjustment.amount == null
              ? null
              : money(input.manualAdjustment.amount).toFixed(2),
          rate:
            input.manualAdjustment.rate == null
              ? null
              : rate(input.manualAdjustment.rate).toFixed(6),
          reason: input.manualAdjustment.reason.normalize("NFC"),
          initiatorUserId: input.manualAdjustment.initiatorUserId,
        }
      : null,
  };

  return { ...snapshot, pricingHash: hashCanonicalDomain("pricing", snapshot) };
}

export function isPolicyEffective(policy: PricingSnapshotInput["policy"], now: Date): boolean {
  return policy.effectiveFrom <= now && (!policy.effectiveTo || now < policy.effectiveTo);
}
