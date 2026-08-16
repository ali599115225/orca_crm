import "server-only";

import type { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import {
  notFoundResponse,
  requireAuth,
  unauthorizedResponse,
  type SessionPayload,
} from "@/lib/api-auth-guard";
import { W1eAuthorizationError } from "@/lib/auth/w1e-contract-finance-permissions";
import { RentFlexP1Error } from "./rent-flex-12-persistence-contract";

const RF12_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RF12_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const RF12_MONEY_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const RF12_EVIDENCE_JSON_MAX_BYTES = 64 * 1024;
const RF12_EVIDENCE_JSON_MAX_DEPTH = 8;
const RF12_FORBIDDEN_BODY_KEYS = [
  "tenantId",
  "actorId",
  "userId",
  "createdBy",
  "updatedBy",
  "role",
] as const;

export class RentFlexP2RequestError extends Error {
  constructor(
    public readonly code:
      | "RENT_FLEX_P2_INVALID_JSON"
      | "RENT_FLEX_P2_INVALID_INPUT"
      | "RENT_FLEX_P2_FORBIDDEN_IDENTITY_INPUT",
  ) {
    super(code);
    this.name = "RentFlexP2RequestError";
  }
}

export function isRentFlex12ReadApiEnabled(): boolean {
  return (
    process.env.ORCA_RENT_FLEX_12_ENABLED === "true" &&
    process.env.ORCA_RENT_FLEX_12_SCHEMA_READY === "true"
  );
}

export function isRentFlex12WriteApiEnabled(): boolean {
  return (
    isRentFlex12ReadApiEnabled() &&
    process.env.ORCA_RENT_FLEX_12_WRITES_ENABLED === "true"
  );
}

export function isRentFlex12LeaseBindingApiEnabled(): boolean {
  return (
    isRentFlex12WriteApiEnabled() &&
    process.env.ORCA_RENT_FLEX_12_ACCOUNTING_GUARD_READY === "true"
  );
}

async function beginRentFlex12Request(
  request: NextRequest,
  access: "read" | "write" | "lease-binding",
): Promise<{ session: SessionPayload } | NextResponse> {
  const enabled =
    access === "read"
      ? isRentFlex12ReadApiEnabled()
      : access === "lease-binding"
        ? isRentFlex12LeaseBindingApiEnabled()
        : isRentFlex12WriteApiEnabled();
  if (!enabled) {
    return notFoundResponse(request);
  }

  const session = await requireAuth(request);
  if (!session) {
    return unauthorizedResponse(request);
  }

  return { session };
}

export async function beginRentFlex12ReadRequest(request: NextRequest) {
  return await beginRentFlex12Request(request, "read");
}

export async function beginRentFlex12WriteRequest(request: NextRequest) {
  return await beginRentFlex12Request(request, "write");
}

export async function beginRentFlex12LeaseBindingRequest(request: NextRequest) {
  return await beginRentFlex12Request(request, "lease-binding");
}

export async function readRentFlex12JsonObject(
  request: NextRequest,
): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_JSON");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }

  const body = value as Record<string, unknown>;
  assertNoRentFlexIdentityFields(body);
  return body;
}

export function assertNoRentFlexIdentityFields(
  body: Record<string, unknown>,
): void {
  if (RF12_FORBIDDEN_BODY_KEYS.some((key) => key in body)) {
    throw new RentFlexP2RequestError(
      "RENT_FLEX_P2_FORBIDDEN_IDENTITY_INPUT",
    );
  }
}

export function requiredRentFlexString(
  body: Record<string, unknown>,
  key: string,
): string {
  const value = body[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  return value.trim();
}

export function optionalRentFlexUuid(
  body: Record<string, unknown>,
  key: string,
): string | null | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  return requiredRentFlexUuidValue(value);
}

export function requiredRentFlexUuid(
  body: Record<string, unknown>,
  key: string,
): string {
  return requiredRentFlexUuidValue(requiredRentFlexString(body, key));
}

export function requiredRentFlexUuidValue(value: string): string {
  const normalized = value.trim();
  if (!RF12_UUID_PATTERN.test(normalized)) {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  return normalized;
}

export function requiredRentFlexBoolean(
  body: Record<string, unknown>,
  key: string,
): boolean {
  const value = body[key];
  if (typeof value !== "boolean") {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  return value;
}

export function optionalRentFlexEnum<T extends string>(
  body: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  return value as T;
}

export function requiredRentFlexEnum<T extends string>(
  body: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
): T {
  const value = requiredRentFlexString(body, key);
  if (!allowed.includes(value as T)) {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  return value as T;
}

function numericMoney(
  value: unknown,
  allowZero: boolean,
): string | number {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value > 1_000_000_000) {
      throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
    }
    const normalized = String(value);
    if (
      !RF12_MONEY_PATTERN.test(normalized) ||
      (allowZero ? value < 0 : value <= 0)
    ) {
      throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
    }
    return normalized;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!RF12_MONEY_PATTERN.test(normalized)) {
      throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
    }
    const parsed = Number(normalized);
    if (
      !Number.isFinite(parsed) ||
      (allowZero ? parsed < 0 : parsed <= 0) ||
      parsed > 1_000_000_000
    ) {
      throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
    }
    return normalized;
  }

  throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
}

export function requiredRentFlexPositiveMoney(
  body: Record<string, unknown>,
  key: string,
): string | number {
  return numericMoney(body[key], false);
}

export function optionalRentFlexNonNegativeMoney(
  body: Record<string, unknown>,
  key: string,
): string | number | null | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (value === null) return null;
  return numericMoney(value, true);
}

export function requiredRentFlexDateOnly(
  body: Record<string, unknown>,
  key: string,
): string {
  const value = requiredRentFlexString(body, key);
  const match = RF12_DATE_PATTERN.exec(value);
  if (!match) {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  return value;
}

export function optionalRentFlexNonEmptyString(
  body: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  return value.trim();
}

function assertRentFlexJsonValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): void {
  if (depth > RF12_EVIDENCE_JSON_MAX_DEPTH) {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
    }
    return;
  }
  if (typeof value !== "object") {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  if (seen.has(value)) {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      assertRentFlexJsonValue(item, depth + 1, seen);
    }
    seen.delete(value);
    return;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  for (const [key, item] of Object.entries(value)) {
    if (!key || item === undefined) {
      throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
    }
    assertRentFlexJsonValue(item, depth + 1, seen);
  }
  seen.delete(value);
}

export function optionalRentFlexJsonOrNull(
  body: Record<string, unknown>,
  key: string,
): Prisma.InputJsonValue | null | undefined {
  if (!(key in body) || body[key] === undefined) return undefined;
  const value = body[key];
  if (value === null) return null;

  assertRentFlexJsonValue(value, 0, new WeakSet<object>());
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  if (
    !serialized ||
    new TextEncoder().encode(serialized).byteLength > RF12_EVIDENCE_JSON_MAX_BYTES
  ) {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  return value as Prisma.InputJsonValue;
}

export function optionalRentFlexListLimit(request: NextRequest): number | undefined {
  const raw = request.nextUrl.searchParams.get("limit");
  if (raw === null || raw === "") return undefined;
  if (!/^\d+$/.test(raw)) {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0 || value > 100) {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  return value;
}

export function optionalRentFlexQueryUuid(
  request: NextRequest,
  key: string,
): string | undefined {
  const raw = request.nextUrl.searchParams.get(key);
  if (raw === null || raw === "") return undefined;
  return requiredRentFlexUuidValue(raw);
}

export function optionalRentFlexQueryEnum<T extends string>(
  request: NextRequest,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const raw = request.nextUrl.searchParams.get(key);
  if (raw === null || raw === "") return undefined;
  if (!allowed.includes(raw as T)) {
    throw new RentFlexP2RequestError("RENT_FLEX_P2_INVALID_INPUT");
  }
  return raw as T;
}

function publicRentFlexStatus(code: string): 400 | 404 | 409 {
  if (code.includes("NOT_FOUND")) return 404;
  if (
    code.includes("CONFLICT") ||
    code.includes("MISMATCH") ||
    code.includes("ALREADY") ||
    code.includes("IMMUTABLE") ||
    code.includes("EXPIRED") ||
    code.includes("TRANSITION") ||
    code.includes("STATE_INVALID") ||
    code.includes("REQUIRES") ||
    code.includes("REQUIRED") ||
    code.includes("NOT_ENABLED") ||
    code.includes("BOUND_TO")
  ) {
    return 409;
  }
  return 400;
}

export function rentFlex12ApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof RentFlexP2RequestError) {
    return NextResponse.json(
      { error: "INVALID_REQUEST" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof W1eAuthorizationError) {
    const status = error.code === "W1E_UNAUTHORIZED" ? 401 : 403;
    return NextResponse.json(
      { error: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN" },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const code =
    error instanceof RentFlexP1Error
      ? error.code
      : error &&
          typeof error === "object" &&
          "code" in error &&
          typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : null;

  if (code === "P2002" || code === "P2034") {
    return NextResponse.json(
      { error: "CONFLICT" },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (code?.startsWith("RENT_FLEX_") || code?.startsWith("W1")) {
    const status = publicRentFlexStatus(code);
    return NextResponse.json(
      {
        error:
          status === 404
            ? "NOT_FOUND"
            : status === 409
              ? "CONFLICT"
              : "INVALID_REQUEST",
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }

  console.error("[RF12_P2_API_ERROR]", error);
  return NextResponse.json(
    { error: "INTERNAL_ERROR" },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
