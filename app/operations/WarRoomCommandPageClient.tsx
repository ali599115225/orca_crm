// app/operations/WarRoomCommandPageClient.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/app/context/AppContext";

import WhatsAppView  from "@/components/views/WhatsAppView";
import HelpdeskView  from "@/components/views/HelpdeskView";
import LeadsView     from "@/components/views/LeadsView";
import ProjectsView  from "@/components/views/ProjectsView";
import CalculatorView from "@/components/views/CalculatorView";
import SalesView     from "@/components/views/SalesView";
import TasksView     from "@/components/views/TasksView";
import SettingsView  from "@/components/views/SettingsView";
import RentalView    from "@/components/views/RentalView";
import AdvancedErpView from "@/components/views/AdvancedErpView";
import DashboardView from "@/app/operations/dashboard/DashboardView";
import GrowthView from "@/components/views/GrowthView";
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
  currentUserRole: string;
}

const ROLE_ALLOWED: Record<string, string[]> = {
  ADMIN:              ["analytics","leads","projects","rental","calculator","sales","tasks","settings","helpdesk","whatsapp","growth","agents","logs"],
  SALES_MANAGER:      ["analytics","leads","projects","rental","calculator","sales","tasks","helpdesk","whatsapp","growth","agents"],
  SALES_EMPLOYEE:     ["leads","tasks","helpdesk","calculator","rental","agents"],
  MARKETING:          ["analytics","leads","projects","helpdesk","whatsapp","growth","agents"],
  READ_ONLY:          ["analytics","leads","projects","agents"],
};

export default function WarRoomCommandPageClient({
  initialTab, projects, tickets, tenants, chats, whatsappTenant,
  helpdeskTickets, companyName, tenantInfo, dashboardStats,
  recentLeads, recentTasks, tenantUsers, currentUserRole,
}: Props) {
  const { theme, lang } = useApp();
  const isDark = theme === "dark";
  const isArabic = lang === "AR";

  const allowed = ROLE_ALLOWED[currentUserRole] ?? ROLE_ALLOWED.READ_ONLY;
  const defaultTab = initialTab === "overview" ? "analytics" : (initialTab || "analytics");

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
    <div dir={dir} style={{ ...font, color: isDark ? '#e2e8f0' : '#0b0f19', minHeight: '80vh' }}>
      <style dangerouslySetInnerHTML={{ __html: `.fade-in{animation:opsFade 0.2s ease;}@keyframes opsFade{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:translateY(0);}}` }} />

      {/* ── Case 1: Overview ──────────────────────────────────────────────── */}
      {show("analytics") && (
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

      {/* ── Case 2: Operations — أصول + حاسبة + مبيعات + عملاء + مهام ───── */}
      {show("projects") && (
        <div className="fade-in">
          <ProjectsView />
        </div>
      )}

      {show("calculator") && (
        <div className="fade-in">
          <CalculatorView />
        </div>
      )}

      {show("sales") && (
        <div className="fade-in">
          <SalesView />
        </div>
      )}

      {show("leads") && (
        <div className="fade-in">
          <LeadsView />
        </div>
      )}

      {show("tasks") && (
        <div className="fade-in">
          <TasksView />
        </div>
      )}



      {/* ── Case 4: WhatsApp ─────────────────────────────────────────────── */}
      {show("whatsapp") && (
        <div className="fade-in">
          <WhatsAppView initialChats={chats} tenant={whatsappTenant} />
        </div>
      )}

      {/* ── Case 5: Helpdesk ─────────────────────────────────────────────── */}
      {show("helpdesk") && (
        <div className="fade-in">
          <HelpdeskView initialTickets={helpdeskTickets} tenantName={companyName} />
        </div>
      )}

      {/* ── Case 6: Settings ─────────────────────────────────────────────── */}
      {show("settings") && (
        <div className="fade-in">
          <SettingsView
            tenant={tenantInfo}
            users={tenantUsers}
            currentUserRole={currentUserRole}
          />
        </div>
      )}

      {show("rental") && (
        <div className="fade-in">
          <AdvancedErpView tenantPlan={tenantInfo.subscriptionPlan} initialTab="ijara" />
        </div>
      )}

      {show("growth") && (
        <div className="fade-in">
          <GrowthView tenantPlan={tenantInfo.subscriptionPlan} />
        </div>
      )}

      {show("agents") && (
        <div className="fade-in">
          <AgentManagementView 
            tenantPlan={tenantInfo.subscriptionPlan}
            totalLeads={dashboardStats.totalLeads}
            totalProjects={dashboardStats.totalProjects}
            totalUsers={tenantUsers.length}
          />
        </div>
      )}

      {show("logs") && (
        <div className="fade-in">
          <LogsViewer />
        </div>
      )}

      {/* ⚠️ Glassmorphic Growth Warning Modal (تحذير اقتراب سعة الباقة) */}
      {showGrowthAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4 animate-fade-in">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[#1e1c3a] to-slate-950 border-2 border-indigo-500/30 max-w-md w-full p-6 space-y-6 shadow-[0_0_30px_rgba(99,102,241,0.25)] text-center" dir={dir}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#df7b62]/10 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#df7b62]/20 border border-[#df7b62]/40 flex items-center justify-center text-[#df7b62] text-xl animate-pulse">
                <i className="ph-bold ph-warning text-lg"></i>
              </div>
              <h3 className="text-white font-extrabold text-base tracking-wide">
                {lang === 'AR' ? "تحذير اقتراب السعة - ٨٠٪ مستهلك!" : "Capacity Warning - 80% Consumed!"}
              </h3>
            </div>

            <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl text-xs text-slate-300 leading-relaxed font-sans text-right" dir={dir}>
              <p className="text-center font-bold text-[#df7b62] mb-2">
                {lang === 'AR' ? `نظام مراقبة النمو للوكيل منصور` : `Mansour Growth Intelligence Alert`}
              </p>
              <p className="text-center text-[11px] leading-relaxed text-slate-400">
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
                className="w-full bg-gradient-to-r from-indigo-650 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer text-center transition-all shadow-md"
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
                className="w-full bg-gradient-to-r from-[#df7b62] to-[#c5654e] hover:shadow-[0_0_15px_rgba(223,123,98,0.3)] text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer text-center transition-all border border-[#df7b62]/30 flex items-center justify-center gap-1.5"
              >
                <i className="ph-bold ph-sparkle"></i>
                <span>{lang === 'AR' ? "ترقية الباقة الشاملة ➔" : "Upgrade Entire Plan ➔"}</span>
              </button>
              <button 
                onClick={() => setShowGrowthAlert(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-350 text-[10px] font-bold py-2 rounded-xl cursor-pointer transition-all border border-slate-750"
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


