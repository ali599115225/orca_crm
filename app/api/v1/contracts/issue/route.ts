import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDatabaseSession } from "@/lib/api-auth-guard";
import { CONTRACT_WRITER_ROLES } from "@/lib/auth/contract-access-policy";
import { issueContract } from "@/lib/domain/transaction-spine";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireDatabaseSession(request, CONTRACT_WRITER_ROLES);
    if (auth.error) return auth.error;
    const { tenantId } = auth.session;

    const [leads, contacts, units] = await Promise.all([
      prisma.lead.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        select: { id: true, firstName: true, lastName: true, phone: true },
      }),
      prisma.contact.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, phone: true },
      }),
      prisma.unit.findMany({
        where: { tenantId },
        include: { project: { select: { name: true } }, contract: true },
        orderBy: [{ project: { name: "asc" } }, { unitNumber: "asc" }],
      }),
    ]);

    return NextResponse.json({
      success: true,
      clients: [
        ...leads.map((lead) => ({
          id: lead.id,
          name: `${lead.firstName} ${lead.lastName || ""}`.trim(),
          phone: lead.phone,
          type: "lead",
        })),
        ...contacts.map((contact) => ({
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          type: "contact",
        })),
      ],
      properties: units
        .filter((unit) => !unit.contract)
        .map((unit) => ({
          id: unit.id,
          unitNumber: unit.unitNumber,
          priceSar: Number(unit.priceSar),
          status: unit.status,
          projectName: unit.project.name,
        })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر جلب بيانات العقد.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireDatabaseSession(request, CONTRACT_WRITER_ROLES);
    if (auth.error) return auth.error;
    const { tenantId, userId } = auth.session;
    const body = await request.json();
    const { clientId, propertyId, amount } = body;

    if (!clientId || !propertyId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "العميل والوحدة وقيمة العقد الصحيحة مطلوبة." }, { status: 400 });
    }

    const contract = await issueContract({
      tenantId,
      userId,
      clientId,
      propertyId,
      amount: Number(amount),
    });

    return NextResponse.json({
      success: true,
      contract: {
        id: contract.id,
        buyerName: contract.buyerName,
        buyerPhone: contract.buyerPhone,
        totalVolumeSar: Number(contract.totalVolumeSar),
        status: contract.status,
        acceptedAt: contract.acceptedAt.toISOString(),
        reservationExpiresAt: contract.reservationExpiresAt?.toISOString() || null,
        signedAt: contract.signedAt?.toISOString() || null,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر إنشاء مسودة العقد.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
