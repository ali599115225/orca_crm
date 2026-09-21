import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

export const EXEC007_CANONICALIZATION_VERSION = "EXEC007-CANON-1" as const;
export type CanonicalDomain = "content" | "pricing" | "terms" | "evidence" | "idempotency";

function normalize(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Prisma.Decimal) return value.toFixed();
  if (typeof value === "string") return value.normalize("NFC");
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite numbers are not canonical");
    return value;
  }
  if (typeof value === "bigint") return value.toString(10);
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key.normalize("NFC"), normalize(item)]),
    );
  }
  if (typeof value === "boolean") return value;
  throw new TypeError(`unsupported canonical value: ${typeof value}`);
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function canonicalDomainPayload(domain: CanonicalDomain, value: unknown): string {
  return `${EXEC007_CANONICALIZATION_VERSION}\n${domain}\n${canonicalJson(value)}`;
}

export function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashCanonicalDomain(domain: CanonicalDomain, value: unknown): string {
  return sha256Hex(canonicalDomainPayload(domain, value));
}

export function isLowerHex64(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}
