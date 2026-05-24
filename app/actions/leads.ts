// app/actions/leads.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { sendSMSNotification, sendWhatsAppNotification } from "@/lib/notifications"; // استدعاء المحرك

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
    console.error("فشل جلب المشاريع:", error);
    return [];
  }
}

/**
 * تسجيل عميل جديد مع تفعيل إشعارات الواتساب والـ SMS الفورية
 */
export async function createLeadAction(formData: FormData) {
  try {
    const tenant = await getActiveTenant();
    
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const phone = formData.get("phone") as string;
    const city = formData.get("city") as string;
    const source = formData.get("source") as string;
    const projectId = formData.get("projectId") as string;

    if (!firstName || !phone) {
      throw new Error("الاسم الأول ورقم الجوال حقول إلزامية.");
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

    const lead = await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        firstName,
        lastName: lastName || null,
        phone,
        city,
        source,
        status: "NEW",
        projectId: projectId ? projectId : null,
        assignedTo: randomSalesUser ? randomSalesUser.id : null,
      },
    });

    // 🚀 الإجراء 1: إرسال رسالة SMS ترحيبية فورية للعميل الجديد [1.2.1]
    const welcomeSMS = `مرحباً بك أ. ${firstName} في شركة دار الأعمار العقارية. سعدنا باهتمامك بمشاريعنا السكنية المميزة، سيتواصل معك مستشارك العقاري خلال دقائق لخدمتك.`;
    await sendSMSNotification(phone, welcomeSMS);

    // 🚀 الإجراء 2: إرسال تنبيه واتساب فوري لمستشار المبيعات لإعلامه بالعميل الجديد [1.2.1]
    if (randomSalesUser) {
      const salesPhone = "+966505123456"; // رقم تجريبي لمستشار المبيعات
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