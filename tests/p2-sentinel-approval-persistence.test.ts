/**
 * P2 — Sentinel Approval Persistence
 *
 * 1. fixed approvalExpiresAt on creation
 * 2. requestedById/requestId persistence
 * 3. legacy createdAt + TTL fallback
 * 4. atomic approval decision fields (decidedById, decidedAt, decisionReason)
 * 5. expired approval never executes
 * 6. automatic expiry has no fake actor (no decidedById)
 * 7. manual rejection decision fields
 * 8. concurrent execution only once
 * 9. failure never returns to WAITING_APPROVAL
 * 10. tenant ADMIN denied Platform Owner access
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// Hoisted mocks
// ============================================================================

const mocks = vi.hoisted(() => ({
  decryptText: vi.fn(),
  writeAuditLog: vi.fn(),
  isTaskExpired: vi.fn(),
  getApprovalTTLMinutes: vi.fn(),
  requireAgentAccess: vi.fn(),
  assertAgentCanRun: vi.fn(),
  sendWhatsAppMessage: vi.fn(),
  sentinelFindFirst: vi.fn(),
  sentinelUpdateMany: vi.fn(),
  sentinelCreate: vi.fn(),
  leadFindFirst: vi.fn(),
  leadCreate: vi.fn(),
  leadActivityCreate: vi.fn(),
  userFindFirst: vi.fn(),
  decryptSession: vi.fn(),
  cookies: vi.fn(),
  writeSentinelAudit: vi.fn(),
  executeApprovedSaherAction: vi.fn(),
  agentErrorResponse: vi.fn(),
  assertPlanLimit: vi.fn(),
  transactionCallback: vi.fn(),
}));

// ============================================================================
// Module mocks
// ============================================================================

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/session", () => ({ decrypt: mocks.decryptSession, getSession: mocks.decryptSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    $transaction: vi.fn((fn: (tx: any) => any) => mocks.transactionCallback(fn)),
    user: { findFirst: mocks.userFindFirst },
    lead: { findFirst: mocks.leadFindFirst, create: mocks.leadCreate },
    leadActivity: { create: mocks.leadActivityCreate },
    sentinelTaskOrder: { findFirst: mocks.sentinelFindFirst, updateMany: mocks.sentinelUpdateMany, create: mocks.sentinelCreate },
    sentinelConfig: { findFirst: vi.fn() },
    $disconnect: vi.fn(),
    $connect: vi.fn(),
  },
}));
vi.mock("@/lib/agents/access", () => ({
  AGENT_MANAGER_ROLES: ["ADMIN", "SALES_MANAGER"],
  AGENT_READ_ROLES: ["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE", "MARKETING", "READ_ONLY"],
  requireAgentAccess: mocks.requireAgentAccess,
  agentErrorResponse: mocks.agentErrorResponse,
}));
vi.mock("@/lib/agents/guard", () => ({ assertAgentCanRun: mocks.assertAgentCanRun }));
vi.mock("@/lib/crypto", () => ({
  decryptText: mocks.decryptText,
  encryptText: vi.fn((s: string) => s),
}));
vi.mock("@/lib/audit", () => ({ writeAuditLog: mocks.writeAuditLog }));
vi.mock("@/lib/sentinel/audit", () => ({
  writeSentinelAudit: (...args: unknown[]) => {
    mocks.writeSentinelAudit(...args);
    return Promise.resolve();
  },
}));
vi.mock("@/lib/plan-guard", () => ({
  assertPlanLimit: mocks.assertPlanLimit,
  PlanLimitError: class PlanLimitError extends Error { constructor(m: string) { super(m); this.name = "PlanLimitError"; } },
}));
vi.mock("@/lib/tenant", () => ({
  getActiveTenant: vi.fn().mockResolvedValue({ id: "tenant-1", companyName: "TestCo" }),
}));
vi.mock("@/lib/whatsapp/send-service", () => ({ sendWhatsAppMessage: mocks.sendWhatsAppMessage }));
vi.mock("@/lib/privacy-mask", () => ({
  maskPhone: vi.fn((p: string) => p),
  maskName: vi.fn((n: string) => n),
  sanitizeAuditDetails: vi.fn((s: string) => s),
  shortHash: vi.fn(() => "abc123"),
  hashPhone: vi.fn(() => "hash"),
  redactPiiFromPayload: vi.fn((p: any) => p),
}));
vi.mock("@/lib/agents/prompt-guard", () => ({
  validateAllowedAction: vi.fn((action: string, allowed: string[]) => allowed.includes(action)),
  sanitizeAgentInput: vi.fn((s: string, _opts?: any) => ({ sanitized: s, originalLength: s.length, sanitizedLength: s.length })),
  detectInjectionPatterns: vi.fn(() => ({ suspicious: false, riskLevel: "LOW", patterns: [] })),
  wrapUntrustedContent: vi.fn((_t: string, c: string) => c),
}));
vi.mock("@/lib/sentinel/task-order", async () => {
  const actual = await vi.importActual<typeof import("@/lib/sentinel/task-order")>("@/lib/sentinel/task-order");
  return {
    ...actual,
    getOpenTasks: vi.fn().mockResolvedValue([]),
    getPendingApprovals: vi.fn().mockResolvedValue([]),
    getRecentAuditEvents: vi.fn().mockResolvedValue([]),
    getOpenIncidents: vi.fn().mockResolvedValue([]),
    getChatMessages: vi.fn().mockResolvedValue([]),
    sendOwnerChatMessage: vi.fn(),
    getOrCreateSentinelConfig: vi.fn().mockResolvedValue({ operatingMode: "NORMAL_MODE", isActive: true, id: "cfg-1" }),
    updateOperatingMode: vi.fn(),
    updateDelegationLevel: vi.fn(),
    updateFallbackPlan: vi.fn(),
    updateDeepRepairWait: vi.fn(),
  };
});

// ============================================================================
// Subject imports
// ============================================================================

import { createTaskOrder, isTaskExpired, computeApprovalExpiresAt, getApprovalTTLMinutes } from "@/lib/sentinel/task-order";
import { executeApprovedSaherAction } from "@/app/actions/saherAgent";
import { POST as commandCenterPost } from "@/app/api/admin/command-center/route";

// ============================================================================
// Helpers
// ============================================================================

async function parseBody(res: Response): Promise<Record<string, unknown>> {
  return JSON.parse(await res.text());
}

const FUTURE = new Date(Date.now() + 86_400_000);
const FUTURE_TASK = Object.freeze({
  id: "task-fresh-001",
  tenantId: "tenant-1",
  status: "WAITING_APPROVAL",
  approvalRequired: true,
  approvalExpiresAt: FUTURE,
  executionPayload: "encrypted-payload",
  createdAt: new Date(),
});

const VALID_PAYLOAD = JSON.stringify({
  actionType: "SEND_WHATSAPP_REPLY",
  senderPhone: "+966501234567",
  responseToClient: "شكراً لتواصلك",
});

// ============================================================================
// Tests
// ============================================================================

describe("P2 — Sentinel Approval Persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getApprovalTTLMinutes.mockReturnValue(1440);
    mocks.requireAgentAccess.mockResolvedValue({ tenantId: "tenant-1", userId: "user-admin-1", role: "ADMIN", email: "admin@test.com" });
    mocks.assertAgentCanRun.mockResolvedValue({ allowed: true, mode: "NORMAL_MODE" });
    mocks.sendWhatsAppMessage.mockResolvedValue({ success: true });
    mocks.decryptText.mockReturnValue(VALID_PAYLOAD);
    mocks.agentErrorResponse.mockImplementation((e: any) => ({
      status: e.status || 500,
      body: { success: false, code: e.code || "ERROR", error: e.message || "fail" },
    }));
    mocks.sentinelCreate.mockReset();
  });

  // ──────────────────────────────────────────────────────────────
  // 1. Fixed approvalExpiresAt on creation
  // 2. requestedById / requestId persistence
  // ──────────────────────────────────────────────────────────────
  describe("createTaskOrder — creation fields", () => {
    it("sets approvalExpiresAt on creation when approvalRequired is true", async () => {
      mocks.sentinelCreate.mockResolvedValue({ id: "task-1" });

      await createTaskOrder({
        assignedToType: "OWNER",
        assignedToName: "Admin",
        title: "Test",
        approvalRequired: true,
      });

      expect(mocks.sentinelCreate).toHaveBeenCalledTimes(1);
      const callData = mocks.sentinelCreate.mock.calls[0][0].data;
      expect(callData.approvalExpiresAt).toBeInstanceOf(Date);
      expect(callData.approvalExpiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(callData.approvalRequestedAt).toBeInstanceOf(Date);
    });

    it("persists requestedById and requestId when approvalRequired is true", async () => {
      mocks.sentinelCreate.mockResolvedValue({ id: "task-2" });

      await createTaskOrder({
        assignedToType: "OWNER",
        assignedToName: "Admin",
        title: "Test",
        approvalRequired: true,
        requestedById: "user-request-1",
        requestId: "req-abc-123",
      });

      expect(mocks.sentinelCreate).toHaveBeenCalledTimes(1);
      const callData = mocks.sentinelCreate.mock.calls[0][0].data;
      expect(callData.requestedById).toBe("user-request-1");
      expect(callData.requestId).toBe("req-abc-123");
    });

    it("does not set requestedById/requestId when approvalRequired is false", async () => {
      mocks.sentinelCreate.mockResolvedValue({ id: "task-3" });

      await createTaskOrder({
        assignedToType: "OWNER",
        assignedToName: "Admin",
        title: "Test",
        approvalRequired: false,
        requestedById: "user-request-1",
        requestId: "req-abc-123",
      });

      expect(mocks.sentinelCreate).toHaveBeenCalledTimes(1);
      const callData = mocks.sentinelCreate.mock.calls[0][0].data;
      expect(callData.requestedById).toBeUndefined();
      expect(callData.requestId).toBeUndefined();
      expect(callData.approvalExpiresAt).toBeUndefined();
      expect(callData.status).toBe("OPEN");
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 3. Legacy createdAt + TTL fallback
  // ──────────────────────────────────────────────────────────────
  describe("isTaskExpired — legacy fallback", () => {
    it("falls back to createdAt + TTL when approvalExpiresAt is null", () => {
      const past = new Date(Date.now() - 9999 * 60_000);
      const task = { createdAt: past, approvalExpiresAt: null };
      expect(isTaskExpired(task)).toBe(true);
    });

    it("uses approvalExpiresAt when present", () => {
      const farFuture = new Date(Date.now() + 86_400_000);
      const task = { createdAt: new Date(), approvalExpiresAt: farFuture };
      expect(isTaskExpired(task)).toBe(false);
    });

    it("respects SENTINEL_APPROVAL_TTL_MINUTES env var for fallback", () => {
      vi.stubEnv("SENTINEL_APPROVAL_TTL_MINUTES", "1");
      const past = new Date(Date.now() - 120_000);
      const task = { createdAt: past, approvalExpiresAt: null };
      expect(isTaskExpired(task)).toBe(true);
      vi.unstubAllEnvs();
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 4. Atomic approval decision fields
  // ──────────────────────────────────────────────────────────────
  describe("executeApprovedSaherAction — atomic decision fields", () => {
    it("sets decidedById, decidedAt, and decisionReason atomically on claim", async () => {
      mocks.sentinelFindFirst.mockResolvedValue(FUTURE_TASK);
      mocks.sentinelUpdateMany
        .mockResolvedValueOnce({ count: 1 })  // claim
        .mockResolvedValueOnce({ count: 1 }); // mark DONE

      const result = await executeApprovedSaherAction(FUTURE_TASK.id, "user-admin-1");
      expect(result.success).toBe(true);

      const claimCall = mocks.sentinelUpdateMany.mock.calls[0];
      expect(claimCall[0].where.status).toBe("WAITING_APPROVAL");
      expect(claimCall[0].data.status).toBe("IN_PROGRESS");
      expect(claimCall[0].data.decidedById).toBe("user-admin-1");
      expect(claimCall[0].data.decidedAt).toBeInstanceOf(Date);
      expect(claimCall[0].data.decisionReason).toBe("Approved by admin");
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 5. Expired approval never executes
  // ──────────────────────────────────────────────────────────────
  it("expired approval is cancelled and never executes", async () => {
    const expiredTask = {
      ...FUTURE_TASK,
      approvalExpiresAt: new Date(Date.now() - 60_000),
    };
    mocks.sentinelFindFirst.mockResolvedValue(expiredTask);
    mocks.sentinelUpdateMany.mockResolvedValue({ count: 1 });

    const result = await executeApprovedSaherAction(expiredTask.id, "user-admin-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("This approval request has expired.");
    expect(mocks.sentinelUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.sentinelUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "WAITING_APPROVAL" }),
        data: expect.objectContaining({ status: "CANCELLED" }),
      }),
    );
    expect(mocks.decryptText).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────
  // 6. Automatic expiry has no fake actor
  // ──────────────────────────────────────────────────────────────
  it("automatic expiry does not set decidedById (no fake actor)", async () => {
    const expiredTask = {
      ...FUTURE_TASK,
      approvalExpiresAt: new Date(Date.now() - 60_000),
    };
    mocks.sentinelFindFirst.mockResolvedValue(expiredTask);
    mocks.sentinelUpdateMany.mockResolvedValue({ count: 1 });

    await executeApprovedSaherAction(expiredTask.id, "user-admin-1");

    const updateCall = mocks.sentinelUpdateMany.mock.calls[0];
    expect(updateCall[0].data.decidedById).toBeUndefined();
    expect(updateCall[0].data.decidedAt).toBeInstanceOf(Date);
    expect(updateCall[0].data.decisionReason).toBe("Approval TTL expired");
  });

  // ──────────────────────────────────────────────────────────────
  // 7. Manual rejection decision fields
  // ──────────────────────────────────────────────────────────────
  describe("POST /api/admin/command-center — reject-task", () => {
    beforeEach(() => {
      mocks.sentinelFindFirst.mockResolvedValue(FUTURE_TASK);
      mocks.sentinelUpdateMany.mockResolvedValue({ count: 1 });
    });

    it("rejection sets decidedById, decidedAt, and decisionReason", async () => {
      const req = new NextRequest("http://localhost/api/admin/command-center", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reject-task", taskId: FUTURE_TASK.id, reason: "Duplicate lead" }),
      });
      const res = await commandCenterPost(req);
      expect(res.status).toBe(200);

      const updateCall = mocks.sentinelUpdateMany.mock.calls[0];
      expect(updateCall[0].data.status).toBe("CANCELLED");
      expect(updateCall[0].data.decidedById).toBe("user-admin-1");
      expect(updateCall[0].data.decidedAt).toBeInstanceOf(Date);
      expect(updateCall[0].data.decisionReason).toBe("Duplicate lead");
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 8. Concurrent execution only once
  // ──────────────────────────────────────────────────────────────
  it("two concurrent claims result in one execution only", async () => {
    mocks.sentinelFindFirst.mockResolvedValue(FUTURE_TASK);
    mocks.requireAgentAccess
      .mockResolvedValueOnce({ tenantId: "tenant-1", userId: "user-a", role: "ADMIN", email: "a@t.com" })
      .mockResolvedValueOnce({ tenantId: "tenant-1", userId: "user-b", role: "ADMIN", email: "b@t.com" });

    const [r1, r2] = await Promise.all([
      (async () => {
        mocks.sentinelUpdateMany.mockResolvedValueOnce({ count: 1 });
        return executeApprovedSaherAction(FUTURE_TASK.id, "user-a");
      })(),
      (async () => {
        mocks.sentinelUpdateMany.mockResolvedValueOnce({ count: 0 });
        return executeApprovedSaherAction(FUTURE_TASK.id, "user-b");
      })(),
    ]);

    const successes = [r1, r2].filter((r) => r.success);
    const failures = [r1, r2].filter((r) => !r.success);

    expect(successes).toHaveLength(1);
    expect(failures[0]?.error).toBe("Task was claimed by another request.");
  });

  // ──────────────────────────────────────────────────────────────
  // 9. Failure never returns to WAITING_APPROVAL
  // ──────────────────────────────────────────────────────────────
  it("failure transitions to FAILED, not WAITING_APPROVAL", async () => {
    mocks.sentinelFindFirst.mockResolvedValue(FUTURE_TASK);
    mocks.sentinelUpdateMany
      .mockResolvedValueOnce({ count: 1 })  // claim succeeds
      .mockResolvedValueOnce({ count: 1 }); // FAILED transition
    mocks.decryptText.mockReturnValue(null); // force execution failure

    const result = await executeApprovedSaherAction(FUTURE_TASK.id, "user-admin-1");

    expect(result.success).toBe(false);

    const claimCall = mocks.sentinelUpdateMany.mock.calls[0];
    expect(claimCall[0].data.status).toBe("IN_PROGRESS");

    const failCall = mocks.sentinelUpdateMany.mock.calls[1];
    expect(failCall[0].where.status).toBe("IN_PROGRESS");
    expect(failCall[0].data.status).toBe("FAILED");
    expect(failCall[0].data.status).not.toBe("WAITING_APPROVAL");
  });

  // ──────────────────────────────────────────────────────────────
  // 10. Tenant ADMIN denied Platform Owner access
  // ──────────────────────────────────────────────────────────────
  describe("GET /api/admin/command-center — access control", () => {
    it("returns 401 when a regular tenant admin (non-platform-owner) tries to access", async () => {
      mocks.cookies.mockResolvedValue({ get: vi.fn(() => ({ value: "mock-session-token" })) });
      mocks.decryptSession.mockResolvedValue({ email: "admin@tenant.com" });
      vi.stubEnv("SUPER_ADMIN_EMAILS", "owner@example.com");

      const { GET } = await import("@/app/api/admin/command-center/route");
      const res = await GET();
      expect(res.status).toBe(401);
      const body = await parseBody(res);
      expect(body.error).toMatch(/unauthorized/i);

      vi.unstubAllEnvs();
    });
  });
});
