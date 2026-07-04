import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decodeJwt, jwtVerify } from "jose";
import {
  DEFAULT_SESSION_MAX_AGE_SECONDS,
  encrypt,
} from "@/lib/session";

const TEST_SECRET =
  "login-session-expiration-test-secret-with-sufficient-length";

function secretKey() {
  return new TextEncoder().encode(TEST_SECRET);
}

async function verifyLifetime(
  token: string,
  expectedLifetimeSeconds: number,
) {
  const payload = decodeJwt(token);

  expect(payload.iat).toBeTypeOf("number");
  expect(payload.exp).toBeTypeOf("number");
  expect(payload.exp! - payload.iat!).toBe(expectedLifetimeSeconds);

  await expect(
    jwtVerify(token, secretKey(), {
      currentDate: new Date((payload.exp! - 1) * 1000),
    }),
  ).resolves.toBeDefined();

  await expect(
    jwtVerify(token, secretKey(), {
      currentDate: new Date((payload.exp! + 1) * 1000),
    }),
  ).rejects.toThrow();
}

describe("LOGIN-F01: real JWT expiration", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", TEST_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses 12 hours when no explicit duration is supplied", async () => {
    const token = await encrypt({
      userId: "user-default",
      tenantId: "tenant-default",
    });

    await verifyLifetime(token, DEFAULT_SESSION_MAX_AGE_SECONDS);
    expect(DEFAULT_SESSION_MAX_AGE_SECONDS).toBe(60 * 60 * 12);
  });

  it("uses 30 days for a remember-me session", async () => {
    const thirtyDays = 60 * 60 * 24 * 30;

    const token = await encrypt(
      {
        userId: "user-remembered",
        tenantId: "tenant-remembered",
      },
      thirtyDays,
    );

    await verifyLifetime(token, thirtyDays);
  });
});
