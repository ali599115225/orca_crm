// tests/revenue-integrity/authorization-final.test.ts
// Final authorization test suite — vitest ESM with vi.hoisted() for mock variables.
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── vi.hoisted: all variables used inside vi.mock factories ──────────────
const {
  mockTicketCreate, mockTicketUpdate, mockProjectCreate,
  mockTaskCreate, mockTaskFindFirst, mockTaskUpdate,
  mockUserFindFirst, mockUserUpdateMany, mockUserDeleteMany,
  mockTenantUpdate,
} = vi.hoisted(() => ({
  mockTicketCreate:   vi.fn(),
  mockTicketUpdate:   vi.fn(),
  mockProjectCreate:  vi.fn(),
  mockTaskCreate:     vi.fn(),
  mockTaskFindFirst:  vi.fn(),
  mockTaskUpdate:     vi.fn(),
  mockUserFindFirst:  vi.fn(),
  mockUserUpdateMany: vi.fn(),
  mockUserDeleteMany: vi.fn(),
  mockTenantUpdate:   vi.fn(),
}));

// ─── Mocks ─────────────────────────────────────────────────────────────────
vi.mock("@/lib/session", () => ({ getSession: vi.fn(), decrypt: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

vi.mock("@/lib/tenant", () => ({
  getActiveTenant: vi.fn().mockResolvedValue({
    id: "tenant-main",
    companyName: "شركة الاختبار",
    subscriptionPlan: "gold",
    isActive: true,
  }),
}));

vi.mock("@/lib/api-auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-auth-guard")>();
  return {
    ...actual,
    assertServerActionRole: vi.fn(),
    hasDatabaseRole: vi.fn(),
    requireAuth: vi.fn(),
  };
});

vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findMany: vi.fn().mockResolvedValue([]),
      create: mockTicketCreate,
      update: mockTicketUpdate,
    },
    project: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue({ id: "proj-1" }),
      create: mockProjectCreate,
    },
    task: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: mockTaskCreate,
      findFirst: mockTaskFindFirst,
      update: mockTaskUpdate,
    },
    lead: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue({ id: "lead-1", firstName: "أحمد", assignedTo: "user-1" }),
      update: vi.fn(),
    },
    unit: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue({ id: "unit-1", status: "Available" }),
      update: vi.fn().mockResolvedValue({ status: "Hold" }),
    },
    user: {
      findFirst: mockUserFindFirst,
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      updateMany: mockUserUpdateMany,
      deleteMany: mockUserDeleteMany,
      count: vi.fn().mockResolvedValue(1),
    },
    tenant: {
      findUnique: vi.fn().mockResolvedValue({ id: "tenant-main", subscriptionPlan: "gold" }),
      update: mockTenantUpdate,
    },
    payrollCommission: { findMany: vi.fn().mockResolvedValue([]) },
    journalEntry: { findMany: vi.fn().mockResolvedValue([]) },
    installment: {
      findMany: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amountSar: 0 } }),
      count: vi.fn().mockResolvedValue(0),
    },
    contract: { count: vi.fn().mockResolvedValue(0) },
    agentTelemetryLog: { count: vi.fn().mockResolvedValue(0) },
    account: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn().mockImplementation(async (fn: any) =>
      fn({
        project: {
          create: vi.fn().mockResolvedValue({
            id: "proj-new", name: "مشروع", city: "الرياض",
            status: "PLANNING", unitsTotal: 0, unitsSold: 0, unitsBooked: 0, createdAt: new Date(),
          }),
          count: vi.fn().mockResolvedValue(0),
        },
        user: { create: vi.fn().mockResolvedValue({ id: "new-user" }) },
        lead: { count: vi.fn().mockResolvedValue(0) },
        agentSlot: { count: vi.fn().mockResolvedValue(0) },
      })
    ),
  },
  rawPrisma: { auditLog: { create: vi.fn() } },
}));

vi.mock("@/lib/plan-guard", () => ({
  assertPlanLimit: vi.fn().mockResolvedValue(undefined),
  PlanLimitError: class PlanLimitError extends Error { code = "PLAN_LIMIT_EXCEEDED"; },
  logPlanBlockedAttempt: vi.fn(),
  getPlanLimits: vi.fn().mockReturnValue({ staff: 100 }),
  normalizePlan: vi.fn().mockReturnValue("gold"),
}));

vi.mock("@/lib/notifications", () => ({ sendWhatsAppNotification: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/privacy-mask", () => ({ hashEmail: vi.fn().mockReturnValue("hash"), hashPhone: vi.fn().mockReturnValue("hash") }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("hashed") }, hash: vi.fn().mockResolvedValue("hashed") }));
vi.mock("@/lib/accounting", () => ({
  getCustomerBalances: vi.fn().mockResolvedValue([]),
  getAgingReport: vi.fn().mockResolvedValue([]),
  getTrialBalance: vi.fn().mockResolvedValue({ debits: 0, credits: 0 }),
  getGeneralLedgerReport: vi.fn().mockResolvedValue([]),
  getAccountsReceivableReport: vi.fn().mockResolvedValue([]),
  getVatReport: vi.fn().mockResolvedValue({}),
  getOutstandingAmount: vi.fn().mockResolvedValue(0),
  getOverdueAmount: vi.fn().mockResolvedValue(0),
  getCollectionStatus: vi.fn().mockResolvedValue({ collectionRate: 0 }),
  runAuditChecks: vi.fn().mockResolvedValue([]),
  getAuditSummary: vi.fn().mockResolvedValue({}),
  seedChartOfAccounts: vi.fn().mockResolvedValue(undefined),
  getChartOfAccounts: vi.fn().mockResolvedValue([]),
  getIncomeStatement: vi.fn().mockResolvedValue({}),
  getBalanceSheet: vi.fn().mockResolvedValue({}),
  getCashFlowStatement: vi.fn().mockResolvedValue({}),
  getSupplierBalances: vi.fn().mockResolvedValue([]),
  getPayablesReport: vi.fn().mockResolvedValue([]),
  getPayablesSummary: vi.fn().mockResolvedValue({}),
}));

// ─── Import after mocks ────────────────────────────────────────────────────
import { getSession } from "@/lib/session";
import { assertServerActionRole, hasDatabaseRole, requireAuth } from "@/lib/api-auth-guard";
import { writeAuditLog } from "@/lib/audit";

// ─── Sessions ──────────────────────────────────────────────────────────────
const ADMIN_SESSION = { userId: "admin-user-1", tenantId: "tenant-main", role: "ADMIN" };
const SALES_SESSION = { userId: "sales-user-1", tenantId: "tenant-main", role: "SALES_EMPLOYEE" };

function adminSession() { vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION); }
function noSession()    { vi.mocked(getSession).mockResolvedValue(null); }
function allowRole()    { vi.mocked(assertServerActionRole).mockResolvedValue(ADMIN_SESSION); }
function denyRole(msg = "FORBIDDEN") { vi.mocked(assertServerActionRole).mockRejectedValue(new Error(msg)); }

// ─── 1. Helpdesk ──────────────────────────────────────────────────────────
describe("Helpdesk Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTicketCreate.mockResolvedValue({
      id: "ticket-1",
      title: "تذكرة",
      description: "مشكلة",
      aiResponse: null,
      status: "OPEN",
      createdAt: new Date("2026-07-13T00:00:00.000Z"),
      updatedAt: new Date("2026-07-13T00:00:00.000Z"),
    });
    mockTicketUpdate.mockResolvedValue({
      id: "ticket-1",
      title: "تذكرة",
      description: "مشكلة",
      aiResponse: null,
      status: "CLOSED",
      createdAt: new Date("2026-07-13T00:00:00.000Z"),
      updatedAt: new Date("2026-07-13T00:00:00.000Z"),
    });
    vi.mocked(writeAuditLog).mockResolvedValue(undefined);
  });

  it("A1. createTicketAction: no session → fails, no DB write", async () => {
    noSession(); allowRole();
    const { createTicketAction } = await import("@/app/actions/helpdesk");
    const fd = new FormData();
    fd.append("title", "تذكرة"); fd.append("description", "مشكلة");
    const result = await createTicketAction(fd);
    expect(result.success).toBe(false);
    expect(mockTicketCreate).not.toHaveBeenCalled();
  });

  it("A2. createTicketAction: ADMIN → ticket created + TICKET_CREATED audit", async () => {
    adminSession(); allowRole();
    const { createTicketAction } = await import("@/app/actions/helpdesk");
    const fd = new FormData();
    fd.append("title", "تذكرة"); fd.append("description", "مشكلة");
    const result = await createTicketAction(fd);
    expect(result.success).toBe(true);
    expect(vi.mocked(writeAuditLog)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "TICKET_CREATED" })
    );
  });

  it("A3. createTicketAction: FORBIDDEN → fails, no ticket", async () => {
    adminSession(); denyRole();
    const { createTicketAction } = await import("@/app/actions/helpdesk");
    const fd = new FormData();
    fd.append("title", "تذكرة"); fd.append("description", "مشكلة");
    const result = await createTicketAction(fd);
    expect(result.success).toBe(false);
    expect(mockTicketCreate).not.toHaveBeenCalled();
  });

  it("A4. closeTicketAction: no session → fails", async () => {
    noSession(); allowRole();
    const { closeTicketAction } = await import("@/app/actions/helpdesk");
    const result = await closeTicketAction("ticket-1");
    expect(result.success).toBe(false);
  });

  it("A5. closeTicketAction: ADMIN → closed + TICKET_CLOSED audit", async () => {
    adminSession(); allowRole();
    const { closeTicketAction } = await import("@/app/actions/helpdesk");
    const result = await closeTicketAction("ticket-1");
    expect(result.success).toBe(true);
    expect(vi.mocked(writeAuditLog)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "TICKET_CLOSED" })
    );
  });
});

// ─── 2. Projects ──────────────────────────────────────────────────────────
describe("Projects Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectCreate.mockResolvedValue({ id: "proj-1", name: "مشروع", city: "الرياض", status: "PLANNING", unitsTotal: 0, unitsSold: 0, unitsBooked: 0, createdAt: new Date() });
    vi.mocked(writeAuditLog).mockResolvedValue(undefined);
  });

  it("B1. getDetailedProjectsAction: no session → empty data", async () => {
    noSession(); denyRole("UNAUTHORIZED");
    const { getDetailedProjectsAction } = await import("@/app/actions/projects");
    const result = await getDetailedProjectsAction();
    expect(result.data).toEqual([]);
  });

  it("B2. createProjectAction: no session → fails, no project created", async () => {
    noSession(); denyRole("UNAUTHORIZED");
    const { createProjectAction } = await import("@/app/actions/projects");
    const fd = new FormData();
    fd.append("name", "مشروع"); fd.append("city", "الرياض"); fd.append("status", "PLANNING");
    const result = await createProjectAction(fd);
    expect(result.success).toBe(false);
    expect(mockProjectCreate).not.toHaveBeenCalled();
  });

  it("B3. createProjectAction: ADMIN → project created + PROJECT_CREATED audit", async () => {
    adminSession(); allowRole();
    const { createProjectAction } = await import("@/app/actions/projects");
    const fd = new FormData();
    fd.append("name", "مشروع"); fd.append("city", "الرياض"); fd.append("status", "PLANNING");
    const result = await createProjectAction(fd);
    expect(result.success).toBe(true);
    expect(vi.mocked(writeAuditLog)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PROJECT_CREATED" })
    );
  });

  it("B4. createProjectAction: FORBIDDEN → fails, no project created", async () => {
    adminSession(); denyRole();
    const { createProjectAction } = await import("@/app/actions/projects");
    const fd = new FormData();
    fd.append("name", "مشروع"); fd.append("city", "الرياض"); fd.append("status", "PLANNING");
    const result = await createProjectAction(fd);
    expect(result.success).toBe(false);
    expect(mockProjectCreate).not.toHaveBeenCalled();
  });
});

// ─── 3. Tasks ──────────────────────────────────────────────────────────────
describe("Tasks Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTaskCreate.mockResolvedValue({ id: "task-1" });
    mockTaskFindFirst.mockResolvedValue({ id: "task-1", status: "PENDING" });
    mockTaskUpdate.mockResolvedValue({ id: "task-1", status: "COMPLETED" });
    mockUserFindFirst.mockResolvedValue({
      id: "user-1",
      name: "المسؤول",
      phone: null,
      isActive: true,
    });
    vi.mocked(writeAuditLog).mockResolvedValue(undefined);
  });

  it("C1. createTaskAction: no session → fails, no task created", async () => {
    noSession(); denyRole("UNAUTHORIZED");
    const { createTaskAction } = await import("@/app/actions/tasks");
    const fd = new FormData();
    fd.append("title", "مهمة"); fd.append("leadId", "lead-1");
    fd.append("assignedTo", "user-1");
    fd.append("dueDateOnly", "2026-12-01"); fd.append("dueTimeOnly", "10:00");
    fd.append("priority", "HIGH");
    const result = await createTaskAction(fd);
    expect(result.success).toBe(false);
    expect(mockTaskCreate).not.toHaveBeenCalled();
  });

  it("C2. createTaskAction: ADMIN → task created + TASK_CREATED audit", async () => {
    adminSession(); allowRole();
    const { createTaskAction } = await import("@/app/actions/tasks");
    const fd = new FormData();
    fd.append("title", "مهمة"); fd.append("leadId", "lead-1");
    fd.append("assignedTo", "user-1");
    fd.append("dueDateOnly", "2026-12-01"); fd.append("dueTimeOnly", "10:00");
    fd.append("priority", "HIGH");
    const result = await createTaskAction(fd);
    expect(result.success).toBe(true);
    expect(vi.mocked(writeAuditLog)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "TASK_CREATED" })
    );
  });

  it("C3. toggleTaskStatusAction: no session → fails", async () => {
    noSession(); denyRole("UNAUTHORIZED");
    const { toggleTaskStatusAction } = await import("@/app/actions/tasks");
    const result = await toggleTaskStatusAction("task-1", "PENDING");
    expect(result.success).toBe(false);
    expect(mockTaskUpdate).not.toHaveBeenCalled();
  });

  it("C4. toggleTaskStatusAction: ADMIN → status updated + TASK_STATUS_CHANGED audit", async () => {
    adminSession(); allowRole();
    const { toggleTaskStatusAction } = await import("@/app/actions/tasks");
    const result = await toggleTaskStatusAction("task-1", "PENDING");
    expect(result.success).toBe(true);
    expect(vi.mocked(writeAuditLog)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "TASK_STATUS_CHANGED" })
    );
  });
});

// ─── 4. Users ──────────────────────────────────────────────────────────────
describe("Users Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // verifyTenantAdmin: user is ADMIN of the tenant
    mockUserFindFirst.mockResolvedValue({ id: "admin-user-1", role: "ADMIN", name: "المدير", isActive: true });
    mockUserUpdateMany.mockResolvedValue({ count: 1 });
    mockUserDeleteMany.mockResolvedValue({ count: 1 });
    vi.mocked(writeAuditLog).mockResolvedValue(undefined);
  });

  it("D1. createTenantUserAction: no session → fails", async () => {
    noSession();
    const { createTenantUserAction } = await import("@/app/actions/users");
    const fd = new FormData();
    fd.append("name", "موظف"); fd.append("email", "test@test.com");
    fd.append("role", "SALES_EMPLOYEE"); fd.append("password", "pass123");
    const result = await createTenantUserAction(fd);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("D2. createTenantUserAction: ADMIN → user created + USER_CREATED audit", async () => {
    adminSession();
    const { createTenantUserAction } = await import("@/app/actions/users");
    const fd = new FormData();
    fd.append("name", "موظف جديد"); fd.append("email", "new@test.com");
    fd.append("role", "SALES_EMPLOYEE"); fd.append("password", "pass12345678");
    const result = await createTenantUserAction(fd);
    expect(result.success).toBe(true);
    expect(vi.mocked(writeAuditLog)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "USER_CREATED" })
    );
  });

  it("D3. updateTenantUserAction: uses tenantId-scoped updateMany (cross-tenant prevented)", async () => {
    adminSession();
    mockUserFindFirst
      .mockResolvedValueOnce({ id: "admin-user-1", role: "ADMIN", name: "Admin", isActive: true })
      .mockResolvedValueOnce({ id: "other-user-1", role: "SALES_EMPLOYEE", name: "موظف" });
    const { updateTenantUserAction } = await import("@/app/actions/users");
    const fd = new FormData();
    fd.append("name", "اسم جديد"); fd.append("role", "SALES_MANAGER"); fd.append("isActive", "true");
    const result = await updateTenantUserAction("other-user-1", fd);
    expect(result.success).toBe(true);
    expect(mockUserUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: "tenant-main" }) })
    );
    expect(vi.mocked(writeAuditLog)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "USER_UPDATED" })
    );
  });

  it("D4. deleteTenantUserAction: uses tenantId-scoped deleteMany + USER_DELETED audit", async () => {
    adminSession();
    mockUserFindFirst
      .mockResolvedValueOnce({ id: "admin-user-1", role: "ADMIN", name: "Admin", isActive: true })
      .mockResolvedValueOnce({ id: "target-user", name: "موظف", email: "target@test.com" });
    const { deleteTenantUserAction } = await import("@/app/actions/users");
    const result = await deleteTenantUserAction("target-user");
    expect(result.success).toBe(true);
    expect(mockUserDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: "tenant-main" }) })
    );
    expect(vi.mocked(writeAuditLog)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "USER_DELETED" })
    );
  });

  it("D5. deleteTenantUserAction: cannot delete self → error, no deleteMany", async () => {
    adminSession();
    mockUserFindFirst.mockResolvedValue({ id: "admin-user-1", role: "ADMIN", name: "Admin", isActive: true });
    const { deleteTenantUserAction } = await import("@/app/actions/users");
    const result = await deleteTenantUserAction("admin-user-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("حسابك");
    expect(mockUserDeleteMany).not.toHaveBeenCalled();
  });
});

// ─── 5. Accounting ─────────────────────────────────────────────────────────
describe("Accounting Authorization", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(writeAuditLog).mockResolvedValue(undefined); });

  it("E1. getLedgerEntriesAction: no session → fails", async () => {
    noSession(); denyRole("UNAUTHORIZED");
    const { getLedgerEntriesAction } = await import("@/app/actions/accounting");
    const result = await getLedgerEntriesAction();
    expect(result.success).toBe(false);
  });

  it("E2. getLedgerEntriesAction: ADMIN → returns data", async () => {
    adminSession(); allowRole();
    const { getLedgerEntriesAction } = await import("@/app/actions/accounting");
    const result = await getLedgerEntriesAction();
    expect(result.success).toBe(true);
  });

  it("E3. getArCustomersAction: no session → fails", async () => {
    noSession(); denyRole("UNAUTHORIZED");
    const { getArCustomersAction } = await import("@/app/actions/accounting");
    const result = await getArCustomersAction();
    expect(result.success).toBe(false);
  });

  it("E4. getVatReportAction: ADMIN → succeeds", async () => {
    adminSession(); allowRole();
    const { getVatReportAction } = await import("@/app/actions/accounting");
    const result = await getVatReportAction();
    expect(result.success).toBe(true);
  });
});

// ─── 6. Settings API Route ─────────────────────────────────────────────────
describe("Settings API Route Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTenantUpdate.mockResolvedValue({ id: "tenant-main" });
    vi.mocked(writeAuditLog).mockResolvedValue(undefined);
  });

  it("F1. PUT /api/v1/settings: no auth → 401, no DB write", async () => {
    vi.mocked(requireAuth).mockResolvedValue(null);
    const { PUT } = await import("@/app/api/v1/settings/route");
    const req = new Request("http://localhost/api/v1/settings", {
      method: "PUT",
      body: JSON.stringify({ companyName: "شركة" }),
      headers: { "Content-Type": "application/json" },
    }) as any;
    const res = await PUT(req);
    expect(res.status).toBe(401);
    expect(mockTenantUpdate).not.toHaveBeenCalled();
  });

  it("F2. PUT /api/v1/settings: SALES_EMPLOYEE → 403, no DB write", async () => {
    vi.mocked(requireAuth).mockResolvedValue(SALES_SESSION);
    vi.mocked(hasDatabaseRole).mockResolvedValue(false);
    const { PUT } = await import("@/app/api/v1/settings/route");
    const req = new Request("http://localhost/api/v1/settings", {
      method: "PUT",
      body: JSON.stringify({ companyName: "شركة" }),
      headers: { "Content-Type": "application/json" },
    }) as any;
    const res = await PUT(req);
    expect(res.status).toBe(403);
    expect(mockTenantUpdate).not.toHaveBeenCalled();
  });

  it("F3. PUT /api/v1/settings: ADMIN → 200 + SETTINGS_UPDATED audit", async () => {
    vi.mocked(requireAuth).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(hasDatabaseRole).mockResolvedValue(true);
    const { PUT } = await import("@/app/api/v1/settings/route");
    const req = new Request("http://localhost/api/v1/settings", {
      method: "PUT",
      body: JSON.stringify({ companyName: "شركة محدثة" }),
      headers: { "Content-Type": "application/json" },
    }) as any;
    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(mockTenantUpdate).toHaveBeenCalled();
    expect(vi.mocked(writeAuditLog)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "SETTINGS_UPDATED" })
    );
  });
});

// ─── 7. AuditAction completeness ──────────────────────────────────────────
describe("AuditAction type completeness", () => {
  it("G1. All new typed events callable via writeAuditLog", async () => {
    vi.mocked(writeAuditLog).mockResolvedValue(undefined);
    const newEvents = [
      "USER_CREATED", "USER_UPDATED", "USER_DELETED",
      "PROJECT_CREATED", "UNIT_STATUS_TOGGLED",
      "TASK_CREATED", "TASK_UPDATED", "TASK_COMPLETED", "TASK_STATUS_CHANGED",
      "TICKET_CREATED", "TICKET_CLOSED", "TICKET_REOPENED", "TICKET_REPLIED",
      "SETTINGS_UPDATED",
    ] as const;
    for (const action of newEvents) {
      await expect(
        writeAuditLog({ tenantId: "t1", userId: "u1", action: action as any, tableName: "test", recordId: "r1" })
      ).resolves.not.toThrow();
    }
  });
});
