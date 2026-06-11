// app/actions/whatsapp.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

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
        const lastMsg = messages[messages.length - 1];
        return {
          id: c.id,
          contactName: c.name || c.phone,
          contactPhone: c.phone,
          lastMessage: lastMsg?.messageText?.substring(0, 100) || "",
          time: lastMsg?.createdAt?.toISOString() || c.lastMessageAt?.toISOString() || "",
          unread: false,
          messages: messages.map((m: any) => ({
            sender: m.direction === "inbound" ? "client" : "agent",
            text: m.messageText || "",
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
