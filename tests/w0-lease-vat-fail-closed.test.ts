import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  leaseFindFirst: vi.fn(),
  tenantUpdate: vi.fn(),
  invoiceCreate: vi.fn(),
}));

vi.mock("@/lib/auth/exec-003-permission-assignments", () => ({
  EXEC_003_DATABASE_ROLES: ["ADMIN"],
}));

vi.mock("@/lib/auth/exec-003-shared-guard", () => ({
  runWithExec003CookiePermission: async (
    _request: NextRequest,
    _roles: readonly string[],
    _permission: string,
    operation: (session: { tenantId: string; userId: string; role: string }) =>
      | Promise<NextResponse>
      | NextResponse,
  ) => operation({ tenantId: "tenant-1", userId: "user-1", role: "ADMIN" }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rentalLease: { findFirst: mocks.leaseFindFirst },
    $transaction: async (operation: (tx: unknown) => Promise<unknown>) =>
      operation({
        tenant: { update: mocks.tenantUpdate },
        invoice: { create: mocks.invoiceCreate },
      }),
  },
}));

vi.mock("@/lib/zatca/qr", () => ({
  buildQrPayload: vi.fn(() => ({ payload: true })),
  encodeQrCode: vi.fn(() => "qr-code"),
  generateQrImage: vi.fn(async () => "qr-image"),
  formatInvoiceLabel: vi.fn(() => "INV-1"),
}));

import { POST } from "@/app/api/v1/leases/[id]/invoices/route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/v1/leases/lease-1/invoices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("W0 lease invoice VAT classification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed when vatType is omitted instead of defaulting to STANDARD", async () => {
    const response = await POST(
      request({ subtotal: 1000, dueDate: "2026-09-01" }),
      { params: Promise.resolve({ id: "lease-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false });
    expect(mocks.leaseFindFirst).not.toHaveBeenCalled();
  });

  it("rejects an unsupported VAT classification before persistence", async () => {
    const response = await POST(
      request({ subtotal: 1000, vatType: "UNKNOWN", dueDate: "2026-09-01" }),
      { params: Promise.resolve({ id: "lease-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "Invalid VAT type",
    });
    expect(mocks.leaseFindFirst).not.toHaveBeenCalled();
  });

  it("preserves an explicit EXEMPT classification", async () => {
    mocks.leaseFindFirst.mockResolvedValue({
      id: "lease-1",
      tenantId: "tenant-1",
      tenant: {
        id: "tenant-1",
        companyName: "ORCA Customer",
        vatNumber: "310000000000003",
        invoicePrefix: "INV",
      },
    });
    mocks.tenantUpdate.mockResolvedValue({
      id: "tenant-1",
      companyName: "ORCA Customer",
      vatNumber: "310000000000003",
      invoicePrefix: "INV",
      nextInvoiceNumber: 2,
    });
    mocks.invoiceCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "invoice-1",
      invoiceNumber: 1,
      invoicePrefix: "INV",
      issueDate: new Date("2026-08-14T00:00:00Z"),
      dueDate: new Date(String(data.dueDate)),
      subtotal: data.subtotal,
      vatRate: data.vatRate,
      vatAmount: data.vatAmount,
      totalAmount: data.totalAmount,
      qrCode: "qr-code",
      qrImage: "qr-image",
      zatcaStatus: "NOT_SUBMITTED",
      status: "unpaid",
      leaseId: "lease-1",
      lease: { unitName: "Unit 1", tenantName: "Tenant" },
    }));

    const response = await POST(
      request({ subtotal: 1000, vatType: "EXEMPT", dueDate: "2026-09-01" }),
      { params: Promise.resolve({ id: "lease-1" }) },
    );

    expect(response.status).toBe(201);
    expect(mocks.invoiceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 1000,
          vatRate: 0,
          vatAmount: 0,
          totalAmount: 1000,
        }),
      }),
    );
  });
});
