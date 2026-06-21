import { prisma } from "@/lib/prisma";
import { assertTenantOwnership } from "./validate-tenant";
import type { CreateOfferInput } from "./types";

export async function createOffer(input: CreateOfferInput) {
  const { tenantId, userId, opportunityId, price, validUntil, documentUrl } = input;

  await assertTenantOwnership(tenantId, "opportunity", opportunityId, "Opportunity not found in this tenant.");

  const offer = await prisma.offer.create({
    data: {
      tenantId,
      linkedOpportunityId: opportunityId,
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
      eventDataJson: JSON.stringify({ offerId: offer.id, opportunityId, price }),
      createdBy: userId,
    },
  }).catch(() => {});

  return offer;
}
