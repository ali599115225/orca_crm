import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const prismaMock = vi.hoisted(() => ({
  whatsAppOptOut: {
    findUnique: vi.fn(),
  },
  whatsAppContact: {
    upsert: vi.fn(),
  },
  whatsAppMessage: {
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const resolveConnectionMock = vi.hoisted(() => vi.fn());
const hashPhoneMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/privacy-mask", () => ({
  hashPhone: hashPhoneMock,
}));

vi.mock("@/lib/whatsapp/connection-resolver", () => ({
  resolveConnection: resolveConnectionMock,
  WhatsAppResolveError: class WhatsAppResolveError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  },
}));

import {
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
} from "@/lib/whatsapp/send-service";

describe("WhatsApp send service", () => {
  beforeEach(() => {
    prismaMock.whatsAppOptOut.findUnique.mockResolvedValue(null);
    prismaMock.whatsAppContact.upsert.mockResolvedValue({
      id: "contact-1",
    });
    prismaMock.whatsAppMessage.create.mockResolvedValue({
      id: "message-1",
    });
    prismaMock.whatsAppMessage.update.mockResolvedValue({
      id: "message-1",
    });

    resolveConnectionMock.mockResolvedValue({
      source: "tenant-connection",
      tenantId: "tenant-1",
      connectionId: "connection-1",
      phoneNumberId: "phone-number-1",
      wabaId: "waba-1",
      accessToken: "access-token",
    });

    hashPhoneMock.mockReturnValue("phone-hash");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("blocks opted-out recipients before resolving credentials", async () => {
    prismaMock.whatsAppOptOut.findUnique.mockResolvedValue({
      id: "opt-out-1",
    });

    const result = await sendWhatsAppMessage(
      "tenant-1",
      "+966500000000",
      "مرحبا",
    );

    expect(result).toMatchObject({
      success: false,
      status: "failed",
      errorCode: "WHATSAPP_OPTED_OUT",
    });
    expect(resolveConnectionMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("stores outbound text as pending and delegates to Meta once", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          messages: [{ id: "meta-message-1" }],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const result = await sendWhatsAppMessage(
      "tenant-1",
      "+966500000000",
      "مرحبا",
    );

    expect(result).toMatchObject({
      success: true,
      status: "pending",
      metaMessageId: "meta-message-1",
    });
    expect(prismaMock.whatsAppMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          status: "pending",
          messageType: "text",
        }),
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("marks the local message failed when the network request fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));

    const result = await sendWhatsAppMessage(
      "tenant-1",
      "+966500000000",
      "مرحبا",
    );

    expect(result).toMatchObject({
      success: false,
      status: "failed",
      errorCode: "WHATSAPP_SEND_FAILED",
    });
    expect(prismaMock.whatsAppMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "failed",
        }),
      }),
    );
  });

  it("sends templates through the same central service", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          messages: [{ id: "meta-template-1" }],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const result = await sendWhatsAppTemplate({
      tenantId: "tenant-1",
      to: "+966500000000",
      templateName: "new_lead_assignment",
      parameters: ["Ali", "Lead", "WhatsApp"],
    });

    expect(result.success).toBe(true);

    const request = vi.mocked(fetch).mock.calls[0]?.[1];
    const payload = JSON.parse(String(request?.body));

    expect(payload).toMatchObject({
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: "new_lead_assignment",
      },
    });
  });
});