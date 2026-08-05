import type { Prisma } from "@prisma/client";
import type { OfferKind, ServiceLine } from "./contracts";

export type TaxBasis = "INCLUSIVE" | "EXCLUSIVE";
export type PayerType = "CUSTOMER" | "OWNER" | "BROKER" | "OTHER_NON_CUSTOMER";
export type PricingSourceType =
  | "SALE_PROJECT_PRICE_BOOK"
  | "SALE_UNIT_PRICE_BOOK"
  | "LEASE_RENT_SCHEDULE";
export type PricingScopeType = "UNIT" | "PROJECT" | "BRANCH" | "TENANT";

export interface PricingComponentInput {
  code: string;
  label: string;
  amount: Prisma.Decimal.Value;
  rate?: Prisma.Decimal.Value | null;
  payerType: PayerType;
  taxBasis?: TaxBasis | null;
  isCustomerObligation: boolean;
}

export interface PricingPolicyContract {
  id: string;
  tenantId: string;
  sourceType: PricingSourceType;
  sourceRecordId: string;
  sourceVersion: string;
  scopeType: PricingScopeType;
  scopeId: string;
  offerKind: OfferKind;
  floorAmount?: Prisma.Decimal.Value | null;
  maxDiscountRate?: Prisma.Decimal.Value | null;
  standardValidityDays: number;
  normalMaxValidityDays: 30;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}

export interface PricingPolicyResolutionContext {
  tenantId: string;
  offerKind: OfferKind;
  serviceLine: ServiceLine;
  unitId: string;
  projectId: string;
  branchId: string;
  trustedAt: Date;
}

export interface PricingResolutionLevelTrace {
  scopeType: PricingScopeType;
  scopeId: string;
  eligiblePolicyIds: readonly string[];
}

export interface PricingResolutionTrace {
  selectedScopeType: PricingScopeType;
  selectedScopeId: string;
  selectedPolicyId: string;
  evaluatedLevels: readonly PricingResolutionLevelTrace[];
}

export interface ResolvedPricingPolicy extends PricingPolicyContract {
  resolutionTrace: PricingResolutionTrace;
}

export interface PricingSnapshotInput {
  offerKind: OfferKind;
  policy: ResolvedPricingPolicy;
  taxBasis: TaxBasis;
  components: readonly PricingComponentInput[];
  manualAdjustment?: {
    amount?: Prisma.Decimal.Value | null;
    rate?: Prisma.Decimal.Value | null;
    reason: string;
    initiatorUserId: string;
    independentlyApproved: boolean;
  } | null;
}
