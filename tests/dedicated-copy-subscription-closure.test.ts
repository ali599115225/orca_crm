import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// ── Hoisted mocks ──
const {
  mockIsDedicatedCopy,
  mockSession,
  mockTenant,
  mockWriteAuditLog,
  mockInitiatePayment,
  prismaMock,
} = vi.hoisted(() => {
  const mockIsDedicatedCopy = vi.fn();
  const mockSession = vi.fn();
  const mockTenant = vi.fn();
  const mockWriteAuditLog = vi.fn();
  const mockInitiatePayment = vi.fn();
  const prismaMock = {
    mansourChat: { count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    agentLease: { findUnique: vi.fn(), upsert: vi.fn(), findMany: vi.fn() },
    auditLog: { create: vi.fn() },
    tenant: { findUnique: vi.fn() },
    ticket: { create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  };
  return {
    mockIsDedicatedCopy,
    mockSession,
    mockTenant,
    mockWriteAuditLog,
    mockInitiatePayment,
    prismaMock,
  };
});

// ── Module mocks ──
vi.mock("@/lib/deployment-license", () => ({
  isDedicatedCopyDeployment: () => mockIsDedicatedCopy(),
  getDeploymentLicenseMode: () =>
    mockIsDedicatedCopy() ? "DEDICATED_COPY" : "SAAS",
}));

vi.mock("@/lib/session", () => ({
  getSession: () => mockSession(),
}));

vi.mock("@/lib/api-auth-guard", () => ({
  assertServerActionRole: vi.fn(async () => ({
    userId: "user-1",
    role: "ADMIN",
  })),
}));

vi.mock("@/lib/tenant", () => ({
  getActiveTenant: () => mockTenant(),
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: (...args: any[]) => mockWriteAuditLog(...args),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/payments/registry", () => ({
  getEnabledProviderCodes: vi.fn(() => ["MOYASAR"]),
  isProviderEnabled: vi.fn(() => true),
}));

vi.mock("@/lib/payments/service", () => ({
  initiatePayment: (...args: any[]) => mockInitiatePayment(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/crypto", () => ({
  encryptText: vi.fn((t: string) => `encrypted:${t}`),
  decryptText: vi.fn((t: string) => t.replace("encrypted:", "")),
}));

vi.mock("@/lib/privacy-mask", () => ({
  hashPhone: vi.fn(() => "hash"),
}));

vi.mock("@/lib/licensing", () => ({
  authorizeAgentAccess: vi.fn(async () => ({ authorized: true })),
}));

vi.mock("@/lib/agents/guard", () => ({
  assertAgentCanRun: vi.fn(async () => ({ allowed: true })),
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

// ── Import after mocks ──
import {
  initiateSubscriptionPaymentAction,
  initiateAddonPaymentAction,
} from "@/app/actions/payment";
import { leaseAgentAction } from "@/app/actions/growth";
import { assertPlanLimit } from "@/lib/plan-guard";

// ── Default test data ──
const DEFAULT_SESSION = { userId: "user-1", tenantId: "tenant-1" };
const DEFAULT_TENANT = {
  id: "tenant-1",
  companyName: "Test Co",
  subscriptionPlan: "basic",
  subdomain: "test",
};

function setDedicatedCopy(isDedicated: boolean) {
  mockIsDedicatedCopy.mockReturnValue(isDedicated);
}

function setSaas() {
  setDedicatedCopy(false);
}

beforeEach(() => {
  mockSession.mockResolvedValue(DEFAULT_SESSION);
  mockTenant.mockResolvedValue(DEFAULT_TENANT);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════
// A. Payment Guards
// ═══════════════════════════════════════════════════════════
describe("A. Payment guards in DEDICATED_COPY", () => {
  it("initiateSubscriptionPaymentAction rejects in DEDICATED_COPY", async () => {
    setDedicatedCopy(true);
    const result = await initiateSubscriptionPaymentAction("gold");

    expect(result.success).toBe(false);
    expect((result as any).code).toBe("LEGACY_SAAS_OUT_OF_SCOPE");
    expect((result as any).error).toContain("غير متاحة");
    expect(mockInitiatePayment).not.toHaveBeenCalled();
  });

  it("initiateAddonPaymentAction rejects in DEDICATED_COPY", async () => {
    setDedicatedCopy(true);
    const result = await initiateAddonPaymentAction(3);

    expect(result.success).toBe(false);
    expect((result as any).code).toBe("LEGACY_SAAS_OUT_OF_SCOPE");
    expect((result as any).error).toContain("غير متاحة");
    expect(mockInitiatePayment).not.toHaveBeenCalled();
  });

  it("subscription payment does not call provider in DEDICATED_COPY even with valid auth", async () => {
    setDedicatedCopy(true);
    mockSession.mockResolvedValue({ userId: "user-1" });

    await initiateSubscriptionPaymentAction("silver", "MOYASAR");

    expect(mockInitiatePayment).not.toHaveBeenCalled();
  });

  it("legacy SaaS mode cannot re-enable platform subscription payment", async () => {
    setSaas();
    mockInitiatePayment.mockResolvedValue({
      success: true,
      internalTxId: "tx-1",
    });

    const result = await initiateSubscriptionPaymentAction("gold");

    expect(result.success).toBe(false);
    expect((result as any).code).toBe("LEGACY_SAAS_OUT_OF_SCOPE");
    expect(mockInitiatePayment).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// B. Agent Lease Guards
// ═══════════════════════════════════════════════════════════
describe("B. Agent lease guards in DEDICATED_COPY", () => {
  it("leaseAgentAction rejects in DEDICATED_COPY before any DB read", async () => {
    setDedicatedCopy(true);

    const result = await leaseAgentAction({
      agentId: "SAHER",
      autoRenewal: true,
    });

    expect(result.success).toBe(false);
    expect((result as any).code).toBe("LEGACY_SAAS_OUT_OF_SCOPE");
    expect(prismaMock.agentLease.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.agentLease.upsert).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it("legacy SaaS mode cannot re-enable agent add-on leasing", async () => {
    setSaas();
    prismaMock.agentLease.findUnique.mockResolvedValue(null);
    prismaMock.agentLease.upsert.mockResolvedValue({
      id: "lease-1",
      agentId: "SAHER",
      startDate: new Date(),
      endDate: new Date(),
      leasePrice: 400,
      autoRenewal: true,
    });

    const result = await leaseAgentAction({
      agentId: "SAHER",
      autoRenewal: true,
    });

    expect(result.success).toBe(false);
    expect((result as any).code).toBe("LEGACY_SAAS_OUT_OF_SCOPE");
    expect(prismaMock.agentLease.findUnique).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// E. Plan Limit Guards
// ═══════════════════════════════════════════════════════════
describe("E. Plan limit guards in DEDICATED_COPY", () => {
  it("assertPlanLimit returns immediately in DEDICATED_COPY without DB access", async () => {
    setDedicatedCopy(true);
    const mockTx = {
      $queryRaw: vi.fn(),
      tenant: { findUnique: vi.fn() },
      lead: { count: vi.fn() },
      user: { count: vi.fn() },
      project: { count: vi.fn() },
      agentSlot: { count: vi.fn() },
    };

    await assertPlanLimit({
      tenantId: "tenant-1",
      feature: "staff",
      tx: mockTx as any,
    });

    expect(mockTx.$queryRaw).not.toHaveBeenCalled();
    expect(mockTx.tenant.findUnique).not.toHaveBeenCalled();
  });

  it("legacy SaaS mode cannot re-enable package limit queries", async () => {
    setSaas();
    const mockTx = {
      $queryRaw: vi.fn(),
      tenant: {
        findUnique: vi.fn().mockResolvedValue({ subscriptionPlan: "gold" }),
      },
      lead: { count: vi.fn().mockResolvedValue(0) },
      user: { count: vi.fn().mockResolvedValue(0) },
      project: { count: vi.fn().mockResolvedValue(0) },
      agentSlot: { count: vi.fn().mockResolvedValue(0) },
    };

    await assertPlanLimit({
      tenantId: "tenant-1",
      feature: "staff",
      tx: mockTx as any,
    });

    expect(mockTx.$queryRaw).not.toHaveBeenCalled();
    expect(mockTx.tenant.findUnique).not.toHaveBeenCalled();
  });
});
