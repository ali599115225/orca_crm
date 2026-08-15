import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { notFoundResponse } from "@/lib/api-auth-guard";
import {
  beginW1gRequest,
  optionalW1gNonNegativeDecimalInput,
  requiredW1gString,
  W1gRequestError,
} from "./api-boundary";
import type { FinanceInternalStatus } from "./finance-case-service";

const W1H_FINANCE_STATUSES = new Set<FinanceInternalStatus>([
  "DRAFT",
  "ASSESSMENT",
  "READY_FOR_SUBMISSION",
  "AWAITING_PROVIDER",
  "OFFERS_RECEIVED",
  "OFFER_SELECTED",
  "PROVIDER_APPROVED",
  "READY_FOR_TRANSACTION",
  "COMPLETED",
  "CANCELLED",
]);

export function isW1hFinanceCommandsEnabled(): boolean {
  return process.env.ORCA_FINANCE_CASE_COMMANDS_ENABLED === "true";
}

export async function beginW1hFinanceCommandRequest(
  request: NextRequest,
): Promise<Awaited<ReturnType<typeof beginW1gRequest>> | NextResponse> {
  if (!isW1hFinanceCommandsEnabled()) {
    return notFoundResponse(request);
  }

  return await beginW1gRequest(request);
}

export function requiredW1hFinanceStatus(
  body: Record<string, unknown>,
  key = "nextStatus",
): FinanceInternalStatus {
  const value = requiredW1gString(body, key).toUpperCase();
  if (!W1H_FINANCE_STATUSES.has(value as FinanceInternalStatus)) {
    throw new W1gRequestError("W1G_INVALID_INPUT");
  }
  return value as FinanceInternalStatus;
}

export function requiredW1hPositiveDecimalInput(
  body: Record<string, unknown>,
  key: string,
): string | number {
  const value = optionalW1gNonNegativeDecimalInput(body, key);
  if (value === undefined || value === null || Number(value) <= 0) {
    throw new W1gRequestError("W1G_INVALID_INPUT");
  }
  return value;
}

export function optionalW1hIsoDate(
  body: Record<string, unknown>,
  key: string,
): Date | null | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string" || !value.trim()) {
    throw new W1gRequestError("W1G_INVALID_INPUT");
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new W1gRequestError("W1G_INVALID_INPUT");
  }
  return parsed;
}
