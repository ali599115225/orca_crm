// app/operations/dashboard/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import { getActiveTenant } from '@/lib/tenant';
import DashboardView from './DashboardView';

export const metadata = {
  title: 'النواة المركزية للعمليات - أوركا',
  description: 'مراقبة حية للمبيعات وحجم مخزون الوحدات العقارية والتنبؤات الذكية',
};

export default async function DashboardPage() {
  const tenant = await getActiveTenant();

  // 1. حساب حدود التواريخ
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  // 2. جلب الإحصائيات الحية الأساسية والمتطورة في طلب واحد متوازٍ لتقليل زمن الاستجابة
  const [
    totalLeads,
    activeBookings,
    closedSalesLeads,
    activeProjectsCount,
    pendingTasksCount,
    monthlySalesResult,
    dailyToursCount,
    sentOffersCount,
    closedContractsCount,
  ] = await Promise.all([
    // إجمالي العملاء
    prisma.lead.count({ where: { tenantId: tenant.id } }),
    // الحجوزات النشطة
    prisma.lead.count({ where: { tenantId: tenant.id, status: 'RESERVED' } }),
    // الصفقات المغلقة (من العملاء)
    prisma.lead.count({ where: { tenantId: tenant.id, status: { in: ['CONTRACT_SIGNED', 'WON'] } } }),
    // المشاريع النشطة
    prisma.project.count({ where: { tenantId: tenant.id, status: { not: 'SOLD_OUT' } } }),
    // المهام المعلقة
    prisma.task.count({ where: { tenantId: tenant.id, status: 'PENDING' } }),
    // المبيعات الشهرية (مجموع قيم العقود الموقعة هذا الشهر)
    prisma.contract.aggregate({
      where: {
        unit: {
          project: {
            tenantId: tenant.id,
          },
        },
        signedAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        totalVolumeSar: true,
      },
    }),
    // الجولات العقارية لليوم (المهام المجدولة اليوم ولها طابع زيارة/جولة عقارية)
    prisma.task.count({
      where: {
        tenantId: tenant.id,
        dueDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
        OR: [
          { title: { contains: 'زيارة', mode: 'insensitive' } },
          { title: { contains: 'جولة', mode: 'insensitive' } },
          { title: { contains: 'معاينة', mode: 'insensitive' } },
          { title: { contains: 'visit', mode: 'insensitive' } },
          { title: { contains: 'tour', mode: 'insensitive' } },
          { title: { contains: 'viewing', mode: 'insensitive' } },
        ],
      },
    }),
    // العروض المرسلة (العملاء بحالة تقديم عرض)
    prisma.lead.count({ where: { tenantId: tenant.id, status: 'OFFER_MADE' } }),
    // العقود المغلقة الإجمالية من جدول العقود
    prisma.contract.count({
      where: {
        unit: {
          project: {
            tenantId: tenant.id,
          },
        },
      },
    }),
  ]);

  const monthlySales = monthlySalesResult._sum.totalVolumeSar ? Number(monthlySalesResult._sum.totalVolumeSar) : 0;

  // 3. جلب أحدث العملاء
  const dbRecentLeads = await prisma.lead.findMany({
    where: { tenantId: tenant.id },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      project: {
        select: { name: true },
      },
    },
  });

  const recentLeads = dbRecentLeads.map(lead => ({
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    phone: lead.phone,
    status: lead.status,
    city: lead.city,
    createdAt: lead.createdAt.toISOString(),
    project: lead.project ? { name: lead.project.name } : null,
  }));

  // 4. جلب أحدث المهام المفتوحة
  const dbRecentTasks = await prisma.task.findMany({
    where: { tenantId: tenant.id },
    take: 5,
    orderBy: { dueDate: 'asc' },
    include: {
      lead: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  const recentTasks = dbRecentTasks.map(task => ({
    id: task.id,
    title: task.title,
    dueDate: task.dueDate.toISOString(),
    priority: task.priority,
    status: task.status,
    lead: task.lead ? { firstName: task.lead.firstName, lastName: task.lead.lastName } : null,
  }));

  // 5. جلب المشاريع السكنية
  const dbProjects = await prisma.project.findMany({
    where: { tenantId: tenant.id },
    take: 4,
    orderBy: { createdAt: 'desc' },
  });

  const projects = dbProjects.map(proj => ({
    id: proj.id,
    name: proj.name,
    city: proj.city,
    status: proj.status,
    unitsTotal: proj.unitsTotal,
    unitsSold: proj.unitsSold,
    unitsBooked: proj.unitsBooked,
    minPrice: proj.minPrice ? Number(proj.minPrice) : null,
  }));

  // 6. أداء الوكلاء (أكثر الموظفين نشاطاً وإغلاقاً للصفقات)
  const agentsDb = await prisma.user.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      role: { in: ['SALES_EMPLOYEE', 'SALES_MANAGER', 'ADMIN'] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      leads: {
        select: {
          status: true,
          leadScore: true,
        },
      },
    },
  });

  const agentPerformance = agentsDb.map(agent => {
    const totalLeads = agent.leads.length;
    const closedDeals = agent.leads.filter(l => ['CONTRACT_SIGNED', 'WON'].includes(l.status)).length;
    const activeLeads = agent.leads.filter(l => !['WON', 'LOST', 'CONTRACT_SIGNED'].includes(l.status)).length;
    const conversionRate = totalLeads > 0 ? Math.round((closedDeals / totalLeads) * 100) : 0;
    return {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      role: agent.role,
      totalLeads,
      closedDeals,
      activeLeads,
      conversionRate,
    };
  }).sort((a, b) => b.closedDeals - a.closedDeals);

  // 7. مصادر العملاء (قنوات التسويق وتوزيعها)
  const dbSources = await prisma.lead.findMany({
    where: { tenantId: tenant.id },
    select: { source: true },
  });
  const sourceMap: Record<string, number> = {};
  dbSources.forEach(l => {
    const src = l.source || 'أخرى';
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  });
  const leadSources = Object.entries(sourceMap).map(([source, count]) => ({
    source,
    count,
  })).sort((a, b) => b.count - a.count);

  // 8. تنبيهات النظام الديناميكية
  const systemAlerts: Array<{ id: string; type: 'warning' | 'info' | 'critical'; messageAr: string; messageEn: string; date: string }> = [];

  const overdueTasksCount = await prisma.task.count({
    where: {
      tenantId: tenant.id,
      status: 'PENDING',
      dueDate: { lt: new Date() },
    },
  });
  if (overdueTasksCount > 0) {
    systemAlerts.push({
      id: 'overdue_tasks',
      type: 'warning',
      messageAr: `يوجد ${overdueTasksCount} مهام ومتابعات معلقة متأخرة عن موعدها المحدد.`,
      messageEn: `There are ${overdueTasksCount} overdue tasks and follow-ups.`,
      date: new Date().toISOString(),
    });
  }

  const unassignedLeadsCount = await prisma.lead.count({
    where: {
      tenantId: tenant.id,
      assignedTo: null,
    },
  });
  if (unassignedLeadsCount > 0) {
    systemAlerts.push({
      id: 'unassigned_leads',
      type: 'info',
      messageAr: `يوجد ${unassignedLeadsCount} عملاء مهتمين جدد لم يتم تعيينهم لوكلاء عقاريين بعد.`,
      messageEn: `There are ${unassignedLeadsCount} new leads that haven't been assigned to agents yet.`,
      date: new Date().toISOString(),
    });
  }

  if (tenant.growthWarning) {
    systemAlerts.push({
      id: 'growth_warning',
      type: 'warning',
      messageAr: 'تنبيه الاستهلاك: لقد قارب استهلاك الموارد في باقتك الحالية على تجاوز الحد المسموح.',
      messageEn: 'Resource warning: Your active plan usage has almost reached its operational limit.',
      date: new Date().toISOString(),
    });
  }

  if (tenant.paymentStatus === 'UNPAID') {
    systemAlerts.push({
      id: 'payment_unpaid',
      type: 'critical',
      messageAr: 'تنبيه مالي حرج: يرجى تسوية الفواتير المعلقة لتفادي تعليق عمليات النظام المؤقت.',
      messageEn: 'Critical billing alert: Please settle outstanding invoices to avoid temporary service suspension.',
      date: new Date().toISOString(),
    });
  }

  // 9. مساعد AI التنبؤي - حساب وتجهيز مقترحات ذكية
  // أ. أفضل وقت للتواصل لبعض العملاء الجدد
  const contactLeadsDb = await prisma.lead.findMany({
    where: {
      tenantId: tenant.id,
      status: { in: ['NEW', 'CONTACTED', 'VISIT_SCHEDULED'] },
    },
    take: 3,
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });
  const bestContactTimeSlots = contactLeadsDb.map((l, index) => {
    const slotsAr = ["٤:٠٠ م - ٧:٠٠ م", "١١:٠٠ ص - ١:٠٠ م", "٧:٣٠ م - ٩:٠٠ م"];
    const slotsEn = ["4:00 PM - 7:00 PM", "11:00 AM - 1:00 PM", "7:30 PM - 9:00 PM"];
    return {
      leadId: l.id,
      name: `${l.firstName} ${l.lastName ?? ''}`.trim(),
      slotAr: slotsAr[index % slotsAr.length],
      slotEn: slotsEn[index % slotsEn.length],
    };
  });

  // ب. العملاء المتوقع إغلاقهم (النقاط الأعلى)
  const closingLeadsDb = await prisma.lead.findMany({
    where: {
      tenantId: tenant.id,
      leadScore: { gte: 70 },
      status: { notIn: ['WON', 'LOST', 'CONTRACT_SIGNED'] },
    },
    take: 3,
    orderBy: { leadScore: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      leadScore: true,
    },
  });
  const expectedToClose = closingLeadsDb.map(l => ({
    id: l.id,
    name: `${l.firstName} ${l.lastName ?? ''}`.trim(),
    score: l.leadScore,
    probabilityAr: l.leadScore >= 85 ? "مرتفعة جداً" : "مرتفعة",
    probabilityEn: l.leadScore >= 85 ? "Very High" : "High",
  }));

  // ج. المشاريع التي تحتاج حملة تسويقية (معدل إشغال أقل من 50% ومستودع متاح)
  const projectsCampaignDb = await prisma.project.findMany({
    where: { tenantId: tenant.id },
    select: {
      id: true,
      name: true,
      unitsTotal: true,
      unitsSold: true,
      unitsBooked: true,
    },
  });
  const projectsNeedingCampaign = projectsCampaignDb.map(p => {
    const soldOrBooked = p.unitsSold + p.unitsBooked;
    const ratio = p.unitsTotal > 0 ? (soldOrBooked / p.unitsTotal) : 1;
    return {
      id: p.id,
      name: p.name,
      ratio,
      remainingUnits: p.unitsTotal - soldOrBooked,
    };
  })
  .filter(p => p.ratio < 0.5 && p.remainingUnits > 0)
  .sort((a, b) => a.ratio - b.ratio)
  .slice(0, 3)
  .map(p => ({
    id: p.id,
    name: p.name,
    remainingUnits: p.remainingUnits,
    reasonAr: `معدل إشغال منخفض (${Math.round(p.ratio * 100)}%) ومخزون متبقي كبير (${p.remainingUnits} وحدة)`,
    reasonEn: `Low absorption rate (${Math.round(p.ratio * 100)}%) with high inventory (${p.remainingUnits} units)`,
  }));

  // د. الوكلاء الذين يحتاجون دعم (نشاط مرتفع مع انخفاض الإغلاق)
  const agentsNeedingSupport = agentPerformance
    .filter(a => a.activeLeads > 3 && a.conversionRate < 20)
    .slice(0, 3)
    .map(a => ({
      id: a.id,
      name: a.name,
      activeLeads: a.activeLeads,
      conversionRate: a.conversionRate,
      reasonAr: `يدير ${a.activeLeads} عملاء بنسبة إغلاق منخفضة نسبياً (${a.conversionRate}%)`,
      reasonEn: `Manages ${a.activeLeads} active leads with a conversion rate of (${a.conversionRate}%)`,
    }));

  const aiPredictions = {
    bestContactTimes: bestContactTimeSlots,
    expectedToClose,
    projectsNeedingCampaign,
    agentsNeedingSupport,
  };

  return (
    <DashboardView 
      tenant={{
        companyName: tenant.companyName,
        subdomain: tenant.subdomain,
        subscriptionPlan: tenant.subscriptionPlan,
        extraAgents: tenant.extraAgents,
      }}
      stats={{
        totalLeads,
        activeBookings,
        closedSales: closedSalesLeads,
        totalProjects: activeProjectsCount,
        pendingTasks: pendingTasksCount,
        monthlySales,
        dailyTours: dailyToursCount,
        sentOffers: sentOffersCount,
        closedContracts: closedContractsCount,
      }}
      recentLeads={recentLeads}
      recentTasks={recentTasks}
      projects={projects}
      agentPerformance={agentPerformance}
      leadSources={leadSources}
      systemAlerts={systemAlerts}
      aiPredictions={aiPredictions}
    />
  );
}
