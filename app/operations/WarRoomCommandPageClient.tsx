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
import MonitorView   from "@/components/views/MonitorView";
import RentalView    from "@/components/views/RentalView";
import AccountingView from "@/components/views/AccountingView";
import DashboardView from "@/app/operations/dashboard/DashboardView";

interface Props {
  initialTab: string;
  projects: any[];
  tickets: any[];
  tenants: any[];
  chats: any[];
  whatsappTenant: { companyName: string; whatsappConnected: boolean };
  helpdeskTickets: any[];
  companyName: string;
  tenantInfo: { companyName: string; subdomain: string; subscriptionPlan: string; extraAgents: number };
  dashboardStats: { totalLeads: number; activeBookings: number; closedSales: number; totalProjects: number; pendingTasks: number };
  recentLeads: any[];
  recentTasks: any[];
  tenantUsers: any[];
  currentUserRole: string;
}

const ROLE_ALLOWED: Record<string, string[]> = {
  PLATFORM_ARCHITECT: ["monitor"],
  ADMIN:              ["analytics","leads","projects","rental","accounting","calculator","sales","tasks","settings","helpdesk","whatsapp"],
  SALES_MANAGER:      ["analytics","leads","projects","rental","accounting","calculator","sales","tasks","helpdesk","whatsapp"],
  SALES_EMPLOYEE:     ["leads","tasks","helpdesk","calculator","rental"],
  MARKETING:          ["analytics","leads","projects","helpdesk","whatsapp"],
  READ_ONLY:          ["analytics","leads","projects"],
};

export default function WarRoomCommandPageClient({
  initialTab, projects, tickets, tenants, chats, whatsappTenant,
  helpdeskTickets, companyName, tenantInfo, dashboardStats,
  recentLeads, recentTasks, tenantUsers, currentUserRole,
}: Props) {
  const { theme, lang } = useApp();
  const isDark = theme === "dark";

  const isPlatformArchitect = currentUserRole === "PLATFORM_ARCHITECT";
  const allowed = ROLE_ALLOWED[currentUserRole] ?? ROLE_ALLOWED.READ_ONLY;
  const defaultTab = isPlatformArchitect ? "monitor" : (initialTab === "overview" ? "analytics" : (initialTab || "analytics"));

  const [activeTab, setActiveTab] = useState(defaultTab);

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
  const font = { fontFamily: "Calibri, 'Cairo', sans-serif" };

  // ─── PLATFORM_ARCHITECT isolation ────────────────────────────────────────
  if (isPlatformArchitect) {
    return (
      <div dir={dir} style={{ ...font, color: isDark ? '#e2e8f0' : '#0b0f19' }}>
        <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🔐</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#f59e0b' }}>
              {lang === "AR" ? "وضع العزل السيبراني النشط" : "Cyber Isolation Mode — Active"}
            </div>
            <div style={{ fontSize: 10, color: '#92400e', marginTop: 3 }}>
              {lang === "AR"
                ? "أنت مسجَّل بصلاحية مطور النخبة. بيانات المستأجرين محجوبة تماماً."
                : "You are logged in as Platform Architect. All tenant business data is strictly denied."}
            </div>
          </div>
        </div>
        <div className="fade-in">
          <MonitorView initialTickets={tickets} initialTenants={tenants} />
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} style={{ ...font, color: isDark ? '#e2e8f0' : '#0b0f19', minHeight: '80vh' }}>
      <style dangerouslySetInnerHTML={{ __html: `.fade-in{animation:opsFade 0.2s ease;}@keyframes opsFade{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:translateY(0);}}` }} />

      {/* ── Case 1: Overview ──────────────────────────────────────────────── */}
      {show("overview") && (
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
      {show("operations") && (
        <div className="fade-in">
          <OperationsComposite
            projects={projects}
            isDark={isDark}
            lang={lang}
            tenantInfo={tenantInfo}
          />
        </div>
      )}

      {/* ── Case 3: Monitor ──────────────────────────────────────────────── */}
      {show("monitor") && (
        <div className="fade-in">
          <MonitorView initialTickets={tickets} initialTenants={tenants} />
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
          <RentalView />
        </div>
      )}

      {show("accounting") && (
        <div className="fade-in">
          <AccountingView />
        </div>
      )}
    </div>
  );
}

// ─── Operations Composite: Module A + Module B ─────────────────────────────
function OperationsComposite({
  projects, isDark, lang, tenantInfo,
}: { projects: any[]; isDark: boolean; lang: string; tenantInfo: any }) {
  const [subTab, setSubTab] = useState<'assets'|'calculator'|'sales'|'leads'|'tasks'>('assets');
  const dir = lang === 'AR' ? 'rtl' : 'ltr';
  const font = { fontFamily: "Calibri, 'Cairo', sans-serif" };

  const SUB = [
    { id: 'assets',     ar: 'الأصول العقارية',  en: 'Real Estate Assets', icon: '🏢' },
    { id: 'calculator', ar: 'حاسبة التمويل',    en: 'Mortgage Calc',      icon: '🧮' },
    { id: 'sales',      ar: 'أداء المبيعات',    en: 'Sales KPIs',         icon: '📊' },
    { id: 'leads',      ar: 'العملاء المحتملين', en: 'Leads Pipeline',     icon: '👥' },
    { id: 'tasks',      ar: 'المهام',            en: 'Tasks',              icon: '📋' },
  ] as const;

  return (
    <div dir={dir} style={font}>
      {/* Sub-tab row */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 24,
        borderBottom: '1px solid rgba(115,83,52,0.2)',
        overflowX: 'auto', paddingBottom: 0,
      }}>
        {SUB.map(s => (
          <button
            key={s.id}
            onClick={() => setSubTab(s.id)}
            style={{
              padding: '8px 16px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
              background: 'transparent', border: 'none',
              borderBottom: subTab === s.id ? '2px solid #735334' : '2px solid transparent',
              color: subTab === s.id ? '#d4a97a' : '#475569',
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', outline: 'none',
            }}
          >
            <span>{s.icon}</span>
            <span>{lang === 'AR' ? s.ar : s.en}</span>
          </button>
        ))}
      </div>

      {/* Module A: Asset Pipelines (ORCA CRM / SAMA DSR) */}
      {subTab === 'assets'     && <div className="fade-in"><ProjectsView /></div>}
      {subTab === 'calculator' && <div className="fade-in"><CalculatorView /></div>}
      {subTab === 'sales'      && <div className="fade-in"><SalesView /></div>}
      {subTab === 'leads'      && <div className="fade-in"><LeadsView /></div>}
      {subTab === 'tasks'      && <div className="fade-in"><TasksView /></div>}
    </div>
  );
}
