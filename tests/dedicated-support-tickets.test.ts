import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockWriteAuditLog,
  prismaMock,
} = vi.hoisted(() => {
  const mockWriteAuditLog = vi.fn();
  const prismaMock = {
    ticket: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  };
  return { mockWriteAuditLog, prismaMock };
});

vi.mock("@/lib/api-auth-guard", () => ({
  TENANT_ROLES: ["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE", "MARKETING", "READ_ONLY"],
  runWithDatabaseSession: vi.fn(
    async (_request: any, _roles: readonly string[], operation: (session: any) => unknown) =>
      operation({ tenantId: "tenant-1", userId: "user-1", role: "ADMIN" }),
  ),
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: (...args: any[]) => mockWriteAuditLog(...args),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/http-error-response", () => ({
  httpErrorResponse: vi.fn((_request: any, _code: any, context: string) => ({
    status: 500,
    json: async () => ({ success: false, error: context }),
  })),
}));

vi.mock("@/lib/errors", () => ({
  ErrorCode: { INTERNAL_ERROR: "INTERNAL_ERROR" },
}));

import { POST } from "@/app/api/v1/support/tickets/route";

function makeRequest(description: string) {
  return {
    json: async () => ({
      title: "استفسار",
      description,
    }),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.ticket.create.mockResolvedValue({
    id: "ticket-1",
    title: "استفسار",
    description: "أحتاج إلى مساعدة فنية",
    status: "OPEN",
    aiResponse: null,
    createdAt: new Date("2026-07-13T00:00:00.000Z"),
    updatedAt: new Date("2026-07-13T00:00:00.000Z"),
  });
  mockWriteAuditLog.mockResolvedValue(undefined);
});

describe("support ticket API", () => {
  it("returns a real created ticket without a fabricated assistant response", async () => {
    const response = await POST(makeRequest("أريد ترقية باقة والدفع وربط نطاق"));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.aiResponse).toBeNull();
    expect(prismaMock.ticket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        aiResponse: null,
      }),
    });
  });

  it("does not expose simulated payment or provider instructions", async () => {
    const response = await POST(makeRequest("أريد ترقية باقة والدفع وربط نطاق"));
    const body = await response.json();
    const text = body.data.aiResponse || "";

    expect(text).not.toContain("مدى");
    expect(text).not.toContain("فيزا");
    expect(text).not.toContain("STC Pay");
    expect(text).not.toContain("cname.vercel-dns.com");
  });
});
