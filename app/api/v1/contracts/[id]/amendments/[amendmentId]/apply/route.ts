import { NextRequest, NextResponse } from "next/server";
import { CONTRACT_WRITE_ROLES } from "@/lib/api-auth-guard";
import { runWithExec003DatabasePermission } from "@/lib/auth/exec-003-shared-guard";
import {
  AMENDMENT_APPLY_APPROVAL_EVIDENCE_MISSING,
  AMENDMENT_APPLY_CONCURRENT_CONFLICT,
  AMENDMENT_APPLY_CONTRACT_MISMATCH,
  AMENDMENT_APPLY_CONTRACT_NOT_ELIGIBLE,
  AMENDMENT_APPLY_CONTRACT_NOT_FOUND,
  AMENDMENT_APPLY_IDEMPOTENCY_KEY_CONTENT_CONFLICT,
  AMENDMENT_APPLY_IDEMPOTENCY_KEY_TYPE_MISMATCH,
  AMENDMENT_APPLY_LIVE_SOURCE_DRIFT,
  AMENDMENT_APPLY_NOT_APPROVED,
  AMENDMENT_APPLY_NOT_FOUND,
  AMENDMENT_APPLY_PAYMENT_PLAN_REQUIRED,
  AMENDMENT_APPLY_PENDING_PAYMENTS_EXIST,
  AMENDMENT_APPLY_PROPOSAL_DUPLICATE_INSTALLMENT,
  AMENDMENT_APPLY_PROPOSAL_FOREIGN_INSTALLMENT,
  AMENDMENT_APPLY_PROPOSAL_INSTALLMENT_NUMBER_MISMATCH,
  AMENDMENT_APPLY_PROPOSAL_INVALID,
  AMENDMENT_APPLY_PROPOSAL_MISSING_INSTALLMENT,
  AMENDMENT_APPLY_PROPOSAL_ZERO_DELTA_VIOLATION,
  AMENDMENT_APPLY_RESULT_SNAPSHOT_DIGEST_MISMATCH,
  AMENDMENT_APPLY_SALE_INVOICE_REQUIRED,
  AMENDMENT_APPLY_SOURCE_SNAPSHOT_DIGEST_MISMATCH,
  AMENDMENT_APPLY_SOURCE_SNAPSHOT_INVALID,
  AMENDMENT_APPLY_SOURCE_SNAPSHOT_MISSING,
  AMENDMENT_APPLY_STALE_VERSION,
  AMENDMENT_APPLY_UNALLOCATED_COMPLETED_PAYMENT,
  AmendmentApplyError,
  applyAmendment,
} from "@/lib/domain/transaction-spine/amendment-apply";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";

function applyErrorResponse(error: AmendmentApplyError) {
  switch (error.code) {
    case AMENDMENT_APPLY_CONTRACT_NOT_FOUND:
    case AMENDMENT_APPLY_NOT_FOUND:
    case AMENDMENT_APPLY_CONTRACT_MISMATCH:
      return NextResponse.json(
        { success: false, code: error.code, error: "التعديل أو العقد غير موجود لهذا المستأجر." },
        { status: 404 },
      );
    case AMENDMENT_APPLY_NOT_APPROVED:
    case AMENDMENT_APPLY_APPROVAL_EVIDENCE_MISSING:
      return NextResponse.json(
        { success: false, code: error.code, error: "لا يمكن تطبيق التعديل إلا وهو معتمد أصولاً (APPROVED)." },
        { status: 409 },
      );
    case AMENDMENT_APPLY_CONTRACT_NOT_ELIGIBLE:
      return NextResponse.json(
        { success: false, code: error.code, error: "العقد لم يعد مؤهلاً لتطبيق التعديل." },
        { status: 409 },
      );
    case AMENDMENT_APPLY_STALE_VERSION:
      return NextResponse.json(
        { success: false, code: error.code, error: "تغيّرت نسخة العقد منذ إنشاء المسودة واعتمادها." },
        { status: 409 },
      );
    case AMENDMENT_APPLY_SALE_INVOICE_REQUIRED:
    case AMENDMENT_APPLY_PAYMENT_PLAN_REQUIRED:
      return NextResponse.json(
        { success: false, code: error.code, error: "يتطلب العقد فاتورة بيع واحدة وخطة سداد نشطة." },
        { status: 409 },
      );
    case AMENDMENT_APPLY_SOURCE_SNAPSHOT_MISSING:
    case AMENDMENT_APPLY_SOURCE_SNAPSHOT_INVALID:
    case AMENDMENT_APPLY_SOURCE_SNAPSHOT_DIGEST_MISMATCH:
    case AMENDMENT_APPLY_RESULT_SNAPSHOT_DIGEST_MISMATCH:
      return NextResponse.json(
        { success: false, code: error.code, error: "تعذر التحقق من لقطة العقد أو سلامة التعديل." },
        { status: 409 },
      );
    case AMENDMENT_APPLY_PENDING_PAYMENTS_EXIST:
      return NextResponse.json(
        { success: false, code: error.code, error: "توجد مدفوعات قيد المعالجة؛ لا يمكن تطبيق التعديل حالياً." },
        { status: 409 },
      );
    case AMENDMENT_APPLY_LIVE_SOURCE_DRIFT:
      return NextResponse.json(
        { success: false, code: error.code, error: "حدث انحراف في البيانات المالية الحية للعقد مقارنة بلقطة الاعتماد." },
        { status: 409 },
      );
    case AMENDMENT_APPLY_UNALLOCATED_COMPLETED_PAYMENT:
      return NextResponse.json(
        { success: false, code: error.code, error: "توجد مدفوعات مكتملة غير مخصصة للأقساط في الفاتورة." },
        { status: 409 },
      );
    case AMENDMENT_APPLY_PROPOSAL_INVALID:
    case AMENDMENT_APPLY_PROPOSAL_DUPLICATE_INSTALLMENT:
    case AMENDMENT_APPLY_PROPOSAL_FOREIGN_INSTALLMENT:
    case AMENDMENT_APPLY_PROPOSAL_INSTALLMENT_NUMBER_MISMATCH:
    case AMENDMENT_APPLY_PROPOSAL_MISSING_INSTALLMENT:
    case AMENDMENT_APPLY_PROPOSAL_ZERO_DELTA_VIOLATION:
      return NextResponse.json(
        { success: false, code: error.code, error: "مقترح التعديل غير مطابق للأقساط الحية المؤهلة." },
        { status: 409 },
      );
    case AMENDMENT_APPLY_CONCURRENT_CONFLICT:
      return NextResponse.json(
        { success: false, code: error.code, error: "تعارض متزامن أثناء تطبيق التعديل؛ يرجى إعادة المحاولة." },
        { status: 409 },
      );
    case AMENDMENT_APPLY_IDEMPOTENCY_KEY_TYPE_MISMATCH:
    case AMENDMENT_APPLY_IDEMPOTENCY_KEY_CONTENT_CONFLICT:
      return NextResponse.json(
        { success: false, code: error.code, error: "مفتاح idempotency غير متوافق مع طلب تطبيق سابق." },
        { status: 409 },
      );
    default:
      return NextResponse.json(
        { success: false, code: error.code, error: "تعذر تطبيق التعديل." },
        { status: 409 },
      );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; amendmentId: string }> },
) {
  return runWithExec003DatabasePermission(
    request,
    CONTRACT_WRITE_ROLES,
    "contracts.amendment.apply",
    async (session) => {
      try {
        const { id, amendmentId } = await params;
        const body = await request.json().catch(() => ({}));

        const result = await applyAmendment({
          tenantId: session.tenantId,
          userId: session.userId,
          contractId: id,
          amendmentId,
          idempotencyKey: body.idempotencyKey,
        });

        return NextResponse.json({
          success: true,
          data: {
            amendmentId: result.amendment.id,
            contractId: result.amendment.contractId,
            status: result.amendment.status,
            resultingSnapshotId: result.resultingSnapshot.id,
            contractVersion: result.contract.version,
            paymentPlanVersion: result.paymentPlan?.version,
            idempotent: result.idempotent,
          },
        });
      } catch (error: unknown) {
        if (error instanceof AmendmentApplyError) {
          return applyErrorResponse(error);
        }
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "POST /api/v1/contracts/:id/amendments/:amendmentId/apply failed",
          error,
        );
      }
    },
  );
}
