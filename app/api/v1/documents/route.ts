import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DOCUMENT_DELETE_ROLES,
  DOCUMENT_READ_ROLES,
  DOCUMENT_UPLOAD_ROLES,
  DocumentAccessError,
  runWithDocumentAccess,
} from "@/lib/documents/access";
import {
  DocumentValidationError,
  inspectDocumentFile,
  sanitizeDocumentName,
} from "@/lib/documents/file-policy";

export const runtime = "nodejs";

const DOCUMENT_TYPES = new Set([
  "CONTRACT",
  "BLUEPRINT",
  "ID",
  "IMAGE",
  "OTHER",
]);

function metadata(document: {
  id: string;
  name: string;
  type: string;
  status: string;
  mimeType: string;
  extension: string;
  size: number;
  ownerName: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document.id,
    name: document.name,
    type: document.type,
    status: document.status,
    mimeType: document.mimeType,
    extension: document.extension,
    size: document.size,
    ownerName: document.ownerName,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
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

function validationMessage(error: DocumentValidationError): string {
  switch (error.code) {
    case "EMPTY_FILE":
      return "الملف فارغ.";
    case "FILE_TOO_LARGE":
      return "حجم الملف يتجاوز 10 ميجابايت.";
    case "UNSAFE_FILE_NAME":
      return "اسم الملف أو امتداده غير آمن.";
    case "INVALID_FILE_TYPE":
    case "FILE_SIGNATURE_MISMATCH":
      return "نوع الملف لا يطابق محتواه أو غير مسموح به.";
  }
}

export async function GET() {
  try {
    return await runWithDocumentAccess(
      DOCUMENT_READ_ROLES,
      async (access) => {
        const documents = await prisma.document.findMany({
          where: { tenantId: access.tenantId },
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            mimeType: true,
            extension: true,
            size: true,
            ownerName: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        });

        return NextResponse.json({
          success: true,
          data: documents.map(metadata),
          permissions: {
            canUpload: DOCUMENT_UPLOAD_ROLES.includes(
              access.role as (typeof DOCUMENT_UPLOAD_ROLES)[number],
            ),
            canDelete: DOCUMENT_DELETE_ROLES.includes(
              access.role as (typeof DOCUMENT_DELETE_ROLES)[number],
            ),
          },
        });
      },
    );
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return accessErrorResponse(error);
    }

    console.error("[DocumentsRepository] list failed", {
      code: "DOCUMENTS_LOAD_FAILED",
    });
    return NextResponse.json(
      {
        success: false,
        code: "DOCUMENTS_LOAD_FAILED",
        error: "تعذر تحميل المستندات.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await runWithDocumentAccess(
      DOCUMENT_UPLOAD_ROLES,
      async (access) => {
        const formData = await request.formData();
        const fileValue = formData.get("file");
        if (!(fileValue instanceof File)) {
          return NextResponse.json(
            {
              success: false,
              code: "DOCUMENT_FILE_REQUIRED",
              error: "اختر ملفًا للرفع.",
            },
            { status: 400 },
          );
        }

        const rawType = String(formData.get("type") || "OTHER")
          .trim()
          .toUpperCase();
        if (!DOCUMENT_TYPES.has(rawType)) {
          return NextResponse.json(
            {
              success: false,
              code: "DOCUMENT_TYPE_INVALID",
              error: "تصنيف المستند غير صالح.",
            },
            { status: 400 },
          );
        }

        const inspected = await inspectDocumentFile(fileValue);
        const requestedName = sanitizeDocumentName(
          String(formData.get("name") || inspected.name),
        );
        if (!requestedName) {
          return NextResponse.json(
            {
              success: false,
              code: "DOCUMENT_NAME_INVALID",
              error: "اسم المستند غير صالح.",
            },
            { status: 400 },
          );
        }

        const created = await prisma.document.create({
          data: {
            tenantId: access.tenantId,
            ownerId: access.userId,
            ownerName: access.name,
            name: requestedName,
            type: rawType,
            status: "READY",
            mimeType: inspected.mimeType,
            extension: inspected.extension,
            size: inspected.size,
            content: Uint8Array.from(inspected.content),
            checksumSha256: inspected.checksumSha256,
          },
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            mimeType: true,
            extension: true,
            size: true,
            ownerName: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return NextResponse.json(
          { success: true, data: metadata(created) },
          { status: 201 },
        );
      },
    );
  } catch (error) {
    if (error instanceof DocumentAccessError) {
      return accessErrorResponse(error);
    }

    if (error instanceof DocumentValidationError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          error: validationMessage(error),
        },
        { status: error.code === "FILE_TOO_LARGE" ? 413 : 400 },
      );
    }

    console.error("[DocumentsRepository] upload failed", {
      code: "DOCUMENT_UPLOAD_FAILED",
    });
    return NextResponse.json(
      {
        success: false,
        code: "DOCUMENT_UPLOAD_FAILED",
        error: "تعذر رفع المستند وحفظه.",
      },
      { status: 500 },
    );
  }
}
