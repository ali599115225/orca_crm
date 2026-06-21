import { prisma } from "@/lib/prisma";
import { assertTenantOwnership } from "./validate-tenant";
import type { ScheduleTourInput } from "./types";

export async function scheduleTour(input: ScheduleTourInput) {
  const { tenantId, userId, offerId, location, startAt, endAt, attendees = 1, notes } = input;
  let { leadId, opportunityId, unitId } = input;

  if (offerId) {
    const offer = await prisma.offer.findFirst({
      where: { id: offerId, tenantId },
      include: { opportunity: true },
    });

    if (!offer) throw new Error("Offer not found in this tenant.");
    if (!offer.opportunity) throw new Error("Opportunity not linked to this offer.");
    if (leadId && offer.opportunity.leadId !== leadId) throw new Error("Lead mismatch.");
    if (opportunityId && offer.linkedOpportunityId !== opportunityId) throw new Error("Opportunity mismatch.");
    if (unitId && offer.unitId !== unitId) throw new Error("Unit mismatch.");
    if (!offer.unitId) throw new Error("Cannot schedule a tour for an offer without a linked unit.");

    leadId = offer.opportunity.leadId;
    opportunityId = offer.linkedOpportunityId;
    unitId = offer.unitId;
  }

  if (offerId && !unitId) throw new Error("Unit ID is required to schedule a tour from an offer.");

  await assertTenantOwnership(tenantId, "lead", leadId, "Lead not found in this tenant.");
  if (opportunityId) await assertTenantOwnership(tenantId, "opportunity", opportunityId, "Opportunity not found in this tenant.");
  if (unitId) await assertTenantOwnership(tenantId, "unit", unitId, "Unit not found in this tenant.");

  const tour = await prisma.tour.create({
    data: {
      tenantId,
      leadId,
      opportunityId: opportunityId || null,
      unitId: unitId || null,
      assignedTo: userId,
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

  await prisma.telemetryEvent.create({
    data: {
      tenantId,
      eventType: "tour.scheduled",
      eventDataJson: JSON.stringify({ tourId: tour.id, leadId, startAt: startAt.toISOString() }),
      createdBy: userId,
    },
  }).catch(() => {});

  return tour;
}
