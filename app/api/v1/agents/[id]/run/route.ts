import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AGENT_MANAGER_ROLES,
  agentErrorResponse,
  requireAgentAccess,
} from "@/lib/agents/access";
import { getAgentDefinition } from "@/lib/agents/registry";
import { claimAgentIdempotency } from "@/lib/agents/quota";
import { assertAgentCanRun } from "@/lib/agents/guard";
import { runSaherTelemetryScanAction } from "@/app/actions/saherAgent";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const access = await requireAgentAccess({ roles: AGENT_MANAGER_ROLES });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const slot = await prisma.agentSlot.findFirst({
      where: { id, tenantId: access.tenantId },
    });
    if (!slot) {
      return NextResponse.json(
        { success: false, code: "AGENT_NOT_FOUND", error: "Agent not found." },
        { status: 404 },
      );
    }
    if (!slot.isActive) {
      return NextResponse.json(
        {
          success: false,
          code: "AGENT_DISABLED",
          error: "Agent is disabled.",
        },
        { status: 409 },
      );
    }

    const definition = getAgentDefinition(slot.agentType);
    if (!definition) {
      return NextResponse.json(
        {
          success: false,
          code: "AGENT_TYPE_UNREGISTERED",
          error: "Agent type is not registered.",
        },
        { status: 409 },
      );
    }

    const runtime = await assertAgentCanRun({
      tenantId: access.tenantId,
      userId: access.userId,
      agentName: slot.agentType,
      actionType: "EXECUTION",
    });
    if (!runtime.allowed) {
      return NextResponse.json(
        {
          success: false,
          code: "AGENT_RUNTIME_BLOCKED",
          error: runtime.reason || "Agent runtime is blocked.",
        },
        { status: 409 },
      );
    }

    const requestedKey =
      request.headers.get("Idempotency-Key") ||
      String(body.idempotencyKey || "") ||
      `${access.userId}:${id}:${Math.floor(Date.now() / 60_000)}`;
    const claimed = await claimAgentIdempotency(
      access.tenantId,
      `manual-run:${id}`,
      requestedKey,
    );
    if (!claimed) {
      return NextResponse.json(
        {
          success: false,
          code: "AGENT_DUPLICATE_RUN",
          error: "Duplicate agent run was blocked.",
        },
        { status: 409 },
      );
    }

    if (definition.manualRun !== "SAHER_TELEMETRY") {
      await prisma.agentTelemetryLog.create({
        data: {
          tenantId: access.tenantId,
          agentId: slot.agentType,
          actionType: "MANUAL_RUN_SKIPPED",
          logMessageAr: "الوكيل يعمل تلقائياً ولا يدعم التنفيذ اليدوي المباشر.",
          severity: "Info",
        },
      });
      return NextResponse.json({
        success: true,
        executed: false,
        agentId: id,
        agentType: slot.agentType,
        message:
          "Agent is automatic and does not support direct manual execution.",
      });
    }

    const result = await runSaherTelemetryScanAction();
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          code: "AGENT_RUN_FAILED",
          error: result.error || "Agent run failed.",
        },
        { status: 500 },
      );
    }

    await writeAuditLog({
      tenantId: access.tenantId,
      userId: access.userId,
      action: "AGENT_MANUAL_RUN",
      tableName: "agent_slots",
      recordId: slot.id,
      details: JSON.stringify({ agentType: slot.agentType }),
    });

    return NextResponse.json({
      success: true,
      executed: true,
      agentId: id,
      agentType: slot.agentType,
      report: result.report,
    });
  } catch (error) {
    const result = agentErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
