import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  mockIsDedicatedCopy,
  mockSession,
  mockTenant,
  mockWriteAuditLog,
  prismaMock,
} = vi.hoisted(() => {
  const mockIsDedicatedCopy = vi.fn();
  const mockSession = vi.fn();
  const mockTenant = vi.fn();
  const mockWriteAuditLog = vi.fn();
  const prismaMock = {
    ticket: { create: vi.fn(), update: vi.fn() },
  };
  return { mockIsDedicatedCopy, mockSession, mockTenant, mockWriteAuditLog, prismaMock };
});

vi.mock("@/lib/deployment-license", () => ({
  isDedicatedCopyDeployment: () => mockIsDedicatedCopy(),
}));

vi.mock("@/lib/session", () => ({ getSession: () => mockSession() }));
vi.mock("@/lib/tenant", () => ({ getActiveTenant: () => mockTenant() }));
vi.mock("@/lib/api-auth-guard", () => ({
  assertServerActionRole: vi.fn(async () => ({ userId: "user-1", role: "ADMIN" })),
}));
vi.mock("@/lib/audit", () => ({
  writeAuditLog: (...a: any[]) => mockWriteAuditLog(...a),
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createTicketAction } from "@/app/actions/helpdesk";

const DEFAULT_SESSION = { userId: "user-1", tenantId: "tenant-1" };
const DEFAULT_TENANT = {
  id: "tenant-1",
  companyName: "Test Co",
  subscriptionPlan: "basic",
  subdomain: "test",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.mockResolvedValue(DEFAULT_SESSION);
  mockTenant.mockResolvedValue(DEFAULT_TENANT);
  prismaMock.ticket.create.mockResolvedValue({ id: "ticket-1" });
  prismaMock.ticket.update.mockImplementation(({ data }: any) => Promise.resolve({ id: "ticket-1", ...data }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("helpdesk — DEDICATED_COPY", () => {
  it("DEDICATED_COPY reply does NOT contain مدى", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    const fd = new FormData();
    fd.set("title", "استفسار");
    fd.set("description", "أريد ترقية باقة");

    const result = await createTicketAction(fd);
    const aiReply = (result as any).ticket?.aiResponse || "";

    expect(aiReply).not.toContain("مدى");
  });

  it("DEDICATED_COPY reply does NOT contain فيزا", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    const fd = new FormData();
    fd.set("title", "استفسار");
    fd.set("description", "أريد ترقية باقة");

    const result = await createTicketAction(fd);
    const aiReply = (result as any).ticket?.aiResponse || "";

    expect(aiReply).not.toContain("فيزا");
  });

  it("DEDICATED_COPY reply does NOT contain STC Pay", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    const fd = new FormData();
    fd.set("title", "استفسار");
    fd.set("description", "أريد ترقية باقة");

    const result = await createTicketAction(fd);
    const aiReply = (result as any).ticket?.aiResponse || "";

    expect(aiReply).not.toContain("STC Pay");
  });

  it("DEDICATED_COPY reply does NOT contain ترقية", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    const fd = new FormData();
    fd.set("title", "استفسار");
    fd.set("description", "أريد ترقية باقة");

    const result = await createTicketAction(fd);
    const aiReply = (result as any).ticket?.aiResponse || "";

    expect(aiReply).not.toContain("ترقية");
  });

  it("DEDICATED_COPY reply references independent license", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    const fd = new FormData();
    fd.set("title", "استفسار");
    fd.set("description", "أريد معلومات عن الاشتراك والدفع");

    const result = await createTicketAction(fd);
    const aiReply = (result as any).ticket?.aiResponse || "";

    expect(aiReply).toContain("ترخيص مستقل");
  });

  it("SaaS reply contains payment methods", async () => {
    mockIsDedicatedCopy.mockReturnValue(false);
    const fd = new FormData();
    fd.set("title", "استفسار");
    fd.set("description", "أريد ترقية باقة");

    const result = await createTicketAction(fd);
    const aiReply = (result as any).ticket?.aiResponse || "";

    expect(aiReply).toContain("مدى");
    expect(aiReply).toContain("فيزا");
    expect(aiReply).toContain("STC Pay");
  });
});
