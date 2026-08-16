import { createHash } from "crypto";
import type { TenantContext } from "@/lib/tenant-context";
import type { RentFlex12Installment, RentFlex12Mode } from "./rent-flex-12";

export type RentFlexSelectionStatus = "DRAFT" | "SELECTED" | "LOCKED" | "CANCELLED";
export type RentFlexSettlementStatus =
  | "EXPECTED"
  | "PARTIAL"
  | "RECEIVED"
  | "FAILED"
  | "CANCELLED";

export class RentFlexP1Error extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "RentFlexP1Error";
  }
}

export function assertRentFlexCommandContext(
  context: TenantContext,
  tenantId: string,
  actorId: string,
): void {
  if (!tenantId || !actorId) {
    throw new RentFlexP1Error("RENT_FLEX_P1_IDENTITY_REQUIRED");
  }
  if (context.tenantId !== tenantId) {
    throw new RentFlexP1Error("RENT_FLEX_P1_TENANT_CONTEXT_MISMATCH");
  }
  if (context.userId && context.userId !== actorId) {
    throw new RentFlexP1Error("RENT_FLEX_P1_ACTOR_CONTEXT_MISMATCH");
  }
}

export function isRentFlexSelectionTransitionAllowed(
  from: RentFlexSelectionStatus,
  to: RentFlexSelectionStatus,
): boolean {
  if (from === to) return true;
  if (from === "DRAFT") return to === "SELECTED" || to === "CANCELLED";
  if (from === "SELECTED") return to === "LOCKED" || to === "CANCELLED";
  return false;
}

export function isRentFlexSettlementTransitionAllowed(
  from: RentFlexSettlementStatus,
  to: RentFlexSettlementStatus,
): boolean {
  if (from === to) return true;
  if (from === "EXPECTED") {
    return ["PARTIAL", "RECEIVED", "FAILED", "CANCELLED"].includes(to);
  }
  if (from === "PARTIAL") {
    return ["PARTIAL", "RECEIVED", "FAILED", "CANCELLED"].includes(to);
  }
  return false;
}

export function normalizeRentFlexMoney(
  value: number,
  code: string,
  allowZero = false,
): number {
  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0) || value > 1_000_000_000) {
    throw new RentFlexP1Error(code);
  }
  return Math.round(value * 100) / 100;
}

export function parseRentFlexDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RentFlexP1Error("RENT_FLEX_P1_DATE_INVALID");

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RentFlexP1Error("RENT_FLEX_P1_DATE_INVALID");
  }
  return date;
}

export function dateOnlyString(value: Date): string {
  if (Number.isNaN(value.getTime())) {
    throw new RentFlexP1Error("RENT_FLEX_P1_DATE_INVALID");
  }
  return value.toISOString().slice(0, 10);
}

export function parseRentFlexScheduleJson(value: unknown): RentFlex12Installment[] {
  if (!Array.isArray(value) || value.length !== 12) {
    throw new RentFlexP1Error("RENT_FLEX_P1_SCHEDULE_SHAPE_INVALID");
  }

  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new RentFlexP1Error("RENT_FLEX_P1_SCHEDULE_SHAPE_INVALID");
    }
    const item = raw as Record<string, unknown>;
    const installmentNumber = item.installmentNumber;
    const dueDate = item.dueDate;
    const amountSar = item.amountSar;
    if (
      installmentNumber !== index + 1 ||
      typeof dueDate !== "string" ||
      typeof amountSar !== "number"
    ) {
      throw new RentFlexP1Error("RENT_FLEX_P1_SCHEDULE_SHAPE_INVALID");
    }
    parseRentFlexDateOnly(dueDate);
    return {
      installmentNumber,
      dueDate,
      amountSar: normalizeRentFlexMoney(
        amountSar,
        "RENT_FLEX_P1_INSTALLMENT_AMOUNT_INVALID",
      ),
    };
  });
}

export function digestRentFlexSchedule(
  mode: RentFlex12Mode,
  annualRentSar: number,
  firstDueDate: string,
  schedule: RentFlex12Installment[],
): string {
  const canonical = {
    mode,
    annualRentSar: normalizeRentFlexMoney(
      annualRentSar,
      "RENT_FLEX_P1_ANNUAL_RENT_INVALID",
    ),
    firstDueDate,
    schedule: schedule.map((item) => ({
      installmentNumber: item.installmentNumber,
      dueDate: item.dueDate,
      amountSar: normalizeRentFlexMoney(
        item.amountSar,
        "RENT_FLEX_P1_INSTALLMENT_AMOUNT_INVALID",
      ),
    })),
  };

  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function assertRentFlexSettlementAmounts(input: {
  expectedAmount: number;
  receivedAmount?: number | null;
  status: RentFlexSettlementStatus;
}): { expectedAmount: number; receivedAmount: number | null } {
  const expectedAmount = normalizeRentFlexMoney(
    input.expectedAmount,
    "RENT_FLEX_P1_SETTLEMENT_EXPECTED_INVALID",
  );
  const receivedAmount =
    input.receivedAmount === null || input.receivedAmount === undefined
      ? null
      : normalizeRentFlexMoney(
          input.receivedAmount,
          "RENT_FLEX_P1_SETTLEMENT_RECEIVED_INVALID",
          true,
        );

  if (receivedAmount !== null && receivedAmount > expectedAmount) {
    throw new RentFlexP1Error("RENT_FLEX_P1_SETTLEMENT_EXCEEDS_EXPECTED");
  }

  if (input.status === "EXPECTED" && receivedAmount !== null && receivedAmount !== 0) {
    throw new RentFlexP1Error("RENT_FLEX_P1_EXPECTED_SETTLEMENT_MUST_BE_UNPAID");
  }
  if (
    input.status === "PARTIAL" &&
    (receivedAmount === null || receivedAmount <= 0 || receivedAmount >= expectedAmount)
  ) {
    throw new RentFlexP1Error("RENT_FLEX_P1_PARTIAL_SETTLEMENT_INVALID");
  }
  if (input.status === "RECEIVED" && receivedAmount !== expectedAmount) {
    throw new RentFlexP1Error("RENT_FLEX_P1_RECEIVED_SETTLEMENT_MUST_EQUAL_EXPECTED");
  }

  return { expectedAmount, receivedAmount };
}
