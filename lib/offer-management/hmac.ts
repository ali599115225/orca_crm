import { createHmac, timingSafeEqual } from "node:crypto";

export interface HmacKey {
  version: string;
  secret: Buffer;
}

export interface HmacKeyResolver {
  current(): Promise<HmacKey>;
  byVersion(version: string): Promise<HmacKey | null>;
}

export function signHmacSha256(payload: string | Buffer, key: HmacKey): string {
  if (!key.version.trim() || key.secret.length < 32) {
    throw new Error("EXEC-007 HMAC key version and at least 256-bit secret are required");
  }
  return createHmac("sha256", key.secret).update(payload).digest("hex");
}

export function verifyHmacSha256(payload: string | Buffer, expectedHex: string, key: HmacKey): boolean {
  if (!/^[0-9a-f]{64}$/.test(expectedHex)) return false;
  const actual = Buffer.from(signHmacSha256(payload, key), "hex");
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function verifyHistoricalHmac(
  payload: string | Buffer,
  expectedHex: string,
  keyVersion: string,
  resolver: HmacKeyResolver,
): Promise<boolean> {
  const key = await resolver.byVersion(keyVersion);
  return key ? verifyHmacSha256(payload, expectedHex, key) : false;
}
