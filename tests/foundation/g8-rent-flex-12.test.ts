import { describe, expect, it } from "vitest";
import {
  buildDirectMonthlyEjarPlan,
  buildExternalRnpl12Quote,
  compareExternalRnpl12Quotes,
  RentFlex12Error,
} from "@/lib/domain/rental/rent-flex-12";

function sumAmounts(items: Array<{ amountSar: number }>): number {
  return Math.round(items.reduce((sum, item) => sum + item.amountSar, 0) * 100) / 100;
}

describe("Rent Flex 12", () => {
  it("builds a direct Ejar monthly company-receivable schedule", () => {
    const plan = buildDirectMonthlyEjarPlan({
      annualRentSar: 120_000,
      firstDueDate: "2026-09-01",
    });

    expect(plan.mode).toBe("DIRECT_MONTHLY_EJAR");
    expect(plan.companyReceivable).toBe(true);
    expect(plan.externalProviderRepayment).toBe(false);
    expect(plan.schedule).toHaveLength(12);
    expect(plan.schedule[0]).toEqual({
      installmentNumber: 1,
      dueDate: "2026-09-01",
      amountSar: 10_000,
    });
    expect(plan.schedule[11]).toEqual({
      installmentNumber: 12,
      dueDate: "2027-08-01",
      amountSar: 10_000,
    });
    expect(sumAmounts(plan.schedule)).toBe(120_000);
  });

  it("preserves the annual total to the halala when 12 equal parts are impossible", () => {
    const plan = buildDirectMonthlyEjarPlan({
      annualRentSar: 100_000.01,
      firstDueDate: "2026-09-15",
    });

    expect(sumAmounts(plan.schedule)).toBe(100_000.01);
    expect(plan.schedule.every((item) => Number.isInteger(item.amountSar * 100))).toBe(true);
  });

  it("uses calendar-month recurrence with end-of-month clamping", () => {
    const plan = buildDirectMonthlyEjarPlan({
      annualRentSar: 12_000,
      firstDueDate: "2027-01-31",
    });

    expect(plan.schedule[1].dueDate).toBe("2027-02-28");
    expect(plan.schedule[2].dueDate).toBe("2027-03-31");
    expect(plan.schedule[3].dueDate).toBe("2027-04-30");
  });

  it("keeps an external RNPL tenant schedule outside the company receivable", () => {
    const quote = buildExternalRnpl12Quote({
      providerName: "Provider A",
      annualRentSar: 75_000,
      totalTenantPayableSar: 84_000,
      downPaymentSar: 12_000,
      firstDueDate: "2026-09-01",
    });

    expect(quote.mode).toBe("EXTERNAL_RNPL_12");
    expect(quote.ownerSettlementExpectedSar).toBe(75_000);
    expect(quote.totalTenantPayableSar).toBe(84_000);
    expect(quote.tenantCostDeltaSar).toBe(9_000);
    expect(quote.downPaymentSar).toBe(12_000);
    expect(quote.financedBalanceSar).toBe(72_000);
    expect(quote.monthlyAverageSar).toBe(6_000);
    expect(quote.companyReceivable).toBe(false);
    expect(quote.externalProviderRepayment).toBe(true);
    expect(quote.externalRepaymentSchedule).toHaveLength(12);
    expect(sumAmounts(quote.externalRepaymentSchedule)).toBe(72_000);
  });

  it("compares external offers by tenant total, then upfront amount", () => {
    const higherTotal = buildExternalRnpl12Quote({
      providerName: "Provider Higher",
      annualRentSar: 60_000,
      totalTenantPayableSar: 69_000,
      downPaymentSar: 0,
      firstDueDate: "2026-09-01",
    });
    const lowerTotalHigherUpfront = buildExternalRnpl12Quote({
      providerName: "Provider B",
      annualRentSar: 60_000,
      totalTenantPayableSar: 66_000,
      downPaymentSar: 6_000,
      firstDueDate: "2026-09-01",
    });
    const lowerTotalLowerUpfront = buildExternalRnpl12Quote({
      providerName: "Provider C",
      annualRentSar: 60_000,
      totalTenantPayableSar: 66_000,
      downPaymentSar: 3_000,
      firstDueDate: "2026-09-01",
    });

    expect(
      compareExternalRnpl12Quotes([
        higherTotal,
        lowerTotalHigherUpfront,
        lowerTotalLowerUpfront,
      ]).map((quote) => quote.providerName),
    ).toEqual(["Provider C", "Provider B", "Provider Higher"]);
  });

  it("fails closed for invalid money, date, provider, and down-payment inputs", () => {
    const cases: Array<() => unknown> = [
      () => buildDirectMonthlyEjarPlan({ annualRentSar: 0, firstDueDate: "2026-09-01" }),
      () => buildDirectMonthlyEjarPlan({ annualRentSar: 12_000, firstDueDate: "2026-02-30" }),
      () =>
        buildExternalRnpl12Quote({
          providerName: "   ",
          annualRentSar: 60_000,
          totalTenantPayableSar: 66_000,
          firstDueDate: "2026-09-01",
        }),
      () =>
        buildExternalRnpl12Quote({
          providerName: "Provider A",
          annualRentSar: 60_000,
          totalTenantPayableSar: 66_000,
          downPaymentSar: 70_000,
          firstDueDate: "2026-09-01",
        }),
    ];

    for (const run of cases) {
      expect(run).toThrow(RentFlex12Error);
    }
  });
});
