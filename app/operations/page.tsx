// app/operations/page.tsx
import React from "react";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getMockWhatsAppChatsAction } from "@/app/actions/whatsapp";
import { redirect } from "next/navigation";
import WarRoomCommandPageClient from "./WarRoomCommandPageClient";

export const metadata = {
  title: "لوحة التحكم وإدارة العمليات - أوركا CRM",
  description: "نظام إدارة العمليات العقارية السحابية لوكالة أوركا",
};

export default async function WarRoomCommandPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const currentUserRole = (session.role as string) || "READ_ONLY";
  const isPlatformArchitect = currentUserRole === "PLATFORM_ARCHITECT";

  // 1. Resolve active tab parameter
  const resolvedParams = await searchParams;
  // ─── PLATFORM_ARCHITECT: force tab=monitor دائماً ────────────────────────
  const initialTab = isPlatformArchitect ? "monitor" : (resolvedParams?.tab || "overview");

  // ─── Layer 1: بيانات متاحة للجميع (System-level) ──────────────────────────
  // الـ tickets والـ tenants هي بيانات النظام (ليست بيانات مستثمرين بعينهم)
  // PLATFORM_ARCHITECT يحتاجها لـ MonitorView

  // 2. Fetch support monitor tickets (System-level — لا تحتوي بيانات مستثمرين)
  const allTickets = await prisma.ticket.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tenant: {
        select: {
          companyName: true,
          subdomain: true,
        }
      }
    }
  });
  const tickets = allTickets.map(t => ({
    id: t.id,
    tenantId: t.tenantId,
    title: t.title,
    description: t.description,
    status: t.status,
    aiResponse: t.aiResponse,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    tenant: {
      companyName: t.tenant?.companyName || "",
      subdomain: t.tenant?.subdomain || "",
    }
  }));

  // 3. Fetch all tenants (System-level — إحصائيات الباقات)
  const allTenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users: true,
          projects: true,
          leads: true,
        }
      }
    }
  });
  const tenants = allTenants.map(t => ({
    id: t.id,
    companyName: t.companyName,
    subdomain: t.subdomain,
    subscriptionPlan: t.subscriptionPlan,
    isActive: t.isActive,
    extraAgents: t.extraAgents,
    whatsappConnected: t.whatsappConnected,
    createdAt: t.createdAt.toISOString(),
    _count: t._count,
  }));

  // ─── Layer 2: بيانات المستأجر — محجوبة عن PLATFORM_ARCHITECT ─────────────
  // إذا كان الدور PLATFORM_ARCHITECT → نرجع arrays فارغة (عزل تام)
  if (isPlatformArchitect) {
    return (
      <WarRoomCommandPageClient
        initialTab="monitor"
        projects={[]}
        tickets={tickets}
        tenants={tenants}
        chats={[]}
        whatsappTenant={{ companyName: "", whatsappConnected: false }}
        helpdeskTickets={[]}
        companyName=""
        tenantInfo={{
          companyName: "ORCA Platform",
          subdomain: "orca",
          subscriptionPlan: "gold",
          extraAgents: 0,
        }}
        dashboardStats={{
          totalLeads: 0,
          activeBookings: 0,
          closedSales: 0,
          totalProjects: 0,
          pendingTasks: 0,
        }}
        recentLeads={[]}
        recentTasks={[]}
        tenantUsers={[]}
        currentUserRole={currentUserRole}
      />
    );
  }

  // ─── بقية الأدوار: جلب بيانات المستأجر المحدد ────────────────────────────

  // 4. Fetch projects for this tenant
  const activeTenant = await getActiveTenant();

  const dbProjects = await prisma.project.findMany({
    where: { tenantId: activeTenant.id },
    orderBy: { createdAt: "desc" }
  });
  const projects = dbProjects.map(p => ({
    id: p.id,
    name: p.name,
    city: p.city,
    status: p.status,
    unitsTotal: p.unitsTotal,
    unitsSold: p.unitsSold,
    unitsBooked: p.unitsBooked,
    minPrice: p.minPrice ? Number(p.minPrice) : null,
    maxPrice: p.maxPrice ? Number(p.maxPrice) : null,
  }));

  // 5. Fetch WhatsApp Chats & Tenant
  const whatsappChatsResult = await getMockWhatsAppChatsAction();
  const chats = whatsappChatsResult.success && whatsappChatsResult.chats ? whatsappChatsResult.chats : [];
  const whatsappTenantRaw = whatsappChatsResult.success && whatsappChatsResult.tenant
    ? whatsappChatsResult.tenant
    : { companyName: "منصتك العقارية", whatsappConnected: false };
  const whatsappTenant = {
    companyName: whatsappTenantRaw.companyName || "",
    whatsappConnected: whatsappTenantRaw.whatsappConnected || false,
  };

  // 6. Fetch Helpdesk Tickets (tenant-scoped)
  const dbHelpdeskTickets = await prisma.ticket.findMany({
    where: { tenantId: activeTenant.id },
    orderBy: { createdAt: "desc" }
  });
  const helpdeskTickets = dbHelpdeskTickets.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    aiResponse: t.aiResponse,
    createdAt: t.createdAt.toISOString(),
  }));

  // 7. Dashboard Stats (tenant-scoped)
  const [totalLeads, activeBookings, closedSales, totalProjectsCount, pendingTasks] = await Promise.all([
    prisma.lead.count({ where: { tenantId: activeTenant.id } }),
    prisma.lead.count({ where: { tenantId: activeTenant.id, status: "RESERVED" } }),
    prisma.lead.count({ where: { tenantId: activeTenant.id, status: { in: ["CONTRACT_SIGNED", "WON"] } } }),
    prisma.project.count({ where: { tenantId: activeTenant.id } }),
    prisma.task.count({ where: { tenantId: activeTenant.id, status: "PENDING" } }),
  ]);

  const dbRecentLeads = await prisma.lead.findMany({
    where: { tenantId: activeTenant.id },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { name: true } },
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

  const dbRecentTasks = await prisma.task.findMany({
    where: { tenantId: activeTenant.id },
    take: 5,
    orderBy: { dueDate: "asc" },
    include: {
      lead: { select: { firstName: true, lastName: true } },
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

  const dashboardStats = {
    totalLeads,
    activeBookings,
    closedSales,
    totalProjects: totalProjectsCount,
    pendingTasks,
  };

  // 8. Tenant users (للـ SettingsView — ADMIN فقط)
  const dbUsers = await prisma.user.findMany({
    where: { tenantId: activeTenant.id },
    orderBy: { createdAt: "desc" }
  });
  const tenantUsers = dbUsers.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt,
  }));

  return (
    <WarRoomCommandPageClient
      initialTab={initialTab}
      projects={projects}
      tickets={tickets}
      tenants={tenants}
      chats={chats}
      whatsappTenant={whatsappTenant}
      helpdeskTickets={helpdeskTickets}
      companyName={activeTenant.companyName || "أوركا CRM"}
      tenantInfo={{
        companyName: activeTenant.companyName,
        subdomain: activeTenant.subdomain,
        subscriptionPlan: activeTenant.subscriptionPlan,
        extraAgents: activeTenant.extraAgents,
      }}
      dashboardStats={dashboardStats}
      recentLeads={recentLeads}
      recentTasks={recentTasks}
      tenantUsers={tenantUsers}
      currentUserRole={currentUserRole}
    />
  );
}
