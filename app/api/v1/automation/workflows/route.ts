import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ErrorCode } from "@/lib/errors";
import { EXEC_003_DATABASE_ROLES } from "@/lib/auth/exec-003-permission-assignments";
import { runWithExec003CookiePermission } from "@/lib/auth/exec-003-shared-guard";

export async function GET(request: NextRequest) {
  return runWithExec003CookiePermission(
    request,
    EXEC_003_DATABASE_ROLES,
    "automation.workflows.read",
    async (session) => {
      try {
        const workflows = await prisma.automationWorkflow.findMany({
          where: { tenantId: session.tenantId },
          orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ success: true, data: workflows });
      } catch (error: any) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "GET /api/v1/automation/workflows failed",
          error,
          500,
        );
      }
    },
  );
}

export async function POST(request: NextRequest) {
  return runWithExec003CookiePermission(
    request,
    EXEC_003_DATABASE_ROLES,
    "automation.workflows.create",
    async (session) => {
      try {
        const body = await request.json();
        const { name, triggerEvent, actionsJson, isActive } = body;

        if (!name || !triggerEvent || !actionsJson) {
          return NextResponse.json(
            { error: "الاسم والحدث المشغل والإجراءات مطلوبة." },
            { status: 400 },
          );
        }

        const workflow = await prisma.automationWorkflow.create({
          data: {
            tenantId: session.tenantId,
            name,
            triggerEvent,
            actionsJson:
              typeof actionsJson === "string"
                ? actionsJson
                : JSON.stringify(actionsJson),
            isActive: isActive !== undefined ? isActive : true,
            createdBy: session.userId,
            updatedBy: session.userId,
          },
        });

        return NextResponse.json(
          { success: true, data: workflow },
          { status: 201 },
        );
      } catch (error: any) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "POST /api/v1/automation/workflows failed",
          error,
          500,
        );
      }
    },
  );
}
