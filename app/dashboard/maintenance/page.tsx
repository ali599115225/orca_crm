import React from 'react';
import { prisma } from '@/lib/prisma';
import { getActiveTenant } from '@/lib/tenant';
import MaintenanceView from './MaintenanceView';

export const metadata = {
  title: 'إدارة الصيانة — أوركا',
  description: 'أوامر العمل، تعيين الفنيين، تتبع التكاليف والحالة',
};

export default async function MaintenancePage() {
  const tenant = await getActiveTenant();

  const tickets = await prisma.maintenanceTicket.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
  });

  const units = await prisma.unit.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, unitNumber: true, project: { select: { name: true } } },
  });

  const statusCounts = {
    pending: tickets.filter(t => t.status === 'pending').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    completed: tickets.filter(t => t.status === 'completed').length,
  };

  const totalEstimatedCost = tickets.reduce((s, t) => s + Number(t.estimatedCost || 0), 0);
  const totalActualCost = tickets.reduce((s, t) => s + Number(t.actualCost || 0), 0);

  const serializedTickets = tickets.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    category: t.category,
    reportedBy: t.reportedBy,
    assignedTo: t.assignedTo,
    unitId: t.unitId,
    estimatedCost: t.estimatedCost ? Number(t.estimatedCost) : null,
    actualCost: t.actualCost ? Number(t.actualCost) : null,
    scheduledDate: t.scheduledDate?.toISOString() || null,
    completedDate: t.completedDate?.toISOString() || null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  const serializedUnits = units.map(u => ({
    id: u.id,
    unitNumber: u.unitNumber,
    projectName: u.project.name,
  }));

  return (
    <MaintenanceView
      tenantId={tenant.id}
      tickets={serializedTickets}
      units={serializedUnits}
      stats={{ statusCounts, totalEstimatedCost, totalActualCost }}
    />
  );
}
