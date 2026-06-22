import { publishSyncEvent } from "@/lib/realtime/publish-sync-event";
import { SYNC_TOPICS } from "@/lib/realtime/topics";
import type {
  AppendDealEventInput,
  AppendDealEventResult,
  DealEventType,
  DealPassportStatus,
} from "./types";
import { resolveDealActorType } from "./context";

function hasDealEventModels(tx: any): boolean {
  return Boolean(
    tx?.dealPassport?.findUnique &&
      tx?.dealPassport?.update &&
      tx?.dealEvent?.findFirst &&
      tx?.dealEvent?.create,
  );
}

function statusForEvent(eventType: DealEventType): DealPassportStatus {
  if (eventType === "tour.scheduled") return "TOUR_SCHEDULED";
  if (eventType === "offer.created") return "OFFERED";
  if (eventType === "offer.accepted") return "OFFER_ACCEPTED";
  if (eventType === "contract.issued") return "CONTRACT_ISSUED";
  if (eventType === "contract.signed") return "CONTRACT_SIGNED";
  if (eventType === "financials.activated") return "FINANCIALS_ACTIVE";
  if (eventType === "payment.completed") return "PAYMENT_COMPLETED";
  if (eventType === "payment_plan.restructured") {
    return "PAYMENT_PLAN_RESTRUCTURED";
  }
  if (eventType === "payment_plan.early_settled") {
    return "EARLY_SETTLED";
  }
  if (eventType === "contract.cancelled") return "CANCELLED";
  return "OPEN";
}

export async function appendDealEventInTx(
  tx: any,
  input: AppendDealEventInput,
): Promise<AppendDealEventResult> {
  if (!hasDealEventModels(tx)) {
    return { passport: null, event: null, idempotent: false, skipped: true };
  }

  const correlationId = String(input.correlationId || "").trim();
  const idempotencyKey = String(input.idempotencyKey || "").trim();
  if (!correlationId) {
    throw new Error("Deal Event correlationId is required.");
  }
  if (!idempotencyKey) {
    throw new Error("Deal Event idempotencyKey is required.");
  }
  if (correlationId.length > 200 || idempotencyKey.length > 500) {
    throw new Error("Deal Event identifiers exceed the supported length.");
  }

  const existing = await tx.dealEvent.findFirst({
    where: {
      tenantId: input.tenantId,
      idempotencyKey,
    },
  });

  if (existing) {
    if (existing.dealId !== input.dealId) {
      throw new Error("Deal Event idempotency key belongs to another deal.");
    }
    const passport = await tx.dealPassport.findUnique({
      where: { id: existing.dealId },
    });
    return {
      passport: passport || null,
      event: existing,
      idempotent: true,
      skipped: false,
    };
  }

  const currentPassport = await tx.dealPassport.findUnique({
    where: { id: input.dealId },
  });
  if (!currentPassport) throw new Error("Deal Passport not found.");
  if (currentPassport.tenantId !== input.tenantId) {
    throw new Error("Deal Passport tenant mismatch.");
  }

  if (input.causationId) {
    const cause = await tx.dealEvent.findFirst({
      where: {
        id: input.causationId,
        tenantId: input.tenantId,
        dealId: input.dealId,
      },
    });
    if (!cause) {
      throw new Error("Deal Event causation must reference the same deal and tenant.");
    }
  }

  const projection = input.projection || {};
  const passport = await tx.dealPassport.update({
    where: { id: input.dealId },
    data: {
      version: { increment: 1 },
      lastSequence: { increment: 1 },
      status: projection.status || statusForEvent(input.eventType),
      ...(projection.opportunityId !== undefined
        ? { opportunityId: projection.opportunityId }
        : {}),
      ...(projection.contractId !== undefined
        ? { contractId: projection.contractId }
        : {}),
      ...(projection.currentOfferId !== undefined
        ? { currentOfferId: projection.currentOfferId }
        : {}),
      ...(projection.closedAt !== undefined
        ? { closedAt: projection.closedAt }
        : {}),
    },
  });

  const occurredAt = input.occurredAt || new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error("Deal Event occurredAt is invalid.");
  }

  const event = await tx.dealEvent.create({
    data: {
      tenantId: input.tenantId,
      dealId: input.dealId,
      sequence: passport.lastSequence,
      eventType: input.eventType,
      eventVersion: input.eventVersion ?? 1,
      idempotencyKey,
      correlationId,
      causationId: input.causationId ?? null,
      actorType: resolveDealActorType(input.actorId, input.actorType),
      actorId: input.actorId ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      beforeState: input.beforeState === undefined ? undefined : input.beforeState,
      afterState: input.afterState === undefined ? undefined : input.afterState,
      payload: input.payload ?? {},
      occurredAt,
    },
  });

  const finalPassport = await tx.dealPassport.update({
    where: { id: input.dealId },
    data: {
      lastEventId: event.id,
      lastEventAt: occurredAt,
    },
  });

  const relatedIds = Array.from(
    new Set(
      [
        input.entityId,
        finalPassport.opportunityId,
        finalPassport.contractId,
        finalPassport.currentOfferId,
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  await publishSyncEvent(
    {
      tenantId: input.tenantId,
      topic: SYNC_TOPICS.DEALS,
      eventType: input.eventType,
      aggregateType: "deal",
      aggregateId: input.dealId,
      aggregateVersion: finalPassport.version,
      sourceEventId: event.id,
      idempotencyKey: `deal-event:${event.id}`,
      payload: {
        changedFields: [
          "status",
          "version",
          "lastSequence",
          "lastEventId",
          "lastEventAt",
        ],
        status: finalPassport.status,
        ...(event.actorType === "USER" && event.actorId
          ? { actorUserId: event.actorId }
          : {}),
        ...(relatedIds.length > 0 ? { relatedIds } : {}),
      },
    },
    tx,
  );

  return {
    passport: finalPassport,
    event,
    idempotent: false,
    skipped: false,
  };
}