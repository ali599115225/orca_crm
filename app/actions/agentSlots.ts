// app/actions/agentSlots.ts
// إدارة مقاعد الوكلاء الذكيين - Cap Lock + Round-Robin
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

const PLAN_SLOT_LIMITS: Record<string, number> = {
  basic: 1,
  silver: 5,
  gold: 999999,
};

/**
 * جلب جميع مقاعد الوكلاء للشركة الحالية
 */
export async function getAgentSlotsAction() {
  try {
    const tenant = await getActiveTenant();
    const slots = await prisma.agentSlot.findMany({
      where: { tenantId: tenant.id },
      include: { usageMeter: true },
      orderBy: { slotNumber: "asc" },
    });

    const plan = (tenant.subscriptionPlan || "basic").toLowerCase();
    const maxSlots = PLAN_SLOT_LIMITS[plan] ?? 1;
    const activeCount = slots.filter((s) => s.isActive).length;

    return {
      success: true,
      slots,
      maxSlots,
      activeCount,
      isAtCap: activeCount >= maxSlots,
      plan,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * إضافة مقعد وكيل جديد (مع تطبيق Cap Lock برمجياً)
 */
export async function createAgentSlotAction(agentType: string) {
  try {
    const tenant = await getActiveTenant();
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول.");

    const plan = (tenant.subscriptionPlan || "basic").toLowerCase();
    const maxSlots = PLAN_SLOT_LIMITS[plan] ?? 1;

    // فحص السعة قبل الإدراج (Cap Lock في طبقة الكود)
    const currentSlots = await prisma.agentSlot.count({
      where: { tenantId: tenant.id, isActive: true },
    });

    if (currentSlots >= maxSlots) {
      return {
        success: false,
        capLock: true,
        error: `🔒 قفل السعة: لقد وصلت للحد الأقصى (${maxSlots} مقاعد) لباقة ${plan}. يرجى الترقية للباقة الذهبية للحصول على مقاعد غير محدودة.`,
      };
    }

    const nextSlotNumber = currentSlots + 1;

    const newSlot = await prisma.agentSlot.create({
      data: {
        tenantId: tenant.id,
        slotNumber: nextSlotNumber,
        agentType: agentType || "CHAT_BOT",
        isActive: true,
      },
    });

    // إنشاء مقياس الاستخدام المرتبط بالمقعد
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);

    await prisma.usageMeter.create({
      data: {
        tenantId: tenant.id,
        agentSlotId: newSlot.id,
        metricType: "MESSAGES",
        limitValue: plan === "basic" ? 500 : plan === "silver" ? 2000 : 99999,
        usageValue: 0,
        resetAt: resetDate,
      },
    });

    revalidatePath("/operations/settings");
    revalidatePath("/operations/agents");

    return { success: true, slot: newSlot };
  } catch (error: any) {
    // رصد خطأ Cap Lock من PostgreSQL Trigger
    if (
      error.message?.includes("CAP LOCK") ||
      error.message?.includes("check_violation")
    ) {
      return { success: false, capLock: true, error: error.message };
    }
    return { success: false, error: error.message };
  }
}

/**
 * تعطيل مقعد وكيل
 */
export async function deactivateAgentSlotAction(slotId: string) {
  try {
    const tenant = await getActiveTenant();

    await prisma.agentSlot.update({
      where: { id: slotId, tenantId: tenant.id },
      data: { isActive: false },
    });

    revalidatePath("/operations/agents");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * جلب الوكيل التالي بطريقة Round-Robin (طبقة TypeScript)
 */
export async function getNextAvailableAgentAction(tenantId: string) {
  try {
    // استدعاء الـ SQL Function مباشرةً
    const result = await prisma.$queryRaw<Array<{ get_next_available_agent: string }>>`
      SELECT get_next_available_agent(${tenantId}::uuid) as get_next_available_agent
    `;

    const agentId = result[0]?.get_next_available_agent ?? null;
    if (!agentId) return { success: false, error: "لا يوجد موظفون متاحون حالياً." };

    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      select: { id: true, name: true, email: true, role: true },
    });

    return { success: true, agent };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * إحصائيات الاستخدام الكاملة لمقاعد الوكلاء
 */
export async function getUsageMetersAction() {
  try {
    const tenant = await getActiveTenant();

    const meters = await prisma.usageMeter.findMany({
      where: { tenantId: tenant.id },
      include: { agentSlot: true },
    });

    return { success: true, meters };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * تحديث عداد الاستخدام بعد كل رسالة أو تشغيل وكيل
 */
export async function incrementUsageMeterAction(
  agentSlotId: string,
  amount: number = 1
) {
  try {
    const tenant = await getActiveTenant();

    const meter = await prisma.usageMeter.findFirst({
      where: { agentSlotId, tenantId: tenant.id },
    });

    if (!meter) return { success: false, error: "مقياس الاستخدام غير موجود." };

    if (meter.usageValue + amount > meter.limitValue) {
      return {
        success: false,
        limitExceeded: true,
        error: `⚠️ تم استنفاد الحد المسموح (${meter.limitValue} ${meter.metricType}) لهذا المقعد.`,
      };
    }

    await prisma.usageMeter.update({
      where: { id: meter.id },
      data: { usageValue: { increment: amount } },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
