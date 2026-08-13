import { httpErrorResponse } from "@/lib/http-error-response";
// app/api/v1/reports/leads-performance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import { ErrorCode } from "@/lib/errors";

const CLOSED_LEAD_STATUSES = ["CONTRACT_SIGNED", "WON"] as const;

function countFor(
  rows: Array<{ status: string; _count: { _all: number } }>,
  statuses: readonly string[],
) {
  return rows
    .filter((row) => statuses.includes(String(row.status)))
    .reduce((sum, row) => sum + row._count._all, 0);
}

function averageCloseDays(
  rows: Array<{ createdAt: Date; closedAt: Date | null }>,
) {
  const timed = rows.filter((row) => row.closedAt instanceof Date);
  if (timed.length === 0) return null;

  const totalDays = timed.reduce((sum, row) => {
    const ms = row.closedAt!.getTime() - row.createdAt.getTime();
    return sum + ms / (1000 * 60 * 60 * 24);
  }, 0);

  return Number((totalDays / timed.length).toFixed(2));
}

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const [statusRows, closedOpportunities] = await Promise.all([
      prisma.lead.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: { _all: true },
      }),
      prisma.opportunity.findMany({
        where: { tenantId, status: "CLOSED_WON" },
        select: { createdAt: true, closeDate: true },
      }),
    ]);

    const totalLeads = statusRows.reduce((sum, row) => sum + row._count._all, 0);
    const closedLeadCount = countFor(statusRows, CLOSED_LEAD_STATUSES);
    const wonOpportunities = closedOpportunities.length;
    const conversionRatio =
      totalLeads > 0 ? Math.round((closedLeadCount / totalLeads) * 100) : 0;

    // Lead has no close-timing column; only persisted opportunity closeDate is used.
    const avgTimeToCloseDays = averageCloseDays(
      closedOpportunities.map((opportunity) => ({
        createdAt: opportunity.createdAt,
        closedAt: opportunity.closeDate,
      })),
    );

    return NextResponse.json({
      success: true,
      data: {
        totalLeads,
        closedLeads: closedLeadCount,
        wonOpportunities,
        conversionRatio,
        cacSar: null,
        avgTimeToCloseDays,
        funnel: {
          new: countFor(statusRows, ["NEW"]),
          contacted: countFor(statusRows, ["CONTACTED"]),
          qualified: countFor(statusRows, ["QUALIFIED"]),
          tourScheduled: countFor(statusRows, ["VISIT_SCHEDULED"]),
          offerSent: countFor(statusRows, ["OFFER_MADE"]),
          closed: closedLeadCount,
        },
      },
    });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "GET /api/v1/reports/leads-performance failed", error, 500);
  }
}
