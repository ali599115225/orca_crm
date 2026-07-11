import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  appendDealEventInTx,
  ensureDealCorrelationId,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";
import { assertTenantOwnership } from "./validate-tenant";
import {
  CONTRACT_STATUS,
  OFFER_STATUS,
  OPPORTUNITY_STATUS,
  UNIT_STATUS,
} from "./constants";
import type { CancelContractInput } from "./types";

export async function cancelDraftContract(input: CancelContractInput) {
  const {
    tenantId,
    userId,
    contractId,
    actorId,
    correlationId: requestedCorrelationId,
  } = input;
  const eventActorId = actorId || userId;
  const correlationId = ensureDealCorrelationId(
    requestedCorrelationId,
    "cancel-contract",
  );
  const reason = String(input.reason || "").trim();
  if (!userId) throw new Error("Authenticated user is required.");
  if (reason.length < 3 || reason.length > 500) {
    throw new Error("Cancellation reason must contain between 3 and 500 characters.");
  }

  await assertTenantOwnership(
    tenantId,
    "contract",
    contractId,
    "Contract not found in this tenant.",
  );

  return prisma.$transaction(
    async (tx) => {
      const contract = await tx.contract.findFirst({
        where: { id: contractId, tenantId },
        include: {
          paymentPlan: true,
          offer: { include: { opportunity: true } },
          invoices: { select: { id: true } },
          installments: { select: { id: true } },
        },
      });
      if (!contract) throw new Error("Contract not found.");
      if (contract.legacyFinancial || contract.spineVersion < 2) {
        throw new Error("Legacy contract is read-only and cannot be cancelled through the Phase 1 cutover flow.");
      }
      if (contract.status !== CONTRACT_STATUS.PENDING_SIGNATURE) {
        throw new Error("Only an unsigned draft contract can be cancelled.");
      }
      if (contract.invoices.length > 0 || contract.installments.length > 0) {
        throw new Error("Draft contract contains financial records and cannot be cancelled automatically.");
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: "CANCEL_DRAFT_CONTRACT",
          tableName: "contracts",
          recordId: contract.id,
          details: JSON.stringify({
            contractId: contract.id,
            unitId: contract.unitId,
            leadId: contract.leadId,
            offerId: contract.offerId,
            reason,
            snapshot: {
              buyerName: contract.buyerName,
              totalVolumeSar: Number(contract.totalVolumeSar),
              acceptedAt: contract.acceptedAt,
              reservationExpiresAt: contract.reservationExpiresAt,
              paymentPlanId: contract.paymentPlan?.id || null,
            },
          }),
        },
      });

      if (contract.offerId) {
        await tx.offer.update({
          where: { id: contract.offerId },
          data: {
            status: OFFER_STATUS.CANCELLED,
            updatedBy: userId,
            auditLog: `Contract cancelled: ${reason}`,
          },
        });
      }

      if (contract.offer?.opportunity) {
        await tx.opportunity.update({
          where: { id: contract.offer.opportunity.id },
          data: { status: OPPORTUNITY_STATUS.OPEN, updatedBy: userId },
        });
      }

      if (contract.leadId) {
        await tx.lead.updateMany({
          where: { id: contract.leadId, tenantId, status: "RESERVED" },
          data: { status: "CONTACTED", updatedBy: userId },
        });
      }

      const deal = await resolveDealInTx(tx, {
        tenantId,
        opportunityId: contract.offer?.opportunity?.id || null,
        contractId: contract.id,
        actorId: eventActorId,
        correlationId,
      });
      if (deal.passport) {
        await appendDealEventInTx(tx, {
          tenantId,
          dealId: deal.passport.id,
          eventType: "contract.cancelled",
          idempotencyKey: `contract.cancelled:${contract.id}`,
          correlationId,
          causationId: deal.passport.lastEventId || null,
          actorId: eventActorId,
          entityType: "contract",
          entityId: contract.id,
          beforeState: {
            status: contract.status,
            unitId: contract.unitId,
          },
          afterState: {
            status: "CANCELLED",
            reason,
          },
          payload: {
            offerId: contract.offerId,
            opportunityId: contract.offer?.opportunity?.id || null,
          },
          projection: {
            opportunityId: contract.offer?.opportunity?.id || null,
            contractId: contract.id,
            currentOfferId: contract.offerId || null,
            status: "CANCELLED",
            closedAt: new Date(),
          },
        });
      }

      await tx.paymentPlan.deleteMany({ where: { contractId: contract.id } });
      await tx.contract.delete({ where: { id: contract.id } });
      await tx.unit.update({
        where: { id: contract.unitId },
        data: { status: UNIT_STATUS.AVAILABLE },
      });

      return { success: true, contractId, unitId: contract.unitId };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
