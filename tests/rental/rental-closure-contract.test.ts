import { describe, expect, it } from "vitest";
import {
  evaluateRentalClosureGate,
  normalizeDepositSettlement,
} from "../../lib/domain/rental/rental-closure-contract";

function passingFacts() {
  return {
    financialMode: "DIRECT_MONTHLY_EJAR" as const,
    invoiceCount: 12,
    directInvoiceCoverageSatisfied: true,
    invoiceTotalMinor: 120_000_00,
    paidMinor: 120_000_00,
    outstandingMinor: 0,
    pendingPaymentCount: 0,
    ejarReconciliationRequired: true,
    ejarReconciliationSatisfied: true,
    externalSettlementSatisfied: true,
    depositAmountMinor: 5_000_00,
    depositSettled: true,
    handoverLinked: true,
    terminalReason: "EXPIRED" as const,
  };
}

describe("rental closure contract", () => {
  it("passes only when the direct monthly lifecycle is fully reconciled", () => {
    const result = evaluateRentalClosureGate(passingFacts());
    expect(result.pass).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("fails closed on every unresolved lifecycle obligation", () => {
    const result = evaluateRentalClosureGate({
      ...passingFacts(),
      directInvoiceCoverageSatisfied: false,
      outstandingMinor: 100,
      pendingPaymentCount: 1,
      ejarReconciliationSatisfied: false,
      depositSettled: false,
      handoverLinked: false,
      terminalReason: null,
    });

    expect(result.pass).toBe(false);
    expect(result.blockers.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "RENTAL_CLOSURE_DIRECT_SCHEDULE_INCOMPLETE",
        "RENTAL_CLOSURE_OUTSTANDING_BALANCE",
        "RENTAL_CLOSURE_PAYMENT_IN_PROGRESS",
        "RENTAL_CLOSURE_EJAR_RECONCILIATION_REQUIRED",
        "RENTAL_CLOSURE_DEPOSIT_SETTLEMENT_REQUIRED",
        "RENTAL_CLOSURE_HANDOVER_REQUIRED",
        "RENTAL_CLOSURE_TERMINAL_STATE_REQUIRED",
      ]),
    );
  });

  it("requires provider settlement instead of invoices for external RNPL", () => {
    const result = evaluateRentalClosureGate({
      ...passingFacts(),
      financialMode: "EXTERNAL_RNPL_12",
      invoiceCount: 0,
      invoiceTotalMinor: 0,
      paidMinor: 0,
      ejarReconciliationRequired: false,
      ejarReconciliationSatisfied: true,
      externalSettlementSatisfied: false,
      terminalReason: "RENEWED",
      handoverLinked: false,
    });

    expect(result.pass).toBe(false);
    expect(result.blockers.map((item) => item.code)).toEqual([
      "RENTAL_CLOSURE_EXTERNAL_SETTLEMENT_REQUIRED",
    ]);
  });

  it("does not require handover when the old lease closes by renewal", () => {
    const result = evaluateRentalClosureGate({
      ...passingFacts(),
      terminalReason: "RENEWED",
      handoverLinked: false,
    });
    expect(result.pass).toBe(true);
  });

  it("blocks overpayment conflicts instead of treating them as closed", () => {
    const result = evaluateRentalClosureGate({
      ...passingFacts(),
      outstandingMinor: -1,
    });
    expect(result.pass).toBe(false);
    expect(result.blockers[0]?.code).toBe(
      "RENTAL_CLOSURE_OVERPAYMENT_CONFLICT",
    );
  });

  it("settles a deposit only when refund plus deduction equals held amount", () => {
    expect(
      normalizeDepositSettlement({
        depositAmount: 5_000,
        refundAmount: 4_000,
        deductionAmount: 1_000,
      }),
    ).toMatchObject({
      depositAmountMinor: 500_000,
      refundAmountMinor: 400_000,
      deductionAmountMinor: 100_000,
      disposition: "SPLIT",
    });

    expect(() =>
      normalizeDepositSettlement({
        depositAmount: 5_000,
        refundAmount: 4_000,
        deductionAmount: 999,
      }),
    ).toThrow("RENTAL_DEPOSIT_SETTLEMENT_MUST_EQUAL_HELD_AMOUNT");
  });
});
