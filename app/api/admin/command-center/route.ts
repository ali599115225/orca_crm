import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import {
  getOrCreateSentinelConfig,
  updateOperatingMode,
  updateDelegationLevel,
  updateFallbackPlan,
  updateDeepRepairWait,
  getOpenTasks,
  getPendingApprovals,
  getRecentAuditEvents,
  getOpenIncidents,
  getChatMessages,
  sendOwnerChatMessage,
} from "@/lib/sentinel/task-order";
import { executeApprovedSaherAction } from "@/app/actions/saherAgent";
import {
  AGENT_MANAGER_ROLES,
  agentErrorResponse,
  requireAgentAccess,
} from "@/lib/agents/access";

const OPERATING_MODES = new Set([
  "NORMAL_MODE",
  "VACATION_MODE",
  "EMERGENCY_MODE",
  "APPROVAL_MODE",
]);

const DELEGATION_LEVELS = new Set([
  "MONITORING_ONLY",
  "MAINTENANCE_MONITORING",
  "SIMPLE_REPAIRS",
  "CONDITIONAL_DEEP_REPAIR",
]);

async function authenticatePlatformOwner() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) return null;

  const payload = await decrypt(sessionToken);
  if (!payload?.email) return null;

  const allowed = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(String(payload.email).toLowerCase())
    ? payload
    : null;
}

function stripExecutionPayload(tasks: any[]) {
  return tasks.map(({ executionPayload: _hidden, ...rest }: any) => rest);
}

export async function GET() {
  const session = await authenticatePlatformOwner();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized — platform owner only" },
      { status: 401 },
    );
  }

  const [
    config,
    openTasks,
    pendingApprovals,
    auditEvents,
    incidents,
    chatMessages,
  ] = await Promise.all([
    getOrCreateSentinelConfig(),
    getOpenTasks(),
    getPendingApprovals(),
    getRecentAuditEvents(20),
    getOpenIncidents(),
    getChatMessages(30),
  ]);

  return NextResponse.json({
    status: config.operatingMode,
    isActive: config.isActive,
    delegationLevel: config.delegationLevel,
    fallbackPlanActive: config.fallbackPlanActive,
    deepRepairWaitMinutes: config.deepRepairWaitMinutes,
    openTasks: openTasks.length,
    pendingApprovals: pendingApprovals.length,
    openIncidents: incidents.length,
    data: {
      config,
      openTasks: stripExecutionPayload(openTasks),
      pendingApprovals: stripExecutionPayload(pendingApprovals),
      auditEvents,
      incidents: stripExecutionPayload(incidents),
      chatMessages,
    },
  });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const action = String(body.action || "");

  if (
    [
      "change-mode",
      "delegation-level",
      "fallback-plan",
      "deep-repair-wait",
      "chat-send",
    ].includes(action)
  ) {
    const session = await authenticatePlatformOwner();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — platform owner only" },
        { status: 401 },
      );
    }

    if (action === "change-mode") {
      const mode = String(body.mode || "");
      if (!OPERATING_MODES.has(mode)) {
        return NextResponse.json(
          { success: false, error: "Invalid operating mode." },
          { status: 400 },
        );
      }
      const updated = await updateOperatingMode(mode);
      return NextResponse.json({
        success: true,
        mode: updated.operatingMode,
      });
    }

    if (action === "delegation-level") {
      const level = String(body.level || "");
      if (!DELEGATION_LEVELS.has(level)) {
        return NextResponse.json(
          { success: false, error: "Invalid delegation level." },
          { status: 400 },
        );
      }
      const updated = await updateDelegationLevel(level);
      return NextResponse.json({
        success: true,
        delegationLevel: updated.delegationLevel,
      });
    }

    if (action === "fallback-plan") {
      const updated = await updateFallbackPlan(body.active === true);
      return NextResponse.json({
        success: true,
        fallbackPlanActive: updated.fallbackPlanActive,
      });
    }

    if (action === "deep-repair-wait") {
      const minutes = Number(body.minutes);
      if (![15, 30, 60, 180, 360].includes(minutes)) {
        return NextResponse.json(
          { success: false, error: "Invalid deep-repair wait time." },
          { status: 400 },
        );
      }
      const updated = await updateDeepRepairWait(minutes);
      return NextResponse.json({
        success: true,
        deepRepairWaitMinutes: updated.deepRepairWaitMinutes,
      });
    }

    if (action === "chat-send") {
      const message = String(body.message || "").trim();
      if (!message || message.length > 2_000) {
        return NextResponse.json(
          { success: false, error: "Invalid chat message." },
          { status: 400 },
        );
      }
      const result = await sendOwnerChatMessage(message);
      return NextResponse.json({ success: true, message: result });
    }
  }

  if (
    (action === "approve-task" || action === "reject-task") &&
    typeof body.taskId === "string"
  ) {
    try {
      const access = await requireAgentAccess({
        roles: AGENT_MANAGER_ROLES,
      });
      const taskId = body.taskId;

      const task = await prisma.sentinelTaskOrder.findFirst({
        where: {
          id: taskId,
          tenantId: access.tenantId,
          approvalRequired: true,
        },
      });
      if (!task) {
        return NextResponse.json(
          {
            success: false,
            error: "Task not found or access denied.",
          },
          { status: 404 },
        );
      }
      if (task.status !== "WAITING_APPROVAL") {
        return NextResponse.json(
          {
            success: false,
            error: `Task already ${task.status}.`,
          },
          { status: 409 },
        );
      }

      if (action === "approve-task") {
        const result = await executeApprovedSaherAction(
          task.id,
          access.userId,
        );
        return NextResponse.json(
          result.success
            ? { success: true, leadId: result.leadId || null }
            : { success: false, error: result.error || "Approval failed." },
          { status: result.success ? 200 : 400 },
        );
      }

      const rejected = await prisma.sentinelTaskOrder.updateMany({
        where: {
          id: task.id,
          tenantId: access.tenantId,
          status: "WAITING_APPROVAL",
        },
        data: {
          status: "CANCELLED",
          completedAt: new Date(),
        },
      });
      if (rejected.count !== 1) {
        return NextResponse.json(
          { success: false, error: "Task status changed." },
          { status: 409 },
        );
      }

      await writeAuditLog({
        tenantId: access.tenantId,
        userId: access.userId,
        action: "SAHER_APPROVAL_REJECTED",
        tableName: "sentinel_task_orders",
        recordId: task.id,
        details: "Rejected by an authorized tenant manager.",
      });

      return NextResponse.json({
        success: true,
        status: "CANCELLED",
      });
    } catch (error) {
      const result = agentErrorResponse(error);
      return NextResponse.json(result.body, { status: result.status });
    }
  }

  return NextResponse.json(
    { success: false, error: "Invalid action." },
    { status: 400 },
  );
}
