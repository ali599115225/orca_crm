import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  getSession: vi.fn(),
  setTenantContext: vi.fn(),
  findActiveById: vi.fn(),
  findActiveBySubdomain: vi.fn(),
  findFirstActive: vi.fn(),
}));

vi.mock("react", () => ({
  cache: (operation: unknown) => operation,
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers,
}));

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}));

vi.mock("@/lib/tenant-context", () => ({
  setTenantContext: mocks.setTenantContext,
}));

vi.mock("@/lib/system-prisma-boundary", () => ({
  tenantResolutionFindActiveById: mocks.findActiveById,
  tenantResolutionFindActiveBySubdomain:
    mocks.findActiveBySubdomain,
  tenantResolutionFindFirstActive: mocks.findFirstActive,
}));

import { getActiveTenant } from "@/lib/tenant";

describe("Tenant resolution bootstrap boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getSession.mockResolvedValue(null);
    mocks.headers.mockResolvedValue({
      get: vi.fn().mockReturnValue(""),
    });

    mocks.findActiveById.mockResolvedValue(null);
    mocks.findActiveBySubdomain.mockResolvedValue(null);
    mocks.findFirstActive.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves the session tenant before binding context", async () => {
    const tenant = {
      id: "tenant-a",
      isActive: true,
      companyName: "Tenant A",
    };

    mocks.getSession.mockResolvedValue({
      tenantId: "tenant-a",
      userId: "user-a",
      email: "user@example.com",
    });

    mocks.findActiveById.mockResolvedValue(tenant);

    await expect(getActiveTenant()).resolves.toBe(tenant);

    expect(mocks.findActiveById).toHaveBeenCalledWith("tenant-a");
    expect(mocks.setTenantContext).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      userId: "user-a",
    });
    expect(mocks.findActiveBySubdomain).not.toHaveBeenCalled();
  });

  it("does not fallback to another tenant for a normal session with an inactive session tenant", async () => {
    mocks.getSession.mockResolvedValue({
      tenantId: "tenant-inactive",
      userId: "user-normal",
      email: "normal@example.com",
      role: "ADMIN",
    });

    mocks.findActiveById.mockResolvedValue(null);

    await expect(getActiveTenant()).rejects.toThrow("TENANT_SESSION_INACTIVE");

    expect(mocks.findActiveById).toHaveBeenCalledWith("tenant-inactive");
    expect(mocks.findActiveBySubdomain).not.toHaveBeenCalled();
    expect(mocks.findFirstActive).not.toHaveBeenCalled();
    expect(mocks.setTenantContext).not.toHaveBeenCalled();
  });

  it("does not fallback to another tenant for a normal session without tenantId", async () => {
    mocks.getSession.mockResolvedValue({
      tenantId: null,
      userId: "user-normal",
      email: "normal@example.com",
      role: "ADMIN",
    });

    await expect(getActiveTenant()).rejects.toThrow("TENANT_SESSION_NOT_FOUND");

    expect(mocks.findActiveBySubdomain).not.toHaveBeenCalled();
    expect(mocks.findFirstActive).not.toHaveBeenCalled();
    expect(mocks.setTenantContext).not.toHaveBeenCalled();
  });

  it("resolves a Platform Architect from the active session tenant", async () => {
    const tenant = {
      id: "tenant-platform",
      isActive: true,
      companyName: "Platform Tenant",
    };

    mocks.getSession.mockResolvedValue({
      tenantId: "tenant-platform",
      userId: "user-platform",
      email: "platform@example.com",
      role: "PLATFORM_ARCHITECT",
    });
    mocks.findActiveById.mockResolvedValue(tenant);

    await expect(getActiveTenant()).resolves.toBe(tenant);

    expect(mocks.findFirstActive).not.toHaveBeenCalled();
    expect(mocks.setTenantContext).toHaveBeenCalledWith({
      tenantId: "tenant-platform",
      userId: "user-platform",
    });
  });

  it("allows a Platform Architect to fallback to a safe active tenant", async () => {
    const tenant = {
      id: "tenant-fallback",
      isActive: true,
      companyName: "Fallback Tenant",
    };

    mocks.getSession.mockResolvedValue({
      tenantId: "tenant-inactive",
      userId: "user-platform",
      email: "platform@example.com",
      role: "PLATFORM_ARCHITECT",
    });
    mocks.headers.mockResolvedValue({
      get: vi.fn().mockReturnValue("orca.az-ez.pro"),
    });
    mocks.findActiveById.mockResolvedValue(null);
    mocks.findActiveBySubdomain.mockResolvedValue(null);
    mocks.findFirstActive.mockResolvedValue(tenant);

    await expect(getActiveTenant()).resolves.toBe(tenant);

    expect(mocks.findFirstActive).toHaveBeenCalledOnce();
    expect(mocks.setTenantContext).toHaveBeenCalledWith({
      tenantId: "tenant-fallback",
      userId: "user-platform",
    });
  });

  it("fails clearly when privileged fallback has no active tenant", async () => {
    mocks.getSession.mockResolvedValue({
      tenantId: "tenant-inactive",
      userId: "user-platform",
      email: "platform@example.com",
      role: "PLATFORM_ARCHITECT",
    });
    mocks.findActiveById.mockResolvedValue(null);
    mocks.findActiveBySubdomain.mockResolvedValue(null);
    mocks.findFirstActive.mockResolvedValue(null);

    await expect(getActiveTenant()).rejects.toThrow(
      "TENANT_PRIVILEGED_FALLBACK_NOT_FOUND",
    );

    expect(mocks.setTenantContext).not.toHaveBeenCalled();
  });

  it("resolves the host tenant before binding context", async () => {
    const tenant = {
      id: "tenant-b",
      isActive: true,
      companyName: "Tenant B",
    };

    mocks.getSession.mockResolvedValue(null);

    mocks.headers.mockResolvedValue({
      get: vi.fn().mockReturnValue("acme.orca.az-ez.pro"),
    });

    mocks.findActiveBySubdomain.mockResolvedValue(tenant);

    await expect(getActiveTenant()).resolves.toBe(tenant);

    expect(mocks.findActiveBySubdomain).toHaveBeenCalledWith("acme");
    expect(mocks.setTenantContext).not.toHaveBeenCalled();
  });

  it("does not use tenant-aware Prisma during tenant bootstrap", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "lib/tenant.ts"),
      "utf8",
    );

    expect(source).not.toMatch(
      /import\s+\{[^}]*prisma[^}]*\}\s+from\s+["']\.\/prisma["']/,
    );

    expect(source).toContain(
      "tenantResolutionFindActiveById",
    );
  });
});
