// app/actions/leads.ts
// Hardened: DB-backed role + tenant FK + audit on all mutations.
"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import { assertServerActionRole } from "@/lib/api-auth-guard";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { assertPlanLimit, PlanLimitError, logPlanBlockedAttempt } from "@/lib/plan-guard";
import { sendSMSNotification, sendWhatsAppNotification } from "@/lib/notifications";
import { hashPhone, hashEmail } from "@/lib/privacy-mask";

// Roles allowed to read leads data
const LEADS_READER_ROLES = [
  "ADMIN",
  "owner",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "rental_manager",
] as const;

// Roles allowed to mutate lead status
const LEADS_WRITER_ROLES = ["ADMIN", "owner", "SALES_MANAGER", "SALES_EMPLOYEE"] as const;

export async function getLeadsAction(page = 1, limit = 50) {
  try {
    const session = await getSession();
    if (!session) return { data: [], page, limit, total: 0, totalPages: 0 };
    await assertServerActionRole(session, LEADS_READER_ROLES);

    const tenant = await getActiveTenant();
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: { tenantId: tenant.id },
        include: { project: true, assignedUser: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where: { tenantId: tenant.id } }),
    ]);

    return {
      data: leads.map((lead) => ({
        ...lead,
        project: lead.project
          ? {
              ...lead.project,
              minPrice: lead.project.minPrice ? Number(lead.project.minPrice) : null,
              maxPrice: lead.project.maxPrice ? Number(lead.project.maxPrice) : null,
            }
          : null,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("فشل جلب العملاء:", error);
    return { data: [], page, limit, total: 0, totalPages: 0 };
  }
}

export async function getProjectsAction() {
  try {
    const session = await getSession();
    if (!session) return [];
    await assertServerActionRole(session, LEADS_READER_ROLES);

    const tenant = await getActiveTenant();
    const projects = await prisma.project.findMany({
      where: { tenantId: tenant.id },
    });

    return projects.map((p) => ({
      ...p,
      minPrice: p.minPrice ? Number(p.minPrice) : null,
      maxPrice: p.maxPrice ? Number(p.maxPrice) : null,
    }));
  } catch (error) {
    console.error("فشل جلب المشاريع لقائمة الاختيار:", error);
    return [];
  }
}

export async function updateLeadStatusAction(leadId: string, newStatus: any) {
  try {
    // ── Auth: DB-backed role verification ────────────────────────────────────
    const session = await getSession();
    if (!session) return { success: false, error: "يجب تسجيل الدخول أولاً." };
    const verified = await assertServerActionRole(session, LEADS_WRITER_ROLES);

    const tenant = await getActiveTenant();

    // FK: verify lead belongs to this tenant before mutation
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: tenant.id },
      select: { id: true, status: true },
    });
    if (!lead) return { success: false, error: "العميل غير موجود أو لا يتبع هذه المنشأة." };

    const previousStatus = lead.status;

    await prisma.lead.update({
      where: { id: leadId, tenantId: tenant.id },
      data: { status: newStatus },
    });

    // ── Audit ──────────────────────────────────────────────────────────────
    await writeAuditLog({
      tenantId: tenant.id,
      userId: verified.userId,
      action: "LEAD_STATUS_UPDATED",
      tableName: "leads",
      recordId: leadId,
      details: JSON.stringify({ from: previousStatus, to: newStatus }),
    });

    revalidatePath("/operations/leads");
    revalidatePath("/operations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * تسجيل عميل جديد مع تفعيل الربط العلائقي الصارم والإشعارات [1]
 */
export async function getLeadDetailAction(leadId: string) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "يجب تسجيل الدخول أولاً." };
    await assertServerActionRole(session, LEADS_READER_ROLES);

    const tenant = await getActiveTenant();

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: tenant.id },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        emailMessages: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        leadActivities: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!lead) {
      return { success: false, error: "العميل غير موجود" };
    }

    return { success: true, lead };
  } catch (error: any) {
    console.error("[Lead Detail] Error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function createLeadAction(formData: FormData) {
  try {
    const clientHost = formData.get("clientHost") as string;
    const tenant = await getActiveTenant(clientHost);

    let firstName = formData.get("firstName") as string;
    let lastName = formData.get("lastName") as string;
    const investorName = formData.get("investorName") as string;

    if (investorName) {
      const parts = investorName.trim().split(/\s+/);
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
    }

    const phone = formData.get("phone") as string;
    const email = formData.get("email") as string;
    const city = formData.get("city") as string;
    const source = formData.get("source") as string;
    const projectId = formData.get("projectId") as string;

    if (!firstName || !phone) {
      throw new Error("الاسم ورقم الجوال حقول إلزامية.");
    }

    // فحص حماية النظام وسعة باقة العملاء (System Protection Limit)
    let blockedError: PlanLimitError | null = null;

    const isDuplicate = await prisma.lead.findFirst({
      where: {
        tenantId: tenant.id,
        phone: phone,
      },
    });

    if (isDuplicate) {
      throw new Error(
        `الرقم ${phone} مسجل مسبقاً بالنظام باسم العميل (${isDuplicate.firstName} ${isDuplicate.lastName || ""}) لمنع تضارب المبيعات.`
      );
    }

    // جلب مستخدم تلقائي من المبيعات لإسناد العميل له
    const randomSalesUser = await prisma.user.findFirst({
      where: { tenantId: tenant.id, role: "SALES_EMPLOYEE" },
    });

    const lead = await prisma.$transaction(async (tx) => {
      await assertPlanLimit({ tenantId: tenant.id, feature: "leads", tx });
      return tx.lead.create({
        data: {
          tenant: { connect: { id: tenant.id } },
          firstName,
          lastName: lastName || null,
          phone,
          phoneHash: hashPhone(tenant.id, phone),
          email: email || null,
          emailHash: email ? hashEmail(email, tenant.id) : null,
          city: city || "الرياض",
          source: source || "إعلانات سناب شات",
          status: "NEW",
          project: projectId ? { connect: { id: projectId } } : undefined,
          assignedUser: randomSalesUser
            ? { connect: { id: randomSalesUser.id } }
            : undefined,
        },
      });
    });

    const welcomeSMS = `مرحباً بك أ. ${firstName} في شركة صرح الوطن العقارية. سعدنا باهتمامك بمشاريعنا السكنية المميزة، سيتواصل معك مستشارك العقاري خلال دقائق لخدمتك.`;
    await sendSMSNotification(phone, welcomeSMS);

    if (randomSalesUser) {
      const salesPhone = "+966505123456";
      const templateName = "new_lead_assignment";
      const variables = [randomSalesUser.name, firstName, source];
      await sendWhatsAppNotification(tenant.id, salesPhone, templateName, variables);
    }

    revalidatePath("/operations/leads");
    return { success: true };
  } catch (error: any) {
    if (error instanceof PlanLimitError) {
      logPlanBlockedAttempt({ tenantId: "", error }).catch(() => {});
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: error.message };
  }
}
