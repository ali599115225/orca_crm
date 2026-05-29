"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/app/context/AppContext";

// استيراد الواجهات
import WhatsAppView from "@/components/views/WhatsAppView";
import HelpdeskView from "@/components/views/HelpdeskView";
import LeadsView from "@/components/views/LeadsView";
import ProjectsView from "@/components/views/ProjectsView";
import CalculatorView from "@/components/views/CalculatorView";
import SalesView from "@/components/views/SalesView";
import TasksView from "@/components/views/TasksView";
import SettingsView from "@/components/views/SettingsView";
import MonitorView from "@/components/views/MonitorView";
import DashboardView from "@/app/operations/dashboard/DashboardView";
import ZatkaView from "@/components/views/ZatkaView";
import EjarView from "@/components/views/EjarView";
import CampaignsView from "@/components/views/CampaignsView";
import ErpFinanceView from "@/components/views/ErpFinanceView";

interface WarRoomCommandPageClientProps {
  initialTab: string;
  projects: any[];
  tickets: any[];
  tenants: any[];
  chats: any[];
  whatsappTenant: { companyName: string; whatsappConnected: boolean; };
  helpdeskTickets: any[];
  companyName: string;
  tenantInfo: { companyName: string; subdomain: string; subscriptionPlan: string; extraAgents: number; };
  dashboardStats: { totalLeads: number; activeBookings: number; closedSales: number; totalProjects: number; pendingTasks: number; };
  recentLeads: any[];
  recentTasks: any[];
  tenantUsers: any[];
  currentUserRole: string;
}

const ROLE_ALLOWED_TABS: Record<string, string[]> = {
  PLATFORM_ARCHITECT: ["monitor"],
  ADMIN: ["analytics", "leads", "projects", "calculator", "sales", "tasks", "settings", "helpdesk", "whatsapp", "zatka", "ejar", "campaigns", "erpFinance"],
  SALES_MANAGER: ["analytics", "leads", "projects", "calculator", "sales", "tasks", "helpdesk", "whatsapp", "zatka", "ejar", "campaigns", "erpFinance"],
  SALES_EMPLOYEE: ["leads", "tasks", "helpdesk", "calculator"],
  MARKETING: ["analytics", "leads", "projects", "helpdesk", "whatsapp", "campaigns"],
  READ_ONLY: ["analytics", "leads", "projects"],
};

export default function WarRoomCommandPageClient(props: WarRoomCommandPageClientProps) {
  const { theme, lang } = useApp();
  const isDark = theme === "dark";
  const { currentUserRole, initialTab } = props;

  const isPlatformArchitect = currentUserRole === "PLATFORM_ARCHITECT";
  const allowedTabs = ROLE_ALLOWED_TABS[currentUserRole] ?? ROLE_ALLOWED_TABS.READ_ONLY;
  const defaultTab = isPlatformArchitect ? "monitor" : (initialTab || "analytics");

  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  useEffect(() => {
    const urlTab = new URLSearchParams(window.location.search).get("tab") || defaultTab;
    setActiveTab(allowedTabs.includes(urlTab) ? urlTab : defaultTab);
  }, [defaultTab, allowedTabs]);

  const wrapperClass = `min-h-[85vh] transition-all duration-300 ${isDark ? "text-white" : "text-[#0b0f19]"}`;

  if (isPlatformArchitect) {
    return (
      <div className={wrapperClass} dir={lang === "AR" ? "rtl" : "ltr"}>
        <MonitorView initialTickets={props.tickets} initialTenants={props.tenants} />
      </div>
    );
  }

    return (
    <div className={wrapperClass} dir={lang === "AR" ? "rtl" : "ltr"}>
      {activeTab === "analytics" && <DashboardView tenant={props.tenantInfo} stats={props.dashboardStats} recentLeads={props.recentLeads} recentTasks={props.recentTasks} projects={props.projects} />}
      {activeTab === "leads" && <LeadsView />}
      {activeTab === "projects" && <ProjectsView />}
      
      {/* اختبار صفحات المحاسبة والإيجار */}
      {activeTab === "ejar" && <div className="p-20 text-center font-black text-2xl">صفحة الإيجار تعمل الآن!</div>}
      {activeTab === "erpFinance" && <div className="p-20 text-center font-black text-2xl">صفحة المحاسبة تعمل الآن!</div>}
      
      {activeTab === "calculator" && <CalculatorView />}
      {activeTab === "sales" && <SalesView />}
      {activeTab === "tasks" && <TasksView />}
      {activeTab === "settings" && <SettingsView tenant={props.tenantInfo} users={props.tenantUsers} currentUserRole={props.currentUserRole} />}
      {activeTab === "helpdesk" && <HelpdeskView initialTickets={props.helpdeskTickets} tenantName={props.companyName} />}
      {activeTab === "whatsapp" && <WhatsAppView initialChats={props.chats} tenant={props.whatsappTenant} />}
      {activeTab === "zatka" && <ZatkaView />}
      {activeTab === "campaigns" && <CampaignsView />}
    </div>
  );
