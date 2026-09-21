import { hashCanonicalDomain, sha256Hex } from "./canonicalization";

export interface IdempotencyRecord<T> {
  tenantId: string;
  operation: string;
  keyHash: string;
  payloadHash: string;
  result: T;
}

export function idempotencyHashes(key: string, payload: unknown) {
  if (key.length < 16) throw new Error("idempotency key too short");
  return {
    keyHash: sha256Hex(key),
    payloadHash: hashCanonicalDomain("idempotency", payload),
  };
}

export function replayOrReject<T>(
  record: IdempotencyRecord<T> | null,
  expected: { tenantId: string; operation: string; keyHash: string; payloadHash: string },
): T | null {
  if (!record) return null;
  if (
    record.tenantId !== expected.tenantId ||
    record.operation !== expected.operation ||
    record.keyHash !== expected.keyHash
  ) {
    throw new Error("idempotency record identity mismatch");
  }
  if (record.payloadHash !== expected.payloadHash) throw new Error("idempotency payload mismatch");
  return record.result;
}
