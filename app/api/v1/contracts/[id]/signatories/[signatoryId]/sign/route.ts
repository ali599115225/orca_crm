import { NextRequest, NextResponse } from "next/server";
import { CONTRACT_WRITE_ROLES } from "@/lib/api-auth-guard";
import { runWithExec003DatabasePermission } from "@/lib/auth/exec-003-shared-guard";
import {
  CONTRACT_MULTI_SIGN_AMBIGUOUS,
  CONTRACT_NOT_FOUND,
  CONTRACT_SIGNATORY_CONTRACT_MISMATCH,
  CONTRACT_SIGNATORY_EVIDENCE_CONFLICT,
  CONTRACT_SIGNATORY_NOT_FOUND,
  ContractSignatoryError,
  ContractSignatureEvidenceError,
  SIGNATURE_EVIDENCE_REQUIRED,
  signContractSignatory,
} from "@/lib/domain/transaction-spine/sign-contract";
import { W1ContractLifecycleError } from "@/lib/domain/contract-finance/contract-draft-service";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";

function signatureEvidenceErrorResponse(code: string) {
  return NextResponse.json(
    {
      success: false,
      code,
      error:
        code === SIGNATURE_EVIDENCE_REQUIRED
          ? "دليل التوقيع مطلوب لتوقيع العقد."
          : "دليل التوقيع غير صالح.",
    },
    { status: 400 },
  );
}

function signatoryErrorResponse(error: ContractSignatoryError) {
  switch (error.code) {
    case CONTRACT_NOT_FOUND:
    case CONTRACT_SIGNATORY_NOT_FOUND:
    case CONTRACT_SIGNATORY_CONTRACT_MISMATCH:
      // Unknown signatory, foreign-tenant signatory and wrong-contract
      // signatory all fail closed identically so existence is never leaked.
      return NextResponse.json(
        { success: false, code: CONTRACT_SIGNATORY_NOT_FOUND, error: "الموقّع غير موجود لهذا العقد." },
        { status: 404 },
      );
    case CONTRACT_SIGNATORY_EVIDENCE_CONFLICT:
      return NextResponse.json(
        { success: false, code: error.code, error: "دليل التوقيع يتعارض مع توقيع سابق لهذا الموقّع." },
        { status: 409 },
      );
    case CONTRACT_MULTI_SIGN_AMBIGUOUS:
      return NextResponse.json(
        { success: false, code: error.code, error: "لا يمكن تحديد الموقّع تلقائيًا لعقد متعدد التوقيع." },
        { status: 409 },
      );
    default:
      return NextResponse.json(
        { success: false, code: error.code, error: "تعذر معالجة توقيع العقد." },
        { status: 409 },
      );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; signatoryId: string }> },
) {
  return runWithExec003DatabasePermission(
    request,
    CONTRACT_WRITE_ROLES,
    "contracts.sign.execute",
    async (session) => {
      try {
        const { id, signatoryId } = await params;
        const body = await request.json().catch(() => ({}));

        // Canonical evidence contract only: the client never sets tenantId,
        // required, role, status, signedAt or finalization outcomes.
        const signatureEvidence = body.signatureEvidence;

        const result = await signContractSignatory({
          tenantId: session.tenantId,
          userId: session.userId,
          contractId: id,
          signatoryId,
          signatureEvidence,
        });

        if (result.finalized) {
          return NextResponse.json({
            success: true,
            data: {
              contractId: result.contract.id,
              contractStatus: result.contract.status,
              signatoryId: result.signatoryId,
              signatoryStatus: result.signatoryStatus,
              finalized: true,
              signedAt: result.contract.signedAt,
              invoiceId: result.invoice.id,
              paymentPlanId: result.paymentPlan.id,
              installmentCount: result.installments.length,
              signatureEvidenceHash: result.signatureEvidenceHash,
              idempotent: result.idempotent,
            },
          });
        }

        return NextResponse.json({
          success: true,
          data: {
            contractId: result.contract.id,
            contractStatus: result.contractStatus,
            signatoryId: result.signatoryId,
            signatoryStatus: result.signatoryStatus,
            finalized: false,
            idempotent: result.idempotent,
          },
        });
      } catch (error: unknown) {
        if (error instanceof ContractSignatureEvidenceError) {
          return signatureEvidenceErrorResponse(error.code);
        }
        if (error instanceof ContractSignatoryError) {
          return signatoryErrorResponse(error);
        }
        if (error instanceof W1ContractLifecycleError) {
          return NextResponse.json(
            { success: false, code: error.code, error: "لم يُستوفَ شرط اعتماد العقد قبل التوقيع النهائي." },
            { status: 409 },
          );
        }
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "POST /api/v1/contracts/:id/signatories/:signatoryId/sign failed",
          error,
        );
      }
    },
  );
}
