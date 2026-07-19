import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  process.env.CRON_SECRET = "cron-secret";
  return {
    rateLimit: vi.fn(),
    resolveScope: vi.fn(),
    runWithTenantContext: vi.fn(
      async (_context: unknown, operation: () => Promise<unknown>) => operation(),
    ),
    queueFindMany: vi.fn(),
    queueCount: vi.fn(),
    submitReporting: vi.fn(),
    submitClearance: vi.fn(),
    recordHeartbeat: vi.fn(),
  };
});

vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/lib/system-prisma-boundary", () => ({
  cronResolveSingleActiveCompanyScope: mocks.resolveScope,
}));
vi.mock("@/lib/tenant-context", () => ({
  runWithTenantContext: mocks.runWithTenantContext,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    zatcaQueue: {
      findMany: mocks.queueFindMany,
      count: mocks.queueCount,
      update: vi.fn(),
    },
    zatcaDevice: { findFirst: vi.fn() },
    invoice: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/zatca/api", () => ({
  submitReporting: mocks.submitReporting,
  submitClearance: mocks.submitClearance,
}));
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/lib/sentinel/heartbeat", () => ({
  recordHeartbeat: mocks.recordHeartbeat,
}));

import { GET } from "@/app/api/cron/zatca/route";

function request() {
  return new Request("https://orca.test/api/cron/zatca", {
    headers: { authorization: "Bearer cron-secret" },
  }) as any;
}

describe("ZATCA cron owner gate and company scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ORCA_ZATCA_CRON_ENABLED;
    mocks.rateLimit.mockResolvedValue({ allowed: true, resetIn: 300000 });
    mocks.resolveScope.mockResolvedValue({ status: "READY", tenantId: "company-1" });
    mocks.queueFindMany.mockResolvedValue([]);
    mocks.queueCount.mockResolvedValue(0);
    mocks.recordHeartbeat.mockResolvedValue({ success: true });
  });

  it("defaults to NOT_CONFIGURED before database or provider work", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      skipped: true,
      code: "ZATCA_NOT_CONFIGURED",
      processed: 0,
    });
    expect(mocks.resolveScope).not.toHaveBeenCalled();
    expect(mocks.queueFindMany).not.toHaveBeenCalled();
    expect(mocks.submitReporting).not.toHaveBeenCalled();
    expect(mocks.submitClearance).not.toHaveBeenCalled();
  });

  it("fails closed when legacy data has multiple active company scopes", async () => {
    process.env.ORCA_ZATCA_CRON_ENABLED = "true";
    mocks.resolveScope.mockResolvedValue({ status: "AMBIGUOUS", tenantId: null });

    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(mocks.queueFindMany).not.toHaveBeenCalled();
    expect(mocks.submitReporting).not.toHaveBeenCalled();
  });

  it("enters the verified company scope and filters the queue when explicitly enabled", async () => {
    process.env.ORCA_ZATCA_CRON_ENABLED = "true";

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(mocks.runWithTenantContext).toHaveBeenCalledWith(
      { tenantId: "company-1" },
      expect.any(Function),
    );
    expect(mocks.queueFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "company-1" }),
      }),
    );
    expect(mocks.submitReporting).not.toHaveBeenCalled();
    expect(mocks.submitClearance).not.toHaveBeenCalled();
  });
});
