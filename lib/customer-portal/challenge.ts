import { randomInt, randomBytes, timingSafeEqual } from "node:crypto";
import { sha256Hex } from "../offer-management/canonicalization";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const MAGIC_LINK_TTL_MS = 10 * 60 * 1000;

export function createOtpChallenge(now: Date) {
  const token = randomInt(0, 1_000_000).toString().padStart(6, "0");
  return { token, tokenHash: sha256Hex(token), expiresAt: new Date(now.getTime() + OTP_TTL_MS) };
}

export function createMagicLinkChallenge(now: Date) {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: sha256Hex(token), expiresAt: new Date(now.getTime() + MAGIC_LINK_TTL_MS) };
}

export function verifyChallengeToken(input: {
  presentedToken: string;
  storedTokenHash: string;
  status: "PENDING" | "CONSUMED" | "EXPIRED" | "REVOKED";
  expiresAt: Date;
  now: Date;
}): void {
  if (input.status !== "PENDING" || input.now >= input.expiresAt) throw new Error("challenge unavailable");
  const actual = Buffer.from(sha256Hex(input.presentedToken), "hex");
  const expected = Buffer.from(input.storedTokenHash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("challenge token invalid");
}
