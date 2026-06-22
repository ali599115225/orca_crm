import { prisma } from "@/lib/prisma";
import {
  appendDealEventInTx,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";
import { hashPhone } from "@/lib/privacy-mask";
import { assertTenantOwnership } from "./validate-tenant";
import { ensureDefaultPaymentPlanInTx } from "./payment-plan";
import {
  CONTRACT_STATUS,
  DEFAULT_RESERVATION_DAYS,
  UNIT_STATUS,
} from "./constants";
import type { IssueContractInput } from "./types";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

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
    acceptedAt?: Date;
    reservationExpiresAt?: Date;
  },
) {
  const acceptedAt = data.acceptedAt || new Date();
  const reservationExpiresAt =
    data.reservationExpiresAt || addDays(acceptedAt, DEFAULT_RESERVATION_DAYS);
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
      acceptedAt,
      reservationExpiresAt,
      signedAt: null,
      status: CONTRACT_STATUS.PENDING_SIGNATURE,
      spineVersion: 2,
      legacyFinancial: false,
      legacyReason: null,
    },
  });

  await tx.unit.update({
    where: { id: data.unitId },
    data: { status: UNIT_STATUS.RESERVED },
  });

  if (data.leadId) {
    await tx.lead.update({
      where: { id: data.leadId },
      data: { status: "RESERVED", stage: "Contract" },
    });
  }

  const paymentPlan = await ensureDefaultPaymentPlanInTx(tx, contract);

  await tx.auditLog.create({
    data: {
      tenantId: data.tenantId,
      userId: data.userId,
      action: data.offerId
        ? "ACCEPT_OFFER_CREATE_DRAFT_CONTRACT"
        : "CREATE_DRAFT_CONTRACT",
      tableName: "contracts",
      recordId: contract.id,
      details: JSON.stringify({
        contractId: contract.id,
        unitId: data.unitId,
        leadId: data.leadId,
        offerId: data.offerId || null,
        totalVolumeSar: data.totalVolumeSar,
        status: contract.status,
        reservationExpiresAt,
        paymentPlanId: paymentPlan.id,
      }),
    },
  });

  await tx.telemetryEvent
    .create({
      data: {
        tenantId: data.tenantId,
        eventType: data.offerId
          ? "offer.accepted.contract.draft_created"
          : "contract.draft_created",
        eventDataJson: JSON.stringify({
          contractId: contract.id,
          unitId: data.unitId,
          paymentPlanId: paymentPlan.id,
        }),
        createdBy: data.userId,
      },
    })
    .catch(() => {});

  return contract;
}

export async function issueContract(input: IssueContractInput) {
  const { tenantId, userId, clientId, propertyId, amount, actorId, correlationId } = input;
  const eventActorId = actorId || userId;

  if (!clientId) throw new Error("Client ID is required.");
  if (!propertyId) throw new Error("Property ID is required.");
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    throw new Error("Amount must be positive.");
  }

  await assertTenantOwnership(
    tenantId,
    "unit",
    propertyId,
    "Unit not found in this tenant.",
  );

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
    if (!contact) throw new Error("Client not found in this tenant.");
    buyerName = contact.name;
    buyerPhone = contact.phone;
  }

  return prisma.$transaction(async (tx) => {
    const unit = await tx.unit.findFirst({
      where: { id: propertyId, tenantId },
      include: { contract: true },
    });
    if (!unit) throw new Error("Unit not found.");
    if (unit.contract) throw new Error("Unit already has an active contract.");

    const contract = await _createContractInTx(tx, {
      tenantId,
      userId,
      unitId: propertyId,
      leadId,
      buyerName,
      buyerPhone,
      totalVolumeSar: Number(amount),
    });

    const deal = await resolveDealInTx(tx, {
      tenantId,
      contractId: contract.id,
      actorId: eventActorId,
      correlationId,
    });

    if (deal.created && deal.passport) {
      await appendDealEventInTx(tx, {
        tenantId,
        dealId: deal.passport.id,
        eventType: "deal.opened",
        idempotencyKey: `deal.opened:contract:${contract.id}`,
        actorId: eventActorId,
        correlationId,
        entityType: "contract",
        entityId: contract.id,
        projection: {
          contractId: contract.id,
          status: "OPEN",
        },
      });
    }

    if (deal.passport) {
      await appendDealEventInTx(tx, {
        tenantId,
        dealId: deal.passport.id,
        eventType: "contract.issued",
        idempotencyKey: `contract.issued:${contract.id}`,
        actorId: eventActorId,
        correlationId,
        entityType: "contract",
        entityId: contract.id,
        projection: {
          contractId: contract.id,
          status: "CONTRACT_ISSUED",
        },
      });
    }

    return contract;
  });
}
