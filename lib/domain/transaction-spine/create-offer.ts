import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertTenantOwnership } from "./validate-tenant";
import {
  CONTRACT_STATUS,
  OFFER_STATUS,
  UNIT_STATUS,
} from "./constants";
import type { CreateOfferInput } from "./types";

export async function createOffer(input: CreateOfferInput) {
  const {
    tenantId,
    userId,
    opportunityId,
    unitId,
    price,
    validUntil,
    documentUrl,
  } = input;

  if (!userId) throw new Error("Authenticated user is required.");
  if (!unitId) throw new Error("Unit ID is required to create an offer.");
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Offer price must be positive.");
  }
  if (Number.isNaN(validUntil.getTime()) || validUntil <= new Date()) {
    throw new Error("Offer validity date must be in the future.");
  }

  await assertTenantOwnership(
    tenantId,
    "opportunity",
    opportunityId,
    "Opportunity not found in this tenant.",
  );
  await assertTenantOwnership(
    tenantId,
    "unit",
    unitId,
    "Unit not found in this tenant.",
  );

  return prisma.$transaction(
    async (tx) => {
      const [opportunity, unit] = await Promise.all([
        tx.opportunity.findFirst({
          where: { id: opportunityId, tenantId },
        }),
        tx.unit.findFirst({
          where: { id: unitId, tenantId },
          include: { contract: true },
        }),
      ]);

      if (!opportunity) throw new Error("Opportunity not found.");
      if (!unit) throw new Error("Unit not found.");

      if (opportunity.unitId && opportunity.unitId !== unitId) {
        throw new Error("Opportunity is linked to a different unit.");
      }

      if (
        unit.contract &&
        (unit.contract.status === CONTRACT_STATUS.SIGNED ||
          (unit.contract.status === CONTRACT_STATUS.PENDING_SIGNATURE &&
            (!unit.contract.reservationExpiresAt ||
              unit.contract.reservationExpiresAt >= new Date())))
      ) {
        throw new Error(
          unit.contract.status === CONTRACT_STATUS.SIGNED
            ? "Unit is already sold."
            : "Unit is reserved under an active contract.",
        );
      }

      const existing = await tx.offer.findFirst({
        where: {
          tenantId,
          linkedOpportunityId: opportunityId,
          unitId,
          status: OFFER_STATUS.PENDING,
          validUntil: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        return { ...existing, idempotent: true };
      }

      if (!opportunity.unitId) {
        await tx.opportunity.update({
          where: { id: opportunity.id },
          data: { unitId, updatedBy: userId },
        });
      }

      if (unit.status === UNIT_STATUS.SOLD) {
        throw new Error("Unit is marked as sold.");
      }

      const offer = await tx.offer.create({
        data: {
          tenantId,
          linkedOpportunityId: opportunityId,
          unitId,
          price,
          validUntil,
          status: OFFER_STATUS.PENDING,
          documentUrl: documentUrl || null,
          createdBy: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: "CREATE_OFFER",
          tableName: "offers",
          recordId: offer.id,
          details: JSON.stringify({ opportunityId, unitId, price, validUntil }),
        },
      });

      await tx.telemetryEvent
        .create({
          data: {
            tenantId,
            eventType: "offer.created",
            eventDataJson: JSON.stringify({
              offerId: offer.id,
              opportunityId,
              unitId,
              price,
            }),
            createdBy: userId,
          },
        })
        .catch(() => {});

      return { ...offer, idempotent: false };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
