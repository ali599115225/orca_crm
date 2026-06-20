// lib/whatsapp/send-service.ts — SERVER-ONLY
import "server-only";
import { prisma } from "@/lib/prisma";
import { resolveConnection, WhatsAppResolveError } from "./connection-resolver";

export type SendErrorCode =
  | "WHATSAPP_NOT_CONNECTED"
  | "WHATSAPP_MESSAGING_DISABLED"
  | "WHATSAPP_NO_PHONE"
  | "WHATSAPP_NO_CREDENTIAL"
  | "WHATSAPP_INVALID_PHONE"
  | "WHATSAPP_TEMPLATE_REQUIRED"
  | "WHATSAPP_SEND_FAILED"
  | "WHATSAPP_OPTED_OUT";

export class WhatsAppSendError extends Error {
  constructor(public code: SendErrorCode, message?: string) {
    super(message || code);
  }
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  metaMessageId?: string | null;
  errorCode?: SendErrorCode;
  error?: string;
}

const META_API_BASE = "https://graph.facebook.com/v25.0";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return "";
  return digits;
}

export async function sendWhatsAppMessage(
  tenantId: string,
  to: string,
  text: string
): Promise<SendResult> {
  try {
    // 1. Check opt-out
    const phoneHash = hashPhoneText(to, tenantId);
    const optedOut = await prisma.whatsAppOptOut.findUnique({
      where: { tenantId_phoneHash: { tenantId, phoneHash } },
    });
    if (optedOut) {
      throw new WhatsAppSendError("WHATSAPP_OPTED_OUT");
    }

    // 2. Resolve connection + credential + phone
    const resolved = await resolveConnection(tenantId);

    // 3. Validate phone
    const normalized = normalizePhone(to);
    if (!normalized) {
      throw new WhatsAppSendError("WHATSAPP_INVALID_PHONE");
    }

    // 4. Save pending message
    const messageId = crypto.randomUUID();
    await prisma.whatsAppContact.upsert({
      where: { tenantId_phoneHash: { tenantId, phoneHash } },
      create: { tenantId, phone: to, phoneHash, provider: "meta", lastMessageAt: new Date() },
      update: { lastMessageAt: new Date() },
    });

    await prisma.whatsAppMessage.create({
      data: {
        id: messageId,
        tenantId,
        phone: to,
        phoneHash,
        direction: "outbound",
        provider: "meta",
        messageText: text,
        messageType: "text",
        status: "pending",
      },
    });

    // 5. Call Meta API
    const response = await fetch(
      `${META_API_BASE}/${resolved.phone.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resolved.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: normalized,
          type: "text",
          text: { preview_url: false, body: text },
        }),
      }
    );

    const result = await response.json();
    const metaMessageId = result.messages?.[0]?.id || null;

    if (response.ok && metaMessageId) {
      await prisma.whatsAppMessage.update({
        where: { id: messageId },
        data: { metaMessageId, status: "sent" },
      });
      return { success: true, messageId, metaMessageId };
    }

    // Meta rejected
    await prisma.whatsAppMessage.update({
      where: { id: messageId },
      data: { status: "failed", failedAt: new Date() },
    });
    return {
      success: false,
      errorCode: "WHATSAPP_SEND_FAILED",
      error: (result.error?.message || "Meta send failed").substring(0, 500),
    };

  } catch (error) {
    if (error instanceof WhatsAppResolveError) {
      return { success: false, errorCode: error.code as SendErrorCode, error: error.message };
    }
    if (error instanceof WhatsAppSendError) {
      return { success: false, errorCode: error.code, error: error.message };
    }
    return { success: false, errorCode: "WHATSAPP_SEND_FAILED", error: (error as Error).message?.substring(0, 500) };
  }
}

function hashPhoneText(phone: string, tenantId: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(`${tenantId}:${phone}`).digest("hex");
}
