/**
 * P2-B2c Batch 1A — Sentinel Heartbeat domain service
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  heartbeatFindUnique: vi.fn(),
  heartbeatFindMany: vi.fn(),
  heartbeatCreate: vi.fn(),
  heartbeatUpdateMany: vi.fn(),
  incidentFindFirst: vi.fn(),
  incidentFindUnique: vi.fn(),
  createIncident: vi.fn(),
  acknowledgeIncident: vi.fn(),
  resolveIncident: vi.fn(),
  writeSentinelAudit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sentinelHeartbeat: {
      findUnique: mocks.heartbeatFindUnique,
      findMany: mocks.heartbeatFindMany,
      create: mocks.heartbeatCreate,
      updateMany: mocks.heartbeatUpdateMany,
    },
    sentinelIncident: {
      findFirst: mocks.incidentFindFirst,
      findUnique: mocks.incidentFindUnique,
    },
    $disconnect: vi.fn(),
    $connect: vi.fn(),
  },
}));

vi.mock("@/lib/sentinel/audit", () => ({
  writeSentinelAudit: (...args: unknown[]) => {
    mocks.writeSentinelAudit(...args);
    return Promise.resolve();
  },
}));

vi.mock("@/lib/sentinel/incident", () => ({
  createIncident: (...args: unknown[]) => mocks.createIncident(...args),
  acknowledgeIncident: (...args: unknown[]) => mocks.acknowledgeIncident(...args),
  resolveIncident: (...args: unknown[]) => mocks.resolveIncident(...args),
}));

import { recordHeartbeat, reconcileStaleHeartbeats } from "@/lib/sentinel/heartbeat";
import {
  HEARTBEAT_SERVICES,
  getHeartbeatServiceConfig,
  normalizeHeartbeatServiceId,
  type HeartbeatServicesConfig,
} from "@/lib/sentinel/heartbeat-config";

const DOCUMENTED_HEARTBEAT_SERVICE_IDS = [
  "CRON_BILLING",
  "CRON_SENTINEL",
  "CRON_ZATCA",
  "CRON_SANAD_INSTALLMENTS",
  "CRON_RETENTION",
  "CRON_REALTIME_RETENTION",
] as const;

const SERVICES = Object.freeze({
  API_WORKER: { expectedIntervalSeconds: 10 },
  BILLING_CRON: { expectedIntervalSeconds: 30 },
});

const NOW = new Date("2026-06-30T12:00:00.000Z");

function heartbeat(overrides: Record<string, unknown> = {}) {
  return {
    serviceId: "API_WORKER",
    status: "HEALTHY",
    lastSeenAt: new Date(NOW.getTime() - 1_000),
    version: null,
    metadata: null,
    ...overrides,
  };
}

function activeIncident(overrides: Record<string, unknown> = {}) {
  return {
    id: "inc-heartbeat",
    status: "OPEN",
    ...overrides,
  };
}

function assertPublicConfigIsReadonly(config: HeartbeatServicesConfig): void {
  if (Date.now() < 0) {
    // @ts-expect-error expectedIntervalSeconds is readonly on the public config type.
    config.CRON_BILLING.expectedIntervalSeconds = 1;
    // @ts-expect-error service entries are readonly on the public config type.
    config.CRON_BILLING = { expectedIntervalSeconds: 1 };
  }
}

describe("P2-B2c Batch 1A — Sentinel Heartbeat service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mocks.incidentFindFirst.mockResolvedValue(null);
    mocks.createIncident.mockResolvedValue({
      success: true,
      incident: activeIncident(),
    });
    mocks.resolveIncident.mockResolvedValue({ success: true, incident: activeIncident({ status: "RESOLVED" }) });
    mocks.acknowledgeIncident.mockResolvedValue({ success: true, incident: activeIncident({ status: "ACKNOWLEDGED" }) });
    mocks.incidentFindUnique.mockResolvedValue(activeIncident({ status: "RESOLVED" }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("recognizes exactly the six documented heartbeat service IDs", () => {
    expect(Object.keys(HEARTBEAT_SERVICES).sort()).toEqual([...DOCUMENTED_HEARTBEAT_SERVICE_IDS].sort());

    for (const serviceId of DOCUMENTED_HEARTBEAT_SERVICE_IDS) {
      expect(getHeartbeatServiceConfig(serviceId)).toEqual({ expectedIntervalSeconds: 86400 });
    }
  });

  it("rejects unknown service IDs from the default heartbeat service configuration", () => {
    expect(getHeartbeatServiceConfig("CRON_REVENUE_INTEGRITY")).toBeNull();
    expect(getHeartbeatServiceConfig("API_WORKER")).toBeNull();
    expect(getHeartbeatServiceConfig("")).toBeNull();
  });

  it("normalizes documented service IDs before lookup", () => {
    expect(normalizeHeartbeatServiceId(" cron_sanad_installments ")).toBe("CRON_SANAD_INSTALLMENTS");
    expect(getHeartbeatServiceConfig(" cron_sanad_installments ")).toEqual({ expectedIntervalSeconds: 86400 });
  });

  it("keeps all configured heartbeat intervals at 86400 seconds", () => {
    expect(Object.values(HEARTBEAT_SERVICES).map((config) => config.expectedIntervalSeconds)).toEqual([
      86400,
      86400,
      86400,
      86400,
      86400,
      86400,
    ]);
  });

  it("does not expose mutable heartbeat service configuration through the public type", () => {
    assertPublicConfigIsReadonly(HEARTBEAT_SERVICES);
    expect(Object.isFrozen(HEARTBEAT_SERVICES)).toBe(true);

    for (const serviceId of DOCUMENTED_HEARTBEAT_SERVICE_IDS) {
      expect(Object.isFrozen(HEARTBEAT_SERVICES[serviceId])).toBe(true);
    }
  });

  it("creates a HEALTHY row with server time for the first valid ping", async () => {
    mocks.heartbeatFindUnique.mockResolvedValue(null);
    mocks.heartbeatCreate.mockResolvedValue(heartbeat());

    const result = await recordHeartbeat(
      { serviceId: " api_worker ", version: "v1.2.3", metadata: { node: "primary" } },
      { services: SERVICES },
    );

    expect(result.success).toBe(true);
    expect(mocks.heartbeatCreate).toHaveBeenCalledWith({
      data: {
        serviceId: "API_WORKER",
        status: "HEALTHY",
        lastSeenAt: NOW,
        version: "v1.2.3",
        metadata: { node: "primary" },
      },
    });
  });

  it("omits metadata on create when metadata is not provided", async () => {
    mocks.heartbeatFindUnique.mockResolvedValue(null);
    mocks.heartbeatCreate.mockResolvedValue(heartbeat());

    const result = await recordHeartbeat(
      { serviceId: "API_WORKER", version: "v1.2.3" },
      { services: SERVICES },
    );

    expect(result.success).toBe(true);
    expect(mocks.heartbeatCreate.mock.calls[0][0].data).toEqual({
      serviceId: "API_WORKER",
      status: "HEALTHY",
      lastSeenAt: NOW,
      version: "v1.2.3",
    });
    expect(mocks.heartbeatCreate.mock.calls[0][0].data).not.toHaveProperty("metadata");
  });

  it("rejects unknown serviceId before database writes", async () => {
    const result = await recordHeartbeat({ serviceId: "unknown", version: "abcdef1" }, { services: SERVICES });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unknown/i);
    expect(mocks.heartbeatFindUnique).not.toHaveBeenCalled();
    expect(mocks.heartbeatCreate).not.toHaveBeenCalled();
    expect(mocks.heartbeatUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects public status, interval, and client lastSeenAt inputs", async () => {
    for (const forbidden of ["status", "expectedIntervalSeconds", "lastSeenAt"] as const) {
      const result = await recordHeartbeat(
        { serviceId: "API_WORKER", [forbidden]: forbidden } as any,
        { services: SERVICES },
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain(forbidden);
    }
    expect(mocks.heartbeatFindUnique).not.toHaveBeenCalled();
  });

  it("rejects invalid version values", async () => {
    const result = await recordHeartbeat(
      { serviceId: "API_WORKER", version: "release candidate" },
      { services: SERVICES },
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/version/i);
    expect(mocks.heartbeatFindUnique).not.toHaveBeenCalled();
  });

  it("rejects oversized metadata", async () => {
    const result = await recordHeartbeat(
      { serviceId: "API_WORKER", version: "abcdef1", metadata: { payload: "x".repeat(10_241) } },
      { services: SERVICES },
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/10 KB/i);
    expect(mocks.heartbeatFindUnique).not.toHaveBeenCalled();
  });

  it("rejects cyclic object metadata deterministically", async () => {
    const metadata: Record<string, unknown> = {};
    metadata.self = metadata;

    const result = await recordHeartbeat(
      { serviceId: "API_WORKER", version: "abcdef1", metadata },
      { services: SERVICES },
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/cyclic/i);
    expect(mocks.heartbeatFindUnique).not.toHaveBeenCalled();
  });

  it("rejects cyclic array metadata deterministically", async () => {
    const items: unknown[] = [];
    items.push(items);

    const result = await recordHeartbeat(
      { serviceId: "API_WORKER", version: "abcdef1", metadata: { items } },
      { services: SERVICES },
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/cyclic/i);
    expect(mocks.heartbeatFindUnique).not.toHaveBeenCalled();
  });

  it("accepts metadata at the maximum supported nesting boundary", async () => {
    mocks.heartbeatFindUnique.mockResolvedValue(null);
    mocks.heartbeatCreate.mockResolvedValue(heartbeat());

    const result = await recordHeartbeat(
      { serviceId: "API_WORKER", version: "abcdef1", metadata: { a: { b: { c: "ok" } } } },
      { services: SERVICES },
    );

    expect(result.success).toBe(true);
    expect(mocks.heartbeatCreate.mock.calls[0][0].data.metadata).toEqual({ a: { b: { c: "ok" } } });
  });

  it("rejects metadata exceeding the nesting boundary", async () => {
    const result = await recordHeartbeat(
      { serviceId: "API_WORKER", version: "abcdef1", metadata: { a: { b: { c: { d: "too-deep" } } } } },
      { services: SERVICES },
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/depth 3/i);
    expect(mocks.heartbeatFindUnique).not.toHaveBeenCalled();
  });

  it("moves HEALTHY to DEGRADED at the 2x threshold", async () => {
    mocks.heartbeatFindMany.mockResolvedValue([
      heartbeat({ lastSeenAt: new Date(NOW.getTime() - 20_000) }),
    ]);
    mocks.heartbeatUpdateMany.mockResolvedValue({ count: 1 });

    await reconcileStaleHeartbeats({ services: SERVICES });

    expect(mocks.heartbeatUpdateMany).toHaveBeenCalledWith({
      where: {
        serviceId: "API_WORKER",
        status: "HEALTHY",
        lastSeenAt: new Date(NOW.getTime() - 20_000),
      },
      data: { status: "DEGRADED" },
    });
    expect(mocks.writeSentinelAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        beforeState: "HEALTHY",
        afterState: "DEGRADED",
        source: "SYSTEM",
        reason: "Sentinel heartbeat reconciliation",
      }),
    );
    expect(mocks.createIncident).not.toHaveBeenCalled();
  });

  it("moves DEGRADED to DOWN at the 3x threshold", async () => {
    mocks.heartbeatFindMany.mockResolvedValue([
      heartbeat({ status: "DEGRADED", lastSeenAt: new Date(NOW.getTime() - 30_000) }),
    ]);
    mocks.heartbeatUpdateMany.mockResolvedValue({ count: 1 });
    mocks.heartbeatFindUnique.mockResolvedValue(
      heartbeat({ status: "DOWN", lastSeenAt: new Date(NOW.getTime() - 30_000) }),
    );

    await reconcileStaleHeartbeats({ services: SERVICES });

    expect(mocks.heartbeatUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "DOWN" } }),
    );
    expect(mocks.writeSentinelAudit).toHaveBeenCalledWith(
      expect.objectContaining({ beforeState: "DEGRADED", afterState: "DOWN" }),
    );
    expect(mocks.createIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "HIGH",
        affectedService: "API_WORKER",
        fingerprint: "heartbeat:API_WORKER",
      }),
    );
  });

  it("does not transition, audit, or create incident when a ping wins the reconciliation race", async () => {
    mocks.heartbeatFindMany.mockResolvedValue([
      heartbeat({ lastSeenAt: new Date(NOW.getTime() - 30_000) }),
    ]);
    mocks.heartbeatUpdateMany.mockResolvedValue({ count: 0 });

    await reconcileStaleHeartbeats({ services: SERVICES });

    expect(mocks.heartbeatUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.writeSentinelAudit).not.toHaveBeenCalled();
    expect(mocks.createIncident).not.toHaveBeenCalled();
  });

  it("handles the P2002 incident idempotency fallback and converges on the active incident", async () => {
    const staleDown = heartbeat({ status: "DOWN", lastSeenAt: new Date(NOW.getTime() - 30_000) });
    mocks.heartbeatFindMany.mockResolvedValue([staleDown]);
    mocks.heartbeatFindUnique.mockResolvedValue(staleDown);
    mocks.incidentFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(activeIncident());
    mocks.createIncident
      .mockResolvedValueOnce({ success: true, incident: activeIncident() })
      .mockRejectedValueOnce({ code: "P2002" });

    await reconcileStaleHeartbeats({ services: SERVICES });
    await reconcileStaleHeartbeats({ services: SERVICES });

    expect(mocks.createIncident).toHaveBeenCalledTimes(2);
    expect(mocks.incidentFindFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          fingerprint: "heartbeat:API_WORKER",
          status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] },
        },
      }),
    );
  });

  it("retries incident creation for an existing DOWN row without an incident", async () => {
    const staleDown = heartbeat({ status: "DOWN", lastSeenAt: new Date(NOW.getTime() - 30_000) });
    mocks.heartbeatFindMany.mockResolvedValue([staleDown]);
    mocks.heartbeatFindUnique.mockResolvedValue(staleDown);
    mocks.incidentFindFirst.mockResolvedValue(null);

    await reconcileStaleHeartbeats({ services: SERVICES });

    expect(mocks.heartbeatUpdateMany).not.toHaveBeenCalled();
    expect(mocks.createIncident).toHaveBeenCalledTimes(1);
  });

  it("resolves a late incident created after a recovery ping", async () => {
    const staleDown = heartbeat({ status: "DOWN", lastSeenAt: new Date(NOW.getTime() - 30_000) });
    mocks.heartbeatFindMany.mockResolvedValue([staleDown]);
    mocks.heartbeatFindUnique.mockResolvedValue(
      heartbeat({ status: "HEALTHY", lastSeenAt: NOW }),
    );
    mocks.incidentFindFirst.mockResolvedValue(null);
    mocks.createIncident.mockResolvedValue({ success: true, incident: activeIncident() });
    mocks.incidentFindUnique.mockResolvedValue(activeIncident({ status: "OPEN" }));

    await reconcileStaleHeartbeats({ services: SERVICES });

    expect(mocks.acknowledgeIncident).toHaveBeenCalledWith("inc-heartbeat");
    expect(mocks.resolveIncident).toHaveBeenCalledWith("inc-heartbeat");
  });

  it("retries failed recovery resolution on a later healthy ping", async () => {
    const downLastSeenAt = new Date(NOW.getTime() - 30_000);
    const healthyLastSeenAt = new Date(NOW.getTime() - 1_000);

    mocks.heartbeatFindUnique
      .mockResolvedValueOnce(heartbeat({ status: "DOWN", lastSeenAt: downLastSeenAt }))
      .mockResolvedValueOnce(heartbeat({ status: "HEALTHY", lastSeenAt: healthyLastSeenAt }));
    mocks.heartbeatUpdateMany.mockResolvedValue({ count: 1 });
    mocks.incidentFindFirst.mockResolvedValue(activeIncident());
    mocks.resolveIncident
      .mockResolvedValueOnce({ success: false, error: "temporary failure" })
      .mockResolvedValueOnce({ success: true, incident: activeIncident({ status: "RESOLVED" }) });
    mocks.incidentFindUnique.mockResolvedValue(activeIncident({ status: "OPEN" }));

    await recordHeartbeat({ serviceId: "API_WORKER", version: "abcdef1" }, { services: SERVICES });
    await recordHeartbeat({ serviceId: "API_WORKER", version: "abcdef1" }, { services: SERVICES });

    expect(mocks.heartbeatUpdateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: {
        serviceId: "API_WORKER",
        status: "DOWN",
        lastSeenAt: downLastSeenAt,
      },
    }));
    expect(mocks.heartbeatUpdateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: {
        serviceId: "API_WORKER",
        status: "HEALTHY",
        lastSeenAt: healthyLastSeenAt,
      },
    }));
    expect(mocks.resolveIncident).toHaveBeenCalledTimes(2);
    expect(mocks.resolveIncident).toHaveBeenNthCalledWith(1, "inc-heartbeat");
    expect(mocks.resolveIncident).toHaveBeenNthCalledWith(2, "inc-heartbeat");
  });

  it("preserves existing metadata when metadata is omitted during update", async () => {
    const existingLastSeenAt = new Date(NOW.getTime() - 1_000);
    mocks.heartbeatFindUnique.mockResolvedValue(
      heartbeat({ status: "HEALTHY", lastSeenAt: existingLastSeenAt, metadata: { node: "primary" } }),
    );
    mocks.heartbeatUpdateMany.mockResolvedValue({ count: 1 });

    const result = await recordHeartbeat(
      { serviceId: "API_WORKER", version: "abcdef1" },
      { services: SERVICES },
    );

    expect(result.success).toBe(true);
    expect(mocks.heartbeatUpdateMany).toHaveBeenCalledWith({
      where: {
        serviceId: "API_WORKER",
        status: "HEALTHY",
        lastSeenAt: existingLastSeenAt,
      },
      data: {
        status: "HEALTHY",
        lastSeenAt: NOW,
        version: "abcdef1",
      },
    });
    expect(mocks.heartbeatUpdateMany.mock.calls[0][0].data).not.toHaveProperty("metadata");
  });

  it("writes only one recovery audit for two racing recovery pings", async () => {
    mocks.heartbeatFindUnique
      .mockResolvedValueOnce(heartbeat({ status: "DOWN" }))
      .mockResolvedValueOnce(heartbeat({ status: "DOWN" }))
      .mockResolvedValueOnce(heartbeat({ status: "HEALTHY" }));
    mocks.heartbeatUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    await recordHeartbeat({ serviceId: "API_WORKER", version: "abcdef1" }, { services: SERVICES });
    await recordHeartbeat({ serviceId: "API_WORKER", version: "abcdef1" }, { services: SERVICES });

    expect(mocks.writeSentinelAudit).toHaveBeenCalledTimes(1);
    expect(mocks.writeSentinelAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        beforeState: "DOWN",
        afterState: "HEALTHY",
        source: "HEARTBEAT",
        reason: "Healthy heartbeat received",
      }),
    );
  });

  it("does not resolve manual incidents or incidents with a different fingerprint", async () => {
    mocks.heartbeatFindUnique.mockResolvedValue(heartbeat({ status: "DOWN" }));
    mocks.heartbeatUpdateMany.mockResolvedValue({ count: 1 });
    mocks.incidentFindFirst.mockResolvedValue(null);

    await recordHeartbeat({ serviceId: "API_WORKER", version: "abcdef1" }, { services: SERVICES });

    expect(mocks.incidentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          fingerprint: "heartbeat:API_WORKER",
          status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] },
        },
      }),
    );
    expect(mocks.resolveIncident).not.toHaveBeenCalled();
  });

  it("never creates an incident for DEGRADED", async () => {
    mocks.heartbeatFindMany.mockResolvedValue([
      heartbeat({ lastSeenAt: new Date(NOW.getTime() - 20_000) }),
    ]);
    mocks.heartbeatUpdateMany.mockResolvedValue({ count: 1 });

    await reconcileStaleHeartbeats({ services: SERVICES });

    expect(mocks.createIncident).not.toHaveBeenCalled();
  });

  it("never restores HEALTHY during reconciliation", async () => {
    mocks.heartbeatFindMany.mockResolvedValue([
      heartbeat({ status: "DOWN", lastSeenAt: new Date(NOW.getTime() - 25_000) }),
    ]);

    await reconcileStaleHeartbeats({ services: SERVICES });

    expect(mocks.heartbeatUpdateMany).not.toHaveBeenCalled();
    expect(mocks.writeSentinelAudit).not.toHaveBeenCalledWith(
      expect.objectContaining({ afterState: "HEALTHY" }),
    );
  });
});
