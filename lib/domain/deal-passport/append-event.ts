import type {
  AppendDealEventInput,
  AppendDealEventResult,
  DealEventType,
  DealPassportStatus,
} from "./types";

function hasDealEventModels(tx: any): boolean {
  return Boolean(
    tx?.dealPassport?.update &&
      tx?.dealEvent?.findFirst &&
      tx?.dealEvent?.create,
  );
}

function statusForEvent(eventType: DealEventType): DealPassportStatus {
  if (eventType === "offer.created") return "OFFERED";
  if (eventType === "offer.accepted") return "OFFER_ACCEPTED";
  if (eventType === "contract.issued") return "CONTRACT_ISSUED";
  return "OPEN";
}

export async function appendDealEventInTx(
  tx: any,
  input: AppendDealEventInput,
): Promise<AppendDealEventResult> {
  if (!hasDealEventModels(tx)) {
    return { passport: null, event: null, idempotent: false, skipped: true };
  }

  const existing = await tx.dealEvent.findFirst({
    where: {
      tenantId: input.tenantId,
      idempotencyKey: input.idempotencyKey,
    },
  });

  if (existing) {
    const passport = await tx.dealPassport.findUnique?.({
      where: { id: existing.dealId },
    });
    return {
      passport: passport || null,
      event: existing,
      idempotent: true,
      skipped: false,
    };
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
    },
  });

  const event = await tx.dealEvent.create({
    data: {
      tenantId: input.tenantId,
      dealId: input.dealId,
      sequence: passport.lastSequence,
      eventType: input.eventType,
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId || null,
      actorId: input.actorId || null,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      payload: input.payload || {},
    },
  });

  return { passport, event, idempotent: false, skipped: false };
}
