import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  mockIsDedicatedCopy,
  prismaMock,
} = vi.hoisted(() => {
  const mockIsDedicatedCopy = vi.fn();
  const prismaMock = {
    tenant: { update: vi.fn() },
  };
  return { mockIsDedicatedCopy, prismaMock };
});

vi.mock("@/lib/deployment-license", () => ({
  isDedicatedCopyDeployment: () => mockIsDedicatedCopy(),
}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn().mockResolvedValue({ userId: "admin-1" }),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/api-auth-guard", () => ({
  assertServerActionRole: vi.fn(),
  isSuperAdmin: () => true,
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { adminUpdateTenantPlanAction } from "@/app/actions/admin";

function setDedicatedCopy(isDedicated: boolean) {
  mockIsDedicatedCopy.mockReturnValue(isDedicated);
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.tenant.update.mockResolvedValue({ id: "tenant-1" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("adminUpdateTenantPlanAction — validation ordering", () => {
  it("updates only isActive in DEDICATED_COPY even with invalid plan", async () => {
    setDedicatedCopy(true);

    const result = await adminUpdateTenantPlanAction("tenant-1", "!!!invalid", true);

    expect(result).toMatchObject({ success: true, planChangeSkipped: true, mode: "DEDICATED_COPY" });
    expect(prismaMock.tenant.update).toHaveBeenCalledWith({
      where: { id: "tenant-1" },
      data: { isActive: true },
    });
  });

  it("does not write subscriptionPlan in DEDICATED_COPY", async () => {
    setDedicatedCopy(true);

    await adminUpdateTenantPlanAction("tenant-1", "gold", false);

    const call = prismaMock.tenant.update.mock.calls[0][0];
    expect(call.data).toEqual({ isActive: false });
    expect(call.data.subscriptionPlan).toBeUndefined();
  });

  it("rejects empty tenantId before checking DEDICATED_COPY", async () => {
    setDedicatedCopy(true);

    const result = await adminUpdateTenantPlanAction("", "gold", true);

    expect(result.success).toBe(false);
    expect(prismaMock.tenant.update).not.toHaveBeenCalled();
  });

  it("rejects non-boolean isActive before checking DEDICATED_COPY", async () => {
    setDedicatedCopy(true);

    const result = await adminUpdateTenantPlanAction("tenant-1", "gold", "yes" as any);

    expect(result.success).toBe(false);
    expect(prismaMock.tenant.update).not.toHaveBeenCalled();
  });

  it("rejects invalid plan in SAAS mode", async () => {
    setDedicatedCopy(false);

    const result = await adminUpdateTenantPlanAction("tenant-1", "!!!invalid", true);

    expect(result.success).toBe(false);
    expect(prismaMock.tenant.update).not.toHaveBeenCalled();
  });

  it("updates both subscriptionPlan and isActive in SAAS mode with valid plan", async () => {
    setDedicatedCopy(false);

    const result = await adminUpdateTenantPlanAction("tenant-1", "gold", true);

    expect(result.success).toBe(true);
    expect(prismaMock.tenant.update).toHaveBeenCalledWith({
      where: { id: "tenant-1" },
      data: { subscriptionPlan: "gold", isActive: true },
    });
  });
});
