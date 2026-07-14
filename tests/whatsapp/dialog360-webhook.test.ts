import { beforeEach, describe, expect, it, vi } from "vitest";

const rawPrismaMock = vi.hoisted(() => ({
  revenueProviderConnection: {
    findFirst: vi.fn(),
  },
  whatsAppContact: {
    upsert: vi.fn(),
  },
  whatsAppMessage: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  rawPrisma: rawPrismaMock,
}));

vi.mock("@/lib/privacy-mask", () => ({
  hashPhone: vi.fn(() => "phone-hash"),
}));

vi.mock("@/lib/tenant-context", () => ({
  runWithTenantContext: vi.fn(
    async (_context: unknown, operation: () => Promise<unknown>) =>
      operation(),
  ),
}));

vi.mock("@/lib/revenue-integrity/trust-gates", () => ({
  decryptProviderCredentials: vi.fn(() => ({
    webhookSecret: "123456789012345678901234",
  })),
}));

vi.mock("@/lib/whatsapp/webhook-security", () => ({
  constantTimeEqual: vi.fn(
    (left: string, right: string) => left === right,
  ),
}));

import { POST } from "@/app/api/whatsapp/webhook/360dialog/[webhookToken]/route";

describe("360dialog WhatsApp webhook", () => {
  beforeEach(() => {
    rawPrismaMock.revenueProviderConnection.findFirst.mockResolvedValue({
      id: "connection-1",
      tenantId: "tenant-1",
      encryptedCredentials: "encrypted",
    });
    rawPrismaMock.whatsAppContact.upsert.mockResolvedValue({
      id: "contact-1",
    });
    rawPrismaMock.whatsAppMessage.findUnique.mockResolvedValue(null);
    rawPrismaMock.whatsAppMessage.create.mockResolvedValue({
      id: "message-1",
    });
    rawPrismaMock.whatsAppMessage.update.mockResolvedValue({
      id: "message-1",
    });
  });

  it("derives tenancy from the encrypted provider connection", async () => {
    const request = new Request(
      "http://localhost/api/whatsapp/webhook/360dialog/abcdefghijklmno123456789",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-orca-webhook-secret":
            "123456789012345678901234",
        },
        body: JSON.stringify({
          messages: [
            {
              id: "dialog-message-1",
              from: "966500000000",
              timestamp: "1783960000",
              type: "text",
              text: { body: "مرحبا" },
            },
          ],
          contacts: [
            {
              wa_id: "966500000000",
              profile: { name: "عميل واتساب" },
            },
          ],
        }),
      },
    );

    const response = await POST(request as any, {
      params: Promise.resolve({ webhookToken: "abcdefghijklmno123456789" }),
    });

    expect(response.status).toBe(200);
    expect(
      rawPrismaMock.revenueProviderConnection.findFirst,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          provider: "DIALOG360",
          status: "CONNECTED",
          metadata: {
            path: ["webhookToken"],
            equals: "abcdefghijklmno123456789",
          },
        },
      }),
    );
    expect(rawPrismaMock.whatsAppContact.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          tenantId: "tenant-1",
          provider: "360dialog",
        }),
      }),
    );
    expect(rawPrismaMock.whatsAppMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          provider: "360dialog",
          metaMessageId: "dialog-message-1",
        }),
      }),
    );
  });

  it("rejects an invalid webhook secret before processing events", async () => {
    const request = new Request(
      "http://localhost/api/whatsapp/webhook/360dialog/abcdefghijklmno123456789",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-orca-webhook-secret": "wrong-secret",
        },
        body: JSON.stringify({ messages: [] }),
      },
    );

    const response = await POST(request as any, {
      params: Promise.resolve({ webhookToken: "abcdefghijklmno123456789" }),
    });

    expect(response.status).toBe(401);
    expect(rawPrismaMock.whatsAppMessage.create).not.toHaveBeenCalled();
  });
});
