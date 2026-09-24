import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runWithTenantContext } from "@/lib/tenant-context";
import {
  AGENT_READ_ROLES,
  agentErrorResponse,
  requireAgentAccess,
} from "@/lib/agents/access";

function safeLogMessage(value: string, actionType: string): string {
  const raw = String(value || "").trim();

  if (actionType === "AI_USAGE") {
    try {
      const parsed = JSON.parse(raw) as {
        source?: string;
        outcome?: string;
        totalTokens?: number;
      };
      const source =
        parsed.source === "SAFE_FALLBACK" ? "المسار الآمن" : "مزود الذكاء الاصطناعي";
      const outcome =
        parsed.outcome === "SUCCESS"
          ? "نجاح"
          : parsed.outcome === "FAILED"
            ? "فشل"
            : "بديل آمن";
      return `تم تسجيل استخدام ${source}. النتيجة: ${outcome}.`;
    } catch {
      return "تم تسجيل حدث استخدام لمزود الذكاء الاصطناعي.";
    }
  }

  return raw
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      "[معرّف محمي]",
    )
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[بريد محمي]")
    .replace(/(api[_-]?key|secret|token)\s*[:=]\s*[^\s,;]+/gi, "$1=[محمي]")
    .slice(0, 500);
}

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
          select: {
            actionType: true,
            logMessageAr: true,
            severity: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        });

        return NextResponse.json({
          success: true,
          data: logs.map((log, index) => ({
            eventKey: `${log.createdAt.toISOString()}-${log.actionType}-${index}`,
            actionType: log.actionType,
            messageAr: safeLogMessage(log.logMessageAr, log.actionType),
            severity: log.severity,
            createdAt: log.createdAt,
          })),
        });
      },
    );
  } catch (error) {
    const result = agentErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
