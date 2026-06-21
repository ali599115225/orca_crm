import { prisma } from "@/lib/prisma";
import { assertTenantOwnership } from "./validate-tenant";
import type { CreateOfferInput } from "./types";

export async function createOffer(input: CreateOfferInput) {
  const { tenantId, userId, opportunityId, unitId, price, validUntil, documentUrl } = input;

  if (!unitId) throw new Error("Unit ID is required to create an offer.");

  await assertTenantOwnership(tenantId, "opportunity", opportunityId, "Opportunity not found in this tenant.");
  await assertTenantOwnership(tenantId, "unit", unitId, "Unit not found in this tenant.");

  const offer = await prisma.offer.create({
    data: {
      tenantId,
      linkedOpportunityId: opportunityId,
      unitId,
      price,
      validUntil,
      status: "PENDING",
      documentUrl: documentUrl || null,
      createdBy: userId,
    },
  });

  await prisma.telemetryEvent.create({
    data: {
      tenantId,
      eventType: "offer.created",
      eventDataJson: JSON.stringify({ offerId: offer.id, opportunityId, unitId, price }),
      createdBy: userId,
    },
  }).catch(() => {});

  return offer;
}
