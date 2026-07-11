import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runWithDatabaseSession,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { acceptOfferAndCreateContract } from "@/lib/domain/transaction-spine";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithDatabaseSession(
    request,
    TENANT_WRITE_ROLES,
    async (session) => {
      try {
        const { id } = await params;

        const offerOwner = await prisma.offer.findFirst({
          where: { id, tenantId: session.tenantId },
          select: {
            id: true,
            linkedOpportunityId: true,
            opportunity: { select: { leadId: true } },
          },
        });
        if (!offerOwner?.opportunity?.leadId) {
          return NextResponse.json(
            { success: false, error: "العرض غير موجود ضمن هذه المنشأة." },
            { status: 404 },
          );
        }

        const result = await acceptOfferAndCreateContract({
          tenantId: session.tenantId,
          userId: session.userId,
          offerId: id,
        });

        await writeAuditLog({
          tenantId: session.tenantId,
          userId: session.userId,
          action: "LEAD_OFFER_ACCEPTED",
          tableName: "leads",
          recordId: offerOwner.opportunity.leadId,
          details: JSON.stringify({
            offerId: result.offer.id,
            opportunityId: offerOwner.linkedOpportunityId,
            contractId: result.contract.id,
          }),
        });

        return NextResponse.json({
          success: true,
          data: {
            offerId: result.offer.id,
            offerStatus: result.offer.status,
            contractId: result.contract.id,
            contractStatus: result.contract.status,
            reservationExpiresAt: result.contract.reservationExpiresAt,
            paymentPlanId: result.paymentPlan.id,
            paymentPlanStatus: result.paymentPlan.status,
            idempotent: result.idempotent,
          },
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "تعذر قبول العرض.";
        const status = /not found/i.test(message)
          ? 404
          : /expired|reserved|sold|available/i.test(message)
            ? 409
            : 400;
        return NextResponse.json(
          { success: false, error: message },
          { status },
        );
      }
    },
  );
}
