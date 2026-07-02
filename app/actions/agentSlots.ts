"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  AGENT_MANAGER_ROLES,
  AGENT_READ_ROLES,
  requireAgentAccess,
} from "@/lib/agents/access";
import {
  getAgentDefinition,
  normalizeAgentType,
} from "@/lib/agents/registry";
import { isDedicatedCopyDeployment } from "@/lib/deployment-license";

const PLAN_SLOT_LIMITS: Record<string, number> = {
  basic: 1,
  silver: 5,
  gold: 999_999,
  platinum: 999_999,
  professional: 999_999,
  diamond: 999_999,
};

function planLimit(plan: string | null | undefined): number {
  if (isDedicatedCopyDeployment()) return Number.MAX_SAFE_INTEGER;
  return PLAN_SLOT_LIMITS[(plan || "basic").toLowerCase()] ?? 1;
}

export async function getAgentSlotsAction() {
  try {
    const access = await requireAgentAccess({ roles: AGENT_READ_ROLES });
    const [tenant, slots] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: access.tenantId },
        select: { subscriptionPlan: true },
      }),
      prisma.agentSlot.findMany({
        where: { tenantId: access.tenantId },
        include: { usageMeter: true },
        orderBy: { slotNumber: "asc" },
      }),
    ]);

    const maxSlots = planLimit(tenant?.subscriptionPlan);
    const activeCount = slots.filter((slot) => slot.isActive).length;

    return {
      success: true,
      slots: slots.map((slot) => ({
        ...slot,
        definition: getAgentDefinition(slot.agentType),
      })),
      maxSlots,
      activeCount,
      isAtCap: activeCount >= maxSlots,
      plan: (tenant?.subscriptionPlan || "basic").toLowerCase(),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createAgentSlotAction(agentType: string) {
  try {
    const access = await requireAgentAccess({ roles: AGENT_MANAGER_ROLES });
    const normalized = normalizeAgentType(agentType || "CHAT_BOT");
    if (!normalized || normalized === "SENTINEL") {
      return { success: false, error: "نوع الوكيل غير مدعوم لهذا المستأجر." };
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const tenant = await tx.tenant.findUnique({
          where: { id: access.tenantId },
          select: { subscriptionPlan: true },
        });
        if (!tenant) throw new Error("Tenant not found.");

        const activeCount = await tx.agentSlot.count({
          where: { tenantId: access.tenantId, isActive: true },
        });
        const maxSlots = planLimit(tenant.subscriptionPlan);
        if (activeCount >= maxSlots) {
          throw new Error(
            `CAP_LOCK:${maxSlots}:${tenant.subscriptionPlan || "basic"}`,
          );
        }

        const maximum = await tx.agentSlot.aggregate({
          where: { tenantId: access.tenantId },
          _max: { slotNumber: true },
        });
        const slotNumber = Number(maximum._max.slotNumber || 0) + 1;

        const slot = await tx.agentSlot.create({
          data: {
            tenantId: access.tenantId,
            slotNumber,
            agentType: normalized,
            isActive: true,
          },
        });

        const resetAt = new Date();
        resetAt.setMonth(resetAt.getMonth() + 1);
        await tx.usageMeter.create({
          data: {
            tenantId: access.tenantId,
            agentSlotId: slot.id,
            metricType: "MESSAGES",
            limitValue:
              tenant.subscriptionPlan?.toLowerCase() === "basic"
                ? 500
                : tenant.subscriptionPlan?.toLowerCase() === "silver"
                  ? 2_000
                  : 99_999,
            usageValue: 0,
            resetAt,
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId: access.tenantId,
            userId: access.userId,
            action: "AGENT_SLOT_CREATED",
            tableName: "agent_slots",
            recordId: slot.id,
            details: JSON.stringify({ agentType: normalized, slotNumber }),
          },
        });

        return slot;
      },
      { isolationLevel: "Serializable" },
    );

    revalidatePath("/operations/settings");
    revalidatePath("/operations/agents");
    return { success: true, slot: result };
  } catch (error: any) {
    if (String(error.message || "").startsWith("CAP_LOCK:")) {
      const [, limit, plan] = String(error.message).split(":");
      return {
        success: false,
        capLock: true,
        error: `تم الوصول إلى الحد الأقصى (${limit}) لباقة ${plan}.`,
      };
    }
    return { success: false, error: error.message };
  }
}

export async function deactivateAgentSlotAction(slotId: string) {
  try {
    const access = await requireAgentAccess({ roles: AGENT_MANAGER_ROLES });
    const result = await prisma.agentSlot.updateMany({
      where: { id: slotId, tenantId: access.tenantId },
      data: { isActive: false },
    });
    if (result.count !== 1) {
      return { success: false, error: "مقعد الوكيل غير موجود." };
    }

    await prisma.auditLog.create({
      data: {
        tenantId: access.tenantId,
        userId: access.userId,
        action: "AGENT_SLOT_DEACTIVATED",
        tableName: "agent_slots",
        recordId: slotId,
      },
    });

    revalidatePath("/operations/agents");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getNextAvailableAgentAction() {
  try {
    const access = await requireAgentAccess({ roles: AGENT_READ_ROLES });
    const result = await prisma.$queryRaw<
      Array<{ get_next_available_agent: string }>
    >`
      SELECT get_next_available_agent(${access.tenantId}::uuid)
        AS get_next_available_agent
    `;

    const agentId = result[0]?.get_next_available_agent ?? null;
    if (!agentId) {
      return { success: false, error: "لا يوجد موظفون متاحون حالياً." };
    }

    const agent = await prisma.user.findFirst({
      where: {
        id: agentId,
        tenantId: access.tenantId,
        isActive: true,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return agent
      ? { success: true, agent }
      : { success: false, error: "الموظف غير متاح." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUsageMetersAction() {
  try {
    const access = await requireAgentAccess({ roles: AGENT_READ_ROLES });
    const meters = await prisma.usageMeter.findMany({
      where: { tenantId: access.tenantId },
      include: { agentSlot: true },
    });
    return { success: true, meters };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function incrementUsageMeterAction(
  agentSlotId: string,
  amount = 1,
) {
  try {
    const access = await requireAgentAccess({ roles: AGENT_MANAGER_ROLES });
    if (!Number.isInteger(amount) || amount <= 0 || amount > 1_000) {
      return { success: false, error: "قيمة الاستخدام غير صالحة." };
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const meter = await tx.usageMeter.findFirst({
          where: {
            agentSlotId,
            tenantId: access.tenantId,
          },
        });
        if (!meter) return { kind: "missing" as const };
        if (meter.usageValue + amount > meter.limitValue) {
          return {
            kind: "limit" as const,
            limitValue: meter.limitValue,
            metricType: meter.metricType,
          };
        }

        await tx.usageMeter.update({
          where: { id: meter.id },
          data: { usageValue: { increment: amount } },
        });
        return { kind: "ok" as const };
      },
      { isolationLevel: "Serializable" },
    );

    if (result.kind === "missing") {
      return { success: false, error: "مقياس الاستخدام غير موجود." };
    }
    if (result.kind === "limit") {
      return {
        success: false,
        limitExceeded: true,
        error: `تم استنفاد الحد (${result.limitValue} ${result.metricType}).`,
      };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAgentStatusAction(agentType: string) {
  try {
    const access = await requireAgentAccess({ roles: AGENT_READ_ROLES });
    const normalized = normalizeAgentType(agentType);
    if (!normalized) return { success: false, error: "نوع وكيل غير صالح." };

    const slot = await prisma.agentSlot.findFirst({
      where: { tenantId: access.tenantId, agentType: normalized },
    });
    return {
      success: true,
      isActive: slot?.isActive || false,
      definition: getAgentDefinition(normalized),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleAgentStatusAction(
  agentType: string,
  newStatus: boolean,
) {
  try {
    const access = await requireAgentAccess({ roles: AGENT_MANAGER_ROLES });
    const normalized = normalizeAgentType(agentType);
    if (!normalized || normalized === "SENTINEL") {
      return { success: false, error: "نوع وكيل غير صالح." };
    }

    const slot = await prisma.agentSlot.findFirst({
      where: { tenantId: access.tenantId, agentType: normalized },
    });

    if (!slot && newStatus) {
      return createAgentSlotAction(normalized);
    }
    if (!slot) return { success: true, isActive: false };

    if (newStatus && !slot.isActive) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: access.tenantId },
        select: { subscriptionPlan: true },
      });
      const activeCount = await prisma.agentSlot.count({
        where: { tenantId: access.tenantId, isActive: true },
      });
      const maxSlots = planLimit(tenant?.subscriptionPlan);
      if (activeCount >= maxSlots) {
        return {
          success: false,
          capLock: true,
          error: `تم الوصول إلى الحد الأقصى (${maxSlots}) للمقاعد النشطة.`,
        };
      }
    }

    const updated = await prisma.agentSlot.update({
      where: { id: slot.id },
      data: { isActive: newStatus },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: access.tenantId,
        userId: access.userId,
        action: newStatus ? "AGENT_ACTIVATED" : "AGENT_DEACTIVATED",
        tableName: "agent_slots",
        recordId: slot.id,
        details: JSON.stringify({ agentType: normalized }),
      },
    });

    revalidatePath("/operations");
    revalidatePath("/operations/agents");
    return { success: true, isActive: updated.isActive };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
