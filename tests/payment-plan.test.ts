import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildPaymentSchedule,
  parsePaymentSchedule,
} from "@/lib/domain/transaction-spine/payment-plan";

describe("Phase 1 payment plans", () => {
  it("creates a single-payment plan with exact total", () => {
    const schedule = buildPaymentSchedule({
      totalAmount: 115_000,
      template: "SINGLE_PAYMENT",
      firstDueDate: "2026-07-01",
    });

    expect(schedule).toHaveLength(1);
    expect(schedule[0]).toMatchObject({
      installmentNumber: 1,
      amountSar: 115_000,
    });
  });

  it("creates deposit and balance without rounding loss", () => {
    const schedule = buildPaymentSchedule({
      totalAmount: 1_150_000,
      template: "DEPOSIT_AND_BALANCE",
      depositPercent: 10,
      firstDueDate: "2026-07-01",
      intervalDays: 30,
    });

    expect(schedule).toHaveLength(2);
    expect(schedule.reduce((sum, item) => sum + item.amountSar, 0)).toBe(1_150_000);
    expect(schedule[0].amountSar).toBe(115_000);
    expect(schedule[1].amountSar).toBe(1_035_000);
  });

  it("splits monthly installments while preserving the exact total", () => {
    const schedule = buildPaymentSchedule({
      totalAmount: 100,
      template: "MONTHLY",
      installmentCount: 3,
      firstDueDate: "2026-07-01",
    });

    expect(schedule.map((item) => item.amountSar)).toEqual([33.34, 33.33, 33.33]);
    expect(schedule.reduce((sum, item) => sum + item.amountSar, 0)).toBeCloseTo(100, 2);
  });

  it("rejects a custom plan whose total differs from the invoice total", () => {
    expect(() =>
      buildPaymentSchedule({
        totalAmount: 100,
        template: "CUSTOM",
        customInstallments: [
          { amountSar: 40, dueDate: "2026-07-01" },
          { amountSar: 40, dueDate: "2026-08-01" },
        ],
      }),
    ).toThrow("must equal");
  });

  it("parses persisted schedule dates safely", () => {
    const parsed = parsePaymentSchedule([
      { amountSar: 50, dueDate: "2026-07-01T00:00:00.000Z" },
      { amountSar: 50, dueDate: "2026-08-01T00:00:00.000Z" },
    ]);

    expect(parsed).toHaveLength(2);
    expect(parsed[1].installmentNumber).toBe(2);
    expect(parsed[1].dueDate).toBeInstanceOf(Date);
  });
});
