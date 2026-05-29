// app/operations/OperationsLayoutClient.tsx
'use client';

import React from 'react';
import { useApp } from '@/app/context/AppContext';
import TopBarClient from '@/app/components/TopBarClient';

const ROLE_TRANSLATIONS: Record<string, Record<string, string>> = {
  AR: {
    ADMIN: "المدير العام",
    SALES_MANAGER: "مدير المبيعات",
    SALES_EMPLOYEE: "مستشار عقاري",
    MARKETING: "إدارة التسويق",
    READ_ONLY: "مشاهدة فقط",
  },
  EN: {
    ADMIN: "General Manager",
    SALES_MANAGER: "Sales Manager",
    SALES_EMPLOYEE: "Real Estate Consultant",
    MARKETING: "Marketing Department",
    READ_ONLY: "Read Only",
  }
};

const TRANSLATIONS = {
  AR: {
    analytics: "لوحة التحليلات والتقارير",
    leads: "العملاء المحتملين",
    projects: "إدارة المشاريع العقارية",
    calculator: "حاسبة التمويل السكني",
    sales: "أداء المبيعات والمؤشرات",
    tasks: "المهام والتذكيرات",
    settings: "إعدادات النظام",
    helpdesk: "مركز الدعم والوكيل مساعد",
    whatsapp: "قناة الواتساب والوكلاء",
    supportMonitor: "مراقبة الدعم والاشتراكات",
    logout: "تسجيل الخروج",
    currentCompany: "الشركة الحالية:",
    professionalPlan: "الباقة الاحترافية (نشط)",
    copyrights: "جميع الحقوق محفوظة لوكالة أوركا",
    version: "رقم الإصدار ١.٠",
    alertTitle: "⚠️ تنبيه إداري: بيانات ملف منشأتك غير مكتملة حالياً!",
    alertAction: "[ اضغط هنا لتعبئة وتنشيط ملف منشأتك العقارية الآن ]",
    footerCopyrights: "جميع الحقوق محفوظة لوكالة أوركا CRM © ٢٠٢٦"
  },
  EN: {
    analytics: "Analytics & Reporting Dashboard",
    leads: "Investment Lead Pipeline",
    projects: "Real Estate Asset Portfolio",
    calculator: "Advanced Mortgage Calculator",
    sales: "Sales Performance & KPIs",
    tasks: "Task & Field Ledger",
    settings: "System & SaaS Settings",
    helpdesk: "Support Center & AI Helpdesk",
    whatsapp: "WhatsApp Integration Channel",
    supportMonitor: "Subscription Monitor",
    logout: "Logout",
    currentCompany: "Current Company:",
    professionalPlan: "Professional Plan (Active)",
    copyrights: "All rights reserved to Orca Agency",
    version: "Version 1.0",
    alertTitle: "⚠️ Administrative Alert: Your tenant profile is currently incomplete!",
    alertAction: "[ Click here to fill and activate your real estate profile now ]",
    footerCopyrights: "All rights reserved to Orca CRM © 2026"
  }
};

interface OperationsLayoutClientProps {
  initialName: string;
  userRoleKey: string;
  isSuperAdmin: boolean;
  companyName: string;
  isNewTenant: boolean;
  logoutAction: () => void;
  children: React.ReactNode;
}

export default function OperationsLayoutClient({
  initialName,
  userRoleKey,
  isSuperAdmin,
  companyName,
  isNewTenant,
  logoutAction,
  children,
}: OperationsLayoutClientProps) {
  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;
  const isDark = theme === 'dark';
  
  const roleTranslated = ROLE_TRANSLATIONS[lang]?.[userRoleKey] || ROLE_TRANSLATIONS.AR[userRoleKey] || userRoleKey;

  return (
    <div 
      className={`h-screen w-screen overflow-hidden flex antialiased transition-colors duration-300 selection:bg-amber-500/20 selection:text-amber-600 ${
        isDark ? 'bg-[#0b0f19] text-[#e2e8f0]' : 'bg-[#f9f9fb] text-[#0f172a]'
      }`} 
      dir={lang === 'AR' ? 'rtl' : 'ltr'}
    >
      {/* 1. Sidebar Panel */}
      <aside 
        className={`h-full w-full md:w-64 flex flex-col shrink-0 shadow-2xl relative z-10 transition-colors duration-300 ${
          isDark 
            ? 'bg-[#0e121e] text-white border-[#735334]/30' 
            : 'bg-white text-slate-800 border-slate-200'
        } ${lang === 'AR' ? 'border-l text-right' : 'border-r text-left'}`}
      >
        {/* Sidebar Brand Header */}
        <div className={`p-6 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <span className={`text-xl font-black tracking-wider ${isDark ? 'text-amber-500' : 'text-[#735334]'}`}>
            ORCA CRM
          </span>
          <span className={`text-[10px] px-2.5 py-1 rounded-md font-extrabold tracking-wide border ${
            isDark 
              ? 'bg-slate-800/80 text-amber-300 border-amber-500/10' 
              : 'bg-amber-50 text-[#735334] border-[#735334]/20'
          }`}>
            {lang === 'AR' ? 'تطوير عقاري' : 'Real Estate'}
          </span>
        </div>
        
        {/* Tenant Information Widget */}
        <div className={`px-6 py-4 border-b bg-opacity-30 ${
          isDark ? 'border-slate-800 bg-slate-950/30' : 'border-slate-105 bg-slate-50'
        }`}>
          <p className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t.currentCompany}
          </p>
          <p className={`font-extrabold text-sm truncate mt-0.5 ${isDark ? 'text-slate-100' : 'text-slate-850'}`}>
            {isNewTenant ? (lang === 'AR' ? "منشأة جديدة قيد التأسيس" : "New Tenant Under Setup") : companyName}
          </p>
          <span className={`inline-block mt-2 text-[9px] border px-2.5 py-1 rounded-full font-bold ${
            isDark 
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            {t.professionalPlan}
          </span>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-4 space-y-1.5 text-xs font-bold overflow-y-auto">
          {/* Analytics link */}
          <a 
            href="/operations/analytics" 
            className={`flex items-center space-x-3 ${lang === 'AR' ? 'space-x-reverse' : ''} px-4 py-3 rounded-lg transition-all duration-300 hover:scale-[1.02] ${
              isDark ? 'text-slate-350 hover:bg-slate-800/60 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <svg width="20" height="20" className="w-4.5 h-4.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
            </svg>
            <span>{t.analytics}</span>
          </a>

          {/* Leads link */}
          <a 
            href="/operations/leads" 
            className={`flex items-center space-x-3 ${lang === 'AR' ? 'space-x-reverse' : ''} px-4 py-3 rounded-lg transition-all duration-300 hover:scale-[1.02] ${
              isDark ? 'text-slate-350 hover:bg-slate-800/60 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <svg width="20" height="20" className="w-4.5 h-4.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{t.leads}</span>
          </a>

          {/* Projects link */}
          <a 
            href="/operations/projects" 
            className={`flex items-center space-x-3 ${lang === 'AR' ? 'space-x-reverse' : ''} px-4 py-3 rounded-lg transition-all duration-300 hover:scale-[1.02] ${
              isDark ? 'text-slate-350 hover:bg-slate-800/60 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <svg width="20" height="20" className="w-4.5 h-4.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011-1v5m-4 0h4" />
            </svg>
            <span>{t.projects}</span>
          </a>

          {/* Calculator link */}
          <a 
            href="/operations/calculator" 
            className={`flex items-center space-x-3 ${lang === 'AR' ? 'space-x-reverse' : ''} px-4 py-3 rounded-lg transition-all duration-300 hover:scale-[1.02] ${
              isDark ? 'text-slate-350 hover:bg-slate-800/60 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <svg width="20" height="20" className="w-4.5 h-4.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>{t.calculator}</span>
          </a>

          {/* Sales link */}
          <a 
            href="/operations/sales" 
            className={`flex items-center space-x-3 ${lang === 'AR' ? 'space-x-reverse' : ''} px-4 py-3 rounded-lg transition-all duration-300 hover:scale-[1.02] ${
              isDark ? 'text-slate-350 hover:bg-slate-800/60 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <svg width="20" height="20" className="w-4.5 h-4.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>{t.sales}</span>
          </a>

          {/* Tasks link */}
          <a 
            href="/operations/tasks" 
            className={`flex items-center space-x-3 ${lang === 'AR' ? 'space-x-reverse' : ''} px-4 py-3 rounded-lg transition-all duration-300 hover:scale-[1.02] ${
              isDark ? 'text-slate-350 hover:bg-slate-800/60 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <svg width="20" height="20" className="w-4.5 h-4.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span>{t.tasks}</span>
          </a>

          {/* Settings link */}
          <a 
            href="/operations/settings" 
            className={`flex items-center space-x-3 ${lang === 'AR' ? 'space-x-reverse' : ''} px-4 py-3 rounded-lg transition-all duration-300 hover:scale-[1.02] ${
              isDark ? 'text-slate-350 hover:bg-slate-800/60 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <svg width="20" height="20" className="w-4.5 h-4.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{t.settings}</span>
          </a>

          {/* Helpdesk link */}
          <a 
            href="/operations/helpdesk" 
            className={`flex items-center space-x-3 ${lang === 'AR' ? 'space-x-reverse' : ''} px-4 py-3 rounded-lg transition-all duration-300 hover:scale-[1.02] ${
              isDark ? 'text-slate-350 hover:bg-slate-800/60 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <svg width="20" height="20" className="w-4.5 h-4.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>{t.helpdesk}</span>
          </a>

          {/* WhatsApp link */}
          <a 
            href="/operations/whatsapp" 
            className={`flex items-center space-x-3 ${lang === 'AR' ? 'space-x-reverse' : ''} px-4 py-3 rounded-lg transition-all duration-300 hover:scale-[1.02] ${
              isDark ? 'text-slate-350 hover:bg-slate-800/60 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <svg width="20" height="20" className="w-4.5 h-4.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>{t.whatsapp}</span>
          </a>

          {/* Support Monitor (Super Admin only) */}
          {isSuperAdmin && (
            <a 
              href="/operations/support-monitor" 
              className={`flex items-center space-x-3 ${lang === 'AR' ? 'space-x-reverse' : ''} px-4 py-3 rounded-lg transition-all duration-300 hover:scale-[1.02] ${
                isDark ? 'text-slate-350 hover:bg-slate-800/60 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <svg width="20" height="20" className="w-4.5 h-4.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>{t.supportMonitor}</span>
            </a>
          )}

          {/* Logout Form Trigger */}
          <div className={`pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <button 
              onClick={logoutAction}
              className={`w-full flex items-center space-x-3 ${lang === 'AR' ? 'space-x-reverse' : ''} px-4 py-3 rounded-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer hover:bg-rose-950/40 text-slate-400 hover:text-rose-450`}
            >
              <svg width="20" height="20" className="w-4.5 h-4.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>{t.logout}</span>
            </button>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className={`p-4 border-t text-[9px] text-slate-500 shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <p>{t.copyrights}</p>
          <p className="mt-1">{t.version}</p>
        </div>
      </aside>

      {/* 2. Main Content Wrapper */}
      <main className="h-full flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Uniform TopBar Controller */}
        <TopBarClient 
          initialName={initialName} 
          initialRole={roleTranslated} 
        />

        {/* Tenant Profile Alert Warning Banner */}
        {isNewTenant && (
          <div className="bg-amber-500 text-slate-950 text-[10px] font-black py-2.5 px-6 text-center animate-pulse flex items-center justify-center gap-1.5 border-b border-amber-600/30 shrink-0 select-none">
            <span>{t.alertTitle}</span>
            <a href="/operations/onboarding" className="underline hover:text-white transition-colors font-bold">
              {t.alertAction}
            </a>
          </div>
        )}

        {/* Core dynamic content viewer */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col justify-start" style={{ overscrollBehavior: 'contain' }}>
          <div className="w-full">
            {children}
          </div>
          
          <footer className="mt-8 border-t border-gray-250/20 pt-4 pb-2 text-center text-[10px] text-slate-400 select-none font-bold shrink-0">
            <p>{t.footerCopyrights}</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
