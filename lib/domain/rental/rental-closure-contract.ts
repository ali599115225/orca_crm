export const RENTAL_LEASE_STATUS = {
  ACTIVE: "active",
  RENEWAL_PENDING: "renewal_pending",
  RENEWED: "renewed",
  TERMINATED: "terminated",
  CLOSED: "closed",
} as const;

export const RENTAL_AUDIT_ACTION = {
  EJAR_RECONCILED: "RENTAL_EJAR_RECONCILED",
  EJAR_NOT_APPLICABLE: "RENTAL_EJAR_RECONCILIATION_NOT_APPLICABLE",
  DEPOSIT_SETTLED: "RENTAL_DEPOSIT_SETTLED",
  DEPOSIT_CARRIED_FORWARD: "RENTAL_DEPOSIT_CARRIED_FORWARD",
  HANDOVER_LINKED: "RENTAL_LEASE_HANDOVER_LINKED",
  TERMINATED: "RENTAL_LEASE_TERMINATED",
  RENEWED: "RENTAL_LEASE_RENEWED",
  FINANCIALLY_CLOSED: "RENTAL_LEASE_FINANCIALLY_CLOSED",
  CLOSED: "RENTAL_LEASE_CLOSED",
} as const;

export type RentalTerminalReason = "EXPIRED" | "TERMINATED" | "RENEWED";
export type RentalFinancialMode =
  | "DIRECT_MONTHLY_EJAR"
  | "EXTERNAL_RNPL_12"
  | "LEGACY";

export type RentalDepositDisposition =
  | "ZERO"
  | "REFUNDED"
  | "DEDUCTED"
  | "SPLIT"
  | "CARRIED_FORWARD";

export type RentalClosureBlockerCode =
  | "RENTAL_CLOSURE_DIRECT_SCHEDULE_INCOMPLETE"
  | "RENTAL_CLOSURE_NO_INVOICES"
  | "RENTAL_CLOSURE_OUTSTANDING_BALANCE"
  | "RENTAL_CLOSURE_OVERPAYMENT_CONFLICT"
  | "RENTAL_CLOSURE_PAYMENT_IN_PROGRESS"
  | "RENTAL_CLOSURE_EJAR_RECONCILIATION_REQUIRED"
  | "RENTAL_CLOSURE_EXTERNAL_SETTLEMENT_REQUIRED"
  | "RENTAL_CLOSURE_DEPOSIT_SETTLEMENT_REQUIRED"
  | "RENTAL_CLOSURE_HANDOVER_REQUIRED"
  | "RENTAL_CLOSURE_TERMINAL_STATE_REQUIRED";

export interface RentalClosureFacts {
  financialMode: RentalFinancialMode;
  invoiceCount: number;
  directInvoiceCoverageSatisfied: boolean;
  invoiceTotalMinor: number;
  paidMinor: number;
  outstandingMinor: number;
  pendingPaymentCount: number;
  ejarReconciliationRequired: boolean;
  ejarReconciliationSatisfied: boolean;
  externalSettlementSatisfied: boolean;
  depositAmountMinor: number;
  depositSettled: boolean;
  handoverLinked: boolean;
  terminalReason: RentalTerminalReason | null;
}

export interface RentalClosureBlocker {
  code: RentalClosureBlockerCode;
  detail?: string;
}

export interface RentalClosureGateResult {
  pass: boolean;
  blockers: RentalClosureBlocker[];
  facts: RentalClosureFacts;
}

export function moneyToMinor(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("RENTAL_MONEY_INVALID");
  }
  return Math.round((value + Number.EPSILON) * 100);
}

export function minorToMoney(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error("RENTAL_MINOR_MONEY_INVALID");
  }
  return value / 100;
}

export function normalizeDepositSettlement(input: {
  depositAmount: number;
  refundAmount: number;
  deductionAmount: number;
}): {
  depositAmountMinor: number;
  refundAmountMinor: number;
  deductionAmountMinor: number;
  disposition: RentalDepositDisposition;
} {
  const depositAmountMinor = moneyToMinor(input.depositAmount);
  const refundAmountMinor = moneyToMinor(input.refundAmount);
  const deductionAmountMinor = moneyToMinor(input.deductionAmount);

  if (
    depositAmountMinor < 0 ||
    refundAmountMinor < 0 ||
    deductionAmountMinor < 0
  ) {
    throw new Error("RENTAL_DEPOSIT_NEGATIVE_AMOUNT");
  }

  if (refundAmountMinor + deductionAmountMinor !== depositAmountMinor) {
    throw new Error("RENTAL_DEPOSIT_SETTLEMENT_MUST_EQUAL_HELD_AMOUNT");
  }

  let disposition: RentalDepositDisposition;
  if (depositAmountMinor === 0) disposition = "ZERO";
  else if (refundAmountMinor === depositAmountMinor) disposition = "REFUNDED";
  else if (deductionAmountMinor === depositAmountMinor) disposition = "DEDUCTED";
  else disposition = "SPLIT";

  return {
    depositAmountMinor,
    refundAmountMinor,
    deductionAmountMinor,
    disposition,
  };
}

export function evaluateRentalClosureGate(
  facts: RentalClosureFacts,
): RentalClosureGateResult {
  const blockers: RentalClosureBlocker[] = [];

  if (
    facts.financialMode === "DIRECT_MONTHLY_EJAR" &&
    !facts.directInvoiceCoverageSatisfied
  ) {
    blockers.push({
      code: "RENTAL_CLOSURE_DIRECT_SCHEDULE_INCOMPLETE",
      detail: "DIRECT_MONTHLY_EJAR requires the complete 12-invoice activation.",
    });
  }

  if (
    facts.financialMode !== "EXTERNAL_RNPL_12" &&
    facts.invoiceCount === 0
  ) {
    blockers.push({
      code: "RENTAL_CLOSURE_NO_INVOICES",
      detail: "A receivable rental lease cannot close without invoices.",
    });
  }

  if (facts.outstandingMinor > 0) {
    blockers.push({
      code: "RENTAL_CLOSURE_OUTSTANDING_BALANCE",
      detail: `Outstanding minor units: ${facts.outstandingMinor}`,
    });
  } else if (facts.outstandingMinor < 0) {
    blockers.push({
      code: "RENTAL_CLOSURE_OVERPAYMENT_CONFLICT",
      detail: `Overpayment minor units: ${Math.abs(facts.outstandingMinor)}`,
    });
  }

  if (facts.pendingPaymentCount > 0) {
    blockers.push({
      code: "RENTAL_CLOSURE_PAYMENT_IN_PROGRESS",
      detail: `Open payment transactions: ${facts.pendingPaymentCount}`,
    });
  }

  if (
    facts.ejarReconciliationRequired &&
    !facts.ejarReconciliationSatisfied
  ) {
    blockers.push({
      code: "RENTAL_CLOSURE_EJAR_RECONCILIATION_REQUIRED",
    });
  }

  if (
    facts.financialMode === "EXTERNAL_RNPL_12" &&
    !facts.externalSettlementSatisfied
  ) {
    blockers.push({
      code: "RENTAL_CLOSURE_EXTERNAL_SETTLEMENT_REQUIRED",
    });
  }

  if (facts.depositAmountMinor > 0 && !facts.depositSettled) {
    blockers.push({
      code: "RENTAL_CLOSURE_DEPOSIT_SETTLEMENT_REQUIRED",
    });
  }

  if (facts.terminalReason !== "RENEWED" && !facts.handoverLinked) {
    blockers.push({
      code: "RENTAL_CLOSURE_HANDOVER_REQUIRED",
    });
  }

  if (!facts.terminalReason) {
    blockers.push({
      code: "RENTAL_CLOSURE_TERMINAL_STATE_REQUIRED",
    });
  }

  return {
    pass: blockers.length === 0,
    blockers,
    facts,
  };
}
