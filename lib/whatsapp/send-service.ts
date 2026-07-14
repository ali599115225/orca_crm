import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPhone } from "@/lib/privacy-mask";
import {
  resolveConnection,
  WhatsAppResolveError,
  type ResolvedConnection,
} from "./connection-resolver";

export type SendErrorCode =
  | "WHATSAPP_NOT_CONNECTED"
  | "WHATSAPP_MESSAGING_DISABLED"
  | "WHATSAPP_NO_PHONE"
  | "WHATSAPP_NO_CREDENTIAL"
  | "WHATSAPP_INVALID_PHONE"
  | "WHATSAPP_INVALID_TEMPLATE"
  | "WHATSAPP_TEMPLATE_REQUIRED"
  | "WHATSAPP_SEND_FAILED"
  | "WHATSAPP_OPTED_OUT";

export class WhatsAppSendError extends Error {
  constructor(
    public readonly code: SendErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "WhatsAppSendError";
  }
}

export interface SendResult {
  success: boolean;
  status: "pending" | "failed";
  provider?: "META" | "DIALOG360";
  messageId?: string;
  metaMessageId?: string | null;
  errorCode?: SendErrorCode;
  error?: string;
}

const META_API_BASE = "https://graph.facebook.com/v25.0";

interface PreparedOutbound {
  normalizedPhone: string;
  phoneHash: string;
  connection: ResolvedConnection;
}

function normalizePhone(phone: string): string {
  let digits = String(phone ?? "").replace(/\D/g, "");
  while (digits.startsWith("00")) digits = digits.slice(2);
  return digits.length >= 10 && digits.length <= 15 ? digits : "";
}

function sanitizeErrorMessage(value: unknown): string {
  const message =
    typeof value === "string"
      ? value
      : value instanceof Error
        ? value.message
        : "WHATSAPP_SEND_FAILED";

  return message.trim().slice(0, 500) || "WHATSAPP_SEND_FAILED";
}

function isTemplateRequired(providerError: unknown): boolean {
  if (!providerError || typeof providerError !== "object") {
    return false;
  }

  const error = providerError as {
    code?: string | number;
    error_subcode?: string | number;
    message?: string;
  };

  const code = String(error.code ?? "");
  const subcode = String(error.error_subcode ?? "");
  const message = String(error.message ?? "").toLowerCase();

  return (
    code === "131047" ||
    subcode === "131047" ||
    (message.includes("24") && message.includes("hour")) ||
    message.includes("outside the allowed window") ||
    message.includes("template")
  );
}

async function readProviderResponse(
  response: Response,
): Promise<Record<string, any>> {
  try {
    const payload = await response.json();
    return payload && typeof payload === "object"
      ? (payload as Record<string, any>)
      : {};
  } catch {
    return {};
  }
}

async function markMessageFailed(messageId: string): Promise<void> {
  await prisma.whatsAppMessage
    .update({
      where: { id: messageId },
      data: {
        status: "failed",
        failedAt: new Date(),
      },
    })
    .catch(() => undefined);
}

async function prepareOutbound(
  tenantId: string,
  to: string,
): Promise<PreparedOutbound> {
  const normalizedPhone = normalizePhone(to);
  if (!normalizedPhone) {
    throw new WhatsAppSendError("WHATSAPP_INVALID_PHONE");
  }

  const phoneHash = hashPhone(tenantId, normalizedPhone);
  const optedOut = await prisma.whatsAppOptOut.findUnique({
    where: {
      tenantId_phoneHash: {
        tenantId,
        phoneHash,
      },
    },
    select: { id: true },
  });

  if (optedOut) {
    throw new WhatsAppSendError("WHATSAPP_OPTED_OUT");
  }

  const connection = await resolveConnection(tenantId);
  const provider =
    connection.provider === "DIALOG360" ? "360dialog" : "meta";

  await prisma.whatsAppContact.upsert({
    where: {
      tenantId_phoneHash: {
        tenantId,
        phoneHash,
      },
    },
    create: {
      tenantId,
      phone: normalizedPhone,
      phoneHash,
      provider,
      lastMessageAt: new Date(),
    },
    update: {
      phone: normalizedPhone,
      provider,
      lastMessageAt: new Date(),
    },
  });

  return {
    normalizedPhone,
    phoneHash,
    connection,
  };
}

function requestForConnection(
  prepared: PreparedOutbound,
  payload: Record<string, unknown>,
): { url: string; init: RequestInit } {
  if (prepared.connection.provider === "DIALOG360") {
    return {
      url: `${prepared.connection.apiBaseUrl}/messages`,
      init: {
        method: "POST",
        headers: {
          "D360-API-KEY": prepared.connection.accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20_000),
      } satisfies RequestInit,
    };
  }

  return {
    url: `${prepared.connection.apiBaseUrl || META_API_BASE}/${encodeURIComponent(
      prepared.connection.phoneNumberId,
    )}/messages`,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${prepared.connection.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    } satisfies RequestInit,
  };
}

async function sendPreparedPayload(params: {
  tenantId: string;
  prepared: PreparedOutbound;
  messageType: "text" | "template";
  messageText: string;
  payload: Record<string, unknown>;
}): Promise<SendResult> {
  const messageId = randomUUID();
  const storageProvider =
    params.prepared.connection.provider === "DIALOG360"
      ? "360dialog"
      : "meta";

  await prisma.whatsAppMessage.create({
    data: {
      id: messageId,
      tenantId: params.tenantId,
      phone: params.prepared.normalizedPhone,
      phoneHash: params.prepared.phoneHash,
      direction: "outbound",
      provider: storageProvider,
      messageText: params.messageText,
      messageType: params.messageType,
      status: "pending",
    },
  });

  try {
    const request = requestForConnection(
      params.prepared,
      params.payload,
    );
    const response = await fetch(request.url, request.init);
    const payload = await readProviderResponse(response);
    const providerMessageId =
      typeof payload.messages?.[0]?.id === "string"
        ? payload.messages[0].id
        : null;

    if (response.ok && providerMessageId) {
      await prisma.whatsAppMessage.update({
        where: { id: messageId },
        data: {
          metaMessageId: providerMessageId,
          status: "pending",
        },
      });

      return {
        success: true,
        status: "pending",
        provider: params.prepared.connection.provider,
        messageId,
        metaMessageId: providerMessageId,
      };
    }

    await markMessageFailed(messageId);

    return {
      success: false,
      status: "failed",
      provider: params.prepared.connection.provider,
      messageId,
      metaMessageId: providerMessageId,
      errorCode: isTemplateRequired(payload.error || payload)
        ? "WHATSAPP_TEMPLATE_REQUIRED"
        : "WHATSAPP_SEND_FAILED",
      error: sanitizeErrorMessage(
        payload.error?.message || payload.message,
      ),
    };
  } catch (error) {
    await markMessageFailed(messageId);

    return {
      success: false,
      status: "failed",
      provider: params.prepared.connection.provider,
      messageId,
      errorCode: "WHATSAPP_SEND_FAILED",
      error: sanitizeErrorMessage(error),
    };
  }
}

function mapSendError(error: unknown): SendResult {
  if (error instanceof WhatsAppResolveError) {
    return {
      success: false,
      status: "failed",
      errorCode: error.code,
      error: error.code,
    };
  }

  if (error instanceof WhatsAppSendError) {
    return {
      success: false,
      status: "failed",
      errorCode: error.code,
      error: sanitizeErrorMessage(error),
    };
  }

  return {
    success: false,
    status: "failed",
    errorCode: "WHATSAPP_SEND_FAILED",
    error: sanitizeErrorMessage(error),
  };
}

export async function sendWhatsAppMessage(
  tenantId: string,
  to: string,
  text: string,
): Promise<SendResult> {
  try {
    const normalizedText = String(text ?? "").trim();
    if (!normalizedText) {
      throw new WhatsAppSendError(
        "WHATSAPP_SEND_FAILED",
        "WHATSAPP_EMPTY_MESSAGE",
      );
    }

    const prepared = await prepareOutbound(tenantId, to);

    return await sendPreparedPayload({
      tenantId,
      prepared,
      messageType: "text",
      messageText: normalizedText,
      payload: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: prepared.normalizedPhone,
        type: "text",
        text: {
          preview_url: false,
          body: normalizedText,
        },
      },
    });
  } catch (error) {
    return mapSendError(error);
  }
}

export async function sendWhatsAppTemplate(params: {
  tenantId: string;
  to: string;
  templateName: string;
  parameters?: string[];
  languageCode?: string;
}): Promise<SendResult> {
  try {
    const templateName = String(params.templateName ?? "").trim();
    const languageCode = String(params.languageCode ?? "ar").trim();
    const templateParameters = (params.parameters ?? []).map(
      (value) => String(value ?? "").trim(),
    );

    if (!/^[a-z0-9_]+$/.test(templateName)) {
      throw new WhatsAppSendError("WHATSAPP_INVALID_TEMPLATE");
    }
    if (!languageCode) {
      throw new WhatsAppSendError("WHATSAPP_INVALID_TEMPLATE");
    }

    const prepared = await prepareOutbound(params.tenantId, params.to);
    const components =
      templateParameters.length > 0
        ? [
            {
              type: "body",
              parameters: templateParameters.map((text) => ({
                type: "text",
                text,
              })),
            },
          ]
        : undefined;

    return await sendPreparedPayload({
      tenantId: params.tenantId,
      prepared,
      messageType: "template",
      messageText: `template:${templateName}`,
      payload: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: prepared.normalizedPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components ? { components } : {}),
        },
      },
    });
  } catch (error) {
    return mapSendError(error);
  }
}
