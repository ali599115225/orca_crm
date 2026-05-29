// app/operations/WarRoomCommandPageClient.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/app/context/AppContext";

// Import harvested views
import WhatsAppView from "@/components/views/WhatsAppView";
import HelpdeskView from "@/components/views/HelpdeskView";
import LeadsView from "@/components/views/LeadsView";
import ProjectsView from "@/components/views/ProjectsView";
import CalculatorView from "@/components/views/CalculatorView";
import SalesView from "@/components/views/SalesView";
import TasksView from "@/components/views/TasksView";
import SettingsView from "@/components/views/SettingsView";
import DashboardView from "@/app/operations/dashboard/DashboardView";

interface WarRoomCommandPageClientProps {
  initialTab: string;
  projects: any[];
  tickets: any[];
  tenants: any[];
  chats: any[];
  whatsappTenant: {
    companyName: string;
    whatsappConnected: boolean;
  };
  helpdeskTickets: any[];
  companyName: string;
  tenantInfo: {
    companyName: string;
    subdomain: string;
    subscriptionPlan: string;
    extraAgents: number;
  };
  dashboardStats: {
    totalLeads: number;
    activeBookings: number;
    closedSales: number;
    totalProjects: number;
    pendingTasks: number;
  };
  recentLeads: any[];
  recentTasks: any[];
  tenantUsers: any[];
  currentUserRole: string;
}

export default function WarRoomCommandPageClient({
  initialTab,
  projects,
  tickets,
  tenants,
  chats,
  whatsappTenant,
  helpdeskTickets,
  companyName,
  tenantInfo,
  dashboardStats,
  recentLeads,
  recentTasks,
  tenantUsers,
  currentUserRole,
}: WarRoomCommandPageClientProps) {
  const { theme, lang } = useApp();
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState(initialTab || "analytics");

  // Sync state with URL parameter changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentTab = new URLSearchParams(window.location.search).get("tab") || "analytics";
      setActiveTab(currentTab);

      const handleLocationChange = () => {
        const updatedTab = new URLSearchParams(window.location.search).get("tab") || "analytics";
        setActiveTab(updatedTab);
      };

      window.addEventListener("popstate", handleLocationChange);
      return () => window.removeEventListener("popstate", handleLocationChange);
    }
  }, []);

  const activeTabVal = activeTab === "overview" ? "analytics" : activeTab;

  return (
    <div
      className={`min-h-[85vh] transition-all duration-300 ${
        isDark ? "text-white" : "text-[#0b0f19]"
      }`}
      dir={lang === "AR" ? "rtl" : "ltr"}
      style={{ fontFamily: "'Cairo', 'Inter', sans-serif" }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        body, html, * {
          font-family: 'Cairo', 'Inter', sans-serif !important;
        }
      `}} />

      {/* Tab 1: لوحة التحليلات والتقارير */}
      {activeTabVal === "analytics" && (
        <div className="fade-in">
          <DashboardView 
            tenant={tenantInfo}
            stats={dashboardStats}
            recentLeads={recentLeads}
            recentTasks={recentTasks}
            projects={projects}
          />
        </div>
      )}

      {/* Tab 2: العملاء المحتملين */}
      {activeTabVal === "leads" && (
        <div className="fade-in">
          <LeadsView />
        </div>
      )}

      {/* Tab 3: إدارة المشاريع العقارية */}
      {activeTabVal === "projects" && (
        <div className="fade-in">
          <ProjectsView />
        </div>
      )}

      {/* Tab 4: حاسبة التمويل السكني */}
      {activeTabVal === "calculator" && (
        <div className="fade-in">
          <CalculatorView />
        </div>
      )}

      {/* Tab 5: أداء المبيعات والمؤشرات */}
      {activeTabVal === "sales" && (
        <div className="fade-in">
          <SalesView />
        </div>
      )}

      {/* Tab 6: المهام والتذكيرات */}
      {activeTabVal === "tasks" && (
        <div className="fade-in">
          <TasksView />
        </div>
      )}

      {/* Tab 7: إعدادات النظام */}
      {activeTabVal === "settings" && (
        <div className="fade-in">
          <SettingsView 
            tenant={tenantInfo}
            users={tenantUsers}
            currentUserRole={currentUserRole}
          />
        </div>
      )}

      {/* Tab 8: مركز الدعم والوكيل مساعد */}
      {activeTabVal === "helpdesk" && (
        <div className="fade-in">
          <HelpdeskView initialTickets={helpdeskTickets} tenantName={companyName} />
        </div>
      )}

      {/* Tab 9: قناة الواتساب والوكلاء */}
      {activeTabVal === "whatsapp" && (
        <div className="fade-in">
          <WhatsAppView initialChats={chats} tenant={whatsappTenant} />
        </div>
      )}
    </div>
  );
}
