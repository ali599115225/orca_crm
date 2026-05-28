// app/actions/admin.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

/**
 * دالة التحقق الأمني الفوقي لمنع أي وصول غير مصرح به للعمليات الإدارية
 */
async function verifySuperAdmin() {
  const session = await getSession();
  if (!session) {
    throw new Error("يجب تسجيل الدخول أولاً.");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId as string }
  });

  const userEmail = user?.email || "";
  const isSuperAdmin = userEmail === "ali.orca@outlook.sa" || userEmail === "elite.orca@outlook.sa";

  if (!isSuperAdmin) {
    throw new Error("عذراً، غير مصرح لك بتنفيذ هذه العملية الإدارية.");
  }

  return { session, user };
}

/**
 * تحديث تذكرة الدعم الفني يدوياً من قبل الإدارة الفوقية
 */
export async function adminUpdateTicketAction(ticketId: string, status: "OPEN" | "CLOSED", responseText: string) {
  try {
    await verifySuperAdmin();

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: status,
        aiResponse: responseText.trim(),
        updatedAt: new Date()
      }
    });

    revalidatePath("/operations/support-monitor");
    revalidatePath("/operations/helpdesk");
    return { success: true };
  } catch (error: any) {
    console.error("خطأ إدارة التذاكر الفوقي:", error);
    return { success: false, error: error.message };
  }
}

/**
 * تعديل حالة مستأجر النظام أو الباقة يدوياً من قبل الإدارة
 */
export async function adminUpdateTenantPlanAction(tenantId: string, plan: string, isActive: boolean) {
  try {
    await verifySuperAdmin();

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: plan,
        isActive: isActive
      }
    });

    revalidatePath("/operations/support-monitor");
    revalidatePath("/operations/settings");
    return { success: true };
  } catch (error: any) {
    console.error("خطأ إدارة باقات المستأجرين الفوقي:", error);
    return { success: false, error: error.message };
  }
}

/**
 * جلب جميع الشركات من أجل لوحة الإدارة العامة الأصلية
 */
export async function getTenantsListAction() {
  try {
    await verifySuperAdmin();
    return await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
            leads: true,
          }
        }
      }
    });
  } catch (error) {
    console.error("خطأ جلب الشركات:", error);
    return [];
  }
}

/**
 * جلب جميع تذاكر الدعم الفني بالنظام
 */
export async function getTicketsListAction() {
  try {
    await verifySuperAdmin();
    return await prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        tenant: {
          select: {
            companyName: true,
            subdomain: true,
          }
        }
      }
    });
  } catch (error) {
    console.error("خطأ جلب التذاكر الفوقي:", error);
    return [];
  }
}

/**
 * تعديل حالة تفعيل الشركة (نشط / معطل)
 */
export async function toggleTenantStatusAction(tenantId: string, currentStatus: boolean) {
  try {
    await verifySuperAdmin();
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        isActive: !currentStatus
      }
    });
    revalidatePath("/admin");
    revalidatePath("/operations/support-monitor");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * تحديث باقة اشتراك الشركة
 */
export async function updateTenantPlanAction(tenantId: string, plan: string) {
  try {
    await verifySuperAdmin();
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: plan
      }
    });
    revalidatePath("/admin");
    revalidatePath("/operations/support-monitor");
    revalidatePath("/operations/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}