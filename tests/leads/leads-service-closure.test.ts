/**
 * tests/leads/leads-service-closure.test.ts
 *
 * Leads page closure — application-service tests:
 *  - RBAC (reader/writer/manager groups, DB-backed)
 *  - Tenant scoping on every read and mutation
 *  - Official status model (validation, no legacy stage writes)
 *  - Creation: normalized-phone duplicate detection (incl. archived),
 *    manual assignment rules, decoupled notifications
 *  - Archive/restore with mandatory reason and audit trail
 */

import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";
import { tenantContext, getTenantContext } from "@/lib/tenant-context";

// ─── Prisma Mock ─────────────────────────────────────────────────────────────

const mockLeadFindFirst = vi.fn();
const mockLeadFindMany = vi.fn();
const mockLeadCount = vi.fn();
const mockLeadGroupBy = vi.fn();
const mockLeadUpdate = vi.fn();
const mockLeadCreate = vi.fn();
const mockUserFindFirst = vi.fn();
const mockUserFindMany = vi.fn();
const mockTenantFindFirst = vi.fn();
const mockProjectFindMany = vi.fn();
const mockAuditLogFindMany = vi.fn();
const mockAuditLogCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lead: {
      findFirst: mockLeadFindFirst,
      findMany: mockLeadFindMany,
      count: mockLeadCount,
      groupBy: mockLeadGroupBy,
      update: mockLeadUpdate,
      create: mockLeadCreate,
    },
    user: { findFirst: mockUserFindFirst, findMany: mockUserFindMany },
    tenant: { findFirst: mockTenantFindFirst },
    project: { findMany: mockProjectFindMany },
    auditLog: { findMany: mockAuditLogFindMany },
    $transaction: mockTransaction,
  },
  rawPrisma: {
    user: {
      findFirst: mockUserFindFirst,
      findUnique: vi.fn().mockResolvedValue(null),
    },
    tenant: { findFirst: mockTenantFindFirst, findUnique: mockTenantFindFirst },
    auditLog: { create: mockAuditLogCreate },
  },
}));

// ─── Session / Tenant / Auth Mocks ───────────────────────────────────────────

const mockGetSession = vi.fn();
const mockGetActiveTenant = vi.fn();
const mockIsSuperAdmin = vi.fn();

vi.mock("@/lib/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/tenant", () => ({ getActiveTenant: mockGetActiveTenant }));
vi.mock("@/lib/api-auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-auth-guard")>();
  return {
    ...actual,
    isSuperAdmin: mockIsSuperAdmin,
    hasDatabaseRole: vi.fn(async (session: any, roles: readonly string[]) => {
      const user = await mockUserFindFirst({
        where: { id: session.userId, tenantId: session.tenantId },
      });
      const tenant = await mockTenantFindFirst({
        where: { id: session.tenantId, isActive: true },
      });
      return Boolean(user && tenant && roles.includes(String(user.role)));
    }),
  };
});

// ─── Side-effect Mocks ───────────────────────────────────────────────────────

const mockSendSMS = vi.fn();
const mockSendWhatsApp = vi.fn();

vi.mock("@/lib/notifications", () => ({
  sendSMSNotification: (...args: unknown[]) => mockSendSMS(...args),
  sendWhatsAppNotification: (...args: unknown[]) => mockSendWhatsApp(...args),
}));
vi.mock("@/lib/plan-guard", () => ({
  assertPlanLimit: vi.fn(),
  PlanLimitError: class PlanLimitError extends Error {
    code = "PLAN_LIMIT";
  },
  logPlanBlockedAttempt: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TENANT_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const USER_ID = "bbbbbbbb-0000-0000-0000-000000000001";
const LEAD_ID = "dddddddd-0000-0000-0000-000000000001";
const OTHER_USER_ID = "bbbbbbbb-0000-0000-0000-000000000002";

const VALID_TENANT = { id: TENANT_ID, isActive: true, name: "شركة اختبار" };

function setupAuth(role: string) {
  mockGetSession.mockResolvedValue({ userId: USER_ID, tenantId: TENANT_ID, role });
  mockGetActiveTenant.mockResolvedValue(VALID_TENANT);
  mockIsSuperAdmin.mockResolvedValue(false);
  mockUserFindFirst.mockResolvedValue({ id: USER_ID, tenantId: TENANT_ID, role });
  mockTenantFindFirst.mockResolvedValue(VALID_TENANT);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuditLogCreate.mockResolvedValue({});
  mockLeadFindMany.mockResolvedValue([]);
  mockLeadCount.mockResolvedValue(0);
  mockLeadGroupBy.mockResolvedValue([]);
});

// ─── Status model ────────────────────────────────────────────────────────────

describe("Official lead status model", () => {
  it("contains exactly the 11 approved statuses", async () => {
    const { LEAD_STATUS_VALUES } = await import("@/lib/leads/model");
    expect(LEAD_STATUS_VALUES).toEqual([
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "VISIT_SCHEDULED",
      "VISITED",
      "OFFER_MADE",
      "NEGOTIATION",
      "RESERVED",
      "CONTRACT_SIGNED",
      "WON",
      "LOST",
    ]);
  });

  it("aligns lead access with the platform marketing lead-generation role", async () => {
    const { LEADS_READER_ROLES, LEADS_WRITER_ROLES, LEAD_ASSIGNABLE_ROLES } = await import("@/lib/leads/model");
    expect(LEADS_READER_ROLES).toContain("MARKETING");
    expect(LEADS_WRITER_ROLES).toContain("MARKETING");
    expect(LEAD_ASSIGNABLE_ROLES).toContain("MARKETING");
  });

  it("maps legacy stage names to official statuses without inventing values", async () => {
    const { legacyStageToStatus } = await import("@/lib/leads/model");
    expect(legacyStageToStatus("Qualified")).toBe("QUALIFIED");
    expect(legacyStageToStatus("negotiation")).toBe("NEGOTIATION");
    expect(legacyStageToStatus("Tour Scheduled")).toBe("VISIT_SCHEDULED");
    expect(legacyStageToStatus("Offer Sent")).toBe("OFFER_MADE");
    expect(legacyStageToStatus("WON")).toBe("WON");
  });

  it("refuses to translate the ambiguous 'Closed' automatically", async () => {
    const { legacyStageToStatus } = await import("@/lib/leads/model");
    expect(legacyStageToStatus("Closed")).toBeNull();
    expect(legacyStageToStatus("closed")).toBeNull();
  });
});

// ─── List ────────────────────────────────────────────────────────────────────

describe("getLeadsAction — tenant scoping, pagination, filters", () => {
  it("returns UNAUTHORIZED without a session and reads nothing", async () => {
    mockGetSession.mockResolvedValue(null);

    const { getLeadsAction } = await import("@/app/actions/leads");
    const result = await getLeadsAction({ page: 1, limit: 10 });

    expect(result.success).toBe(false);
    expect(result.code).toBe("UNAUTHORIZED");
    expect(result.data).toEqual([]);
    expect(mockLeadFindMany).not.toHaveBeenCalled();
  });

  it("does not execute the callback or Prisma reads when RBAC returns FORBIDDEN", async () => {
    setupAuth("READ_ONLY");

    const { getLeadsAction } = await import("@/app/actions/leads");
    const result = await getLeadsAction({ page: 1, limit: 10 });

    expect(result.success).toBe(false);
    expect(result.code).toBe("FORBIDDEN");
    expect(mockGetActiveTenant).not.toHaveBeenCalled();
    expect(mockLeadFindMany).not.toHaveBeenCalled();
  });

  it("keeps tenant context available inside the callback that executes Prisma", async () => {
    setupAuth("ADMIN");
    mockLeadFindMany.mockImplementation(async () => {
      expect(getTenantContext()).toEqual({ tenantId: TENANT_ID, userId: USER_ID });
      return [];
    });

    const { getLeadsAction } = await import("@/app/actions/leads");
    const result = await getLeadsAction({ page: 1, limit: 10 });

    expect(result.success).toBe(true);
    expect(mockLeadFindMany).toHaveBeenCalled();
  });

  it("scopes queries to the tenant, excludes archived, paginates on the server", async () => {
    setupAuth("ADMIN");

    const { getLeadsAction } = await import("@/app/actions/leads");
    await getLeadsAction({ page: 3, limit: 10, q: "احمد", status: "QUALIFIED" });

    expect(mockLeadFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT_ID,
          isArchived: false,
          status: "QUALIFIED",
          OR: expect.any(Array),
        }),
        skip: 20,
        take: 10,
      }),
    );
    expect(mockLeadGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, isArchived: false },
      }),
    );
  });

  it("ignores unapproved status filter values", async () => {
    setupAuth("ADMIN");

    const { getLeadsAction } = await import("@/app/actions/leads");
    await getLeadsAction({ status: "HACKED" as any });

    const where = mockLeadFindMany.mock.calls[0][0].where;
    expect(where.status).toBeUndefined();
  });

  it("computes KPIs from the status groupBy", async () => {
    setupAuth("ADMIN");
    mockLeadGroupBy.mockResolvedValue([
      { status: "NEW", _count: { _all: 5 } },
      { status: "QUALIFIED", _count: { _all: 3 } },
      { status: "WON", _count: { _all: 2 } },
    ]);

    const { getLeadsAction } = await import("@/app/actions/leads");
    const result = await getLeadsAction();

    expect(result.kpis).toEqual({
      total: 10,
      newCount: 5,
      qualifiedCount: 3,
      wonCount: 2,
      conversion: 20,
    });
  });
});

// ─── Status change ───────────────────────────────────────────────────────────

describe("updateLeadStatusAction — validation & guards", () => {
  it("rejects values outside the official status list", async () => {
    setupAuth("ADMIN");

    const { updateLeadStatusAction } = await import("@/app/actions/leads");
    const result = await updateLeadStatusAction(LEAD_ID, "Closed" as any);

    expect(result.success).toBe(false);
    expect((result as any).code).toBe("VALIDATION");
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it("accepts the new QUALIFIED status with tenant-scoped update + audit", async () => {
    setupAuth("ADMIN");
    mockLeadFindFirst.mockResolvedValue({ id: LEAD_ID, status: "CONTACTED" });
    mockLeadUpdate.mockResolvedValue({ id: LEAD_ID, status: "QUALIFIED" });

    const { updateLeadStatusAction } = await import("@/app/actions/leads");
    const result = await updateLeadStatusAction(LEAD_ID, "QUALIFIED");

    expect(result.success).toBe(true);
    expect(mockLeadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: LEAD_ID, tenantId: TENANT_ID },
        data: expect.objectContaining({ status: "QUALIFIED" }),
      }),
    );
    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "LEAD_STATUS_UPDATED" }),
      }),
    );
    // The legacy stage column must never be written.
    expect(JSON.stringify(mockLeadUpdate.mock.calls[0][0].data)).not.toContain('"stage"');
  });

  it("blocks reader-only roles from mutating status", async () => {
    setupAuth("rental_manager");

    const { updateLeadStatusAction } = await import("@/app/actions/leads");
    const result = await updateLeadStatusAction(LEAD_ID, "QUALIFIED");

    expect(result.success).toBe(false);
    expect((result as any).code).toBe("FORBIDDEN");
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it("does not update another tenant's lead when the lookup misses", async () => {
    setupAuth("ADMIN");
    mockLeadFindFirst.mockResolvedValue(null);

    const { updateLeadStatusAction } = await import("@/app/actions/leads");
    const result = await updateLeadStatusAction("other-tenant-lead", "QUALIFIED");

    expect(result.success).toBe(false);
    expect((result as any).code).toBe("NOT_FOUND");
    expect(mockLeadFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "other-tenant-lead", tenantId: TENANT_ID },
      }),
    );
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });
});

// ─── Creation ────────────────────────────────────────────────────────────────

function setupCreateTransaction() {
  mockTransaction.mockImplementation(async (callback: any) =>
    callback({
      lead: {
        create: mockLeadCreate.mockResolvedValue({
          id: LEAD_ID,
          firstName: "سارة",
          phone: "0501234567",
          source: "DIRECT",
          assignedUser: null,
        }),
      },
    }),
  );
}

function createForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  form.set("firstName", "سارة");
  form.set("phone", "0501234567");
  for (const [key, value] of Object.entries(overrides)) form.set(key, value);
  return form;
}

describe("createManagedLeadAction — authorization, dedup, assignment", () => {
  it("requires a session", async () => {
    mockGetSession.mockResolvedValue(null);

    const { createManagedLeadAction } = await import("@/app/actions/leads");
    const result = await createManagedLeadAction(createForm());

    expect(result.success).toBe(false);
    expect((result as any).code).toBe("UNAUTHORIZED");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("detects an active duplicate through the normalized phone hash", async () => {
    setupAuth("SALES_EMPLOYEE");
    mockLeadFindFirst.mockResolvedValue({
      id: "existing-1",
      firstName: "خالد",
      lastName: null,
      isArchived: false,
    });

    const { createManagedLeadAction } = await import("@/app/actions/leads");
    // Same number, different formatting — must still collide via the hash.
    const result = await createManagedLeadAction(createForm({ phone: "+966 50-123-4567" }));

    expect(result.success).toBe(false);
    expect((result as any).code).toBe("DUPLICATE_ACTIVE");
    expect((result as any).duplicateLeadId).toBe("existing-1");
    expect(mockTransaction).not.toHaveBeenCalled();

    const where = mockLeadFindFirst.mock.calls[0][0].where;
    expect(where.tenantId).toBe(TENANT_ID);
    expect(typeof where.phoneHash).toBe("string");
    expect(where.phoneHash.length).toBeGreaterThan(0);
  });

  it("surfaces archived duplicates for restore instead of duplicating", async () => {
    setupAuth("SALES_EMPLOYEE");
    mockLeadFindFirst.mockResolvedValue({
      id: "archived-1",
      firstName: "منى",
      lastName: null,
      isArchived: true,
    });

    const { createManagedLeadAction } = await import("@/app/actions/leads");
    const result = await createManagedLeadAction(createForm());

    expect(result.success).toBe(false);
    expect((result as any).code).toBe("DUPLICATE_ARCHIVED");
    expect((result as any).duplicateLeadId).toBe("archived-1");
  });

  it("blocks an employee from assigning the lead to someone else", async () => {
    setupAuth("SALES_EMPLOYEE");
    mockLeadFindFirst.mockResolvedValue(null);

    const { createManagedLeadAction } = await import("@/app/actions/leads");
    const result = await createManagedLeadAction(createForm({ assignedTo: OTHER_USER_ID }));

    expect(result.success).toBe(false);
    expect((result as any).code).toBe("FORBIDDEN");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("creates with status NEW, no stage write, and unassigned by default", async () => {
    setupAuth("SALES_EMPLOYEE");
    mockLeadFindFirst.mockResolvedValue(null);
    setupCreateTransaction();

    const { createManagedLeadAction } = await import("@/app/actions/leads");
    const result = await createManagedLeadAction(createForm());

    expect(result.success).toBe(true);
    const data = mockLeadCreate.mock.calls[0][0].data;
    expect(data.status).toBe("NEW");
    expect(data.assignedTo).toBeNull();
    expect(data.tenantId).toBe(TENANT_ID);
    expect("stage" in data).toBe(false);
    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "LEAD_CREATED" }),
      }),
    );
  });

  it("does not reject an authorized MARKETING user when creating a lead", async () => {
    setupAuth("MARKETING");
    mockLeadFindFirst.mockResolvedValue(null);
    setupCreateTransaction();

    const { createManagedLeadAction } = await import("@/app/actions/leads");
    const result = await createManagedLeadAction(createForm());

    expect(result.success).toBe(true);
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockLeadCreate.mock.calls[0][0].data.createdBy).toBe(USER_ID);
  });

  it("does not fail creation when the welcome SMS fails", async () => {
    setupAuth("SALES_EMPLOYEE");
    mockLeadFindFirst.mockResolvedValue(null);
    setupCreateTransaction();
    mockSendSMS.mockRejectedValue(new Error("SMS gateway down"));

    const { createManagedLeadAction } = await import("@/app/actions/leads");
    const result = await createManagedLeadAction(createForm());

    expect(result.success).toBe(true);
    expect(mockSendSMS).toHaveBeenCalled();
  });
});

// ─── Form loaders ───────────────────────────────────────────────────────────

describe("getProjectsAction / getAssignableUsersAction — authorized loaders", () => {
  it("returns tenant-scoped projects for an authorized MARKETING user", async () => {
    setupAuth("MARKETING");
    mockProjectFindMany.mockResolvedValue([
      { id: "project-1", name: "Orca Tower", city: "Riyadh" },
    ]);

    const { getProjectsAction } = await import("@/app/actions/leads");
    const result = await getProjectsAction();

    expect(result).toEqual([{ id: "project-1", name: "Orca Tower", city: "Riyadh" }]);
    expect(mockProjectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID },
        select: { id: true, name: true, city: true },
      }),
    );
  });

  it("returns assignable user names for an authorized MARKETING user", async () => {
    setupAuth("MARKETING");
    mockUserFindMany.mockResolvedValue([
      { id: USER_ID, name: "Maha Marketing", role: "MARKETING" },
    ]);

    const { getAssignableUsersAction } = await import("@/app/actions/leads");
    const result = await getAssignableUsersAction();

    expect(result).toEqual([{ id: USER_ID, name: "Maha Marketing", role: "MARKETING" }]);
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT_ID,
          isActive: true,
          role: { in: expect.arrayContaining(["MARKETING"]) },
        }),
        select: { id: true, name: true, role: true },
      }),
    );
  });
});

// ─── Assignment ──────────────────────────────────────────────────────────────

describe("assignLeadAction — manager-only reassignment", () => {
  it("blocks SALES_EMPLOYEE from reassigning", async () => {
    setupAuth("SALES_EMPLOYEE");

    const { assignLeadAction } = await import("@/app/actions/leads");
    const result = await assignLeadAction(LEAD_ID, OTHER_USER_ID);

    expect(result.success).toBe(false);
    expect((result as any).code).toBe("FORBIDDEN");
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it("lets a manager reassign (and unassign) with an audit entry", async () => {
    setupAuth("SALES_MANAGER");
    mockLeadFindFirst
      .mockResolvedValueOnce({ id: LEAD_ID, assignedTo: null }) // lead FK check
      .mockResolvedValueOnce({ id: LEAD_ID, assignedTo: OTHER_USER_ID });
    mockUserFindFirst
      .mockResolvedValueOnce({ id: USER_ID, tenantId: TENANT_ID, role: "SALES_MANAGER" }) // auth
      .mockResolvedValueOnce({ id: OTHER_USER_ID }); // target user
    mockLeadUpdate.mockResolvedValue({});

    const { assignLeadAction } = await import("@/app/actions/leads");
    const result = await assignLeadAction(LEAD_ID, OTHER_USER_ID);

    expect(result.success).toBe(true);
    expect(mockLeadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: LEAD_ID, tenantId: TENANT_ID },
        data: expect.objectContaining({ assignedTo: OTHER_USER_ID }),
      }),
    );
    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "LEAD_ASSIGNED" }),
      }),
    );
  });
});

// ─── Archive / restore ───────────────────────────────────────────────────────

describe("archiveLeadAction / restoreLeadAction", () => {
  it("requires a reason", async () => {
    setupAuth("ADMIN");

    const { archiveLeadAction } = await import("@/app/actions/leads");
    const result = await archiveLeadAction(LEAD_ID, "   ");

    expect(result.success).toBe(false);
    expect((result as any).code).toBe("VALIDATION");
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it("archives with reason, user, timestamp, and audit — never deletes", async () => {
    setupAuth("ADMIN");
    mockLeadFindFirst.mockResolvedValue({ id: LEAD_ID, isArchived: false });
    mockLeadUpdate.mockResolvedValue({});

    const { archiveLeadAction } = await import("@/app/actions/leads");
    const result = await archiveLeadAction(LEAD_ID, "عميل غير نشط");

    expect(result.success).toBe(true);
    const call = mockLeadUpdate.mock.calls[0][0];
    expect(call.where).toEqual({ id: LEAD_ID, tenantId: TENANT_ID });
    expect(call.data.isArchived).toBe(true);
    expect(call.data.archiveReason).toBe("عميل غير نشط");
    expect(call.data.archivedById).toBe(USER_ID);
    expect(call.data.archivedAt).toBeInstanceOf(Date);
    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "LEAD_ARCHIVED" }),
      }),
    );
  });

  it("blocks non-managers from archiving", async () => {
    setupAuth("SALES_EMPLOYEE");

    const { archiveLeadAction } = await import("@/app/actions/leads");
    const result = await archiveLeadAction(LEAD_ID, "سبب");

    expect(result.success).toBe(false);
    expect((result as any).code).toBe("FORBIDDEN");
  });

  it("restores an archived lead and clears archive metadata", async () => {
    setupAuth("ADMIN");
    mockLeadFindFirst.mockResolvedValue({ id: LEAD_ID, isArchived: true });
    mockLeadUpdate.mockResolvedValue({});

    const { restoreLeadAction } = await import("@/app/actions/leads");
    const result = await restoreLeadAction(LEAD_ID);

    expect(result.success).toBe(true);
    const call = mockLeadUpdate.mock.calls[0][0];
    expect(call.data.isArchived).toBe(false);
    expect(call.data.archiveReason).toBeNull();
    expect(call.data.archivedById).toBeNull();
    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "LEAD_RESTORED" }),
      }),
    );
  });
});

// ─── Regression: tenant context bridge ─────────────────────────────────────

describe("assertServerActionRole — tenant context initialization", () => {
  let enterWithSpy: MockInstance;

  beforeEach(() => {
    enterWithSpy = vi.spyOn(tenantContext, "enterWith");
  });

  it("initializes tenant context on successful role-based auth", async () => {
    const session = { userId: USER_ID, tenantId: TENANT_ID, role: "ADMIN" };
    mockUserFindFirst.mockResolvedValue({ id: USER_ID, tenantId: TENANT_ID, role: "ADMIN" });
    mockTenantFindFirst.mockResolvedValue(VALID_TENANT);

    const { assertServerActionRole } = await import("@/lib/api-auth-guard");
    await assertServerActionRole(session, ["ADMIN"]);

    expect(enterWithSpy).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      userId: USER_ID,
    });
  });

  it("does NOT initialize tenant context on UNAUTHORIZED", async () => {
    const { assertServerActionRole } = await import("@/lib/api-auth-guard");
    await expect(assertServerActionRole(null, [])).rejects.toThrow("UNAUTHORIZED");

    expect(enterWithSpy).not.toHaveBeenCalled();
  });

  it("does NOT initialize tenant context on FORBIDDEN", async () => {
    const session = { userId: USER_ID, tenantId: TENANT_ID, role: "READ_ONLY" };
    mockUserFindFirst.mockResolvedValue({ id: USER_ID, tenantId: TENANT_ID, role: "READ_ONLY" });
    mockTenantFindFirst.mockResolvedValue(VALID_TENANT);

    const { assertServerActionRole } = await import("@/lib/api-auth-guard");
    await expect(assertServerActionRole(session, ["ADMIN"])).rejects.toThrow("FORBIDDEN");

    expect(enterWithSpy).not.toHaveBeenCalled();
  });
});

// ─── Regression: getLeadsAction with empty tenant ──────────────────────────

describe("getLeadsAction — empty tenant returns success", () => {
  it("returns success=true and data=[] when tenant has no leads", async () => {
    setupAuth("ADMIN");

    const { getLeadsAction } = await import("@/app/actions/leads");
    const result = await getLeadsAction({ page: 1, limit: 10 });

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.code).toBeUndefined();
  });
});
