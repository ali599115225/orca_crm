import { httpErrorResponse } from "@/lib/http-error-response";
// app/api/v1/offers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import { createOffer } from "@/lib/domain/transaction-spine";
import { ErrorCode } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const offers = await prisma.offer.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, data: offers });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "GET /api/v1/offers failed", error, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const body = await request.json();
    const { linkedOpportunityId, unitId, price, validUntil } = body;

    if (!linkedOpportunityId || !unitId || !price || !validUntil) {
      return NextResponse.json({ error: "الفرصة المرتبطة والوحدة وسعر العرض وتاريخ الصلاحية مطلوبين." }, { status: 400 });
    }

    const offer = await createOffer({
      tenantId,
      userId: userId || "",
      opportunityId: linkedOpportunityId,
      unitId,
      price: Number(price),
      validUntil: new Date(validUntil),
      documentUrl: `https://orca.az-ez.pro/documents/offer_${linkedOpportunityId}.pdf`,
    });

    return NextResponse.json({ success: true, data: offer }, { status: 201 });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "POST /api/v1/offers failed", error, 500);
  }
}
