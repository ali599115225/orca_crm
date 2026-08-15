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

export class W1gRequestError extends Error {
  constructor(
    public readonly code: "W1G_INVALID_JSON" | "W1G_INVALID_INPUT",
  ) {
    super(code);
    this.name = "W1gRequestError";
  }
}

export function isW1gContractFinanceApiEnabled(): boolean {
  return (
    process.env.ORCA_CONTRACT_FINANCE_API_ENABLED === "true" &&
    process.env.ORCA_CONTRACT_FINANCE_SCHEMA_READY === "true"
  );
}

export async function beginW1gRequest(
  request: NextRequest,
): Promise<{ session: SessionPayload } | NextResponse> {
  if (!isW1gContractFinanceApiEnabled()) {
    return notFoundResponse(request);
  }

  const session = await requireAuth(request);
  if (!session) {
    return unauthorizedResponse(request);
  }

  return { session };
}

export async function readW1gJsonObject(
  request: NextRequest,
): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new W1gRequestError("W1G_INVALID_JSON");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new W1gRequestError("W1G_INVALID_INPUT");
  }

  return value as Record<string, unknown>;
}

export function requiredW1gString(
  body: Record<string, unknown>,
  key: string,
): string {
  const value = body[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new W1gRequestError("W1G_INVALID_INPUT");
  }
  return value.trim();
}

export function optionalW1gString(
  body: Record<string, unknown>,
  key: string,
): string | null | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new W1gRequestError("W1G_INVALID_INPUT");
  }
  const trimmed = value.trim();
  return trimmed || null;
}

export function optionalW1gDecimalInput(
  body: Record<string, unknown>,
  key: string,
): string | number | null | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new W1gRequestError("W1G_INVALID_INPUT");
    }
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || !/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      throw new W1gRequestError("W1G_INVALID_INPUT");
    }
    return trimmed;
  }

  throw new W1gRequestError("W1G_INVALID_INPUT");
}

export function optionalW1gInteger(
  body: Record<string, unknown>,
  key: string,
): number | null | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new W1gRequestError("W1G_INVALID_INPUT");
  }
  return value;
}

export function requiredW1gJson(
  body: Record<string, unknown>,
  key: string,
): Prisma.InputJsonValue {
  const value = body[key];
  if (!(key in body) || value === undefined || value === null) {
    throw new W1gRequestError("W1G_INVALID_INPUT");
  }
  return value as Prisma.InputJsonValue;
}

export function optionalW1gJson(
  body: Record<string, unknown>,
  key: string,
): Prisma.InputJsonValue | undefined {
  if (!(key in body) || body[key] === undefined) return undefined;
  const value = body[key];
  if (value === null) {
    throw new W1gRequestError("W1G_INVALID_INPUT");
  }
  return value as Prisma.InputJsonValue;
}

export function optionalW1gListLimit(request: NextRequest): number | undefined {
  const raw = request.nextUrl.searchParams.get("limit");
  if (raw === null || raw === "") return undefined;
  if (!/^\d+$/.test(raw)) {
    throw new W1gRequestError("W1G_INVALID_INPUT");
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new W1gRequestError("W1G_INVALID_INPUT");
  }
  return value;
}

function publicDomainStatus(code: string): 400 | 404 | 409 {
  if (code.includes("NOT_FOUND")) return 404;
  if (
    code.includes("CONFLICT") ||
    code.includes("MISMATCH") ||
    code.includes("ALREADY") ||
    code.includes("EXPIRED")
  ) {
    return 409;
  }
  return 400;
}

export function w1gApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof W1gRequestError) {
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
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : null;

  if (code?.startsWith("W1")) {
    const status = publicDomainStatus(code);
    return NextResponse.json(
      { error: status === 404 ? "NOT_FOUND" : status === 409 ? "CONFLICT" : "INVALID_REQUEST" },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }

  console.error("[W1G_API_ERROR]", error);
  return NextResponse.json(
    { error: "INTERNAL_ERROR" },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}