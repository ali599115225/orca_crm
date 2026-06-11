// app/actions/whatsapp-crm.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

// Phase F: Quick task creation from WhatsApp conversation
export async function createWhatsAppTaskAction(formData: FormData) {
  try {
    const tenant = await getActiveTenant();
    const title = formData.get("title") as string;
    const taskType = formData.get("taskType") as string;
    const contactPhone = formData.get("contactPhone") as string;

    if (!title || !taskType) {
      return { success: false, error: "جميع الحقول إلزامية" };
    }

    const dueDate = new Date(Date.now() + 3600000);

    const taskTypePriorityMap: Record<string, "HIGH" | "MEDIUM" | "LOW"> = {
      "Call": "HIGH",
      "Visit": "HIGH",
      "Follow-up": "MEDIUM",
      "Send Offer": "HIGH",
    };

    const priority = taskTypePriorityMap[taskType] || "MEDIUM";
    const description = `${taskType} — من واتساب ${contactPhone || ""}`;

    let leadId: string | null = null;
    let assignedUserId: string | null = null;

    if (contactPhone) {
      const contact = await (prisma as any).whatsAppContact.findFirst({
        where: { tenantId: tenant.id, phone: contactPhone },
        select: { leadId: true },
      });
      if (contact?.leadId) {
        const lead = await prisma.lead.findUnique({
          where: { id: contact.leadId, tenantId: tenant.id },
          select: { id: true, assignedTo: true },
        });
        if (lead) {
          leadId = lead.id;
          assignedUserId = lead.assignedTo || null;
        }
      }
    }

    await (prisma.task as any).create({
      data: {
        tenantId: tenant.id,
        title,
        description,
        dueDate,
        priority,
        status: "PENDING",
        leadId: leadId || undefined,
        assignedUserId: assignedUserId || undefined,
      },
    });

    revalidatePath("/operations/tasks");
    revalidatePath("/operations/whatsapp");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Phase J: Dashboard stats for WhatsApp
export async function getWhatsAppDashboardStats() {
  try {
    const tenant = await getActiveTenant();

    const oneWeekAgo = new Date(Date.now() - 7 * 86400000);

    const [conversationsCount, newLeadsCount, unreadMessagesCount] = await Promise.all([
      (prisma as any).whatsAppContact.count({ where: { tenantId: tenant.id } }),
      prisma.lead.count({
        where: {
          tenantId: tenant.id,
          source: { in: ["WHATSAPP", "whatsapp"] },
          createdAt: { gte: oneWeekAgo },
        },
      }),
      (prisma as any).whatsAppMessage.count({
        where: { tenantId: tenant.id, direction: "inbound", readAt: null },
      }),
    ]);

    return { success: true, conversationsCount, newLeadsCount, unreadMessagesCount };
  } catch (error: any) {
    return { success: false, error: error.message, conversationsCount: 0, newLeadsCount: 0, unreadMessagesCount: 0 };
  }
}

// Phase C: CRM Timeline Integration — log WhatsApp messages as LeadActivity
export async function logWhatsAppActivity(
  tenantId: string,
  leadId: string,
  phone: string,
  direction: "inbound" | "outbound",
  messageText: string,
  metaMessageId?: string
) {
  try {
    const preview =
      messageText.length > 150
        ? messageText.substring(0, 150) + "..."
        : messageText;
    const directionLabel = direction === "inbound" ? "واردة" : "صادرة";

    await prisma.leadActivity.create({
      data: {
        tenantId,
        leadId,
        userId: null,
        activityType: "WHATSAPP_MESSAGE",
        description: `رسالة واتساب ${directionLabel}: ${preview}${metaMessageId ? ` (${metaMessageId})` : ""}`,
      },
    });
  } catch (error) {
    console.error("[WhatsApp CRM] Failed to log activity:", error);
  }
}

// Phase E: AI Classification — keyword-based lead classification
export async function classifyWhatsAppLead(leadId: string, messageText: string) {
  try {
    const text = messageText || "";
    let classification = "COLD";

    const hotKeywords = [
      "عرض", "سعر", "اشتري", "أبغى", "مستعجل", "زيارة", "معاينة", "كم", "بكم",
    ];
    const warmKeywords = ["ممكن", "مهتم", "عندكم", "تفاصيل"];

    if (hotKeywords.some((kw) => text.includes(kw))) {
      classification = "HOT";
    } else if (warmKeywords.some((kw) => text.includes(kw))) {
      classification = "WARM";
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: { priority: classification },
    });

    return { success: true, classification };
  } catch (error: any) {
    console.error("[WhatsApp CRM] Classification error:", error);
    return { success: false, error: error.message };
  }
}
