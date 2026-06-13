// app/api/admin/command-center/route.ts
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

async function authenticatePlatformOwner() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) return null;
  const payload = await decrypt(sessionToken);
  if (!payload?.email) return null;
  const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!superAdminEmails.includes(String(payload.email).toLowerCase())) return null;
  return payload;
}

async function authenticateUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) return null;
  const payload = await decrypt(sessionToken);
  if (!payload?.userId || !payload?.tenantId) return null;
  return payload;
}

export async function GET() {
  const session = await authenticatePlatformOwner();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized — platform owner only" }, { status: 401 });
  }

  const [config, openTasks, pendingApprovals, auditEvents, incidents, chatMessages] = await Promise.all([
    getOrCreateSentinelConfig(),
    getOpenTasks(),
    getPendingApprovals(),
    getRecentAuditEvents(20),
    getOpenIncidents(),
    getChatMessages(30),
  ]);

  const stripExecutionPayload = (tasks: any[]) => tasks.map(({ executionPayload: _, ...rest }: any) => rest);

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
  const body = await request.json();
  const { action } = body;

  // Platform owner actions
  if (["change-mode", "delegation-level", "fallback-plan", "deep-repair-wait", "chat-send"].includes(action)) {
    const session = await authenticatePlatformOwner();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized — platform owner only" }, { status: 401 });
    }

    if (action === "change-mode" && body.mode) {
      const updated = await updateOperatingMode(body.mode);
      return NextResponse.json({ success: true, mode: updated.operatingMode });
    }
    if (action === "delegation-level" && body.level) {
      const updated = await updateDelegationLevel(body.level);
      return NextResponse.json({ success: true, delegationLevel: updated.delegationLevel });
    }
    if (action === "fallback-plan") {
      const updated = await updateFallbackPlan(body.active === true);
      return NextResponse.json({ success: true, fallbackPlanActive: updated.fallbackPlanActive });
    }
    if (action === "deep-repair-wait" && body.minutes) {
      const updated = await updateDeepRepairWait(Number(body.minutes));
      return NextResponse.json({ success: true, deepRepairWaitMinutes: updated.deepRepairWaitMinutes });
    }
    if (action === "chat-send" && body.message) {
      const msg = await sendOwnerChatMessage(String(body.message));
      return NextResponse.json({ success: true, message: msg });
    }
  }

  // Tenant admin actions — approve/reject SAHER proposals
  if (action === "approve-task" && body.taskId) {
    const session = await authenticateUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = session.tenantId as string;
    const userId = session.userId as string;

    const taskOrder = await prisma.sentinelTaskOrder.findFirst({
      where: { id: body.taskId as string, tenantId },
    });
    if (!taskOrder) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 403 });
    }
    if (taskOrder.status !== "WAITING_APPROVAL" && taskOrder.status !== "OPEN") {
      return NextResponse.json({ error: `Task already ${taskOrder.status}` }, { status: 409 });
    }

    const result = await executeApprovedSaherAction(body.taskId as string, userId);

    if (result.success) {
      await writeAuditLog({
        tenantId,
        userId,
        action: "SAHER_APPROVAL_APPROVED",
        tableName: "sentinel_task_orders",
        recordId: body.taskId as string,
        details: `Approved by user ${userId}`,
      });
      return NextResponse.json({ success: true, leadId: result.leadId });
    }
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  if (action === "reject-task" && body.taskId) {
    const session = await authenticateUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = session.tenantId as string;
    const userId = session.userId as string;

    const taskOrder = await prisma.sentinelTaskOrder.findFirst({
      where: { id: body.taskId as string, tenantId },
    });
    if (!taskOrder) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 403 });
    }

    await prisma.sentinelTaskOrder.update({
      where: { id: body.taskId as string },
      data: { status: "CANCELLED" },
    });

    await writeAuditLog({
      tenantId,
      userId,
      action: "SAHER_APPROVAL_REJECTED",
      tableName: "sentinel_task_orders",
      recordId: body.taskId as string,
      details: `Rejected by user ${userId}`,
    });

    return NextResponse.json({ success: true, status: "CANCELLED" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
