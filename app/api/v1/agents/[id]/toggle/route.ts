import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AGENT_MANAGER_ROLES,
  agentErrorResponse,
  requireAgentAccess,
} from "@/lib/agents/access";
import { getAgentDefinition } from "@/lib/agents/registry";
import {
  canActivateAgent,
  getPlanAgentEntitlement,
  isKnownAgentCode,
} from "@/lib/agents/entitlements";
import { writeAuditLog } from "@/lib/audit";
import { getDeploymentLicenseMode } from "@/lib/deployment-license";


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
      const agentCode = String(slot.agentType || "").trim().toUpperCase();

      if (!isKnownAgentCode(agentCode)) {
        return NextResponse.json(
          {
            success: false,
            code: "AGENT_TYPE_UNREGISTERED",
            error: "Agent type is not registered.",
          },
          { status: 409 },
        );
      }

      const [tenant, activeCount, activeLeases] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: access.tenantId },
          select: { subscriptionPlan: true },
        }),
        prisma.agentSlot.count({
          where: { tenantId: access.tenantId, isActive: true },
        }),
        prisma.agentLease.findMany({
          where: {
            tenantId: access.tenantId,
            endDate: { gt: new Date() },
          },
          select: { agentId: true },
        }),
      ]);

      const plan = tenant?.subscriptionPlan || "basic";
      const licenseMode = getDeploymentLicenseMode();
      const entitlement = getPlanAgentEntitlement(plan);
      const activeSubscriptionCodes = new Set(
        activeLeases
          .map((lease) => String(lease.agentId || "").trim().toUpperCase())
          .filter(isKnownAgentCode)
          .filter((code) => !entitlement.includedAgents.includes(code)),
      );

      const decision = canActivateAgent({
        licenseMode,
        plan,
        agentCode,
        activeAgentCount: activeCount,
        activeSubscriptionCount: activeSubscriptionCodes.size,
        hasActiveSubscription: activeLeases.some(
          (lease) =>
            String(lease.agentId || "").trim().toUpperCase() === agentCode,
        ),
      });

      if (!decision.allowed) {
        return NextResponse.json(
          {
            success: false,
            code:
              decision.reason === "AGENT_NOT_ENTITLED"
                ? "AGENT_NOT_ENTITLED"
                : "AGENT_CAP_LOCK",
            error:
              decision.reason === "AGENT_NOT_ENTITLED"
                ? "Agent is not included in the plan and has no active subscription."
                : `Active agent limit reached (${decision.effectiveLimit}).`,
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
