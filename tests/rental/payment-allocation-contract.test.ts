import { describe, expect, it } from "vitest";
import {
  PaymentAllocationError,
  parseOptionalPaymentAmount,
  resolvePaymentAllocationMinor,
} from "../../lib/payments/payment-allocation-contract";

describe("payment allocation contract", () => {
  it("preserves legacy behavior when amount is omitted", () => {
    expect(
      resolvePaymentAllocationMinor({
        requestedAmount: null,
        remainingMinor: 25_000,
      }),
    ).toBe(25_000);
  });

  it("accepts a true partial amount and never exceeds remaining balance", () => {
    expect(
      resolvePaymentAllocationMinor({
        requestedAmount: 100,
        remainingMinor: 25_000,
      }),
    ).toBe(10_000);

    expect(() =>
      resolvePaymentAllocationMinor({
        requestedAmount: 251,
        remainingMinor: 25_000,
      }),
    ).toThrow("PAYMENT_EXCEEDS_REMAINING_BALANCE");
  });

  it("preserves the original amount on an idempotent failed retry", () => {
    expect(
      resolvePaymentAllocationMinor({
        requestedAmount: 100,
        retryAmount: 100,
        remainingMinor: 25_000,
      }),
    ).toBe(10_000);

    expect(() =>
      resolvePaymentAllocationMinor({
        requestedAmount: 101,
        retryAmount: 100,
        remainingMinor: 25_000,
      }),
    ).toThrow("PAYMENT_IDEMPOTENCY_AMOUNT_MISMATCH");
  });

  it("normalizes optional user input to two-decimal money", () => {
    expect(parseOptionalPaymentAmount(undefined)).toBeNull();
    expect(parseOptionalPaymentAmount("100.25")).toBe(100.25);
    expect(() => parseOptionalPaymentAmount(0)).toThrow(PaymentAllocationError);
  });
});
