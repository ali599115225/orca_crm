import {
  buildDirectMonthlyEjarPlan,
  type RentFlex12Mode,
} from "./rent-flex-12";
import {
  digestRentFlexSchedule,
  parseRentFlexDateOnly,
  parseRentFlexScheduleJson,
} from "./rent-flex-12-persistence-contract";

const DIRECT_MODE: RentFlex12Mode = "DIRECT_MONTHLY_EJAR";
const LOCKED_STATUS = "LOCKED";

export class RentFlexP4Error extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "RentFlexP4Error";
  }
}

export type RentFlexDirectInvoiceDraft = Readonly<{
  installmentNumber: number;
  dueDate: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
}>;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toHalalas(value: number, code: string): number {
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000_000) {
    throw new RentFlexP4Error(code);
  }
  return Math.round(value * 100);
}

function normalizeVatRate(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new RentFlexP4Error("RENT_FLEX_P4_VAT_RATE_INVALID");
  }
  return round2(value);
}

export function buildRentFlexDirectInvoiceDrafts(input: {
  mode: string;
  status: string;
  annualRentAmount: number;
  firstDueDate: string;
  companyScheduleJson: unknown;
  scheduleDigest: string | null | undefined;
  vatRate: number;
}): RentFlexDirectInvoiceDraft[] {
  if (input.mode !== DIRECT_MODE) {
    throw new RentFlexP4Error("RENT_FLEX_P4_DIRECT_MODE_REQUIRED");
  }
  if (input.status !== LOCKED_STATUS) {
    throw new RentFlexP4Error("RENT_FLEX_P4_LOCKED_SELECTION_REQUIRED");
  }
  if (!input.companyScheduleJson || !input.scheduleDigest) {
    throw new RentFlexP4Error("RENT_FLEX_P4_DIRECT_SCHEDULE_REQUIRED");
  }

  parseRentFlexDateOnly(input.firstDueDate);
  const vatRate = normalizeVatRate(input.vatRate);
  const storedSchedule = parseRentFlexScheduleJson(input.companyScheduleJson);
  const annualRentHalalas = toHalalas(
    input.annualRentAmount,
    "RENT_FLEX_P4_ANNUAL_RENT_INVALID",
  );
  const storedDigest = digestRentFlexSchedule(
    DIRECT_MODE,
    input.annualRentAmount,
    input.firstDueDate,
    storedSchedule,
  );
  const expectedPlan = buildDirectMonthlyEjarPlan({
    annualRentSar: input.annualRentAmount,
    firstDueDate: input.firstDueDate,
  });
  const expectedDigest = digestRentFlexSchedule(
    DIRECT_MODE,
    expectedPlan.annualRentSar,
    input.firstDueDate,
    expectedPlan.schedule,
  );

  if (
    input.scheduleDigest !== storedDigest ||
    storedDigest !== expectedDigest
  ) {
    throw new RentFlexP4Error("RENT_FLEX_P4_SCHEDULE_DIGEST_MISMATCH");
  }

  const storedTotalHalalas = storedSchedule.reduce(
    (sum, item) =>
      sum + toHalalas(item.amountSar, "RENT_FLEX_P4_INSTALLMENT_AMOUNT_INVALID"),
    0,
  );
  if (storedTotalHalalas !== annualRentHalalas) {
    throw new RentFlexP4Error("RENT_FLEX_P4_ANNUAL_TOTAL_MISMATCH");
  }

  return storedSchedule.map((item) => {
    const subtotal = round2(item.amountSar);
    // Preserve the current rental accounting convention: vatRate is stored as
    // a percentage (for example 15.00), so subtotal * rate / 100.
    const vatAmount = round2((subtotal * vatRate) / 100);
    const totalAmount = round2(subtotal + vatAmount);
    return {
      installmentNumber: item.installmentNumber,
      dueDate: item.dueDate,
      subtotal,
      vatRate,
      vatAmount,
      totalAmount,
    };
  });
}
