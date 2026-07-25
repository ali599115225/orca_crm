import { NextRequest, NextResponse } from "next/server";
import { CONTRACT_WRITE_ROLES } from "@/lib/api-auth-guard";
import { runWithExec003CookiePermission } from "@/lib/auth/exec-003-shared-guard";
import {
  RESTRUCTURE_MODE,
  restructurePaymentPlan,
} from "@/lib/domain/transaction-spine";
import type { RestructureMode } from "@/lib/domain/transaction-spine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithExec003CookiePermission(
    request,
    CONTRACT_WRITE_ROLES,
    "contracts.payment_plan.restructure",
    async (session) => {
      try {
        const { id } = await params;
        const body = await request.json();
        const mode = String(body.mode || "") as RestructureMode;

        if (
          mode !== RESTRUCTURE_MODE.REDUCE_INSTALLMENT &&
          mode !== RESTRUCTURE_MODE.REDUCE_TERM
        ) {
          return NextResponse.json(
            { error: "نوع إعادة الهيكلة غير صالح." },
            { status: 400 },
          );
        }

        const amount = Number(body.prepaymentAmount);
        const desiredInstallmentCount =
          body.desiredInstallmentCount == null ||
          body.desiredInstallmentCount === ""
            ? undefined
            : Number(body.desiredInstallmentCount);

        const result = await restructurePaymentPlan({
          tenantId: session.tenantId,
          userId: session.userId,
          contractId: id,
          prepaymentAmount: amount,
          mode,
          desiredInstallmentCount,
          reason: String(body.reason || ""),
          method: String(body.method || "BANK_TRANSFER_ADVANCE").slice(0, 64),
          idempotencyKey: String(body.idempotencyKey || ""),
        });

        return NextResponse.json({
          success: true,
          idempotent: result.idempotent,
          data: {
            paymentId: result.payment.id,
            paymentStatus: result.payment.status,
          },
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "تعذر إعادة هيكلة خطة الدفع.";
        const status =
          message.includes("not found") || message.includes("غير موجود")
            ? 404
            : message.includes("read-only") ||
                message.includes("signed") ||
                message.includes("active payment")
              ? 409
              : 400;

        return NextResponse.json({ success: false, error: message }, { status });
      }
    },
  );
}
