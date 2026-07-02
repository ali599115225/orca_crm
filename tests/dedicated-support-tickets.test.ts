import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockIsDedicatedCopy,
  mockAuthenticateRequest,
  prismaMock,
} = vi.hoisted(() => {
  const mockIsDedicatedCopy = vi.fn();
  const mockAuthenticateRequest = vi.fn();
  const prismaMock = {
    ticket: { create: vi.fn(), update: vi.fn() },
  };
  return { mockIsDedicatedCopy, mockAuthenticateRequest, prismaMock };
});

vi.mock("@/lib/deployment-license", () => ({
  isDedicatedCopyDeployment: () => mockIsDedicatedCopy(),
}));

vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: (...a: any[]) => mockAuthenticateRequest(...a),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/http-error-response", () => ({
  httpErrorResponse: vi.fn((_req: any, _code: any, _msg: string) => ({
    json: () => Promise.resolve({ error: _msg }),
  })),
}));

vi.mock("@/lib/errors", () => ({
  ErrorCode: { INTERNAL_ERROR: "INTERNAL_ERROR" },
}));

import { POST } from "@/app/api/v1/support/tickets/route";

const SESSION = { tenantId: "tenant-1" };

function makeBody(desc: string) {
  return {
    json: async () => ({ title: "استفسار", description: desc }),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthenticateRequest.mockResolvedValue(SESSION);
  prismaMock.ticket.create.mockResolvedValue({ id: "ticket-1" });
  prismaMock.ticket.update.mockImplementation(({ data }: any) => Promise.resolve({ id: "ticket-1", ...data }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("support tickets API — DEDICATED_COPY", () => {
  it("DEDICATED_COPY reply does NOT contain مدى or فيزا or STC Pay or ترقية", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    const res = await POST(makeBody("أريد ترقية باقة والدفع"));
    const body = await res.json();
    const aiReply = body.data?.aiResponse || "";

    expect(aiReply).not.toContain("مدى");
    expect(aiReply).not.toContain("فيزا");
    expect(aiReply).not.toContain("STC Pay");
    expect(aiReply).not.toContain("ترقية");
  });

  it("DEDICATED_COPY reply references independent license", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    const res = await POST(makeBody("أريد معلومات عن الاشتراك والدفع"));
    const body = await res.json();
    const aiReply = body.data?.aiResponse || "";

    expect(aiReply).toContain("ترخيص مستقل");
  });

  it("SaaS reply contains payment methods", async () => {
    mockIsDedicatedCopy.mockReturnValue(false);
    const res = await POST(makeBody("أريد ترقية باقة"));
    const body = await res.json();
    const aiReply = body.data?.aiResponse || "";

    expect(aiReply).toContain("مدى");
    expect(aiReply).toContain("فيزا");
    expect(aiReply).toContain("STC Pay");
  });
});
