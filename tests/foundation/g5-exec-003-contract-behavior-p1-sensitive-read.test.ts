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
const prismaMocks = vi.hoisted(() => ({ invoiceFindFirst: vi.fn() }));
const qrMocks = vi.hoisted(() => ({
  toBuffer: vi.fn(),
  formatInvoiceLabel: vi.fn(() => "INV-2026-1"),
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
  prisma: { invoice: { findFirst: prismaMocks.invoiceFindFirst } },
}));
vi.mock("qrcode", () => ({ default: { toBuffer: qrMocks.toBuffer } }));
vi.mock("@/lib/zatca/qr", () => ({
  formatInvoiceLabel: qrMocks.formatInvoiceLabel,
}));

import { GET as readPaylinkStatus } from "@/app/api/v1/invoices/[id]/paylink/status/route";
import { GET as readInvoicePdf } from "@/app/api/v1/invoices/[id]/pdf/route";
import { GET as readInvoiceQr } from "@/app/api/v1/invoices/[id]/qr/route";

const SESSION = Object.freeze({
  userId: "user-1",
  tenantId: "tenant-1",
  role: "ADMIN",
});

function req(url: string): NextRequest {
  return new NextRequest(url, {
    headers: {
      authorization: "Bearer test-token",
      "x-request-id": "exec-003-p1-sensitive-read",
    },
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
  prismaMocks.invoiceFindFirst.mockResolvedValue(null);
});

describe("EXEC-003 P1 sensitive-read contract-level behavior", () => {
  it("DIRECT_BEHAVIORAL EXEC-003-C22-O01 returns 401 before Paylink status lookup", async () => {
    authMocks.requireAuth.mockResolvedValue(null);
    const response = await readPaylinkStatus(
      req("http://localhost/api/v1/invoices/invoice-1/paylink/status"),
      { params: Promise.resolve({ id: "invoice-1" }) },
    );
    expect(response.status).toBe(401);
    expect(prismaMocks.invoiceFindFirst).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C22-O01 returns 403 when the database user is missing", async () => {
    databaseState.userPresent = false;
    const response = await readPaylinkStatus(
      req("http://localhost/api/v1/invoices/invoice-1/paylink/status"),
      { params: Promise.resolve({ id: "invoice-1" }) },
    );
    expect(response.status).toBe(403);
    expect(prismaMocks.invoiceFindFirst).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C22-O01 reaches the tenant-scoped Paylink status lookup", async () => {
    const response = await readPaylinkStatus(
      req("http://localhost/api/v1/invoices/invoice-1/paylink/status"),
      { params: Promise.resolve({ id: "invoice-1" }) },
    );
    expect(response.status).toBe(404);
    expect(prismaMocks.invoiceFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invoice-1", tenantId: SESSION.tenantId },
      }),
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C23-O01 rejects Bearer-only invoice PDF access", async () => {
    sessionMocks.getSession.mockResolvedValue(null);
    const response = await readInvoicePdf(
      req("http://localhost/api/v1/invoices/invoice-1/pdf"),
      { params: Promise.resolve({ id: "invoice-1" }) },
    );
    expect(response.status).toBe(401);
    expect(authMocks.requireAuth).not.toHaveBeenCalled();
    expect(prismaMocks.invoiceFindFirst).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C23-O01 reaches the tenant-scoped invoice PDF lookup", async () => {
    const response = await readInvoicePdf(
      req("http://localhost/api/v1/invoices/invoice-1/pdf"),
      { params: Promise.resolve({ id: "invoice-1" }) },
    );
    expect(response.status).toBe(404);
    expect(prismaMocks.invoiceFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invoice-1", tenantId: SESSION.tenantId },
      }),
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C24-O01 rejects Bearer-only invoice QR access", async () => {
    sessionMocks.getSession.mockResolvedValue(null);
    const response = await readInvoiceQr(
      req("http://localhost/api/v1/invoices/invoice-1/qr"),
      { params: Promise.resolve({ id: "invoice-1" }) },
    );
    expect(response.status).toBe(401);
    expect(prismaMocks.invoiceFindFirst).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C24-O01 reaches the tenant-scoped invoice QR lookup", async () => {
    const response = await readInvoiceQr(
      req("http://localhost/api/v1/invoices/invoice-1/qr"),
      { params: Promise.resolve({ id: "invoice-1" }) },
    );
    expect(response.status).toBe(404);
    expect(prismaMocks.invoiceFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invoice-1", tenantId: SESSION.tenantId },
      }),
    );
  });
});
