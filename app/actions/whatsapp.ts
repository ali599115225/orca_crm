// app/actions/whatsapp.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { logWhatsAppActivity } from "@/app/actions/whatsapp-crm";
import { assertFeatureAccess, PlanLimitError, logPlanBlockedAttempt } from "@/lib/plan-guard";
import { hashPhone, redactPiiFromPayload } from "@/lib/privacy-mask";

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
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";

    if (!accessToken || !phoneNumberId) {
      return { configured: false, provider: "none", reason: "Cloud API credentials not set" };
    }

    try {
      const res = await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}?fields=id,display_phone_number,quality_rating,verified_name,code_verification_status`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        return {
          configured: true,
          provider: "meta",
          phoneNumberId,
          businessAccountId,
          phoneNumber: data.display_phone_number,
          verifiedName: data.verified_name,
          qualityRating: data.quality_rating,
          status: "connected",
        };
      }
      const errText = await res.text();
      return { configured: true, provider: "meta", phoneNumberId, businessAccountId, status: "disconnected", error: `HTTP ${res.status}: ${errText.substring(0, 200)}` };
    } catch (err: any) {
      return { configured: true, provider: "meta", phoneNumberId, businessAccountId, status: "disconnected", error: err.message || "Network error" };
    }
  } catch {
    return { configured: false, provider: "none", reason: "Status check failed" };
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
      contactId: result.contactId,
      messageId: result.messageId,
    });
  }
  return result;
}

export async function getWhatsAppChatsAction(options: { mode?: WhatsAppChatListMode } = {}) {
  try {
    const tenant = await getActiveTenant();
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    const isCloudAPI = !!(accessToken && phoneNumberId);
    const archived = options.mode === "archived";

    if (!isCloudAPI) {
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
      phoneNumberId,
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
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";

    // Step 1: Save message to DB first with status "pending"
    let savedMessageId: string | null = null;
    let savedContactId: string | null = null;
    try {
      const phoneHash = hashPhone(tenant.id, normalizedPhone);
      const savedContact = await prisma.whatsAppContact.upsert({
        where: { tenantId_phoneHash: { tenantId: tenant.id, phoneHash } },
        create: { tenantId: tenant.id, phone: normalizedPhone, phoneHash, provider: "meta", lastMessageAt: new Date() },
        update: { lastMessageAt: new Date() },
      });
      savedContactId = savedContact.id;
      const savedMessage = await prisma.whatsAppMessage.create({
        data: {
          tenantId: tenant.id,
          phone: normalizedPhone,
          phoneHash,
          direction: "outbound",
          provider: "meta",
          messageText,
          messageType: "text",
          metaMessageId: null,
          status: "pending",
        },
      });
      savedMessageId = savedMessage.id;

      const lead = await prisma.lead.findFirst({
        where: { tenantId: tenant.id, phone: normalizedPhone },
      });
      if (lead) {
        await logWhatsAppActivity(tenant.id, lead.id, normalizedPhone, "outbound", messageText);
      }
    } catch (dbErr) {
      console.error("[WhatsApp] Failed to save message to DB:", dbErr);
      return safeSendResult({
        success: false,
        messageId: null,
        contactId: savedContactId,
        phone: normalizedPhone,
        status: "failed",
        errorCode: "WHATSAPP_DB_SAVE_FAILED",
        errorSubcode: undefined,
        errorMessage: "فشل حفظ الرسالة في قاعدة البيانات",
      });
    }

    if (!accessToken || !phoneNumberId) {
      const errorCode = "WHATSAPP_NOT_CONFIGURED";
      const errorSubcode = undefined;
      const errorMessage = "WhatsApp Cloud API غير مفعل";
      if (savedMessageId) {
        await prisma.whatsAppMessage.update({
          where: { id: savedMessageId },
          data: {
            status: "failed",
            failedAt: new Date(),
            rawPayload: { provider: "meta", errorCode, errorSubcode, errorMessage } as any,
          },
        }).catch((updateErr) => {
          console.error("[WhatsApp] Failed to update message status to failed:", updateErr);
        });
      }
      return safeSendResult({
        success: false,
        messageId: savedMessageId,
        contactId: savedContactId,
        phone: normalizedPhone,
        status: "failed",
        errorCode,
        errorSubcode,
        errorMessage,
      });
    }

    // Step 2: Call Meta API
    const response = await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: normalizedPhone,
          type: "text",
          text: { preview_url: false, body: messageText },
        }),
      }
    );

    const result = await response.json();
    const metaMessageId = result.messages?.[0]?.id || null;
    const acceptedByMeta = response.ok && Boolean(metaMessageId);
    const errorCode = acceptedByMeta
      ? undefined
      : isTemplateRequiredError(result)
        ? "WHATSAPP_TEMPLATE_REQUIRED"
        : metaErrorCode(response.status, result);
    const errorSubcode = acceptedByMeta ? undefined : metaErrorSubcode(result);
    const errorMessage = acceptedByMeta ? undefined : metaErrorMessage(result);

    // Step 3: Update message status based on Meta API result
    if (acceptedByMeta && metaMessageId && savedMessageId) {
      try {
        await prisma.whatsAppMessage.update({
          where: { id: savedMessageId },
          data: {
            metaMessageId,
            rawPayload: redactPiiFromPayload(result) as any,
          },
        });
        await prisma.auditLog.create({
          data: {
            tenantId: tenant.id,
            action: "WHATSAPP_MESSAGE_ACCEPTED",
            tableName: "WhatsAppMessage",
            recordId: savedMessageId,
            details: JSON.stringify({ to: normalizedPhone, length: messageText.length, provider: "meta" }),
          },
        });
      } catch (updateErr) {
        console.error("[WhatsApp] Failed to update message status:", updateErr);
      }
    } else if (savedMessageId) {
      // Meta API failed - update status to "failed"
      try {
        await prisma.whatsAppMessage.update({
          where: { id: savedMessageId },
          data: {
            status: "failed",
            failedAt: new Date(),
            rawPayload: {
              provider: "meta",
              httpStatus: response.status,
              errorCode,
              errorSubcode,
              errorMessage,
              payload: redactPiiFromPayload(result),
            } as any,
          },
        });
      } catch (updateErr) {
        console.error("[WhatsApp] Failed to update message status to failed:", updateErr);
      }
    }

    return safeSendResult({
      success: acceptedByMeta,
      messageId: savedMessageId,
      contactId: savedContactId,
      phone: normalizedPhone,
      status: acceptedByMeta ? "pending" : "failed",
      errorCode,
      errorSubcode,
      errorMessage,
    });
  } catch (error: any) {
    if (error instanceof PlanLimitError) {
      await logPlanBlockedAttempt({ tenantId: "", error }).catch(() => {});
      return safeSendResult({
        success: false,
        messageId: null,
        contactId: null,
        phone: normalizedPhone,
        status: "failed",
        errorCode: error.code,
        errorSubcode: undefined,
        errorMessage: error.message,
      });
    }
    return safeSendResult({
      success: false,
      messageId: null,
      contactId: null,
      phone: normalizedPhone,
      status: "failed",
      errorCode: "WHATSAPP_SEND_EXCEPTION",
      errorSubcode: undefined,
      errorMessage: "تعذر إرسال رسالة واتساب",
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
