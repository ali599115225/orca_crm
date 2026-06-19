import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tenantContext } from "@/lib/tenant-context";
import { hashPhone, redactPiiFromPayload } from "@/lib/privacy-mask";
import { classifyWhatsAppLeadInternal } from "@/lib/server/internal";
import { constantTimeEqual, verifyMetaSignature } from "@/lib/whatsapp/webhook-security";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 1024 * 1024;

type WebhookOutcome = "accepted" | "duplicate" | "ignored";

interface MetaChangeValue {
  metadata?: {
    phone_number_id?: unknown;
  };
  messages?: unknown;
  statuses?: unknown;
}

interface MetaMessage {
  id?: unknown;
  from?: unknown;
  type?: unknown;
  text?: { body?: unknown };
  button?: { text?: unknown };
  interactive?: {
    button_reply?: { id?: unknown; title?: unknown };
    list_reply?: { id?: unknown; title?: unknown };
  };
  timestamp?: unknown;
}

interface MetaStatus {
  id?: unknown;
  status?: unknown;
  timestamp?: unknown;
}

export async function GET(request: NextRequest) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (!verifyToken) {
    return NextResponse.json({ error: "Webhook verification unavailable" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && challenge && constantTimeEqual(token, verifyToken)) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!appSecret) {
    return NextResponse.json({ error: "Webhook signature unavailable" }, { status: 503 });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!isJsonContentType(contentType)) {
    return NextResponse.json({ error: "Unsupported Media Type" }, { status: 415 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Payload Too Large" }, { status: 413 });
  }

  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyMetaSignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const changes = extractMetaChanges(payload);
  if (!changes.ok) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (changes.values.length === 0) {
    return webhookResult("ignored");
  }

  try {
    const outcomes: WebhookOutcome[] = [];

    for (const value of changes.values) {
      const phoneNumberId = value.metadata?.phone_number_id as string;
      const binding = await prisma.whatsAppPhoneNumber.findFirst({
        where: {
          phoneNumberId,
          isActive: true,
          tenant: { isActive: true },
        },
        select: { tenantId: true },
      });

      if (!binding) {
        outcomes.push("ignored");
        continue;
      }

      const outcome = await tenantContext.run({ tenantId: binding.tenantId }, async () => {
        const messageOutcomes = await processMessages(binding.tenantId, normalizeArray<MetaMessage>(value.messages));
        const statusOutcomes = await processStatuses(binding.tenantId, normalizeArray<MetaStatus>(value.statuses));
        return combineOutcomes([...messageOutcomes, ...statusOutcomes]);
      });

      outcomes.push(outcome);
    }

    return webhookResult(combineOutcomes(outcomes));
  } catch {
    console.error("[WhatsApp Webhook] internal processing failed");
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

function isJsonContentType(contentType: string) {
  const mediaType = contentType.split(";")[0]?.trim().toLowerCase();
  return mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"));
}

function extractMetaChanges(payload: unknown): { ok: true; values: MetaChangeValue[] } | { ok: false } {
  if (!payload || typeof payload !== "object") return { ok: false };
  const root = payload as { object?: unknown; entry?: unknown };
  if (root.object !== "whatsapp_business_account" || !Array.isArray(root.entry)) {
    return { ok: false };
  }

  const values: MetaChangeValue[] = [];
  for (const entry of root.entry) {
    if (!entry || typeof entry !== "object" || !Array.isArray((entry as { changes?: unknown }).changes)) {
      return { ok: false };
    }

    for (const change of (entry as { changes: unknown[] }).changes) {
      if (!change || typeof change !== "object") return { ok: false };
      const value = (change as { value?: unknown }).value;
      if (!value || typeof value !== "object") return { ok: false };

      const metadata = (value as MetaChangeValue).metadata;
      const phoneNumberId = metadata?.phone_number_id;
      if (typeof phoneNumberId !== "string" || phoneNumberId.trim() === "") {
        return { ok: false };
      }

      const messages = (value as MetaChangeValue).messages;
      const statuses = (value as MetaChangeValue).statuses;
      if (messages !== undefined && !Array.isArray(messages)) return { ok: false };
      if (statuses !== undefined && !Array.isArray(statuses)) return { ok: false };

      if (Array.isArray(messages) || Array.isArray(statuses)) {
        values.push(value as MetaChangeValue);
      }
    }
  }

  return { ok: true, values };
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function processMessages(tenantId: string, messages: MetaMessage[]): Promise<WebhookOutcome[]> {
  const outcomes: WebhookOutcome[] = [];

  for (const message of messages) {
    const metaMessageId = typeof message.id === "string" ? message.id.trim() : "";
    if (!metaMessageId) {
      outcomes.push("ignored");
      continue;
    }

    const senderPhone = typeof message.from === "string" ? message.from : "";
    const messageType = typeof message.type === "string" ? message.type : "unknown";
    const messageText = extractMessageText(message);

    try {
      await prisma.whatsAppMessage.create({
        data: {
          tenantId,
          phone: senderPhone,
          phoneHash: senderPhone ? hashPhone(tenantId, senderPhone) : null,
          direction: "inbound",
          provider: "meta",
          messageText,
          messageType,
          metaMessageId,
          rawPayload: redactPiiFromPayload({
            id: metaMessageId,
            from: senderPhone,
            type: messageType,
            timestamp: message.timestamp,
          }) as any,
          status: "received",
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        outcomes.push("duplicate");
        continue;
      }
      throw error;
    }

    if (messageText && senderPhone) {
      const lead = await findOrCreateWhatsAppLead(tenantId, senderPhone);
      await upsertWhatsAppContact(tenantId, senderPhone, lead.id);
      await classifyWhatsAppLeadInternal(lead.id, messageText);
    }

    outcomes.push("accepted");
  }

  return outcomes;
}

function extractMessageText(message: MetaMessage): string {
  const candidates = [
    message.text?.body,
    message.button?.text,
    message.interactive?.button_reply?.title,
    message.interactive?.button_reply?.id,
    message.interactive?.list_reply?.title,
    message.interactive?.list_reply?.id,
  ];

  const value = candidates.find((candidate) => typeof candidate === "string" && candidate.trim() !== "");
  return typeof value === "string" ? value : "";
}

async function findOrCreateWhatsAppLead(tenantId: string, senderPhone: string) {
  const phoneHash = hashPhone(tenantId, senderPhone);
  const existingLead = await prisma.lead.findFirst({
    where: {
      tenantId,
      OR: [{ phoneHash }, { phone: senderPhone }],
    },
    select: { id: true },
  });

  if (existingLead) {
    await prisma.lead.update({
      where: { id: existingLead.id },
      data: { updatedAt: new Date() },
    });
    return existingLead;
  }

  return prisma.lead.create({
    data: {
      tenantId,
      firstName: "WhatsApp Lead",
      phone: senderPhone,
      phoneHash,
      city: "Unknown",
      source: "WHATSAPP",
      status: "NEW",
    },
    select: { id: true },
  });
}

async function upsertWhatsAppContact(tenantId: string, senderPhone: string, leadId: string) {
  const phoneHash = hashPhone(tenantId, senderPhone);
  const contact = await prisma.whatsAppContact.findFirst({
    where: { tenantId, phoneHash },
    select: { id: true, leadId: true },
  });

  if (!contact) {
    await prisma.whatsAppContact.create({
      data: {
        tenantId,
        phone: senderPhone,
        phoneHash,
        provider: "meta",
        leadId,
        lastMessageAt: new Date(),
      },
    });
    return;
  }

  await prisma.whatsAppContact.update({
    where: { id: contact.id },
    data: {
      leadId: contact.leadId || leadId,
      lastMessageAt: new Date(),
    },
  });
}

async function processStatuses(tenantId: string, statuses: MetaStatus[]): Promise<WebhookOutcome[]> {
  const outcomes: WebhookOutcome[] = [];

  for (const statusEvent of statuses) {
    const metaMessageId = typeof statusEvent.id === "string" ? statusEvent.id.trim() : "";
    if (!metaMessageId) {
      outcomes.push("ignored");
      continue;
    }

    const updateData = buildStatusUpdate(statusEvent);
    if (!updateData) {
      outcomes.push("ignored");
      continue;
    }

    const existing = await prisma.whatsAppMessage.findFirst({
      where: { tenantId, metaMessageId },
      select: { status: true, deliveredAt: true, readAt: true, failedAt: true },
    });

    if (!existing || isDuplicateStatus(existing, updateData)) {
      outcomes.push("ignored");
      continue;
    }

    await prisma.whatsAppMessage.updateMany({
      where: { tenantId, metaMessageId },
      data: updateData,
    });
    outcomes.push("accepted");
  }

  return outcomes;
}

function buildStatusUpdate(statusEvent: MetaStatus) {
  if (typeof statusEvent.status !== "string") return null;
  const statusTime = parseMetaTimestamp(statusEvent.timestamp);

  switch (statusEvent.status) {
    case "sent":
      return { status: "sent" };
    case "delivered":
      return { status: "delivered", deliveredAt: statusTime };
    case "read":
      return { status: "read", readAt: statusTime };
    case "failed":
      return { status: "failed", failedAt: statusTime };
    default:
      return null;
  }
}

function parseMetaTimestamp(value: unknown) {
  const seconds = typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(seconds) ? new Date(seconds * 1000) : new Date();
}

function isDuplicateStatus(existing: Record<string, unknown>, updateData: Record<string, unknown>) {
  if (existing.status !== updateData.status) return false;

  for (const field of ["deliveredAt", "readAt", "failedAt"]) {
    if (!(field in updateData)) continue;
    const current = existing[field];
    const next = updateData[field];
    if (!(current instanceof Date) || !(next instanceof Date) || current.getTime() !== next.getTime()) {
      return false;
    }
  }

  return true;
}

function isUniqueConstraintError(error: unknown) {
  const target = String((error as { meta?: { target?: unknown } }).meta?.target || "");
  return Boolean(
    error &&
      typeof error === "object" &&
      (error as { code?: unknown }).code === "P2002" &&
      (target.includes("metaMessageId") ||
        target.includes("meta_message_id") ||
        target.includes("uq_whatsapp_messages_meta_message_id")),
  );
}

function combineOutcomes(outcomes: WebhookOutcome[]): WebhookOutcome {
  if (outcomes.includes("accepted")) return "accepted";
  if (outcomes.includes("duplicate")) return "duplicate";
  return "ignored";
}

function webhookResult(status: WebhookOutcome) {
  return NextResponse.json({ ok: true, status }, { status: 200 });
}
