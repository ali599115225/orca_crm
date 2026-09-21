import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import { ErrorCode } from "@/lib/errors";
import { EXEC_003_DATABASE_ROLES } from "@/lib/auth/exec-003-permission-assignments";
import { runWithExec003CookiePermission } from "@/lib/auth/exec-003-shared-guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithExec003CookiePermission(
    request,
    EXEC_003_DATABASE_ROLES,
    "invoices.qr.read",
    async (session) => {
      const { id } = await params;

      try {
        const invoice = await prisma.invoice.findFirst({
          where: { id, tenantId: session.tenantId },
          select: { qrCode: true, qrImage: true },
        });

        if (!invoice || !invoice.qrCode) {
          return NextResponse.json(
            { error: "QR code not found" },
            { status: 404 },
          );
        }

        if (invoice.qrImage) {
          const base64Data = invoice.qrImage.replace(
            /^data:image\/png;base64,/,
            "",
          );
          const imgBuffer = Buffer.from(base64Data, "base64");
          return new NextResponse(imgBuffer, {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=86400",
            },
          });
        }

        const qrBuffer = await QRCode.toBuffer(invoice.qrCode, {
          width: 300,
          margin: 2,
        });
        const bytes = new Uint8Array(qrBuffer);
        return new NextResponse(bytes, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400",
          },
        });
      } catch (error: any) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "GET /api/v1/invoices/[id]/qr failed",
          error,
          500,
        );
      }
    },
  );
}
