import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runWithTenantContext } from "@/lib/tenant-context";
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

async function writeRuntimeLog(params: {
  tenantId: string;
  agentId: string;
  actionType: string;
  message: string;
  severity: "Info" | "Warning" | "Critical";
}) {
  await prisma.agentTelemetryLog.create({
    data: {
      tenantId: params.tenantId,
      agentId: params.agentId,
      actionType: params.actionType,
      logMessageAr: params.message,
      severity: params.severity,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const access = await requireAgentAccess({ roles: AGENT_MANAGER_ROLES });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    return runWithTenantContext(
      { tenantId: access.tenantId, userId: access.userId },
      async () => {
        const slot = await prisma.agentSlot.findFirst({
          where: { id, tenantId: access.tenantId },
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
          await writeRuntimeLog({
            tenantId: access.tenantId,
            agentId: slot.id,
            actionType: "MANUAL_RUN_BLOCKED",
            message: "تم منع التشغيل المباشر بواسطة سياسة التشغيل الحالية.",
            severity: "Warning",
          });
          return NextResponse.json(
            {
              success: false,
              code: "AGENT_RUNTIME_BLOCKED",
              error: "Agent runtime is blocked.",
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
          await writeRuntimeLog({
            tenantId: access.tenantId,
            agentId: slot.id,
            actionType: "MANUAL_RUN_UNAVAILABLE",
            message: "هذا الوكيل يعمل تلقائيًا ولا يدعم التشغيل اليدوي المباشر.",
            severity: "Info",
          });
          return NextResponse.json({
            success: true,
            executed: false,
            message: "Automatic agent; direct manual execution is unavailable.",
          });
        }

        await writeRuntimeLog({
          tenantId: access.tenantId,
          agentId: slot.id,
          actionType: "MANUAL_RUN_STARTED",
          message: "بدأ التشغيل اليدوي للوكيل.",
          severity: "Info",
        });

        try {
          const result = await runSaherTelemetryScanAction();
          if (!result.success) {
            await writeRuntimeLog({
              tenantId: access.tenantId,
              agentId: slot.id,
              actionType: "MANUAL_RUN_FAILED",
              message: "فشل آخر تشغيل للوكيل. راجع إعدادات التشغيل وحالة الخدمات.",
              severity: "Critical",
            });
            return NextResponse.json(
              {
                success: false,
                code: "AGENT_RUN_FAILED",
                error: "Agent run failed.",
              },
              { status: 502 },
            );
          }

          await writeRuntimeLog({
            tenantId: access.tenantId,
            agentId: slot.id,
            actionType: "MANUAL_RUN_SUCCEEDED",
            message: "اكتمل تشغيل الوكيل بنجاح.",
            severity: "Info",
          });

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
            summary: {
              status: "COMPLETED",
              issueCount: Array.isArray((result.report as { issues?: unknown[] })?.issues)
                ? (result.report as { issues: unknown[] }).issues.length
                : 0,
            },
          });
        } catch {
          await writeRuntimeLog({
            tenantId: access.tenantId,
            agentId: slot.id,
            actionType: "MANUAL_RUN_FAILED",
            message: "فشل آخر تشغيل للوكيل بسبب تعذر إكمال العملية.",
            severity: "Critical",
          });
          return NextResponse.json(
            {
              success: false,
              code: "AGENT_RUN_FAILED",
              error: "Agent run failed.",
            },
            { status: 502 },
          );
        }
      },
    );
  } catch (error) {
    const result = agentErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
