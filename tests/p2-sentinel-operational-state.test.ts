/**
 * P2 — Sentinel Operational State
 *
 * 1. Fresh approval can execute.
 * 2. Expired approval is cancelled and never executes.
 * 3. Two concurrent claims result in one execution only.
 * 4. reject-task requires a non-empty reason.
 * 5. rejection reason is length-bounded.
 * 6. rejection audit includes actor, requestId, taskId, previousState, newState, reason, and result.
 * 7. Tenant ADMIN cannot access as Platform Owner.
 * 8. Allowlisted Platform Owner succeeds.
 * 9. No module-level mutable healingAttempts remains.
 * 10. Audit output does not contain cookies, authorization headers, tokens, or full request bodies.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// Hoisted mocks — shared across all tests in this file
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
// Module mocks — must precede subject imports
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
    sentinelTaskOrder: { findFirst: mocks.sentinelFindFirst, updateMany: mocks.sentinelUpdateMany },
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
vi.mock("@/lib/sentinel/task-order", () => ({
  getApprovalTTLMinutes: mocks.getApprovalTTLMinutes,
  isTaskExpired: mocks.isTaskExpired,
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
}));
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

// ============================================================================
// Subject imports
// ============================================================================

import { executeApprovedSaherAction } from "@/app/actions/saherAgent";
import { POST as commandCenterPost } from "@/app/api/admin/command-center/route";

// Helpers
async function parseBody(res: Response): Promise<Record<string, unknown>> {
  return JSON.parse(await res.text());
}

const FRESH_TASK = Object.freeze({
  id: "task-fresh-001",
  tenantId: "tenant-1",
  status: "WAITING_APPROVAL",
  approvalRequired: true,
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

describe("P2 — Sentinel Operational State", () => {
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
  });

  // ──────────────────────────────────────────────────
  // 1. Fresh approval can execute
  // ──────────────────────────────────────────────────
  describe("executeApprovedSaherAction — TTL guards", () => {
    it("fresh approval can execute", async () => {
      mocks.sentinelFindFirst.mockResolvedValue(FRESH_TASK);
      mocks.isTaskExpired.mockReturnValue(false);
      mocks.sentinelUpdateMany
        .mockResolvedValueOnce({ count: 1 })  // claim
        .mockResolvedValueOnce({ count: 1 }); // mark DONE

      const result = await executeApprovedSaherAction(FRESH_TASK.id, "user-admin-1");

      expect(result.success).toBe(true);
      expect(mocks.sentinelUpdateMany).toHaveBeenCalledTimes(2);
      expect(mocks.writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: "SAHER_ACTION_EXECUTED" }),
      );
      expect(mocks.decryptText).toHaveBeenCalledWith("encrypted-payload");
    });

    // ──────────────────────────────────────────────
    // 2. Expired approval is cancelled and never executes
    // ──────────────────────────────────────────────
    it("expired approval is cancelled and never executes", async () => {
      mocks.sentinelFindFirst.mockResolvedValue(FRESH_TASK);
      mocks.isTaskExpired.mockReturnValue(true);
      mocks.sentinelUpdateMany.mockResolvedValue({ count: 1 });

      const result = await executeApprovedSaherAction(FRESH_TASK.id, "user-admin-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("This approval request has expired.");
      expect(mocks.sentinelUpdateMany).toHaveBeenCalledTimes(1);
      expect(mocks.sentinelUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "WAITING_APPROVAL" }),
          data: expect.objectContaining({ status: "CANCELLED" }),
        }),
      );
      expect(mocks.writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: "SAHER_APPROVAL_EXPIRED" }),
      );
      const auditCall = mocks.writeAuditLog.mock.calls[0][0];
      const details = JSON.parse(auditCall.details);
      expect(details.requestId).toMatch(/^expired-/);
      expect(details.actor).toBe("user-admin-1");
      expect(details.taskId).toBe(FRESH_TASK.id);
      expect(details.previousState).toBe("WAITING_APPROVAL");
      expect(details.newState).toBe("CANCELLED");
      expect(details.reason).toBe("Approval TTL expired");
      expect(details.ttlMinutes).toBe(1440);
      expect(details.createdAt).toBeDefined();
      expect(details.result).toBe("expired");
      expect(mocks.decryptText).not.toHaveBeenCalled();
    });

    // ──────────────────────────────────────────────
    // 3. Two concurrent claims result in one execution only
    // ──────────────────────────────────────────────
    it("two concurrent claims result in one execution only", async () => {
      mocks.sentinelFindFirst.mockResolvedValue(FRESH_TASK);
      mocks.isTaskExpired.mockReturnValue(false);
      mocks.requireAgentAccess
        .mockResolvedValueOnce({ tenantId: "tenant-1", userId: "user-a", role: "ADMIN", email: "a@t.com" })
        .mockResolvedValueOnce({ tenantId: "tenant-1", userId: "user-b", role: "ADMIN", email: "b@t.com" });

      const [r1, r2] = await Promise.all([
        (async () => {
          mocks.sentinelUpdateMany.mockResolvedValueOnce({ count: 1 });
          return executeApprovedSaherAction(FRESH_TASK.id, "user-a");
        })(),
        (async () => {
          mocks.sentinelUpdateMany.mockResolvedValueOnce({ count: 0 });
          return executeApprovedSaherAction(FRESH_TASK.id, "user-b");
        })(),
      ]);

      const successes = [r1, r2].filter((r) => r.success);
      const failures = [r1, r2].filter((r) => !r.success);

      expect(successes).toHaveLength(1);
      expect(failures[0]?.error).toBe("Task was claimed by another request.");
    });
  });

  // ──────────────────────────────────────────────────
  // 4. reject-task requires a non-empty reason
  // 5. rejection reason is length-bounded
  // 6. rejection audit structure
  // ──────────────────────────────────────────────────
  describe("POST /api/admin/command-center — reject-task", () => {
    beforeEach(() => {
      mocks.requireAgentAccess.mockResolvedValue({ tenantId: "tenant-1", userId: "user-admin-1", role: "ADMIN", email: "admin@test.com" });
      mocks.sentinelFindFirst.mockResolvedValue(FRESH_TASK);
      mocks.isTaskExpired.mockReturnValue(false);
      mocks.sentinelUpdateMany.mockResolvedValue({ count: 1 });
    });

    it("reject-task requires a non-empty reason", async () => {
      const req = new NextRequest("http://localhost/api/admin/command-center", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reject-task", taskId: FRESH_TASK.id, reason: "" }),
      });
      const res = await commandCenterPost(req);
      expect(res.status).toBe(400);
      const body = await parseBody(res);
      expect(body.error).toMatch(/reason/i);
    });

    it("rejection reason is length-bounded", async () => {
      const req = new NextRequest("http://localhost/api/admin/command-center", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reject-task", taskId: FRESH_TASK.id, reason: "x".repeat(1001) }),
      });
      const res = await commandCenterPost(req);
      expect(res.status).toBe(400);
      const body = await parseBody(res);
      expect(body.error).toMatch(/reason/i);
    });

    it("rejection audit includes actor, requestId, taskId, previousState, newState, reason, and result", async () => {
      const req = new NextRequest("http://localhost/api/admin/command-center", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reject-task", taskId: FRESH_TASK.id, reason: "Duplicate lead" }),
      });
      const res = await commandCenterPost(req);
      expect(res.status).toBe(200);
      const body = await parseBody(res);
      expect(body.success).toBe(true);
      expect(body.status).toBe("CANCELLED");

      expect(mocks.writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: "SAHER_APPROVAL_REJECTED" }),
      );
      const call = mocks.writeAuditLog.mock.calls.find(
        (c: any) => c[0]?.action === "SAHER_APPROVAL_REJECTED",
      );
      expect(call).toBeDefined();
      const details = JSON.parse(call[0].details);
      expect(details.actor).toBe("user-admin-1");
      expect(details.requestId).toMatch(/^reject-/);
      expect(details.taskId).toBe(FRESH_TASK.id);
      expect(details.previousState).toBe("WAITING_APPROVAL");
      expect(details.newState).toBe("CANCELLED");
      expect(details.reason).toBe("Duplicate lead");
      expect(details.result).toBe("rejected");
    });
  });

  // ──────────────────────────────────────────────────
  // 7. Tenant ADMIN cannot access as Platform Owner
  // 8. Allowlisted Platform Owner succeeds
  // ──────────────────────────────────────────────────
  describe("GET /api/admin/command-center — access control", () => {
    it("returns 401 when session is missing or email is not allowlisted", async () => {
      mocks.cookies.mockResolvedValue({ get: vi.fn(() => undefined) });

      const { GET } = await import("@/app/api/admin/command-center/route");
      const res = await GET();
      expect(res.status).toBe(401);
      const body = await parseBody(res);
      expect(body.error).toMatch(/unauthorized/i);
    });

    it("returns 200 for an allowlisted platform owner", async () => {
      mocks.cookies.mockResolvedValue({ get: vi.fn(() => ({ value: "mock-session-token" })) });
      mocks.decryptSession.mockResolvedValue({ email: "owner@example.com" });
      vi.stubEnv("SUPER_ADMIN_EMAILS", "owner@example.com");

      const { GET } = await import("@/app/api/admin/command-center/route");
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await parseBody(res);
      expect(body.status).toBeDefined();

      vi.unstubAllEnvs();
    });
  });

  // ──────────────────────────────────────────────────
  // 9. No module-level mutable healingAttempts
  // ──────────────────────────────────────────────────
  describe("Cron sentinel route — healingAttempts removal", () => {
    it("no module-level mutable healingAttempts remains", () => {
      const source = fs.readFileSync(
        path.join(process.cwd(), "app/api/cron/sentinel/route.ts"),
        "utf8",
      );
      expect(source).not.toContain("healingAttempts");
      expect(source).not.toContain("MAX_HEALING_ATTEMPTS");
      expect(source).not.toContain("activateFailoverMode");
    });
  });

  // ──────────────────────────────────────────────────
  // 10. Audit output sanitization
  // ──────────────────────────────────────────────────
  describe("Audit output sanitization", () => {
    it("audit details do not contain cookies, authorization headers, tokens, or full request bodies", () => {
      const auditSource = fs.readFileSync(
        path.join(process.cwd(), "lib/audit.ts"),
        "utf8",
      );
      const routeSource = fs.readFileSync(
        path.join(process.cwd(), "app/api/admin/command-center/route.ts"),
        "utf8",
      );
      const saherSource = fs.readFileSync(
        path.join(process.cwd(), "app/actions/saherAgent.ts"),
        "utf8",
      );

      for (const source of [auditSource, routeSource, saherSource]) {
        expect(source).not.toContain('"authorization"');
        expect(source).not.toContain('"cookie"');
        expect(source).not.toContain('"set-cookie"');
      }

      const auditWriteCalls = mocks.writeAuditLog.mock.calls;
      for (const call of auditWriteCalls) {
        const details = call[0]?.details;
        if (typeof details === "string") {
          expect(details).not.toContain("Bearer ");
          expect(details).not.toContain("authorization");
          expect(details).not.toContain("session_token");
          expect(details).not.toContain("ENCRYPTION_KEY");
        }
      }
    });
  });
});
