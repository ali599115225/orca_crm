import { beforeEach, describe, expect, it, vi } from "vitest";

const agentState = vi.hoisted(() => ({
  session: {
    tenantId: "tenant-1",
    userId: "user-1",
  } as { tenantId: string; userId: string } | null,
  user: {
    id: "user-1",
    tenantId: "tenant-1",
    role: "ADMIN",
    email: "user@example.com",
    isActive: true,
  } as {
    id: string;
    tenantId: string;
    role: string;
    email: string;
    isActive: boolean;
  } | null,
}));

const sessionMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const prismaMocks = vi.hoisted(() => ({
  userFindFirst: vi.fn(),
}));

const tenantMocks = vi.hoisted(() => ({
  runWithTenantContext: vi.fn(
    async (
      _context: { tenantId: string; userId?: string },
      operation: () => unknown,
    ) => await operation(),
  ),
}));

const providerMocks = vi.hoisted(() => ({
  generateAgentJson: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getSession: sessionMocks.getSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: prismaMocks.userFindFirst,
    },
  },
}));

vi.mock("@/lib/tenant-context", () => ({
  runWithTenantContext: tenantMocks.runWithTenantContext,
}));

vi.mock("@/lib/agents/gemini-client", () => ({
  generateAgentJson: providerMocks.generateAgentJson,
}));

import { generateAIInsight } from "@/app/actions/aiClient";

beforeEach(() => {
  vi.clearAllMocks();

  agentState.session = {
    tenantId: "tenant-1",
    userId: "user-1",
  };
  agentState.user = {
    id: "user-1",
    tenantId: "tenant-1",
    role: "ADMIN",
    email: "user@example.com",
    isActive: true,
  };

  sessionMocks.getSession.mockImplementation(async () => agentState.session);
  prismaMocks.userFindFirst.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) => {
      const user = agentState.user;
      if (!user) return null;
      if (where.id !== user.id || where.tenantId !== user.tenantId) return null;
      if (where.isActive === true && !user.isActive) return null;
      return {
        id: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
      };
    },
  );
  providerMocks.generateAgentJson.mockResolvedValue({
    data: {
      recommendation: "Follow up",
      actionText: "Call",
      priority: "high",
      confidence: 0.9,
    },
    source: "MODEL",
    model: "test-model",
  });
});

async function expectDenied() {
  const result = await generateAIInsight({ leadScore: 90 });

  expect(providerMocks.generateAgentJson).not.toHaveBeenCalled();
  expect(result).toMatchObject({ confidence: 0, source: "UNAVAILABLE" });
}

describe("EXEC-003 delegated database-RBAC boundary", () => {
  it("DIRECT_BEHAVIORAL EXEC-003-C17-O01 denies a missing session through requireAgentAccess", async () => {
    agentState.session = null;

    await expectDenied();
    expect(prismaMocks.userFindFirst).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C17-O01 denies a missing tenant user through requireAgentAccess", async () => {
    agentState.user = null;

    await expectDenied();
    expect(prismaMocks.userFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "user-1",
          tenantId: "tenant-1",
          isActive: true,
        },
      }),
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C17-O01 denies an inactive user through requireAgentAccess", async () => {
    if (agentState.user) agentState.user.isActive = false;

    await expectDenied();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C17-O01 denies a tenant mismatch through requireAgentAccess", async () => {
    if (agentState.user) agentState.user.tenantId = "tenant-2";

    await expectDenied();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C17-O01 preserves delegated denial without a shared-guard bypass", async () => {
    if (agentState.user) agentState.user.role = "EXTERNAL";

    await expectDenied();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C17-O01 delegates allow behavior to requireAgentAccess", async () => {
    const result = await generateAIInsight({ leadScore: 90 });

    expect(tenantMocks.runWithTenantContext).toHaveBeenCalledWith(
      { tenantId: "tenant-1", userId: "user-1" },
      expect.any(Function),
    );
    expect(providerMocks.generateAgentJson).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-1", agentName: "KHABEER" }),
    );
    expect(result).toMatchObject({ recommendation: "Follow up", source: "MODEL" });
  });
});
