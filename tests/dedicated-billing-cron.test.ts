import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockIsDedicatedCopy,
  mockRecordHeartbeat,
  mockRateLimit,
  mockCheckAndSuspend,
  mockSendAdminEmail,
  mockSendSMS,
  prismaMock,
} = vi.hoisted(() => {
  const mockIsDedicatedCopy = vi.fn();
  const mockRecordHeartbeat = vi.fn().mockResolvedValue({ success: true, status: "HEALTHY" });
  const mockRateLimit = vi.fn().mockResolvedValue({ allowed: true, remaining: 1, resetIn: 0 });
  const mockCheckAndSuspend = vi.fn().mockResolvedValue({ success: true, updatedCount: 0 });
  const mockSendAdminEmail = vi.fn().mockResolvedValue(undefined);
  const mockSendSMS = vi.fn().mockResolvedValue(undefined);
  const prismaMock = {
    tenant: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
    usageMeter: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    agentLease: { findMany: vi.fn().mockResolvedValue([]) },
    user: { groupBy: vi.fn().mockResolvedValue([]) },
    lead: { groupBy: vi.fn().mockResolvedValue([]) },
    project: { groupBy: vi.fn().mockResolvedValue([]) },
    auditLog: { createMany: vi.fn() },
  };
  return {
    mockIsDedicatedCopy,
    mockRecordHeartbeat,
    mockRateLimit,
    mockCheckAndSuspend,
    mockSendAdminEmail,
    mockSendSMS,
    prismaMock,
  };
});

vi.mock("@/lib/deployment-license", () => ({
  isDedicatedCopyDeployment: () => mockIsDedicatedCopy(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...args: any[]) => mockRateLimit(...args),
}));

vi.mock("@/lib/sentinel/heartbeat", () => ({
  recordHeartbeat: (...args: any[]) => mockRecordHeartbeat(...args),
}));

vi.mock("@/lib/server/internal", () => ({
  checkAndSuspendExpiredTenantsInternal: () => mockCheckAndSuspend(),
}));

vi.mock("@/lib/email", () => ({
  sendAdminEmailAlert: (...args: any[]) => mockSendAdminEmail(...args),
}));

vi.mock("@/lib/notifications", () => ({
  sendSMSNotification: (...args: any[]) => mockSendSMS(...args),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/http-error-response", () => ({
  httpErrorResponse: vi.fn((_req: any, _code: any, _msg: string) => ({
    json: () => Promise.resolve({ error: _msg }),
  })),
}));

vi.mock("@/lib/errors", () => ({
  ErrorCode: { INTERNAL_ERROR: "INTERNAL_ERROR" },
}));

import { GET } from "@/app/api/cron/billing/route";

function makeRequest(auth?: string) {
  return {
    headers: { get: (h: string) => (h === "authorization" ? (auth ?? null) : null) },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Billing Cron — DEDICATED_COPY", () => {
  it("rejects request without Authorization header", async () => {
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("rejects request with wrong Authorization", async () => {
    const res = await GET(makeRequest("Bearer wrong"));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns skipped=true in DEDICATED_COPY with correct auth", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.skipped).toBe(true);
    expect(body.mode).toBe("DEDICATED_COPY");
  });

  it("calls recordHeartbeat in DEDICATED_COPY before returning skipped", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    await GET(makeRequest("Bearer test-secret"));

    expect(mockRecordHeartbeat).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceId: "CRON_BILLING",
        metadata: expect.objectContaining({ mode: "DEDICATED_COPY", skipped: true }),
      }),
    );
  });

  it("does NOT call any billing Prisma operations in DEDICATED_COPY", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    await GET(makeRequest("Bearer test-secret"));

    expect(mockCheckAndSuspend).not.toHaveBeenCalled();
    expect(prismaMock.tenant.findMany).not.toHaveBeenCalled();
    expect(prismaMock.usageMeter.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.agentLease.findMany).not.toHaveBeenCalled();
    expect(mockSendSMS).not.toHaveBeenCalled();
    expect(mockSendAdminEmail).not.toHaveBeenCalled();
  });

  it("still returns skipped even if heartbeat fails", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    mockRecordHeartbeat.mockRejectedValueOnce(new Error("DB down"));

    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.skipped).toBe(true);
  });

  it("SaaS mode does NOT return skipped", async () => {
    mockIsDedicatedCopy.mockReturnValue(false);
    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();

    expect(body.skipped).toBeUndefined();
    expect(body.success).toBe(true);
    expect(mockCheckAndSuspend).toHaveBeenCalled();
  });
});
