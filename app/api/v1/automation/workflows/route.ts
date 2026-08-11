import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma, rawPrisma } from "@/lib/prisma";
import { ErrorCode } from "@/lib/errors";
import { EXEC_003_DATABASE_ROLES } from "@/lib/auth/exec-003-permission-assignments";
import { runWithExec003CookiePermission } from "@/lib/auth/exec-003-shared-guard";
import {
  ORGANIZATION_PERMISSION_KEYS,
  type OrganizationPermissionKey,
} from "@/lib/organization/contracts";
import { WorkflowCommunicationService } from "@/lib/workflow-communication/service";
import { SqlWorkflowCommunicationRepository } from "@/lib/workflow-communication/sql-repository";

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
        const {
          name,
          triggerEvent,
          actionsJson,
          isActive,
          approvalRequired = false,
          approvalPermission = null,
          scope = {},
        } = body;

        if (!name || !triggerEvent || !actionsJson) {
          return NextResponse.json(
            { error: "الاسم والحدث المشغل والإجراءات مطلوبة." },
            { status: 400 },
          );
        }

        let normalizedApprovalPermission: OrganizationPermissionKey | null = null;
        if (approvalRequired) {
          if (
            typeof approvalPermission !== "string" ||
            !ORGANIZATION_PERMISSION_KEYS.includes(
              approvalPermission as OrganizationPermissionKey,
            )
          ) {
            return NextResponse.json(
              { error: "صلاحية الاعتماد المحددة غير صالحة." },
              { status: 400 },
            );
          }
          normalizedApprovalPermission = approvalPermission as OrganizationPermissionKey;
        }

        let actions: unknown = actionsJson;
        if (typeof actionsJson === "string") {
          try {
            actions = JSON.parse(actionsJson);
          } catch {
            return NextResponse.json(
              { error: "صيغة إجراءات سير العمل غير صالحة." },
              { status: 400 },
            );
          }
        }

        const result = await rawPrisma.$transaction(async (tx) => {
          const workflow = await tx.automationWorkflow.create({
            data: {
              tenantId: session.tenantId,
              name,
              triggerEvent,
              actionsJson: JSON.stringify(actions),
              isActive: isActive !== undefined ? Boolean(isActive) : true,
              createdBy: session.userId,
              updatedBy: session.userId,
            },
          });

          const service = new WorkflowCommunicationService(
            new SqlWorkflowCommunicationRepository(tx),
          );
          const version = await service.publishWorkflowVersion({
            actor: {
              tenantId: session.tenantId,
              userId: session.userId,
              assignments: [],
            },
            workflowId: workflow.id,
            triggerEvent,
            actions,
            approvalRequired: Boolean(approvalRequired),
            approvalPermission: normalizedApprovalPermission,
            resource: {
              tenantId: session.tenantId,
              branchId:
                typeof scope.branchId === "string" ? scope.branchId : null,
              departmentId:
                typeof scope.departmentId === "string" ? scope.departmentId : null,
              teamId:
                typeof scope.teamId === "string" ? scope.teamId : null,
              resourceType:
                typeof scope.resourceType === "string"
                  ? scope.resourceType
                  : "AUTOMATION_WORKFLOW",
              resourceId:
                typeof scope.resourceId === "string" ? scope.resourceId : workflow.id,
            },
          });

          return { workflow, version };
        });

        return NextResponse.json(
          { success: true, data: result.workflow, version: result.version },
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
