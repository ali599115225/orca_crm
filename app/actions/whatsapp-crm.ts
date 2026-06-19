// app/actions/whatsapp-crm.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { assertPlanLimit, PlanLimitError, logPlanBlockedAttempt } from "@/lib/plan-guard";
import { hashPhone } from "@/lib/privacy-mask";

// Phase F: Quick task creation from WhatsApp conversation
export async function createWhatsAppTaskAction(formData: FormData) {
  try {
    const tenant = await getActiveTenant();
    const session = await getSession();
    const title = formData.get("title") as string;
    const taskType = formData.get("taskType") as string;
    const contactPhone = formData.get("contactPhone") as string;

    console.log("[WA_TASK] start", { tenantId: tenant.id, phone: contactPhone, title, taskType });

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

    // Find or create lead for this WhatsApp contact
    let leadId: string | null = null;
    if (contactPhone) {
      const contact = await prisma.whatsAppContact.findFirst({
        where: { tenantId: tenant.id, phoneHash: hashPhone(tenant.id, contactPhone) },
        select: { leadId: true },
      });
      leadId = contact?.leadId || null;
    }
    if (!leadId) {
      try {
        const newLead = await prisma.$transaction(async (tx) => {
          await assertPlanLimit({ tenantId: tenant.id, feature: "leads", tx });
          return tx.lead.create({
            data: {
              tenantId: tenant.id,
              firstName: "WhatsApp",
              lastName: contactPhone || "Lead",
              phone: contactPhone || "",
              phoneHash: hashPhone(tenant.id, contactPhone),
              city: "غير محدد",
              source: "WHATSAPP",
              status: "NEW",
            },
          });
        });
        leadId = newLead.id;
      } catch (e) {
        if (e instanceof PlanLimitError) {
          await logPlanBlockedAttempt({ tenantId: tenant.id, error: e }).catch(() => {});
          return { success: false, error: e.message, code: e.code };
        }
        throw e;
      }
      if (contactPhone) {
        try {
          await prisma.whatsAppContact.updateMany({
            where: { tenantId: tenant.id, phoneHash: hashPhone(tenant.id, contactPhone) },
            data: { leadId },
          });
        } catch {}
      }
    }

    console.log("[WA_TASK] leadId:", leadId);

    // Get current user as assignee
    let assignedTo = session?.userId as string | undefined;
    if (!assignedTo) {
      const anyUser = await prisma.user.findFirst({
        where: { tenantId: tenant.id },
        select: { id: true },
      });
      assignedTo = anyUser?.id;
    }

    console.log("[WA_TASK] assignedTo:", assignedTo);

    if (!assignedTo) {
      return { success: false, error: "لا يوجد مستخدم لتعيين المهمة" };
    }

    const task = await prisma.task.create({
      data: {
        tenantId: tenant.id,
        title,
        description: description || "",
        dueDate,
        priority,
        status: "PENDING",
        leadId: leadId!,
        assignedTo: assignedTo!,
      },
    });

    console.log("[WA_TASK] success taskId:", task.id);

    revalidatePath("/operations/tasks");
    revalidatePath("/operations/whatsapp");
    return { success: true, taskId: task.id };
  } catch (error: any) {
    console.error("[WA_TASK] error:", error.message);
    return { success: false, error: error.message };
  }
}

// Phase J: Dashboard stats for WhatsApp
export async function getWhatsAppDashboardStats() {
  try {
    const tenant = await getActiveTenant();
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000);

    const [conversationsCount, newLeadsCount, unreadMessagesCount] = await Promise.all([
      prisma.whatsAppContact.count({ where: { tenantId: tenant.id } }),
      prisma.lead.count({
        where: {
          tenantId: tenant.id,
          source: { in: ["WHATSAPP", "whatsapp"] },
          createdAt: { gte: oneWeekAgo },
        },
      }),
      prisma.whatsAppMessage.count({
        where: { tenantId: tenant.id, direction: "inbound", readAt: null },
      }),
    ]);

    return { success: true, conversationsCount, newLeadsCount, unreadMessagesCount };
  } catch (error: any) {
    return { success: false, error: error.message, conversationsCount: 0, newLeadsCount: 0, unreadMessagesCount: 0 };
  }
}

// Phase C: CRM Timeline Integration
export async function logWhatsAppActivity(
  tenantId: string,
  leadId: string,
  phone: string,
  direction: "inbound" | "outbound",
  messageText: string,
  metaMessageId?: string
) {
  try {
    const preview = messageText.length > 150 ? messageText.substring(0, 150) + "..." : messageText;
    const directionLabel = direction === "inbound" ? "واردة" : "صادرة";
    await prisma.leadActivity.create({
      data: {
        tenantId,
        leadId,
        userId: null,
        activityType: "WHATSAPP_MESSAGE",
        description: `${directionLabel}: ${preview}${metaMessageId ? ` (${metaMessageId})` : ""}`,
      },
    });
  } catch (error) {
    console.error("[WhatsApp CRM] Activity log error:", error);
  }
}

// Phase E: AI Classification
async function classifyWhatsAppLead(leadId: string, messageText: string) {
  try {
    const text = messageText || "";
    let classification = "LOW";
    const hotKeywords = ["عرض", "سعر", "اشتري", "أبغى", "مستعجل", "زيارة", "معاينة", "كم", "بكم"];
    const warmKeywords = ["ممكن", "مهتم", "عندكم", "تفاصيل"];
    if (hotKeywords.some((kw) => text.includes(kw))) classification = "HIGH";
    else if (warmKeywords.some((kw) => text.includes(kw))) classification = "MEDIUM";
    await prisma.lead.update({ where: { id: leadId }, data: { priority: classification } });
    return { success: true, classification };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
