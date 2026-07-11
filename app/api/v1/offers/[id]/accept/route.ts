import { NextRequest, NextResponse } from "next/server";
import {
  CONTRACT_WRITE_ROLES,
  runWithDatabaseSession,
} from "@/lib/api-auth-guard";
import { acceptOfferAndCreateContract } from "@/lib/domain/transaction-spine";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithDatabaseSession(request, CONTRACT_WRITE_ROLES, async (session) => {
    try {
      const { id } = await params;
      const result = await acceptOfferAndCreateContract({
        tenantId: session.tenantId,
        userId: session.userId,
        offerId: id,
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
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      const code = /not found|غير موجود/.test(message)
        ? ErrorCode.NOT_FOUND
        : /expired|reserved|sold|available|conflict/.test(message)
          ? ErrorCode.CONFLICT
          : ErrorCode.INTERNAL_ERROR;

      return httpErrorResponse(
        request,
        code,
        "POST /api/v1/offers/:id/accept failed",
        error,
      );
    }
  });
}
