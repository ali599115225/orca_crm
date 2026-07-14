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
            auditLog: true,
          },
        });

        if (!task) {
          return NextResponse.json(
            { success: false, error: "المهمة غير موجودة." },
            { status: 404 },
          );
        }

        const updatedTask = await prisma.task.update({
          where: { id: task.id, tenantId: session.tenantId },
          data: {
            status: "COMPLETED",
            updatedBy: session.userId,
            auditLog:
              `${task.auditLog || ""}\nTask completed at ${new Date().toISOString()}`.trim(),
          },
        });

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

