import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runWithDatabaseSession,
  TENANT_ROLES,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { createOpportunity } from "@/lib/domain/transaction-spine";
import { writeAuditLog } from "@/lib/audit";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const leadId = new URL(request.url).searchParams.get("leadId");

      if (leadId && !UUID_REGEX.test(leadId)) {
        return NextResponse.json(
          { success: false, error: "معرف العميل غير صالح." },
          { status: 400 },
        );
      }

      const opportunities = await prisma.opportunity.findMany({
        where: {
          tenantId: session.tenantId,
          ...(leadId ? { leadId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      return NextResponse.json({ success: true, data: opportunities });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "تعذر تحميل الفرص.";
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 },
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return runWithDatabaseSession(
    request,
    TENANT_WRITE_ROLES,
    async (session) => {
      try {
        const body = await request.json();
        const { leadId, value, probability, closeDate, unitId } = body;

        if (!leadId || !value || !unitId) {
          return NextResponse.json(
            {
              success: false,
              error: "معرف العميل وقيمة الصفقة والوحدة مطلوبون.",
            },
            { status: 400 },
          );
        }

        if (!UUID_REGEX.test(leadId) || !UUID_REGEX.test(unitId)) {
          return NextResponse.json(
            {
              success: false,
              error: "معرف العميل والوحدة يجب أن يكونا UUID صالحين.",
            },
            { status: 400 },
          );
        }

        const numericValue = Number(value);
        const numericProbability = Number(probability || 50);
        if (!Number.isFinite(numericValue) || numericValue <= 0) {
          return NextResponse.json(
            { success: false, error: "قيمة الصفقة غير صالحة." },
            { status: 400 },
          );
        }
        if (
          !Number.isFinite(numericProbability) ||
          numericProbability < 1 ||
          numericProbability > 100
        ) {
          return NextResponse.json(
            { success: false, error: "احتمالية الصفقة غير صالحة." },
            { status: 400 },
          );
        }

        const parsedCloseDate = closeDate ? new Date(closeDate) : undefined;
        if (parsedCloseDate && Number.isNaN(parsedCloseDate.getTime())) {
          return NextResponse.json(
            { success: false, error: "تاريخ الإغلاق غير صالح." },
            { status: 400 },
          );
        }

        const opportunity = await createOpportunity({
          tenantId: session.tenantId,
          userId: session.userId,
          leadId,
          unitId,
          value: numericValue,
          probability: numericProbability,
          closeDate: parsedCloseDate,
          correlationId:
            request.headers.get("x-correlation-id") || undefined,
        });

        await writeAuditLog({
          tenantId: session.tenantId,
          userId: session.userId,
          action: "LEAD_OPPORTUNITY_CREATED",
          tableName: "leads",
          recordId: leadId,
          details: JSON.stringify({
            opportunityId: opportunity.id,
            unitId,
            value: numericValue,
          }),
        });

        return NextResponse.json(
          { success: true, data: opportunity },
          { status: 201 },
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "تعذر إنشاء الفرصة.";
        const status = /not found/i.test(message) ? 404 : 400;
        return NextResponse.json(
          { success: false, error: message },
          { status },
        );
      }
    },
  );
}
