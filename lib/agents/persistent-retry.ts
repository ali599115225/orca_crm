import { prisma } from "@/lib/prisma";
import { encryptText, decryptText } from "@/lib/crypto";
import { sanitizeAuditDetails } from "@/lib/privacy-mask";

export interface AgentRetryEnvelope {
  version: 1;
  agentName: string;
  operation: string;
  payload: unknown;
  attempts: number;
  lastError: string;
  createdAt: string;
}

function safeError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : String(error || "Unknown error");
  return sanitizeAuditDetails(message).slice(0, 500);
}

export async function enqueueAgentRetry(params: {
  tenantId: string;
  agentName: string;
  operation: string;
  payload: unknown;
  correlationId: string;
  error: unknown;
}) {
  const existing = await prisma.sentinelTaskOrder.findFirst({
    where: {
      tenantId: params.tenantId,
      source: "AGENT_RETRY",
      correlationId: params.correlationId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
  });
  if (existing) return existing;

  const envelope: AgentRetryEnvelope = {
    version: 1,
    agentName: params.agentName,
    operation: params.operation,
    payload: params.payload,
    attempts: 0,
    lastError: safeError(params.error),
    createdAt: new Date().toISOString(),
  };

  return prisma.sentinelTaskOrder.create({
    data: {
      tenantId: params.tenantId,
      createdBy: params.agentName,
      assignedToType: "SYSTEM",
      assignedToName: "Agent Retry Queue",
      title: `${params.agentName}: persistent retry`,
      description: JSON.stringify({
        agentName: params.agentName,
        operation: params.operation,
        attempts: 0,
        lastError: envelope.lastError,
      }),
      executionPayload: encryptText(JSON.stringify(envelope)),
      priority: "HIGH",
      riskLevel: "MEDIUM",
      approvalRequired: false,
      status: "OPEN",
      source: "AGENT_RETRY",
      correlationId: params.correlationId,
    },
  });
}

export function decodeAgentRetry(
  executionPayload: string | null,
): AgentRetryEnvelope {
  if (!executionPayload) throw new Error("Retry payload is missing.");
  const decrypted = decryptText(executionPayload);
  if (!decrypted) throw new Error("Retry payload could not be decrypted.");

  const parsed = JSON.parse(decrypted) as AgentRetryEnvelope;
  if (
    parsed.version !== 1 ||
    !parsed.agentName ||
    !parsed.operation ||
    !("payload" in parsed)
  ) {
    throw new Error("Retry payload is invalid.");
  }
  return parsed;
}

export async function claimAgentRetries(
  tenantId: string,
  limit = 10,
) {
  const candidates = await prisma.sentinelTaskOrder.findMany({
    where: {
      tenantId,
      source: "AGENT_RETRY",
      status: "OPEN",
    },
    orderBy: { createdAt: "asc" },
    take: Math.max(1, Math.min(limit, 20)),
  });

  const claimed = [];
  for (const task of candidates) {
    const result = await prisma.sentinelTaskOrder.updateMany({
      where: {
        id: task.id,
        tenantId,
        status: "OPEN",
      },
      data: { status: "IN_PROGRESS" },
    });
    if (result.count === 1) claimed.push(task);
  }
  return claimed;
}

export async function completeAgentRetry(
  tenantId: string,
  taskId: string,
) {
  await prisma.sentinelTaskOrder.updateMany({
    where: { id: taskId, tenantId, status: "IN_PROGRESS" },
    data: {
      status: "DONE",
      completedAt: new Date(),
    },
  });
}

export async function failAgentRetry(params: {
  tenantId: string;
  taskId: string;
  envelope: AgentRetryEnvelope;
  error: unknown;
}) {
  const attempts = params.envelope.attempts + 1;
  const lastError = safeError(params.error);
  const nextEnvelope: AgentRetryEnvelope = {
    ...params.envelope,
    attempts,
    lastError,
  };

  await prisma.sentinelTaskOrder.updateMany({
    where: {
      id: params.taskId,
      tenantId: params.tenantId,
      status: "IN_PROGRESS",
    },
    data: {
      status: attempts >= 3 ? "FAILED" : "OPEN",
      description: JSON.stringify({
        agentName: nextEnvelope.agentName,
        operation: nextEnvelope.operation,
        attempts,
        lastError,
      }),
      executionPayload: encryptText(JSON.stringify(nextEnvelope)),
    },
  });
}

export async function getAgentRetryStatus(tenantId: string) {
  const [open, inProgress, failed, done] = await Promise.all([
    prisma.sentinelTaskOrder.count({
      where: { tenantId, source: "AGENT_RETRY", status: "OPEN" },
    }),
    prisma.sentinelTaskOrder.count({
      where: { tenantId, source: "AGENT_RETRY", status: "IN_PROGRESS" },
    }),
    prisma.sentinelTaskOrder.count({
      where: { tenantId, source: "AGENT_RETRY", status: "FAILED" },
    }),
    prisma.sentinelTaskOrder.count({
      where: { tenantId, source: "AGENT_RETRY", status: "DONE" },
    }),
  ]);

  return { open, inProgress, failed, done };
}
