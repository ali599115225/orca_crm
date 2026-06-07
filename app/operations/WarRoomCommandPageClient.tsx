// app/operations/WarRoomCommandPageClient.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/app/context/AppContext";
import { useAuth } from "@/app/context/AuthContext";

import WhatsAppView  from "@/components/views/WhatsAppView";
import HelpdeskView  from "@/components/views/HelpdeskView";
import LeadsTabs     from "@/components/views/tabs/LeadsTabs";
import ProjectsView  from "@/components/views/ProjectsView";
import PropertiesView from "@/components/views/PropertiesView";
import CalculatorView from "@/components/views/CalculatorView";
import SalesView     from "@/components/views/SalesView";
import TasksView     from "@/components/views/TasksView";
import SettingsView  from "@/components/views/SettingsView";
import AdvancedErpView from "@/components/views/AdvancedErpView";
import DashboardView from "@/app/operations/dashboard/DashboardView";
import AgentManagementView from "@/components/views/AgentManagementView";
import LogsViewer from "@/components/views/LogsViewer";

interface Props {
  initialTab: string;
  projects: any[];
  tickets: any[];
  tenants: any[];
  chats: any[];
  whatsappTenant: { companyName: string; whatsappConnected: boolean };
  helpdeskTickets: any[];
  companyName: string;
  tenantInfo: { companyName: string; subdomain: string; subscriptionPlan: string; extraAgents: number; growthWarning: boolean };
  dashboardStats: { totalLeads: number; activeBookings: number; closedSales: number; totalProjects: number; pendingTasks: number };
  recentLeads: any[];
  recentTasks: any[];
  tenantUsers: any[];
}

const ROLE_ALLOWED: Record<string, string[]> = {
  PLATFORM_ARCHITECT: ["analytics","leads","projects","properties","rental","calculator","sales","tasks","settings","helpdesk","whatsapp","agents","logs","monitor"],
  ADMIN:              ["analytics","leads","projects","properties","rental","calculator","sales","tasks","settings","helpdesk","whatsapp","agents","logs"],
  SALES_MANAGER:      ["analytics","leads","projects","properties","rental","calculator","sales","tasks","helpdesk","whatsapp","agents"],
  SALES_EMPLOYEE:     ["leads","properties","tasks","helpdesk","calculator","rental","agents"],
  MARKETING:          ["analytics","leads","projects","properties","helpdesk","whatsapp","agents"],
  READ_ONLY:          ["analytics","leads","projects","properties","agents"],
};

export default function WarRoomCommandPageClient({
  initialTab, projects, tickets, tenants, chats, whatsappTenant,
  helpdeskTickets, companyName, tenantInfo, dashboardStats,
  recentLeads, recentTasks, tenantUsers,
}: Props) {
  const { theme, lang } = useApp();
  const { role: currentUserRole } = useAuth();
  const isDark = theme === "dark";
  const isArabic = lang === "AR";

  const allowed = ROLE_ALLOWED[currentUserRole] ?? ROLE_ALLOWED.READ_ONLY;
  // تطبيع التبويب الافتراضي — overview وmonitor يقعان على analytics إذا لم يكن monitor متاحاً
  const defaultTab = (initialTab === "overview")
    ? "analytics"
    : (initialTab === "monitor" && allowed.includes("monitor"))
      ? "monitor"
      : (initialTab && allowed.includes(initialTab))
        ? initialTab
        : "analytics";

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showGrowthAlert, setShowGrowthAlert] = useState(false);

  useEffect(() => {
    if (tenantInfo.growthWarning) {
      setShowGrowthAlert(true);
    }
  }, [tenantInfo.growthWarning]);

  useEffect(() => {
    const syncTab = () => {
      const t = new URLSearchParams(window.location.search).get("tab") || defaultTab;
      setActiveTab(allowed.includes(t) ? t : defaultTab);
    };
    syncTab();
    window.addEventListener("popstate", syncTab);
    return () => window.removeEventListener("popstate", syncTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const show = (tab: string) => activeTab === tab && allowed.includes(tab);
  const dir  = lang === "AR" ? "rtl" : "ltr";
  const font = { fontFamily: "'Calibri', 'Segoe UI', sans-serif" };

  return (
    <div dir={dir} className="min-h-0" style={{ ...font, color: isDark ? '#e2e8f0' : '#0b0f19' }}>

      {/* ── Case 1: Overview ──────────────────────────────────────────────── */}
      {show("analytics") && (
        <div className="nc-view-enter">
          <DashboardView
            tenant={tenantInfo}
            stats={dashboardStats}
            recentLeads={recentLeads}
            recentTasks={recentTasks}
            projects={projects}
          />
        </div>
      )}

      {/* ── Case 2: Operations — أصول + حاسبة + مبيعات + عملاء + مهام ───── */}
      {show("projects") && (
        <div className="nc-view-enter">
          <ProjectsView />
        </div>
      )}

      {show("properties") && (
        <div className="nc-view-enter">
          <PropertiesView />
        </div>
      )}

      {show("calculator") && (
        <div className="nc-view-enter">
          <CalculatorView />
        </div>
      )}

      {show("sales") && (
        <div className="nc-view-enter">
          <SalesView />
        </div>
      )}

      {show("leads") && (
        <div className="nc-view-enter">
          <LeadsTabs />
        </div>
      )}

      {show("tasks") && (
        <div className="nc-view-enter">
          <TasksView />
        </div>
      )}



      {/* ── Case 4: WhatsApp ─────────────────────────────────────────────── */}
      {show("whatsapp") && (
        <div className="nc-view-enter">
          <WhatsAppView initialChats={chats} tenant={whatsappTenant} />
        </div>
      )}

      {/* ── Case 5: Helpdesk ─────────────────────────────────────────────── */}
      {show("helpdesk") && (
        <div className="nc-view-enter">
          <HelpdeskView initialTickets={helpdeskTickets} tenantName={companyName} />
        </div>
      )}

      {/* ── Case 6: Settings ─────────────────────────────────────────────── */}
      {show("settings") && (
        <div className="nc-view-enter">
          <SettingsView
            tenant={tenantInfo}
            users={tenantUsers}
          />
        </div>
      )}

      {show("rental") && (
        <div className="nc-view-enter">
          <AdvancedErpView tenantPlan={tenantInfo.subscriptionPlan} initialTab="ijara" />
        </div>
      )}

      {show("agents") && (
        <div className="nc-view-enter">
          <AgentManagementView 
            tenantPlan={tenantInfo.subscriptionPlan}
            totalLeads={dashboardStats.totalLeads}
            totalProjects={dashboardStats.totalProjects}
            totalUsers={tenantUsers.length}
          />
        </div>
      )}

      {show("logs") && (
        <div className="nc-view-enter">
          <LogsViewer />
        </div>
      )}

      {show("monitor") && (
        <div className="nc-view-enter">
          {/* Platform Architect — لوحة المراقبة الكاملة */}
          <DashboardView
            tenant={tenantInfo}
            stats={dashboardStats}
            recentLeads={recentLeads}
            recentTasks={recentTasks}
            projects={projects}
          />
        </div>
      )}

      {/* ⚠️ Glassmorphic Growth Warning Modal (تحذير اقتراب سعة الباقة) */}
      {showGrowthAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4 animate-fade-in">
          <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/90 border border-slate-200/50 dark:border-white/10 max-w-md w-full p-6 space-y-6 shadow-2xl text-center" dir={dir}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-corporate-blue/10 dark:bg-cyan-glow/5 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-corporate-blue/10 dark:bg-cyan-glow/5 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 text-xl animate-pulse">
                <i className="ph-bold ph-warning text-lg"></i>
              </div>
              <h3 className="text-slate-900 dark:text-white font-extrabold text-base tracking-wide">
                {lang === 'AR' ? "تحذير اقتراب السعة - ٨٠٪ مستهلك!" : "Capacity Warning - 80% Consumed!"}
              </h3>
            </div>

            <div className="bg-slate-200/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 p-4 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-medium leading-relaxed font-sans text-right" dir={dir}>
              <p className="text-center font-bold text-corporate-blue dark:text-cyan-glow mb-2">
                {lang === 'AR' ? `نظام مراقبة النمو للوكيل منصور` : `Mansour Growth Intelligence Alert`}
              </p>
              <p className="text-center text-[11px] leading-relaxed text-slate-650 dark:text-slate-350">
                {lang === 'AR' 
                  ? `أهلاً بك، لاحظت أننا استهلكنا 80% من سعة باقتك الحالية. لضمان استمرارية أداء حملاتك دون انقطاع وتجنب قفل سعة المقاعد أو العملاء، نقترح اتخاذ إجراء فوري.`
                  : `Welcome, we observed that you have consumed 80% of your current plan limits. To ensure uninterrupted flow and avoid capacity locks, we recommend action.`}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button 
                onClick={() => {
                  setShowGrowthAlert(false);
                  // Redirect to agents tab leasing
                  window.history.pushState(null, '', `?tab=agents&action=renew-lease`);
                  window.dispatchEvent(new CustomEvent('popstate'));
                }}
                className="w-full bg-corporate-blue dark:bg-cyan-glow text-white dark:text-slate-950 text-xs font-bold py-2.5 rounded-xl cursor-pointer text-center transition-all shadow-md hover:opacity-90"
              >
                {lang === 'AR' ? "استئجار وكيل إضافي (٤٠٠ ر.س)" : "Lease Extra Agent (400 SAR)"}
              </button>
              <button 
                onClick={() => {
                  setShowGrowthAlert(false);
                  // Redirect to settings view upgrade
                  window.history.pushState(null, '', `?tab=settings`);
                  window.dispatchEvent(new CustomEvent('popstate'));
                }}
                className="w-full bg-slate-200/50 dark:bg-white/5 hover:bg-slate-300/50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-350 text-xs font-bold py-2.5 rounded-xl cursor-pointer text-center transition-all border border-slate-200/50 dark:border-white/10 flex items-center justify-center gap-1.5"
              >
                <i className="ph-bold ph-sparkle"></i>
                <span>{lang === 'AR' ? "ترقية الباقة الشاملة ➔" : "Upgrade Entire Plan ➔"}</span>
              </button>
              <button 
                onClick={() => setShowGrowthAlert(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-medium text-[10px] font-bold py-2 rounded-xl cursor-pointer transition-all border border-slate-200/50 dark:border-white/10"
              >
                {lang === 'AR' ? "تجاهل التنبيه مؤقتاً" : "Dismiss Alert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


