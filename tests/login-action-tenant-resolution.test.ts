import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authBootstrapFindUserByEmail: vi.fn(),
  tenantResolutionFindFirstActive: vi.fn(),
  compare: vi.fn(),
  encrypt: vi.fn(),
  checkRateLimit: vi.fn(),
  clearRateLimit: vi.fn(),
  rateLimit: vi.fn(),
  cookieSet: vi.fn(),
  headerGet: vi.fn(),
}));

vi.mock("@/lib/system-prisma-boundary", () => ({
  authBootstrapFindUserByEmail: mocks.authBootstrapFindUserByEmail,
  tenantResolutionFindFirstActive: mocks.tenantResolutionFindFirstActive,
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.compare,
  },
}));

vi.mock("@/lib/session", () => ({
  encrypt: mocks.encrypt,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  clearRateLimit: mocks.clearRateLimit,
  rateLimit: mocks.rateLimit,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: mocks.cookieSet,
  })),
  headers: vi.fn(async () => ({
    get: mocks.headerGet,
  })),
}));

import { loginAction } from "@/app/actions/auth";

function credentials() {
  const formData = new FormData();
  formData.set("email", "user@example.com");
  formData.set("password", "correct-password");
  return formData;
}

function activeTenant(id = "tenant-active") {
  return {
    id,
    isActive: true,
    subdomain: "active",
  };
}

function activeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-active",
    email: "user@example.com",
    name: "User",
    role: "ADMIN",
    isActive: true,
    passwordHash: "hashed-password",
    tenant: activeTenant(),
    ...overrides,
  };
}

describe("loginAction tenant resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();

    mocks.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 5 });
    mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 4, resetIn: 60_000 });
    mocks.clearRateLimit.mockResolvedValue(undefined);
    mocks.compare.mockResolvedValue(true);
    mocks.encrypt.mockResolvedValue("test-session-token");
    mocks.headerGet.mockImplementation((name: string) => {
      if (name === "host") return "orca.az-ez.pro";
      if (name === "x-forwarded-proto") return "https";
      return null;
    });
  });

  it("allows a normal user with an active tenant", async () => {
    mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());

    const result = await loginAction(credentials());

    expect(result.success).toBe(true);
    expect(mocks.tenantResolutionFindFirstActive).not.toHaveBeenCalled();
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      "session_token",
      "test-session-token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      }),
    );
  });

  it("rejects a normal user without tenant and does not fallback", async () => {
    mocks.authBootstrapFindUserByEmail.mockResolvedValue(
      activeUser({ tenant: null }),
    );

    const result = await loginAction(credentials());

    expect(result.success).toBe(false);
    expect(mocks.tenantResolutionFindFirstActive).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it("rejects a normal user with an inactive tenant and does not fallback", async () => {
    mocks.authBootstrapFindUserByEmail.mockResolvedValue(
      activeUser({ tenant: { ...activeTenant(), isActive: false } }),
    );

    const result = await loginAction(credentials());

    expect(result.success).toBe(false);
    expect(mocks.tenantResolutionFindFirstActive).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it("allows a Platform Architect with an active tenant", async () => {
    vi.stubEnv("PLATFORM_ARCHITECT_EMAILS", "user@example.com");
    mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());

    const result = await loginAction(credentials());

    expect(result.success).toBe(true);
    expect(mocks.tenantResolutionFindFirstActive).not.toHaveBeenCalled();
    expect(mocks.encrypt).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "PLATFORM_ARCHITECT",
        tenantId: "tenant-active",
      }),
    );
  });

  it("allows a Platform Architect without linked tenant through privileged fallback", async () => {
    vi.stubEnv("PLATFORM_ARCHITECT_EMAILS", "user@example.com");
    mocks.authBootstrapFindUserByEmail.mockResolvedValue(
      activeUser({ tenant: null }),
    );
    mocks.tenantResolutionFindFirstActive.mockResolvedValue(
      activeTenant("tenant-fallback"),
    );

    const result = await loginAction(credentials());

    expect(result.success).toBe(true);
    expect(mocks.tenantResolutionFindFirstActive).toHaveBeenCalledOnce();
    expect(mocks.encrypt).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "PLATFORM_ARCHITECT",
        tenantId: "tenant-fallback",
      }),
    );
  });

  it("does not create a cookie when privileged fallback has no active tenant", async () => {
    vi.stubEnv("PLATFORM_ARCHITECT_EMAILS", "user@example.com");
    mocks.authBootstrapFindUserByEmail.mockResolvedValue(
      activeUser({ tenant: null }),
    );
    mocks.tenantResolutionFindFirstActive.mockResolvedValue(null);

    const result = await loginAction(credentials());

    expect(result.success).toBe(false);
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it("rejects an invalid password before tenant fallback", async () => {
    vi.stubEnv("PLATFORM_ARCHITECT_EMAILS", "user@example.com");
    mocks.authBootstrapFindUserByEmail.mockResolvedValue(
      activeUser({ tenant: null }),
    );
    mocks.compare.mockResolvedValue(false);

    const result = await loginAction(credentials());

    expect(result.success).toBe(false);
    expect(mocks.tenantResolutionFindFirstActive).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });
});
