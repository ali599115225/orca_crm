// app/actions/whatsapp.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { logWhatsAppActivity } from "@/app/actions/whatsapp-crm";

export async function toggleWhatsAppConnectionAction(connected: boolean) {
  try {
    const tenant = await getActiveTenant();
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { whatsappConnected: connected }
    });
    revalidatePath("/operations/settings");
    revalidatePath("/operations/whatsapp");
    return { success: true };
  } catch (error: any) {
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

export async function getWhatsAppChatsAction() {
  try {
    const tenant = await getActiveTenant();
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    const isCloudAPI = !!(accessToken && phoneNumberId);

    if (!isCloudAPI) {
      return {
        success: true,
        chats: [],
        provider: "none",
        warning: "WhatsApp Cloud API غير مفعل. أضف WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID في Vercel.",
      };
    }

    const contacts = await (prisma as any).whatsAppContact.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, name: true, phone: true, leadId: true, lastMessageAt: true },
      orderBy: { lastMessageAt: "desc" },
      take: 50,
    });

    const chats = await Promise.all(
      contacts.map(async (c: any) => {
        const messages = await (prisma as any).whatsAppMessage.findMany({
          where: { tenantId: tenant.id, phone: c.phone },
          orderBy: { createdAt: "asc" },
          take: 50,
        });
        const lead = await (prisma as any).lead.findFirst({
          where: { tenantId: tenant.id, phone: c.phone },
          select: { id: true, status: true, source: true, priority: true },
        });
        const lastMsg = messages[messages.length - 1];
        const safeText = (t: any) => typeof t === "string" ? t : String(t ?? "");
        return {
          id: c.id,
          contactName: c.name || c.phone,
          contactPhone: c.phone,
          lastMessage: safeText(lastMsg?.messageText).substring(0, 100) || "",
          time: lastMsg?.createdAt?.toISOString() || c.lastMessageAt?.toISOString() || "",
          unread: false,
          leadId: lead?.id || null,
          leadStatus: lead?.status || null,
          leadSource: lead?.source || null,
          leadPriority: lead?.priority || null,
          messages: messages.map((m: any) => ({
            sender: m.direction === "inbound" ? "client" : "agent",
            text: safeText(m.messageText),
            time: m.createdAt?.toISOString() || "",
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
  try {
    const tenant = await getActiveTenant();
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";

    if (!accessToken || !phoneNumberId) {
      return { success: false, error: "WhatsApp Cloud API غير مفعل" };
    }

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
          to: chatId,
          type: "text",
          text: { preview_url: false, body: messageText },
        }),
      }
    );

    const result = await response.json();
    const metaMessageId = result.messages?.[0]?.id || null;

      if (response.ok && metaMessageId) {
      try {
        await (prisma as any).whatsAppContact.upsert({
          where: { tenantId_phone: { tenantId: tenant.id, phone: chatId } },
          create: { tenantId: tenant.id, phone: chatId, provider: "meta", lastMessageAt: new Date() },
          update: { lastMessageAt: new Date() },
        });
        await (prisma as any).whatsAppMessage.create({
          data: {
            tenantId: tenant.id,
            phone: chatId,
            direction: "outbound",
            provider: "meta",
            messageText,
            messageType: "text",
            metaMessageId,
            rawPayload: result,
            status: "sent",
          },
        });
        const lead = await (prisma as any).lead.findFirst({
          where: { tenantId: tenant.id, phone: chatId },
        });
        if (lead) {
          await logWhatsAppActivity(tenant.id, lead.id, chatId, "outbound", messageText, metaMessageId);
        }
        await prisma.auditLog.create({
          data: {
            tenantId: tenant.id,
            action: "WHATSAPP_MESSAGE_SENT",
            tableName: "WhatsAppMessage",
            recordId: metaMessageId,
            details: JSON.stringify({ to: chatId, length: messageText.length, provider: "meta" }),
          },
        });
      } catch {}
    }

    return {
      success: response.ok,
      provider: "meta",
      metaMessageId,
      metaResponse: result,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteWhatsAppConversationAction(contactId: string) {
  try {
    const tenant = await getActiveTenant();

    const contact = await (prisma as any).whatsAppContact.findFirst({
      where: { id: contactId, tenantId: tenant.id },
    });
    if (!contact) return { success: false, error: "المحادثة غير موجودة" };

    await (prisma as any).whatsAppMessage.deleteMany({
      where: { tenantId: tenant.id, phone: contact.phone },
    });
    await (prisma as any).whatsAppContact.delete({
      where: { id: contactId, tenantId: tenant.id },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: "WHATSAPP_CONVERSATION_DELETED",
        tableName: "WhatsAppContact",
        recordId: contactId,
        details: JSON.stringify({ phone: contact.phone, name: contact.name }),
      },
    });

    revalidatePath("/operations/whatsapp");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
