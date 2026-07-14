import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DOCUMENT_DELETE_ROLES,
  DOCUMENT_READ_ROLES,
  DocumentAccessError,
  runWithDocumentAccess,
} from "@/lib/documents/access";

export const runtime = "nodejs";

function contentDisposition(name: string, download: boolean): string {
  const fallback =
    name
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/["\\]/g, "_")
      .slice(0, 120) || "document";
  return `${download ? "attachment" : "inline"}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

function accessErrorResponse(error: DocumentAccessError) {
  return NextResponse.json(
    {
      success: false,
      code: error.code,
      error:
        error.status === 401
          ? "انتهت الجلسة أو تعذر التحقق من المستخدم."
          : "لا تملك الصلاحية المطلوبة.",
    },
    { status: error.status },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await runWithDocumentAccess(
      DOCUMENT_READ_ROLES,
      async (access) => {
        const { id } = await params;
        const document = await prisma.document.findFirst({
          where: { id, tenantId: access.tenantId },
          select: {
            name: true,
            mimeType: true,
            size: true,
            content: true,
          },
        });

        if (!document) {
          return NextResponse.json(
            {
              success: false,
              code: "DOCUMENT_NOT_FOUND",
              error: "المستند غير موجود.",
            },
            { status: 404 },
          );
        }

        const download = request.nextUrl.searchParams.get("download") === "1";
        return new NextResponse(new Uint8Array(document.content), {
          status: 200,
          headers: {
            "Content-Type": document.mimeType,
            "Content-Length": String(document.size),
            "Content-Disposition": contentDisposition(document.name, download),
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store, max-age=0",
            "Content-Security-Policy":
              "default-src 'none'; sandbox; style-src 'unsafe-inline'; img-src 'self' data: blob:",
          },
        });
      },
    );
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return accessErrorResponse(error);
    }

    console.error("[DocumentsRepository] open failed", {
      code: "DOCUMENT_OPEN_FAILED",
    });
    return NextResponse.json(
      {
        success: false,
        code: "DOCUMENT_OPEN_FAILED",
        error: "تعذر فتح المستند.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await runWithDocumentAccess(
      DOCUMENT_DELETE_ROLES,
      async (access) => {
        const { id } = await params;
        const existing = await prisma.document.findFirst({
          where: { id, tenantId: access.tenantId },
          select: { id: true },
        });
        if (!existing) {
          return NextResponse.json(
            {
              success: false,
              code: "DOCUMENT_NOT_FOUND",
              error: "المستند غير موجود.",
            },
            { status: 404 },
          );
        }

        const deleted = await prisma.document.deleteMany({
          where: { id, tenantId: access.tenantId },
        });
        if (deleted.count !== 1) {
          return NextResponse.json(
            {
              success: false,
              code: "DOCUMENT_DELETE_CONFLICT",
              error: "تعذر حذف المستند بسبب تعارض متزامن.",
            },
            { status: 409 },
          );
        }

        return NextResponse.json({
          success: true,
          message: "تم حذف المستند.",
        });
      },
    );
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return accessErrorResponse(error);
    }

    console.error("[DocumentsRepository] delete failed", {
      code: "DOCUMENT_DELETE_FAILED",
    });
    return NextResponse.json(
      {
        success: false,
        code: "DOCUMENT_DELETE_FAILED",
        error: "تعذر حذف المستند.",
      },
      { status: 500 },
    );
  }
}
