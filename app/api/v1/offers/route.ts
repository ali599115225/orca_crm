import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runWithDatabaseSession,
  TENANT_ROLES,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { createOffer } from "@/lib/domain/transaction-spine";
import { ErrorCode } from "@/lib/errors";
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

      const offers = await prisma.offer.findMany({
        where: {
          tenantId: session.tenantId,
          ...(leadId ? { opportunity: { leadId } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      return NextResponse.json({ success: true, data: offers });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "GET /api/v1/offers failed",
        error,
        500,
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
        const { linkedOpportunityId, unitId, price, validUntil } = body;

        if (!linkedOpportunityId || !unitId || !price || !validUntil) {
          return NextResponse.json(
            {
              success: false,
              error:
                "الفرصة المرتبطة والوحدة وسعر العرض وتاريخ الصلاحية مطلوبون.",
            },
            { status: 400 },
          );
        }

        if (
          !UUID_REGEX.test(linkedOpportunityId) ||
          !UUID_REGEX.test(unitId)
        ) {
          return NextResponse.json(
            { success: false, error: "معرف الفرصة أو الوحدة غير صالح." },
            { status: 400 },
          );
        }

        const opportunity = await prisma.opportunity.findFirst({
          where: {
            id: linkedOpportunityId,
            tenantId: session.tenantId,
            unitId,
          },
          select: { id: true, leadId: true, unitId: true },
        });
        if (!opportunity) {
          return NextResponse.json(
            {
              success: false,
              error: "الفرصة أو الوحدة غير موجودة ضمن هذه المنشأة.",
            },
            { status: 404 },
          );
        }

        const numericPrice = Number(price);
        const validityDate = new Date(validUntil);
        if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
          return NextResponse.json(
            { success: false, error: "سعر العرض غير صالح." },
            { status: 400 },
          );
        }
        if (Number.isNaN(validityDate.getTime())) {
          return NextResponse.json(
            { success: false, error: "تاريخ صلاحية العرض غير صالح." },
            { status: 400 },
          );
        }

        const offer = await createOffer({
          tenantId: session.tenantId,
          userId: session.userId,
          opportunityId: opportunity.id,
          unitId: opportunity.unitId!,
          price: numericPrice,
          validUntil: validityDate,
        });

        await writeAuditLog({
          tenantId: session.tenantId,
          userId: session.userId,
          action: "LEAD_OFFER_CREATED",
          tableName: "leads",
          recordId: opportunity.leadId,
          details: JSON.stringify({
            opportunityId: opportunity.id,
            offerId: offer.id,
            unitId: opportunity.unitId,
          }),
        });

        return NextResponse.json(
          { success: true, data: offer },
          { status: 201 },
        );
      } catch (error: unknown) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "POST /api/v1/offers failed",
          error,
          500,
        );
      }
    },
  );
}
