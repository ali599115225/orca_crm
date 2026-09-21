import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  appendDealEventInTx,
  ensureDealCorrelationId,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";
import { assertTenantOwnership } from "./validate-tenant";
import type { ScheduleTourInput } from "./types";

export async function scheduleTour(input: ScheduleTourInput) {
  const {
    tenantId,
    userId,
    offerId,
    location,
    startAt,
    endAt,
    attendees = 1,
    notes,
    assignedTo,
    actorId,
    correlationId: requestedCorrelationId,
  } = input;
  let { leadId, opportunityId, unitId } = input;
  const eventActorId = actorId || userId;
  const assignedUserId = assignedTo || userId;
  const correlationId = ensureDealCorrelationId(
    requestedCorrelationId,
    "tour",
  );

  if (!userId) throw new Error("Authenticated user is required.");
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new Error("Tour date is invalid.");
  }
  if (endAt <= startAt) throw new Error("Tour end time must be after start time.");

  const assignedUser = await prisma.user.findFirst({
    where: { id: assignedUserId, tenantId, isActive: true },
    select: { id: true },
  });
  if (!assignedUser) {
    throw new Error("Assigned user not found in this tenant.");
  }

  if (offerId) {
    const offer = await prisma.offer.findFirst({
      where: { id: offerId, tenantId },
      include: { opportunity: true },
    });

    if (!offer) throw new Error("Offer not found in this tenant.");
    if (!offer.opportunity) throw new Error("Opportunity not linked to this offer.");
    if (leadId && offer.opportunity.leadId !== leadId) throw new Error("Lead mismatch.");
    if (opportunityId && offer.linkedOpportunityId !== opportunityId) {
      throw new Error("Opportunity mismatch.");
    }
    if (unitId && offer.unitId !== unitId) throw new Error("Unit mismatch.");
    if (!offer.unitId) {
      throw new Error("Cannot schedule a tour for an offer without a linked unit.");
    }

    leadId = offer.opportunity.leadId;
    opportunityId = offer.linkedOpportunityId;
    unitId = offer.unitId;
  }

  if (offerId && !unitId) {
    throw new Error("Unit ID is required to schedule a tour from an offer.");
  }

  await assertTenantOwnership(
    tenantId,
    "lead",
    leadId,
    "Lead not found in this tenant.",
  );
  if (opportunityId) {
    await assertTenantOwnership(
      tenantId,
      "opportunity",
      opportunityId,
      "Opportunity not found in this tenant.",
    );
  }
  if (unitId) {
    await assertTenantOwnership(
      tenantId,
      "unit",
      unitId,
      "Unit not found in this tenant.",
    );
  }

  return prisma.$transaction(
    async (tx) => {
      const tour = await tx.tour.create({
        data: {
          tenantId,
          leadId,
          opportunityId: opportunityId || null,
          unitId: unitId || null,
          assignedTo: assignedUserId,
          location,
          startAt,
          endAt,
          status: "SCHEDULED",
          attendees,
          notes: notes || null,
          createdBy: userId,
          offerId: offerId || null,
        },
      });

      if (opportunityId) {
        const deal = await resolveDealInTx(tx, {
          tenantId,
          opportunityId,
          actorId: eventActorId,
          correlationId,
        });
        let dealOpenedEventId: string | null = null;
        if (deal.created && deal.passport) {
          const opened = await appendDealEventInTx(tx, {
            tenantId,
            dealId: deal.passport.id,
            eventType: "deal.opened",
            idempotencyKey: `deal.opened:opportunity:${opportunityId}`,
            correlationId,
            actorId: eventActorId,
            entityType: "opportunity",
            entityId: opportunityId,
            afterState: { status: "OPEN", opportunityId },
            projection: { opportunityId, status: "OPEN" },
          });
          dealOpenedEventId = opened.event?.id || null;
        }

        if (deal.passport) {
          await appendDealEventInTx(tx, {
            tenantId,
            dealId: deal.passport.id,
            eventType: "tour.scheduled",
            idempotencyKey: `tour.scheduled:${tour.id}`,
            correlationId,
            causationId: dealOpenedEventId || deal.passport.lastEventId || null,
            actorId: eventActorId,
            entityType: "tour",
            entityId: tour.id,
            afterState: {
              status: "SCHEDULED",
              startAt: startAt.toISOString(),
              endAt: endAt.toISOString(),
            },
            payload: {
              leadId,
              opportunityId,
              unitId: unitId || null,
              offerId: offerId || null,
            },
            projection: {
              opportunityId,
              currentOfferId: offerId || undefined,
              status: "TOUR_SCHEDULED",
            },
          });
        }
      }

      await tx.telemetryEvent.create({
        data: {
          tenantId,
          eventType: "tour.scheduled",
          eventDataJson: JSON.stringify({
            tourId: tour.id,
            leadId,
            opportunityId: opportunityId || null,
            startAt: startAt.toISOString(),
          }),
          createdBy: userId,
        },
      });

      return tour;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
