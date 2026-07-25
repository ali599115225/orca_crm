import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Exec003DatabaseRole } from "@/lib/auth/exec-003-permission-assignments";

vi.mock("server-only", () => ({}));

const authMocks = vi.hoisted(() => ({ requireAuth: vi.fn() }));
const bootstrapMocks = vi.hoisted(() => ({
  findUserEmail: vi.fn(),
  findUserRole: vi.fn(),
  findTenantActive: vi.fn(),
}));
const databaseState = vi.hoisted(() => ({
  userPresent: true,
  userActive: true,
  userTenantId: "tenant-1",
  role: "ADMIN",
  tenantActive: true,
}));
const progressiveState = vi.hoisted(() => ({
  permissionKey: null as string | null,
  roles: null as readonly Exec003DatabaseRole[] | null,
}));
const sessionMocks = vi.hoisted(() => ({ getSession: vi.fn() }));
const tenantMocks = vi.hoisted(() => ({
  runWithTenantContext: vi.fn(
    async (_context: unknown, operation: () => unknown) => await operation(),
  ),
  setTenantContext: vi.fn(),
}));
const prismaMocks = vi.hoisted(() => ({
  invoiceFindMany: vi.fn(),
  invoiceFindFirst: vi.fn(),
  contractFindMany: vi.fn(),
  workflowCreate: vi.fn(),
}));
const domainMocks = vi.hoisted(() => ({ cancelDraftContract: vi.fn() }));
const accountingMocks = vi.hoisted(() => ({
  getSupplierBalances: vi.fn(),
  getPayablesReport: vi.fn(),
  getPayablesSummary: vi.fn(),
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
vi.mock("@/lib/auth/exec-003-permission-assignments", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/auth/exec-003-permission-assignments")>();
  return {
    ...actual,
    exec003ProgressiveRolesForPermission: (permissionKey: string) =>
      progressiveState.permissionKey === permissionKey
        ? progressiveState.roles
        : actual.exec003ProgressiveRolesForPermission(permissionKey),
  };
});
vi.mock("@/lib/session", () => ({ getSession: sessionMocks.getSession }));
vi.mock("@/lib/tenant-context", () => ({
  runWithTenantContext: tenantMocks.runWithTenantContext,
  setTenantContext: tenantMocks.setTenantContext,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    invoice: {
      findMany: prismaMocks.invoiceFindMany,
      findFirst: prismaMocks.invoiceFindFirst,
    },
    contract: { findMany: prismaMocks.contractFindMany },
    automationWorkflow: { create: prismaMocks.workflowCreate },
  },
}));
vi.mock("@/lib/domain/transaction-spine", () => ({
  cancelDraftContract: domainMocks.cancelDraftContract,
}));
vi.mock("@/lib/accounting", () => ({
  getSupplierBalances: accountingMocks.getSupplierBalances,
  getPayablesReport: accountingMocks.getPayablesReport,
  getPayablesSummary: accountingMocks.getPayablesSummary,
}));

import { POST as cancelContract } from "@/app/api/v1/contracts/[id]/cancel/route";
import { GET as listContractInvoices } from "@/app/api/v1/contracts/[id]/invoices/route";
import { GET as readPayables } from "@/app/api/v1/accounting/payables/route";
import { getRentalContractsAction } from "@/app/actions/rentals";
import { POST as createWorkflow } from "@/app/api/v1/automation/workflows/route";
import { GET as readPaylinkStatus } from "@/app/api/v1/invoices/[id]/paylink/status/route";

const SESSION = Object.freeze({
  userId: "user-1",
  tenantId: "tenant-1",
  role: "ADMIN",
});

function request(url: string, method = "GET", body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      authorization: "Bearer test-token",
      "content-type": "application/json",
      "x-request-id": "exec-003-entrypoint-security-matrix",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  databaseState.userPresent = true;
  databaseState.userActive = true;
  databaseState.userTenantId = SESSION.tenantId;
  databaseState.role = "ADMIN";
  databaseState.tenantActive = true;
  progressiveState.permissionKey = null;
  progressiveState.roles = null;

  authMocks.requireAuth.mockResolvedValue(SESSION);
  sessionMocks.getSession.mockResolvedValue(SESSION);
  bootstrapMocks.findUserEmail.mockResolvedValue(null);
  bootstrapMocks.findUserRole.mockImplementation(
    async (userId: string, tenantId: string) => {
      if (!databaseState.userPresent || !databaseState.userActive) return null;
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

  prismaMocks.invoiceFindMany.mockResolvedValue([]);
  prismaMocks.invoiceFindFirst.mockResolvedValue(null);
  prismaMocks.contractFindMany.mockResolvedValue([]);
  prismaMocks.workflowCreate.mockResolvedValue({ id: "workflow-1" });
  domainMocks.cancelDraftContract.mockResolvedValue({ id: "contract-1" });
  accountingMocks.getSupplierBalances.mockResolvedValue([]);
});

describe("EXEC-003 inactive-user entry-point coverage matrix", () => {
  it("INACTIVE_USER_ENTRY_POINT bearer-capable mutation C03 denies before downstream", async () => {
    databaseState.userActive = false;
    const response = await cancelContract(
      request("http://localhost/api/v1/contracts/contract-1/cancel", "POST", {
        reason: "owner request",
      }),
      { params: Promise.resolve({ id: "contract-1" }) },
    );

    expect(response.status).toBe(403);
    expect(domainMocks.cancelDraftContract).not.toHaveBeenCalled();
  });

  it("INACTIVE_USER_ENTRY_POINT Cookie-only read C04 denies before downstream", async () => {
    databaseState.userActive = false;
    const response = await listContractInvoices(
      request("http://localhost/api/v1/contracts/contract-1/invoices"),
      { params: Promise.resolve({ id: "contract-1" }) },
    );

    expect(response.status).toBe(403);
    expect(authMocks.requireAuth).not.toHaveBeenCalled();
    expect(prismaMocks.invoiceFindMany).not.toHaveBeenCalled();
  });

  it("INACTIVE_USER_ENTRY_POINT sensitive read C20 denies before downstream", async () => {
    databaseState.userActive = false;
    const response = await readPayables(
      request("http://localhost/api/v1/accounting/payables"),
    );

    expect(response.status).toBe(403);
    expect(accountingMocks.getSupplierBalances).not.toHaveBeenCalled();
  });

  it("INACTIVE_USER_ENTRY_POINT Server Action C25 denies before downstream", async () => {
    databaseState.userActive = false;
    const result = await getRentalContractsAction();

    expect(result.success).toBe(false);
    expect(prismaMocks.contractFindMany).not.toHaveBeenCalled();
  });

  it("INACTIVE_USER_ENTRY_POINT Cookie-only mutation C14-O02 denies before downstream", async () => {
    databaseState.userActive = false;
    const response = await createWorkflow(
      request("http://localhost/api/v1/automation/workflows", "POST", {
        name: "Workflow",
        triggerEvent: "LEAD_CREATED",
        actionsJson: [{ type: "notify" }],
      }),
    );

    expect(response.status).toBe(403);
    expect(authMocks.requireAuth).not.toHaveBeenCalled();
    expect(prismaMocks.workflowCreate).not.toHaveBeenCalled();
  });

  it("INACTIVE_USER_ENTRY_POINT P1 sensitive read C22 denies before downstream", async () => {
    databaseState.userActive = false;
    const response = await readPaylinkStatus(
      request("http://localhost/api/v1/invoices/invoice-1/paylink/status"),
      { params: Promise.resolve({ id: "invoice-1" }) },
    );

    expect(response.status).toBe(403);
    expect(prismaMocks.invoiceFindFirst).not.toHaveBeenCalled();
  });
});

describe("EXEC-003 actual entry-point progressive denial", () => {
  it("PROGRESSIVE_DENY_ENTRY_POINT C03 keeps Legacy allow AND Progressive deny as DENY", async () => {
    databaseState.role = "SALES_MANAGER";
    progressiveState.permissionKey = "contracts.cancel.execute";
    progressiveState.roles = ["ADMIN"];

    const response = await cancelContract(
      request("http://localhost/api/v1/contracts/contract-1/cancel", "POST", {
        reason: "owner request",
      }),
      { params: Promise.resolve({ id: "contract-1" }) },
    );

    expect(response.status).toBe(403);
    expect(bootstrapMocks.findUserRole).toHaveBeenCalledWith(
      SESSION.userId,
      SESSION.tenantId,
    );
    expect(domainMocks.cancelDraftContract).not.toHaveBeenCalled();
  });
});
