import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const authMocks = vi.hoisted(() => ({ requireAuth: vi.fn() }));
const bootstrapMocks = vi.hoisted(() => ({
  findUserEmail: vi.fn(),
  findUserRole: vi.fn(),
  findTenantActive: vi.fn(),
}));
const sessionMocks = vi.hoisted(() => ({ getSession: vi.fn() }));
const tenantMocks = vi.hoisted(() => ({
  runWithTenantContext: vi.fn(
    async (_context: unknown, operation: () => unknown) => await operation(),
  ),
  setTenantContext: vi.fn(),
}));
const prismaMocks = vi.hoisted(() => ({
  workflowCreate: vi.fn(),
  ticketCreate: vi.fn(),
}));

vi.mock("@/lib/system-prisma-boundary", () => ({
  authBootstrapFindUserEmail: bootstrapMocks.findUserEmail,
  authBootstrapFindUserRole: bootstrapMocks.findUserRole,
  authBootstrapFindTenantActive: bootstrapMocks.findTenantActive,
}));
vi.mock("@/lib/api-auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-auth-guard")>();
  return { ...actual, requireAuth: authMocks.requireAuth };
});
vi.mock("@/lib/session", () => ({ getSession: sessionMocks.getSession }));
vi.mock("@/lib/tenant-context", () => ({
  runWithTenantContext: tenantMocks.runWithTenantContext,
  setTenantContext: tenantMocks.setTenantContext,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    automationWorkflow: { create: prismaMocks.workflowCreate },
    maintenanceTicket: { create: prismaMocks.ticketCreate },
  },
}));

import { POST as createWorkflow } from "@/app/api/v1/automation/workflows/route";
import { POST as createMaintenanceTicket } from "@/app/api/v1/maintenance/route";

const SESSION = Object.freeze({
  userId: "user-1",
  tenantId: "tenant-1",
  role: "ADMIN",
});

function bearerOnlyRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      authorization: "Bearer bearer-only-token",
      "content-type": "application/json",
      "x-request-id": "exec-003-cookie-mutation",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionMocks.getSession.mockResolvedValue(SESSION);
  authMocks.requireAuth.mockResolvedValue(SESSION);
  bootstrapMocks.findUserEmail.mockResolvedValue(null);
  bootstrapMocks.findUserRole.mockResolvedValue({ role: "ADMIN" });
  bootstrapMocks.findTenantActive.mockResolvedValue({ id: SESSION.tenantId });
  prismaMocks.workflowCreate.mockResolvedValue({ id: "workflow-1" });
  prismaMocks.ticketCreate.mockResolvedValue({ id: "ticket-1" });
});

describe("EXEC-003 Cookie-only mutation boundaries", () => {
  it("DIRECT_BEHAVIORAL EXEC-003-C14-O02 ALLOW reaches workflow creation after Cookie authorization", async () => {
    const response = await createWorkflow(
      bearerOnlyRequest("http://localhost/api/v1/automation/workflows", {
        name: "Workflow",
        triggerEvent: "LEAD_CREATED",
        actionsJson: [{ type: "notify" }],
      }),
    );

    expect(response.status).toBe(201);
    expect(prismaMocks.workflowCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: SESSION.tenantId,
          createdBy: SESSION.userId,
        }),
      }),
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C14-O02 DENY rejects Bearer-only workflow creation", async () => {
    sessionMocks.getSession.mockResolvedValue(null);

    const response = await createWorkflow(
      bearerOnlyRequest("http://localhost/api/v1/automation/workflows", {
        name: "Workflow",
        triggerEvent: "LEAD_CREATED",
        actionsJson: [{ type: "notify" }],
      }),
    );

    expect(response.status).toBe(401);
    expect(authMocks.requireAuth).not.toHaveBeenCalled();
    expect(prismaMocks.workflowCreate).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C15-O02 ALLOW reaches maintenance creation after Cookie authorization", async () => {
    const response = await createMaintenanceTicket(
      bearerOnlyRequest("http://localhost/api/v1/maintenance", {
        title: "Repair",
      }),
    );

    expect(response.status).toBe(201);
    expect(prismaMocks.ticketCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: SESSION.tenantId,
          reportedBy: SESSION.userId,
        }),
      }),
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C15-O02 DENY rejects Bearer-only maintenance creation", async () => {
    sessionMocks.getSession.mockResolvedValue(null);

    const response = await createMaintenanceTicket(
      bearerOnlyRequest("http://localhost/api/v1/maintenance", {
        title: "Repair",
      }),
    );

    expect(response.status).toBe(401);
    expect(authMocks.requireAuth).not.toHaveBeenCalled();
    expect(prismaMocks.ticketCreate).not.toHaveBeenCalled();
  });
});
