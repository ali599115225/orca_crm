import { createHmac, randomUUID } from "node:crypto";
import { rawPrisma } from "@/lib/prisma";

export type RevenueEventInput = {
  tenantId: string;
  actorId?: string | null;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  correlationId?: string;
  causationId?: string | null;
  idempotencyKey: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  topic?: string;
};

export async function appendRevenueEvent(input: RevenueEventInput) {
  const correlationId = input.correlationId || randomUUID();

  return rawPrisma.$transaction(async (tx: any) => {
    const existing = await tx.revenueDomainEvent.findFirst({
      where: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey },
    });
    if (existing) return existing;

    const event = await tx.revenueDomainEvent.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.actorId || null,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        eventType: input.eventType,
        correlationId,
        causationId: input.causationId || null,
        idempotencyKey: input.idempotencyKey,
        beforeData: input.before === undefined ? undefined : (input.before as any),
        afterData: input.after === undefined ? undefined : (input.after as any),
        metadata: (input.metadata || {}) as any,
      },
    });

    await tx.revenueAuditEntry.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.actorId || null,
        action: input.eventType,
        resourceType: input.aggregateType,
        resourceId: input.aggregateId,
        correlationId,
        beforeData: input.before === undefined ? undefined : (input.before as any),
        afterData: input.after === undefined ? undefined : (input.after as any),
      },
    });

    await tx.revenueOutboxMessage.create({
      data: {
        tenantId: input.tenantId,
        eventId: event.id,
        topic: input.topic || `internal.${input.eventType.toLowerCase()}`,
        payload: {
          eventId: event.id,
          tenantId: input.tenantId,
          aggregateType: input.aggregateType,
          aggregateId: input.aggregateId,
          eventType: input.eventType,
          correlationId,
          occurredAt: event.occurredAt.toISOString(),
          after: input.after ?? null,
          metadata: input.metadata || {},
        } as any,
      },
    });

    return event;
  });
}

async function dispatchOutboxMessage(message: any) {
  if (!String(message.topic).startsWith("external.")) return;

  const url = process.env.REVENUE_EVENT_SINK_URL;
  const secret = process.env.REVENUE_EVENT_SINK_SECRET;
  if (!url || !secret) throw new Error("REVENUE_EVENT_SINK_NOT_CONFIGURED");

  const body = JSON.stringify(message.payload);
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-orca-signature": signature,
      "x-orca-event-id": message.eventId,
    },
    body,
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`EVENT_SINK_HTTP_${response.status}`);
  }
}

export async function processRevenueOutbox(limit = 50) {
  const batchSize = Math.min(Math.max(limit, 1), 200);
  const messages = await rawPrisma.revenueOutboxMessage.findMany({
    where: {
      status: { in: ["PENDING", "RETRY"] },
      nextAttemptAt: { lte: new Date() },
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });

  const result = { delivered: 0, retry: 0, deadLetter: 0 };

  for (const message of messages) {
    try {
      await dispatchOutboxMessage(message);
      await rawPrisma.revenueOutboxMessage.update({
        where: { id: message.id },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
          attempts: { increment: 1 },
          lastError: null,
        },
      });
      result.delivered += 1;
    } catch (error) {
      const attempts = message.attempts + 1;
      const dead = attempts >= 8;
      const delayMinutes = Math.min(2 ** attempts, 360);
      await rawPrisma.revenueOutboxMessage.update({
        where: { id: message.id },
        data: {
          status: dead ? "DEAD_LETTER" : "RETRY",
          attempts,
          lastError: error instanceof Error ? error.message.slice(0, 2000) : "UNKNOWN_OUTBOX_ERROR",
          nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000),
        },
      });
      if (dead) result.deadLetter += 1;
      else result.retry += 1;
    }
  }

  return result;
}
