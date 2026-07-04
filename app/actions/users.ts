// app/actions/users.ts
// Hardened: DB-backed role + tenantId in ALL DB writes + audit on every user mutation.
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { assertServerActionRole } from "@/lib/api-auth-guard";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { assertPlanLimit, PlanLimitError, logPlanBlockedAttempt } from "@/lib/plan-guard";
import { hashEmail } from "@/lib/privacy-mask";
import { isDedicatedCopyDeployment } from "@/lib/deployment-license";

const USER_ADMIN_ROLES = ["ADMIN", "owner"] as const;

/**
 * دالة مساعدة DB-backed للتحقق من مشرف الشركة (tenantId scoped)
 */
async function verifyTenantAdmin() {
  const session = await getSession();
  if (!session) {
    throw new Error("يجب تسجيل الدخول أولاً.");
  }

  // DB-backed: fetch user from DB with BOTH userId AND tenantId to prevent cross-tenant
  const tenant = await getActiveTenant();
  const user = await prisma.user.findFirst({
    where: {
      id: session.userId as string,
      tenantId: tenant.id, // ← tenantId-scoped lookup (was missing before)
      isActive: true,
    },
    select: { id: true, role: true, name: true },
  });

  if (!user || user.role !== "ADMIN") {
    throw new Error("عذراً، هذه العملية تتطلب صلاحيات المدير العام للشركة (Admin).");
  }

  return { session, user, tenant };
}

/**
 * جلب جميع الموظفين التابعين للشركة الحالية
 */
export async function getTenantUsersAction() {
  try {
    const session = await getSession();
    if (!session) return [];
    await assertServerActionRole(session, USER_ADMIN_ROLES);

    const tenant = await getActiveTenant();
    return await prisma.user.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "asc" },
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
    const { user: actorUser, tenant } = await verifyTenantAdmin();

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
    const newUser = await prisma.$transaction(async (tx) => {
      await assertPlanLimit({ tenantId: tenant.id, feature: "staff", tx });
      return tx.user.create({
        data: {
          tenantId: tenant.id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          emailHash: hashEmail(email.trim().toLowerCase()),
          role: role,
          passwordHash: hashedPassword,
          isActive: true,
        },
        select: { id: true },
      });
    });

    // ── Audit ──────────────────────────────────────────────────────────────
    await writeAuditLog({
      tenantId: tenant.id,
      userId: actorUser.id,
      action: "USER_CREATED",
      tableName: "users",
      recordId: newUser.id,
      details: JSON.stringify({ email: email.trim().toLowerCase(), role }),
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
    const { user: actorUser, tenant } = await verifyTenantAdmin();

    const name = formData.get("name") as string;
    const role = formData.get("role") as any;
    const isActive = formData.get("isActive") === "true";

    if (!name || !role) {
      throw new Error("الاسم وصلاحية الدور مطلوبان لتعديل الموظف.");
    }

    // التحقق من أن الموظف المستهدف ينتمي لنفس الشركة
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, tenantId: tenant.id },
      select: { id: true, role: true, name: true },
    });

    if (!targetUser) {
      throw new Error("المستخدم غير موجود أو لا ينتمي لشركتك العقارية.");
    }

    // tenantId-scoped update to prevent cross-tenant mutation
    await prisma.user.updateMany({
      where: { id: userId, tenantId: tenant.id },
      data: {
        name: name.trim(),
        role: role,
        isActive: isActive,
      },
    });

    // ── Audit ──────────────────────────────────────────────────────────────
    await writeAuditLog({
      tenantId: tenant.id,
      userId: actorUser.id,
      action: "USER_UPDATED",
      tableName: "users",
      recordId: userId,
      details: JSON.stringify({
        oldRole: targetUser.role,
        newRole: role,
        isActive,
      }),
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
    const { user: actorUser, tenant } = await verifyTenantAdmin();

    // منع الموظف من حذف نفسه
    if (actorUser.id === userId) {
      throw new Error("لا يمكنك حذف حسابك الحالي الذي تستخدمه لتسجيل الدخول.");
    }

    // التحقق من أن الموظف ينتمي لنفس الشركة
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, tenantId: tenant.id },
      select: { id: true, name: true, email: true },
    });

    if (!targetUser) {
      throw new Error("الموظف غير موجود أو لا ينتمي لشركتك العقارية.");
    }

    // tenantId-scoped deleteMany to prevent cross-tenant deletion
    await prisma.user.deleteMany({
      where: { id: userId, tenantId: tenant.id },
    });

    // ── Audit ──────────────────────────────────────────────────────────────
    await writeAuditLog({
      tenantId: tenant.id,
      userId: actorUser.id,
      action: "USER_DELETED",
      tableName: "users",
      recordId: userId,
      details: JSON.stringify({ email: targetUser.email }),
    });

    revalidatePath("/operations/settings");
    revalidatePath("/operations/sales");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPlanLimitInfoAction() {
  try {
    const session = await getSession();
    if (!session) return null;
    const tenant = await getActiveTenant();
    const currentUsers = await prisma.user.count({
      where: { tenantId: tenant.id, isActive: true },
    });

    if (isDedicatedCopyDeployment()) {
      return {
        mode: "DEDICATED_COPY",
        plan: null,
        limits: null,
        currentUsers,
        staffLimit: null,
        includedInLicense: true,
      };
    }

    const { getPlanLimits, normalizePlan } = await import("@/lib/plan-guard");
    const plan = normalizePlan(tenant.subscriptionPlan);
    const limits = getPlanLimits(plan);
    return {
      plan,
      limits,
      currentUsers,
      staffLimit: limits.staff ?? null,
    };
  } catch (error) {
    console.error("خطأ جلب معلومات الباقة:", error);
    return null;
  }
}
