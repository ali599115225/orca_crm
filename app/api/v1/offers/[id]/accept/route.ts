import { NextRequest, NextResponse } from "next/server";
import { getTenantAndUser } from "@/lib/api-helpers";
import { acceptOfferAndCreateContract } from "@/lib/domain/transaction-spine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId || !userId) {
      return NextResponse.json({ error: "غير مصرح بالوصول." }, { status: 401 });
    }

    const { id } = await params;
    const result = await acceptOfferAndCreateContract({
      tenantId,
      userId,
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
    const message = error instanceof Error ? error.message : "تعذر قبول العرض.";
    const status = /not found/i.test(message) ? 404 : /expired|reserved|sold|available/i.test(message) ? 409 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
