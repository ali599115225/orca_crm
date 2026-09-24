import { NextRequest, NextResponse } from "next/server";
import { CONTRACT_WRITE_ROLES } from "@/lib/api-auth-guard";
import { runWithExec003DatabasePermission } from "@/lib/auth/exec-003-shared-guard";
import {
  AMENDMENT_CONTRACT_NOT_ELIGIBLE,
  AMENDMENT_CONTRACT_NOT_FOUND,
  AMENDMENT_IDEMPOTENCY_KEY_CONTENT_CONFLICT,
  AMENDMENT_IDEMPOTENCY_KEY_TYPE_MISMATCH,
  AMENDMENT_PAYMENT_PLAN_REQUIRED,
  AMENDMENT_PROPOSAL_DUPLICATE_INSTALLMENT,
  AMENDMENT_PROPOSAL_EMPTY,
  AMENDMENT_PROPOSAL_FOREIGN_INSTALLMENT,
  AMENDMENT_PROPOSAL_INVALID_ENTRY,
  AMENDMENT_PROPOSAL_MISSING_INSTALLMENT,
  AMENDMENT_PROPOSAL_ZERO_DELTA_VIOLATION,
  AMENDMENT_SALE_INVOICE_REQUIRED,
  AmendmentDraftError,
  createAmendmentDraft,
} from "@/lib/domain/transaction-spine/amendment-draft";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";

function amendmentErrorResponse(error: AmendmentDraftError) {
  switch (error.code) {
    case AMENDMENT_CONTRACT_NOT_FOUND:
      return NextResponse.json(
        { success: false, code: error.code, error: "العقد غير موجود لهذا المستأجر." },
        { status: 404 },
      );
    case AMENDMENT_CONTRACT_NOT_ELIGIBLE:
      return NextResponse.json(
        { success: false, code: error.code, error: "لا يمكن إنشاء تعديل إلا لعقد موقّع (SIGNED) ضمن النطاق التشغيلي." },
        { status: 409 },
      );
    case AMENDMENT_SALE_INVOICE_REQUIRED:
    case AMENDMENT_PAYMENT_PLAN_REQUIRED:
      return NextResponse.json(
        { success: false, code: error.code, error: "يتطلب تعديل العقد فاتورة بيع واحدة وخطة دفع قائمة." },
        { status: 409 },
      );
    case AMENDMENT_PROPOSAL_EMPTY:
    case AMENDMENT_PROPOSAL_INVALID_ENTRY:
    case AMENDMENT_PROPOSAL_DUPLICATE_INSTALLMENT:
    case AMENDMENT_PROPOSAL_FOREIGN_INSTALLMENT:
    case AMENDMENT_PROPOSAL_MISSING_INSTALLMENT:
      return NextResponse.json(
        { success: false, code: error.code, error: "قائمة الأقساط المقترحة غير صالحة." },
        { status: 400 },
      );
    case AMENDMENT_PROPOSAL_ZERO_DELTA_VIOLATION:
      return NextResponse.json(
        { success: false, code: error.code, error: "يجب أن يساوي إجمالي الأقساط المقترحة إجمالي الأقساط الحالية المؤهلة." },
        { status: 400 },
      );
    case AMENDMENT_IDEMPOTENCY_KEY_TYPE_MISMATCH:
      return NextResponse.json(
        { success: false, code: error.code, error: "مفتاح idempotency غير متوافق مع طلب سابق." },
        { status: 409 },
      );
    case AMENDMENT_IDEMPOTENCY_KEY_CONTENT_CONFLICT:
      return NextResponse.json(
        { success: false, code: error.code, error: "مفتاح idempotency مستخدم لطلب مختلف المحتوى." },
        { status: 409 },
      );
    default:
      return NextResponse.json(
        { success: false, code: error.code, error: "تعذر إنشاء مسودة التعديل." },
        { status: 409 },
      );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithExec003DatabasePermission(
    request,
    CONTRACT_WRITE_ROLES,
    "contracts.amendment.draft_create",
    async (session) => {
      try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));

        // Canonical create-draft body only: the client never supplies
        // id/status/sourceContractVersion/sourceSnapshotId/tenantId/
        // contractId — those are always server-derived.
        const result = await createAmendmentDraft({
          tenantId: session.tenantId,
          userId: session.userId,
          contractId: id,
          title: body.title,
          reason: body.reason,
          changesJson: body.changesJson,
          idempotencyKey: body.idempotencyKey,
        });

        return NextResponse.json({
          success: true,
          data: {
            amendmentId: result.amendment.id,
            contractId: result.amendment.contractId,
            status: result.amendment.status,
            sourceContractVersion: result.amendment.sourceContractVersion,
            sourceSnapshotId: result.amendment.sourceSnapshotId,
            title: result.amendment.title,
            reason: result.amendment.reason,
            sourceSnapshotDigest: result.sourceSnapshot?.digest ?? null,
            idempotent: result.idempotent,
          },
        });
      } catch (error: unknown) {
        if (error instanceof AmendmentDraftError) {
          return amendmentErrorResponse(error);
        }
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "POST /api/v1/contracts/:id/amendments failed",
          error,
        );
      }
    },
  );
}
