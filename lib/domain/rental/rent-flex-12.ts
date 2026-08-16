export const RENT_FLEX_12_INSTALLMENTS = 12 as const;

export type RentFlex12Mode = "DIRECT_MONTHLY_EJAR" | "EXTERNAL_RNPL_12";

export type RentFlex12Installment = {
  installmentNumber: number;
  dueDate: string;
  amountSar: number;
};

export type DirectMonthlyEjarPlan = {
  mode: "DIRECT_MONTHLY_EJAR";
  annualRentSar: number;
  installmentCount: typeof RENT_FLEX_12_INSTALLMENTS;
  companyReceivable: true;
  externalProviderRepayment: false;
  schedule: RentFlex12Installment[];
};

export type ExternalRnpl12Quote = {
  mode: "EXTERNAL_RNPL_12";
  providerName: string;
  annualRentSar: number;
  ownerSettlementExpectedSar: number;
  totalTenantPayableSar: number;
  tenantCostDeltaSar: number;
  downPaymentSar: number;
  financedBalanceSar: number;
  installmentCount: typeof RENT_FLEX_12_INSTALLMENTS;
  monthlyAverageSar: number;
  companyReceivable: false;
  externalProviderRepayment: true;
  externalRepaymentSchedule: RentFlex12Installment[];
};

export class RentFlex12Error extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "RentFlex12Error";
  }
}

function toHalalas(value: number, code: string, allowZero = false): number {
  if (!Number.isFinite(value)) throw new RentFlex12Error(code);
  if (allowZero ? value < 0 : value <= 0) throw new RentFlex12Error(code);
  if (value > 1_000_000_000) throw new RentFlex12Error(code);
  return Math.round(value * 100);
}

function fromHalalas(value: number): number {
  return value / 100;
}

function parseIsoDate(value: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RentFlex12Error("RENT_FLEX_12_INVALID_START_DATE");

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new RentFlex12Error("RENT_FLEX_12_INVALID_START_DATE");
  }

  return { year, month, day };
}

function addCalendarMonthsClamped(startDate: string, offsetMonths: number): string {
  const { year, month, day } = parseIsoDate(startDate);
  const absoluteMonth = year * 12 + (month - 1) + offsetMonths;
  const targetYear = Math.floor(absoluteMonth / 12);
  const targetMonth = absoluteMonth % 12;

  if (targetYear > 9999) {
    throw new RentFlex12Error("RENT_FLEX_12_DUE_DATE_OUT_OF_RANGE");
  }

  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const target = new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)));
  return target.toISOString().slice(0, 10);
}

function buildTwelvePartSchedule(totalHalalas: number, firstDueDate: string): RentFlex12Installment[] {
  parseIsoDate(firstDueDate);

  if (totalHalalas < RENT_FLEX_12_INSTALLMENTS) {
    throw new RentFlex12Error("RENT_FLEX_12_BALANCE_TOO_SMALL");
  }

  const base = Math.floor(totalHalalas / RENT_FLEX_12_INSTALLMENTS);
  const remainder = totalHalalas % RENT_FLEX_12_INSTALLMENTS;

  return Array.from({ length: RENT_FLEX_12_INSTALLMENTS }, (_, index) => ({
    installmentNumber: index + 1,
    dueDate: addCalendarMonthsClamped(firstDueDate, index),
    amountSar: fromHalalas(base + (index < remainder ? 1 : 0)),
  }));
}

export function buildDirectMonthlyEjarPlan(input: {
  annualRentSar: number;
  firstDueDate: string;
}): DirectMonthlyEjarPlan {
  const annualRentHalalas = toHalalas(
    input.annualRentSar,
    "RENT_FLEX_12_INVALID_ANNUAL_RENT",
  );

  return {
    mode: "DIRECT_MONTHLY_EJAR",
    annualRentSar: fromHalalas(annualRentHalalas),
    installmentCount: RENT_FLEX_12_INSTALLMENTS,
    companyReceivable: true,
    externalProviderRepayment: false,
    schedule: buildTwelvePartSchedule(annualRentHalalas, input.firstDueDate),
  };
}

export function buildExternalRnpl12Quote(input: {
  providerName: string;
  annualRentSar: number;
  totalTenantPayableSar: number;
  downPaymentSar?: number;
  firstDueDate: string;
}): ExternalRnpl12Quote {
  const providerName = input.providerName.trim();
  if (!providerName) throw new RentFlex12Error("RENT_FLEX_12_PROVIDER_REQUIRED");

  const annualRentHalalas = toHalalas(
    input.annualRentSar,
    "RENT_FLEX_12_INVALID_ANNUAL_RENT",
  );
  const totalPayableHalalas = toHalalas(
    input.totalTenantPayableSar,
    "RENT_FLEX_12_INVALID_TOTAL_PAYABLE",
  );
  const downPaymentHalalas = toHalalas(
    input.downPaymentSar ?? 0,
    "RENT_FLEX_12_INVALID_DOWN_PAYMENT",
    true,
  );

  if (downPaymentHalalas > totalPayableHalalas) {
    throw new RentFlex12Error("RENT_FLEX_12_DOWN_PAYMENT_EXCEEDS_TOTAL");
  }

  const financedBalanceHalalas = totalPayableHalalas - downPaymentHalalas;
  const schedule = buildTwelvePartSchedule(financedBalanceHalalas, input.firstDueDate);

  return {
    mode: "EXTERNAL_RNPL_12",
    providerName,
    annualRentSar: fromHalalas(annualRentHalalas),
    ownerSettlementExpectedSar: fromHalalas(annualRentHalalas),
    totalTenantPayableSar: fromHalalas(totalPayableHalalas),
    tenantCostDeltaSar: fromHalalas(totalPayableHalalas - annualRentHalalas),
    downPaymentSar: fromHalalas(downPaymentHalalas),
    financedBalanceSar: fromHalalas(financedBalanceHalalas),
    installmentCount: RENT_FLEX_12_INSTALLMENTS,
    monthlyAverageSar: fromHalalas(
      Math.round(financedBalanceHalalas / RENT_FLEX_12_INSTALLMENTS),
    ),
    companyReceivable: false,
    externalProviderRepayment: true,
    externalRepaymentSchedule: schedule,
  };
}

export function compareExternalRnpl12Quotes(
  quotes: ExternalRnpl12Quote[],
): ExternalRnpl12Quote[] {
  return [...quotes].sort((left, right) => {
    if (left.totalTenantPayableSar !== right.totalTenantPayableSar) {
      return left.totalTenantPayableSar - right.totalTenantPayableSar;
    }
    if (left.downPaymentSar !== right.downPaymentSar) {
      return left.downPaymentSar - right.downPaymentSar;
    }
    return left.providerName.localeCompare(right.providerName, "ar");
  });
}
