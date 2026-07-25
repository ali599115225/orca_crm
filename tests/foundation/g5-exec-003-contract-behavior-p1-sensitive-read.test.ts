import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  hasDatabaseRole: vi.fn(),
  unauthorizedResponse: vi.fn(() => new Response("unauthorized", { status: 401 })),
  forbiddenResponse: vi.fn(() => new Response("forbidden", { status: 403 })),
}));
const sessionMocks = vi.hoisted(() => ({ getSession: vi.fn() }));
const tenantMocks = vi.hoisted(() => ({
  runWithTenantContext: vi.fn(async (_context: unknown, operation: () => unknown) => await operation()),
  setTenantContext: vi.fn(),
}));
const prismaMocks = vi.hoisted(() => ({ invoiceFindFirst: vi.fn() }));
const qrMocks = vi.hoisted(() => ({
  toBuffer: vi.fn(),
  formatInvoiceLabel: vi.fn(() => "INV-2026-1"),
}));

vi.mock("@/lib/api-auth-guard", () => ({
  requireAuth: authMocks.requireAuth,
  hasDatabaseRole: authMocks.hasDatabaseRole,
  unauthorizedResponse: authMocks.unauthorizedResponse,
  forbiddenResponse: authMocks.forbiddenResponse,
}));
vi.mock("@/lib/session", () => ({ getSession: sessionMocks.getSession }));
vi.mock("@/lib/tenant-context", () => ({
  runWithTenantContext: tenantMocks.runWithTenantContext,
  setTenantContext: tenantMocks.setTenantContext,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { invoice: { findFirst: prismaMocks.invoiceFindFirst } },
}));
vi.mock("qrcode", () => ({ default: { toBuffer: qrMocks.toBuffer } }));
vi.mock("@/lib/zatca/qr", () => ({ formatInvoiceLabel: qrMocks.formatInvoiceLabel }));
vi.mock("@/lib/http-error-response", () => ({
  httpErrorResponse: vi.fn(() => new Response("internal-error", { status: 500 })),
}));
vi.mock("@/lib/errors", () => ({
  ErrorCode: { INTERNAL_ERROR: "INTERNAL_ERROR" },
}));

import { GET as readPaylinkStatus } from "@/app/api/v1/invoices/[id]/paylink/status/route";
import { GET as readInvoicePdf } from "@/app/api/v1/invoices/[id]/pdf/route";
import { GET as readInvoiceQr } from "@/app/api/v1/invoices/[id]/qr/route";

const SESSION = Object.freeze({ userId: "user-1", tenantId: "tenant-1", role: "ADMIN" });

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
  authMocks.requireAuth.mockResolvedValue(SESSION);
  authMocks.hasDatabaseRole.mockResolvedValue(true);
  sessionMocks.getSession.mockResolvedValue(SESSION);
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

  it("DIRECT_BEHAVIORAL EXEC-003-C22-O01 reaches the tenant-scoped Paylink status lookup", async () => {
    const response = await readPaylinkStatus(
      req("http://localhost/api/v1/invoices/invoice-1/paylink/status"),
      { params: Promise.resolve({ id: "invoice-1" }) },
    );
    expect(response.status).toBe(404);
    expect(prismaMocks.invoiceFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "invoice-1", tenantId: SESSION.tenantId } }),
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
      expect.objectContaining({ where: { id: "invoice-1", tenantId: SESSION.tenantId } }),
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
      expect.objectContaining({ where: { id: "invoice-1", tenantId: SESSION.tenantId } }),
    );
  });
});
