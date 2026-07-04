import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  countFailedAttempts: vi.fn(),
  createFailedAttempt: vi.fn(),
  deleteFailedAttempts: vi.fn(),
  compare: vi.fn(),
  rateLimit: vi.fn(),
  writeAuditLog: vi.fn(),
  encrypt: vi.fn(),
  findActiveTenant: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  rawPrisma: {
    user: {
      findUnique: mocks.findUser,
    },
    failedLoginAttempt: {
      count: mocks.countFailedAttempts,
      create: mocks.createFailedAttempt,
      deleteMany: mocks.deleteFailedAttempts,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.compare,
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock("@/lib/session", () => ({
  DEFAULT_SESSION_MAX_AGE_SECONDS: 60 * 60 * 12,
  encrypt: mocks.encrypt,
}));

vi.mock("@/lib/system-prisma-boundary", () => ({
  authBootstrapFindTenantActive: mocks.findActiveTenant,
}));

function activeUser() {
  return {
    id: "user-api",
    tenantId: "tenant-api",
    name: "API User",
    email: "api@example.com",
    role: "ADMIN",
    isActive: true,
    passwordHash: "hashed-password",
  };
}

async function callLoginApi() {
  vi.resetModules();

  const { POST } = await import("@/app/api/v1/auth/login/route");

  return POST(
    new NextRequest("http://localhost/api/v1/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({
        email: "api@example.com",
        password: "correct-password",
      }),
    }),
  );
}

describe("LOGIN-F01: supported Login API security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv(
      "JWT_SECRET",
      "login-api-security-test-secret-with-sufficient-length",
    );

    mocks.findUser.mockResolvedValue(activeUser());
    mocks.countFailedAttempts.mockResolvedValue(0);
    mocks.deleteFailedAttempts.mockResolvedValue({ count: 0 });
    mocks.compare.mockResolvedValue(true);
    mocks.rateLimit.mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetIn: 60_000,
    });
    mocks.writeAuditLog.mockResolvedValue(undefined);
    mocks.encrypt.mockResolvedValue("supported-api-token");
    mocks.findActiveTenant.mockResolvedValue({ id: "tenant-api" });
  });

  it("issues the supported Bearer token with the canonical 12-hour duration", async () => {
    const response = await callLoginApi();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      token: "supported-api-token",
      expires_in: "12 hours",
      user: {
        id: "user-api",
        tenantId: "tenant-api",
      },
    });

    expect(mocks.findActiveTenant).toHaveBeenCalledWith("tenant-api");
    expect(mocks.encrypt).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-api",
        tenantId: "tenant-api",
        company_id: "tenant-api",
      }),
      60 * 60 * 12,
    );
  });

  it("does not issue a token when the tenant is inactive", async () => {
    mocks.findActiveTenant.mockResolvedValue(null);

    const response = await callLoginApi();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe(
      "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    );
    expect(mocks.encrypt).not.toHaveBeenCalled();
    expect(mocks.deleteFailedAttempts).not.toHaveBeenCalled();
  });

  it("does not reveal that an inactive account exists", async () => {
    mocks.findUser.mockResolvedValue({
      ...activeUser(),
      isActive: false,
    });

    const response = await callLoginApi();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe(
      "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    );
    expect(mocks.findActiveTenant).not.toHaveBeenCalled();
    expect(mocks.encrypt).not.toHaveBeenCalled();
  });
});
