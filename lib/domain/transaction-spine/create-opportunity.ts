import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  appendDealEventInTx,
  ensureDealCorrelationId,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";
import { assertTenantOwnership } from "./validate-tenant";
import type { CreateOpportunityInput } from "./types";

export async function createOpportunity(input: CreateOpportunityInput) {
  const {
    tenantId,
    userId,
    leadId,
    unitId,
    value,
    probability = 50,
    closeDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    actorId,
    correlationId: requestedCorrelationId,
  } = input;
  if (!userId) throw new Error("Authenticated user is required.");
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Opportunity value must be positive.");
  }
  if (!Number.isInteger(probability) || probability < 0 || probability > 100) {
    throw new Error("Opportunity probability must be between 0 and 100.");
  }
  if (Number.isNaN(closeDate.getTime())) throw new Error("Close date is invalid.");

  await assertTenantOwnership(tenantId, "lead", leadId, "Lead not found in this tenant.");
  await assertTenantOwnership(tenantId, "unit", unitId, "Unit not found in this tenant.");

  const eventActorId = actorId || userId;
  const correlationId = ensureDealCorrelationId(
    requestedCorrelationId,
    "opportunity",
  );

  return prisma.$transaction(
    async (tx) => {
      const opportunity = await tx.opportunity.create({
        data: {
          tenantId,
          leadId,
          value,
          probability,
          closeDate,
          status: "OPEN",
          unitId,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      const deal = await resolveDealInTx(tx, {
        tenantId,
        opportunityId: opportunity.id,
        actorId: eventActorId,
        correlationId,
      });

      let openedId: string | null = null;
      if (deal.created && deal.passport) {
        const opened = await appendDealEventInTx(tx, {
          tenantId,
          dealId: deal.passport.id,
          eventType: "deal.opened",
          idempotencyKey: `deal.opened:opportunity:${opportunity.id}`,
          correlationId,
          actorId: eventActorId,
          entityType: "opportunity",
          entityId: opportunity.id,
          afterState: { status: "OPEN", opportunityId: opportunity.id },
          projection: { opportunityId: opportunity.id, status: "OPEN" },
        });
        openedId = opened.event?.id || null;
      }

      if (deal.passport) {
        await appendDealEventInTx(tx, {
          tenantId,
          dealId: deal.passport.id,
          eventType: "opportunity.created",
          idempotencyKey: `opportunity.created:${opportunity.id}`,
          correlationId,
          causationId: openedId || deal.passport.lastEventId || null,
          actorId: eventActorId,
          entityType: "opportunity",
          entityId: opportunity.id,
          afterState: {
            status: "OPEN",
            unitId,
            probability,
          },
          payload: { leadId },
          projection: { opportunityId: opportunity.id, status: "OPEN" },
        });
      }

      await tx.telemetryEvent.create({
        data: {
          tenantId,
          eventType: "opportunity.created",
          eventDataJson: JSON.stringify({
            opportunityId: opportunity.id,
            leadId,
            unitId,
            value,
          }),
          createdBy: userId,
        },
      });

      return opportunity;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
