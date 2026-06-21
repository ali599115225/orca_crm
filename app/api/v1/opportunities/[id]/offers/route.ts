// app/api/v1/opportunities/[id]/offers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import { createOffer } from "@/lib/domain/transaction-spine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const opportunity = await prisma.opportunity.findFirst({
      where: { id, tenantId },
    });

    if (!opportunity) {
      return NextResponse.json({ error: "الفرصة البيعية غير موجودة." }, { status: 404 });
    }

    const body = await request.json();
    const { price, validUntil } = body;

    if (!opportunity.unitId) {
      return NextResponse.json({ error: "الوحدة العقارية مطلوبة لإنشاء العرض." }, { status: 400 });
    }

    const offerPrice = price ? Number(price) : Number(opportunity.value);
    const validityDate = validUntil ? new Date(validUntil) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    const offer = await createOffer({
      tenantId,
      userId: userId || "",
      opportunityId: id,
      unitId: opportunity.unitId,
      price: offerPrice,
      validUntil: validityDate,
      documentUrl: `https://orca.az-ez.pro/documents/offer_${id}.pdf`,
    });

    return NextResponse.json({ success: true, data: offer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
