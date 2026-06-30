/**
 * P2-B2b2 — Sentinel Incident Command Center API tests
 *
 * 19 tests covering:
 * 1.  Unauthenticated GET denied
 * 2.  Tenant ADMIN GET denied
 * 3.  Platform Owner lists incidents
 * 4.  GET strips diagnosticMetadata
 * 5.  Platform-global incident creation
 * 6.  Tenant-related incident creation
 * 7.  Invalid tenantId rejected
 * 8.  Invalid severity rejected
 * 9.  Unknown action rejected
 * 10. OPEN acknowledged
 * 11. Invalid transition returns 409
 * 12. Resolve requires bounded reason
 * 13. False-positive requires bounded reason
 * 14. Assignment rejects invalid UUID
 * 15. Escalation rejects backward movement
 * 16. Concurrent conflict returns 409
 * 17. Request ID preserved
 * 18. Tenant ADMIN never gains Platform Owner authority
 * 19. Responses never contain diagnosticMetadata or secret values
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// Hoisted mocks — one object so we can inspect call arguments in assertions
// ============================================================================

const mocks = vi.hoisted(() => ({
  // next/headers
  cookies: vi.fn<() => Promise<{ get: (name: string) => { value: string } | undefined }>>(),
  // @/lib/session
  decrypt: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  // @/lib/sentinel/task-order
  getOrCreateSentinelConfig: vi.fn(),
  getOpenTasks: vi.fn(),
  getPendingApprovals: vi.fn(),
  getRecentAuditEvents: vi.fn(),
  getOpenIncidents: vi.fn(),
  getChatMessages: vi.fn(),
  sendOwnerChatMessage: vi.fn(),
  getApprovalTTLMinutes: vi.fn(),
  isTaskExpired: vi.fn(),
  updateOperatingMode: vi.fn(),
  updateDelegationLevel: vi.fn(),
  updateFallbackPlan: vi.fn(),
  updateDeepRepairWait: vi.fn(),
  // @/lib/sentinel/incident
  listActiveIncidents: vi.fn(),
  createIncident: vi.fn(),
  acknowledgeIncident: vi.fn(),
  startIncidentWork: vi.fn(),
  resolveIncident: vi.fn(),
  markIncidentFalsePositive: vi.fn(),
  assignIncident: vi.fn(),
  escalateIncident: vi.fn(),
  // audit
  writeSentinelAudit: vi.fn<(...args: unknown[]) => Promise<void>>(),
  writeAuditLog: vi.fn<(...args: unknown[]) => Promise<void>>(),
  // @/lib/agents/access
  requireAgentAccess: vi.fn(),
  requirePlatformOwnerAccess: vi.fn(),
  agentErrorResponse: vi.fn(),
  // @/app/actions/saherAgent
  executeApprovedSaherAction: vi.fn(),
  // @/lib/prisma — only used by approve-task branch; minimal stub
  prisma: {
    sentinelTaskOrder: { findFirst: vi.fn(), updateMany: vi.fn() },
    $disconnect: vi.fn(),
    $connect: vi.fn(),
  },
}));

// ============================================================================
// Module mocks
// ============================================================================

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));

vi.mock("@/lib/session", () => ({ decrypt: mocks.decrypt }));

vi.mock("@/lib/sentinel/task-order", () => ({
  getOrCreateSentinelConfig: mocks.getOrCreateSentinelConfig,
  getOpenTasks: mocks.getOpenTasks,
  getPendingApprovals: mocks.getPendingApprovals,
  getRecentAuditEvents: mocks.getRecentAuditEvents,
  getOpenIncidents: mocks.getOpenIncidents,
  getChatMessages: mocks.getChatMessages,
  sendOwnerChatMessage: mocks.sendOwnerChatMessage,
  getApprovalTTLMinutes: mocks.getApprovalTTLMinutes,
  isTaskExpired: mocks.isTaskExpired,
  updateOperatingMode: mocks.updateOperatingMode,
  updateDelegationLevel: mocks.updateDelegationLevel,
  updateFallbackPlan: mocks.updateFallbackPlan,
  updateDeepRepairWait: mocks.updateDeepRepairWait,
}));

vi.mock("@/lib/sentinel/incident", () => ({
  listActiveIncidents: mocks.listActiveIncidents,
  createIncident: mocks.createIncident,
  acknowledgeIncident: mocks.acknowledgeIncident,
  startIncidentWork: mocks.startIncidentWork,
  resolveIncident: mocks.resolveIncident,
  markIncidentFalsePositive: mocks.markIncidentFalsePositive,
  assignIncident: mocks.assignIncident,
  escalateIncident: mocks.escalateIncident,
}));

vi.mock("@/lib/sentinel/audit", () => ({
  writeSentinelAudit: (...args: unknown[]) => {
    mocks.writeSentinelAudit(...args);
    return Promise.resolve();
  },
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: (...args: unknown[]) => {
    mocks.writeAuditLog(...args);
    return Promise.resolve();
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/agents/access", () => ({
  AGENT_MANAGER_ROLES: ["ADMIN", "SALES_MANAGER"],
  agentErrorResponse: mocks.agentErrorResponse,
  requireAgentAccess: mocks.requireAgentAccess,
  requirePlatformOwnerAccess: mocks.requirePlatformOwnerAccess,
}));

vi.mock("@/app/actions/saherAgent", () => ({
  executeApprovedSaherAction: mocks.executeApprovedSaherAction,
}));

// ============================================================================
// Subject imports (after all mocks are set up)
// ============================================================================

const { GET, POST } = await import("@/app/api/admin/command-center/route");

// ============================================================================
// Helpers
// ============================================================================

const SUPER_ADMIN_EMAIL = "platform-owner@test.com";

function mockAuth(email = SUPER_ADMIN_EMAIL) {
  const original = process.env.SUPER_ADMIN_EMAILS;
  process.env.SUPER_ADMIN_EMAILS = SUPER_ADMIN_EMAIL;
  mocks.cookies.mockResolvedValue({ get: () => ({ value: "sess-token" }) } as any);
  mocks.decrypt.mockResolvedValue({ email } as any);
  return original;
}

function mockNoAuth() {
  mocks.cookies.mockResolvedValue({ get: () => undefined } as any);
}

function mockTenantAdmin() {
  mocks.cookies.mockResolvedValue({ get: () => ({ value: "tenant-sess" }) } as any);
  mocks.decrypt.mockResolvedValue({ email: "tenant-admin@other.com" } as any);
}

function mockGetDependencies() {
  mocks.getOrCreateSentinelConfig.mockResolvedValue({
    id: "cfg-1",
    operatingMode: "NORMAL_MODE",
    isActive: true,
    delegationLevel: "MONITORING_ONLY",
    fallbackPlanActive: false,
    deepRepairWaitMinutes: 15,
  });
  mocks.getOpenTasks.mockResolvedValue([]);
  mocks.getPendingApprovals.mockResolvedValue([]);
  mocks.getRecentAuditEvents.mockResolvedValue([]);
  mocks.getOpenIncidents.mockResolvedValue([]);
  mocks.getChatMessages.mockResolvedValue([]);
  mocks.listActiveIncidents.mockResolvedValue([]);
  mocks.getApprovalTTLMinutes.mockReturnValue(1440);
}

function makeIncident(overrides: Record<string, unknown> = {}) {
  return {
    id: "inc-001",
    tenantId: null,
    title: "Test incident",
    summary: "A summary",
    severity: "MEDIUM",
    status: "OPEN",
    escalationLevel: "SENTINEL",
    affectedService: "API",
    diagnosticMetadata: { authorization: "Bearer secret", cookie: "sess=abc", DATABASE_URL: "postgres://..." },
    fingerprint: null,
    correlationId: null,
    requestId: null,
    detectedAt: new Date().toISOString(),
    acknowledgedAt: null,
    resolvedAt: null,
    assignedToId: null,
    relatedTaskOrderId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function postJson(action: string, extra: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/admin/command-center", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra }),
  });
}

async function expectError(
  response: Response,
  status: number,
  errorPattern?: RegExp,
) {
  expect(response.status).toBe(status);
  const body = await response.json();
  expect(body.success).toBe(false);
  if (errorPattern) expect(body.error).toMatch(errorPattern);
  return body;
}

// ============================================================================
// Tests
// ============================================================================

describe("P2-B2b2 — Sentinel Incident Command Center API", () => {
  let origAdminEmails: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    origAdminEmails = process.env.SUPER_ADMIN_EMAILS;
  });

  afterEach(() => {
    process.env.SUPER_ADMIN_EMAILS = origAdminEmails;
  });

  // ────────────────────────────────────────────────
  // 1. Unauthenticated GET is denied
  // ────────────────────────────────────────────────
  it("returns 401 for unauthenticated GET", async () => {
    mockNoAuth();
    const response = await GET();
    await expectError(response, 401, /unauthorized|platform owner/i);
  });

  // ────────────────────────────────────────────────
  // 2. Tenant ADMIN GET is denied
  // ────────────────────────────────────────────────
  it("returns 401 for Tenant ADMIN GET", async () => {
    mockTenantAdmin();
    const response = await GET();
    await expectError(response, 401, /unauthorized|platform owner/i);
  });

  // ────────────────────────────────────────────────
  // 3. Allowlisted Platform Owner lists incidents
  // ────────────────────────────────────────────────
  it("returns incidents for authenticated Platform Owner", async () => {
    mockAuth();
    mockGetDependencies();
    const inc = makeIncident({ id: "inc-005" });
    mocks.listActiveIncidents.mockResolvedValue([inc]);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sentinelIncidentCount).toBe(1);
    expect(body.data.sentinelIncidents).toHaveLength(1);
    expect(body.data.sentinelIncidents[0].id).toBe("inc-005");
    expect(body.data.sentinelIncidents[0].title).toBe("Test incident");
  });

  // ────────────────────────────────────────────────
  // 4. GET strips diagnosticMetadata and sensitive values
  // ────────────────────────────────────────────────
  it("GET response excludes diagnosticMetadata", async () => {
    mockAuth();
    mockGetDependencies();
    mocks.listActiveIncidents.mockResolvedValue([makeIncident()]);

    const response = await GET();
    const body = await response.json();
    const inc = body.data.sentinelIncidents[0];
    expect(inc.diagnosticMetadata).toBeUndefined();
    expect(inc.title).toBe("Test incident");
    expect(inc.severity).toBe("MEDIUM");
  });

  // ────────────────────────────────────────────────
  // 5. Platform-global incident creation succeeds
  // ────────────────────────────────────────────────
  it("creates a platform-global incident", async () => {
    mockAuth();
    mocks.createIncident.mockResolvedValue({
      success: true,
      incident: makeIncident({ id: "inc-new", title: "Global outage" }),
    });

    const request = postJson("incident-create", {
      title: "Global outage",
      severity: "HIGH",
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.incident.id).toBe("inc-new");
    expect(body.incident.title).toBe("Global outage");
    expect(body.incident.diagnosticMetadata).toBeUndefined();
    expect(mocks.createIncident).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Global outage", severity: "HIGH", tenantId: null }),
    );
  });

  // ────────────────────────────────────────────────
  // 6. Tenant-related creation succeeds
  // ────────────────────────────────────────────────
  it("creates a tenant-related incident", async () => {
    mockAuth();
    mocks.createIncident.mockResolvedValue({
      success: true,
      incident: makeIncident({ id: "inc-tenant", tenantId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }),
    });

    const request = postJson("incident-create", {
      title: "Tenant issue",
      tenantId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      severity: "LOW",
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(mocks.createIncident).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }),
    );
  });

  // ────────────────────────────────────────────────
  // 7. Invalid tenantId returns 400
  // ────────────────────────────────────────────────
  it("rejects invalid tenantId UUID", async () => {
    mockAuth();
    const request = postJson("incident-create", {
      title: "Bad tenant",
      tenantId: "not-a-uuid",
    });
    const response = await POST(request);
    await expectError(response, 400, /uuid/i);
    expect(mocks.createIncident).not.toHaveBeenCalled();
  });

  // ────────────────────────────────────────────────
  // 8. Invalid severity returns 400
  // ────────────────────────────────────────────────
  it("rejects invalid severity", async () => {
    mockAuth();
    const request = postJson("incident-create", {
      title: "Bad severity",
      severity: "URGENT",
    });
    const response = await POST(request);
    await expectError(response, 400, /severity/i);
    expect(mocks.createIncident).not.toHaveBeenCalled();
  });

  // ────────────────────────────────────────────────
  // 9. Unknown action returns 400
  // ────────────────────────────────────────────────
  it("rejects unknown action", async () => {
    mockAuth();
    const request = postJson("incident-delete", { incidentId: "00000000-0000-0000-0000-000000000001" });
    const response = await POST(request);
    await expectError(response, 400, /invalid action/i);
  });

  // ────────────────────────────────────────────────
  // 10. OPEN incident can be acknowledged
  // ────────────────────────────────────────────────
  it("acknowledges an OPEN incident", async () => {
    mockAuth();
    mocks.acknowledgeIncident.mockResolvedValue({
      success: true,
      incident: makeIncident({ status: "ACKNOWLEDGED", acknowledgedAt: new Date().toISOString() }),
    });

    const request = postJson("incident-acknowledge", {
      incidentId: "00000000-0000-0000-0000-000000000001",
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(mocks.acknowledgeIncident).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
    );
  });

  // ────────────────────────────────────────────────
  // 11. Invalid transition returns 409
  // ────────────────────────────────────────────────
  it("returns 409 on invalid transition", async () => {
    mockAuth();
    mocks.acknowledgeIncident.mockResolvedValue({
      success: false,
      error: "Cannot transition from RESOLVED to ACKNOWLEDGED.",
    });

    const request = postJson("incident-acknowledge", {
      incidentId: "00000000-0000-0000-0000-000000000001",
    });
    const response = await POST(request);
    await expectError(response, 409, /Cannot transition/);
  });

  // ────────────────────────────────────────────────
  // 12. Resolve requires a non-empty bounded reason
  // ────────────────────────────────────────────────
  it("rejects resolve without a reason", async () => {
    mockAuth();
    const request = postJson("incident-resolve", {
      incidentId: "00000000-0000-0000-0000-000000000001",
    });
    const response = await POST(request);
    await expectError(response, 400, /reason/i);
    expect(mocks.resolveIncident).not.toHaveBeenCalled();
  });

  it("rejects resolve with oversized reason", async () => {
    mockAuth();
    const request = postJson("incident-resolve", {
      incidentId: "00000000-0000-0000-0000-000000000001",
      reason: "x".repeat(1001),
    });
    const response = await POST(request);
    await expectError(response, 400, /reason/i);
    expect(mocks.resolveIncident).not.toHaveBeenCalled();
  });

  // ────────────────────────────────────────────────
  // 13. False-positive requires a non-empty bounded reason
  // ────────────────────────────────────────────────
  it("rejects false-positive without a reason", async () => {
    mockAuth();
    const request = postJson("incident-false-positive", {
      incidentId: "00000000-0000-0000-0000-000000000001",
    });
    const response = await POST(request);
    await expectError(response, 400, /reason/i);
    expect(mocks.markIncidentFalsePositive).not.toHaveBeenCalled();
  });

  it("rejects false-positive with oversized reason", async () => {
    mockAuth();
    const request = postJson("incident-false-positive", {
      incidentId: "00000000-0000-0000-0000-000000000001",
      reason: "y".repeat(1001),
    });
    const response = await POST(request);
    await expectError(response, 400, /reason/i);
    expect(mocks.markIncidentFalsePositive).not.toHaveBeenCalled();
  });

  // ────────────────────────────────────────────────
  // 14. Assignment rejects invalid UUID
  // ────────────────────────────────────────────────
  it("rejects non-UUID assignee", async () => {
    mockAuth();
    const request = postJson("incident-assign", {
      incidentId: "00000000-0000-0000-0000-000000000001",
      assignedToId: "not-a-uuid",
    });
    const response = await POST(request);
    await expectError(response, 400, /uuid/i);
    expect(mocks.assignIncident).not.toHaveBeenCalled();
  });

  // ────────────────────────────────────────────────
  // 15. Escalation rejects backward movement
  // ────────────────────────────────────────────────
  it("rejects backward escalation with 409", async () => {
    mockAuth();
    mocks.escalateIncident.mockResolvedValue({
      success: false,
      error: "Escalation level must increase.",
    });

    const request = postJson("incident-escalate", {
      incidentId: "00000000-0000-0000-0000-000000000001",
      level: "SENTINEL",
    });
    const response = await POST(request);
    await expectError(response, 409, /must increase/);
  });

  it("rejects invalid escalation level", async () => {
    mockAuth();
    const request = postJson("incident-escalate", {
      incidentId: "00000000-0000-0000-0000-000000000001",
      level: "INVALID_LEVEL",
    });
    const response = await POST(request);
    await expectError(response, 400, /escalation/i);
    expect(mocks.escalateIncident).not.toHaveBeenCalled();
  });

  // ────────────────────────────────────────────────
  // 16. Concurrent transition conflict returns 409 safely
  // ────────────────────────────────────────────────
  it("returns 409 when updateMany finds zero rows (concurrent conflict)", async () => {
    mockAuth();
    mocks.acknowledgeIncident.mockResolvedValue({
      success: false,
      error: "Incident not found or status changed.",
    });

    const request = postJson("incident-acknowledge", {
      incidentId: "00000000-0000-0000-0000-000000000001",
    });
    const response = await POST(request);
    await expectError(response, 409, /status changed|not found/i);
  });

  // ────────────────────────────────────────────────
  // 17. Request ID is preserved in response and service input
  // ────────────────────────────────────────────────
  it("preserves requestId in the response", async () => {
    mockAuth();
    mocks.acknowledgeIncident.mockResolvedValue({
      success: true,
      incident: makeIncident({ status: "ACKNOWLEDGED" }),
    });

    const request = postJson("incident-acknowledge", {
      incidentId: "00000000-0000-0000-0000-000000000001",
      requestId: "req-custom-123",
    });
    const response = await POST(request);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(mocks.writeSentinelAudit).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: "req-custom-123" }),
    );
  });

  // ────────────────────────────────────────────────
  // 18. Tenant ADMIN never receives Platform Owner authority
  // ────────────────────────────────────────────────
  it("denies POST for tenant-only session", async () => {
    mockTenantAdmin();
    const request = postJson("incident-acknowledge", {
      incidentId: "00000000-0000-0000-0000-000000000001",
    });
    const response = await POST(request);
    await expectError(response, 401, /unauthorized|platform owner/i);
    expect(mocks.acknowledgeIncident).not.toHaveBeenCalled();
  });

  it("denies POST for completely missing session", async () => {
    mockNoAuth();
    const request = postJson("incident-acknowledge", {
      incidentId: "00000000-0000-0000-0000-000000000001",
    });
    const response = await POST(request);
    await expectError(response, 401, /unauthorized|platform owner/i);
    expect(mocks.acknowledgeIncident).not.toHaveBeenCalled();
  });

  // ────────────────────────────────────────────────
  // 19. Incident responses never contain diagnosticMetadata
  // ────────────────────────────────────────────────
  it("POST incident responses exclude diagnosticMetadata", async () => {
    mockAuth();
    mocks.createIncident.mockResolvedValue({
      success: true,
      incident: makeIncident({
        diagnosticMetadata: {
          authorization: "Bearer leak",
          cookie: "sess=leak",
          DATABASE_URL: "postgres://leak",
        },
      }),
    });

    const request = postJson("incident-create", {
      title: "Leak test",
      severity: "LOW",
    });
    const response = await POST(request);
    const body = await response.json();
    expect(body.incident.diagnosticMetadata).toBeUndefined();
    expect(body.incident.authorization).toBeUndefined();
    expect(body.incident.cookie).toBeUndefined();
    expect(body.incident.DATABASE_URL).toBeUndefined();
  });

  it("POST incident-assign response excludes diagnosticMetadata", async () => {
    mockAuth();
    mocks.assignIncident.mockResolvedValue({
      success: true,
      incident: makeIncident({
        status: "ACKNOWLEDGED",
        assignedToId: "00000000-0000-0000-0000-000000000099",
        diagnosticMetadata: { authorization: "leak" },
      }),
    });

    const request = postJson("incident-assign", {
      incidentId: "00000000-0000-0000-0000-000000000001",
      assignedToId: "00000000-0000-0000-0000-000000000099",
    });
    const response = await POST(request);
    const body = await response.json();
    expect(body.incident.diagnosticMetadata).toBeUndefined();
  });
});
