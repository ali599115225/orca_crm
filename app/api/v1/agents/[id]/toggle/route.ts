import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AGENT_MANAGER_ROLES,
  agentErrorResponse,
  requireAgentAccess,
} from "@/lib/agents/access";
import { getAgentDefinition } from "@/lib/agents/registry";
import { writeAuditLog } from "@/lib/audit";

const PLAN_SLOT_LIMITS: Record<string, number> = {
  basic: 1,
  silver: 5,
  gold: 999_999,
  platinum: 999_999,
  professional: 999_999,
  diamond: 999_999,
};

async function handle(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const access = await requireAgentAccess({ roles: AGENT_MANAGER_ROLES });
    const { id } = await params;
    const body = await request.json();
    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          code: "AGENT_STATUS_REQUIRED",
          error: "isActive must be boolean.",
        },
        { status: 400 },
      );
    }

    const slot = await prisma.agentSlot.findFirst({
      where: { id, tenantId: access.tenantId },
    });
    if (!slot) {
      return NextResponse.json(
        { success: false, code: "AGENT_NOT_FOUND", error: "Agent not found." },
        { status: 404 },
      );
    }
    if (!getAgentDefinition(slot.agentType)) {
      return NextResponse.json(
        {
          success: false,
          code: "AGENT_TYPE_UNREGISTERED",
          error: "Agent type is not registered.",
        },
        { status: 409 },
      );
    }

    if (body.isActive && !slot.isActive) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: access.tenantId },
        select: { subscriptionPlan: true },
      });
      const activeCount = await prisma.agentSlot.count({
        where: { tenantId: access.tenantId, isActive: true },
      });
      const plan = (tenant?.subscriptionPlan || "basic").toLowerCase();
      const limit = PLAN_SLOT_LIMITS[plan] ?? 1;
      if (activeCount >= limit) {
        return NextResponse.json(
          {
            success: false,
            code: "AGENT_CAP_LOCK",
            error: `Active agent limit reached (${limit}).`,
          },
          { status: 409 },
        );
      }
    }

    const result = await prisma.agentSlot.updateMany({
      where: { id, tenantId: access.tenantId },
      data: { isActive: body.isActive },
    });
    if (result.count !== 1) {
      return NextResponse.json(
        { success: false, code: "AGENT_UPDATE_RACE", error: "Agent changed." },
        { status: 409 },
      );
    }

    await writeAuditLog({
      tenantId: access.tenantId,
      userId: access.userId,
      action: body.isActive ? "AGENT_ACTIVATED" : "AGENT_DEACTIVATED",
      tableName: "agent_slots",
      recordId: id,
      details: JSON.stringify({ agentType: slot.agentType }),
    });

    return NextResponse.json({
      success: true,
      agentId: id,
      isActive: body.isActive,
    });
  } catch (error) {
    const result = agentErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}

export const POST = handle;
export const PATCH = handle;
