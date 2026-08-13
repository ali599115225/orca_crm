import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  appendDealEventInTx,
  ensureDealCorrelationId,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";
import { assertTenantOwnership } from "./validate-tenant";
import { _createContractInTx } from "./issue-contract";
import { ensureDefaultPaymentPlanInTx } from "./payment-plan";
import {
  CONTRACT_STATUS,
  OFFER_STATUS,
  OPPORTUNITY_STATUS,
  UNIT_STATUS,
} from "./constants";
import type { AcceptOfferInput } from "./types";

async function releaseExpiredDraftContractInTx(
  tx: any,
  contract: any,
  actorUserId: string,
) {
  if (
    contract.status !== CONTRACT_STATUS.PENDING_SIGNATURE ||
    !contract.reservationExpiresAt ||
    contract.reservationExpiresAt >= new Date()
  ) {
    return false;
  }

  const financialArtifacts = await Promise.all([
    tx.invoice.count({ where: { contractId: contract.id } }),
    tx.installment.count({ where: { contractId: contract.id } }),
  ]);
  if (financialArtifacts[0] > 0 || financialArtifacts[1] > 0) {
    throw new Error(
      "Expired draft contract contains financial records and requires review.",
    );
  }

  await tx.auditLog.create({
    data: {
      tenantId: contract.tenantId,
      userId: actorUserId,
      action: "EXPIRE_DRAFT_CONTRACT",
      tableName: "contracts",
      recordId: contract.id,
      details: JSON.stringify({
        contractId: contract.id,
        unitId: contract.unitId,
        offerId: contract.offerId,
        leadId: contract.leadId,
        reservationExpiresAt: contract.reservationExpiresAt,
      }),
    },
  });

  if (contract.offerId) {
    const offer = await tx.offer.findUnique({ where: { id: contract.offerId } });
    if (offer && offer.status === OFFER_STATUS.ACCEPTED) {
      await tx.offer.update({
        where: { id: contract.offerId },
        data: { status: OFFER_STATUS.EXPIRED, updatedBy: actorUserId },
      });
    }
  }

  if (contract.leadId) {
    await tx.lead.updateMany({
      where: {
        id: contract.leadId,
        tenantId: contract.tenantId,
        status: "RESERVED",
      },
      data: { status: "CONTACTED" },
    });
  }

  await tx.paymentPlan.deleteMany({ where: { contractId: contract.id, tenantId: contract.tenantId } });
  await tx.contract.deleteMany({ where: { id: contract.id, tenantId: contract.tenantId } });
  await tx.unit.updateMany({
    where: { id: contract.unitId, project: { tenantId: contract.tenantId } },
    data: { status: UNIT_STATUS.AVAILABLE },
  });

  return true;
}

export async function acceptOfferAndCreateContract(input: AcceptOfferInput) {
  const {
    tenantId,
    userId,
    offerId,
    actorId,
    correlationId: requestedCorrelationId,
  } = input;
  const eventActorId = actorId || userId;
  const correlationId = ensureDealCorrelationId(
    requestedCorrelationId,
    "deal",
  );
  if (!userId) throw new Error("Authenticated user is required.");

  await assertTenantOwnership(
    tenantId,
    "offer",
    offerId,
    "Offer not found in this tenant.",
  );

  return prisma.$transaction(
    async (tx) => {
      const offer = await tx.offer.findFirst({
        where: { id: offerId, tenantId },
        include: {
          opportunity: true,
          contract: { include: { paymentPlan: true } },
        },
      });

      if (!offer) throw new Error("Offer not found.");
      const acceptEligible =
        offer.status === OFFER_STATUS.PENDING ||
        offer.status === OFFER_STATUS.SENT ||
        offer.status === OFFER_STATUS.NEGOTIATION;
      if (!acceptEligible && offer.status !== OFFER_STATUS.ACCEPTED) {
        throw new Error("Offer is not available for acceptance.");
      }
      if (acceptEligible && offer.validUntil < new Date()) {
        await tx.offer.update({
          where: { id: offer.id },
          data: { status: OFFER_STATUS.EXPIRED, updatedBy: userId },
        });
        throw new Error("Offer has expired.");
      }
      if (!offer.unitId) {
        throw new Error("لا يمكن قبول هذا العرض: لم يتم ربط وحدة عقارية به.");
      }

      const opportunity = offer.opportunity;
      if (!opportunity) throw new Error("Opportunity not linked to this offer.");

      const lead = await tx.lead.findFirst({
        where: { id: opportunity.leadId, tenantId },
      });
      if (!lead) throw new Error("Lead not found in this tenant.");

      if (offer.contract) {
        if (offer.contract.legacyFinancial || offer.contract.spineVersion < 2) {
          throw new Error("Legacy contract is read-only and cannot enter the Phase 1 cutover flow.");
        }

        const paymentPlan =
          offer.contract.paymentPlan ||
          (await ensureDefaultPaymentPlanInTx(tx, offer.contract));

        if (offer.status !== OFFER_STATUS.ACCEPTED) {
          await tx.offer.update({
            where: { id: offer.id },
            data: { status: OFFER_STATUS.ACCEPTED, updatedBy: userId },
          });
        }

        await tx.offer.updateMany({
          where: {
            tenantId,
            unitId: offer.unitId,
            id: { not: offer.id },
            status: {
              in: [
                OFFER_STATUS.PENDING,
                OFFER_STATUS.SENT,
                OFFER_STATUS.NEGOTIATION,
              ],
            },
          },
          data: {
            status: OFFER_STATUS.CANCELLED,
            updatedBy: userId,
            auditLog: `Superseded by accepted offer ${offer.id}`,
          },
        });

        return {
          offer,
          contract: offer.contract,
          paymentPlan,
          idempotent: true,
        };
      }

      const unit = await tx.unit.findFirst({
        where: { id: offer.unitId, tenantId },
        include: { contract: true },
      });
      if (!unit) throw new Error("Unit not found in this tenant.");

      if (unit.contract) {
        const released = await releaseExpiredDraftContractInTx(
          tx,
          unit.contract,
          userId,
        );
        if (!released) {
          throw new Error(
            unit.contract.status === CONTRACT_STATUS.SIGNED
              ? "Unit is already sold under a signed contract."
              : "Unit is reserved under another active contract.",
          );
        }
      }

      const buyerName = `${lead.firstName} ${lead.lastName || ""}`.trim();
      const contract = await _createContractInTx(tx, {
        tenantId,
        userId,
        unitId: offer.unitId,
        leadId: lead.id,
        offerId: offer.id,
        buyerName,
        buyerPhone: lead.phone,
        totalVolumeSar: Number(offer.price),
      });

      const paymentPlan = await tx.paymentPlan.findFirst({
        where: { contractId: contract.id, tenantId: contract.tenantId },
      });
      if (!paymentPlan) throw new Error("Default payment plan was not created.");

      const acceptedOffer = await tx.offer.update({
        where: { id: offer.id },
        data: {
          status: OFFER_STATUS.ACCEPTED,
          updatedBy: userId,
          auditLog:
            `${offer.auditLog || ""}\nOffer accepted at ${new Date().toISOString()}`.trim(),
        },
      });

      await tx.offer.updateMany({
        where: {
          tenantId,
          unitId: offer.unitId,
          id: { not: offer.id },
          status: {
            in: [
              OFFER_STATUS.PENDING,
              OFFER_STATUS.SENT,
              OFFER_STATUS.NEGOTIATION,
            ],
          },
        },
        data: {
          status: OFFER_STATUS.CANCELLED,
          updatedBy: userId,
          auditLog: `Superseded by accepted offer ${offer.id}`,
        },
      });

      await tx.opportunity.update({
        where: { id: opportunity.id },
        data: { status: OPPORTUNITY_STATUS.COMMITTED, updatedBy: userId },
      });

      const deal = await resolveDealInTx(tx, {
        tenantId,
        opportunityId: opportunity.id,
        contractId: contract.id,
        actorId: eventActorId,
        correlationId,
      });

      let dealOpenedEventId: string | null = null;
      if (deal.created && deal.passport) {
        const dealOpened = await appendDealEventInTx(tx, {
          tenantId,
          dealId: deal.passport.id,
          eventType: "deal.opened",
          idempotencyKey: `deal.opened:opportunity:${opportunity.id}`,
          actorId: eventActorId,
          correlationId,
          entityType: "opportunity",
          entityId: opportunity.id,
          afterState: {
            status: "OPEN",
            opportunityId: opportunity.id,
            contractId: contract.id,
          },
          projection: {
            opportunityId: opportunity.id,
            contractId: contract.id,
            status: "OPEN",
          },
        });
        dealOpenedEventId = dealOpened.event?.id || null;
      }

      if (deal.passport) {
        const offerAcceptedEvent = await appendDealEventInTx(tx, {
          tenantId,
          dealId: deal.passport.id,
          eventType: "offer.accepted",
          idempotencyKey: `offer.accepted:${offer.id}`,
          causationId: dealOpenedEventId || deal.passport.lastEventId || null,
          actorId: eventActorId,
          correlationId,
          entityType: "offer",
          entityId: offer.id,
          beforeState: { status: offer.status },
          afterState: { status: OFFER_STATUS.ACCEPTED },
          payload: {
            opportunityId: opportunity.id,
            contractId: contract.id,
          },
          projection: {
            opportunityId: opportunity.id,
            contractId: contract.id,
            currentOfferId: offer.id,
            status: "OFFER_ACCEPTED",
          },
        });

        await appendDealEventInTx(tx, {
          tenantId,
          dealId: deal.passport.id,
          eventType: "contract.issued",
          idempotencyKey: `contract.issued:${contract.id}`,
          causationId: offerAcceptedEvent.event?.id || null,
          actorId: eventActorId,
          correlationId,
          entityType: "contract",
          entityId: contract.id,
          afterState: {
            status: CONTRACT_STATUS.PENDING_SIGNATURE,
            contractId: contract.id,
          },
          payload: {
            opportunityId: opportunity.id,
            offerId: offer.id,
          },
          projection: {
            opportunityId: opportunity.id,
            contractId: contract.id,
            currentOfferId: offer.id,
            status: "CONTRACT_ISSUED",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: "ACCEPT_OFFER_RESERVE_UNIT",
          tableName: "offers",
          recordId: offer.id,
          details: JSON.stringify({
            offerId: offer.id,
            contractId: contract.id,
            paymentPlanId: paymentPlan.id,
            unitId: offer.unitId,
            opportunityStatus: OPPORTUNITY_STATUS.COMMITTED,
            contractStatus: CONTRACT_STATUS.PENDING_SIGNATURE,
          }),
        },
      });

      return {
        offer: acceptedOffer,
        contract,
        paymentPlan,
        idempotent: false,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
