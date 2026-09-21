// app/actions/whatsapp.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertFeatureAccess, PlanLimitError, logPlanBlockedAttempt } from "@/lib/plan-guard";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send-service";
import { getConnectionStatus } from "@/lib/whatsapp/connection-resolver";
import { runWithTenantContext } from "@/lib/tenant-context";
import {
  requireWhatsAppAccess,
  type WhatsAppAccess,
  WHATSAPP_CONNECTION_ROLES,
  WHATSAPP_READ_ROLES,
  WHATSAPP_WRITE_ROLES,
} from "@/lib/whatsapp/access";

async function withWhatsAppAccess<const T>(
  allowedRoles: readonly string[],
  operation: (access: WhatsAppAccess) => Promise<T> | T,
): Promise<T> {
  const access = await requireWhatsAppAccess(allowedRoles);
  return runWithTenantContext(
    { tenantId: access.tenantId, userId: access.userId },
    () => operation(access),
  );
}

export async function toggleWhatsAppConnectionAction(connected: boolean) {
  try {
    return await withWhatsAppAccess(
      WHATSAPP_CONNECTION_ROLES,
      async ({ tenantId }) => {
        if (connected) {
          await assertFeatureAccess({ tenantId, feature: "whatsapp" });
        }
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { whatsappConnected: connected }
        });
        revalidatePath("/operations/settings");
        revalidatePath("/operations/whatsapp");
        return { success: true };
      },
    );
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
    return await withWhatsAppAccess(WHATSAPP_READ_ROLES, async ({ tenantId }) => {
      const result = await getConnectionStatus(tenantId);

      if (!result.configured) {
        return { configured: false, provider: "none", source: "none", status: "disconnected" };
      }

      return {
        configured: true,
        provider: result.provider === "DIALOG360" ? "360dialog" : "meta",
        source: result.source,
        status: result.status,
        wabaId: result.wabaId ?? null,
        activeSince: result.activeSince ?? null,
      };
    });
  } catch {
    return { configured: false, provider: "none", source: "none", status: "disconnected" };
  }
}

export async function getWhatsAppAssigneesAction() {
  try {
    return await withWhatsAppAccess(WHATSAPP_WRITE_ROLES, async ({ tenantId }) => {
      const users = await prisma.user.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        orderBy: [{ name: "asc" }, { createdAt: "asc" }],
        take: 100,
        select: {
          id: true,
          name: true,
        },
      });

      return {
        success: true,
        users: users.map((user) => ({
          id: user.id,
          name: user.name || "عضو فريق",
        })),
      };
    });
  } catch (error) {
    console.error("[WhatsApp] failed to load assignees", error);
    return {
      success: false,
      users: [],
      error: "تعذر تحميل فريق العمل.",
    };
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

const AUTH_ERROR_CODES = new Set(["190", "200", "10", "OAuthException"]);

function sanitizeSendErrorMessage(errorCode: string | undefined, rawMessage: string | undefined) {
  const lower = String(rawMessage || "").toLowerCase();
  const looksLikeAuthError =
    (errorCode && AUTH_ERROR_CODES.has(errorCode)) ||
    lower.includes("oauth") ||
    lower.includes("access token") ||
    lower.includes("authentication");

  if (looksLikeAuthError) {
    if (rawMessage) {
      console.error("[WhatsApp] sanitized auth error from Graph response", { errorCode, rawMessage });
    }
    return "تعذر إرسال الرسالة بسبب خلل في إعدادات الربط. تواصل مع الدعم.";
  }

  return rawMessage;
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
    return await withWhatsAppAccess(WHATSAPP_READ_ROLES, async ({ tenantId }) => {
    const archived = options.mode === "archived";

    const connectionStatus = await getConnectionStatus(tenantId);

    const connectionWarning = connectionStatus.configured
      ? null
      : "واتساب غير متصل. يمكنك مراجعة السجل والمهام، ويلزم ربط مزود قبل الإرسال.";

    const contacts = await prisma.whatsAppContact.findMany({
      where: { tenantId, archived },
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
          where: { tenantId, phone: c.phone },
          orderBy: { createdAt: "asc" },
          take: 50,
        });
        const lead = await prisma.lead.findFirst({
          where: { tenantId, phone: c.phone },
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

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, companyName: true },
    });

      return {
      success: true,
      chats,
      tenant,
      provider:
        !connectionStatus.configured
          ? "none"
          : connectionStatus.provider === "DIALOG360"
            ? "360dialog"
            : "meta",
      contactsCount: contacts.length,
      warning: connectionWarning,
      };
    });
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

export async function sendWhatsAppMessageAction(chatId: string, messageText: string) {
  try {
    return await withWhatsAppAccess(WHATSAPP_WRITE_ROLES, async ({ tenantId }) => {
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

      await assertFeatureAccess({ tenantId, feature: "whatsapp" });
      const result = await sendWhatsAppMessage(tenantId, normalizedPhone, messageText);

      return safeSendResult({
        success: result.success && Boolean(result.metaMessageId),
        messageId: result.messageId || null,
        metaMessageId: result.metaMessageId || null,
        phone: normalizedPhone,
        status: result.success && result.metaMessageId ? "pending" : "failed",
        errorCode: result.errorCode as any,
        errorMessage: result.success
          ? undefined
          : sanitizeSendErrorMessage(result.errorCode, result.error),
      });
    });
  } catch (error: any) {
    if (error instanceof PlanLimitError) {
      await logPlanBlockedAttempt({ tenantId: "", error }).catch(() => {});
      return safeSendResult({ success: false, errorCode: error.code as any, errorMessage: error.message, phone: normalizeWhatsAppPhone(chatId), status: "failed" });
    }
    return safeSendResult({
      success: false, messageId: null, phone: "",
      status: "failed", errorCode: "WHATSAPP_SEND_FAILED",
      errorMessage:
        /TENANT_CONTEXT|WHATSAPP_(?:NOT_CONNECTED|NO_CREDENTIAL|NO_PHONE|MESSAGING_DISABLED)/.test(
          String(error?.message || ""),
        )
          ? "لم يتم ربط مزود واتساب صالح بهذه المنشأة."
          : "تعذر إرسال رسالة واتساب. تحقق من الرقم أو إعدادات الربط وحاول مرة أخرى.",
    });
  }
}
export async function archiveChatAction(contactId: string) {
  try {
    return await withWhatsAppAccess(WHATSAPP_WRITE_ROLES, async ({ tenantId }) => {
      const contact = await prisma.whatsAppContact.findFirst({
        where: { id: contactId, tenantId },
      });
      if (!contact) return { success: false, error: "المحادثة غير موجودة" };

      await prisma.whatsAppContact.update({
        where: { id: contactId },
        data: { archived: !contact.archived },
      });
      revalidatePath("/operations/whatsapp");
      return { success: true, archived: !contact.archived };
    });
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

export async function assignChatAction(contactId: string, userId: string) {
  try {
    return await withWhatsAppAccess(
      WHATSAPP_WRITE_ROLES,
      async ({ tenantId }) => {
        const contact = await prisma.whatsAppContact.findFirst({
          where: { id: contactId, tenantId },
        });
        if (!contact) return { success: false, error: "المحادثة غير موجودة" };

        const assignee = await prisma.user.findFirst({
          where: {
            id: userId,
            tenantId,
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
      },
    );
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}
