// app/actions/leads.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { sendSMSNotification, sendWhatsAppNotification } from "@/lib/notifications";

export async function getLeadsAction() {
  try {
    const tenant = await getActiveTenant();
    
    const leads = await prisma.lead.findMany({
      where: { tenantId: tenant.id },
      include: {
        project: true,
        assignedUser: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return leads.map((lead) => ({
      ...lead,
      project: lead.project
        ? {
            ...lead.project,
            minPrice: lead.project.minPrice ? Number(lead.project.minPrice) : null,
            maxPrice: lead.project.maxPrice ? Number(lead.project.maxPrice) : null,
          }
        : null,
    }));
  } catch (error) {
    console.error("فشل جلب العملاء:", error);
    return [];
  }
}

export async function getProjectsAction() {
  try {
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
    const tenant = await getActiveTenant();

    await prisma.lead.update({
      where: { id: leadId, tenantId: tenant.id },
      data: {
        status: newStatus,
      }
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
    const plan = (tenant.subscriptionPlan || "basic").toLowerCase();
    let leadsLimit = 99999;
    if (plan === "basic") {
      leadsLimit = 100;
    } else if (plan === "silver" || plan === "pro" || plan === "professional") {
      leadsLimit = 1000;
    }

    const currentLeadsCount = await prisma.lead.count({
      where: { tenantId: tenant.id }
    });

    if (currentLeadsCount >= leadsLimit) {
      await prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          action: "LIMIT_EXCEEDED_EMERGENCY",
          tableName: "leads",
          recordId: "SYSTEM",
          details: `محاولة إضافة عميل جديد مرفوضة بسبب الوصول لـ 100% من سعة الباقة (${currentLeadsCount}/${leadsLimit}). حالة الطوارئ مفعلة.`
        }
      });
      throw new Error(`حالة الطوارئ: لقد وصلت إلى الحد الأقصى لسعة العملاء المتاحة في باقتك (${leadsLimit} عميل). لا يمكن استقبال عملاء جدد.`);
    }

    const isDuplicate = await prisma.lead.findFirst({
      where: {
        tenantId: tenant.id,
        phone: phone,
      },
    });

    if (isDuplicate) {
      throw new Error(`الرقم ${phone} مسجل مسبقاً بالنظام باسم العميل (${isDuplicate.firstName} ${isDuplicate.lastName || ""}) لمنع تضارب المبيعات.`);
    }

    // جلب مستخدم تلقائي من المبيعات لإسناد العميل له
    const randomSalesUser = await prisma.user.findFirst({
      where: { tenantId: tenant.id, role: "SALES_EMPLOYEE" },
    });

    // استخدام صيغة الـ connect المعتمدة في Prisma 7 للربط العلائقي الآمن بين الجداول [1]
    const lead = await prisma.lead.create({
      data: {
        tenant: {
          connect: { id: tenant.id } // ربط علائقي آمن بالشركة العقارية [1]
        },
        firstName,
        lastName: lastName || null,
        phone,
        email: email || null,
        city: city || "الرياض",
        source: source || "إعلانات سناب شات",
        status: "NEW",
        // ربط علائقي آمن بالمشروع في حال اختياره [1]
        project: projectId ? {
          connect: { id: projectId }
        } : undefined,
        // ربط علائقي آمن بمستشار المبيعات المكلف [1]
        assignedUser: randomSalesUser ? {
          connect: { id: randomSalesUser.id }
        } : undefined,
      },
    });

    const welcomeSMS = `مرحباً بك أ. ${firstName} في شركة صرح الوطن العقارية. سعدنا باهتمامك بمشاريعنا السكنية المميزة، سيتواصل معك مستشارك العقاري خلال دقائق لخدمتك.`;
    await sendSMSNotification(phone, welcomeSMS);

    if (randomSalesUser) {
      const salesPhone = "+966505123456";
      const templateName = "new_lead_assignment";
      const variables = [randomSalesUser.name, firstName, source];
      await sendWhatsAppNotification(salesPhone, templateName, variables);
    }

    revalidatePath("/operations/leads");
    return { success: true };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}