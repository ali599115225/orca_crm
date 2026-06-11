import React from 'react';
import { prisma } from '@/lib/prisma';
import { getActiveTenant } from '@/lib/tenant';
import { getWhatsAppDashboardStats } from '@/app/actions/whatsapp-crm';
import DashboardView from './DashboardView';

export const metadata = {
  title: 'النواة المركزية للعمليات - أوركا',
  description: 'مراقبة حية للمبيعات ومسار الصفقات وحجم مخزون الوحدات العقارية والتنبؤات الذكية',
};

export default async function DashboardPage() {
  const tenant = await getActiveTenant();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    leadGroup,
    taskGroup,
    contractStats,
    sourceGroup,
    dbRecentLeads,
    dbRecentTasks,
    dbProjects,
    whatsAppStatsResult,
  ] = await Promise.allSettled([
    prisma.lead.groupBy({ by: ['status'], where: { tenantId: tenant.id }, _count: { id: true } }),
    prisma.task.groupBy({ by: ['status'], where: { tenantId: tenant.id }, _count: { id: true } }),
    prisma.contract.aggregate({
      where: { unit: { project: { tenantId: tenant.id } } },
      _sum: { totalVolumeSar: true },
      _count: { id: true },
    }),
    prisma.lead.groupBy({ by: ['source'], where: { tenantId: tenant.id }, _count: { id: true } }),
    prisma.lead.findMany({
      where: { tenantId: tenant.id }, take: 5, orderBy: { createdAt: 'desc' },
      include: { project: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: { tenantId: tenant.id }, take: 5, orderBy: { dueDate: 'asc' },
      include: { lead: { select: { firstName: true, lastName: true } } },
    }),
    prisma.project.findMany({
      where: { tenantId: tenant.id }, take: 4, orderBy: { createdAt: 'desc' },
    }),
    getWhatsAppDashboardStats(),
  ]);

  // Extract values from Promise.allSettled results
  const safeValue = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
    result.status === 'fulfilled' ? result.value : fallback;

  const leadGroupValue = safeValue(leadGroup, []);
  const taskGroupValue = safeValue(taskGroup, []);
  const contractStatsValue = safeValue(contractStats, { _sum: { totalVolumeSar: null }, _count: { id: 0 } });
  const sourceGroupValue = safeValue(sourceGroup, []);
  const dbRecentLeadsValue = safeValue(dbRecentLeads, []);
  const dbRecentTasksValue = safeValue(dbRecentTasks, []);
  const dbProjectsValue = safeValue(dbProjects, []);
  const whatsAppStatsValue = safeValue(whatsAppStatsResult, { success: false, conversationsCount: 0, newLeadsCount: 0, unreadMessagesCount: 0, error: null });

  const leadCountMap = new Map(leadGroupValue.map(l => [l.status, l._count.id]));
  const totalLeads = leadGroupValue.reduce((s, l) => s + l._count.id, 0);
  const activeBookings = leadCountMap.get('RESERVED') || 0;
  const closedSalesLeads = (leadCountMap.get('CONTRACT_SIGNED') || 0) + (leadCountMap.get('WON') || 0);
  const sentOffersCount = leadCountMap.get('OFFER_MADE') || 0;
  const activeProjectsCount = dbProjectsValue.filter(p => p.status !== 'SOLD_OUT').length;
  const pendingTasksCount = taskGroupValue.find(t => t.status === 'PENDING')?._count.id || 0;
  const overdueTasksCount = taskGroupValue.find(t => t.status === 'OVERDUE')?._count.id || 0;
  const monthlySales = Number(contractStatsValue._sum.totalVolumeSar || 0);
  const closedContractsCount = contractStatsValue._count.id;

  const recentLeads = dbRecentLeadsValue.map(l => ({ id: l.id, firstName: l.firstName, lastName: l.lastName, phone: l.phone, status: l.status, city: l.city, createdAt: l.createdAt.toISOString(), project: l.project ? { name: l.project.name } : null }));
  const recentTasks = dbRecentTasksValue.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate.toISOString(), priority: t.priority, status: t.status, lead: t.lead ? { firstName: t.lead.firstName, lastName: t.lead.lastName } : null }));
  const projects = dbProjectsValue.map(p => ({ id: p.id, name: p.name, city: p.city, status: p.status, unitsTotal: p.unitsTotal, unitsSold: p.unitsSold, unitsBooked: p.unitsBooked, minPrice: p.minPrice ? Number(p.minPrice) : null }));
  const leadSources = sourceGroupValue.map(s => ({ source: s.source || 'أخرى', count: s._count.id })).sort((a, b) => b.count - a.count);

  const systemAlerts: Array<{ id: string; type: 'warning' | 'info' | 'critical'; messageAr: string; messageEn: string; date: string }> = [];
  if (overdueTasksCount > 0) systemAlerts.push({ id: 'overdue_tasks', type: 'warning', messageAr: `يوجد ${overdueTasksCount} مهام متأخرة.`, messageEn: `${overdueTasksCount} overdue tasks.`, date: new Date().toISOString() });
  if (tenant.growthWarning) systemAlerts.push({ id: 'growth_warning', type: 'warning', messageAr: 'تنبيه الاستهلاك: قارب استهلاك الموارد على تجاوز الحد.', messageEn: 'Resource warning: Usage nearing limit.', date: new Date().toISOString() });
  if (tenant.paymentStatus === 'UNPAID') systemAlerts.push({ id: 'payment_unpaid', type: 'critical', messageAr: 'يرجى تسوية الفواتير المعلقة.', messageEn: 'Please settle outstanding invoices.', date: new Date().toISOString() });

  const dashboardTodayTasks = recentTasks.filter(t => new Date(t.dueDate).toDateString() === new Date().toDateString());
  const dailyToursCount = dashboardTodayTasks.filter(t => ['زيارة', 'جولة', 'معاينة', 'visit', 'tour', 'viewing'].some(k => t.title.toLowerCase().includes(k))).length;
  const todayTasks = dashboardTodayTasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, priority: t.priority, leadName: t.lead?.firstName || null, assignedName: null }));

  const pipelineStages = [
    { key: "inquiry", labelAr: "استفسار", labelEn: "Inquiry", color: "#3B82F6", count: (leadCountMap.get('NEW') || 0) + (leadCountMap.get('CONTACTED') || 0), statuses: ["NEW", "CONTACTED"] },
    { key: "tour", labelAr: "جولة", labelEn: "Tour", color: "#F59E0B", count: (leadCountMap.get('VISIT_SCHEDULED') || 0) + (leadCountMap.get('VISITED') || 0), statuses: ["VISIT_SCHEDULED", "VISITED"] },
    { key: "offer", labelAr: "عرض", labelEn: "Offer", color: "#8B5CF6", count: (leadCountMap.get('OFFER_MADE') || 0) + (leadCountMap.get('RESERVED') || 0), statuses: ["OFFER_MADE", "RESERVED"] },
    { key: "close", labelAr: "إغلاق", labelEn: "Close", color: "#10B981", count: (leadCountMap.get('CONTRACT_SIGNED') || 0) + (leadCountMap.get('WON') || 0), statuses: ["CONTRACT_SIGNED", "WON"] },
  ];

  return (
    <DashboardView
      tenant={{ companyName: tenant.companyName, subdomain: tenant.subdomain, subscriptionPlan: tenant.subscriptionPlan, extraAgents: tenant.extraAgents }}
      stats={{ totalLeads, activeBookings, closedSales: closedSalesLeads, totalProjects: activeProjectsCount, pendingTasks: pendingTasksCount, monthlySales, dailyTours: dailyToursCount, sentOffers: sentOffersCount, closedContracts: closedContractsCount }}
      recentLeads={recentLeads}
      recentTasks={recentTasks}
      projects={projects}
      agentPerformance={[]}
      leadSources={leadSources}
      systemAlerts={systemAlerts}
      aiPredictions={{ bestContactTimes: [], expectedToClose: [], projectsNeedingCampaign: [], agentsNeedingSupport: [] }}
      pipelineStages={pipelineStages}
      todayTasks={todayTasks}
      whatsAppStats={whatsAppStatsValue.success ? {
        conversationsCount: whatsAppStatsValue.conversationsCount,
        newLeadsCount: whatsAppStatsValue.newLeadsCount,
        unreadMessagesCount: whatsAppStatsValue.unreadMessagesCount,
      } : undefined}
    />
  );
}
