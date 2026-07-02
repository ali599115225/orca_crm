import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AGENT_CODES,
  AGENT_MONTHLY_PRICE_SAR,
  canActivateAgent,
  canPurchaseAgentSubscriptions,
  getEffectiveActiveAgentLimit,
  getIncludedAgents,
  resolveAgentAccessSource,
  type AgentCode,
} from "@/lib/agents/entitlements";

vi.mock("server-only", () => ({}));

const ALL_AGENTS: readonly AgentCode[] = AGENT_CODES;

// ═══════════════════════════════════════════════════════════
// A. Entitlements — DEDICATED_COPY
// ═══════════════════════════════════════════════════════════
describe("A. entitlements — DEDICATED_COPY", () => {
  it("getIncludedAgents returns ALL agents in DEDICATED_COPY", () => {
    const result = getIncludedAgents({ licenseMode: "DEDICATED_COPY", plan: "basic" });
    expect(result).toHaveLength(ALL_AGENTS.length);
    expect(result).toEqual(ALL_AGENTS);
  });

  it("getIncludedAgents respects plan in SAAS mode", () => {
    const goldResult = getIncludedAgents({ licenseMode: "SAAS", plan: "gold" });
    expect(goldResult).toEqual(ALL_AGENTS);

    const basicResult = getIncludedAgents({ licenseMode: "SAAS", plan: "basic" });
    expect(basicResult).toEqual(["MANSOUR"]);
    expect(basicResult).not.toContain("SAHER");
  });

  it("canPurchaseAgentSubscriptions returns false in DEDICATED_COPY", () => {
    expect(canPurchaseAgentSubscriptions("DEDICATED_COPY")).toBe(false);
  });

  it("canPurchaseAgentSubscriptions returns true in SAAS", () => {
    expect(canPurchaseAgentSubscriptions("SAAS")).toBe(true);
  });

  it("resolveAgentAccessSource returns LICENSE in DEDICATED_COPY regardless of plan or subscription", () => {
    const result = resolveAgentAccessSource({
      licenseMode: "DEDICATED_COPY",
      plan: "basic",
      agentCode: "SAHER",
      hasActiveSubscription: false,
    });
    expect(result).toBe("LICENSE");
  });

  it("resolveAgentAccessSource returns PLAN for included agent in SAAS", () => {
    const result = resolveAgentAccessSource({
      licenseMode: "SAAS",
      plan: "gold",
      agentCode: "SAHER",
      hasActiveSubscription: false,
    });
    expect(result).toBe("PLAN");
  });

  it("resolveAgentAccessSource returns SUBSCRIPTION for subscribed agent in SAAS", () => {
    const result = resolveAgentAccessSource({
      licenseMode: "SAAS",
      plan: "basic",
      agentCode: "SAHER",
      hasActiveSubscription: true,
    });
    expect(result).toBe("SUBSCRIPTION");
  });

  it("resolveAgentAccessSource returns LOCKED for unentitled agent in SAAS", () => {
    const result = resolveAgentAccessSource({
      licenseMode: "SAAS",
      plan: "basic",
      agentCode: "SAHER",
      hasActiveSubscription: false,
    });
    expect(result).toBe("LOCKED");
  });

  it("getEffectiveActiveAgentLimit returns ALL agents count in DEDICATED_COPY", () => {
    expect(getEffectiveActiveAgentLimit("basic", 0, "DEDICATED_COPY")).toBe(ALL_AGENTS.length);
  });

  it("getEffectiveActiveAgentLimit respects plan in SAAS", () => {
    expect(getEffectiveActiveAgentLimit("basic", 0, "SAAS")).toBe(1);
  });

  it("canActivateAgent allows any agent in DEDICATED_COPY under the agent-type limit", () => {
    ALL_AGENTS.forEach((code) => {
      const result = canActivateAgent({
        licenseMode: "DEDICATED_COPY",
        plan: "basic",
        agentCode: code,
        activeAgentCount: 0,
        activeSubscriptionCount: 0,
        hasActiveSubscription: false,
      });
      expect(result.allowed).toBe(true);
      expect(result.source).toBe("LICENSE");
      expect(result.effectiveLimit).toBe(ALL_AGENTS.length);
    });
  });

  it("canActivateAgent blocks unentitled agent in SAAS basic plan", () => {
    const result = canActivateAgent({
      licenseMode: "SAAS",
      plan: "basic",
      agentCode: "SAHER",
      activeAgentCount: 0,
      activeSubscriptionCount: 0,
      hasActiveSubscription: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.source).toBe("LOCKED");
    expect(result.reason).toBe("AGENT_NOT_ENTITLED");
  });

  it("canActivateAgent blocks when active limit reached in SAAS", () => {
    const result = canActivateAgent({
      licenseMode: "SAAS",
      plan: "gold",
      agentCode: "SAHER",
      activeAgentCount: 5,
      activeSubscriptionCount: 0,
      hasActiveSubscription: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("ACTIVE_AGENT_LIMIT_REACHED");
  });
});

// ═══════════════════════════════════════════════════════════
// B. AgentManagementView — ui logic verification
// ═══════════════════════════════════════════════════════════
describe("B. AgentManagementView — ui logic", () => {
  it("AGENT_MONTHLY_PRICE_SAR is defined and positive", () => {
    expect(AGENT_MONTHLY_PRICE_SAR).toBeGreaterThan(0);
  });

  it("AGENT_CODES covers all five operational agents", () => {
    expect(AGENT_CODES).toEqual(["MANSOUR", "SAHER", "SANAD", "BASEER", "KHABEER"]);
  });

  it("DEDICATED_COPY makes all agents included (no subscription required)", () => {
    const included = getIncludedAgents({ licenseMode: "DEDICATED_COPY", plan: "basic" });
    expect(new Set(included).size).toBe(AGENT_CODES.length);

    AGENT_CODES.forEach((code) => {
      expect(included).toContain(code);
    });
  });

  it("DEDICATED_COPY blocks subscription purchases at entitlement level", () => {
    expect(canPurchaseAgentSubscriptions("DEDICATED_COPY")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// C. Server Page — AgentsPage props
// ═══════════════════════════════════════════════════════════
const {
  mockGetDeploymentLicenseMode,
  mockGetSession,
  prismaMock,
} = vi.hoisted(() => {
  const mockGetDeploymentLicenseMode = vi.fn();
  const mockGetSession = vi.fn();
  const prismaMock = {
    tenant: { findUnique: vi.fn() },
    user: { count: vi.fn() },
    lead: { count: vi.fn() },
  };
  return { mockGetDeploymentLicenseMode, mockGetSession, prismaMock };
});

vi.mock("@/lib/deployment-license", () => ({
  getDeploymentLicenseMode: () => mockGetDeploymentLicenseMode(),
  isDedicatedCopyDeployment: () => mockGetDeploymentLicenseMode() === "DEDICATED_COPY",
}));

vi.mock("@/lib/session", () => ({
  getSession: () => mockGetSession(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/tenant-context", () => ({
  runWithTenantContext: vi.fn((_ctx: any, fn: any) => fn()),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/components/views/AgentManagementView", () => ({
  default: vi.fn((props: any) => props),
}));

const DEFAULT_SESSION = { userId: "user-1", tenantId: "tenant-1" };
const DEFAULT_TENANT = { subscriptionPlan: "gold" };

describe("C. AgentsPage — licenseMode prop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(DEFAULT_SESSION);
    mockGetDeploymentLicenseMode.mockReturnValue("SAAS");
    prismaMock.tenant.findUnique.mockResolvedValue(DEFAULT_TENANT);
    prismaMock.user.count.mockResolvedValue(5);
    prismaMock.lead.count.mockResolvedValue(100);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes licenseMode=DEDICATED_COPY to AgentManagementView", async () => {
    mockGetDeploymentLicenseMode.mockReturnValue("DEDICATED_COPY");

    const { default: AgentsPage } = await import("@/app/operations/agents/page");
    const result = await AgentsPage();

    expect(result.props.licenseMode).toBe("DEDICATED_COPY");
    expect(result.props.tenantPlan).toBe("gold");
    expect(result.props.totalUsers).toBe(5);
    expect(result.props.totalLeads).toBe(100);
  });

  it("passes licenseMode=SAAS to AgentManagementView", async () => {
    mockGetDeploymentLicenseMode.mockReturnValue("SAAS");

    const { default: AgentsPage } = await import("@/app/operations/agents/page");
    const result = await AgentsPage();

    expect(result.props.licenseMode).toBe("SAAS");
  });

  it("redirects to login when no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const { redirect } = await import("next/navigation");

    try {
      const { default: AgentsPage } = await import("@/app/operations/agents/page");
      await AgentsPage();
    } catch {
      // redirect throws in next/navigation mock
    }

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to login when no tenant found", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(null);
    const { redirect } = await import("next/navigation");

    try {
      const { default: AgentsPage } = await import("@/app/operations/agents/page");
      await AgentsPage();
    } catch {
      // redirect throws
    }

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("licenseMode is passed unchanged — UI never ignores backend guard", async () => {
    mockGetDeploymentLicenseMode.mockReturnValue("DEDICATED_COPY");
    const { default: AgentsPage } = await import("@/app/operations/agents/page");
    const result = await AgentsPage();

    expect(result.props.licenseMode).toBe("DEDICATED_COPY");
    expect(result.props.licenseMode).not.toBe("SAAS");
  });
});

// ═══════════════════════════════════════════════════════════
// D. AgentManagementView — dedicated UI guards (source assertions)
//
// These tests read the source file to verify the guard patterns
// exist. They do NOT render the component — rendering requires
// jsdom which is not configured in this vitest environment.
// Backend leaseAgentAction guard is tested in:
//   tests/dedicated-copy-subscription-closure.test.ts
// ═══════════════════════════════════════════════════════════
describe("D. AgentManagementView — dedicated UI guards", () => {
  const viewPath = join(__dirname, "..", "components", "views", "AgentManagementView.tsx");

  let source = "";

  beforeAll(() => {
    source = readFileSync(viewPath, "utf8");
  });

  it("source contains the two DEDICATED_COPY UI guards (subscription link + modal)", () => {
    const allOccurrences = source.split("!isDedicatedCopy").length - 1;
    expect(allOccurrences).toBeGreaterThanOrEqual(4);
  });

  it("Subscription Settings link is guarded by !isDedicatedCopy", () => {
    expect(source).toMatch(/!isDedicatedCopy[\s\S]*?operations\/settings\?tab=agents/);
  });

  it("subscription modal render is guarded by !isDedicatedCopy for defense in depth", () => {
    expect(source).toContain("selectedSubscription && !isDedicatedCopy");
  });

  it("license tag 'Included in License' exists in source", () => {
    expect(source).toContain("Included in License");
  });

  it("license tag 'مشمول في الترخيص' exists in source", () => {
    expect(source).toContain("مشمول في الترخيص");
  });

  it("SaaS code preserved: subscription settings href still exists in source", () => {
    expect(source).toContain('/operations/settings?tab=agents');
  });

  it("SaaS code preserved: 'Subscribe Now' button text still exists in source", () => {
    expect(source).toContain("Subscribe Now");
  });

  it("SaaS code preserved: 'اشترك الآن' button text still exists in source", () => {
    expect(source).toContain("اشترك الآن");
  });

  it("SaaS code preserved: catalog tab definition still exists in source", () => {
    expect(source).toMatch(/id:\s*"catalog"/);
  });

  it("agent management buttons preserved: 'Activate' / 'تفعيل' still in source", () => {
    expect(source).toContain("Activate");
    expect(source).toContain("تفعيل");
  });

  it("agent management buttons preserved: 'Run Now' / 'تشغيل الآن' still in source", () => {
    expect(source).toContain("Run Now");
    expect(source).toContain("تشغيل الآن");
  });

  it("no DEDICATED_COPY guard wraps admin buttons (they remain unconditional for entitled agents)", () => {
    // The Activate/Disable buttons use 'entitled && slot' guard, not isDedicatedCopy
    const activatePattern = source.match(/entitled\s*&&\s*slot/);
    expect(activatePattern).not.toBeNull();
  });
});
