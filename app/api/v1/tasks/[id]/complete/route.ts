// app/api/v1/tasks/[id]/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const task = await prisma.task.findFirst({
      where: { id, tenantId },
    });

    if (!task) {
      return NextResponse.json({ error: "المهمة غير موجودة." }, { status: 404 });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: "COMPLETED",
        updatedBy: userId || null,
        auditLog: `${task.auditLog || ""}\nTask completed at ${new Date().toISOString()}`.trim(),
      },
    });

    return NextResponse.json({ success: true, data: updatedTask });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
