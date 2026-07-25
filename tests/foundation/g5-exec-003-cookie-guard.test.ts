import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("server-only", () => ({}));

const authMocks = vi.hoisted(() => ({
  assertServerActionRole: vi.fn(),
  forbiddenResponse: vi.fn(() => new Response("forbidden", { status: 403 })),
  hasDatabaseRole: vi.fn(),
  requireAuth: vi.fn(),
  unauthorizedResponse: vi.fn(() => new Response("unauthorized", { status: 401 })),
}));

const sessionMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const tenantMocks = vi.hoisted(() => ({
  runWithTenantContext: vi.fn(
    async (
      _context: { tenantId: string; userId?: string },
      operation: () => unknown,
    ) => await operation(),
  ),
}));

vi.mock("@/lib/api-auth-guard", () => ({
  assertServerActionRole: authMocks.assertServerActionRole,
  forbiddenResponse: authMocks.forbiddenResponse,
  hasDatabaseRole: authMocks.hasDatabaseRole,
  requireAuth: authMocks.requireAuth,
  unauthorizedResponse: authMocks.unauthorizedResponse,
}));

vi.mock("@/lib/session", () => ({
  getSession: sessionMocks.getSession,
}));

vi.mock("@/lib/tenant-context", () => ({
  runWithTenantContext: tenantMocks.runWithTenantContext,
}));

import { runWithExec003CookiePermission } from "@/lib/auth/exec-003-shared-guard";

const SESSION = Object.freeze({
  userId: "cookie-user",
  tenantId: "cookie-tenant",
  role: "ADMIN",
});

function requestWithBearer(): NextRequest {
  return new NextRequest("http://localhost/api/exec-003-cookie-test", {
    headers: { authorization: "Bearer must-not-expand-cookie-channel" },
  });
}

describe("EXEC-003 v2 cookie-only shared guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMocks.getSession.mockResolvedValue(SESSION);
    authMocks.hasDatabaseRole.mockResolvedValue(true);
  });

  it("returns 401 when the legacy cookie identity is missing", async () => {
    sessionMocks.getSession.mockResolvedValue(null);

    const response = await runWithExec003CookiePermission(
      requestWithBearer(),
      ["ADMIN", "SALES_MANAGER"],
      "contracts.payment_plan.restructure",
      () => NextResponse.json({ success: true }),
    );

    expect(response.status).toBe(401);
    expect(authMocks.hasDatabaseRole).not.toHaveBeenCalled();
    expect(authMocks.requireAuth).not.toHaveBeenCalled();
  });

  it("does not accept a Bearer credential where Legacy was cookie-only", async () => {
    sessionMocks.getSession.mockResolvedValue(null);

    const response = await runWithExec003CookiePermission(
      requestWithBearer(),
      ["ADMIN"],
      "contracts.pdf.read",
      () => NextResponse.json({ success: true }),
    );

    expect(response.status).toBe(401);
    expect(sessionMocks.getSession).toHaveBeenCalledOnce();
    expect(authMocks.requireAuth).not.toHaveBeenCalled();
  });

  it("returns 403 when the current database role is denied", async () => {
    authMocks.hasDatabaseRole.mockResolvedValue(false);

    const response = await runWithExec003CookiePermission(
      requestWithBearer(),
      ["ADMIN", "SALES_MANAGER"],
      "contracts.payment_plan.restructure",
      () => NextResponse.json({ success: true }),
    );

    expect(response.status).toBe(403);
    expect(authMocks.hasDatabaseRole).toHaveBeenCalledWith(SESSION, [
      "ADMIN",
      "SALES_MANAGER",
    ]);
  });

  it("executes only after cookie identity and database permission both allow", async () => {
    const operation = vi.fn(() =>
      NextResponse.json({ success: true }, { status: 201 }),
    );

    const response = await runWithExec003CookiePermission(
      requestWithBearer(),
      ["ADMIN", "SALES_MANAGER", "MARKETING"],
      "contracts.payment_plan.restructure",
      operation,
    );

    expect(response.status).toBe(201);
    expect(authMocks.hasDatabaseRole).toHaveBeenCalledWith(SESSION, [
      "ADMIN",
      "SALES_MANAGER",
    ]);
    expect(tenantMocks.runWithTenantContext).toHaveBeenCalledWith(
      { tenantId: SESSION.tenantId, userId: SESSION.userId },
      expect.any(Function),
    );
    expect(operation).toHaveBeenCalledWith(SESSION);
  });

  it("fails closed for an unknown permission without invoking the operation", async () => {
    const operation = vi.fn(() => NextResponse.json({ success: true }));

    const response = await runWithExec003CookiePermission(
      requestWithBearer(),
      ["ADMIN"],
      "unknown.permission" as never,
      operation,
    );

    expect(response.status).toBe(403);
    expect(authMocks.hasDatabaseRole).not.toHaveBeenCalled();
    expect(operation).not.toHaveBeenCalled();
  });
});
