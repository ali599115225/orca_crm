import { NextRequest, NextResponse } from "next/server";
import { CONTRACT_WRITE_ROLES } from "@/lib/api-auth-guard";
import { runWithExec003DatabasePermission } from "@/lib/auth/exec-003-shared-guard";
import { prisma } from "@/lib/prisma";
import { CONTRACT_STATUS, signContract } from "@/lib/domain/transaction-spine";
import {
  ContractSignatureEvidenceError,
  SIGNATURE_EVIDENCE_REQUIRED,
  normalizeSignatureEvidence,
} from "@/lib/domain/transaction-spine/sign-contract";
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

        const signatureEvidence =
          body.signatureEvidence === undefined || body.signatureEvidence === null
            ? undefined
            : body.signatureEvidence;

        if (signatureEvidence !== undefined) {
          normalizeSignatureEvidence(signatureEvidence);
        } else {
          const current = await prisma.contract.findFirst({
            where: { id, tenantId: session.tenantId },
            select: { status: true, signedAt: true },
          });
          const alreadySigned =
            current?.status === CONTRACT_STATUS.SIGNED && Boolean(current.signedAt);
          if (current && !alreadySigned) {
            return signatureEvidenceErrorResponse(SIGNATURE_EVIDENCE_REQUIRED);
          }
        }

        const result = await signContract({
          tenantId: session.tenantId,
          userId: session.userId,
          contractId: id,
          signedAt,
          signatureEvidence,
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
            signatureEvidenceHash: result.signatureEvidenceHash,
            idempotent: result.idempotent,
          },
        });
      } catch (error: unknown) {
        if (error instanceof ContractSignatureEvidenceError) {
          return signatureEvidenceErrorResponse(error.code);
        }
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
