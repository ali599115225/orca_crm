import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const authMocks = vi.hoisted(() => ({ requireAuth: vi.fn() }));
const bootstrapMocks = vi.hoisted(() => ({
  findUserEmail: vi.fn(),
  findUserRole: vi.fn(),
  findTenantActive: vi.fn(),
}));
const databaseState = vi.hoisted(() => ({
  userPresent: true,
  userTenantId: "tenant-1",
  role: "ADMIN",
  tenantActive: true,
}));
const sessionMocks = vi.hoisted(() => ({ getSession: vi.fn() }));
const tenantMocks = vi.hoisted(() => ({
  runWithTenantContext: vi.fn(
    async (_context: unknown, operation: () => unknown) => await operation(),
  ),
  setTenantContext: vi.fn(),
}));
const prismaMocks = vi.hoisted(() => ({
  journalEntryFindFirst: vi.fn(),
  workflowFindMany: vi.fn(),
  workflowCreate: vi.fn(),
  ticketFindMany: vi.fn(),
  ticketCreate: vi.fn(),
  ticketUpdate: vi.fn(),
}));
const accountingMocks = vi.hoisted(() => ({
  reverseJournalEntry: vi.fn(),
  seedChartOfAccounts: vi.fn(),
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
    journalEntry: { findFirst: prismaMocks.journalEntryFindFirst },
    automationWorkflow: {
      findMany: prismaMocks.workflowFindMany,
      create: prismaMocks.workflowCreate,
    },
    maintenanceTicket: {
      findMany: prismaMocks.ticketFindMany,
      create: prismaMocks.ticketCreate,
      update: prismaMocks.ticketUpdate,
    },
  },
}));
vi.mock("@/lib/accounting", () => ({
  reverseJournalEntry: accountingMocks.reverseJournalEntry,
  seedChartOfAccounts: accountingMocks.seedChartOfAccounts,
}));

import {
  GET as readJournalEntry,
  POST as reverseJournalEntryRoute,
} from "@/app/api/v1/accounting/journal-entries/[id]/route";
import { POST as seedAccounting } from "@/app/api/v1/accounting/seed/route";
import {
  GET as readWorkflows,
  POST as createWorkflow,
} from "@/app/api/v1/automation/workflows/route";
import {
  GET as readMaintenanceTickets,
  POST as createMaintenanceTicket,
} from "@/app/api/v1/maintenance/route";
import { PATCH as updateMaintenanceTicket } from "@/app/api/v1/maintenance/[id]/route";

const SESSION = Object.freeze({
  userId: "user-1",
  tenantId: "tenant-1",
  role: "ADMIN",
});

function req(url: string, method = "GET", body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      authorization: "Bearer test-token",
      "content-type": "application/json",
      "x-request-id": "exec-003-p1-mutation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  databaseState.userPresent = true;
  databaseState.userTenantId = SESSION.tenantId;
  databaseState.role = "ADMIN";
  databaseState.tenantActive = true;

  authMocks.requireAuth.mockResolvedValue(SESSION);
  sessionMocks.getSession.mockResolvedValue(SESSION);
  bootstrapMocks.findUserEmail.mockResolvedValue(null);
  bootstrapMocks.findUserRole.mockImplementation(
    async (userId: string, tenantId: string) => {
      if (!databaseState.userPresent) return null;
      if (userId !== SESSION.userId) return null;
      if (tenantId !== databaseState.userTenantId) return null;
      return { role: databaseState.role };
    },
  );
  bootstrapMocks.findTenantActive.mockImplementation(async (tenantId: string) =>
    databaseState.tenantActive && tenantId === SESSION.tenantId
      ? { id: tenantId }
      : null,
  );

  prismaMocks.journalEntryFindFirst.mockResolvedValue(null);
  prismaMocks.workflowFindMany.mockResolvedValue([]);
  prismaMocks.workflowCreate.mockResolvedValue({ id: "workflow-1" });
  prismaMocks.ticketFindMany.mockResolvedValue([]);
  prismaMocks.ticketCreate.mockResolvedValue({ id: "ticket-1" });
  prismaMocks.ticketUpdate.mockResolvedValue({
    id: "ticket-1",
    status: "completed",
  });
  accountingMocks.reverseJournalEntry.mockResolvedValue({ id: "reversal-1" });
  accountingMocks.seedChartOfAccounts.mockResolvedValue(undefined);
});

describe("EXEC-003 P1 mutation contract-level behavior", () => {
  it("DIRECT_BEHAVIORAL EXEC-003-C12-O01 denies journal-entry read before Prisma", async () => {
    databaseState.userPresent = false;
    const response = await readJournalEntry(
      req("http://localhost/api/v1/accounting/journal-entries/entry-1"),
      { params: Promise.resolve({ id: "entry-1" }) },
    );
    expect(response.status).toBe(403);
    expect(prismaMocks.journalEntryFindFirst).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C12-O01 reaches tenant-scoped journal-entry read", async () => {
    const response = await readJournalEntry(
      req("http://localhost/api/v1/accounting/journal-entries/entry-1"),
      { params: Promise.resolve({ id: "entry-1" }) },
    );
    expect(response.status).toBe(404);
    expect(prismaMocks.journalEntryFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "entry-1", tenantId: SESSION.tenantId },
      }),
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C12-O02 denies reversal before the mutation", async () => {
    databaseState.role = "SALES_MANAGER";
    const response = await reverseJournalEntryRoute(
      req("http://localhost/api/v1/accounting/journal-entries/entry-1", "POST", {
        reason: "correction",
      }),
      { params: Promise.resolve({ id: "entry-1" }) },
    );
    expect(response.status).toBe(403);
    expect(accountingMocks.reverseJournalEntry).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C12-O02 reaches reversal after ADMIN authorization", async () => {
    prismaMocks.journalEntryFindFirst.mockResolvedValue({ id: "entry-1" });
    const response = await reverseJournalEntryRoute(
      req("http://localhost/api/v1/accounting/journal-entries/entry-1", "POST", {
        reason: "correction",
      }),
      { params: Promise.resolve({ id: "entry-1" }) },
    );
    expect(response.status).toBe(200);
    expect(accountingMocks.reverseJournalEntry).toHaveBeenCalledWith(
      "entry-1",
      SESSION.tenantId,
      "correction",
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C13-O01 denies accounting seed before execution", async () => {
    databaseState.role = "SALES_MANAGER";
    const response = await seedAccounting(
      req("http://localhost/api/v1/accounting/seed", "POST"),
    );
    expect(response.status).toBe(403);
    expect(accountingMocks.seedChartOfAccounts).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C13-O01 reaches tenant-scoped accounting seed", async () => {
    const response = await seedAccounting(
      req("http://localhost/api/v1/accounting/seed", "POST"),
    );
    expect(response.status).toBe(200);
    expect(accountingMocks.seedChartOfAccounts).toHaveBeenCalledWith(
      SESSION.tenantId,
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C14-O01 rejects Bearer-only workflow reads", async () => {
    sessionMocks.getSession.mockResolvedValue(null);
    const response = await readWorkflows(
      req("http://localhost/api/v1/automation/workflows"),
    );
    expect(response.status).toBe(401);
    expect(authMocks.requireAuth).not.toHaveBeenCalled();
    expect(prismaMocks.workflowFindMany).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C14-O01 reaches tenant-scoped workflow read", async () => {
    const response = await readWorkflows(
      req("http://localhost/api/v1/automation/workflows"),
    );
    expect(response.status).toBe(200);
    expect(prismaMocks.workflowFindMany).toHaveBeenCalledWith({
      where: { tenantId: SESSION.tenantId },
      orderBy: { createdAt: "desc" },
    });
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C14-O02 denies workflow creation before Prisma", async () => {
    databaseState.userPresent = false;
    const response = await createWorkflow(
      req("http://localhost/api/v1/automation/workflows", "POST", {
        name: "Workflow",
        triggerEvent: "LEAD_CREATED",
        actionsJson: [{ type: "notify" }],
      }),
    );
    expect(response.status).toBe(403);
    expect(prismaMocks.workflowCreate).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C14-O02 reaches workflow creation after Cookie authorization", async () => {
    const response = await createWorkflow(
      req("http://localhost/api/v1/automation/workflows", "POST", {
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

  it("DIRECT_BEHAVIORAL EXEC-003-C15-O01 rejects Bearer-only maintenance reads", async () => {
    sessionMocks.getSession.mockResolvedValue(null);
    const response = await readMaintenanceTickets(
      req("http://localhost/api/v1/maintenance"),
    );
    expect(response.status).toBe(401);
    expect(prismaMocks.ticketFindMany).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C15-O01 reaches tenant-scoped maintenance read", async () => {
    const response = await readMaintenanceTickets(
      req("http://localhost/api/v1/maintenance?status=pending"),
    );
    expect(response.status).toBe(200);
    expect(prismaMocks.ticketFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: SESSION.tenantId, status: "pending" },
      }),
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C15-O02 denies maintenance creation before Prisma", async () => {
    databaseState.userPresent = false;
    const response = await createMaintenanceTicket(
      req("http://localhost/api/v1/maintenance", "POST", { title: "Repair" }),
    );
    expect(response.status).toBe(403);
    expect(prismaMocks.ticketCreate).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C15-O02 reaches maintenance creation after Cookie authorization", async () => {
    const response = await createMaintenanceTicket(
      req("http://localhost/api/v1/maintenance", "POST", { title: "Repair" }),
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

  it("DIRECT_BEHAVIORAL EXEC-003-C16-O01 denies maintenance update before Prisma", async () => {
    sessionMocks.getSession.mockResolvedValue(null);
    const response = await updateMaintenanceTicket(
      req("http://localhost/api/v1/maintenance/ticket-1", "PATCH", {
        status: "completed",
      }),
      { params: Promise.resolve({ id: "ticket-1" }) },
    );
    expect(response.status).toBe(401);
    expect(prismaMocks.ticketUpdate).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C16-O01 reaches tenant-scoped maintenance update", async () => {
    const response = await updateMaintenanceTicket(
      req("http://localhost/api/v1/maintenance/ticket-1", "PATCH", {
        status: "completed",
      }),
      { params: Promise.resolve({ id: "ticket-1" }) },
    );
    expect(response.status).toBe(200);
    expect(prismaMocks.ticketUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ticket-1", tenantId: SESSION.tenantId },
      }),
    );
  });
});
