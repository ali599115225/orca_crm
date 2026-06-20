// app/actions/whatsapp.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { logWhatsAppActivity } from "@/app/actions/whatsapp-crm";
import { assertFeatureAccess, PlanLimitError, logPlanBlockedAttempt } from "@/lib/plan-guard";
import { hashPhone, redactPiiFromPayload } from "@/lib/privacy-mask";
import { sendWhatsAppMessage, WhatsAppSendError } from "@/lib/whatsapp/send-service";
import { resolveConnection, isMessagingEnabled } from "@/lib/whatsapp/connection-resolver";

export async function toggleWhatsAppConnectionAction(connected: boolean) {
  try {
    const tenant = await getActiveTenant();
    if (connected) {
      await assertFeatureAccess({ tenantId: tenant.id, feature: "whatsapp" });
    }
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { whatsappConnected: connected }
    });
    revalidatePath("/operations/settings");
    revalidatePath("/operations/whatsapp");
    return { success: true };
  } catch (error: any) {
    if (error instanceof PlanLimitError) {
      await logPlanBlockedAttempt({ tenantId: "", error }).catch(() => {});
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: error.message };
  }
}

export async function getCloudAPIStatusAction() {
  try {
    const tenant = await getActiveTenant();
    const connection = await prisma.whatsAppConnection.findUnique({
      where: { tenantId: tenant.id },
    });
    if (!connection || connection.status !== "ACTIVE") {
      return { configured: false, provider: "none", status: "disconnected" };
    }
    return {
      configured: true,
      provider: "meta",
      status: "connected",
      wabaId: connection.wabaId,
      activeSince: connection.activeSince,
    };
  } catch {
    return { configured: false, provider: "none", status: "disconnected" };
  }
}

type WhatsAppChatListMode = "active" | "archived";

const WHATSAPP_PHONE_RULES = [
  { code: "966", localLength: 9 },
  { code: "971", localLength: 9 },
  { code: "965", localLength: 8 },
  { code: "974", localLength: 8 },
  { code: "973", localLength: 8 },
  { code: "968", localLength: 8 },
] as const;

function normalizeWhatsAppPhone(value: string) {
  let digits = String(value || "").replace(/[^\d]/g, "");
  while (digits.startsWith("00")) digits = digits.slice(2);
  return digits;
}

function validateWhatsAppPhone(phone: string) {
  const rule = WHATSAPP_PHONE_RULES.find((country) => phone.startsWith(country.code));
  if (!rule) return false;
  const local = phone.slice(rule.code.length);
  return local.length === rule.localLength && !local.startsWith("0");
}

function isTemplateRequiredError(result: any) {
  const code = String(result?.error?.code || "");
  const subcode = String(result?.error?.error_subcode || "");
  const message = String(result?.error?.message || "").toLowerCase();
  return (
    code === "131047" ||
    subcode === "131047" ||
    (message.includes("24") && message.includes("hour")) ||
    message.includes("template") ||
    message.includes("outside the allowed window")
  );
}

function metaErrorCode(responseStatus: number, result: any) {
  return String(
    result?.error?.code ||
      (responseStatus ? `HTTP_${responseStatus}` : "WHATSAPP_SEND_FAILED"),
  );
}

function metaErrorSubcode(result: any) {
  const subcode = result?.error?.error_subcode;
  return subcode === undefined || subcode === null || subcode === "" ? undefined : String(subcode);
}

function metaErrorMessage(result: any) {
  const message = String(result?.error?.message || "").trim();
  return message ? message.slice(0, 240) : "تعذر إرسال رسالة واتساب";
}

function safeSendResult<T extends {
  success: boolean;
  status: string;
  errorCode?: string;
  errorSubcode?: string;
  errorMessage?: string;
  contactId?: string | null;
  messageId?: string | null;
}>(result: T) {
  if (process.env.NODE_ENV === "development") {
    console.info("[WhatsApp] send result", {
      success: result.success,
      status: result.status,
      errorCode: result.errorCode,
      errorSubcode: result.errorSubcode,
      errorMessage: result.errorMessage,
      messageId: result.messageId,
    });
  }
  return result;
}

export async function getWhatsAppChatsAction(options: { mode?: WhatsAppChatListMode } = {}) {
  try {
    const tenant = await getActiveTenant();
    const archived = options.mode === "archived";

    const connection = await prisma.whatsAppConnection.findUnique({
      where: { tenantId: tenant.id },
    });

    if (!connection || !["ACTIVE", "SUSPENDED"].includes(connection.status)) {
      return {
        success: true,
        chats: [],
        provider: "none",
        warning: "واتساب غير متصل. أكمل إعدادات الربط قبل استخدام المحادثات.",
      };
    }

    const contacts = await prisma.whatsAppContact.findMany({
      where: { tenantId: tenant.id, archived },
      select: {
        id: true,
        name: true,
        phone: true,
        leadId: true,
        lastMessageAt: true,
        assignedUserId: true,
        assignedUserName: true,
        archived: true,
      },
      orderBy: { lastMessageAt: "desc" },
      take: 50,
    });

    const chats = await Promise.all(
      contacts.map(async (c) => {
        const messages = await prisma.whatsAppMessage.findMany({
          where: { tenantId: tenant.id, phone: c.phone },
          orderBy: { createdAt: "asc" },
          take: 50,
        });
        const lead = await prisma.lead.findFirst({
          where: { tenantId: tenant.id, phone: c.phone },
          select: { id: true, status: true, source: true, priority: true },
        });
        const lastMsg = messages[messages.length - 1];
        const safeText = (t: string | null | undefined) => typeof t === "string" ? t : String(t ?? "");
        const displayPhone = normalizeWhatsAppPhone(c.phone);
        return {
          id: c.id,
          contactName: c.name || displayPhone,
          contactPhone: displayPhone,
          lastMessage: safeText(lastMsg?.messageText).substring(0, 100) || "",
          time: lastMsg?.createdAt?.toISOString() || c.lastMessageAt?.toISOString() || "",
          unread: false,
          leadId: lead?.id || null,
          leadStatus: lead?.status || null,
          leadSource: lead?.source || null,
          leadPriority: lead?.priority || null,
          assignedUserId: c.assignedUserId || null,
          assignedUserName: c.assignedUserName || null,
          archived: c.archived,
          messages: messages.map((m) => ({
            id: m.id,
            sender: m.direction === "inbound" ? "client" : "agent",
            text: safeText(m.messageText),
            time: m.createdAt?.toISOString() || "",
            status: m.status || null,
          })),
        };
      })
    );

    return {
      success: true,
      chats,
      tenant,
      provider: "meta",
      contactsCount: contacts.length,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendWhatsAppMessageAction(chatId: string, messageText: string) {
  const normalizedPhone = normalizeWhatsAppPhone(chatId);
  if (!normalizedPhone || !validateWhatsAppPhone(normalizedPhone)) {
    return safeSendResult({
      success: false,
      messageId: null,
      contactId: null,
      phone: normalizedPhone,
      status: "failed",
      errorCode: "WHATSAPP_INVALID_PHONE",
      errorSubcode: undefined,
      errorMessage: "رقم واتساب غير صالح",
    });
  }

  try {
    const tenant = await getActiveTenant();
    await assertFeatureAccess({ tenantId: tenant.id, feature: "whatsapp" });
    const result = await sendWhatsAppMessage(tenant.id, normalizedPhone, messageText);

    return safeSendResult({
      success: result.success,
      messageId: result.messageId || null,
      phone: normalizedPhone,
      status: result.success ? "pending" : "failed",
      errorCode: result.errorCode as any,
      errorMessage: result.error,
    });
  } catch (error: any) {
    if (error instanceof PlanLimitError) {
      await logPlanBlockedAttempt({ tenantId: "", error }).catch(() => {});
      return safeSendResult({ success: false, errorCode: error.code as any, errorMessage: error.message, phone: normalizedPhone, status: "failed" });
    }
    return safeSendResult({
      success: false, messageId: null, phone: normalizedPhone,
      status: "failed", errorCode: "WHATSAPP_SEND_FAILED",
      errorMessage: error.message?.substring(0, 500) || "تعذر إرسال رسالة واتساب",
    });
  }
}
export async function archiveChatAction(contactId: string) {
  try {
    const tenant = await getActiveTenant();
    const contact = await prisma.whatsAppContact.findFirst({
      where: { id: contactId, tenantId: tenant.id },
    });
    if (!contact) return { success: false, error: "المحادثة غير موجودة" };

    await prisma.whatsAppContact.update({
      where: { id: contactId },
      data: { archived: !contact.archived },
    });
    revalidatePath("/operations/whatsapp");
    return { success: true, archived: !contact.archived };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignChatAction(contactId: string, userId: string) {
  try {
    const tenant = await getActiveTenant();
    const contact = await prisma.whatsAppContact.findFirst({
      where: { id: contactId, tenantId: tenant.id },
    });
    if (!contact) return { success: false, error: "المحادثة غير موجودة" };

    const assignee = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: tenant.id,
        isActive: true,
      },
      select: { id: true, name: true },
    });
    if (!assignee) return { success: false, error: "المستخدم غير فعال أو لا ينتمي لهذا المستأجر" };

    await prisma.whatsAppContact.update({
      where: { id: contactId },
      data: { assignedUserId: assignee.id, assignedUserName: assignee.name },
    });
    revalidatePath("/operations/whatsapp");
    return { success: true, assignedUserId: assignee.id, assignedUserName: assignee.name };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
