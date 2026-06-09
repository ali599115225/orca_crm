// app/api/v1/offers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const body = await request.json();
    const { linkedOpportunityId, price, validUntil } = body;

    if (!linkedOpportunityId || !price || !validUntil) {
      return NextResponse.json({ error: "الفرصة المرتبطة وسعر العرض وتاريخ الصلاحية مطلوبين." }, { status: 400 });
    }

    const offer = await prisma.offer.create({
      data: {
        tenantId,
        linkedOpportunityId,
        price: Number(price),
        validUntil: new Date(validUntil),
        status: "PENDING",
        documentUrl: `https://orca.az-ez.pro/documents/offer_${linkedOpportunityId}.pdf`,
        createdBy: userId || null,
        updatedBy: userId || null,
      },
    });

    // Telemetry Event
    await prisma.telemetryEvent.create({
      data: {
        tenantId,
        eventType: "offer.sent",
        eventDataJson: JSON.stringify({ offerId: offer.id, opportunityId: linkedOpportunityId, price }),
        createdBy: userId || null,
      },
    });

    // Trigger Warning Simulation: alert when expires in 48h (telemetry/audit log)
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId || null,
        action: "CREATE_OFFER",
        tableName: "offers",
        recordId: offer.id,
        details: `Sent offer of value ${price} valid until ${validUntil}`,
      },
    });

    return NextResponse.json({ success: true, data: offer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
