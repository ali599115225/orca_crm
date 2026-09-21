import { NextRequest, NextResponse } from "next/server";
import { CONTRACT_WRITE_ROLES } from "@/lib/api-auth-guard";
import { runWithExec003DatabasePermission } from "@/lib/auth/exec-003-shared-guard";
import { cancelDraftContract } from "@/lib/domain/transaction-spine";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithExec003DatabasePermission(
    request,
    CONTRACT_WRITE_ROLES,
    "contracts.cancel.execute",
    async (session) => {
      try {
        const { id } = await params;
        const body = await request.json();
        const reason = typeof body.reason === "string" ? body.reason.trim() : "";

        if (!reason) {
          return NextResponse.json(
            { success: false, error: "سبب إلغاء العقد مطلوب." },
            { status: 400 },
          );
        }

        const result = await cancelDraftContract({
          tenantId: session.tenantId,
          userId: session.userId,
          contractId: id,
          reason,
        });

        return NextResponse.json({ success: true, data: result });
      } catch (error: unknown) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "POST /api/v1/contracts/:id/cancel failed",
          error,
        );
      }
    },
  );
}
