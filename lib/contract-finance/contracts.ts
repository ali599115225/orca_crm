import type {
  EnabledBranchService,
  OrganizationResourceScope,
  OrganizationScopeAssignment,
} from "@/lib/organization/contracts";

export const CONTRACT_VERSION_STATES = [
  "DRAFT",
  "ISSUED",
  "SIGNED",
  "ACCEPTED",
  "ACTIVATED",
  "CANCELLED",
  "SUPERSEDED",
] as const;

export type ContractVersionState = (typeof CONTRACT_VERSION_STATES)[number];

export type CurrencyCode = string;

export type Money = Readonly<{
  currency: CurrencyCode;
  minorUnits: number;
}>;

export type ContractFinanceActorContext = Readonly<{
  tenantId: string;
  userId: string;
  assignments: readonly OrganizationScopeAssignment[];
  enabledBranchServices?: readonly EnabledBranchService[];
  now?: Date;
}>;

export type ScopedResource = OrganizationResourceScope &
  Readonly<{
    tenantId: string;
    resourceType: string;
    resourceId: string;
  }>;

export type ContractTemplateVersion = Readonly<{
  id: string;
  tenantId: string;
  templateKey: string;
  version: number;
  contentHash: string;
  contentSnapshot: string;
  issuedAt: Date | null;
}>;

export type ContractVersion = Readonly<{
  id: string;
  tenantId: string;
  contractId: string;
  version: number;
  previousVersionId: string | null;
  templateVersionId: string;
  templateContentHash: string;
  contentHash: string;
  contentSnapshot: string;
  state: ContractVersionState;
  scope: ScopedResource;
  issuedAt: Date | null;
  signedAt: Date | null;
  acceptedAt: Date | null;
  activatedAt: Date | null;
}>;

export type SignatoryAuthorityEvidence = Readonly<{
  actorUserId: string;
  assignmentId: string;
  tenantId: string;
  resourceType: string;
  resourceId: string;
  capturedAt: Date;
}>;

export type IdempotencyResult<T> = Readonly<{
  value: T;
  replayed: boolean;
}>;

export type IdempotencyRecord = Readonly<{
  tenantId: string;
  operation: string;
  keyHash: string;
  payloadHash: string;
  resultRef: string;
}>;

export type FinancialObligation = Readonly<{
  id: string;
  tenantId: string;
  sourceType: string;
  sourceId: string;
  amount: Money;
  correctedMinorUnits: number;
  allocatedMinorUnits: number;
  finalized: boolean;
  scope: ScopedResource;
}>;

export type FinancialCorrection = Readonly<{
  id: string;
  tenantId: string;
  obligationId: string;
  amount: Money;
  reason: string;
  actorUserId: string;
  createdAt: Date;
}>;

export type PaymentEvidence = Readonly<{
  id: string;
  tenantId: string;
  provider: string;
  providerReference: string;
  amount: Money;
  scope: ScopedResource;
  verified: boolean;
  verifiedAt: Date | null;
  payloadHash: string;
}>;

export type PaymentRecord = Readonly<{
  id: string;
  tenantId: string;
  evidenceId: string;
  amount: Money;
  scope: ScopedResource;
  completedAt: Date;
}>;

export type PaymentAllocation = Readonly<{
  id: string;
  tenantId: string;
  paymentId: string;
  obligationId: string;
  amount: Money;
  createdAt: Date;
}>;

export const REFUND_STATES = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "EXECUTED",
  "CANCELLED",
] as const;

export type RefundState = (typeof REFUND_STATES)[number];

export type RefundRequest = Readonly<{
  id: string;
  tenantId: string;
  paymentId: string;
  amount: Money;
  reason: string;
  initiatedByUserId: string;
  approvedByUserId: string | null;
  state: RefundState;
  scope: ScopedResource;
}>;

export type IssueContractVersionCommand = Readonly<{
  actor: ContractFinanceActorContext;
  contractId: string;
  templateVersionId: string;
  contentSnapshot: string;
  scope: ScopedResource;
  idempotencyKey: string;
}>;

export type SignContractVersionCommand = Readonly<{
  actor: ContractFinanceActorContext;
  contractVersionId: string;
  scope: ScopedResource;
  idempotencyKey: string;
}>;

export type ActivateContractVersionCommand = Readonly<{
  actor: ContractFinanceActorContext;
  contractVersionId: string;
  scope: ScopedResource;
  idempotencyKey: string;
}>;

export type RecordVerifiedPaymentCommand = Readonly<{
  actor: ContractFinanceActorContext;
  evidenceId: string;
  obligationId: string;
  amount: Money;
  scope: ScopedResource;
  idempotencyKey: string;
}>;

export type InitiateRefundCommand = Readonly<{
  actor: ContractFinanceActorContext;
  paymentId: string;
  amount: Money;
  reason: string;
  scope: ScopedResource;
  idempotencyKey: string;
}>;

export type ApproveRefundCommand = Readonly<{
  actor: ContractFinanceActorContext;
  refundId: string;
  scope: ScopedResource;
  idempotencyKey: string;
}>;

export function decimalToMinorUnits(
  value: string | number | { toString(): string },
): number {
  const raw = String(value).trim();
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new Error("Money value must have at most two decimal places.");
  }

  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [whole, fraction = ""] = unsigned.split(".");
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  const signed = negative ? -minor : minor;
  if (
    signed > BigInt(Number.MAX_SAFE_INTEGER) ||
    signed < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new Error("Money minor units exceed the safe integer range.");
  }
  return Number(signed);
}

export function assertMoney(value: Money): Money {
  const currency = value.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Currency must be an explicit three-letter code.");
  }
  if (!Number.isSafeInteger(value.minorUnits)) {
    throw new Error("Money minor units must be a safe integer.");
  }
  return { currency, minorUnits: value.minorUnits };
}

export function assertPositiveMoney(value: Money): Money {
  const normalized = assertMoney(value);
  if (normalized.minorUnits <= 0) {
    throw new Error("Money amount must be positive.");
  }
  return normalized;
}

export function assertSameCurrency(left: Money, right: Money): void {
  if (assertMoney(left).currency !== assertMoney(right).currency) {
    throw new Error("Currency mismatch.");
  }
}
