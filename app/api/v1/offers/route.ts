import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runWithDatabaseSession,
  TENANT_ROLES,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { createOffer } from "@/lib/domain/transaction-spine";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";
import { writeAuditLog } from "@/lib/audit";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function daysUntil(value: Date): number {
  return Math.ceil((value.getTime() - Date.now()) / 86_400_000);
}

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const searchParams = new URL(request.url).searchParams;
      const leadId = searchParams.get("leadId");

      if (leadId && !UUID_REGEX.test(leadId)) {
        return NextResponse.json(
          { success: false, error: "معرف العميل غير صالح." },
          { status: 400 },
        );
      }

      const [offers, opportunities] = await Promise.all([
        prisma.offer.findMany({
          where: {
            tenantId: session.tenantId,
            ...(leadId ? { opportunity: { leadId } } : {}),
          },
          include: {
            opportunity: {
              select: {
                id: true,
                status: true,
                value: true,
                probability: true,
                closeDate: true,
                lead: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
                unit: {
                  select: {
                    id: true,
                    unitNumber: true,
                    priceSar: true,
                    status: true,
                    project: { select: { id: true, name: true } },
                  },
                },
              },
            },
            unit: {
              select: {
                id: true,
                unitNumber: true,
                priceSar: true,
                status: true,
                project: { select: { id: true, name: true } },
              },
            },
            contract: { select: { id: true, status: true } },
            _count: { select: { tours: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
        leadId
          ? Promise.resolve([])
          : prisma.opportunity.findMany({
          where: {
            tenantId: session.tenantId,
            unitId: { not: null },
            status: { notIn: ["WON", "LOST", "CLOSED"] },
          },
          include: {
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            unit: {
              select: {
                id: true,
                unitNumber: true,
                priceSar: true,
                status: true,
                project: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 100,
        }),
      ]);

      const rows = offers.map((offer) => {
        const unit = offer.unit || offer.opportunity.unit;
        const askingPrice = unit ? Number(unit.priceSar) : 0;
        const price = Number(offer.price);
        const expiresInDays = daysUntil(offer.validUntil);
        const effectiveStatus =
          offer.status === "PENDING" && expiresInDays < 0
            ? "EXPIRED"
            : offer.status;

        return {
          id: offer.id,
          status: effectiveStatus,
          storedStatus: offer.status,
          price,
          askingPrice,
          discountAmount: Math.max(0, askingPrice - price),
          discountPercent:
            askingPrice > 0
              ? Math.max(0, ((askingPrice - price) / askingPrice) * 100)
              : 0,
          validUntil: offer.validUntil.toISOString(),
          expiresInDays,
          documentUrl: offer.documentUrl,
          createdAt: offer.createdAt.toISOString(),
          updatedAt: offer.updatedAt.toISOString(),
          opportunityId: offer.opportunity.id,
          opportunityStatus: offer.opportunity.status,
          probability: offer.opportunity.probability,
          closeDate: offer.opportunity.closeDate.toISOString(),
          leadId: offer.opportunity.lead.id,
          customerName: [
            offer.opportunity.lead.firstName,
            offer.opportunity.lead.lastName,
          ]
            .filter(Boolean)
            .join(" "),
          customerPhone: offer.opportunity.lead.phone,
          unitId: unit?.id || null,
          unitNumber: unit?.unitNumber || "—",
          unitStatus: unit?.status || "—",
          projectId: unit?.project.id || null,
          projectName: unit?.project.name || "—",
          contractId: offer.contract?.id || null,
          contractStatus: offer.contract?.status || null,
          tourCount: offer._count.tours,
        };
      });

      const activeStatuses = new Set(["PENDING", "SENT", "NEGOTIATION"]);
      const stats = {
        total: rows.length,
        active: rows.filter((row) => activeStatuses.has(row.status)).length,
        expiringSoon: rows.filter(
          (row) =>
            activeStatuses.has(row.status) &&
            row.expiresInDays >= 0 &&
            row.expiresInDays <= 7,
        ).length,
        accepted: rows.filter((row) => row.status === "ACCEPTED").length,
        converted: rows.filter((row) => Boolean(row.contractId)).length,
        activeValue: rows
          .filter((row) => activeStatuses.has(row.status))
          .reduce((sum, row) => sum + row.price, 0),
      };

      return NextResponse.json({
        success: true,
        data: rows,
        stats,
        opportunities: opportunities
          .filter((opportunity) => Boolean(opportunity.unit))
          .map((opportunity) => ({
            id: opportunity.id,
            status: opportunity.status,
            value: Number(opportunity.value),
            probability: opportunity.probability,
            leadId: opportunity.lead.id,
            customerName: [
              opportunity.lead.firstName,
              opportunity.lead.lastName,
            ]
              .filter(Boolean)
              .join(" "),
            customerPhone: opportunity.lead.phone,
            unitId: opportunity.unit!.id,
            unitNumber: opportunity.unit!.unitNumber,
            unitStatus: opportunity.unit!.status,
            askingPrice: Number(opportunity.unit!.priceSar),
            projectName: opportunity.unit!.project.name,
          })),
      });
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
        const linkedOpportunityId = String(
          body.linkedOpportunityId || "",
        ).trim();
        const unitId = String(body.unitId || "").trim();
        const numericPrice = Number(body.price);
        const validUntil = new Date(body.validUntil);

        if (
          !UUID_REGEX.test(linkedOpportunityId) ||
          !UUID_REGEX.test(unitId)
        ) {
          return NextResponse.json(
            { success: false, error: "الفرصة أو الوحدة غير صالحة." },
            { status: 400 },
          );
        }
        if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
          return NextResponse.json(
            { success: false, error: "سعر العرض غير صالح." },
            { status: 400 },
          );
        }
        if (
          Number.isNaN(validUntil.getTime()) ||
          validUntil.getTime() <= Date.now()
        ) {
          return NextResponse.json(
            {
              success: false,
              error: "يجب أن يكون تاريخ الصلاحية في المستقبل.",
            },
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
        if (!opportunity?.unitId) {
          return NextResponse.json(
            {
              success: false,
              error: "الفرصة والوحدة غير مرتبطتين ضمن الشركة الحالية.",
            },
            { status: 404 },
          );
        }

        const offer = await createOffer({
          tenantId: session.tenantId,
          userId: session.userId,
          opportunityId: opportunity.id,
          unitId: opportunity.unitId,
          price: numericPrice,
          validUntil,
        });

        await writeAuditLog({
          tenantId: session.tenantId,
          userId: session.userId,
          action: "OFFER_CREATED",
          tableName: "offers",
          recordId: offer.id,
          details: JSON.stringify({
            opportunityId: opportunity.id,
            unitId: opportunity.unitId,
            price: numericPrice,
            validUntil: validUntil.toISOString(),
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
