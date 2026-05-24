// app/actions/leads.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

/**
 * جلب جميع العملاء المحتمين وتحويل قيم الأسعار العشرية للمشروع المرتبط لمنع تعارض Next.js
 */
export async function getLeadsAction() {
  try {
    const tenant = await getActiveTenant();
    
    const leads = await prisma.lead.findMany({
      where: { tenantId: tenant.id },
      include: {
        project: true, // جلب بيانات المشروع المرتبط
        assignedUser: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // تحويل الأسعار العشرية داخل بيانات المشروع المرتبط بالعميل تلقائياً لمنع خطأ الـ Decimal
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
    console.error("فشل جلب العملاء وتحويل بيانات المشروع:", error);
    return [];
  }
}

/**
 * جلب المشاريع لقائمة الاختيار مع تحويل الـ Decimal لمنع خطأ الـ Serialization
 */
export async function getProjectsAction() {
  try {
    const tenant = await getActiveTenant();
    const projects = await prisma.project.findMany({
      where: { tenantId: tenant.id },
    });

    // تحويل حقول الـ Decimal إلى أرقام عادية لمتطلبات Next.js
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

/**
 * تسجيل عميل جديد مع التحقق من عدم تكراره
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

    await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        firstName,
        lastName: lastName || null,
        phone,
        city,
        source,
        status: "NEW",
        projectId: projectId ? projectId : null,
      },
    });

    revalidatePath("/operations/leads");
    return { success: true };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}