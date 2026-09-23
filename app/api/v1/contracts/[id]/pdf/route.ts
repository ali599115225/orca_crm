import { renderSignedContractDocument } from "@/lib/domain/transaction-spine/signed-contract-document";
import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ErrorCode } from "@/lib/errors";
import { EXEC_003_DATABASE_ROLES } from "@/lib/auth/exec-003-permission-assignments";
import { runWithExec003CookiePermission } from "@/lib/auth/exec-003-shared-guard";
import { CONTRACT_STATUS } from "@/lib/domain/transaction-spine/constants";
import {
  SIGNED_OPERATIONAL_SNAPSHOT_TYPE,
  SignedContractSnapshotError,
  verifySignedOperationalSnapshot,
} from "@/lib/domain/transaction-spine/signed-contract-snapshot";

// Read-only: renders the immutable SIGNED_OPERATIONAL ContractSnapshot.
// Live contract state is only used to confirm the contract is signed.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithExec003CookiePermission(
    request,
    EXEC_003_DATABASE_ROLES,
    "contracts.pdf.read",
    async (session) => {
      const { id } = await params;
      const { searchParams } = new URL(request.url);
      const isDownload = searchParams.get("download") === "1";

      try {
        const contract = await prisma.contract.findFirst({
          where: { id, tenantId: session.tenantId },
          select: { id: true, status: true, signedAt: true },
        });

        if (!contract) {
          return NextResponse.json(
            { error: "العقد غير موجود" },
            { status: 404 },
          );
        }

        if (contract.status !== CONTRACT_STATUS.SIGNED || !contract.signedAt) {
          return NextResponse.json(
            { error: "العقد غير موقع ولا يمكن إصدار وثيقته.", code: "CONTRACT_NOT_SIGNED" },
            { status: 409 },
          );
        }

        const snapshot = await prisma.contractSnapshot.findFirst({
          where: {
            tenantId: session.tenantId,
            contractId: contract.id,
            snapshotType: SIGNED_OPERATIONAL_SNAPSHOT_TYPE,
          },
          orderBy: { contractVersion: "desc" },
        });
        if (!snapshot) {
          return NextResponse.json(
            { error: "لا توجد نسخة موقعة ثابتة لهذا العقد.", code: "SIGNED_SNAPSHOT_MISSING" },
            { status: 409 },
          );
        }

        let identity;
        try {
          identity = verifySignedOperationalSnapshot(snapshot);
        } catch (error) {
          if (error instanceof SignedContractSnapshotError) {
            return NextResponse.json(
              { error: "النسخة الموقعة من العقد غير سليمة.", code: error.code },
              { status: 409 },
            );
          }
          throw error;
        }

        const { html, label } = renderSignedContractDocument(snapshot, isDownload);

        const headers: Record<string, string> = {
          "Content-Type": "text/html; charset=utf-8",
          "X-Contract-Id": identity.contractId,
          "X-Contract-Version": String(identity.contractVersion),
          "X-Contract-Signed-At": identity.signedAt,
          "X-Signature-Evidence-Hash": identity.signatureEvidenceHash,
          "X-Contract-Snapshot-Digest": snapshot.digest,
        };
        if (isDownload) {
          headers["Content-Disposition"] =
            `attachment; filename="contract-${label}.html"`;
        }
        return new NextResponse(html, { headers });
      } catch (error: any) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "GET /api/v1/contracts/[id]/pdf failed",
          error,
          500,
        );
      }
    },
  );
}
