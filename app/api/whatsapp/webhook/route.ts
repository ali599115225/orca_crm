import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tenantContext } from "@/lib/tenant-context";
import { hashPhone } from "@/lib/privacy-mask";
import { classifyWhatsAppLeadInternal } from "@/lib/server/internal";
import { getWhatsAppControls } from "@/lib/whatsapp/connection-resolver";
import {
  constantTimeEqual,
  verifyMetaSignature,
} from "@/lib/whatsapp/webhook-security";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 1024 * 1024;
const ENVELOPE_RETENTION_DAYS = 7;

type WebhookOutcome =
  | "accepted"
  | "duplicate"
  | "ignored"
  | "quarantined";

interface MetaChangeValue {
  metadata?: {
    phone_number_id?: unknown;
  };
  messages?: unknown;
  statuses?: unknown;
}

interface ExtractedChange {
  wabaId: string | null;
  value: MetaChangeValue;
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

interface WebhookBinding {
  tenantId: string;
  phoneNumberId: string;
  wabaId: string | null;
  active: boolean;
  messagingEnabled: boolean;
  automationEnabled: boolean;
  reason?: string;
}

interface PersistedEvent {
  id: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
}

export async function GET(request: NextRequest) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();

  if (!verifyToken) {
    return NextResponse.json(
      { error: "Webhook verification unavailable" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    challenge &&
    constantTimeEqual(token, verifyToken)
  ) {
    return new NextResponse(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();

  if (!appSecret) {
    return NextResponse.json(
      { error: "Webhook signature unavailable" },
      { status: 503 },
    );
  }

  const contentType = request.headers.get("content-type") || "";

  if (!isJsonContentType(contentType)) {
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

  const requestHash = createHash("sha256")
    .update(rawBody, "utf8")
    .digest("hex");

  const signature = request.headers.get("x-hub-signature-256");
  const signatureValid = verifyMetaSignature(
    rawBody,
    signature,
    appSecret,
  );

  if (!signatureValid) {
    await persistRejectedEnvelope(requestHash).catch((error) => {
      console.error(
        "[WhatsApp Webhook] failed to persist invalid signature envelope",
        error,
      );
    });

    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    const envelope = await createEnvelope({
      requestHash,
      signatureValid: true,
      status: "DISCARDED",
      snippet: JSON.stringify({ reason: "INVALID_JSON" }),
    });

    return NextResponse.json(
      {
        error: "Invalid JSON",
        envelopeId: envelope.id,
      },
      { status: 400 },
    );
  }

  const changes = extractMetaChanges(payload);
  const envelope = await createEnvelope({
    requestHash,
    signatureValid: true,
    status: changes.ok ? "RECEIVED" : "DISCARDED",
    snippet: buildEnvelopeSnippet(payload, changes.ok),
  });

  if (!changes.ok) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        envelopeId: envelope.id,
      },
      { status: 400 },
    );
  }

  if (changes.values.length === 0) {
    await updateEnvelopeStatus(envelope.id, "PROCESSED");

    return webhookResult("ignored", envelope.id);
  }

  try {
    const outcomes: WebhookOutcome[] = [];

    for (const change of changes.values) {
      const phoneNumberId =
        change.value.metadata?.phone_number_id as string;

      const binding = await resolveWebhookBinding(
        phoneNumberId,
        change.wabaId,
      );

      if (!binding) {
        await persistUnknownBindingEvent({
          envelopeId: envelope.id,
          requestHash,
          phoneNumberId,
          wabaId: change.wabaId,
          reason: "UNKNOWN_PHONE_NUMBER",
        });

        outcomes.push("quarantined");
        continue;
      }

      const messages = normalizeArray<MetaMessage>(
        change.value.messages,
      );
      const statuses = normalizeArray<MetaStatus>(
        change.value.statuses,
      );

      if (!binding.active || !binding.messagingEnabled) {
        const reason =
          binding.reason ||
          (binding.messagingEnabled
            ? "CONNECTION_NOT_ACTIVE"
            : "MESSAGING_DISABLED");

        const quarantined = await persistQuarantinedEvents({
          envelopeId: envelope.id,
          binding,
          messages,
          statuses,
          reason,
        });

        outcomes.push(
          quarantined.length > 0
            ? combineOutcomes(quarantined)
            : "quarantined",
        );
        continue;
      }

      const outcome = await tenantContext.run(
        { tenantId: binding.tenantId },
        async () => {
          const messageOutcomes = await processMessages({
            envelopeId: envelope.id,
            binding,
            messages,
          });

          const statusOutcomes = await processStatuses({
            envelopeId: envelope.id,
            binding,
            statuses,
          });

          return combineOutcomes([
            ...messageOutcomes,
            ...statusOutcomes,
          ]);
        },
      );

      outcomes.push(outcome);
    }

    const combined = combineOutcomes(outcomes);

    await updateEnvelopeStatus(
      envelope.id,
      combined === "quarantined"
        ? "QUARANTINED"
        : combined === "ignored"
          ? "DISCARDED"
          : "PROCESSED",
    );

    return webhookResult(combined, envelope.id);
  } catch (error) {
    await updateEnvelopeStatus(
      envelope.id,
      "QUARANTINED",
    ).catch(() => undefined);

    console.error(
      "[WhatsApp Webhook] internal processing failed",
      error,
    );

    return NextResponse.json(
      {
        error: "Internal Error",
        envelopeId: envelope.id,
      },
      { status: 500 },
    );
  }
}

function isJsonContentType(contentType: string) {
  const mediaType = contentType
    .split(";")[0]
    ?.trim()
    .toLowerCase();

  return (
    mediaType === "application/json" ||
    Boolean(mediaType?.endsWith("+json"))
  );
}

function extractMetaChanges(
  payload: unknown,
):
  | { ok: true; values: ExtractedChange[] }
  | { ok: false } {
  if (!payload || typeof payload !== "object") {
    return { ok: false };
  }

  const root = payload as {
    object?: unknown;
    entry?: unknown;
  };

  if (
    root.object !== "whatsapp_business_account" ||
    !Array.isArray(root.entry)
  ) {
    return { ok: false };
  }

  const values: ExtractedChange[] = [];

  for (const entry of root.entry) {
    if (
      !entry ||
      typeof entry !== "object" ||
      !Array.isArray(
        (entry as { changes?: unknown }).changes,
      )
    ) {
      return { ok: false };
    }

    const entryWabaId =
      typeof (entry as { id?: unknown }).id === "string"
        ? String((entry as { id: string }).id).trim() || null
        : null;

    for (const change of (
      entry as { changes: unknown[] }
    ).changes) {
      if (!change || typeof change !== "object") {
        return { ok: false };
      }

      const value = (change as { value?: unknown }).value;

      if (!value || typeof value !== "object") {
        return { ok: false };
      }

      const metadata = (value as MetaChangeValue).metadata;
      const phoneNumberId = metadata?.phone_number_id;

      if (
        typeof phoneNumberId !== "string" ||
        phoneNumberId.trim() === ""
      ) {
        return { ok: false };
      }

      const messages = (value as MetaChangeValue).messages;
      const statuses = (value as MetaChangeValue).statuses;

      if (
        messages !== undefined &&
        !Array.isArray(messages)
      ) {
        return { ok: false };
      }

      if (
        statuses !== undefined &&
        !Array.isArray(statuses)
      ) {
        return { ok: false };
      }

      if (
        Array.isArray(messages) ||
        Array.isArray(statuses)
      ) {
        values.push({
          wabaId: entryWabaId,
          value: value as MetaChangeValue,
        });
      }
    }
  }

  return {
    ok: true,
    values,
  };
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function resolveWebhookBinding(
  phoneNumberId: string,
  incomingWabaId: string | null,
): Promise<WebhookBinding | null> {
  const phone = await prisma.whatsAppPhoneNumber.findUnique({
    where: { phoneNumberId },
    select: {
      tenantId: true,
      phoneNumberId: true,
      wabaId: true,
      businessAccountId: true,
      isActive: true,
      tenant: {
        select: {
          isActive: true,
        },
      },
      connectionId: true,
      connection: {
        select: {
          tenantId: true,
          status: true,
          wabaId: true,
        },
      },
    },
  });

  if (
    !phone ||
    !phone.isActive ||
    !phone.tenant.isActive
  ) {
    return null;
  }

  const expectedWabaId =
    phone.wabaId ||
    phone.connection?.wabaId ||
    phone.businessAccountId ||
    null;

  if (
    incomingWabaId &&
    expectedWabaId &&
    incomingWabaId !== expectedWabaId
  ) {
    return {
      tenantId: phone.tenantId,
      phoneNumberId: phone.phoneNumberId,
      wabaId: expectedWabaId,
      active: false,
      messagingEnabled: false,
      automationEnabled: false,
      reason: "WABA_MISMATCH",
    };
  }

  const activeTenantConnection =
    phone.connectionId !== null &&
    phone.connection?.tenantId === phone.tenantId &&
    phone.connection.status === "ACTIVE";

  const bridgeTenantId =
    process.env.ORCA_WHATSAPP_TEST_TENANT_ID?.trim();
  const bridgePhoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const bridgeWabaId =
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();

  const activeOrcaBridge =
    Boolean(bridgeTenantId) &&
    phone.tenantId === bridgeTenantId &&
    phone.phoneNumberId === bridgePhoneNumberId &&
    (!incomingWabaId ||
      !bridgeWabaId ||
      incomingWabaId === bridgeWabaId);

  const controls = await getWhatsAppControls(
    phone.tenantId,
  );

  const active =
    activeTenantConnection || activeOrcaBridge;

  return {
    tenantId: phone.tenantId,
    phoneNumberId: phone.phoneNumberId,
    wabaId: expectedWabaId || incomingWabaId,
    active,
    messagingEnabled:
      active && controls.messagingEnabled,
    automationEnabled:
      active && controls.automationEnabled,
    reason: active
      ? undefined
      : "CONNECTION_NOT_ACTIVE",
  };
}

async function processMessages(params: {
  envelopeId: string;
  binding: WebhookBinding;
  messages: MetaMessage[];
}): Promise<WebhookOutcome[]> {
  const outcomes: WebhookOutcome[] = [];

  for (const message of params.messages) {
    const metaMessageId =
      typeof message.id === "string"
        ? message.id.trim()
        : "";

    if (!metaMessageId) {
      outcomes.push("ignored");
      continue;
    }

    const event = await getOrCreateEvent({
      envelopeId: params.envelopeId,
      tenantId: params.binding.tenantId,
      wabaId: params.binding.wabaId,
      phoneNumberId: params.binding.phoneNumberId,
      eventType: "INBOUND_MESSAGE",
      metaMessageId,
      occurredAt: parseMetaTimestamp(
        message.timestamp,
      ),
      eventData: {
        type:
          typeof message.type === "string"
            ? message.type
            : "unknown",
        timestamp:
          typeof message.timestamp === "string"
            ? message.timestamp
            : null,
      },
      dedupeKey: [
        "message",
        params.binding.tenantId,
        metaMessageId,
      ].join(":"),
      status: "PENDING",
    });

    if (isTerminalEvent(event.status)) {
      outcomes.push("duplicate");
      continue;
    }

    try {
      await beginEventAttempt(event.id);

      const localMessageId =
        await processInboundMessage({
          tenantId: params.binding.tenantId,
          message,
          automationEnabled:
            params.binding.automationEnabled,
        });

      await completeEvent(
        event.id,
        localMessageId,
      );

      outcomes.push("accepted");
    } catch (error) {
      await failEvent(event, error);
      throw error;
    }
  }

  return outcomes;
}

async function processStatuses(params: {
  envelopeId: string;
  binding: WebhookBinding;
  statuses: MetaStatus[];
}): Promise<WebhookOutcome[]> {
  const outcomes: WebhookOutcome[] = [];

  for (const statusEvent of params.statuses) {
    const metaMessageId =
      typeof statusEvent.id === "string"
        ? statusEvent.id.trim()
        : "";

    const status =
      typeof statusEvent.status === "string"
        ? statusEvent.status.trim()
        : "";

    if (!metaMessageId || !status) {
      outcomes.push("ignored");
      continue;
    }

    const timestamp =
      typeof statusEvent.timestamp === "string"
        ? statusEvent.timestamp
        : "";

    const event = await getOrCreateEvent({
      envelopeId: params.envelopeId,
      tenantId: params.binding.tenantId,
      wabaId: params.binding.wabaId,
      phoneNumberId: params.binding.phoneNumberId,
      eventType: "STATUS_UPDATE",
      metaMessageId,
      occurredAt: parseMetaTimestamp(
        statusEvent.timestamp,
      ),
      eventData: {
        status,
        timestamp: timestamp || null,
      },
      dedupeKey: [
        "status",
        params.binding.tenantId,
        metaMessageId,
        status,
        timestamp || "no-timestamp",
      ].join(":"),
      status: "PENDING",
    });

    if (isTerminalEvent(event.status)) {
      outcomes.push("duplicate");
      continue;
    }

    try {
      await beginEventAttempt(event.id);

      const localMessageId =
        await processStatusEvent(
          params.binding.tenantId,
          statusEvent,
        );

      await completeEvent(
        event.id,
        localMessageId,
      );

      outcomes.push(
        localMessageId ? "accepted" : "ignored",
      );
    } catch (error) {
      await failEvent(event, error);
      throw error;
    }
  }

  return outcomes;
}

async function processInboundMessage(params: {
  tenantId: string;
  message: MetaMessage;
  automationEnabled: boolean;
}): Promise<string> {
  const metaMessageId =
    typeof params.message.id === "string"
      ? params.message.id.trim()
      : "";

  const senderPhone =
    typeof params.message.from === "string"
      ? params.message.from.trim()
      : "";

  const messageType =
    typeof params.message.type === "string"
      ? params.message.type
      : "unknown";

  const messageText = extractMessageText(
    params.message,
  );

  const phoneHash = senderPhone
    ? hashPhone(params.tenantId, senderPhone)
    : null;

  let localMessageId: string;

  try {
    const created =
      await prisma.whatsAppMessage.create({
        data: {
          tenantId: params.tenantId,
          phone: senderPhone,
          phoneHash,
          direction: "inbound",
          provider: "meta",
          messageText,
          messageType,
          metaMessageId,
          rawPayload: {
            metaMessageId,
            type: messageType,
            timestamp:
              typeof params.message.timestamp ===
              "string"
                ? params.message.timestamp
                : null,
          },
          status: "received",
        },
        select: { id: true },
      });

    localMessageId = created.id;
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const existing =
      await prisma.whatsAppMessage.findUnique({
        where: {
          tenantId_metaMessageId: {
            tenantId: params.tenantId,
            metaMessageId,
          },
        },
        select: { id: true },
      });

    if (!existing) {
      throw error;
    }

    localMessageId = existing.id;
  }

  if (!senderPhone) {
    return localMessageId;
  }

  const contact = await upsertWhatsAppContact(
    params.tenantId,
    senderPhone,
  );

  if (
    params.automationEnabled &&
    messageText
  ) {
    const lead =
      await findOrCreateWhatsAppLead(
        params.tenantId,
        senderPhone,
      );

    if (!contact.leadId) {
      await prisma.whatsAppContact.update({
        where: { id: contact.id },
        data: { leadId: lead.id },
      });
    }

    await classifyWhatsAppLeadInternal(
      lead.id,
      messageText,
    );
  }

  return localMessageId;
}

function extractMessageText(
  message: MetaMessage,
): string {
  const candidates = [
    message.text?.body,
    message.button?.text,
    message.interactive?.button_reply?.title,
    message.interactive?.button_reply?.id,
    message.interactive?.list_reply?.title,
    message.interactive?.list_reply?.id,
  ];

  const value = candidates.find(
    (candidate) =>
      typeof candidate === "string" &&
      candidate.trim() !== "",
  );

  return typeof value === "string"
    ? value.trim()
    : "";
}

async function findOrCreateWhatsAppLead(
  tenantId: string,
  senderPhone: string,
) {
  const phoneHash = hashPhone(
    tenantId,
    senderPhone,
  );

  const existingLead =
    await prisma.lead.findFirst({
      where: {
        tenantId,
        OR: [
          { phoneHash },
          { phone: senderPhone },
        ],
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
      firstName: "عميل واتساب",
      phone: senderPhone,
      phoneHash,
      city: "غير محدد",
      source: "WHATSAPP",
      status: "NEW",
    },
    select: { id: true },
  });
}

async function upsertWhatsAppContact(
  tenantId: string,
  senderPhone: string,
) {
  const phoneHash = hashPhone(
    tenantId,
    senderPhone,
  );

  return prisma.whatsAppContact.upsert({
    where: {
      tenantId_phoneHash: {
        tenantId,
        phoneHash,
      },
    },
    create: {
      tenantId,
      phone: senderPhone,
      phoneHash,
      provider: "meta",
      lastMessageAt: new Date(),
    },
    update: {
      phone: senderPhone,
      lastMessageAt: new Date(),
    },
    select: {
      id: true,
      leadId: true,
    },
  });
}

async function processStatusEvent(
  tenantId: string,
  statusEvent: MetaStatus,
): Promise<string | null> {
  const metaMessageId =
    typeof statusEvent.id === "string"
      ? statusEvent.id.trim()
      : "";

  if (!metaMessageId) {
    return null;
  }

  const updateData =
    buildStatusUpdate(statusEvent);

  if (!updateData) {
    return null;
  }

  const existing =
    await prisma.whatsAppMessage.findUnique({
      where: {
        tenantId_metaMessageId: {
          tenantId,
          metaMessageId,
        },
      },
      select: {
        id: true,
        status: true,
        deliveredAt: true,
        readAt: true,
        failedAt: true,
      },
    });

  if (
    !existing ||
    isDuplicateStatus(existing, updateData)
  ) {
    return existing?.id || null;
  }

  await prisma.whatsAppMessage.update({
    where: { id: existing.id },
    data: updateData,
  });

  return existing.id;
}

function buildStatusUpdate(
  statusEvent: MetaStatus,
) {
  if (
    typeof statusEvent.status !== "string"
  ) {
    return null;
  }

  const statusTime = parseMetaTimestamp(
    statusEvent.timestamp,
  );

  switch (statusEvent.status) {
    case "sent":
      return { status: "sent" };
    case "delivered":
      return {
        status: "delivered",
        deliveredAt: statusTime,
      };
    case "read":
      return {
        status: "read",
        readAt: statusTime,
      };
    case "failed":
      return {
        status: "failed",
        failedAt: statusTime,
      };
    default:
      return null;
  }
}

function parseMetaTimestamp(
  value: unknown,
): Date {
  const seconds =
    typeof value === "string"
      ? Number.parseInt(value, 10)
      : NaN;

  return Number.isFinite(seconds)
    ? new Date(seconds * 1000)
    : new Date();
}

function isDuplicateStatus(
  existing: Record<string, unknown>,
  updateData: Record<string, unknown>,
) {
  if (existing.status !== updateData.status) {
    return false;
  }

  for (const field of [
    "deliveredAt",
    "readAt",
    "failedAt",
  ]) {
    if (!(field in updateData)) {
      continue;
    }

    const current = existing[field];
    const next = updateData[field];

    if (
      !(current instanceof Date) ||
      !(next instanceof Date) ||
      current.getTime() !== next.getTime()
    ) {
      return false;
    }
  }

  return true;
}

async function persistQuarantinedEvents(params: {
  envelopeId: string;
  binding: WebhookBinding;
  messages: MetaMessage[];
  statuses: MetaStatus[];
  reason: string;
}): Promise<WebhookOutcome[]> {
  const outcomes: WebhookOutcome[] = [];

  for (const message of params.messages) {
    const metaMessageId =
      typeof message.id === "string"
        ? message.id.trim()
        : "";

    if (!metaMessageId) {
      outcomes.push("ignored");
      continue;
    }

    const event = await getOrCreateEvent({
      envelopeId: params.envelopeId,
      tenantId: params.binding.tenantId,
      wabaId: params.binding.wabaId,
      phoneNumberId:
        params.binding.phoneNumberId,
      eventType: "INBOUND_MESSAGE",
      metaMessageId,
      occurredAt: parseMetaTimestamp(
        message.timestamp,
      ),
      eventData: {
        reason: params.reason,
        type:
          typeof message.type === "string"
            ? message.type
            : "unknown",
      },
      dedupeKey: [
        "message",
        params.binding.tenantId,
        metaMessageId,
      ].join(":"),
      status: "QUARANTINED",
      lastError: params.reason,
    });

    outcomes.push(
      event.status === "QUARANTINED"
        ? "quarantined"
        : "duplicate",
    );
  }

  for (const statusEvent of params.statuses) {
    const metaMessageId =
      typeof statusEvent.id === "string"
        ? statusEvent.id.trim()
        : "";

    const status =
      typeof statusEvent.status === "string"
        ? statusEvent.status.trim()
        : "";

    if (!metaMessageId || !status) {
      outcomes.push("ignored");
      continue;
    }

    const timestamp =
      typeof statusEvent.timestamp === "string"
        ? statusEvent.timestamp
        : "";

    const event = await getOrCreateEvent({
      envelopeId: params.envelopeId,
      tenantId: params.binding.tenantId,
      wabaId: params.binding.wabaId,
      phoneNumberId:
        params.binding.phoneNumberId,
      eventType: "STATUS_UPDATE",
      metaMessageId,
      occurredAt: parseMetaTimestamp(
        statusEvent.timestamp,
      ),
      eventData: {
        reason: params.reason,
        status,
      },
      dedupeKey: [
        "status",
        params.binding.tenantId,
        metaMessageId,
        status,
        timestamp || "no-timestamp",
      ].join(":"),
      status: "QUARANTINED",
      lastError: params.reason,
    });

    outcomes.push(
      event.status === "QUARANTINED"
        ? "quarantined"
        : "duplicate",
    );
  }

  return outcomes;
}

async function persistUnknownBindingEvent(params: {
  envelopeId: string;
  requestHash: string;
  phoneNumberId: string;
  wabaId: string | null;
  reason: string;
}) {
  await getOrCreateEvent({
    envelopeId: params.envelopeId,
    tenantId: null,
    wabaId: params.wabaId,
    phoneNumberId: params.phoneNumberId,
    eventType: "UNKNOWN",
    metaMessageId: null,
    occurredAt: new Date(),
    eventData: {
      reason: params.reason,
    },
    dedupeKey: [
      "unknown",
      params.requestHash,
      params.phoneNumberId,
    ].join(":"),
    status: "QUARANTINED",
    lastError: params.reason,
  });
}

async function getOrCreateEvent(params: {
  envelopeId: string;
  tenantId: string | null;
  wabaId: string | null;
  phoneNumberId: string | null;
  eventType:
    | "INBOUND_MESSAGE"
    | "STATUS_UPDATE"
    | "UNKNOWN";
  metaMessageId: string | null;
  occurredAt: Date | null;
  eventData: Record<string, unknown>;
  dedupeKey: string;
  status:
    | "PENDING"
    | "QUARANTINED";
  lastError?: string;
}): Promise<PersistedEvent> {
  try {
    return await prisma.whatsAppWebhookEvent.create({
      data: {
        envelopeId: params.envelopeId,
        tenantId: params.tenantId,
        wabaId: params.wabaId,
        phoneNumberId: params.phoneNumberId,
        eventType: params.eventType,
        metaMessageId: params.metaMessageId,
        occurredAt: params.occurredAt,
        eventData: params.eventData,
        dedupeKey: params.dedupeKey,
        status: params.status,
        lastError: params.lastError,
      },
      select: {
        id: true,
        status: true,
        attemptCount: true,
        maxAttempts: true,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const existing =
      await prisma.whatsAppWebhookEvent.findUnique({
        where: {
          dedupeKey: params.dedupeKey,
        },
        select: {
          id: true,
          status: true,
          attemptCount: true,
          maxAttempts: true,
        },
      });

    if (!existing) {
      throw error;
    }

    return existing;
  }
}

async function beginEventAttempt(
  eventId: string,
) {
  await prisma.whatsAppWebhookEvent.update({
    where: { id: eventId },
    data: {
      status: "PENDING",
      attemptCount: { increment: 1 },
      lastError: null,
      nextRetryAt: null,
    },
  });
}

async function completeEvent(
  eventId: string,
  messageId: string | null,
) {
  await prisma.whatsAppWebhookEvent.update({
    where: { id: eventId },
    data: {
      status: "PROCESSED",
      messageId,
      processedAt: new Date(),
      lastError: null,
      nextRetryAt: null,
    },
  });
}

async function failEvent(
  event: PersistedEvent,
  error: unknown,
) {
  const nextAttempt = event.attemptCount + 1;
  const terminal =
    nextAttempt >= event.maxAttempts;

  await prisma.whatsAppWebhookEvent.update({
    where: { id: event.id },
    data: {
      status: terminal ? "DLQ" : "RETRYING",
      lastError: sanitizeError(error),
      nextRetryAt: terminal
        ? null
        : new Date(Date.now() + 5 * 60 * 1000),
    },
  });
}

function isTerminalEvent(status: string) {
  return (
    status === "PROCESSED" ||
    status === "QUARANTINED" ||
    status === "DLQ"
  );
}

async function persistRejectedEnvelope(
  requestHash: string,
) {
  await createEnvelope({
    requestHash,
    signatureValid: false,
    status: "INVALID_SIGNATURE",
    snippet: null,
  });
}

async function createEnvelope(params: {
  requestHash: string;
  signatureValid: boolean;
  status:
    | "RECEIVED"
    | "PROCESSED"
    | "INVALID_SIGNATURE"
    | "QUARANTINED"
    | "DISCARDED";
  snippet: string | null;
}) {
  return prisma.whatsAppWebhookEnvelope.create({
    data: {
      requestHash: params.requestHash,
      signatureValid: params.signatureValid,
      status: params.status,
      rawPayloadSnippet: params.snippet,
      expiresAt: new Date(
        Date.now() +
          ENVELOPE_RETENTION_DAYS *
            24 *
            60 *
            60 *
            1000,
      ),
    },
    select: { id: true },
  });
}

async function updateEnvelopeStatus(
  envelopeId: string,
  status:
    | "PROCESSED"
    | "QUARANTINED"
    | "DISCARDED",
) {
  await prisma.whatsAppWebhookEnvelope.update({
    where: { id: envelopeId },
    data: { status },
  });
}

function buildEnvelopeSnippet(
  payload: unknown,
  validShape: boolean,
): string {
  if (!payload || typeof payload !== "object") {
    return JSON.stringify({
      validShape,
      object: null,
      entryCount: 0,
    });
  }

  const root = payload as {
    object?: unknown;
    entry?: unknown;
  };

  return JSON.stringify({
    validShape,
    object:
      typeof root.object === "string"
        ? root.object
        : null,
    entryCount: Array.isArray(root.entry)
      ? root.entry.length
      : 0,
  });
}

function sanitizeError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : String(error ?? "WEBHOOK_PROCESSING_FAILED");

  return (
    message.trim().slice(0, 500) ||
    "WEBHOOK_PROCESSING_FAILED"
  );
}

function isUniqueConstraintError(
  error: unknown,
) {
  return Boolean(
    error &&
      typeof error === "object" &&
      (error as { code?: unknown }).code === "P2002",
  );
}

function combineOutcomes(
  outcomes: WebhookOutcome[],
): WebhookOutcome {
  if (outcomes.includes("accepted")) {
    return "accepted";
  }

  if (outcomes.includes("quarantined")) {
    return "quarantined";
  }

  if (outcomes.includes("duplicate")) {
    return "duplicate";
  }

  return "ignored";
}

function webhookResult(
  status: WebhookOutcome,
  envelopeId: string,
) {
  return NextResponse.json(
    {
      ok: true,
      status,
      envelopeId,
    },
    { status: 200 },
  );
}