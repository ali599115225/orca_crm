import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  mockIsDedicatedCopy,
  mockSession,
  mockTenant,
  prismaMock,
} = vi.hoisted(() => {
  const mockIsDedicatedCopy = vi.fn();
  const mockSession = vi.fn();
  const mockTenant = vi.fn();
  const prismaMock = {
    user: { count: vi.fn() },
    tenant: { update: vi.fn() },
  };
  return {
    mockIsDedicatedCopy,
    mockSession,
    mockTenant,
    prismaMock,
  };
});

vi.mock("@/lib/deployment-license", () => ({
  isDedicatedCopyDeployment: () => mockIsDedicatedCopy(),
  getDeploymentLicenseMode: () =>
    mockIsDedicatedCopy() ? "DEDICATED_COPY" : "SAAS",
}));

vi.mock("@/lib/session", () => ({
  getSession: () => mockSession(),
}));

vi.mock("@/lib/tenant", () => ({
  getActiveTenant: () => mockTenant(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/plan-guard", () => ({
  assertPlanLimit: vi.fn(),
  PlanLimitError: class PlanLimitError extends Error {},
  logPlanBlockedAttempt: vi.fn(),
  getPlanLimits: vi.fn((plan: string) => ({ staff: plan === "GOLD" ? 10 : 5 })),
  normalizePlan: vi.fn((plan: string) => plan.toUpperCase()),
}));

vi.mock("@/lib/api-auth-guard", () => ({
  assertServerActionRole: vi.fn(),
  isSuperAdmin: () => true,
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getPlanLimitInfoAction } from "@/app/actions/users";
import { updateTenantPlanAction } from "@/app/actions/admin";
import { buildMansourFallbackResponse } from "@/lib/agents/mansour";
import {
  buildMansourSystemPrompt,
  MANSOUR_SYSTEM_PROMPT,
} from "@/lib/agents/mansour";
import {
  buildSaherSystemPrompt,
  SAHER_SYSTEM_PROMPT,
} from "@/lib/saher/systemPrompt";

const DEFAULT_SESSION = { userId: "user-1", tenantId: "tenant-1" };
const DEFAULT_TENANT = {
  id: "tenant-1",
  companyName: "Test Co",
  subscriptionPlan: "basic",
};

function setDedicatedCopy(isDedicated: boolean) {
  mockIsDedicatedCopy.mockReturnValue(isDedicated);
}

beforeEach(() => {
  mockSession.mockResolvedValue(DEFAULT_SESSION);
  mockTenant.mockResolvedValue(DEFAULT_TENANT);
  prismaMock.user.count.mockResolvedValue(3);
  prismaMock.tenant.update.mockResolvedValue({ id: "tenant-1" });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getPlanLimitInfoAction in DEDICATED_COPY", () => {
  it("returns DEDICATED_COPY mode with null plan and limits", async () => {
    setDedicatedCopy(true);
    const result = await getPlanLimitInfoAction();

    expect(result).toMatchObject({
      mode: "DEDICATED_COPY",
      plan: null,
      limits: null,
      currentUsers: 3,
      staffLimit: null,
      includedInLicense: true,
    });
  });

  it("does not call getPlanLimits in DEDICATED_COPY", async () => {
    setDedicatedCopy(true);
    const { getPlanLimits } = await import("@/lib/plan-guard");
    await getPlanLimitInfoAction();
    expect(getPlanLimits).not.toHaveBeenCalled();
  });
});

describe("getPlanLimitInfoAction in SAAS", () => {
  it("returns plan and limits in SAAS mode", async () => {
    setDedicatedCopy(false);
    const result = await getPlanLimitInfoAction();

    expect(result).toMatchObject({
      plan: "BASIC",
      currentUsers: 3,
      staffLimit: 5,
    });
    expect((result as any).mode).toBeUndefined();
    expect((result as any).includedInLicense).toBeUndefined();
  });
});

describe("updateTenantPlanAction ordering", () => {
  it("blocks before validPlan in DEDICATED_COPY with an invalid plan", async () => {
    setDedicatedCopy(true);
    const result = await updateTenantPlanAction("tenant-1", "!!!invalid",);

    expect(result).toMatchObject({
      success: false,
      dedicatedCopyBlocked: true,
    });
  });

  it("does not write to Prisma in DEDICATED_COPY", async () => {
    setDedicatedCopy(true);
    await updateTenantPlanAction("tenant-1", "gold");

    expect(prismaMock.tenant.update).not.toHaveBeenCalled();
  });

  it("requires a valid plan in SAAS", async () => {
    setDedicatedCopy(false);
    const result = await updateTenantPlanAction("tenant-1", "!!!invalid");

    expect(result).toMatchObject({
      success: false,
    });
    expect((result as any).error).toBeDefined();
    expect(prismaMock.tenant.update).not.toHaveBeenCalled();
  });

  it("preserves SAAS subscriptionPlan update behavior", async () => {
    setDedicatedCopy(false);
    const result = await updateTenantPlanAction("tenant-1", "gold");

    expect(result).toMatchObject({ success: true });
    expect(prismaMock.tenant.update).toHaveBeenCalledWith({
      where: { id: "tenant-1" },
      data: { subscriptionPlan: "gold" },
    });
  });
});

describe("Mansour prompt separation", () => {
  const baseContext = {
    companyName: "Test Co",
    subscriptionPlan: "basic",
  };

  it("exports a SaaS-compatible MANSOUR_SYSTEM_PROMPT", () => {
    expect(MANSOUR_SYSTEM_PROMPT).toContain("4,999");
    expect(MANSOUR_SYSTEM_PROMPT).toContain("12,999");
    expect(MANSOUR_SYSTEM_PROMPT).toContain("Starter");
    expect(MANSOUR_SYSTEM_PROMPT).toContain("Professional");
    expect(MANSOUR_SYSTEM_PROMPT).toContain("Enterprise");
  });

  it("Dedicated prompt contains no SaaS prices or plan names", () => {
    const prompt = buildMansourSystemPrompt({
      ...baseContext,
      licenseMode: "DEDICATED_COPY",
    });

    expect(prompt).toContain("نسخة مستقلة مرخصة");
    expect(prompt).not.toContain("4,999");
    expect(prompt).not.toContain("12,999");
    expect(prompt).not.toContain("Starter");
    expect(prompt).not.toContain("Professional");
    expect(prompt).not.toContain("Enterprise");
    expect(prompt).not.toContain("الأسعار الرسمية");
    expect(prompt).not.toContain("السعر الشهري");
    expect(prompt).not.toContain("خصم سنوي");
    expect(prompt).not.toContain("الباقة الحالية");
    expect(prompt).not.toContain("basic");
  });

  it("SAAS Mansour prompt preserves pricing", () => {
    const prompt = buildMansourSystemPrompt({
      ...baseContext,
      licenseMode: "SAAS",
    });

    expect(prompt).toContain("4,999");
    expect(prompt).toContain("12,999");
    expect(prompt).toContain("Starter");
    expect(prompt).toContain("Professional");
    expect(prompt).toContain("Enterprise");
    expect(prompt).toContain("الباقة الحالية");
    expect(prompt).toContain("basic");
  });
});

describe("buildMansourFallbackResponse", () => {
  it("handles Dedicated price/installment questions correctly", () => {
    const reply = buildMansourFallbackResponse("كم سعر القسط؟", "DEDICATED_COPY");

    expect(reply).toContain("المشروع");
    expect(reply).toContain("الوحدة");
    expect(reply).toContain("خطط السداد");
    expect(reply).not.toContain("4,999");
    expect(reply).not.toContain("12,999");
    expect(reply).not.toContain("Starter");
    expect(reply).not.toContain("Professional");
    expect(reply).not.toContain("Enterprise");
    expect(reply).not.toContain("باقة");
  });

  it("Dedicated general fallback contains no package wording", () => {
    const reply = buildMansourFallbackResponse("مرحبا", "DEDICATED_COPY");

    expect(reply).not.toContain("باقة");
    expect(reply).not.toContain("اشتراك");
    expect(reply).not.toContain("Starter");
    expect(reply).not.toContain("Professional");
    expect(reply).not.toContain("Enterprise");
  });

  it("SAAS fallback preserves current pricing replies", () => {
    const reply = buildMansourFallbackResponse("كم سعر النظام؟", "SAAS");

    expect(reply).toContain("4,999");
    expect(reply).toContain("12,999");
    expect(reply).toContain("Starter");
    expect(reply).toContain("Professional");
    expect(reply).toContain("ثلاث باقات");
  });
});

describe("Saher prompt content", () => {
  const baseContext = {
    tenantId: "tenant-1",
    tenantName: "Test Co",
    tenantSubdomain: "testco",
    subscriptionPlan: "basic",
    availableAgents: [],
  };

  it("exports a SaaS-compatible SAHER_SYSTEM_PROMPT", () => {
    expect(SAHER_SYSTEM_PROMPT).toContain("حدود الباقة");
    expect(SAHER_SYSTEM_PROMPT).toContain("الباقة الحالية");
  });

  it("Dedicated prompt contains no 'حدود الباقة' or plan value", () => {
    const prompt = buildSaherSystemPrompt({
      ...baseContext,
      licenseMode: "DEDICATED_COPY",
    });

    expect(prompt).toContain("نسخة مستقلة مرخصة");
    expect(prompt).toContain("السعة التشغيلية");
    expect(prompt).not.toContain("حدود الباقة");
    expect(prompt).not.toContain("subscriptionPlan");
    expect(prompt).not.toContain("الباقة: basic");
    expect(prompt).not.toContain("الباقة: silver");
    expect(prompt).not.toContain("الباقة: gold");
    expect(prompt).not.toContain("الباقة الحالية");
  });

  it("SAAS Saher prompt preserves the plan and package-limit wording", () => {
    const prompt = buildSaherSystemPrompt({
      ...baseContext,
      licenseMode: "SAAS",
    });

    expect(prompt).toContain("حدود الباقة");
    expect(prompt).toContain("الباقة: basic");
  });
});
