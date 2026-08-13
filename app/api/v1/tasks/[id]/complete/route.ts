import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runWithDatabaseSession,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { ErrorCode } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithDatabaseSession(
    request,
    TENANT_WRITE_ROLES,
    async (session) => {
      try {
        const { id } = await params;
        const task = await prisma.task.findFirst({
          where: { id, tenantId: session.tenantId },
          select: {
            id: true,
            tenantId: true,
            leadId: true,
            status: true,
            assignedTo: true,
            auditLog: true,
          },
        });

        if (!task) {
          return NextResponse.json(
            { success: false, error: "المهمة غير موجودة." },
            { status: 404 },
          );
        }

        if (task.status === "COMPLETED") {
          return NextResponse.json(
            { success: false, error: "لا يمكن إعادة فتح مهمة مكتملة." },
            { status: 409 },
          );
        }

        if (task.status !== "PENDING" && task.status !== "OVERDUE") {
          return NextResponse.json(
            { success: false, error: "لا يمكن إكمال هذه المهمة." },
            { status: 409 },
          );
        }

        if (session.userId === task.assignedTo) {
          return NextResponse.json(
            { success: false, error: "لا يمكن للمسند إليه إغلاق مهمته بنفسه." },
            { status: 403 },
          );
        }

        const claimed = await prisma.task.updateMany({
          where: {
            id: task.id,
            tenantId: session.tenantId,
            status: { in: ["PENDING", "OVERDUE"] },
            assignedTo: task.assignedTo,
          },
          data: {
            status: "COMPLETED",
            updatedBy: session.userId,
            auditLog:
              `${task.auditLog || ""}\nTask completed at ${new Date().toISOString()}`.trim(),
          },
        });

        if (claimed.count !== 1) {
          return NextResponse.json(
            { success: false, error: "تم إكمال المهمة أو إعادة إسنادها بواسطة طلب آخر." },
            { status: 409 },
          );
        }

        const updatedTask = await prisma.task.findFirst({
          where: { id: task.id, tenantId: session.tenantId },
        });
        if (!updatedTask) {
          return NextResponse.json(
            { success: false, error: "المهمة غير موجودة." },
            { status: 404 },
          );
        }

        await writeAuditLog({
          tenantId: session.tenantId,
          userId: session.userId,
          action: "TASK_COMPLETED",
          tableName: "tasks",
          recordId: task.id,
          details: JSON.stringify({
            leadId: task.leadId,
            from: task.status,
            to: "COMPLETED",
          }),
        });

        return NextResponse.json({ success: true, data: updatedTask });
      } catch (error: unknown) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "PATCH /api/v1/tasks/[id]/complete failed",
          error,
          500,
        );
      }
    },
  );
}
