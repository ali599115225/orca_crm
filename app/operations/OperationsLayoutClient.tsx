// app/operations/OperationsLayoutClient.tsx
'use client';

import React from 'react';
import { useApp } from '@/app/context/AppContext';

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
  
  const [activeTab, setActiveTab] = React.useState('analytics');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const tab = new URLSearchParams(window.location.search).get('tab') || 'analytics';
      setActiveTab(tab);
      
      const handleLocationChange = () => {
        const currentTab = new URLSearchParams(window.location.search).get('tab') || 'analytics';
        setActiveTab(currentTab);
      };
      
      window.addEventListener('popstate', handleLocationChange);
      return () => window.removeEventListener('popstate', handleLocationChange);
    }
  }, []);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      if (window.location.pathname !== '/operations') {
        window.location.href = `/operations?tab=${tabId}`;
      } else {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tabId);
        window.history.pushState(null, '', url.pathname + url.search);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
  };

  const menuItems = [
    { id: 'analytics', titleAr: 'لوحة التحليلات والتقارير', titleEn: 'Analytics & Reports', icon: '📈' },
    { id: 'leads', titleAr: 'العملاء المحتملين', titleEn: 'Prospective Leads', icon: '👥' },
    { id: 'projects', titleAr: 'إدارة المشاريع العقارية', titleEn: 'Real Estate Projects', icon: '🏢' },
    { id: 'calculator', titleAr: 'حاسبة التمويل السكني', titleEn: 'Mortgage Calculator', icon: '🧮' },
    { id: 'sales', titleAr: 'أداء المبيعات والمؤشرات', titleEn: 'Sales Performance', icon: '📊' },
    { id: 'tasks', titleAr: 'المهام والتذكيرات', titleEn: 'Tasks & Reminders', icon: '📋' },
    { id: 'settings', titleAr: 'إعدادات النظام', titleEn: 'System Settings', icon: '⚙️' },
    { id: 'helpdesk', titleAr: 'مركز الدعم والوكيل مساعد', titleEn: 'Support Center', icon: '🛠️' },
    { id: 'whatsapp', titleAr: 'قناة الواتساب والوكلاء', titleEn: 'WhatsApp Channel', icon: '💬' },
  ];

  const roleTranslated = ROLE_TRANSLATIONS[lang]?.[userRoleKey] || ROLE_TRANSLATIONS.AR[userRoleKey] || userRoleKey;

  return (
    <div 
      className={`h-screen w-full overflow-hidden flex flex-col antialiased transition-colors duration-300 selection:bg-indigo-500/20 selection:text-indigo-650 ${
        isDark ? 'bg-[#0b0f19] text-[#e2e8f0]' : 'bg-[#f9f9fb] text-[#0f172a]'
      }`} 
      dir={lang === 'AR' ? 'rtl' : 'ltr'}
    >
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Sidebar */}
        <aside className={`w-[240px] shrink-0 flex flex-col border-l border-r transition-colors duration-300 ${
          isDark 
            ? 'bg-[#0d1220] border-slate-800/80 text-white' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {/* Header */}
          <div className={`h-16 flex items-center px-6 border-b select-none ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <span className={`text-[11px] font-black tracking-widest uppercase ${
              isDark ? 'text-indigo-400' : 'text-indigo-600'
            }`}>
              {lang === 'AR' ? 'أوركا العقارية ORCA' : 'ORCA Real Estate'}
            </span>
          </div>

          {/* Menu */}
          <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-3">
            {menuItems.map((item) => {
              const active = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    active
                      ? isDark
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-black shadow-md'
                        : 'bg-indigo-50 text-indigo-650 border border-indigo-150 font-black shadow-sm'
                      : isDark
                        ? 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
                        : 'text-slate-650 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                  style={{ fontFamily: "'Cairo', 'Inter', sans-serif" }}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{lang === 'AR' ? item.titleAr : item.titleEn}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className={`p-4 border-t text-[10px] text-slate-400 text-center select-none font-bold shrink-0 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            {t.version}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
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
    </div>
  );
}
