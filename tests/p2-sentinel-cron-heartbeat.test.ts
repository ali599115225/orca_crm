import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import path from "node:path";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
  tenantCount: vi.fn(),
  usageMeterCount: vi.fn(),
  executeRawUnsafe: vi.fn(),
  queryRawUnsafe: vi.fn(),
  rateLimit: vi.fn(),
  sendAdminEmailAlert: vi.fn(),
  recordHeartbeat: vi.fn(),
  reconcileStaleHeartbeats: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    $disconnect: mocks.disconnect,
    $connect: mocks.connect,
    tenant: {
      count: mocks.tenantCount,
    },
    usageMeter: {
      count: mocks.usageMeterCount,
      fields: {
        limitValue: 100,
      },
    },
  },
  rawPrisma: {
    $executeRawUnsafe: mocks.executeRawUnsafe,
    $queryRawUnsafe: mocks.queryRawUnsafe,
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
}));

vi.mock("@/lib/email", () => ({
  sendAdminEmailAlert: mocks.sendAdminEmailAlert,
}));

vi.mock("@/lib/sentinel/heartbeat", () => ({
  recordHeartbeat: mocks.recordHeartbeat,
  reconcileStaleHeartbeats: mocks.reconcileStaleHeartbeats,
}));

import { GET as sentinelCron } from "@/app/api/cron/sentinel/route";
import { GET as sentinelHeartbeatCron } from "@/app/api/cron/sentinel-heartbeats/route";
import { GET as retentionCron } from "@/app/api/cron/retention/route";

function cronRequest(path: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: { authorization: "Bearer test-cron-secret" },
  });
}

describe("P2-B2c Sentinel cron heartbeat integration", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rateLimit.mockResolvedValue({ allowed: true });
    mocks.sendAdminEmailAlert.mockResolvedValue(undefined);
    mocks.recordHeartbeat.mockResolvedValue({ success: true, serviceId: "CRON_SENTINEL", status: "HEALTHY" });
    mocks.reconcileStaleHeartbeats.mockResolvedValue({
      success: true,
      changedServices: ["CRON_BILLING"],
      skippedServices: [],
    });
  });

  afterEach(() => {
    consoleError.mockRestore();
    vi.unstubAllEnvs();
  });

  it("does not send CRON_SENTINEL heartbeat when a core sentinel check fails", async () => {
    mocks.queryRaw.mockResolvedValue([{ ok: 1 }]);
    mocks.tenantCount.mockRejectedValue(new Error("tenant check failed"));
    mocks.usageMeterCount.mockResolvedValue(0);

    const response = await sentinelCron(cronRequest("/api/cron/sentinel"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.report.anomalies).toContain("❌ فشل فحص الشركات المعلقة ذات المشاريع النشطة.");
    expect(mocks.recordHeartbeat).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Sentinel cron suspended tenant project check failed:",
      expect.any(Error),
    );
  });

  it("does not send CRON_RETENTION heartbeat when a retention operation fails", async () => {
    mocks.executeRawUnsafe
      .mockRejectedValueOnce(new Error("cleanup failed"))
      .mockResolvedValue(0);
    mocks.queryRawUnsafe.mockResolvedValue([{ count: 0n }]);

    const response = await retentionCron(cronRequest("/api/cron/retention"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.report.operations).toContainEqual({
      table: "failed_login_attempts",
      action: "ERROR",
      count: 0,
      error: "cleanup failed",
    });
    expect(mocks.recordHeartbeat).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Retention cron failed_login_attempts cleanup failed:",
      expect.any(Error),
    );
  });

  it("runs heartbeat reconciliation from an independent cron and returns non-success on failure", async () => {
    const success = await sentinelHeartbeatCron(cronRequest("/api/cron/sentinel-heartbeats"));
    const successBody = await success.json();

    expect(success.status).toBe(200);
    expect(successBody).toEqual({
      success: true,
      changedServices: ["CRON_BILLING"],
      skippedServices: [],
    });
    expect(mocks.rateLimit).toHaveBeenLastCalledWith("cron:sentinel-heartbeats", 1, 300000);
    expect(mocks.reconcileStaleHeartbeats).toHaveBeenCalledTimes(1);

    mocks.reconcileStaleHeartbeats.mockRejectedValueOnce(new Error("reconcile failed"));

    const failure = await sentinelHeartbeatCron(cronRequest("/api/cron/sentinel-heartbeats"));
    const failureBody = await failure.json();

    expect(failure.status).toBe(500);
    expect(failureBody).toEqual({
      success: false,
      error: "Sentinel heartbeat reconciliation failed",
    });
    expect(mocks.reconcileStaleHeartbeats).toHaveBeenCalledTimes(2);
    expect(consoleError).toHaveBeenCalledWith(
      "Sentinel heartbeat reconciliation cron failed:",
      expect.any(Error),
    );
  });

  it("schedules the independent heartbeat reconciliation cron in Vercel", () => {
    const vercelConfig = JSON.parse(
      readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"),
    );

    expect(vercelConfig.crons).toContainEqual({
      path: "/api/cron/sentinel-heartbeats",
      schedule: "0 * * * *",
    });
  });
});
