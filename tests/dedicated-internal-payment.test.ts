import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  mockIsDedicatedCopy,
  prismaMock,
  mockSendSMS,
  mockSendEmail,
  mockRevalidatePath,
} = vi.hoisted(() => {
  const mockIsDedicatedCopy = vi.fn();
  const mockSendSMS = vi.fn();
  const mockSendEmail = vi.fn();
  const mockRevalidatePath = vi.fn();
  const prismaMock = {
    tenant: { update: vi.fn() },
    user: { update: vi.fn() },
  };
  return { mockIsDedicatedCopy, prismaMock, mockSendSMS, mockSendEmail, mockRevalidatePath };
});

vi.mock("@/lib/deployment-license", () => ({
  isDedicatedCopyDeployment: () => mockIsDedicatedCopy(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({ sendSMSNotification: (...a: any[]) => mockSendSMS(...a) }));
vi.mock("@/lib/email", () => ({ sendAdminEmailAlert: (...a: any[]) => mockSendEmail(...a) }));
vi.mock("next/cache", () => ({ revalidatePath: (...a: any[]) => mockRevalidatePath(...a) }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("hashed") } }));

import { handleSuccessfulPaymentInternal } from "@/lib/server/internal";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleSuccessfulPaymentInternal — DEDICATED_COPY", () => {
  it("returns failure in DEDICATED_COPY before any Prisma call", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    const result = await handleSuccessfulPaymentInternal("tenant-1", "gold", "MONTHLY");

    expect(result.success).toBe(false);
    expect(result.error).toContain("غير متاح");
    expect(prismaMock.tenant.update).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("does NOT send SMS in DEDICATED_COPY", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    await handleSuccessfulPaymentInternal("tenant-1", "gold", "MONTHLY");
    expect(mockSendSMS).not.toHaveBeenCalled();
  });

  it("does NOT send email in DEDICATED_COPY", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    await handleSuccessfulPaymentInternal("tenant-1", "gold", "MONTHLY");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does NOT call revalidatePath in DEDICATED_COPY", async () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    await handleSuccessfulPaymentInternal("tenant-1", "gold", "MONTHLY");
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("a legacy SaaS mode cannot re-enable subscription activation", async () => {
    mockIsDedicatedCopy.mockReturnValue(false);
    prismaMock.tenant.update.mockResolvedValue({
      id: "tenant-1",
      companyName: "Test",
      subdomain: "test",
      users: [{ id: "u1", email: "admin@test.com", role: "ADMIN" }],
    });

    const result = await handleSuccessfulPaymentInternal("tenant-1", "gold", "MONTHLY");

    expect(prismaMock.tenant.update).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect((result as any).code).toBe("LEGACY_SAAS_OUT_OF_SCOPE");
  });
});
