import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runWithTenantContext } from "@/lib/tenant-context";
import {
  AGENT_READ_ROLES,
  agentErrorResponse,
  requireAgentAccess,
} from "@/lib/agents/access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const access = await requireAgentAccess({ roles: AGENT_READ_ROLES });
    const { id } = await params;

    return runWithTenantContext(
      { tenantId: access.tenantId, userId: access.userId },
      async () => {
        const slot = await prisma.agentSlot.findFirst({
          where: { id, tenantId: access.tenantId },
          select: { id: true, agentType: true },
        });
        if (!slot) {
          return NextResponse.json(
            {
              success: false,
              code: "AGENT_NOT_FOUND",
              error: "Agent not found.",
            },
            { status: 404 },
          );
        }

        const logs = await prisma.agentTelemetryLog.findMany({
          where: {
            tenantId: access.tenantId,
            agentId: { in: [slot.id, slot.agentType] },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        });

        return NextResponse.json({
          success: true,
          agentId: id,
          data: logs,
        });
      },
    );
  } catch (error) {
    const result = agentErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
