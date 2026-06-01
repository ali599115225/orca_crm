// app/operations/dashboard/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import { getActiveTenant } from '@/lib/tenant';
import DashboardView from './DashboardView';

export const metadata = {
  title: 'النواة المركزية للعمليات - أوركا',
  description: 'مراقبة حية للمبيعات وحجم مخزون الوحدات العقارية',
};

export default async function DashboardPage() {
  const tenant = await getActiveTenant();

  // 1. جلب الإحصائيات الحية
  const [totalLeads, activeBookings, closedSales, totalProjects, pendingTasks] = await Promise.all([
    prisma.lead.count({ where: { tenantId: tenant.id } }),
    prisma.lead.count({ where: { tenantId: tenant.id, status: 'RESERVED' } }),
    prisma.lead.count({ where: { tenantId: tenant.id, status: { in: ['CONTRACT_SIGNED', 'WON'] } } }),
    prisma.project.count({ where: { tenantId: tenant.id } }),
    prisma.task.count({ where: { tenantId: tenant.id, status: 'PENDING' } }),
  ]);

  // 2. جلب أحدث العملاء
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

  // 3. جلب أحدث المهام المفتوحة
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

  // 4. جلب المشاريع السكنية
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
        closedSales,
        totalProjects,
        pendingTasks,
      }}
      recentLeads={recentLeads}
      recentTasks={recentTasks}
      projects={projects}
    />
  );
}