import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}));

const bootstrapMocks = vi.hoisted(() => ({
  findUserEmail: vi.fn(),
  findUserRole: vi.fn(),
  findTenantActive: vi.fn(),
}));

const databaseState = vi.hoisted(() => ({
  userPresent: true,
  userTenantId: "exec-003-tenant",
  role: "ADMIN",
  tenantActive: true,
}));

const sessionMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const tenantMocks = vi.hoisted(() => ({
  runWithTenantContext: vi.fn(
    async (
      _context: { tenantId: string; userId?: string },
      operation: () => unknown,
    ) => await operation(),
  ),
  setTenantContext: vi.fn(),
}));

const prismaMocks = vi.hoisted(() => ({
  invoiceFindMany: vi.fn(),
  contractFindFirst: vi.fn(),
  contractFindMany: vi.fn(),
  rentalLeaseFindMany: vi.fn(),
}));

const domainMocks = vi.hoisted(() => ({
  cancelDraftContract: vi.fn(),
  signContract: vi.fn(),
}));

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
  return {
    ...actual,
    requireAuth: authMocks.requireAuth,
  };
});

vi.mock("@/lib/session", () => ({
  getSession: sessionMocks.getSession,
}));

vi.mock("@/lib/tenant-context", () => ({
  runWithTenantContext: tenantMocks.runWithTenantContext,
  setTenantContext: tenantMocks.setTenantContext,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invoice: {
      findMany: prismaMocks.invoiceFindMany,
    },
    contract: {
      findFirst: prismaMocks.contractFindFirst,
      findMany: prismaMocks.contractFindMany,
    },
    rentalLease: {
      findMany: prismaMocks.rentalLeaseFindMany,
    },
  },
}));

vi.mock("@/lib/domain/transaction-spine", () => ({
  cancelDraftContract: domainMocks.cancelDraftContract,
  signContract: domainMocks.signContract,
}));

vi.mock("@/lib/accounting", () => ({
  getSupplierBalances: accountingMocks.getSupplierBalances,
  getPayablesReport: accountingMocks.getPayablesReport,
  getPayablesSummary: accountingMocks.getPayablesSummary,
}));

import { POST as cancelContract } from "@/app/api/v1/contracts/[id]/cancel/route";
import {
  GET as listContractInvoices,
} from "@/app/api/v1/contracts/[id]/invoices/route";
import { GET as readPayables } from "@/app/api/v1/accounting/payables/route";
import { GET as readContractPdf } from "@/app/api/v1/contracts/[id]/pdf/route";
import { getRentalContractsAction } from "@/app/actions/rentals";
import { effectiveRolesForExec003Permission } from "@/lib/auth/exec-003-shared-guard";

const SESSION = Object.freeze({
  userId: "exec-003-user",
  tenantId: "exec-003-tenant",
  role: "ADMIN",
});

function request(
  url: string,
  method = "GET",
  body?: unknown,
  bearer = true,
): NextRequest {
  const headers: Record<string, string> = {
    "x-request-id": "exec-003-contract-behavior-pilot",
  };
  if (bearer) headers.authorization = "Bearer exec-003-test-token";
  if (body !== undefined) headers["content-type"] = "application/json";
  return new NextRequest(url, {
    method,
    headers,
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

  prismaMocks.invoiceFindMany.mockResolvedValue([]);
  prismaMocks.contractFindMany.mockResolvedValue([]);
  prismaMocks.rentalLeaseFindMany.mockResolvedValue([]);
  domainMocks.cancelDraftContract.mockResolvedValue({ id: "contract-1" });
  accountingMocks.getSupplierBalances.mockResolvedValue([]);
});

describe("EXEC-003 contract-level behavioral pilot", () => {
  describe("EXEC-003-C03 POST /api/v1/contracts/[id]/cancel", () => {
    it("DIRECT_BEHAVIORAL C03 returns 401 before the mutation when identity is missing", async () => {
      authMocks.requireAuth.mockResolvedValue(null);

      const response = await cancelContract(
        request(
          "http://localhost/api/v1/contracts/contract-1/cancel",
          "POST",
          { reason: "owner request" },
        ),
        { params: Promise.resolve({ id: "contract-1" }) },
      );

      expect(response.status).toBe(401);
      expect(domainMocks.cancelDraftContract).not.toHaveBeenCalled();
      expect(bootstrapMocks.findUserRole).not.toHaveBeenCalled();
    });

    it("DIRECT_BEHAVIORAL C03 returns 403 when the current database role is denied", async () => {
      databaseState.role = "READ_ONLY";

      const response = await cancelContract(
        request(
          "http://localhost/api/v1/contracts/contract-1/cancel",
          "POST",
          { reason: "owner request" },
        ),
        { params: Promise.resolve({ id: "contract-1" }) },
      );

      expect(response.status).toBe(403);
      expect(domainMocks.cancelDraftContract).not.toHaveBeenCalled();
      expect(bootstrapMocks.findUserRole).toHaveBeenCalledWith(
        SESSION.userId,
        SESSION.tenantId,
      );
    });

    it("DIRECT_BEHAVIORAL C03 reaches the real mutation boundary after authorization", async () => {
      const response = await cancelContract(
        request(
          "http://localhost/api/v1/contracts/contract-1/cancel",
          "POST",
          { reason: "owner request" },
        ),
        { params: Promise.resolve({ id: "contract-1" }) },
      );

      expect(response.status).toBe(200);
      expect(bootstrapMocks.findUserRole).toHaveBeenCalledWith(
        SESSION.userId,
        SESSION.tenantId,
      );
      expect(bootstrapMocks.findTenantActive).toHaveBeenCalledWith(
        SESSION.tenantId,
      );
      expect(domainMocks.cancelDraftContract).toHaveBeenCalledWith({
        tenantId: SESSION.tenantId,
        userId: SESSION.userId,
        contractId: "contract-1",
        reason: "owner request",
      });
    });

    it("DIRECT_BEHAVIORAL EXEC-003-C03-O01 denies an inactive tenant before the mutation", async () => {
      databaseState.tenantActive = false;

      const response = await cancelContract(
        request(
          "http://localhost/api/v1/contracts/contract-1/cancel",
          "POST",
          { reason: "owner request" },
        ),
        { params: Promise.resolve({ id: "contract-1" }) },
      );

      expect(response.status).toBe(403);
      expect(domainMocks.cancelDraftContract).not.toHaveBeenCalled();
    });

    it("DIRECT_BEHAVIORAL EXEC-003-C03-O01 denies a tenant mismatch before the mutation", async () => {
      databaseState.userTenantId = "tenant-2";

      const response = await cancelContract(
        request(
          "http://localhost/api/v1/contracts/contract-1/cancel",
          "POST",
          { reason: "owner request" },
        ),
        { params: Promise.resolve({ id: "contract-1" }) },
      );

      expect(response.status).toBe(403);
      expect(domainMocks.cancelDraftContract).not.toHaveBeenCalled();
    });

    it("DIRECT_BEHAVIORAL EXEC-003-C03-O01 denies an unknown database role before the mutation", async () => {
      databaseState.role = "UNKNOWN_ROLE";

      const response = await cancelContract(
        request(
          "http://localhost/api/v1/contracts/contract-1/cancel",
          "POST",
          { reason: "owner request" },
        ),
        { params: Promise.resolve({ id: "contract-1" }) },
      );

      expect(response.status).toBe(403);
      expect(domainMocks.cancelDraftContract).not.toHaveBeenCalled();
    });
  });

  describe("EXEC-003-C04 GET /api/v1/contracts/[id]/invoices", () => {
    it("DIRECT_BEHAVIORAL C04 rejects Bearer-only identity on the Cookie-only route", async () => {
      sessionMocks.getSession.mockResolvedValue(null);

      const response = await listContractInvoices(
        request("http://localhost/api/v1/contracts/contract-1/invoices"),
        { params: Promise.resolve({ id: "contract-1" }) },
      );

      expect(response.status).toBe(401);
      expect(authMocks.requireAuth).not.toHaveBeenCalled();
      expect(prismaMocks.invoiceFindMany).not.toHaveBeenCalled();
    });

    it("DIRECT_BEHAVIORAL C04 returns 403 before data access when the database denies", async () => {
      databaseState.userPresent = false;

      const response = await listContractInvoices(
        request("http://localhost/api/v1/contracts/contract-1/invoices"),
        { params: Promise.resolve({ id: "contract-1" }) },
      );

      expect(response.status).toBe(403);
      expect(prismaMocks.invoiceFindMany).not.toHaveBeenCalled();
    });

    it("DIRECT_BEHAVIORAL C04 reaches the tenant-scoped read after Cookie authorization", async () => {
      const response = await listContractInvoices(
        request("http://localhost/api/v1/contracts/contract-1/invoices"),
        { params: Promise.resolve({ id: "contract-1" }) },
      );

      expect(response.status).toBe(200);
      expect(prismaMocks.invoiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: SESSION.tenantId,
            contractId: "contract-1",
            type: "SALE",
          },
        }),
      );
    });
  });

  describe("EXEC-003-C20 GET /api/v1/accounting/payables", () => {
    it("DIRECT_BEHAVIORAL C20 returns 401 before the sensitive read when identity is missing", async () => {
      authMocks.requireAuth.mockResolvedValue(null);

      const response = await readPayables(
        request("http://localhost/api/v1/accounting/payables"),
      );

      expect(response.status).toBe(401);
      expect(accountingMocks.getSupplierBalances).not.toHaveBeenCalled();
    });

    it("DIRECT_BEHAVIORAL C20 returns 403 for an unknown or database-denied role", async () => {
      databaseState.userPresent = false;

      const response = await readPayables(
        request("http://localhost/api/v1/accounting/payables"),
      );

      expect(response.status).toBe(403);
      expect(accountingMocks.getSupplierBalances).not.toHaveBeenCalled();
    });

    it("DIRECT_BEHAVIORAL C20 reaches the tenant-scoped sensitive read after authorization", async () => {
      const response = await readPayables(
        request("http://localhost/api/v1/accounting/payables"),
      );

      expect(response.status).toBe(200);
      expect(accountingMocks.getSupplierBalances).toHaveBeenCalledWith(
        SESSION.tenantId,
      );
    });
  });

  describe("EXEC-003-C21 GET /api/v1/contracts/[id]/pdf", () => {
    it("DIRECT_BEHAVIORAL C21 keeps the sensitive PDF read Cookie-only", async () => {
      sessionMocks.getSession.mockResolvedValue(null);

      const response = await readContractPdf(
        request("http://localhost/api/v1/contracts/contract-1/pdf"),
        { params: Promise.resolve({ id: "contract-1" }) },
      );

      expect(response.status).toBe(401);
      expect(authMocks.requireAuth).not.toHaveBeenCalled();
      expect(prismaMocks.contractFindFirst).not.toHaveBeenCalled();
    });

    it("DIRECT_BEHAVIORAL C21 reaches the tenant-scoped PDF lookup after authorization", async () => {
      prismaMocks.contractFindFirst.mockResolvedValue(null);

      const response = await readContractPdf(
        request("http://localhost/api/v1/contracts/contract-1/pdf"),
        { params: Promise.resolve({ id: "contract-1" }) },
      );

      expect(response.status).toBe(404);
      expect(prismaMocks.contractFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "contract-1", tenantId: SESSION.tenantId },
        }),
      );
    });
  });

  describe("EXEC-003-C25 getRentalContractsAction", () => {
    it("DIRECT_BEHAVIORAL C25 rejects missing identity before the Server Action query", async () => {
      sessionMocks.getSession.mockResolvedValue(null);

      const result = await getRentalContractsAction();

      expect(result.success).toBe(false);
      expect(prismaMocks.rentalLeaseFindMany).not.toHaveBeenCalled();
    });

    it("DIRECT_BEHAVIORAL C25 has no Platform Owner bypass when the database denies", async () => {
      sessionMocks.getSession.mockResolvedValue({
        ...SESSION,
        userId: "platform-owner-user",
      });
      databaseState.userPresent = false;

      const result = await getRentalContractsAction();

      expect(result.success).toBe(false);
      expect(prismaMocks.rentalLeaseFindMany).not.toHaveBeenCalled();
      expect(tenantMocks.setTenantContext).not.toHaveBeenCalled();
    });

    it("DIRECT_BEHAVIORAL C25 reaches the tenant-scoped Server Action read after authorization", async () => {
      const result = await getRentalContractsAction();

      expect(result).toEqual({ success: true, rentals: [] });
      expect(bootstrapMocks.findUserRole).toHaveBeenCalledWith(
        SESSION.userId,
        SESSION.tenantId,
      );
      expect(prismaMocks.rentalLeaseFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: SESSION.tenantId },
        }),
      );
    });
  });

  describe("EXEC-003 real role-intersection support", () => {
    it("keeps Legacy deny effective when the progressive permission would allow the role", () => {
      expect(
        effectiveRolesForExec003Permission(
          ["ADMIN"],
          "rentals.contracts.read",
        ),
      ).toEqual(["ADMIN"]);
    });

    it("keeps Progressive deny effective when the Legacy role set would allow the role", () => {
      expect(
        effectiveRolesForExec003Permission(
          ["ADMIN", "SALES_MANAGER", "READ_ONLY"],
          "contracts.cancel.execute",
        ),
      ).toEqual(["ADMIN", "SALES_MANAGER"]);
    });

    it("fails closed for an unknown or missing permission key", () => {
      expect(
        effectiveRolesForExec003Permission(
          ["ADMIN"],
          "unknown.permission",
        ),
      ).toBeNull();
      expect(effectiveRolesForExec003Permission(["ADMIN"], "")).toBeNull();
    });
  });
});
