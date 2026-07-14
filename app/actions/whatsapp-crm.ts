// app/actions/whatsapp-crm.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { runWithTenantContext, setTenantContext } from "@/lib/tenant-context";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { assertPlanLimit, PlanLimitError, logPlanBlockedAttempt } from "@/lib/plan-guard";
import { hashPhone } from "@/lib/privacy-mask";

// Phase F: Quick task creation from WhatsApp conversation
export async function createWhatsAppTaskAction(formData: FormData) {
  try {
    const tenant = await getActiveTenant();
    const session = await getSession();
    const userId =
      typeof session?.userId === "string" ? session.userId : undefined;

    if (!userId) {
      return { success: false, error: "يجب تسجيل الدخول أولًا." };
    }

    return await runWithTenantContext(
      { tenantId: tenant.id, userId },
      async () => {
        const title = String(formData.get("title") || "").trim();
        const taskType = String(formData.get("taskType") || "").trim();
        const contactPhone = String(
          formData.get("contactPhone") || "",
        ).replace(/[^\d]/g, "");
        const contactName = String(
          formData.get("contactName") || "",
        ).trim();
        const requestedLeadId = String(
          formData.get("leadId") || "",
        ).trim();

        if (!title || !taskType || !contactPhone) {
          return {
            success: false,
            error: "بيانات المهمة أو رقم العميل غير مكتملة.",
          };
        }

        const activeUser = await prisma.user.findFirst({
          where: {
            id: userId,
            tenantId: tenant.id,
            isActive: true,
          },
          select: { id: true },
        });

        if (!activeUser) {
          return {
            success: false,
            error: "تعذر تحديد الموظف المسؤول عن المهمة.",
          };
        }

        let leadId: string | null = null;

        if (requestedLeadId) {
          const requestedLead = await prisma.lead.findFirst({
            where: {
              id: requestedLeadId,
              tenantId: tenant.id,
            },
            select: { id: true },
          });
          leadId = requestedLead?.id || null;
        }

        if (!leadId) {
          const contact = await prisma.whatsAppContact.findFirst({
            where: {
              tenantId: tenant.id,
              OR: [
                {
                  phoneHash: hashPhone(
                    tenant.id,
                    contactPhone,
                  ),
                },
                { phone: contactPhone },
                { phone: `+${contactPhone}` },
              ],
            },
            select: { leadId: true },
          });

          if (contact?.leadId) {
            const linkedLead = await prisma.lead.findFirst({
              where: {
                id: contact.leadId,
                tenantId: tenant.id,
              },
              select: { id: true },
            });
            leadId = linkedLead?.id || null;
          }
        }

        if (!leadId) {
          try {
            const newLead = await prisma.$transaction(
              async (tx) => {
                await assertPlanLimit({
                  tenantId: tenant.id,
                  feature: "leads",
                  tx,
                });

                const safeName =
                  contactName &&
                  contactName !== contactPhone &&
                  !/^[+\d\s-]{6,}$/.test(contactName)
                    ? contactName.slice(0, 80)
                    : "عميل واتساب";

                return tx.lead.create({
                  data: {
                    tenantId: tenant.id,
                    firstName: safeName,
                    lastName: contactPhone,
                    phone: contactPhone,
                    phoneHash: hashPhone(
                      tenant.id,
                      contactPhone,
                    ),
                    city: "غير محدد",
                    source: "WHATSAPP",
                    status: "NEW",
                  },
                  select: { id: true },
                });
              },
            );

            leadId = newLead.id;
          } catch (error) {
            if (error instanceof PlanLimitError) {
              await logPlanBlockedAttempt({
                tenantId: tenant.id,
                error,
              }).catch(() => {});
              return {
                success: false,
                error: error.message,
                code: error.code,
              };
            }
            throw error;
          }

          await prisma.whatsAppContact.updateMany({
            where: {
              tenantId: tenant.id,
              OR: [
                {
                  phoneHash: hashPhone(
                    tenant.id,
                    contactPhone,
                  ),
                },
                { phone: contactPhone },
                { phone: `+${contactPhone}` },
              ],
            },
            data: { leadId },
          });
        }

        if (!leadId) {
          return {
            success: false,
            error: "تعذر ربط المهمة بعميل واتساب.",
          };
        }

        const taskTypePriorityMap: Record<
          string,
          "HIGH" | "MEDIUM" | "LOW"
        > = {
          Call: "HIGH",
          Visit: "HIGH",
          "Follow-up": "MEDIUM",
          "Send Offer": "HIGH",
        };

        const task = await prisma.task.create({
          data: {
            tenantId: tenant.id,
            title,
            description: `${taskType} — متابعة واتساب مع ${contactName || contactPhone}`,
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            priority:
              taskTypePriorityMap[taskType] || "MEDIUM",
            status: "PENDING",
            leadId,
            assignedTo: activeUser.id,
          },
          select: { id: true },
        });

        revalidatePath("/operations/tasks");
        revalidatePath("/operations/whatsapp");

        return {
          success: true,
          taskId: task.id,
        };
      },
    );
  } catch (error) {
    console.error("[WhatsApp] task creation failed", error);
    return {
      success: false,
      error: "تعذر إنشاء مهمة المتابعة.",
    };
  }
}

// Phase J: Dashboard stats for WhatsApp
// This helper is safe to call from both Server Components (inside an explicit
// runWithTenantContext scope) and from Server Action wrappers.
export async function fetchWhatsAppDashboardStats(tenantId: string) {
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000);

  return runWithTenantContext(
    { tenantId },
    async () => {
      const [conversationsCount, newLeadsCount, unreadMessagesCount] = await Promise.all([
        prisma.whatsAppContact.count({ where: { tenantId } }),
        prisma.lead.count({
          where: {
            tenantId,
            source: { in: ["WHATSAPP", "whatsapp"] },
            createdAt: { gte: oneWeekAgo },
          },
        }),
        prisma.whatsAppMessage.count({
          where: { tenantId, direction: "inbound", readAt: null },
        }),
      ]);

      return { success: true, conversationsCount, newLeadsCount, unreadMessagesCount };
    },
  );
}

export async function getWhatsAppDashboardStats() {
  try {
    const tenant = await getActiveTenant();
    setTenantContext({ tenantId: tenant.id });
    return fetchWhatsAppDashboardStats(tenant.id);
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
