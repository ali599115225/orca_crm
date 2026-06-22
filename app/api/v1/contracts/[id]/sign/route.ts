import { NextRequest, NextResponse } from "next/server";
import { getTenantAndUser } from "@/lib/api-helpers";
import { signContract } from "@/lib/domain/transaction-spine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId || !userId) return NextResponse.json({ error: "غير مصرح بالوصول." }, { status: 401 });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (body.confirm !== true) {
      return NextResponse.json(
        { error: "تأكيد توقيع العقد مطلوب." },
        { status: 400 },
      );
    }
    const signedAt = body.signedAt ? new Date(body.signedAt) : undefined;

    const result = await signContract({
      tenantId,
      userId,
      contractId: id,
      signedAt,
    });

    return NextResponse.json({
      success: true,
      data: {
        contractId: result.contract.id,
        contractStatus: result.contract.status,
        signedAt: result.contract.signedAt,
        invoiceId: result.invoice.id,
        paymentPlanId: result.paymentPlan.id,
        installmentCount: result.installments.length,
        idempotent: result.idempotent,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر توقيع العقد.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
