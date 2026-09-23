export type PaymentAllocationErrorCode =
  | "PAYMENT_AMOUNT_INVALID"
  | "PAYMENT_NO_REMAINING_BALANCE"
  | "PAYMENT_EXCEEDS_REMAINING_BALANCE"
  | "PAYMENT_IDEMPOTENCY_AMOUNT_MISMATCH";

export class PaymentAllocationError extends Error {
  constructor(public readonly code: PaymentAllocationErrorCode) {
    super(code);
    this.name = "PaymentAllocationError";
  }
}

export function moneyToMinorUnits(value: number): number {
  if (!Number.isFinite(value)) {
    throw new PaymentAllocationError("PAYMENT_AMOUNT_INVALID");
  }
  return Math.round((value + Number.EPSILON) * 100);
}

export function parseOptionalPaymentAmount(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" && typeof value !== "string") {
    throw new PaymentAllocationError("PAYMENT_AMOUNT_INVALID");
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1_000_000_000) {
    throw new PaymentAllocationError("PAYMENT_AMOUNT_INVALID");
  }
  return moneyToMinorUnits(parsed) / 100;
}

export function paymentAmountsEqual(left: number, right: number): boolean {
  return moneyToMinorUnits(left) === moneyToMinorUnits(right);
}

export function resolvePaymentAllocationMinor(input: {
  requestedAmount: number | null;
  retryAmount?: number | null;
  remainingMinor: number;
}): number {
  if (!Number.isSafeInteger(input.remainingMinor) || input.remainingMinor <= 0) {
    throw new PaymentAllocationError("PAYMENT_NO_REMAINING_BALANCE");
  }

  if (
    input.retryAmount !== undefined &&
    input.retryAmount !== null &&
    input.requestedAmount !== null &&
    !paymentAmountsEqual(input.retryAmount, input.requestedAmount)
  ) {
    throw new PaymentAllocationError("PAYMENT_IDEMPOTENCY_AMOUNT_MISMATCH");
  }

  const candidateMinor =
    input.retryAmount !== undefined && input.retryAmount !== null
      ? moneyToMinorUnits(input.retryAmount)
      : input.requestedAmount === null
        ? input.remainingMinor
        : moneyToMinorUnits(input.requestedAmount);

  if (candidateMinor <= 0) {
    throw new PaymentAllocationError("PAYMENT_AMOUNT_INVALID");
  }
  if (candidateMinor > input.remainingMinor) {
    throw new PaymentAllocationError("PAYMENT_EXCEEDS_REMAINING_BALANCE");
  }

  return candidateMinor;
}
