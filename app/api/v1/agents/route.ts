import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AGENT_READ_ROLES,
  agentErrorResponse,
  requireAgentAccess,
} from "@/lib/agents/access";
import { getAgentDefinition } from "@/lib/agents/registry";

export async function GET() {
  try {
    const access = await requireAgentAccess({ roles: AGENT_READ_ROLES });
    const agents = await prisma.agentSlot.findMany({
      where: { tenantId: access.tenantId },
      include: { usageMeter: true },
      orderBy: { slotNumber: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: agents.map((agent) => ({
        ...agent,
        definition: getAgentDefinition(agent.agentType),
      })),
    });
  } catch (error) {
    const result = agentErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
