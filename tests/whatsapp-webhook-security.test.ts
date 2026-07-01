import { createHmac } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative } from "node:path";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { NextRequest } from "next/server";

const prismaMock = vi.hoisted(() => ({
  whatsAppWebhookEnvelope: {
    create: vi.fn(),
    update: vi.fn(),
  },
  whatsAppWebhookEvent: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  whatsAppPhoneNumber: {
    findUnique: vi.fn(),
  },
  whatsAppMessage: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  whatsAppContact: {
    upsert: vi.fn(),
    update: vi.fn(),
  },
  lead: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const classifierMock = vi.hoisted(() => vi.fn());
const controlsMock = vi.hoisted(() => vi.fn());
const tenantRunMock = vi.hoisted(() =>
  vi.fn(
    async (
      _context: { tenantId: string },
      callback: () => Promise<unknown>,
    ) => callback(),
  ),
);

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/server/internal", () => ({
  classifyWhatsAppLeadInternal: classifierMock,
}));

vi.mock("@/lib/whatsapp/connection-resolver", () => ({
  getWhatsAppControls: controlsMock,
}));

vi.mock("@/lib/tenant-context", () => ({
  runWithTenantContext: tenantRunMock,
  tenantContext: {
    run: tenantRunMock,
  },
}));

vi.mock("@/lib/privacy-mask", () => ({
  hashPhone: vi.fn(() => "phone-hash"),
}));

import {
  GET,
  POST,
} from "@/app/api/whatsapp/webhook/route";

function sign(rawBody: string, secret = "app-secret") {
  return `sha256=${createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex")}`;
}

function postRequest(
  rawBody: string,
  signature: string | null,
) {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (signature) {
    headers.set("x-hub-signature-256", signature);
  }

  return new NextRequest(
    "https://orca.example/api/whatsapp/webhook",
    {
      method: "POST",
      headers,
      body: rawBody,
    },
  );
}

function messagePayload() {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-1",
        changes: [
          {
            value: {
              metadata: {
                phone_number_id: "phone-1",
              },
              messages: [
                {
                  id: "wamid-1",
                  from: "966500000001",
                  type: "text",
                  text: {
                    body: "مرحبا",
                  },
                  timestamp: "1780000000",
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function statusPayload() {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-1",
        changes: [
          {
            value: {
              metadata: {
                phone_number_id: "phone-1",
              },
              statuses: [
                {
                  id: "wamid-1",
                  status: "delivered",
                  timestamp: "1780000001",
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function activePhoneBinding() {
  return {
    tenantId: "tenant-1",
    phoneNumberId: "phone-1",
    wabaId: "waba-1",
    businessAccountId: null,
    isActive: true,
    tenant: {
      isActive: true,
    },
    connectionId: "connection-1",
    connection: {
      tenantId: "tenant-1",
      status: "ACTIVE",
      wabaId: "waba-1",
    },
  };
}

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }

    return /\.(ts|tsx)$/.test(path)
      ? [path]
      : [];
  });
}

beforeEach(() => {
  process.env.WHATSAPP_VERIFY_TOKEN = "verify-token";
  process.env.WHATSAPP_APP_SECRET = "app-secret";

  prismaMock.whatsAppWebhookEnvelope.create.mockResolvedValue({
    id: "envelope-1",
  });
  prismaMock.whatsAppWebhookEnvelope.update.mockResolvedValue({
    id: "envelope-1",
  });
  prismaMock.whatsAppWebhookEvent.create.mockResolvedValue({
    id: "event-1",
    status: "PENDING",
    attemptCount: 0,
    maxAttempts: 3,
  });
  prismaMock.whatsAppWebhookEvent.findUnique.mockResolvedValue(null);
  prismaMock.whatsAppWebhookEvent.update.mockResolvedValue({
    id: "event-1",
  });

  prismaMock.whatsAppPhoneNumber.findUnique.mockResolvedValue(
    activePhoneBinding(),
  );

  prismaMock.whatsAppMessage.create.mockResolvedValue({
    id: "message-1",
  });
  prismaMock.whatsAppMessage.findUnique.mockResolvedValue({
    id: "message-1",
    status: "pending",
    deliveredAt: null,
    readAt: null,
    failedAt: null,
  });
  prismaMock.whatsAppMessage.update.mockResolvedValue({
    id: "message-1",
  });

  prismaMock.whatsAppContact.upsert.mockResolvedValue({
    id: "contact-1",
    leadId: null,
  });
  prismaMock.whatsAppContact.update.mockResolvedValue({
    id: "contact-1",
  });

  prismaMock.lead.findFirst.mockResolvedValue(null);
  prismaMock.lead.create.mockResolvedValue({
    id: "lead-1",
  });
  prismaMock.lead.update.mockResolvedValue({
    id: "lead-1",
  });

  controlsMock.mockResolvedValue({
    tenantExists: true,
    tenantActive: true,
    platformMessagingDisabled: false,
    platformAutomationDisabled: false,
    tenantMessagingDisabled: false,
    tenantAutomationDisabled: false,
    messagingEnabled: true,
    automationEnabled: true,
  });
});

describe("WhatsApp webhook security and isolation", () => {
  it("accepts only the valid Meta verification challenge", async () => {
    const request = new NextRequest(
      "https://orca.example/api/whatsapp/webhook" +
        "?hub.mode=subscribe" +
        "&hub.verify_token=verify-token" +
        "&hub.challenge=challenge-value",
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      "challenge-value",
    );
  });

  it("rejects an invalid signature and records only the rejected envelope", async () => {
    const rawBody = JSON.stringify(messagePayload());

    const response = await POST(
      postRequest(rawBody, sign(rawBody, "wrong-secret")),
    );

    expect(response.status).toBe(401);
    expect(
      prismaMock.whatsAppWebhookEnvelope.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          signatureValid: false,
          status: "INVALID_SIGNATURE",
        }),
      }),
    );
    expect(
      prismaMock.whatsAppPhoneNumber.findUnique,
    ).not.toHaveBeenCalled();
    expect(
      prismaMock.whatsAppMessage.create,
    ).not.toHaveBeenCalled();
  });

  it("records invalid signed JSON as discarded", async () => {
    const rawBody = "{not-json";

    const response = await POST(
      postRequest(rawBody, sign(rawBody)),
    );

    expect(response.status).toBe(400);
    expect(
      prismaMock.whatsAppWebhookEnvelope.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          signatureValid: true,
          status: "DISCARDED",
        }),
      }),
    );
  });

  it("quarantines unknown phone bindings", async () => {
    prismaMock.whatsAppPhoneNumber.findUnique.mockResolvedValue(
      null,
    );

    const rawBody = JSON.stringify(messagePayload());
    prismaMock.whatsAppWebhookEvent.create.mockResolvedValue({
      id: "event-unknown",
      status: "QUARANTINED",
      attemptCount: 0,
      maxAttempts: 3,
    });

    const response = await POST(
      postRequest(rawBody, sign(rawBody)),
    );
    const body = await response.json();

    expect(body).toMatchObject({
      ok: true,
      status: "quarantined",
      envelopeId: "envelope-1",
    });
    expect(
      prismaMock.whatsAppWebhookEvent.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "UNKNOWN",
          status: "QUARANTINED",
          phoneNumberId: "phone-1",
        }),
      }),
    );
  });

  it("processes an active tenant message inside tenantContext", async () => {
    const rawBody = JSON.stringify(messagePayload());

    const response = await POST(
      postRequest(rawBody, sign(rawBody)),
    );
    const body = await response.json();

    expect(body).toMatchObject({
      ok: true,
      status: "accepted",
      envelopeId: "envelope-1",
    });
    expect(tenantRunMock).toHaveBeenCalledWith(
      { tenantId: "tenant-1" },
      expect.any(Function),
    );
    expect(
      prismaMock.whatsAppMessage.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          metaMessageId: "wamid-1",
          status: "received",
        }),
      }),
    );
    expect(classifierMock).toHaveBeenCalledTimes(1);
  });

  it("persists the message but skips lead automation when disabled", async () => {
    controlsMock.mockResolvedValue({
      tenantExists: true,
      tenantActive: true,
      platformMessagingDisabled: false,
      platformAutomationDisabled: true,
      tenantMessagingDisabled: false,
      tenantAutomationDisabled: false,
      messagingEnabled: true,
      automationEnabled: false,
    });

    const rawBody = JSON.stringify(messagePayload());

    const response = await POST(
      postRequest(rawBody, sign(rawBody)),
    );

    expect(response.status).toBe(200);
    expect(
      prismaMock.whatsAppMessage.create,
    ).toHaveBeenCalledTimes(1);
    expect(prismaMock.lead.create).not.toHaveBeenCalled();
    expect(classifierMock).not.toHaveBeenCalled();
  });

  it("uses persisted event dedupe and skips duplicate processing", async () => {
    prismaMock.whatsAppWebhookEvent.create.mockRejectedValue({
      code: "P2002",
    });
    prismaMock.whatsAppWebhookEvent.findUnique.mockResolvedValue({
      id: "event-existing",
      status: "PROCESSED",
      attemptCount: 1,
      maxAttempts: 3,
    });

    const rawBody = JSON.stringify(messagePayload());

    const response = await POST(
      postRequest(rawBody, sign(rawBody)),
    );
    const body = await response.json();

    expect(body.status).toBe("duplicate");
    expect(
      prismaMock.whatsAppMessage.create,
    ).not.toHaveBeenCalled();
    expect(classifierMock).not.toHaveBeenCalled();
  });

  it("updates a known outbound delivery status without creating a new message", async () => {
    const rawBody = JSON.stringify(statusPayload());

    const response = await POST(
      postRequest(rawBody, sign(rawBody)),
    );
    const body = await response.json();

    expect(body.status).toBe("accepted");
    expect(
      prismaMock.whatsAppMessage.create,
    ).not.toHaveBeenCalled();
    expect(
      prismaMock.whatsAppMessage.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "delivered",
        }),
      }),
    );
  });

  it("does not downgrade a read status when a later delivered event arrives", async () => {
    prismaMock.whatsAppMessage.findUnique.mockResolvedValue({
      id: "message-1",
      status: "read",
      deliveredAt: new Date("2026-01-01T00:00:00Z"),
      readAt: new Date("2026-01-01T00:00:05Z"),
      failedAt: null,
    });

    const rawBody = JSON.stringify(statusPayload());

    const response = await POST(
      postRequest(rawBody, sign(rawBody)),
    );

    expect(response.status).toBe(200);
    expect(prismaMock.whatsAppMessage.update).not.toHaveBeenCalled();
  });

  it("does not downgrade a failed status with a later sent event", async () => {
    prismaMock.whatsAppMessage.findUnique.mockResolvedValue({
      id: "message-1",
      status: "failed",
      deliveredAt: null,
      readAt: null,
      failedAt: new Date("2026-01-01T00:00:00Z"),
    });

    const rawBody = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-1",
          changes: [
            {
              value: {
                metadata: { phone_number_id: "phone-1" },
                statuses: [
                  { id: "wamid-1", status: "sent", timestamp: "1780000002" },
                ],
              },
            },
          ],
        },
      ],
    });

    const response = await POST(
      postRequest(rawBody, sign(rawBody)),
    );

    expect(response.status).toBe(200);
    expect(prismaMock.whatsAppMessage.update).not.toHaveBeenCalled();
  });

  it("applies forward status transitions in order", async () => {
    prismaMock.whatsAppMessage.findUnique.mockResolvedValue({
      id: "message-1",
      status: "sent",
      deliveredAt: null,
      readAt: null,
      failedAt: null,
    });

    const rawBody = JSON.stringify(statusPayload());

    const response = await POST(
      postRequest(rawBody, sign(rawBody)),
    );

    expect(response.status).toBe(200);
    expect(prismaMock.whatsAppMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "delivered" }),
      }),
    );
  });

  it("treats a repeated identical status webhook as idempotent", async () => {
    prismaMock.whatsAppWebhookEvent.create.mockRejectedValue({
      code: "P2002",
    });
    prismaMock.whatsAppWebhookEvent.findUnique.mockResolvedValue({
      id: "event-existing",
      status: "PROCESSED",
      attemptCount: 1,
      maxAttempts: 3,
    });

    const rawBody = JSON.stringify(statusPayload());

    const response = await POST(
      postRequest(rawBody, sign(rawBody)),
    );
    const body = await response.json();

    expect(body.status).toBe("duplicate");
    expect(prismaMock.whatsAppMessage.update).not.toHaveBeenCalled();
  });

  it("quarantines test-bridge bound events when NODE_ENV is production", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.ORCA_WHATSAPP_TEST_TENANT_ID = "tenant-1";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-1";
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = "waba-1";

    prismaMock.whatsAppPhoneNumber.findUnique.mockResolvedValue({
      tenantId: "tenant-1",
      phoneNumberId: "phone-1",
      wabaId: "waba-1",
      businessAccountId: null,
      isActive: true,
      tenant: { isActive: true },
      connectionId: null,
      connection: null,
    });
    prismaMock.whatsAppWebhookEvent.create.mockResolvedValue({
      id: "event-quarantined",
      status: "QUARANTINED",
      attemptCount: 0,
      maxAttempts: 3,
    });

    try {
      const rawBody = JSON.stringify(messagePayload());

      const response = await POST(
        postRequest(rawBody, sign(rawBody)),
      );
      const body = await response.json();

      expect(body.status).toBe("quarantined");
      expect(prismaMock.whatsAppMessage.create).not.toHaveBeenCalled();
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
      delete process.env.ORCA_WHATSAPP_TEST_TENANT_ID;
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;
      delete process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    }
  });

  it("uses no in-memory replay cache and exposes the classifier only to the webhook", () => {
    const root = process.cwd();
    const route = readFileSync(
      join(root, "app/api/whatsapp/webhook/route.ts"),
      "utf8",
    );

    expect(route).not.toMatch(
      /\bnew\s+(Set|Map)\b|\bglobalThis\b/i,
    );
    expect(route).toContain("dedupeKey");

    const callers = [
      ...sourceFiles(join(root, "app")),
      ...sourceFiles(join(root, "lib")),
      ...sourceFiles(join(root, "components")),
    ]
      .filter(
        (file) =>
          !file.endsWith(
            join("lib", "server", "internal.ts"),
          ),
      )
      .filter((file) =>
        readFileSync(file, "utf8").includes(
          "classifyWhatsAppLeadInternal",
        ),
      )
      .map((file) =>
        relative(root, file).replaceAll("\\", "/"),
      );

    expect(callers).toEqual([
      "app/api/whatsapp/webhook/route.ts",
    ]);
  });
});