import "server-only";

import { fetchWhatsAppDashboardStats } from "@/app/actions/whatsapp-crm";
import { prisma } from "@/lib/prisma";
import { runWithTenantContext } from "@/lib/tenant-context";
import type {
  DashboardDataState,
  DashboardLeadItem,
  DashboardPipelineData,
  DashboardReadModel,
  DashboardTaskItem,
  DashboardWhatsAppData,
} from "../model";
import {
  buildPipelineStages,
  type LegacyOpportunitySnapshot,
} from "../pipeline";
import {
  getRiyadhDayRange,
  getRiyadhMonthRange,
  getRiyadhWeekStart,
} from "../timezone";

const DASHBOARD_PREVIEW_LIMIT = 5;
const ACTIVE_TASK_STATUSES = ["PENDING", "OVERDUE"] as const;

function ready<T>(data: T): DashboardDataState<T> {
  return { status: "ready", data };
}

function failed<T>(): DashboardDataState<T> {
  return { status: "error", data: null, code: "DATA_UNAVAILABLE" };
}

async function capture<T>(
  label: string,
  operation: () => Promise<T>,
): Promise<DashboardDataState<T>> {
  try {
    return ready(await operation());
  } catch (error) {
    console.error(`[DashboardReadModel] ${label} failed`, error);
    return failed<T>();
  }
}

function taskPriorityRank(priority: string): number {
  if (priority === "HIGH") return 0;
  if (priority === "MEDIUM") return 1;
  return 2;
}

export async function getDashboardReadModel(
  tenantId: string,
  now = new Date(),
): Promise<DashboardReadModel> {
  const day = getRiyadhDayRange(now);
  const month = getRiyadhMonthRange(now);
  const weekStart = getRiyadhWeekStart(now);

  return runWithTenantContext({ tenantId }, async () => {
    const [
      activeLeads,
      todayTours,
      activeOffers,
      signedContractsThisMonth,
      pipeline,
      tasks,
      recentLeads,
      whatsapp,
    ] = await Promise.all([
      capture<number>("active leads", () =>
        prisma.lead.count({
          where: { tenantId, isArchived: false },
        }),
      ),
      capture<number>("today tours", () =>
        prisma.tour.count({
          where: {
            tenantId,
            startAt: { gte: day.start, lt: day.end },
            status: { not: "CANCELLED" },
          },
        }),
      ),
      capture<number>("active offers", () =>
        prisma.offer.count({
          where: {
            tenantId,
            status: "PENDING",
            validUntil: { gte: now },
          },
        }),
      ),
      capture<number>("signed contracts", () =>
        prisma.contract.count({
          where: {
            tenantId,
            status: "SIGNED",
            signedAt: { gte: month.start, lt: month.end },
          },
        }),
      ),
      capture<DashboardPipelineData>("deal pipeline", async () => {
        const [passports, legacyOpportunities] = await Promise.all([
          prisma.dealPassport.findMany({
            where: { tenantId, status: { not: "CANCELLED" } },
            select: { status: true },
          }),
          prisma.opportunity.findMany({
            where: {
              tenantId,
              status: { not: "LOST" },
              dealPassport: { is: null },
            },
            select: {
              status: true,
              tours: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { status: true, startAt: true },
              },
              offers: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: {
                  status: true,
                  validUntil: true,
                  createdAt: true,
                  contract: {
                    select: {
                      status: true,
                      signedAt: true,
                      cancelledAt: true,
                    },
                  },
                },
              },
            },
          }),
        ]);

        const projection = buildPipelineStages(
          passports.map((passport: { status: string }) => passport.status),
          legacyOpportunities as LegacyOpportunitySnapshot[],
          now,
        );
        const total = projection.stages.reduce(
          (sum, stage) => sum + stage.count,
          0,
        );

        return { ...projection, total };
      }),
      capture<{ items: DashboardTaskItem[]; total: number }>("daily tasks", async () => {
        const [rows, total] = await Promise.all([
          prisma.task.findMany({
            where: {
              tenantId,
              status: { in: [...ACTIVE_TASK_STATUSES] },
              dueDate: { lt: day.end },
            },
            orderBy: { dueDate: "asc" },
            take: 50,
            select: {
              id: true,
              title: true,
              dueDate: true,
              priority: true,
              status: true,
              lead: {
                select: { firstName: true, lastName: true },
              },
              assignedUser: { select: { name: true } },
            },
          }),
          prisma.task.count({
            where: {
              tenantId,
              status: { in: [...ACTIVE_TASK_STATUSES] },
              dueDate: { lt: day.end },
            },
          }),
        ]);

        const items: DashboardTaskItem[] = rows
          .map((task: {
            id: string;
            title: string;
            dueDate: Date;
            priority: "LOW" | "MEDIUM" | "HIGH";
            status: "PENDING" | "COMPLETED" | "OVERDUE";
            lead: { firstName: string; lastName: string | null } | null;
            assignedUser: { name: string } | null;
          }) => ({
            id: task.id,
            title: task.title,
            dueDate: task.dueDate.toISOString(),
            priority: task.priority,
            status: task.status === "OVERDUE" ? ("OVERDUE" as const) : ("PENDING" as const),
            leadName: task.lead
              ? `${task.lead.firstName} ${task.lead.lastName || ""}`.trim()
              : null,
            assignedName: task.assignedUser?.name || null,
            isOverdue: task.dueDate.getTime() < now.getTime(),
          }))
          .sort((left: DashboardTaskItem, right: DashboardTaskItem) => {
            if (left.isOverdue !== right.isOverdue) {
              return left.isOverdue ? -1 : 1;
            }
            const priorityDelta =
              taskPriorityRank(left.priority) - taskPriorityRank(right.priority);
            if (priorityDelta !== 0) return priorityDelta;
            return (
              new Date(left.dueDate).getTime() -
              new Date(right.dueDate).getTime()
            );
          })
          .slice(0, DASHBOARD_PREVIEW_LIMIT);

        return { items, total };
      }),
      capture<{ items: DashboardLeadItem[]; newThisWeek: number }>("recent leads", async () => {
        const [rows, newThisWeek] = await Promise.all([
          prisma.lead.findMany({
            where: { tenantId, isArchived: false },
            orderBy: { createdAt: "desc" },
            take: DASHBOARD_PREVIEW_LIMIT,
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              city: true,
              status: true,
              createdAt: true,
              project: { select: { name: true } },
            },
          }),
          prisma.lead.count({
            where: {
              tenantId,
              isArchived: false,
              createdAt: { gte: weekStart },
            },
          }),
        ]);

        const items: DashboardLeadItem[] = rows.map((lead: {
          id: string;
          firstName: string;
          lastName: string | null;
          phone: string;
          city: string;
          status: string;
          createdAt: Date;
          project: { name: string } | null;
        }) => ({
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          phone: lead.phone,
          city: lead.city,
          status: lead.status,
          createdAt: lead.createdAt.toISOString(),
          projectName: lead.project?.name || null,
        }));

        return { items, newThisWeek };
      }),
      capture<DashboardWhatsAppData>("whatsapp", async () => {
        const result = await fetchWhatsAppDashboardStats(tenantId);
        if (!result.success) throw new Error("WHATSAPP_DASHBOARD_UNAVAILABLE");
        return {
          conversationsCount: result.conversationsCount,
          newLeadsCount: result.newLeadsCount,
          unreadMessagesCount: result.unreadMessagesCount,
        };
      }),
    ]);

    return {
      generatedAt: now.toISOString(),
      timezone: "Asia/Riyadh",
      kpis: {
        activeLeads,
        todayTours,
        activeOffers,
        signedContractsThisMonth,
      },
      pipeline,
      operations: { tasks, recentLeads, whatsapp },
    };
  });
}
