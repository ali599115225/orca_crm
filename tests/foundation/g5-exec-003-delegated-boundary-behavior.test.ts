import { beforeEach, describe, expect, it, vi } from "vitest";

const agentMocks = vi.hoisted(() => ({
  requireAgentAccess: vi.fn(),
  generateAgentJson: vi.fn(),
}));

vi.mock("@/lib/agents/access", () => ({
  AGENT_READ_ROLES: [
    "ADMIN",
    "SALES_MANAGER",
    "SALES_EMPLOYEE",
    "MARKETING",
    "READ_ONLY",
  ],
  requireAgentAccess: agentMocks.requireAgentAccess,
}));
vi.mock("@/lib/agents/gemini-client", () => ({
  generateAgentJson: agentMocks.generateAgentJson,
}));

import { generateAIInsight } from "@/app/actions/aiClient";

beforeEach(() => {
  vi.clearAllMocks();
  agentMocks.requireAgentAccess.mockResolvedValue({
    tenantId: "tenant-1",
    userId: "user-1",
  });
  agentMocks.generateAgentJson.mockResolvedValue({
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

describe("EXEC-003 delegated database-RBAC boundary", () => {
  it("DIRECT_BEHAVIORAL EXEC-003-C17-O01 delegates allow behavior to requireAgentAccess", async () => {
    const result = await generateAIInsight({ leadScore: 90 });

    expect(agentMocks.requireAgentAccess).toHaveBeenCalledWith({
      roles: [
        "ADMIN",
        "SALES_MANAGER",
        "SALES_EMPLOYEE",
        "MARKETING",
        "READ_ONLY",
      ],
    });
    expect(agentMocks.generateAgentJson).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-1", agentName: "KHABEER" }),
    );
    expect(result).toMatchObject({ recommendation: "Follow up", source: "MODEL" });
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C17-O01 preserves delegated denial without a shared-guard bypass", async () => {
    agentMocks.requireAgentAccess.mockRejectedValue(new Error("FORBIDDEN"));

    const result = await generateAIInsight({ leadScore: 90 });

    expect(agentMocks.generateAgentJson).not.toHaveBeenCalled();
    expect(result).toMatchObject({ confidence: 0, source: "UNAVAILABLE" });
  });
});
