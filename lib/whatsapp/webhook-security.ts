import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const META_SIGNATURE_PATTERN = /^sha256=([a-f0-9]{64})$/i;
const TEXT_COMPARE_KEY = "orca-whatsapp-webhook-text-compare";

export function constantTimeEqual(left: string, right: string): boolean {
  const leftDigest = createHmac("sha256", TEXT_COMPARE_KEY).update(left).digest();
  const rightDigest = createHmac("sha256", TEXT_COMPARE_KEY).update(right).digest();

  return timingSafeEqual(leftDigest, rightDigest) && left.length === right.length;
}

export function computeMetaSignature(rawBody: string, appSecret: string): string {
  return `sha256=${createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`;
}

export function hasValidMetaSignatureFormat(signature: string | null): signature is string {
  return typeof signature === "string" && META_SIGNATURE_PATTERN.test(signature);
}

export function verifyMetaSignature(rawBody: string, signature: string | null, appSecret: string): boolean {
  if (!appSecret || !hasValidMetaSignatureFormat(signature)) {
    return false;
  }

  const expected = computeMetaSignature(rawBody, appSecret);
  return constantTimeEqual(signature.toLowerCase(), expected);
}
