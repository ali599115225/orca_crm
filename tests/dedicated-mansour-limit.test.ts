import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  mockIsDedicatedCopy,
  mockSession,
  mockTenant,
  prismaMock,
  mockAuthorizeAgent,
  mockAssertAgentCanRun,
} = vi.hoisted(() => {
  const mockIsDedicatedCopy = vi.fn();
  const mockSession = vi.fn();
  const mockTenant = vi.fn();
  const mockAuthorizeAgent = vi.fn();
  const mockAssertAgentCanRun = vi.fn();
  const prismaMock = {
    mansourChat: {
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    lead: { update: vi.fn() },
  };
  return { mockIsDedicatedCopy, mockSession, mockTenant, prismaMock, mockAuthorizeAgent, mockAssertAgentCanRun };
});

vi.mock("@/lib/deployment-license", () => ({
  isDedicatedCopyDeployment: () => mockIsDedicatedCopy(),
}));

vi.mock("@/lib/session", () => ({ getSession: () => mockSession() }));
vi.mock("@/lib/tenant", () => ({ getActiveTenant: () => mockTenant() }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/licensing", () => ({
  authorizeAgentAccess: (...a: any[]) => mockAuthorizeAgent(...a),
}));
vi.mock("@/lib/agents/guard", () => ({
  assertAgentCanRun: (...a: any[]) => mockAssertAgentCanRun(...a),
}));
vi.mock("@/lib/crypto", () => ({
  encryptText: vi.fn((t: string) => `enc:${t}`),
  decryptText: vi.fn((t: string) => t.replace("enc:", "")),
}));
vi.mock("@/lib/agents/prompt-guard", () => ({
  sanitizeAgentInput: vi.fn((t: string) => ({ sanitized: t })),
  detectInjectionPatterns: vi.fn(() => ({ detected: false })),
  wrapUntrustedContent: vi.fn((t: string) => t),
  safeJsonParseAgentOutput: vi.fn(() => ({ ok: false, error: "skip" })),
}));
vi.mock("@/lib/agents/mansour", () => ({
  buildMansourSystemPrompt: vi.fn(() => "system"),
}));

import { sendMansourMessageAction } from "@/app/actions/growth";

const DEFAULT_SESSION = { userId: "user-1", tenantId: "tenant-1" };
const DEFAULT_TENANT = {
  id: "tenant-1",
  companyName: "Test Co",
  subscriptionPlan: "basic",
  subdomain: "test",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.mockResolvedValue(DEFAULT_SESSION);
  mockTenant.mockResolvedValue(DEFAULT_TENANT);
  mockAuthorizeAgent.mockResolvedValue({ authorized: true });
  mockAssertAgentCanRun.mockResolvedValue({ allowed: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sendMansourMessageAction — DEDICATED_COPY", () => {
  it("DEDICATED_COPY does NOT call mansourChat.count for plan limit", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    prismaMock.mansourChat.findUnique.mockResolvedValue({
      id: "chat-1",
      messagesJson: "enc:[]",
      leadId: null,
    });
    prismaMock.mansourChat.update.mockResolvedValue({});

    await sendMansourMessageAction("chat-1", "hello");

    expect(prismaMock.mansourChat.count).not.toHaveBeenCalled();
  });

  it("SaaS basic plan DOES call mansourChat.count", async () => {
    mockIsDedicatedCopy.mockReturnValue(false);
    prismaMock.mansourChat.count.mockResolvedValue(5);
    prismaMock.mansourChat.findUnique.mockResolvedValue({
      id: "chat-1",
      messagesJson: "enc:[]",
      leadId: null,
    });
    prismaMock.mansourChat.update.mockResolvedValue({});

    await sendMansourMessageAction("chat-1", "hello");

    expect(prismaMock.mansourChat.count).toHaveBeenCalled();
  });

  it("SaaS basic plan blocks at 10 messages", async () => {
    mockIsDedicatedCopy.mockReturnValue(false);
    prismaMock.mansourChat.count.mockResolvedValue(10);

    const result = await sendMansourMessageAction("chat-1", "hello");

    expect(result.success).toBe(false);
    expect((result as any).error).toContain("استنفاد");
    expect((result as any).isRestricted).toBe(true);
  });

  it("DEDICATED_COPY does not bypass auth checks", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    mockAuthorizeAgent.mockResolvedValue({ authorized: false, message: "Access Denied" });

    const result = await sendMansourMessageAction("chat-1", "hello");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Access Denied");
  });

  it("DEDICATED_COPY does not bypass runtime guard", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    mockAssertAgentCanRun.mockResolvedValue({ allowed: false });

    const result = await sendMansourMessageAction("chat-1", "hello");

    expect(result.success).toBe(false);
    expect(result.error).toContain("معطلون");
  });
});
