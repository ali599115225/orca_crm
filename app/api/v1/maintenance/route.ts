import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Priority } from "@prisma/client";
import { ErrorCode } from "@/lib/errors";
import { EXEC_003_DATABASE_ROLES } from "@/lib/auth/exec-003-permission-assignments";
import { runWithExec003CookiePermission } from "@/lib/auth/exec-003-shared-guard";

export async function GET(request: NextRequest) {
  return runWithExec003CookiePermission(
    request,
    EXEC_003_DATABASE_ROLES,
    "maintenance.tickets.read",
    async (session) => {
      try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");

        const tickets = await prisma.maintenanceTicket.findMany({
          where: { tenantId: session.tenantId, ...(status ? { status } : {}) },
          orderBy: { createdAt: "desc" },
          take: 100,
        });

        return NextResponse.json({ success: true, tickets });
      } catch (error: any) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "GET /api/v1/maintenance failed",
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
    "maintenance.tickets.create",
    async (session) => {
      try {
        const body = await request.json();
        const {
          title,
          description,
          unitId,
          category,
          priority,
          reportedBy,
          estimatedCost,
        } = body;

        if (!title) {
          return NextResponse.json(
            { error: "العنوان مطلوب." },
            { status: 400 },
          );
        }

        let priorityEnum: Priority = "MEDIUM";
        if (priority === "HIGH") priorityEnum = "HIGH";
        if (priority === "LOW") priorityEnum = "LOW";

        const ticket = await prisma.maintenanceTicket.create({
          data: {
            tenantId: session.tenantId,
            title,
            description: description || "",
            unitId: unitId || null,
            category: category || "other",
            priority: priorityEnum,
            reportedBy: reportedBy || session.userId,
            estimatedCost: estimatedCost || null,
            status: "pending",
          },
        });

        return NextResponse.json(
          { success: true, ticket },
          { status: 201 },
        );
      } catch (error: any) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "POST /api/v1/maintenance failed",
          error,
          500,
        );
      }
    },
  );
}
