"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/app/context/AppContext";

// استيراد جميع الواجهات
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

// ─── مصفوفة الصلاحيات الكاملة لكل دور ───────────────────────────────────────
// PLATFORM_ARCHITECT: monitor فقط — حظر تام من بيانات المستأجرين
// ADMIN: كل التبويبات لشركته بما فيها الفوترة لـ ZATKA
// SALES_MANAGER: معظم التبويبات ما عدا Settings
// SALES_EMPLOYEE: تبويبات العمل الميداني فقط
// MARKETING: تحليلات + عملاء + واتساب
// READ_ONLY: قراءة فقط

const ROLE_ALLOWED_TABS: Record<string, string[]> = {
  PLATFORM_ARCHITECT: ["monitor"],
  ADMIN: ["analytics", "leads", "projects", "calculator", "sales", "tasks", "settings", "helpdesk", "whatsapp", "zatka"],
  SALES_MANAGER: ["analytics", "leads", "projects", "calculator", "sales", "tasks", "helpdesk", "whatsapp", "zatka"],
  SALES_EMPLOYEE: ["leads", "tasks", "helpdesk", "calculator"],
  MARKETING: ["analytics", "leads", "projects", "helpdesk", "whatsapp"],
  READ_ONLY: ["analytics", "leads", "projects"],
};

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

  // ─── عزل PLATFORM_ARCHITECT ───────────────────────────────────────────────
  const isPlatformArchitect = currentUserRole === "PLATFORM_ARCHITECT";
  const allowedTabs = ROLE_ALLOWED_TABS[currentUserRole] ?? ROLE_ALLOWED_TABS.READ_ONLY;
  const defaultTab = isPlatformArchitect ? "monitor" : (initialTab || "analytics");

  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlTab = new URLSearchParams(window.location.search).get("tab") || defaultTab;
    // ─── صمام الأمان: رفض أي تبويب خارج الصلاحيات ───────────────────────
    const safeTab = allowedTabs.includes(urlTab) ? urlTab : defaultTab;
    setActiveTab(safeTab);

    const onPopState = () => {
      const t = new URLSearchParams(window.location.search).get("tab") || defaultTab;
      setActiveTab(allowedTabs.includes(t) ? t : defaultTab);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // تطبيع تبويب overview → analytics
  const activeTabVal = activeTab === "overview" ? "analytics" : activeTab;

  const wrapperClass = `min-h-[85vh] transition-all duration-300 ${isDark ? "text-white" : "text-[#0b0f19]"}`;
  const dir = lang === "AR" ? "rtl" : "ltr";
  const fontStyle: React.CSSProperties = { fontFamily: "'Cairo', 'Inter', sans-serif" };

  // ─── PLATFORM_ARCHITECT: لوحة المراقبة الحيوية — بيانات عقارية محجوبة ────
  if (isPlatformArchitect) {
    return (
      <div className={wrapperClass} dir={dir} style={fontStyle}>
        <div className="mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-3 text-xs font-bold text-amber-400">
          <span className="text-lg shrink-0">🔐</span>
          <div>
            <div className="text-[11px] font-black text-amber-300">
              {lang === "AR" ? "وضع العزل السيبراني النشط" : "Cyber Isolation Mode — Active"}
            </div>
            <div className="text-[10px] mt-0.5 text-amber-400/80">
              {lang === "AR"
                ? "أنت مسجَّل بصلاحية مطور النخبة (Platform Architect). بيانات المستأجرين العقاريين: مُحجوبة تماماً — لا قراءة ولا استعراض."
                : "You are logged in as Platform Architect. All tenant business data (leads, deals, projects, WhatsApp) is strictly denied for privacy protection."}
            </div>
          </div>
        </div>
        <MonitorView initialTickets={tickets} initialTenants={tenants} />
      </div>
    );
  }

  // ─── بقية الأدوار: عرض التبويبات المسموح بها فقط ─────────────────────────
  return (
    <div className={wrapperClass} dir={dir} style={fontStyle}>
      <style dangerouslySetInnerHTML={{ __html: `
        * { font-family: 'Cairo', 'Inter', sans-serif !important; }
        .fade-in { animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}} />

      {/* ─── Analytics ─────────────────────────────────────────────────────── */}
      {activeTabVal === "analytics" && allowedTabs.includes("analytics") && (
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

      {/* ─── Leads ─────────────────────────────────────────────────────────── */}
      {activeTabVal === "leads" && allowedTabs.includes("leads") && (
        <div className="fade-in">
          <LeadsView />
        </div>
      )}

      {/* ─── Projects ──────────────────────────────────────────────────────── */}
      {activeTabVal === "projects" && allowedTabs.includes("projects") && (
        <div className="fade-in">
          <ProjectsView />
        </div>
      )}

      {/* ─── Calculator ────────────────────────────────────────────────────── */}
      {activeTabVal === "calculator" && allowedTabs.includes("calculator") && (
        <div className="fade-in">
          <CalculatorView />
        </div>
      )}

      {/* ─── Sales ─────────────────────────────────────────────────────────── */}
      {activeTabVal === "sales" && allowedTabs.includes("sales") && (
        <div className="fade-in">
          <SalesView />
        </div>
      )}

      {/* ─── Tasks ─────────────────────────────────────────────────────────── */}
      {activeTabVal === "tasks" && allowedTabs.includes("tasks") && (
        <div className="fade-in">
          <TasksView />
        </div>
      )}

      {/* ─── Settings: ADMIN فقط ───────────────────────────────────────────── */}
      {activeTabVal === "settings" && allowedTabs.includes("settings") && (
        <div className="fade-in">
          <SettingsView
            tenant={tenantInfo}
            users={tenantUsers}
            currentUserRole={currentUserRole}
          />
        </div>
      )}

      {/* ─── Helpdesk ──────────────────────────────────────────────────────── */}
      {activeTabVal === "helpdesk" && allowedTabs.includes("helpdesk") && (
        <div className="fade-in">
          <HelpdeskView initialTickets={helpdeskTickets} tenantName={companyName} />
        </div>
      )}

      {/* ─── WhatsApp ──────────────────────────────────────────────────────── */}
      {activeTabVal === "whatsapp" && allowedTabs.includes("whatsapp") && (
        <div className="fade-in">
          <WhatsAppView initialChats={chats} tenant={whatsappTenant} />
        </div>
      )}

      {/* ─── ZATKA E-Invoicing Compliance Gateway ─────────────────────────── */}
      {activeTabVal === "zatka" && allowedTabs.includes("zatka") && (
        <div className="fade-in">
          <ZatkaView />
        </div>
      )}
    </div>
  );
}
