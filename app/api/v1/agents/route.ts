import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AGENT_READ_ROLES,
  agentErrorResponse,
  requireAgentAccess,
} from "@/lib/agents/access";
import { getAgentDefinition } from "@/lib/agents/registry";
import { runWithTenantContext } from "@/lib/tenant-context";

type RuntimeStatus =
  | "ACTIVE"
  | "STOPPED"
  | "RUNNING"
  | "ATTENTION"
  | "FAILED";

function deriveRuntimeStatus(params: {
  isActive: boolean;
  actionType?: string;
  severity?: string;
  createdAt?: Date;
}): RuntimeStatus {
  if (!params.isActive) return "STOPPED";

  const action = String(params.actionType || "").toUpperCase();
  const severity = String(params.severity || "").toUpperCase();
  const createdAt = params.createdAt?.getTime() || 0;
  const isRecent = createdAt > Date.now() - 10 * 60 * 1000;

  if (action.includes("STARTED") && isRecent) return "RUNNING";
  if (action.includes("FAILED") || severity === "CRITICAL") return "FAILED";
  if (severity === "WARNING" || action.includes("BLOCKED")) return "ATTENTION";
  return "ACTIVE";
}

export async function GET() {
  try {
    const access = await requireAgentAccess({ roles: AGENT_READ_ROLES });

    const payload = await runWithTenantContext(
      { tenantId: access.tenantId, userId: access.userId },
      async () => {
        const slots = await prisma.agentSlot.findMany({
          where: { tenantId: access.tenantId },
          include: { usageMeter: true },
          orderBy: { slotNumber: "asc" },
        });

        const identifiers = slots.flatMap((slot) => [slot.id, slot.agentType]);
        const logs = identifiers.length
          ? await prisma.agentTelemetryLog.findMany({
              where: {
                tenantId: access.tenantId,
                agentId: { in: identifiers },
              },
              orderBy: { createdAt: "desc" },
              take: 500,
            })
          : [];

        return slots.map((slot) => {
          const latest = logs.find(
            (entry) =>
              entry.agentId === slot.id || entry.agentId === slot.agentType,
          );
          const definition = getAgentDefinition(slot.agentType);

          return {
            id: slot.id,
            agentType: slot.agentType,
            slotNumber: slot.slotNumber,
            isActive: slot.isActive,
            createdAt: slot.createdAt,
            usageMeter: slot.usageMeter
              ? {
                  metricType: slot.usageMeter.metricType,
                  recordedLimitValue: slot.usageMeter.limitValue,
                  limitValue: null,
                  commercialLimitApplied: false,
                  usageValue: slot.usageMeter.usageValue,
                  resetAt: slot.usageMeter.resetAt,
                }
              : null,
            definition,
            runtimeStatus: deriveRuntimeStatus({
              isActive: slot.isActive,
              actionType: latest?.actionType,
              severity: latest?.severity,
              createdAt: latest?.createdAt,
            }),
            lastActivityAt: latest?.createdAt || null,
            lastSeverity: latest?.severity || null,
            supportsManualRun: definition?.manualRun !== "NONE",
          };
        });
      },
    );

    return NextResponse.json({
      success: true,
      data: payload,
      commercialLimitApplied: false,
      permissions: {
        canManage: ["ADMIN", "SALES_MANAGER"].includes(access.role),
      },
      provider: {
        configured: Boolean(
          process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
        ),
      },
    });
  } catch (error) {
    const result = agentErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
