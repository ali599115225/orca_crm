// app/actions/projects.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

/**
 * جلب تفاصيل المشاريع مع تحويل حقول الـ Decimal إلى أرقام عادية لمتطلبات Next.js SSR
 */
export async function getDetailedProjectsAction() {
  try {
    const tenant = await getActiveTenant();
    
    const projects = await prisma.project.findMany({
      where: { tenantId: tenant.id },
      include: {
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // تحويل قيم الـ Decimal المعقدة إلى أرقام عادية (Numbers) لتسهيل نقلها عبر الشبكة
    return projects.map((project) => ({
      ...project,
      minPrice: project.minPrice ? Number(project.minPrice) : null,
      maxPrice: project.maxPrice ? Number(project.maxPrice) : null,
    }));
  } catch (error) {
    console.error("فشل جلب تفاصيل المشاريع:", error);
    return [];
  }
}

/**
 * إنشاء مشروع عقاري جديد للمستأجر الحالي
 */
export async function createProjectAction(formData: FormData) {
  try {
    const tenant = await getActiveTenant();
    
    const name = formData.get("name") as string;
    const city = formData.get("city") as string;
    const status = formData.get("status") as any; // PLANNING, UNDER_CONSTRUCTION, COMPLETED, SOLD_OUT
    const unitsTotal = parseInt(formData.get("unitsTotal") as string) || 0;
    const minPrice = parseFloat(formData.get("minPrice") as string) || 0;
    const maxPrice = parseFloat(formData.get("maxPrice") as string) || 0;

    if (!name || !city || !status) {
      throw new Error("اسم المشروع، المدينة، والحالة حقول إلزامية.");
    }

    await prisma.project.create({
      data: {
        tenant: {
          connect: { id: tenant.id }
        },
        name,
        city,
        status,
        unitsTotal,
        unitsSold: 0,
        unitsBooked: 0,
        minPrice,
        maxPrice,
      },
    });

    revalidatePath("/operations/projects");
    return { success: true };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}