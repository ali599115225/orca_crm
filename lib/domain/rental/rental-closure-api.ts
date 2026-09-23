import { NextResponse, type NextRequest } from "next/server";
import { RentalClosureError } from "./rental-closure-service";

export async function readRentalClosureJson(
  request: NextRequest,
): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new RentalClosureError("RENTAL_INVALID_JSON", 400);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RentalClosureError("RENTAL_INVALID_REQUEST", 400);
  }
  const body = value as Record<string, unknown>;
  for (const forbidden of ["tenantId", "actorId", "userId", "role"]) {
    if (forbidden in body) {
      throw new RentalClosureError("RENTAL_FORBIDDEN_IDENTITY_INPUT", 400);
    }
  }
  return body;
}

export function requiredRentalString(
  body: Record<string, unknown>,
  key: string,
): string {
  const value = body[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new RentalClosureError("RENTAL_INVALID_REQUEST", 400);
  }
  return value.trim();
}

export function optionalRentalString(
  body: Record<string, unknown>,
  key: string,
): string | null {
  const value = body[key];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !value.trim()) {
    throw new RentalClosureError("RENTAL_INVALID_REQUEST", 400);
  }
  return value.trim();
}

export function requiredRentalNumber(
  body: Record<string, unknown>,
  key: string,
): number {
  const value = body[key];
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    !String(value).trim()
  ) {
    throw new RentalClosureError("RENTAL_INVALID_REQUEST", 400);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new RentalClosureError("RENTAL_INVALID_REQUEST", 400);
  }
  return parsed;
}

export function optionalRentalNumber(
  body: Record<string, unknown>,
  key: string,
): number | null {
  const value = body[key];
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new RentalClosureError("RENTAL_INVALID_REQUEST", 400);
  }
  return parsed;
}

export function requiredRentalBoolean(
  body: Record<string, unknown>,
  key: string,
): boolean {
  const value = body[key];
  if (typeof value !== "boolean") {
    throw new RentalClosureError("RENTAL_INVALID_REQUEST", 400);
  }
  return value;
}

export function optionalRentalObject(
  body: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  const value = body[key];
  if (value === undefined || value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RentalClosureError("RENTAL_INVALID_REQUEST", 400);
  }
  return value as Record<string, unknown>;
}

export function rentalClosureApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof RentalClosureError) {
    return NextResponse.json(
      { success: false, error: error.code },
      {
        status: error.status,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  console.error("[rental-closure] unexpected error", error);
  return NextResponse.json(
    { success: false, error: "INTERNAL_ERROR" },
    {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
