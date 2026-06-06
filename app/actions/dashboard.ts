// app/actions/dashboard.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";

export interface PipelineStage {
  key: string;
  labelAr: string;
  labelEn: string;
  count: number;
  color: string;
  statuses: string[];
}

export interface TodayTask {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
  leadName: string | null;
  assignedName: string | null;
}

export async function getPipelineStatsAction(): Promise<PipelineStage[]> {
  try {
    const tenant = await getActiveTenant();

    const stageDefs: Omit<PipelineStage, 'count'>[] = [
      { key: "inquiry", labelAr: "استفسار", labelEn: "Inquiry", color: "#3B82F6", statuses: ["NEW", "CONTACTED"] },
      { key: "tour", labelAr: "جولة", labelEn: "Tour", color: "#F59E0B", statuses: ["VISIT_SCHEDULED", "VISITED"] },
      { key: "offer", labelAr: "عرض", labelEn: "Offer", color: "#8B5CF6", statuses: ["OFFER_MADE", "RESERVED"] },
      { key: "close", labelAr: "إغلاق", labelEn: "Close", color: "#10B981", statuses: ["CONTRACT_SIGNED", "WON"] },
    ];

    const counts = await Promise.all(
      stageDefs.map(stage =>
        prisma.lead.count({
          where: {
            tenantId: tenant.id,
            status: { in: stage.statuses as any },
          },
        })
      )
    );

    return stageDefs.map((stage, i) => ({ ...stage, count: counts[i] }));
  } catch (error) {
    console.error("فشل جلب إحصائيات الـ Pipeline:", error);
    return [];
  }
}

export async function getTodayTasksAction(): Promise<TodayTask[]> {
  try {
    const tenant = await getActiveTenant();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const tasks = await prisma.task.findMany({
      where: {
        tenantId: tenant.id,
        status: "PENDING",
        dueDate: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        lead: { select: { firstName: true, lastName: true } },
        assignedUser: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    return tasks.map(t => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate.toISOString(),
      priority: t.priority,
      leadName: t.lead ? `${t.lead.firstName} ${t.lead.lastName ?? ""}`.trim() : null,
      assignedName: t.assignedUser?.name ?? null,
    }));
  } catch (error) {
    console.error("فشل جلب مهام اليوم:", error);
    return [];
  }
}
