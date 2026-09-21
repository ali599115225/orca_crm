// lib/sentinel/task-order.ts
// Sentinel Task Order management
import { prisma } from "@/lib/prisma";
import { writeSentinelAudit } from "./audit";
import { SENTINEL_PERMISSIONS, type TaskPriority, type TaskRiskLevel, type TaskStatus, type TaskSource, type TaskAssigneeType } from "./types";

export interface CreateTaskOrderParams {
  tenantId?: string;
  assignedToType: TaskAssigneeType;
  assignedToName: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  riskLevel?: TaskRiskLevel;
  approvalRequired?: boolean;
  source?: TaskSource;
  correlationId?: string;
  reason?: string;
  requestedById?: string;
  requestId?: string;
}

export function computeApprovalExpiresAt(): Date {
  return new Date(Date.now() + getApprovalTTLMinutes() * 60_000);
}

export async function createTaskOrder(params: CreateTaskOrderParams) {
  const isSensitive = params.approvalRequired || false;

  const task = await prisma.sentinelTaskOrder.create({
    data: {
      tenantId: params.tenantId || null,
      createdBy: "platform_sentinel",
      assignedToType: params.assignedToType,
      assignedToName: params.assignedToName,
      title: params.title,
      description: params.description || null,
      priority: params.priority || "MEDIUM",
      riskLevel: params.riskLevel || "LOW",
      approvalRequired: isSensitive,
      status: isSensitive ? "WAITING_APPROVAL" : "OPEN",
      source: params.source || "SYSTEM",
      correlationId: params.correlationId || null,
      requestedById: isSensitive ? (params.requestedById || null) : undefined,
      requestId: isSensitive ? (params.requestId || null) : undefined,
      approvalRequestedAt: isSensitive ? new Date() : undefined,
      approvalExpiresAt: isSensitive ? computeApprovalExpiresAt() : undefined,
    },
  });

  await writeSentinelAudit({
    eventType: "SENTINEL_TASK_CREATED",
    tenantId: params.tenantId,
    source: params.source || "SYSTEM",
    decision: `Task created: ${params.title}`,
    reason: params.reason || "Sentinel automated task",
    riskLevel: params.riskLevel || "LOW",
    approvalRequired: isSensitive,
    correlationId: task.id,
  });

  return task;
}

export async function getOpenTasks() {
  return prisma.sentinelTaskOrder.findMany({
    where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_APPROVAL"] } },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: 50,
  });
}

export async function getPendingApprovals() {
  return prisma.sentinelTaskOrder.findMany({
    where: { status: "WAITING_APPROVAL" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getRecentAuditEvents(limit = 20) {
  return prisma.auditLog.findMany({
    where: {
      OR: [
        { action: { startsWith: "SENTINEL_" } },
        { tableName: "sentinel_command" },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getOpenIncidents() {
  return prisma.sentinelTaskOrder.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS"] },
      priority: { in: ["HIGH", "CRITICAL"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getOrCreateSentinelConfig() {
  let config = await prisma.sentinelConfig.findFirst();
  if (!config) {
    config = await prisma.sentinelConfig.create({
      data: { operatingMode: "NORMAL_MODE" },
    });
  }
  return config;
}

export async function updateOperatingMode(mode: string) {
  const config = await getOrCreateSentinelConfig();
  const updated = await prisma.sentinelConfig.update({
    where: { id: config.id },
    data: { operatingMode: mode },
  });

  await writeSentinelAudit({
    eventType: "SENTINEL_MODE_CHANGE",
    decision: `Mode changed to ${mode}`,
    reason: "Manual mode change by owner",
    beforeState: config.operatingMode,
    afterState: mode,
  });

  return updated;
}

export async function updateDelegationLevel(level: string) {
  const config = await getOrCreateSentinelConfig();
  const updated = await prisma.sentinelConfig.update({
    where: { id: config.id },
    data: { delegationLevel: level },
  });
  await writeSentinelAudit({
    eventType: "SENTINEL_DELEGATION_CHANGED",
    decision: `Delegation level set to ${level}`,
    beforeState: config.delegationLevel,
    afterState: level,
  });
  return updated;
}

export async function updateFallbackPlan(active: boolean) {
  const config = await getOrCreateSentinelConfig();
  const updated = await prisma.sentinelConfig.update({
    where: { id: config.id },
    data: { fallbackPlanActive: active },
  });
  await writeSentinelAudit({
    eventType: "SENTINEL_FALLBACK_TOGGLED",
    decision: `Fallback plan ${active ? "activated" : "deactivated"}`,
    beforeState: String(config.fallbackPlanActive),
    afterState: String(active),
  });
  return updated;
}

export async function updateDeepRepairWait(minutes: number) {
  const config = await getOrCreateSentinelConfig();
  const updated = await prisma.sentinelConfig.update({
    where: { id: config.id },
    data: { deepRepairWaitMinutes: minutes },
  });
  return updated;
}

export function getApprovalTTLMinutes(): number {
  const raw = process.env.SENTINEL_APPROVAL_TTL_MINUTES;
  if (!raw) return 1440;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return 1440;
  return parsed;
}

export function isTaskExpired(task: { createdAt: Date; approvalExpiresAt?: Date | null }): boolean {
  if (task.approvalExpiresAt) {
    return new Date() > task.approvalExpiresAt;
  }
  const ttl = getApprovalTTLMinutes();
  const deadline = new Date(task.createdAt.getTime() + ttl * 60_000);
  return new Date() > deadline;
}

export async function getChatMessages(limit = 30) {
  return prisma.sentinelChatMessage.findMany({
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export async function sendOwnerChatMessage(message: string) {
  const msg = await prisma.sentinelChatMessage.create({
    data: { sender: "OWNER", message },
  });
  return msg;
}
