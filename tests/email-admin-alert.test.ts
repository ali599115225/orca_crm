import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  send: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    revenueProviderConnection: {
      findFirst: prismaMocks.findFirst,
      findMany: prismaMocks.findMany,
    },
  },
}));

vi.mock("@/lib/revenue-integrity/trust-gates", () => ({
  decryptProviderCredentials: vi.fn(() => ({
    apiKey: "re_test_key",
    fromEmail: "alerts@example.com",
  })),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: (...args: unknown[]) => prismaMocks.send(...args),
    };
  },
}));

import { sendAdminEmailAlert } from "@/lib/email";

describe("sendAdminEmailAlert", () => {
  beforeEach(() => {
    prismaMocks.findFirst.mockReset();
    prismaMocks.findMany.mockReset();
    prismaMocks.send.mockReset();
    vi.unstubAllEnvs();
    prismaMocks.send.mockResolvedValue({ data: { id: "msg-1" }, error: null });
  });

  it("calls sendEmail when SUPER_ADMIN_EMAILS and a CONNECTED provider exist", async () => {
    vi.stubEnv("SUPER_ADMIN_EMAILS", "owner@example.com");
    prismaMocks.findFirst.mockResolvedValue({ tenantId: "tenant-1" });
    prismaMocks.findMany.mockResolvedValue([
      {
        tenantId: "tenant-1",
        provider: "RESEND",
        status: "CONNECTED",
        encryptedCredentials: "v1.iv.tag.body",
        isDefault: true,
      },
    ]);

    const result = await sendAdminEmailAlert("Subject", "<p>Alert</p>");

    expect(result.success).toBe(true);
    expect(prismaMocks.send).toHaveBeenCalled();
  });

  it("fails closed without throw or success when SUPER_ADMIN_EMAILS is absent", async () => {
    vi.stubEnv("SUPER_ADMIN_EMAILS", "");
    prismaMocks.findFirst.mockResolvedValue({ tenantId: "tenant-1" });

    await expect(
      sendAdminEmailAlert("Subject", "<p>Alert</p>"),
    ).resolves.toMatchObject({ success: false });
    expect(prismaMocks.send).not.toHaveBeenCalled();
  });

  it("fails closed without throw or success when no CONNECTED provider exists", async () => {
    vi.stubEnv("SUPER_ADMIN_EMAILS", "owner@example.com");
    prismaMocks.findFirst.mockResolvedValue(null);

    await expect(
      sendAdminEmailAlert("Subject", "<p>Alert</p>"),
    ).resolves.toMatchObject({ success: false });
    expect(prismaMocks.send).not.toHaveBeenCalled();
  });
});
