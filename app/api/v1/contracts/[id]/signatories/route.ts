import { NextRequest, NextResponse } from "next/server";
import { CONTRACT_WRITE_ROLES } from "@/lib/api-auth-guard";
import { runWithExec003DatabasePermission } from "@/lib/auth/exec-003-shared-guard";
import {
  CONTRACT_NOT_FOUND,
  CONTRACT_SIGNATORY_CONFIG_EMPTY,
  CONTRACT_SIGNATORY_CONFIG_INVALID,
  CONTRACT_SIGNATORY_CONFIG_LOCKED,
  CONTRACT_SIGNATORY_CONFIG_NOT_PENDING,
  CONTRACT_SIGNATORY_CONFIG_NO_REQUIRED,
  ContractSignatoryError,
  configureContractSignatories,
} from "@/lib/domain/transaction-spine/sign-contract";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";

function configErrorResponse(error: ContractSignatoryError) {
  switch (error.code) {
    case CONTRACT_NOT_FOUND:
      return NextResponse.json(
        { success: false, code: error.code, error: "العقد غير موجود لهذا المستأجر." },
        { status: 404 },
      );
    case CONTRACT_SIGNATORY_CONFIG_EMPTY:
      return NextResponse.json(
        { success: false, code: error.code, error: "قائمة الموقّعين لا يمكن أن تكون فارغة." },
        { status: 400 },
      );
    case CONTRACT_SIGNATORY_CONFIG_NO_REQUIRED:
      return NextResponse.json(
        { success: false, code: error.code, error: "يجب أن يوجد موقّع واحد إلزامي (required) على الأقل." },
        { status: 400 },
      );
    case CONTRACT_SIGNATORY_CONFIG_INVALID:
      return NextResponse.json(
        { success: false, code: error.code, error: "بيانات الموقّعين غير صالحة." },
        { status: 400 },
      );
    case CONTRACT_SIGNATORY_CONFIG_NOT_PENDING:
      return NextResponse.json(
        { success: false, code: error.code, error: "لا يمكن تكوين الموقّعين إلا قبل توقيع العقد." },
        { status: 409 },
      );
    case CONTRACT_SIGNATORY_CONFIG_LOCKED:
      return NextResponse.json(
        { success: false, code: error.code, error: "لا يمكن تعديل مجموعة الموقّعين بعد وجود توقيع." },
        { status: 409 },
      );
    default:
      return NextResponse.json(
        { success: false, code: error.code, error: "تعذر تكوين الموقّعين." },
        { status: 409 },
      );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithExec003DatabasePermission(
    request,
    CONTRACT_WRITE_ROLES,
    "contracts.signatories.configure",
    async (session) => {
      try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));

        // Canonical configuration body only: role/required/signerReference
        // per entry. The client never supplies id/status/signedAt/evidence
        // hash/tenantId/contractId/finalization state — those keys are
        // simply never read here, and all validation/persistence is done by
        // configureContractSignatories (no domain logic is duplicated).
        const signatories = Array.isArray(body.signatories)
          ? body.signatories.map((entry: unknown) => {
              const value =
                typeof entry === "object" && entry !== null
                  ? (entry as Record<string, unknown>)
                  : {};
              return {
                role: value.role,
                required: value.required,
                signerReference: value.signerReference,
              };
            })
          : body.signatories;

        const result = await configureContractSignatories({
          tenantId: session.tenantId,
          userId: session.userId,
          contractId: id,
          signatories,
        });

        return NextResponse.json({
          success: true,
          data: {
            contractId: result.contract.id,
            signatories: result.signatories.map((row: any) => ({
              id: row.id,
              role: row.role,
              required: row.required,
              status: row.status,
              signerReference: row.signerReference,
            })),
          },
        });
      } catch (error: unknown) {
        if (error instanceof ContractSignatoryError) {
          return configErrorResponse(error);
        }
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "PUT /api/v1/contracts/:id/signatories failed",
          error,
        );
      }
    },
  );
}
