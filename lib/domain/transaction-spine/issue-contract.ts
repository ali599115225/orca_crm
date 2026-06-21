import { prisma } from "@/lib/prisma";
import { hashPhone } from "@/lib/privacy-mask";
import { assertTenantOwnership } from "./validate-tenant";
import type { IssueContractInput } from "./types";

export async function _createContractInTx(
  tx: any,
  data: {
    tenantId: string;
    userId: string | null;
    unitId: string;
    leadId: string | null;
    offerId?: string | null;
    buyerName: string;
    buyerPhone: string;
    totalVolumeSar: number;
    signedAt?: Date;
  },
) {
  const buyerPhoneHash = hashPhone(data.tenantId, data.buyerPhone);

  const contract = await tx.contract.create({
    data: {
      tenantId: data.tenantId,
      unitId: data.unitId,
      leadId: data.leadId,
      offerId: data.offerId || null,
      buyerName: data.buyerName,
      buyerPhone: data.buyerPhone,
      buyerPhoneHash,
      totalVolumeSar: data.totalVolumeSar,
      signedAt: data.signedAt || new Date(),
    },
  });

  await tx.unit.update({
    where: { id: data.unitId },
    data: { status: "Sold" },
  });

  if (data.leadId) {
    await tx.lead.update({
      where: { id: data.leadId },
      data: { status: "CONTRACT_SIGNED", stage: "Closed" },
    });
  }

  await tx.auditLog.create({
    data: {
      tenantId: data.tenantId,
      userId: data.userId,
      action: data.offerId ? "ACCEPT_OFFER_CREATE_CONTRACT" : "CREATE_CONTRACT",
      tableName: "contracts",
      recordId: contract.id,
      details: JSON.stringify({
        contractId: contract.id,
        unitId: data.unitId,
        leadId: data.leadId,
        offerId: data.offerId || null,
        buyerName: data.buyerName,
        totalVolumeSar: data.totalVolumeSar,
      }),
    },
  });

  await tx.telemetryEvent.create({
    data: {
      tenantId: data.tenantId,
      eventType: data.offerId ? "offer.accepted.contract.created" : "contract.issued",
      eventDataJson: JSON.stringify({
        contractId: contract.id,
        unitId: data.unitId,
        buyerName: data.buyerName,
        totalVolumeSar: data.totalVolumeSar,
      }),
      createdBy: data.userId,
    },
  });

  return contract;
}

export async function issueContract(input: IssueContractInput) {
  const { tenantId, userId, clientId, propertyId, amount } = input;

  if (!clientId) throw new Error("Client ID is required.");
  if (!propertyId) throw new Error("Property ID is required.");
  if (!amount || Number(amount) <= 0) throw new Error("Amount must be positive.");

  await assertTenantOwnership(tenantId, "unit", propertyId, "Unit not found in this tenant.");

  let buyerName = "";
  let buyerPhone = "";
  let leadId: string | null = null;

  const lead = await prisma.lead.findFirst({
    where: { id: clientId, tenantId },
  });

  if (lead) {
    buyerName = `${lead.firstName} ${lead.lastName || ""}`.trim();
    buyerPhone = lead.phone;
    leadId = lead.id;
  } else {
    const contact = await prisma.contact.findFirst({
      where: { id: clientId, tenantId },
    });
    if (contact) {
      buyerName = contact.name;
      buyerPhone = contact.phone;
    } else {
      throw new Error("Client not found in this tenant.");
    }
  }

  const unit = await prisma.unit.findFirst({
    where: { id: propertyId, project: { tenantId } },
    include: { contract: true },
  });

  if (!unit) throw new Error("Unit not found.");
  if (unit.contract) throw new Error("Unit already has an active contract.");

  const contract = await prisma.$transaction(async (tx) => {
    return _createContractInTx(tx, {
      tenantId,
      userId,
      unitId: propertyId,
      leadId,
      buyerName,
      buyerPhone,
      totalVolumeSar: Number(amount),
    });
  });

  return contract;
}
