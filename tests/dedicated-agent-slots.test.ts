import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  mockIsDedicatedCopy,
  mockRequireAgentAccess,
  prismaMock,
} = vi.hoisted(() => {
  const mockIsDedicatedCopy = vi.fn();
  const mockRequireAgentAccess = vi.fn();
  const prismaMock = {
    tenant: { findUnique: vi.fn() },
    agentSlot: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    usageMeter: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    user: { findFirst: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  };
  return { mockIsDedicatedCopy, mockRequireAgentAccess, prismaMock };
});

vi.mock("@/lib/deployment-license", () => ({
  isDedicatedCopyDeployment: () => mockIsDedicatedCopy(),
}));

vi.mock("@/lib/agents/access", () => ({
  AGENT_MANAGER_ROLES: ["ADMIN", "owner"],
  AGENT_READ_ROLES: ["ADMIN", "owner", "SALES_MANAGER"],
  requireAgentAccess: (...a: any[]) => mockRequireAgentAccess(...a),
}));

vi.mock("@/lib/agents/registry", () => ({
  getAgentDefinition: vi.fn((t: string) => ({ type: t, name: t })),
  normalizeAgentType: vi.fn((t: string) => t),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { getAgentSlotsAction, createAgentSlotAction } from "@/app/actions/agentSlots";

const DEFAULT_ACCESS = { tenantId: "tenant-1", userId: "user-1" };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAgentAccess.mockResolvedValue(DEFAULT_ACCESS);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("agentSlots — DEDICATED_COPY", () => {
  it("DEDICATED_COPY bypasses plan slot limits in getAgentSlotsAction", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    prismaMock.tenant.findUnique.mockResolvedValue({ subscriptionPlan: "basic" });
    prismaMock.agentSlot.findMany.mockResolvedValue([
      { id: "s1", agentType: "CHAT_BOT", isActive: true },
      { id: "s2", agentType: "MANSOUR", isActive: true },
    ]);

    const result = await getAgentSlotsAction();

    expect(result.success).toBe(true);
    expect(result.maxSlots).toBe(Number.MAX_SAFE_INTEGER);
    expect(result.isAtCap).toBe(false);
  });

  it("SaaS basic plan limits to 1 slot", async () => {
    mockIsDedicatedCopy.mockReturnValue(false);
    prismaMock.tenant.findUnique.mockResolvedValue({ subscriptionPlan: "basic" });
    prismaMock.agentSlot.findMany.mockResolvedValue([
      { id: "s1", agentType: "CHAT_BOT", isActive: true },
    ]);

    const result = await getAgentSlotsAction();

    expect(result.maxSlots).toBe(1);
    expect(result.isAtCap).toBe(true);
  });

  it("auth and tenant isolation remain in DEDICATED_COPY", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    prismaMock.tenant.findUnique.mockResolvedValue({ subscriptionPlan: "basic" });
    prismaMock.agentSlot.findMany.mockResolvedValue([]);

    await getAgentSlotsAction();

    expect(mockRequireAgentAccess).toHaveBeenCalledWith(
      expect.objectContaining({ roles: expect.any(Array) }),
    );
    expect(prismaMock.tenant.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "tenant-1" } }),
    );
  });

  it("createAgentSlotAction respects DEDICATED_COPY unlimited slots", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);

    const mockTx = {
      tenant: { findUnique: vi.fn().mockResolvedValue({ subscriptionPlan: "basic" }) },
      agentSlot: {
        count: vi.fn().mockResolvedValue(5),
        aggregate: vi.fn().mockResolvedValue({ _max: { slotNumber: 5 } }),
        create: vi.fn().mockResolvedValue({ id: "s6", agentType: "CHAT_BOT", slotNumber: 6, isActive: true }),
      },
      usageMeter: { create: vi.fn() },
      auditLog: { create: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

    const result = await createAgentSlotAction("CHAT_BOT");

    expect(result.success).toBe(true);
    expect(mockTx.agentSlot.count).toHaveBeenCalled();
  });

  it("SaaS basic plan blocks slot creation at limit", async () => {
    mockIsDedicatedCopy.mockReturnValue(false);

    const mockTx = {
      tenant: { findUnique: vi.fn().mockResolvedValue({ subscriptionPlan: "basic" }) },
      agentSlot: {
        count: vi.fn().mockResolvedValue(1),
        aggregate: vi.fn(),
        create: vi.fn(),
      },
      usageMeter: { create: vi.fn() },
      auditLog: { create: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

    const result = await createAgentSlotAction("CHAT_BOT");

    expect(result.success).toBe(false);
    expect((result as any).capLock).toBe(true);
  });
});
