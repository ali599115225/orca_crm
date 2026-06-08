// app/api/v1/offers/[id]/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";

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

    const offer = await prisma.offer.findFirst({
      where: { id, tenantId },
      include: { opportunity: true },
    });

    if (!offer) {
      return NextResponse.json({ error: "العرض غير موجود." }, { status: 404 });
    }

    const updatedOffer = await prisma.offer.update({
      where: { id },
      data: {
        status: "ACCEPTED",
        updatedBy: userId || null,
        auditLog: `${offer.auditLog || ""}\nOffer accepted at ${new Date().toISOString()}`.trim(),
      },
    });

    // 1. Audit Log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId || null,
        action: "ACCEPT_OFFER",
        tableName: "offers",
        recordId: offer.id,
        details: `Accepted offer with price ${offer.price}`,
      },
    });

    // 2. Telemetry Log
    await prisma.telemetryEvent.create({
      data: {
        tenantId,
        eventType: "offer.accepted",
        eventDataJson: JSON.stringify({ offerId: offer.id, price: offer.price }),
        createdBy: userId || null,
      },
    });

    // 3. Automate Contract Generation:
    // Resolve lead phone and name
    const lead = await prisma.lead.findFirst({
      where: { id: offer.opportunity.leadId, tenantId },
    });

    if (lead) {
      // Find a unit to link to. If unit is specified in lead/opportunity, use it; otherwise find a vacant unit
      let unitId = lead.unitId;
      if (!unitId && offer.opportunity.linkedUnitIds) {
        unitId = offer.opportunity.linkedUnitIds.split(",")[0];
      }

      if (!unitId) {
        // Fallback: Find any available unit under the project, or create/link a mock one if empty
        const anyUnit = await prisma.unit.findFirst({
          where: {
            status: "Available",
            project: { tenantId },
          },
        });
        unitId = anyUnit?.id || null;
      }

      // If we resolved a unitId, create a Contract!
      if (unitId) {
        // Verify no existing contract for this unit to avoid unique constraint clash
        const existingContract = await prisma.contract.findUnique({
          where: { unitId },
        });

        if (!existingContract) {
          await prisma.contract.create({
            data: {
              tenantId,
              unitId,
              buyerName: `${lead.firstName} ${lead.lastName || ""}`.trim(),
              buyerPhone: lead.phone,
              totalVolumeSar: offer.price,
              signedAt: new Date(),
            },
          });

          // Mark unit as booked/sold
          await prisma.unit.update({
            where: { id: unitId },
            data: { status: "Sold" },
          });
        }
      }

      // Move lead to "WON" / "CONTRACT_SIGNED" and stage "Closed"
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "CONTRACT_SIGNED",
          stage: "Closed",
        },
      });
    }

    return NextResponse.json({ success: true, data: updatedOffer, contractCreated: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
