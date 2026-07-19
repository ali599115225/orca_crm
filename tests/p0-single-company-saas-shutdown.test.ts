import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { prismaMock, rateLimitMock, initiatePaymentMock } = vi.hoisted(() => ({
  prismaMock: {
    tenant: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: { create: vi.fn(), update: vi.fn() },
    project: { create: vi.fn() },
    lead: { create: vi.fn() },
    task: { create: vi.fn() },
    usageMeter: { updateMany: vi.fn() },
    agentLease: { findMany: vi.fn() },
    auditLog: { create: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  },
  rateLimitMock: vi.fn(
    async (_key: string, _limit: number, _windowMs: number) => ({
      allowed: true,
    }),
  ),
  initiatePaymentMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
  rawPrisma: prismaMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (key: string, limit: number, windowMs: number) =>
    rateLimitMock(key, limit, windowMs),
}));

vi.mock("@/lib/payments/service", () => ({
  initiatePayment: (...args: unknown[]) => initiatePaymentMock(...args),
}));

vi.mock("@/lib/deployment-license", () => ({
  getDeploymentLicenseMode: () => "SAAS",
  isDedicatedCopyDeployment: () => false,
}));

import { registerTenantAction } from "@/app/actions/register";
import {
  getAvailableProvidersAction,
  initiateAddonPaymentAction,
  initiateSubscriptionPaymentAction,
} from "@/app/actions/payment";
import { GET as runBillingCron } from "@/app/api/cron/billing/route";
import {
  checkAndSuspendExpiredTenantsInternal,
  handleSuccessfulPaymentInternal,
} from "@/lib/server/internal";
import { assertPlanLimit, canUseFeature } from "@/lib/plan-guard";
import {
  LEGACY_SAAS_OUT_OF_SCOPE,
  ORCA_PLATFORM_MODEL,
} from "@/lib/platform-operating-model";

function billingRequest(authorization?: string) {
  return {
    headers: {
      get: (name: string) =>
        name === "authorization" ? authorization ?? null : null,
    },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "p0-test-secret";
});

describe("P0 single-company operating boundary", () => {
  it("keeps the legacy SaaS switch permanently disabled", () => {
    expect(ORCA_PLATFORM_MODEL).toMatchObject({
      businessModel: "SINGLE_INDEPENDENT_COMPANY",
      platformModel: "INTERNAL_COMPANY_OPERATING_PLATFORM",
      legacySaasEnabled: false,
      externalIntegrationsDefaultState: "NOT_CONFIGURED",
    });
  });

  it("rejects tenant registration without database or session side effects", async () => {
    const result = await registerTenantAction(new FormData());

    expect(result).toMatchObject({
      success: false,
      code: LEGACY_SAAS_OUT_OF_SCOPE,
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.tenant.create).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("rejects subscription and add-on purchases before provider execution", async () => {
    const subscription = await initiateSubscriptionPaymentAction(
      "gold",
      "MOYASAR",
    );
    const addon = await initiateAddonPaymentAction(3, "MOYASAR");

    expect(subscription).toMatchObject({
      success: false,
      code: LEGACY_SAAS_OUT_OF_SCOPE,
    });
    expect(addon).toMatchObject({
      success: false,
      code: LEGACY_SAAS_OUT_OF_SCOPE,
    });
    expect(initiatePaymentMock).not.toHaveBeenCalled();
  });

  it("reports no SaaS upgrade providers and a safe configuration state", async () => {
    await expect(getAvailableProvidersAction()).resolves.toMatchObject({
      providers: [],
      default: null,
      state: "NOT_CONFIGURED",
      code: LEGACY_SAAS_OUT_OF_SCOPE,
    });
  });

  it("keeps the retired billing cron authenticated but side-effect free", async () => {
    const response = await runBillingCron(
      billingRequest("Bearer p0-test-secret"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      skipped: true,
      code: LEGACY_SAAS_OUT_OF_SCOPE,
    });
    expect(prismaMock.tenant.findMany).not.toHaveBeenCalled();
    expect(prismaMock.tenant.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.agentLease.findMany).not.toHaveBeenCalled();
  });

  it("never changes credentials or company state after a SaaS payment callback", async () => {
    const activation = await handleSuccessfulPaymentInternal(
      "company-1",
      "gold",
      "MONTHLY",
    );
    const suspension = await checkAndSuspendExpiredTenantsInternal();

    expect(activation).toMatchObject({
      success: false,
      code: LEGACY_SAAS_OUT_OF_SCOPE,
    });
    expect(suspension).toMatchObject({
      success: true,
      skipped: true,
      updatedCount: 0,
    });
    expect(prismaMock.tenant.update).not.toHaveBeenCalled();
    expect(prismaMock.tenant.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("does not enforce legacy package limits even if license code says SAAS", async () => {
    const tx = {
      $queryRaw: vi.fn(),
      tenant: { findUnique: vi.fn() },
      lead: { count: vi.fn() },
      user: { count: vi.fn() },
      project: { count: vi.fn() },
      agentSlot: { count: vi.fn() },
    };

    await assertPlanLimit({
      tenantId: "company-1",
      feature: "staff",
      tx: tx as any,
    });
    await expect(
      canUseFeature({ tenantId: "company-1", feature: "whatsapp" }),
    ).resolves.toBe(true);

    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.tenant.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.tenant.findUnique).not.toHaveBeenCalled();
  });
});
