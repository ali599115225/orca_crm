import { beforeEach, describe, expect, it } from "vitest";
import {
  checkRateLimit,
  clearRateLimit,
  rateLimit,
} from "../lib/rate-limit";

describe("login rate-limit regression", () => {
  const key = "test:login:failure-only";

  beforeEach(async () => {
    await clearRateLimit(key, false);
  });

  it("does not increment when checking the current lock", async () => {
    const firstCheck = await checkRateLimit(key, 5, 60_000, false);
    const secondCheck = await checkRateLimit(key, 5, 60_000, false);
    const firstFailure = await rateLimit(key, 5, 60_000, false);

    expect(firstCheck.allowed).toBe(true);
    expect(secondCheck.allowed).toBe(true);
    expect(firstFailure.remaining).toBe(4);
  });

  it("locks exactly on the fifth failed attempt", async () => {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const result = await rateLimit(key, 5, 60_000, false);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5 - attempt);
    }

    const fifthFailure = await rateLimit(key, 5, 60_000, false);
    expect(fifthFailure.allowed).toBe(true);
    expect(fifthFailure.remaining).toBe(0);

    const lock = await checkRateLimit(key, 5, 60_000, false);
    expect(lock.allowed).toBe(false);
    expect(lock.resetIn).toBeGreaterThan(0);
  });

  it("clears previous failures after a successful login", async () => {
    await rateLimit(key, 5, 60_000, false);
    await rateLimit(key, 5, 60_000, false);

    await clearRateLimit(key, false);

    const state = await checkRateLimit(key, 5, 60_000, false);
    expect(state.allowed).toBe(true);
    expect(state.remaining).toBe(5);
  });
});
