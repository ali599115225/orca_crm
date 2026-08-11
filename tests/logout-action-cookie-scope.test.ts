import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieDelete: vi.fn(),
  cookieSet: vi.fn(),
  headerGet: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: mocks.cookieSet,
    delete: mocks.cookieDelete,
  })),
  headers: vi.fn(async () => ({
    get: mocks.headerGet,
  })),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock("@/lib/session", () => ({
  encrypt: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  clearRateLimit: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/system-prisma-boundary", () => ({
  authBootstrapFindUserByEmail: vi.fn(),
  tenantResolutionFindFirstActive: vi.fn(),
}));

vi.mock("@/lib/platform-identity", () => ({
  getConfiguredPrivilegedRole: vi.fn(),
}));

vi.mock("@/lib/errors", () => ({
  ErrorCode: { INTERNAL_ERROR: "INTERNAL_ERROR" },
  publicError: vi.fn(),
}));

import { logoutAction } from "@/app/actions/auth";

function useHost(host: string, forwardedHost: string | null = null) {
  mocks.headerGet.mockImplementation((name: string) => {
    if (name === "x-forwarded-host") return forwardedHost;
    if (name === "host") return host;
    return null;
  });
}

describe("logoutAction cookie scope regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes only host-scoped cookies on localhost", async () => {
    useHost("localhost:3001");

    await expect(logoutAction()).resolves.toEqual({ success: true });

    expect(mocks.cookieDelete).toHaveBeenCalledTimes(2);
    expect(mocks.cookieDelete).toHaveBeenNthCalledWith(1, {
      name: "session_token",
      path: "/",
    });
    expect(mocks.cookieDelete).toHaveBeenNthCalledWith(2, {
      name: "device_tenant_subdomain",
      path: "/",
    });
    expect(mocks.cookieDelete).not.toHaveBeenCalledWith(
      expect.objectContaining({ domain: "orca.az-ez.pro" }),
    );
  });

  it("also expires shared-domain cookies on the ORCA domain", async () => {
    useHost("orca.az-ez.pro");

    await expect(logoutAction()).resolves.toEqual({ success: true });

    expect(mocks.cookieDelete).toHaveBeenCalledTimes(4);
    expect(mocks.cookieDelete).toHaveBeenCalledWith({
      name: "session_token",
      domain: "orca.az-ez.pro",
      path: "/",
    });
    expect(mocks.cookieDelete).toHaveBeenCalledWith({
      name: "device_tenant_subdomain",
      domain: "orca.az-ez.pro",
      path: "/",
    });
  });

  it("uses x-forwarded-host when present", async () => {
    useHost("localhost:3001", "tenant.orca.az-ez.pro:443");

    await expect(logoutAction()).resolves.toEqual({ success: true });

    expect(mocks.cookieDelete).toHaveBeenCalledWith({
      name: "session_token",
      domain: "orca.az-ez.pro",
      path: "/",
    });
    expect(mocks.cookieDelete).toHaveBeenCalledWith({
      name: "device_tenant_subdomain",
      domain: "orca.az-ez.pro",
      path: "/",
    });
  });
});
