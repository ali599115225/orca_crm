import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockRequireAgentAccess, prismaMock } = vi.hoisted(() => {
  const mockRequireAgentAccess = vi.fn();
  const prismaMock = {
    agentSlot: {
      findMany: vi.fn(),
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
  return { mockRequireAgentAccess, prismaMock };
});

vi.mock("@/lib/agents/access", () => ({
  AGENT_MANAGER_ROLES: ["ADMIN", "owner"],
  AGENT_READ_ROLES: ["ADMIN", "owner", "SALES_MANAGER"],
  requireAgentAccess: (...args: any[]) => mockRequireAgentAccess(...args),
}));

vi.mock("@/lib/agents/registry", () => ({
  getAgentDefinition: vi.fn((type: string) => ({ type, name: type })),
  normalizeAgentType: vi.fn((type: string) => type),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  createAgentSlotAction,
  getAgentSlotsAction,
} from "@/app/actions/agentSlots";

const DEFAULT_ACCESS = { tenantId: "tenant-1", userId: "user-1" };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAgentAccess.mockResolvedValue(DEFAULT_ACCESS);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("agentSlots — single-company operation", () => {
  it("returns operational capacity without a commercial plan limit", async () => {
    prismaMock.agentSlot.findMany.mockResolvedValue([
      { id: "s1", agentType: "CHAT_BOT", isActive: true },
      { id: "s2", agentType: "MANSOUR", isActive: true },
    ]);

    const result = await getAgentSlotsAction();

    expect(result).toMatchObject({
      success: true,
      activeCount: 2,
      maxSlots: null,
      isAtCap: false,
      plan: null,
      commercialLimitApplied: false,
    });
    expect(prismaMock.agentSlot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "tenant-1" } }),
    );
  });

  it("preserves authentication and tenant isolation", async () => {
    prismaMock.agentSlot.findMany.mockResolvedValue([]);

    await getAgentSlotsAction();

    expect(mockRequireAgentAccess).toHaveBeenCalledWith(
      expect.objectContaining({ roles: expect.any(Array) }),
    );
    expect(prismaMock.agentSlot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "tenant-1" } }),
    );
  });

  it("creates an agent slot without reading subscriptionPlan or counting a commercial cap", async () => {
    const mockTx = {
      agentSlot: {
        aggregate: vi.fn().mockResolvedValue({ _max: { slotNumber: 5 } }),
        create: vi.fn().mockResolvedValue({
          id: "s6",
          agentType: "CHAT_BOT",
          slotNumber: 6,
          isActive: true,
        }),
      },
      usageMeter: { create: vi.fn() },
      auditLog: { create: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation(async (operation: any) =>
      operation(mockTx),
    );

    const result = await createAgentSlotAction("CHAT_BOT");

    expect(result.success).toBe(true);
    expect(mockTx.agentSlot.aggregate).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1" },
      _max: { slotNumber: true },
    });
    expect(mockTx.agentSlot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        slotNumber: 6,
        isActive: true,
      }),
    });
    expect(mockTx.usageMeter.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        limitValue: 99_999,
      }),
    });
  });

  it("keeps unsupported internal Sentinel slot creation blocked", async () => {
    const result = await createAgentSlotAction("SENTINEL");

    expect(result).toMatchObject({ success: false });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
