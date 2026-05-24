// app/actions/analytics.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";

export interface AnalyticsSummary {
  totalLeads: number;
  activeBookings: number;
  closedSales: number;
  lostLeads: number;
  conversionRate: string;
  sourcesBreakdown: { source: string; count: number }[];
  citiesBreakdown: { city: string; count: number }[];
  pipelineStages: { status: string; count: number; percentage: number }[];
}

/**
 * حساب وجمع مؤشرات لوحة التحكم العقارية للشركة العقارية الحالية
 */
export async function getAnalyticsDataAction(): Promise<AnalyticsSummary> {
  try {
    const tenant = await getActiveTenant();

    // 1. جلب جميع عملاء الشركة النشطة دفعة واحدة لتحليلهم في السيرفر بشكل سريع
    const leads = await prisma.lead.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        status: true,
        source: true,
        city: true,
      },
    });

    const totalLeads = leads.length;
    
    // تصفية الحجوزات النشطة والعقود المكتملة
    const activeBookings = leads.filter((l) => l.status === "RESERVED").length;
    const closedSales = leads.filter(
      (l) => l.status === "CONTRACT_SIGNED" || l.status === "WON"
    ).length;
    const lostLeads = leads.filter((l) => l.status === "LOST").length;

    // حساب معدل التحويل الكلي
    const successfulDeals = activeBookings + closedSales;
    const conversionRate = totalLeads > 0 
      ? ((successfulDeals / totalLeads) * 100).toFixed(1)
      : "0.0";

    // 2. تحليل مصادر العملاء (Sources Breakdown)
    const sourceMap: Record<string, number> = {};
    leads.forEach((l) => {
      sourceMap[l.source] = (sourceMap[l.source] || 0) + 1;
    });
    const sourcesBreakdown = Object.entries(sourceMap)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    // 3. تحليل جغرافيا المبيعات (Cities Breakdown)
    const cityMap: Record<string, number> = {};
    leads.forEach((l) => {
      cityMap[l.city] = (cityMap[l.city] || 0) + 1;
    });
    const citiesBreakdown = Object.entries(cityMap).map(([city, count]) => ({
      city,
      count,
    }));

    // 4. تتبع تدفق القمع البيعي (Sales Pipeline Stages)
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

    return {
      totalLeads,
      activeBookings,
      closedSales,
      lostLeads,
      conversionRate: `${conversionRate}%`,
      sourcesBreakdown,
      citiesBreakdown,
      pipelineStages,
    };

  } catch (error) {
    console.error("فشل جلب إحصائيات لوحة التحكم:", error);
    return {
      totalLeads: 0,
      activeBookings: 0,
      closedSales: 0,
      lostLeads: 0,
      conversionRate: "0.0%",
      sourcesBreakdown: [],
      citiesBreakdown: [],
      pipelineStages: [],
    };
  }
}