import { prisma } from "@/lib/prisma";
import { assertTenantOwnership } from "./validate-tenant";
import type { ScheduleTourInput } from "./types";

export async function scheduleTour(input: ScheduleTourInput) {
  const { tenantId, userId, leadId, opportunityId, unitId, location, startAt, endAt, attendees = 1, notes } = input;

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
