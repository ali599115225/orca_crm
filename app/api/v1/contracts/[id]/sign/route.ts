import { NextRequest, NextResponse } from "next/server";
import { CONTRACT_WRITE_ROLES } from "@/lib/api-auth-guard";
import { runWithExec003DatabasePermission } from "@/lib/auth/exec-003-shared-guard";
import { signContract } from "@/lib/domain/transaction-spine";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithExec003DatabasePermission(
    request,
    CONTRACT_WRITE_ROLES,
    "contracts.sign.execute",
    async (session) => {
      try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));

        if (body.confirm !== true) {
          return NextResponse.json(
            { success: false, error: "تأكيد توقيع العقد مطلوب." },
            { status: 400 },
          );
        }

        const signedAt = body.signedAt ? new Date(body.signedAt) : undefined;
        if (signedAt && Number.isNaN(signedAt.getTime())) {
          return NextResponse.json(
            { success: false, error: "تاريخ التوقيع غير صالح." },
            { status: 400 },
          );
        }

        const result = await signContract({
          tenantId: session.tenantId,
          userId: session.userId,
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
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "POST /api/v1/contracts/:id/sign failed",
          error,
        );
      }
    },
  );
}
