import { prisma } from "@/lib/prisma";
import { assertTenantOwnership } from "./validate-tenant";
import { _createContractInTx } from "./issue-contract";
import type { AcceptOfferInput } from "./types";

export async function acceptOfferAndCreateContract(input: AcceptOfferInput) {
  const { tenantId, userId, offerId } = input;

  await assertTenantOwnership(tenantId, "offer", offerId, "Offer not found in this tenant.");

  const offer = await prisma.offer.findFirst({
    where: { id: offerId, tenantId },
    include: { opportunity: true },
  });

  if (!offer) throw new Error("Offer not found.");
  if (offer.status !== "PENDING") throw new Error("Offer is not in PENDING status.");
  if (offer.validUntil < new Date()) throw new Error("Offer has expired.");

  if (!offer.unitId) {
    throw new Error("لا يمكن قبول هذا العرض: لم يتم ربط وحدة عقارية به.");
  }

  await assertTenantOwnership(tenantId, "unit", offer.unitId, "Unit not found in this tenant.");

  const opportunity = offer.opportunity;
  if (!opportunity) throw new Error("Opportunity not linked to this offer.");

  await assertTenantOwnership(tenantId, "lead", opportunity.leadId, "Lead not found in this tenant.");

  const lead = await prisma.lead.findFirst({
    where: { id: opportunity.leadId, tenantId },
  });
  if (!lead) throw new Error("Lead not found.");

  const unitId = offer.unitId;

  const result = await prisma.$transaction(async (tx) => {
    const existingContract = await tx.contract.findUnique({ where: { unitId } });

    if (existingContract) throw new Error("Unit already has an active contract.");

    const buyerName = `${lead.firstName} ${lead.lastName || ""}`.trim();
    const buyerPhone = lead.phone;

    const contract = await _createContractInTx(tx, {
      tenantId,
      userId,
      unitId,
      leadId: lead.id,
      offerId: offer.id,
      buyerName,
      buyerPhone,
      totalVolumeSar: Number(offer.price),
    });

    const updatedOffer = await tx.offer.update({
      where: { id: offerId },
      data: {
        status: "ACCEPTED",
        updatedBy: userId,
        auditLog: `${offer.auditLog || ""}\nOffer accepted at ${new Date().toISOString()}`.trim(),
      },
    });

    await tx.opportunity.update({
      where: { id: opportunity.id },
      data: { status: "WON" },
    });

    return { contract, offer: updatedOffer };
  });

  return result;
}
