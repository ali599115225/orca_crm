import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ErrorCode } from "@/lib/errors";
import { EXEC_003_DATABASE_ROLES } from "@/lib/auth/exec-003-permission-assignments";
import { runWithExec003DatabasePermission } from "@/lib/auth/exec-003-shared-guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithExec003DatabasePermission(
    request,
    EXEC_003_DATABASE_ROLES,
    "invoices.paylink_status.read",
    async (session) => {
      const { id } = await params;

      try {
        const invoice = await prisma.invoice.findFirst({
          where: { id, tenantId: session.tenantId },
          select: {
            status: true,
            gatewayProvider: true,
            gatewayStatus: true,
            paymentUrl: true,
            paymentMethod: true,
            paidAt: true,
          },
        });
        if (!invoice) {
          return NextResponse.json(
            { success: false, error: "الفاتورة غير موجودة" },
            { status: 404 },
          );
        }

        return NextResponse.json({
          success: true,
          invoiceStatus: invoice.status,
          gatewayProvider: invoice.gatewayProvider,
          gatewayStatus: invoice.gatewayStatus,
          paymentUrl: invoice.paymentUrl,
          paymentMethod: invoice.paymentMethod,
          paidAt: invoice.paidAt?.toISOString() || null,
        });
      } catch (error: any) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "GET /api/v1/invoices/[id]/paylink/status failed",
          error,
          500,
        );
      }
    },
  );
}
