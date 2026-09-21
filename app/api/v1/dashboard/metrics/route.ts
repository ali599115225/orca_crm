// app/api/v1/dashboard/metrics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      console.warn(`[UNAUTHORIZED] /api/v1/dashboard/metrics - IP: ${request.headers.get("x-forwarded-for") || "unknown"}`);
      return NextResponse.json(
        { error: "غير مصرح بالوصول: يرجى تسجيل الدخول أولاً." },
        { status: 401 }
      );
    }
    const companyId = session.tenantId as string;

    const leads = await prisma.lead.findMany({
      where: { tenantId: companyId },
      select: {
        id: true,
        status: true,
        source: true,
        city: true,
      },
    });

    const totalLeads = leads.length;
    
    const activeBookings = leads.filter((l) => l.status === "RESERVED").length;
    const closedSales = leads.filter(
      (l) => l.status === "CONTRACT_SIGNED" || l.status === "WON"
    ).length;
    const lostLeads = leads.filter((l) => l.status === "LOST").length;

    const successfulDeals = activeBookings + closedSales;
    const conversionRateVal = totalLeads > 0 
      ? ((successfulDeals / totalLeads) * 100).toFixed(1)
      : "0.0";

    const sourceMap: Record<string, number> = {};
    leads.forEach((l) => {
      sourceMap[l.source] = (sourceMap[l.source] || 0) + 1;
    });
    const sourcesBreakdown = Object.entries(sourceMap)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    const cityMap: Record<string, number> = {};
    leads.forEach((l) => {
      cityMap[l.city] = (cityMap[l.city] || 0) + 1;
    });
    const citiesBreakdown = Object.entries(cityMap)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);

    const statusOrder = [
      { key: "NEW", label: "عميل جديد" },
      { key: "CONTACTED", label: "تم التواصل" },
      { key: "VISIT_SCHEDULED", label: "مجدول للزيارة" },
      { key: "VISITED", label: "تمت الزيارة" },
      { key: "RESERVED", label: "حجز مبدئي" },
      { key: "CONTRACT_SIGNED", label: "توقيع العقد" },
    ];

    const pipelineStages = statusOrder.map((stage) => {
      const count = leads.filter((l) => l.status === stage.key).length;
      const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
      return {
        status: stage.label,
        count,
        percentage,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        totalLeads,
        activeBookings,
        closedSales,
        lostLeads,
        conversionRate: `${conversionRateVal}%`,
        sourcesBreakdown,
        citiesBreakdown,
        pipelineStages,
      }
    });

  } catch (error: any) {
    console.error("Failed to fetch tenant isolated dashboard metrics:", error.message);
    return NextResponse.json(
      { error: "حدث خطأ داخلي أثناء معالجة وحساب المؤشرات العقارية." },
      { status: 500 }
    );
  }
}
