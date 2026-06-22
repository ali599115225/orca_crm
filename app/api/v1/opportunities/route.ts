import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import {
  forbiddenResponse,
  hasDatabaseRole,
  requireAuth,
  unauthorizedResponse,
} from "@/lib/api-auth-guard";
import { createOpportunity } from "@/lib/domain/transaction-spine";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const opportunities = await prisma.opportunity.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, data: opportunities });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر تحميل الفرص.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session) return unauthorizedResponse();
    if (!(await hasDatabaseRole(session, ["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE"]))) {
      return forbiddenResponse();
    }
    const { tenantId, userId } = session;

    const body = await request.json();
    const { leadId, value, probability, closeDate, unitId } = body;
    if (!leadId || !value || !unitId) {
      return NextResponse.json(
        { error: "معرف العميل وقيمة الصفقة والوحدة مطلوبون." },
        { status: 400 },
      );
    }
    if (!UUID_REGEX.test(leadId) || !UUID_REGEX.test(unitId)) {
      return NextResponse.json(
        { error: "معرف العميل والوحدة يجب أن يكونا UUID صالحين." },
        { status: 400 },
      );
    }

    const opportunity = await createOpportunity({
      tenantId,
      userId,
      leadId,
      unitId,
      value: Number(value),
      probability: Number(probability || 50),
      closeDate: closeDate ? new Date(closeDate) : undefined,
      correlationId: request.headers.get("x-correlation-id") || undefined,
    });

    return NextResponse.json({ success: true, data: opportunity }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر إنشاء الفرصة.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
