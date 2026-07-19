import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getTenantAndUser: vi.fn(),
  documentFindFirst: vi.fn(),
  documentDeleteMany: vi.fn(),
  taskFindFirst: vi.fn(),
  taskUpdate: vi.fn(),
  leaseFindFirst: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: mocks.authenticateRequest,
}));

vi.mock("@/lib/api-auth-guard", () => ({
  requireDatabaseSession: vi.fn(async () => ({
    session: {
      userId: "user-a",
      tenantId: "tenant-a",
      role: "ADMIN",
    },
    error: null,
  })),
  runWithDatabaseSession: async (
    _request: NextRequest,
    _allowedRoles: readonly string[],
    operation: (
      session: { userId: string; tenantId: string; role: string },
    ) => Promise<unknown> | unknown,
  ) =>
    operation({
      userId: "user-a",
      tenantId: "tenant-a",
      role: "ADMIN",
    }),
  TENANT_ROLES: ["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE", "MARKETING", "READ_ONLY"],
  TENANT_WRITE_ROLES: ["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE"],
  FINANCE_WRITE_ROLES: ["ADMIN", "SALES_MANAGER"],
}));
vi.mock("@/lib/api-helpers", () => ({
  getTenantAndUser: mocks.getTenantAndUser,
}));

vi.mock("@/lib/documents/access", () => ({
  DOCUMENT_DELETE_ROLES: ["ADMIN", "SALES_MANAGER"],
  DOCUMENT_READ_ROLES: ["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE", "MARKETING", "READ_ONLY"],
  DocumentAccessError: class DocumentAccessError extends Error {},
  runWithDocumentAccess: async (
    _roles: readonly string[],
    operation: (access: { tenantId: string; userId: string; role: string }) => Promise<unknown>,
  ) => operation({ tenantId: "tenant-a", userId: "user-a", role: "ADMIN" }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: {
      findFirst: mocks.documentFindFirst,
      deleteMany: mocks.documentDeleteMany,
    },
    task: {
      findFirst: mocks.taskFindFirst,
      update: mocks.taskUpdate,
    },
    rentalLease: {
      findFirst: mocks.leaseFindFirst,
    },
  },
}));

import { DELETE as deleteDocument } from "@/app/api/v1/documents/[id]/route";
import { PATCH as completeTask } from "@/app/api/v1/tasks/[id]/complete/route";
import { GET as getLease } from "@/app/api/v1/leases/[id]/route";

const session = {
  userId: "user-a",
  tenantId: "tenant-a",
  role: "ADMIN",
};

describe("P0 production route tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateRequest.mockResolvedValue(session);
    mocks.getTenantAndUser.mockResolvedValue({
      userId: session.userId,
      tenantId: session.tenantId,
      userRole: session.role,
    });
  });

  it("does not reveal a lease owned by another tenant", async () => {
    mocks.leaseFindFirst.mockResolvedValue(null);

    const response = await getLease(
      new NextRequest("http://localhost/api/v1/leases/lease-b"),
      { params: Promise.resolve({ id: "lease-b" }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.leaseFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lease-b", tenantId: "tenant-a" },
      }),
    );
  });

  it("does not update a task owned by another tenant", async () => {
    mocks.taskFindFirst.mockResolvedValue(null);

    const response = await completeTask(
      new NextRequest("http://localhost/api/v1/tasks/task-b/complete", {
        method: "PATCH",
      }),
      { params: Promise.resolve({ id: "task-b" }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.taskUpdate).not.toHaveBeenCalled();
  });

  it("includes tenantId in the task mutation", async () => {
    mocks.taskFindFirst.mockResolvedValue({
      id: "task-a",
      tenantId: "tenant-a",
      auditLog: "",
    });
    mocks.taskUpdate.mockResolvedValue({
      id: "task-a",
      tenantId: "tenant-a",
      status: "COMPLETED",
    });

    const response = await completeTask(
      new NextRequest("http://localhost/api/v1/tasks/task-a/complete", {
        method: "PATCH",
      }),
      { params: Promise.resolve({ id: "task-a" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.taskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-a", tenantId: "tenant-a" },
      }),
    );
  });

  it("does not delete a document owned by another tenant", async () => {
    mocks.documentFindFirst.mockResolvedValue(null);

    const response = await deleteDocument(
      new NextRequest("http://localhost/api/v1/documents/document-b", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "document-b" }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.documentDeleteMany).not.toHaveBeenCalled();
  });

  it("includes tenantId in the document deletion", async () => {
    mocks.documentFindFirst.mockResolvedValue({
      id: "document-a",
      tenantId: "tenant-a",
    });
    mocks.documentDeleteMany.mockResolvedValue({ count: 1 });

    const response = await deleteDocument(
      new NextRequest("http://localhost/api/v1/documents/document-a", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "document-a" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.documentDeleteMany).toHaveBeenCalledWith({
      where: { id: "document-a", tenantId: "tenant-a" },
    });
  });
});
