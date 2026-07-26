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

const OPERATIONAL_MESSAGE_LIMIT = 99_999;

export async function getAgentSlotsAction() {
  try {
    const access = await requireAgentAccess({ roles: AGENT_READ_ROLES });
    const slots = await prisma.agentSlot.findMany({
      where: { tenantId: access.tenantId },
      include: { usageMeter: true },
      orderBy: { slotNumber: "asc" },
    });

    const activeCount = slots.filter((slot) => slot.isActive).length;

    return {
      success: true,
      slots: slots.map((slot) => ({
        ...slot,
        definition: getAgentDefinition(slot.agentType),
      })),
      activeCount,
      maxSlots: null,
      isAtCap: false,
      plan: null,
      commercialLimitApplied: false,
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
      return { success: false, error: "نوع الوكيل غير مدعوم لهذه الشركة." };
    }

    const result = await prisma.$transaction(
      async (tx) => {
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
            limitValue: OPERATIONAL_MESSAGE_LIMIT,
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
            details: JSON.stringify({
              agentType: normalized,
              slotNumber,
              commercialPlanLimitApplied: false,
            }),
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
        error: `تم استنفاد الحد التشغيلي (${result.limitValue} ${result.metricType}).`,
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
        details: JSON.stringify({
          agentType: normalized,
          commercialPlanLimitApplied: false,
        }),
      },
    });

    revalidatePath("/operations");
    revalidatePath("/operations/agents");
    return { success: true, isActive: updated.isActive };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
