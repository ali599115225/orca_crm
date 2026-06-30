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
  getApprovalTTLMinutes,
  isTaskExpired,
} from "@/lib/sentinel/task-order";
import { executeApprovedSaherAction } from "@/app/actions/saherAgent";
import {
  AGENT_MANAGER_ROLES,
  agentErrorResponse,
  requireAgentAccess,
  requirePlatformOwnerAccess,
} from "@/lib/agents/access";
import { writeSentinelAudit } from "@/lib/sentinel/audit";
import {
  listActiveIncidents,
  createIncident,
  acknowledgeIncident,
  startIncidentWork,
  resolveIncident,
  markIncidentFalsePositive,
  assignIncident,
  escalateIncident,
} from "@/lib/sentinel/incident";
import {
  INCIDENT_SEVERITIES,
  INCIDENT_ESCALATION_LEVELS,
} from "@/lib/sentinel/types";

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

const SENSITIVE_INCIDENT_KEYS = new Set([
  "diagnosticMetadata",
]);

function sanitizeIncident(inc: Record<string, unknown>) {
  const allowed = { ...inc };
  for (const key of SENSITIVE_INCIDENT_KEYS) {
    delete allowed[key];
  }
  return allowed;
}

const ALLOWED_INCIDENT_ACTIONS = new Set([
  "incident-create",
  "incident-acknowledge",
  "incident-start",
  "incident-resolve",
  "incident-false-positive",
  "incident-assign",
  "incident-escalate",
]);

export async function GET() {
  const session = await authenticatePlatformOwner();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized — platform owner only" },
      { status: 401 },
    );
  }

  const email = String(session.email || "");

  writeSentinelAudit({
    eventType: "SENTINEL_COMMAND",
    decision: "Command center accessed",
    reason: "Platform owner dashboard view",
    source: "PLATFORM_OWNER",
    correlationId: `access-${Date.now()}`,
  }).catch(() => {});

  const [
    config,
    openTasks,
    pendingApprovals,
    auditEvents,
    taskIncidents,
    chatMessages,
    sentinelIncidents,
  ] = await Promise.all([
    getOrCreateSentinelConfig(),
    getOpenTasks(),
    getPendingApprovals(),
    getRecentAuditEvents(20),
    getOpenIncidents(),
    getChatMessages(30),
    listActiveIncidents(),
  ]);

  return NextResponse.json({
    status: config.operatingMode,
    isActive: config.isActive,
    delegationLevel: config.delegationLevel,
    fallbackPlanActive: config.fallbackPlanActive,
    deepRepairWaitMinutes: config.deepRepairWaitMinutes,
    openTasks: openTasks.length,
    pendingApprovals: pendingApprovals.length,
    openIncidents: taskIncidents.length,
    sentinelIncidentCount: sentinelIncidents.length,
    approvalTTLMinutes: getApprovalTTLMinutes(),
    data: {
      config,
      openTasks: stripExecutionPayload(openTasks),
      pendingApprovals: stripExecutionPayload(pendingApprovals),
      auditEvents,
      incidents: stripExecutionPayload(taskIncidents),
      sentinelIncidents: sentinelIncidents.map(sanitizeIncident),
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
      writeSentinelAudit({
        eventType: "SENTINEL_MODE_CHANGE",
        decision: `Operating mode set to ${mode}`,
        reason: `Platform owner action: ${String(session.email || "")}`,
        source: "PLATFORM_OWNER",
        beforeState: "previous",
        afterState: mode,
        correlationId: `mode-${Date.now()}`,
      }).catch(() => {});
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
      writeSentinelAudit({
        eventType: "SENTINEL_DELEGATION_CHANGED",
        decision: `Delegation level set to ${level}`,
        reason: `Platform owner action: ${String(session.email || "")}`,
        source: "PLATFORM_OWNER",
        beforeState: "previous",
        afterState: level,
        correlationId: `delegation-${Date.now()}`,
      }).catch(() => {});
      return NextResponse.json({
        success: true,
        delegationLevel: updated.delegationLevel,
      });
    }

    if (action === "fallback-plan") {
      const updated = await updateFallbackPlan(body.active === true);
      writeSentinelAudit({
        eventType: "SENTINEL_FALLBACK_TOGGLED",
        decision: `Fallback plan ${body.active === true ? "activated" : "deactivated"}`,
        reason: `Platform owner action: ${String(session.email || "")}`,
        source: "PLATFORM_OWNER",
        beforeState: "previous",
        afterState: String(body.active === true),
        correlationId: `fallback-${Date.now()}`,
      }).catch(() => {});
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
      writeSentinelAudit({
        eventType: "SENTINEL_COMMAND",
        decision: `Deep repair wait set to ${minutes} minutes`,
        reason: `Platform owner action: ${String(session.email || "")}`,
        source: "PLATFORM_OWNER",
        correlationId: `repair-wait-${Date.now()}`,
      }).catch(() => {});
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
      writeSentinelAudit({
        eventType: "SENTINEL_COMMAND",
        decision: "Chat message sent",
        reason: `Platform owner action: ${String(session.email || "")}`,
        source: "PLATFORM_OWNER",
        correlationId: `chat-${Date.now()}`,
      }).catch(() => {});
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

      if (isTaskExpired(task)) {
        const now = new Date();
        await prisma.sentinelTaskOrder.updateMany({
          where: {
            id: task.id,
            tenantId: access.tenantId,
            status: "WAITING_APPROVAL",
          },
          data: {
            status: "CANCELLED",
            completedAt: now,
            decidedAt: now,
            decisionReason: "Approval TTL expired",
          },
        });
        const requestId = `expired-${Date.now()}-${task.id.slice(0, 8)}`;
        await writeAuditLog({
          tenantId: access.tenantId,
          userId: access.userId,
          action: "SAHER_APPROVAL_EXPIRED",
          tableName: "sentinel_task_orders",
          recordId: task.id,
          details: JSON.stringify({
            requestId,
            actor: access.userId,
            taskId: task.id,
            previousState: "WAITING_APPROVAL",
            newState: "CANCELLED",
            reason: "Approval TTL expired",
            ttlMinutes: getApprovalTTLMinutes(),
            createdAt: task.createdAt.toISOString(),
          }),
        });
        return NextResponse.json(
          {
            success: false,
            error: "This approval request has expired.",
          },
          { status: 410 },
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

      const reason = String(body.reason || "").trim();
      if (!reason || reason.length > 1000) {
        return NextResponse.json(
          { success: false, error: "A rejection reason is required (1-1000 characters)." },
          { status: 400 },
        );
      }

      const requestId = `reject-${Date.now()}-${task.id.slice(0, 8)}`;

      const rejected = await prisma.sentinelTaskOrder.updateMany({
        where: {
          id: task.id,
          tenantId: access.tenantId,
          status: "WAITING_APPROVAL",
        },
        data: {
          status: "CANCELLED",
          completedAt: new Date(),
          decidedById: access.userId,
          decidedAt: new Date(),
          decisionReason: reason,
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
        details: JSON.stringify({
          requestId,
          actor: access.userId,
          taskId: task.id,
          previousState: "WAITING_APPROVAL",
          newState: "CANCELLED",
          reason,
          result: "rejected",
        }),
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

  if (ALLOWED_INCIDENT_ACTIONS.has(action)) {
    const session = await authenticatePlatformOwner();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — platform owner only" },
        { status: 401 },
      );
    }

    const requestId = String(body.requestId || `cmd-${Date.now()}`);
    const correlationId = requestId;

    const auditMeta = {
      source: "PLATFORM_OWNER" as const,
      correlationId,
    };

    if (action === "incident-create") {
      const title = String(body.title || "").trim();
      if (!title || title.length > 255) {
        return NextResponse.json(
          { success: false, error: "Title is required (max 255 characters)." },
          { status: 400 },
        );
      }
      const severity = String(body.severity || "MEDIUM");
      if (!INCIDENT_SEVERITIES.includes(severity as any)) {
        return NextResponse.json(
          { success: false, error: `Invalid severity. Must be one of: ${INCIDENT_SEVERITIES.join(", ")}.` },
          { status: 400 },
        );
      }
      let tenantId: string | null = null;
      if (body.tenantId !== undefined && body.tenantId !== null) {
        const raw = String(body.tenantId);
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
          return NextResponse.json(
            { success: false, error: "Invalid tenantId UUID." },
            { status: 400 },
          );
        }
        tenantId = raw;
      }
      const summary = String(body.summary || "").trim().slice(0, 2000) || null;
      const affectedService = String(body.affectedService || "").trim().slice(0, 100) || null;
      const correlationIdField = String(body.correlationId || "").trim().slice(0, 255) || null;
      const requestIdField = String(body.requestId || "").trim().slice(0, 80) || null;
      const fingerprint = String(body.fingerprint || "").trim().slice(0, 64) || null;

      const result = await createIncident({
        tenantId,
        title,
        summary: summary || undefined,
        severity: severity as any,
        affectedService: affectedService || undefined,
        correlationId: correlationIdField || undefined,
        requestId: requestIdField || undefined,
        fingerprint: fingerprint || undefined,
      });
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || "Failed to create incident." },
          { status: 400 },
        );
      }
      writeSentinelAudit({
        eventType: "SENTINEL_INCIDENT_OPENED",
        decision: `Incident created via command center: ${title}`,
        reason: `Platform owner action: ${String(session.email || "")}`,
        ...auditMeta,
      }).catch(() => {});
      return NextResponse.json({ success: true, incident: sanitizeIncident(result.incident as any) }, { status: 201 });
    }

    const incidentId = String(body.incidentId || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(incidentId)) {
      return NextResponse.json(
        { success: false, error: "Invalid incident ID UUID." },
        { status: 400 },
      );
    }

    if (action === "incident-acknowledge") {
      const result = await acknowledgeIncident(incidentId);
      if (!result.success) {
        const status = result.error === "Incident not found." ? 404 : 409;
        return NextResponse.json({ success: false, error: result.error }, { status });
      }
      writeSentinelAudit({
        eventType: "SENTINEL_INCIDENT_ACKNOWLEDGED",
        decision: `Incident acknowledged via command center`,
        reason: `Platform owner action: ${String(session.email || "")}`,
        ...auditMeta,
      }).catch(() => {});
      return NextResponse.json({ success: true, incident: sanitizeIncident(result.incident as any) });
    }

    if (action === "incident-start") {
      const result = await startIncidentWork(incidentId);
      if (!result.success) {
        const status = result.error === "Incident not found." ? 404 : 409;
        return NextResponse.json({ success: false, error: result.error }, { status });
      }
      writeSentinelAudit({
        eventType: "SENTINEL_INCIDENT_IN_PROGRESS",
        decision: `Incident work started via command center`,
        reason: `Platform owner action: ${String(session.email || "")}`,
        ...auditMeta,
      }).catch(() => {});
      return NextResponse.json({ success: true, incident: sanitizeIncident(result.incident as any) });
    }

    if (action === "incident-resolve") {
      const reason = String(body.reason || "").trim();
      if (!reason || reason.length > 1000) {
        return NextResponse.json(
          { success: false, error: "A resolution reason is required (1-1000 characters)." },
          { status: 400 },
        );
      }
      const result = await resolveIncident(incidentId);
      if (!result.success) {
        const status = result.error === "Incident not found." ? 404 : 409;
        return NextResponse.json({ success: false, error: result.error }, { status });
      }
      writeSentinelAudit({
        eventType: "SENTINEL_INCIDENT_CLOSED",
        decision: `Incident resolved via command center`,
        reason: `Platform owner action: ${String(session.email || "")}. Reason: ${reason}`,
        ...auditMeta,
      }).catch(() => {});
      return NextResponse.json({ success: true, incident: sanitizeIncident(result.incident as any) });
    }

    if (action === "incident-false-positive") {
      const reason = String(body.reason || "").trim();
      if (!reason || reason.length > 1000) {
        return NextResponse.json(
          { success: false, error: "A reason is required for false-positive (1-1000 characters)." },
          { status: 400 },
        );
      }
      const result = await markIncidentFalsePositive(incidentId);
      if (!result.success) {
        const status = result.error === "Incident not found." ? 404 : 409;
        return NextResponse.json({ success: false, error: result.error }, { status });
      }
      writeSentinelAudit({
        eventType: "SENTINEL_INCIDENT_CLOSED",
        decision: `Incident marked false-positive via command center`,
        reason: `Platform owner action: ${String(session.email || "")}. Reason: ${reason}`,
        ...auditMeta,
      }).catch(() => {});
      return NextResponse.json({ success: true, incident: sanitizeIncident(result.incident as any) });
    }

    if (action === "incident-assign") {
      const assignedToId = String(body.assignedToId || "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignedToId)) {
        return NextResponse.json(
          { success: false, error: "Invalid assignee UUID." },
          { status: 400 },
        );
      }
      const result = await assignIncident(incidentId, assignedToId);
      if (!result.success) {
        const status = result.error === "Incident not found." ? 404 : 409;
        return NextResponse.json({ success: false, error: result.error }, { status });
      }
      writeSentinelAudit({
        eventType: "SENTINEL_COMMAND",
        decision: `Incident assigned via command center`,
        reason: `Platform owner action: ${String(session.email || "")}`,
        ...auditMeta,
      }).catch(() => {});
      return NextResponse.json({ success: true, incident: sanitizeIncident(result.incident as any) });
    }

    if (action === "incident-escalate") {
      const newLevel = String(body.level || "");
      if (!INCIDENT_ESCALATION_LEVELS.includes(newLevel as any)) {
        return NextResponse.json(
          { success: false, error: `Invalid escalation level. Must be one of: ${INCIDENT_ESCALATION_LEVELS.join(", ")}.` },
          { status: 400 },
        );
      }
      const result = await escalateIncident(incidentId, newLevel as any);
      if (!result.success) {
        const status = result.error === "Incident not found." ? 404 : 409;
        return NextResponse.json({ success: false, error: result.error }, { status });
      }
      writeSentinelAudit({
        eventType: "SENTINEL_COMMAND",
        decision: `Incident escalated to ${newLevel} via command center`,
        reason: `Platform owner action: ${String(session.email || "")}`,
        ...auditMeta,
      }).catch(() => {});
      return NextResponse.json({ success: true, incident: sanitizeIncident(result.incident as any) });
    }
  }

  return NextResponse.json(
    { success: false, error: "Invalid action." },
    { status: 400 },
  );
}
