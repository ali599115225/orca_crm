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

  const opportunity = offer.opportunity;
  if (!opportunity) throw new Error("Opportunity not linked to this offer.");

  await assertTenantOwnership(tenantId, "lead", opportunity.leadId, "Lead not found in this tenant.");

  const lead = await prisma.lead.findFirst({
    where: { id: opportunity.leadId, tenantId },
  });
  if (!lead) throw new Error("Lead not found.");

  let unitId: string | null = lead.unitId;
  if (!unitId && opportunity.linkedUnitIds) {
    unitId = opportunity.linkedUnitIds.split(",")[0].trim();
  }
  if (!unitId) {
    const availableUnit = await prisma.unit.findFirst({
      where: { status: "Available", project: { tenantId } },
    });
    unitId = availableUnit?.id || null;
  }

  if (!unitId) throw new Error("No available unit found for this contract.");

  await assertTenantOwnership(tenantId, "unit", unitId, "Unit not found in this tenant.");

  const result = await prisma.$transaction(async (tx) => {
    const existingContract = unitId
      ? await tx.contract.findUnique({ where: { unitId } })
      : null;

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
