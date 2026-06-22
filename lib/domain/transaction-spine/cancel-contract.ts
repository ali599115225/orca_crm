import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertTenantOwnership } from "./validate-tenant";
import {
  CONTRACT_STATUS,
  OFFER_STATUS,
  OPPORTUNITY_STATUS,
  UNIT_STATUS,
} from "./constants";
import type { CancelContractInput } from "./types";

export async function cancelDraftContract(input: CancelContractInput) {
  const { tenantId, userId, contractId } = input;
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
          data: { status: "CONTACTED", stage: "Open", updatedBy: userId },
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
