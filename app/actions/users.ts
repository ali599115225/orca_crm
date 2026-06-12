// app/actions/users.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { assertPlanLimit, PlanLimitError, logPlanBlockedAttempt, getPlanLimits, normalizePlan } from "@/lib/plan-guard";

/**
 * دالة مساعدة للتحقق من هوية المشرف العقاري للشركة
 */
async function verifyTenantAdmin() {
  const session = await getSession();
  if (!session) {
    throw new Error("يجب تسجيل الدخول أولاً.");
  }

  // السماح للمدير العام فقط (أو مشرف النظام) بإدارة المستخدمين
  const user = await prisma.user.findUnique({
    where: { id: session.userId as string },
  });

  if (!user || user.role !== "ADMIN") {
    throw new Error("عذراً، هذه العملية تتطلب صلاحيات المدير العام للشركة (Admin).");
  }

  const tenant = await getActiveTenant();
  return { session, user, tenant };
}

/**
 * جلب جميع الموظفين التابعين للشركة الحالية
 */
export async function getTenantUsersAction() {
  try {
    const session = await getSession();
    if (!session) return [];

    const tenant = await getActiveTenant();
    return await prisma.user.findMany({
      where: {
        tenantId: tenant.id,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error("خطأ جلب الموظفين:", error);
    return [];
  }
}

/**
 * إضافة موظف جديد للشركة مع التحقق من سقف الباقة
 */
export async function createTenantUserAction(formData: FormData) {
  try {
    const { tenant } = await verifyTenantAdmin();

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const role = formData.get("role") as any;
    const password = formData.get("password") as string;

    if (!name || !email || !role || !password) {
      throw new Error("جميع الحقول المطلوبة لإنشاء الموظف غير مكتملة.");
    }

    // 1. التحقق من فرادة البريد الإلكتروني في النظام بأكمله
    const emailExists = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (emailExists) {
      throw new Error("البريد الإلكتروني المدخل مسجل بالفعل لموظف آخر في النظام.");
    }

    // 2. تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. إنشاء الموظف داخل transaction مع فحص الحد للتأمين ضد race condition
    await prisma.$transaction(async (tx) => {
      await assertPlanLimit({ tenantId: tenant.id, feature: "staff", tx });
      await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: role,
          passwordHash: hashedPassword,
          isActive: true,
        },
      });
    });

    revalidatePath("/operations/settings");
    revalidatePath("/operations/sales");
    return { success: true };
  } catch (error: any) {
    if (error instanceof PlanLimitError) {
      await logPlanBlockedAttempt({ tenantId: "", error }).catch(() => {});
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: error.message };
  }
}

/**
 * تحديث بيانات أو حالة موظف عقاري
 */
export async function updateTenantUserAction(userId: string, formData: FormData) {
  try {
    const { tenant } = await verifyTenantAdmin();

    const name = formData.get("name") as string;
    const role = formData.get("role") as any;
    const isActive = formData.get("isActive") === "true";

    if (!name || !role) {
      throw new Error("الاسم وصلاحية الدور مطلوبان لتعديل الموظف.");
    }

    // التحقق من أن الموظف المستهدف ينتمي لنفس الشركة
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, tenantId: tenant.id },
    });

    if (!targetUser) {
      throw new Error("المستخدم غير موجود أو لا ينتمي لشركتك العقارية.");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: name.trim(),
        role: role,
        isActive: isActive,
      },
    });

    revalidatePath("/operations/settings");
    revalidatePath("/operations/sales");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * حذف موظف عقاري من النظام
 */
export async function deleteTenantUserAction(userId: string) {
  try {
    const { user, tenant } = await verifyTenantAdmin();

    // منع الموظف من حذف نفسه
    if (user.id === userId) {
      throw new Error("لا يمكنك حذف حسابك الحالي الذي تستخدمه لتسجيل الدخول.");
    }

    // التحقق من أن الموظف ينتمي لنفس الشركة
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, tenantId: tenant.id },
    });

    if (!targetUser) {
      throw new Error("الموظف غير موجود أو لا ينتمي لشركتك العقارية.");
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/operations/settings");
    revalidatePath("/operations/sales");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
