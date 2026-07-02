import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("resolves the host tenant before binding context", async () => {
    const tenant = {
      id: "tenant-b",
      isActive: true,
      companyName: "Tenant B",
    };

    mocks.getSession.mockResolvedValue({
      tenantId: null,
      userId: "user-b",
      email: "user@example.com",
    });

    mocks.headers.mockResolvedValue({
      get: vi.fn().mockReturnValue("acme.orca.az-ez.pro"),
    });

    mocks.findActiveBySubdomain.mockResolvedValue(tenant);

    await expect(getActiveTenant()).resolves.toBe(tenant);

    expect(mocks.findActiveBySubdomain).toHaveBeenCalledWith("acme");
    expect(mocks.setTenantContext).toHaveBeenCalledWith({
      tenantId: "tenant-b",
      userId: "user-b",
    });
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
