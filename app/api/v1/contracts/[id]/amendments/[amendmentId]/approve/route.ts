import { NextRequest, NextResponse } from "next/server";
import { CONTRACT_WRITE_ROLES } from "@/lib/api-auth-guard";
import { runWithExec003DatabasePermission } from "@/lib/auth/exec-003-shared-guard";
import {
  AMENDMENT_APPROVAL_CONTRACT_MISMATCH,
  AMENDMENT_APPROVAL_CONTRACT_NOT_ELIGIBLE,
  AMENDMENT_APPROVAL_CONTRACT_NOT_FOUND,
  AMENDMENT_APPROVAL_IDEMPOTENCY_KEY_CONTENT_CONFLICT,
  AMENDMENT_APPROVAL_IDEMPOTENCY_KEY_TYPE_MISMATCH,
  AMENDMENT_APPROVAL_NOT_DRAFT,
  AMENDMENT_APPROVAL_NOT_FOUND,
  AMENDMENT_APPROVAL_SELF_APPROVAL_REJECTED,
  AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_DIGEST_MISMATCH,
  AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_INVALID,
  AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_MISSING,
  AMENDMENT_APPROVAL_STALE_VERSION,
  AmendmentApprovalError,
  approveAmendmentDraft,
} from "@/lib/domain/transaction-spine/amendment-approval";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";

function approvalErrorResponse(error: AmendmentApprovalError) {
  switch (error.code) {
    case AMENDMENT_APPROVAL_CONTRACT_NOT_FOUND:
    case AMENDMENT_APPROVAL_NOT_FOUND:
    case AMENDMENT_APPROVAL_CONTRACT_MISMATCH:
      return NextResponse.json(
        { success: false, code: error.code, error: "التعديل غير موجود لهذا العقد/المستأجر." },
        { status: 404 },
      );
    case AMENDMENT_APPROVAL_NOT_DRAFT:
      return NextResponse.json(
        { success: false, code: error.code, error: "لا يمكن اعتماد تعديل إلا وهو في حالة مسودة (DRAFT)." },
        { status: 409 },
      );
    case AMENDMENT_APPROVAL_CONTRACT_NOT_ELIGIBLE:
      return NextResponse.json(
        { success: false, code: error.code, error: "العقد لم يعد مؤهلاً لاعتماد تعديل عليه." },
        { status: 409 },
      );
    case AMENDMENT_APPROVAL_STALE_VERSION:
      return NextResponse.json(
        { success: false, code: error.code, error: "تغيّرت نسخة العقد منذ إنشاء المسودة؛ يلزم مسودة جديدة." },
        { status: 409 },
      );
    case AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_MISSING:
    case AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_INVALID:
    case AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_DIGEST_MISMATCH:
      return NextResponse.json(
        { success: false, code: error.code, error: "تعذر التحقق من دليل التعديل المصدر." },
        { status: 409 },
      );
    case AMENDMENT_APPROVAL_SELF_APPROVAL_REJECTED:
      return NextResponse.json(
        { success: false, code: error.code, error: "لا يجوز اعتماد التعديل من قبل منشئه." },
        { status: 403 },
      );
    case AMENDMENT_APPROVAL_IDEMPOTENCY_KEY_TYPE_MISMATCH:
    case AMENDMENT_APPROVAL_IDEMPOTENCY_KEY_CONTENT_CONFLICT:
      return NextResponse.json(
        { success: false, code: error.code, error: "مفتاح idempotency غير متوافق مع طلب اعتماد سابق." },
        { status: 409 },
      );
    default:
      return NextResponse.json(
        { success: false, code: error.code, error: "تعذر اعتماد التعديل." },
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
    "contracts.amendment.approve",
    async (session) => {
      try {
        const { id, amendmentId } = await params;
        const body = await request.json().catch(() => ({}));

        // Canonical approval body only: the client never supplies
        // status/approvedBy/approvedAt/tenantId/contractId/amendmentId —
        // identity comes from the URL and the session, not the body.
        const result = await approveAmendmentDraft({
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
            approvedBy: result.amendment.approvedBy,
            approvedAt: result.amendment.approvedAt,
            idempotent: result.idempotent,
          },
        });
      } catch (error: unknown) {
        if (error instanceof AmendmentApprovalError) {
          return approvalErrorResponse(error);
        }
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "POST /api/v1/contracts/:id/amendments/:amendmentId/approve failed",
          error,
        );
      }
    },
  );
}
