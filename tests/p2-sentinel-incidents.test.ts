/**
 * P2 — Sentinel Incident Foundation
 *
 * 1. creates platform-global incident
 * 2. creates tenant-related incident
 * 3. rejects missing/invalid title
 * 4. sanitizes sensitive diagnostic metadata
 * 5. lists only active incidents
 * 6. tenant filter prevents cross-tenant reads
 * 7. OPEN → ACKNOWLEDGED sets acknowledgedAt
 * 8. invalid backwards transition is rejected
 * 9. terminal incident cannot reopen
 * 10. resolve sets resolvedAt
 * 11. false-positive sets resolvedAt
 * 12. concurrent transition succeeds once
 * 13. escalation cannot move backward
 * 14. deletion relations do not cascade
 * 15. no Tenant ADMIN authorization is introduced
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const mocks = vi.hoisted(() => ({
  tenantFindFirst: vi.fn(),
  sentinelIncidentCreate: vi.fn(),
  sentinelIncidentFindUnique: vi.fn(),
  sentinelIncidentFindMany: vi.fn(),
  sentinelIncidentUpdateMany: vi.fn(),
  writeSentinelAudit: vi.fn(),
}));

// ============================================================================
// Module mocks
// ============================================================================

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: {
      findFirst: mocks.tenantFindFirst,
    },
    sentinelIncident: {
      create: mocks.sentinelIncidentCreate,
      findUnique: mocks.sentinelIncidentFindUnique,
      findMany: mocks.sentinelIncidentFindMany,
      updateMany: mocks.sentinelIncidentUpdateMany,
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

// ============================================================================
// Subject imports
// ============================================================================

import {
  createIncident,
  getIncidentById,
  listActiveIncidents,
  acknowledgeIncident,
  startIncidentWork,
  resolveIncident,
  markIncidentFalsePositive,
  assignIncident,
  escalateIncident,
} from "@/lib/sentinel/incident";

// ============================================================================
// Helpers
// ============================================================================

function makeIncident(overrides: Record<string, unknown> = {}) {
  return {
    id: "inc-001",
    tenantId: null,
    title: "Test incident",
    summary: null,
    severity: "MEDIUM",
    status: "OPEN",
    escalationLevel: "SENTINEL",
    affectedService: null,
    diagnosticMetadata: null,
    fingerprint: null,
    correlationId: null,
    requestId: null,
    detectedAt: new Date(),
    acknowledgedAt: null,
    resolvedAt: null,
    assignedToId: null,
    relatedTaskOrderId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("P2 — Sentinel Incident Foundation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantFindFirst.mockResolvedValue({ id: "tenant-1" });
  });

  // ──────────────────────────────────────────────
  // 1. Platform-global incident
  // ──────────────────────────────────────────────
  it("creates platform-global incident", async () => {
    const expected = makeIncident({ tenantId: null });
    mocks.sentinelIncidentCreate.mockResolvedValue(expected);

    const result = await createIncident({ title: "Global outage" });

    expect(result.success).toBe(true);
    expect(mocks.tenantFindFirst).not.toHaveBeenCalled();
    expect(mocks.sentinelIncidentCreate).toHaveBeenCalledTimes(1);
    const data = mocks.sentinelIncidentCreate.mock.calls[0][0].data;
    expect(data.tenantId).toBeNull();
    expect(data.title).toBe("Global outage");
    expect(data.status).toBe("OPEN");
    expect(data.severity).toBe("MEDIUM");
    expect(data.escalationLevel).toBe("SENTINEL");
    expect(mocks.writeSentinelAudit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "SENTINEL_INCIDENT_OPENED" }),
    );
  });

  // ──────────────────────────────────────────────
  // 2. Tenant-related incident
  // ──────────────────────────────────────────────
  it("creates tenant-related incident", async () => {
    const expected = makeIncident({ tenantId: "tenant-1" });
    mocks.sentinelIncidentCreate.mockResolvedValue(expected);

    const result = await createIncident({
      title: "Tenant-specific issue",
      tenantId: "tenant-1",
      severity: "HIGH",
    });

    expect(result.success).toBe(true);
    expect(mocks.tenantFindFirst).toHaveBeenCalledWith({
      where: { id: "tenant-1", isActive: true },
      select: { id: true },
    });
    const data = mocks.sentinelIncidentCreate.mock.calls[0][0].data;
    expect(data.tenantId).toBe("tenant-1");
    expect(data.severity).toBe("HIGH");
  });

  it("rejects a missing or inactive tenant target before incident persistence", async () => {
    mocks.tenantFindFirst.mockResolvedValueOnce(null);

    const result = await createIncident({
      title: "Invalid tenant target",
      tenantId: "missing-tenant",
    });

    expect(result).toEqual({
      success: false,
      error: "Target tenant is missing or inactive.",
    });
    expect(mocks.sentinelIncidentCreate).not.toHaveBeenCalled();
    expect(mocks.writeSentinelAudit).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────
  // 3. Rejects missing/invalid title
  // ──────────────────────────────────────────────
  it("rejects empty title", async () => {
    const result = await createIncident({ title: "" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/title/i);
    expect(mocks.sentinelIncidentCreate).not.toHaveBeenCalled();
  });

  it("rejects missing title", async () => {
    const result = await createIncident({ title: "   " });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/title/i);
    expect(mocks.sentinelIncidentCreate).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────
  // 4. Sanitizes sensitive diagnostic metadata
  // ──────────────────────────────────────────────
  it("sanitizes sensitive diagnostic metadata", async () => {
    const meta = {
      endpoint: "/api/health",
      latencyMs: 42,
      authorization: "Bearer secret-token-12345",
      cookie: "session=abc",
      DATABASE_URL: "postgres://user:pass@host/db",
      safeField: "hello",
    };
    mocks.sentinelIncidentCreate.mockResolvedValue(makeIncident());

    const result = await createIncident({
      title: "Sanitization test",
      diagnosticMetadata: meta,
    });

    expect(result.success).toBe(true);
    const savedMeta = mocks.sentinelIncidentCreate.mock.calls[0][0].data.diagnosticMetadata;
    expect(savedMeta.endpoint).toBe("/api/health");
    expect(savedMeta.latencyMs).toBe(42);
    expect(savedMeta.safeField).toBe("hello");
    expect(savedMeta.authorization).toBe("[REDACTED]");
    expect(savedMeta.cookie).toBe("[REDACTED]");
    expect(savedMeta.DATABASE_URL).toBe("[REDACTED]");
  });

  it("rejects oversized diagnostic metadata", async () => {
    const largeMeta = { data: "x".repeat(15_000) };
    const result = await createIncident({
      title: "Large metadata",
      diagnosticMetadata: largeMeta,
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/10 KB/i);
    expect(mocks.sentinelIncidentCreate).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────
  // 5. Lists only active incidents
  // ──────────────────────────────────────────────
  it("lists only active incidents (OPEN, ACKNOWLEDGED, IN_PROGRESS)", async () => {
    mocks.sentinelIncidentFindMany.mockResolvedValue([
      makeIncident({ id: "i1", status: "OPEN" }),
      makeIncident({ id: "i2", status: "ACKNOWLEDGED" }),
    ]);

    const incidents = await listActiveIncidents();

    expect(incidents).toHaveLength(2);
    const where = mocks.sentinelIncidentFindMany.mock.calls[0][0].where;
    expect(where.status.in).toEqual(["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"]);
  });

  // ──────────────────────────────────────────────
  // 6. Tenant filter prevents cross-tenant reads
  // ──────────────────────────────────────────────
  it("tenant filter prevents cross-tenant reads", async () => {
    mocks.sentinelIncidentFindMany.mockResolvedValue([]);

    await listActiveIncidents("tenant-a");

    const where = mocks.sentinelIncidentFindMany.mock.calls[0][0].where;
    expect(where.tenantId).toBe("tenant-a");
  });

  it("listActiveIncidents without tenant filter returns all", async () => {
    mocks.sentinelIncidentFindMany.mockResolvedValue([makeIncident()]);

    await listActiveIncidents();

    const where = mocks.sentinelIncidentFindMany.mock.calls[0][0].where;
    expect(where.tenantId).toBeUndefined();
  });

  // ──────────────────────────────────────────────
  // 7. OPEN → ACKNOWLEDGED sets acknowledgedAt
  // ──────────────────────────────────────────────
  it("OPEN to ACKNOWLEDGED sets acknowledgedAt", async () => {
    mocks.sentinelIncidentFindUnique
      .mockResolvedValueOnce(makeIncident({ status: "OPEN" }))
      .mockResolvedValueOnce(makeIncident({ status: "ACKNOWLEDGED", acknowledgedAt: new Date() }));
    mocks.sentinelIncidentUpdateMany.mockResolvedValue({ count: 1 });

    const result = await acknowledgeIncident("inc-001");

    expect(result.success).toBe(true);
    const updateCall = mocks.sentinelIncidentUpdateMany.mock.calls[0];
    expect(updateCall[0].where.status).toBe("OPEN");
    expect(updateCall[0].data.status).toBe("ACKNOWLEDGED");
    expect(updateCall[0].data.acknowledgedAt).toBeInstanceOf(Date);
  });

  // ──────────────────────────────────────────────
  // 8. Invalid backwards transition is rejected
  // ──────────────────────────────────────────────
  it("rejects IN_PROGRESS back to OPEN", async () => {
    mocks.sentinelIncidentUpdateMany.mockResolvedValue({ count: 1 });
    mocks.sentinelIncidentFindUnique.mockResolvedValue(makeIncident({ status: "OPEN" }));

    const result = await acknowledgeIncident("inc-001");
    expect(result.success).toBe(true);
    // Can only go OPEN → ACKNOWLEDGED; going OPEN → RESOLVED is invalid
  });

  it("rejects RESOLVED to any non-terminal state", async () => {
    mocks.sentinelIncidentUpdateMany.mockResolvedValue({ count: 1 });
    mocks.sentinelIncidentFindUnique.mockResolvedValue(makeIncident({ status: "RESOLVED" }));

    const result = await acknowledgeIncident("inc-001");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Cannot transition/);
  });

  // ──────────────────────────────────────────────
  // 9. Terminal incident cannot reopen
  // ──────────────────────────────────────────────
  it("terminal FALSE_POSITIVE incident cannot acknowledge", async () => {
    mocks.sentinelIncidentFindUnique.mockResolvedValue(makeIncident({ status: "FALSE_POSITIVE" }));

    const result = await acknowledgeIncident("inc-001");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Cannot transition/);
  });

  it("terminal RESOLVED incident cannot start work", async () => {
    mocks.sentinelIncidentFindUnique.mockResolvedValue(makeIncident({ status: "RESOLVED" }));

    const result = await startIncidentWork("inc-001");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Cannot transition/);
  });

  // ──────────────────────────────────────────────
  // 10. Resolve sets resolvedAt
  // ──────────────────────────────────────────────
  it("resolve sets resolvedAt", async () => {
    mocks.sentinelIncidentFindUnique
      .mockResolvedValueOnce(makeIncident({ status: "IN_PROGRESS" }))
      .mockResolvedValueOnce(makeIncident({ status: "RESOLVED", resolvedAt: new Date() }));
    mocks.sentinelIncidentUpdateMany.mockResolvedValue({ count: 1 });

    const result = await resolveIncident("inc-001");

    expect(result.success).toBe(true);
    const updateCall = mocks.sentinelIncidentUpdateMany.mock.calls[0];
    expect(updateCall[0].where.status).toBe("IN_PROGRESS");
    expect(updateCall[0].data.status).toBe("RESOLVED");
    expect(updateCall[0].data.resolvedAt).toBeInstanceOf(Date);
  });

  it("resolve from ACKNOWLEDGED also works", async () => {
    mocks.sentinelIncidentFindUnique
      .mockResolvedValueOnce(makeIncident({ status: "ACKNOWLEDGED" }))
      .mockResolvedValueOnce(makeIncident({ status: "RESOLVED", resolvedAt: new Date() }));
    mocks.sentinelIncidentUpdateMany.mockResolvedValue({ count: 1 });

    const result = await resolveIncident("inc-001");
    expect(result.success).toBe(true);
    const updateCall = mocks.sentinelIncidentUpdateMany.mock.calls[0];
    expect(updateCall[0].where.status).toBe("ACKNOWLEDGED");
    expect(updateCall[0].data.status).toBe("RESOLVED");
  });

  // ──────────────────────────────────────────────
  // 11. False-positive sets resolvedAt
  // ──────────────────────────────────────────────
  it("false-positive sets resolvedAt", async () => {
    mocks.sentinelIncidentFindUnique
      .mockResolvedValueOnce(makeIncident({ status: "OPEN" }))
      .mockResolvedValueOnce(makeIncident({ status: "FALSE_POSITIVE", resolvedAt: new Date() }));
    mocks.sentinelIncidentUpdateMany.mockResolvedValue({ count: 1 });

    const result = await markIncidentFalsePositive("inc-001");

    expect(result.success).toBe(true);
    const updateCall = mocks.sentinelIncidentUpdateMany.mock.calls[0];
    expect(updateCall[0].where.status).toBe("OPEN");
    expect(updateCall[0].data.status).toBe("FALSE_POSITIVE");
    expect(updateCall[0].data.resolvedAt).toBeInstanceOf(Date);
  });

  // ──────────────────────────────────────────────
  // 12. Concurrent transition succeeds once
  // ──────────────────────────────────────────────
  it("concurrent acknowledge succeeds once", async () => {
    mocks.sentinelIncidentFindUnique
      .mockResolvedValue(makeIncident({ status: "OPEN" }));
    mocks.sentinelIncidentUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const [r1, r2] = await Promise.all([
      acknowledgeIncident("inc-001"),
      acknowledgeIncident("inc-001"),
    ]);

    const successes = [r1, r2].filter((r) => r.success);
    const failures = [r1, r2].filter((r) => !r.success);
    expect(successes).toHaveLength(1);
    expect(failures[0]?.error).toMatch(/Incident not found or status changed/);
  });

  // ──────────────────────────────────────────────
  // 13. Escalation cannot move backward
  // ──────────────────────────────────────────────
  it("escalation must move forward", async () => {
    mocks.sentinelIncidentFindUnique.mockResolvedValue(
      makeIncident({ escalationLevel: "PLATFORM_OWNER" }),
    );

    const result = await escalateIncident("inc-001", "ON_CALL_OPERATOR");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/must increase/);
    expect(mocks.sentinelIncidentUpdateMany).not.toHaveBeenCalled();
  });

  it("escalation from SENTINEL to ON_CALL_OPERATOR works", async () => {
    mocks.sentinelIncidentFindUnique
      .mockResolvedValueOnce(makeIncident({ escalationLevel: "SENTINEL" }))
      .mockResolvedValueOnce(makeIncident({ escalationLevel: "ON_CALL_OPERATOR" }));
    mocks.sentinelIncidentUpdateMany.mockResolvedValue({ count: 1 });

    const result = await escalateIncident("inc-001", "ON_CALL_OPERATOR");

    expect(result.success).toBe(true);
  });

  it("rejects invalid escalation level", async () => {
    const result = await escalateIncident("inc-001", "TENANT_ADMIN" as any);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid escalation/i);
  });

  // ──────────────────────────────────────────────
  // 14. Deletion relations do not cascade
  // ──────────────────────────────────────────────
  it("model uses SetNull for tenant, assignedTo, and relatedTaskOrder", async () => {
    // This test verifies the model definition by reading the schema source
    const schemaPath = require("node:path").join(
      process.cwd(),
      "prisma/schema.prisma",
    );
    const source = require("node:fs").readFileSync(schemaPath, "utf8");

    const modelStart = source.indexOf("model SentinelIncident {");
    const modelEnd = source.indexOf("}", modelStart);
    const modelBlock = source.slice(modelStart, modelEnd);

    // All three foreign key relations must use onDelete: SetNull
    const tenantRel = modelBlock.match(/tenant\s+Tenant\?.*?onDelete:\s*(\w+)/);
    expect(tenantRel?.[1]).toBe("SetNull");

    const userRel = modelBlock.match(/assignedTo\s+User\?.*?onDelete:\s*(\w+)/);
    expect(userRel?.[1]).toBe("SetNull");

    const taskRel = modelBlock.match(/relatedTaskOrder\s+SentinelTaskOrder\?.*?onDelete:\s*(\w+)/);
    expect(taskRel?.[1]).toBe("SetNull");

    // No Cascade in the model
    expect(modelBlock).not.toContain("Cascade");
  });

  // ──────────────────────────────────────────────
  // 15. No Tenant ADMIN authorization introduced
  // ──────────────────────────────────────────────
  it("service does not import or reference Tenant ADMIN authorization", async () => {
    const source = require("node:fs").readFileSync(
      require("node:path").join(process.cwd(), "lib/sentinel/incident.ts"),
      "utf8",
    );

    expect(source).not.toContain("AGENT_MANAGER_ROLES");
    expect(source).not.toContain("AGENT_READ_ROLES");
    expect(source).not.toContain("requireAgentAccess");
    expect(source).not.toContain("requirePlatformOwnerAccess");
    expect(source).not.toContain("TENANT_ADMIN");
    expect(source).not.toContain("authenticatePlatformOwner");
  });

  // ──────────────────────────────────────────────
  // Additional edge cases
  // ──────────────────────────────────────────────
  it("assignIncident returns error for unknown incident", async () => {
    mocks.sentinelIncidentUpdateMany.mockResolvedValue({ count: 0 });

    const result = await assignIncident("inc-unknown", "user-1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/);
  });

  it("getIncidentById returns null for missing incident", async () => {
    mocks.sentinelIncidentFindUnique.mockResolvedValue(null);

    const incident = await getIncidentById("inc-missing");
    expect(incident).toBeNull();
  });

  it("OPEN to IN_PROGRESS direct transition is rejected", async () => {
    mocks.sentinelIncidentUpdateMany.mockResolvedValue({ count: 1 });
    mocks.sentinelIncidentFindUnique.mockResolvedValue(makeIncident({ status: "OPEN" }));

    // startIncidentWork only allows ACKNOWLEDGED → IN_PROGRESS
    const result = await startIncidentWork("inc-001");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Cannot transition/);
  });

  it("direct resolveIncident on OPEN is still rejected", async () => {
    mocks.sentinelIncidentFindUnique.mockResolvedValue(makeIncident({ status: "OPEN" }));

    const result = await resolveIncident("inc-001");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Cannot transition from OPEN to RESOLVED/);
    expect(mocks.sentinelIncidentUpdateMany).not.toHaveBeenCalled();
  });

  it("startIncidentWork and false-positive payloads use only schema fields", async () => {
    mocks.sentinelIncidentFindUnique
      .mockResolvedValueOnce(makeIncident({ status: "ACKNOWLEDGED" }))
      .mockResolvedValueOnce(makeIncident({ status: "IN_PROGRESS" }))
      .mockResolvedValueOnce(makeIncident({ status: "OPEN" }))
      .mockResolvedValueOnce(makeIncident({ status: "FALSE_POSITIVE" }));
    mocks.sentinelIncidentUpdateMany.mockResolvedValue({ count: 1 });

    await startIncidentWork("inc-001");
    await markIncidentFalsePositive("inc-002");

    const workData = mocks.sentinelIncidentUpdateMany.mock.calls[0][0].data;
    expect(workData).toEqual({ status: "IN_PROGRESS" });
    expect(workData).not.toHaveProperty("workStartedAt");

    const falsePositiveData = mocks.sentinelIncidentUpdateMany.mock.calls[1][0].data;
    expect(falsePositiveData.status).toBe("FALSE_POSITIVE");
    expect(falsePositiveData.resolvedAt).toBeInstanceOf(Date);
    expect(falsePositiveData).not.toHaveProperty("falsePositiveAt");
  });
});
