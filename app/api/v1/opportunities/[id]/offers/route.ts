import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runWithDatabaseSession,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { createOffer } from "@/lib/domain/transaction-spine";
import { ErrorCode } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithDatabaseSession(
    request,
    TENANT_WRITE_ROLES,
    async (session) => {
      try {
        const { id } = await params;

        const opportunity = await prisma.opportunity.findFirst({
          where: { id, tenantId: session.tenantId },
          select: {
            id: true,
            leadId: true,
            unitId: true,
            value: true,
          },
        });

        if (!opportunity) {
          return NextResponse.json(
            { success: false, error: "الفرصة البيعية غير موجودة." },
            { status: 404 },
          );
        }

        const body = await request.json();
        const { price, validUntil } = body;

        if (!opportunity.unitId) {
          return NextResponse.json(
            {
              success: false,
              error: "الوحدة العقارية مطلوبة لإنشاء العرض.",
            },
            { status: 400 },
          );
        }

        const offerPrice = price ? Number(price) : Number(opportunity.value);
        if (!Number.isFinite(offerPrice) || offerPrice <= 0) {
          return NextResponse.json(
            { success: false, error: "سعر العرض غير صالح." },
            { status: 400 },
          );
        }

        const validityDate = validUntil
          ? new Date(validUntil)
          : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
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
          unitId: opportunity.unitId,
          price: offerPrice,
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
          "POST /api/v1/opportunities/[id]/offers failed",
          error,
          500,
        );
      }
    },
  );
}
