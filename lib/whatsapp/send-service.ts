import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPhone } from "@/lib/privacy-mask";
import {
  resolveConnection,
  WhatsAppResolveError,
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
  messageId?: string;
  metaMessageId?: string | null;
  errorCode?: SendErrorCode;
  error?: string;
}

interface PreparedOutbound {
  normalizedPhone: string;
  phoneHash: string;
  phoneNumberId: string;
  accessToken: string;
}

const META_API_BASE = "https://graph.facebook.com/v25.0";

function normalizePhone(phone: string): string {
  let digits = String(phone ?? "").replace(/\D/g, "");

  while (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

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

function isTemplateRequired(metaError: unknown): boolean {
  if (!metaError || typeof metaError !== "object") {
    return false;
  }

  const error = metaError as {
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
    message.includes("outside the allowed window")
  );
}

async function readMetaResponse(
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

  const resolved = await resolveConnection(tenantId);

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
      provider: "meta",
      lastMessageAt: new Date(),
    },
    update: {
      phone: normalizedPhone,
      lastMessageAt: new Date(),
    },
  });

  return {
    normalizedPhone,
    phoneHash,
    phoneNumberId: resolved.phoneNumberId,
    accessToken: resolved.accessToken,
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

  await prisma.whatsAppMessage.create({
    data: {
      id: messageId,
      tenantId: params.tenantId,
      phone: params.prepared.normalizedPhone,
      phoneHash: params.prepared.phoneHash,
      direction: "outbound",
      provider: "meta",
      messageText: params.messageText,
      messageType: params.messageType,
      status: "pending",
    },
  });

  try {
    const response = await fetch(
      `${META_API_BASE}/${encodeURIComponent(params.prepared.phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${params.prepared.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params.payload),
      },
    );

    const payload = await readMetaResponse(response);
    const metaMessageId =
      typeof payload.messages?.[0]?.id === "string"
        ? payload.messages[0].id
        : null;

    if (response.ok && metaMessageId) {
      await prisma.whatsAppMessage.update({
        where: { id: messageId },
        data: {
          metaMessageId,
          status: "pending",
        },
      });

      return {
        success: true,
        status: "pending",
        messageId,
        metaMessageId,
      };
    }

    await markMessageFailed(messageId);

    return {
      success: false,
      status: "failed",
      messageId,
      metaMessageId,
      errorCode: isTemplateRequired(payload.error)
        ? "WHATSAPP_TEMPLATE_REQUIRED"
        : "WHATSAPP_SEND_FAILED",
      error: sanitizeErrorMessage(payload.error?.message),
    };
  } catch (error) {
    await markMessageFailed(messageId);

    return {
      success: false,
      status: "failed",
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
    const templateParameters = (params.parameters ?? []).map((value) =>
      String(value ?? "").trim(),
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
          language: {
            code: languageCode,
          },
          ...(components ? { components } : {}),
        },
      },
    });
  } catch (error) {
    return mapSendError(error);
  }
}