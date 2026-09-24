import { describe, expect, it } from "vitest";
import { buildRestructureAmounts } from "@/lib/domain/transaction-spine";

describe("Payment plan restructure", () => {
  it("reduces installment amount while keeping the remaining count", () => {
    expect(
      buildRestructureAmounts({
        remainingBalance: 600,
        mode: "REDUCE_INSTALLMENT",
        currentAmounts: [300, 300, 300],
      }),
    ).toEqual([200, 200, 200]);
  });

  it("reduces the term while preserving a target-like installment amount", () => {
    expect(
      buildRestructureAmounts({
        remainingBalance: 250,
        mode: "REDUCE_TERM",
        currentAmounts: [100, 100, 100, 100],
      }),
    ).toEqual([100, 100, 50]);
  });

  it("supports an explicit remaining installment count", () => {
    expect(
      buildRestructureAmounts({
        remainingBalance: 500,
        mode: "REDUCE_TERM",
        currentAmounts: [200, 200, 200, 200],
        desiredInstallmentCount: 2,
      }),
    ).toEqual([250, 250]);
  });

  it("rejects increasing the remaining installment count", () => {
    expect(() =>
      buildRestructureAmounts({
        remainingBalance: 500,
        mode: "REDUCE_TERM",
        currentAmounts: [250, 250],
        desiredInstallmentCount: 3,
      }),
    ).toThrow("cannot exceed");
  });
});
