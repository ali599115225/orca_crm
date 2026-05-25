// app/actions/admin.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

/**
 * فحص أمان أولي للتأكد من أن المستخدم الحالي هو المسؤول العام للمنصة (Super Admin)
 */
async function verifySuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("عذراً، غير مصرح لك بالوصول إلى لوحة التحكم الإدارية الكبرى.");
  }
  return session;
}

/**
 * جلب جميع المنشآت العقارية المسجلة في النظام مع إحصائيات بياناتها
 */
export async function getTenantsListAction() {
  try {
    await verifySuperAdmin(); // فحص الأمان
    
    return await prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            users: true,    // عدد الموظفين
            leads: true,    // عدد العملاء
            projects: true, // عدد المشاريع
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("فشل جلب قائمة المنشآت:", error);
    return [];
  }
}

/**
 * تعطيل أو تفعيل حساب منشأة عقارية بالكامل
 */
export async function toggleTenantStatusAction(tenantId: string, currentStatus: boolean) {
  try {
    await verifySuperAdmin();

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        isActive: !currentStatus,
      }
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * تحديث يدوي لباقة اشتراك المنشأة العقارية
 */
export async function updateTenantPlanAction(tenantId: string, newPlan: string) {
  try {
    await verifySuperAdmin();

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: newPlan,
      }
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}