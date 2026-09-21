import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPhone } from "@/lib/privacy-mask";
import { runWithTenantContext } from "@/lib/tenant-context";
import { webhookFindDialog360ConnectionByToken } from "@/lib/system-prisma-boundary";
import { decryptProviderCredentials } from "@/lib/revenue-integrity/trust-gates";
import { constantTimeEqual } from "@/lib/whatsapp/webhook-security";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 1024 * 1024;

type DialogMessage = {
  id?: unknown;
  from?: unknown;
  timestamp?: unknown;
  type?: unknown;
  text?: { body?: unknown };
  button?: { text?: unknown };
  interactive?: {
    button_reply?: { title?: unknown };
    list_reply?: { title?: unknown };
  };
};

type DialogStatus = {
  id?: unknown;
  status?: unknown;
  timestamp?: unknown;
  recipient_id?: unknown;
};

function asObjects(value: unknown): Record<string, any>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, any> =>
          Boolean(item) && typeof item === "object",
      )
    : [];
}

function collectEvents(payload: unknown) {
  const messages: DialogMessage[] = [];
  const statuses: DialogStatus[] = [];
  const contacts: Record<string, any>[] = [];
  const visited = new WeakSet<object>();

  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (visited.has(value)) return;
    visited.add(value);

    const object = value as Record<string, any>;

    messages.push(...(asObjects(object.messages) as DialogMessage[]));
    statuses.push(...(asObjects(object.statuses) as DialogStatus[]));
    contacts.push(...asObjects(object.contacts));

    for (const key of ["entry", "changes"]) {
      for (const item of asObjects(object[key])) {
        visit(item);
      }
    }

    visit(object.value);
  };

  visit(payload);
  return { messages, statuses, contacts };
}

function messageText(message: DialogMessage): string {
  return String(
    message.text?.body ||
      message.button?.text ||
      message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.title ||
      "",
  )
    .trim()
    .slice(0, 4096);
}

function eventDate(value: unknown): Date {
  const timestamp = Number(value);
  if (Number.isFinite(timestamp) && timestamp > 0) {
    return new Date(timestamp * 1000);
  }
  return new Date();
}

function statusUpdate(status: string, timestamp: Date) {
  if (status === "delivered") {
    return { status, deliveredAt: timestamp };
  }
  if (status === "read") {
    return {
      status,
      deliveredAt: timestamp,
      readAt: timestamp,
    };
  }
  if (status === "failed") {
    return { status, failedAt: timestamp };
  }
  return { status };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ webhookToken: string }> },
) {
  const { webhookToken } = await context.params;
  const normalizedToken = String(webhookToken || "").trim();

  if (!/^[A-Za-z0-9_-]{24,96}$/.test(normalizedToken)) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { error: "Unsupported Media Type" },
      { status: 415 },
    );
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return NextResponse.json(
      { error: "Payload Too Large" },
      { status: 413 },
    );
  }

  const connection = await webhookFindDialog360ConnectionByToken(
    normalizedToken,
  );

  if (!connection) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const credentials = decryptProviderCredentials(
    connection.encryptedCredentials,
  );
  const expectedSecret = String(credentials.webhookSecret || "");
  const suppliedSecret =
    request.headers.get("x-orca-webhook-secret") || "";

  if (
    !expectedSecret ||
    !suppliedSecret ||
    !constantTimeEqual(expectedSecret, suppliedSecret)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events = collectEvents(payload);

  await runWithTenantContext(
    { tenantId: connection.tenantId },
    async () => {
      for (const message of events.messages) {
        const phone = String(message.from || "").replace(/\D/g, "");
        const providerMessageId = String(message.id || "").trim();
        if (!phone || !providerMessageId) continue;

        const phoneHash = hashPhone(connection.tenantId, phone);
        const contact = events.contacts.find(
          (item) => String(item.wa_id || "").replace(/\D/g, "") === phone,
        );
        const name = String(contact?.profile?.name || "").trim() || null;

        await prisma.whatsAppContact.upsert({
          where: {
            tenantId_phoneHash: {
              tenantId: connection.tenantId,
              phoneHash,
            },
          },
          create: {
            tenantId: connection.tenantId,
            phone,
            phoneHash,
            name,
            provider: "360dialog",
            lastMessageAt: eventDate(message.timestamp),
          },
          update: {
            phone,
            ...(name ? { name } : {}),
            provider: "360dialog",
            lastMessageAt: eventDate(message.timestamp),
          },
        });

        const existing =
          await prisma.whatsAppMessage.findUnique({
            where: {
              tenantId_metaMessageId: {
                tenantId: connection.tenantId,
                metaMessageId: providerMessageId,
              },
            },
            select: { id: true },
          });

        if (!existing) {
          await prisma.whatsAppMessage.create({
            data: {
              tenantId: connection.tenantId,
              phone,
              phoneHash,
              direction: "inbound",
              provider: "360dialog",
              messageText: messageText(message),
              messageType: String(message.type || "text"),
              metaMessageId: providerMessageId,
              rawPayload: message as any,
              status: "received",
              createdAt: eventDate(message.timestamp),
            },
          });
        }
      }

      for (const statusEvent of events.statuses) {
        const providerMessageId = String(statusEvent.id || "").trim();
        const status = String(statusEvent.status || "").toLowerCase();
        if (!providerMessageId || !status) continue;

        const message =
          await prisma.whatsAppMessage.findUnique({
            where: {
              tenantId_metaMessageId: {
                tenantId: connection.tenantId,
                metaMessageId: providerMessageId,
              },
            },
            select: { id: true },
          });

        if (!message) continue;

        await prisma.whatsAppMessage.update({
          where: { id: message.id },
          data: statusUpdate(status, eventDate(statusEvent.timestamp)),
        });
      }
    },
  );

  return NextResponse.json({
    success: true,
    accepted: events.messages.length + events.statuses.length,
  });
}
