import { httpErrorResponse } from "@/lib/http-error-response";
// app/api/v1/contacts/[id]/notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import { ErrorCode } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const body = await request.json();
    const { note } = body;

    if (!note) {
      return NextResponse.json({ error: "محتوى الملاحظة مطلوب." }, { status: 400 });
    }

    const contact = await prisma.contact.findFirst({
      where: { id, tenantId },
    });

    if (!contact) {
      return NextResponse.json({ error: "جهة الاتصال غير موجودة." }, { status: 404 });
    }

    const updatedContact = await prisma.contact.update({
      where: { id },
      data: {
        notes: `${contact.notes || ""}\n[Note at ${new Date().toISOString()}]: ${note}`.trim(),
        updatedBy: userId || null,
        auditLog: `${contact.auditLog || ""}\nAdded note at ${new Date().toISOString()}`.trim(),
      },
    });

    return NextResponse.json({ success: true, data: updatedContact });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "POST /api/v1/contacts/[id]/notes failed", error, 500);
  }
}
