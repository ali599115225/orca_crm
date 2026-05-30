// app/operations/OperationsLayoutClient.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/app/context/AppContext';

const ROLE_TRANSLATIONS: Record<string, Record<string, string>> = {
  AR: {
    ADMIN: 'المدير العام',
    SALES_MANAGER: 'مدير المبيعات',
    SALES_EMPLOYEE: 'مستشار عقاري',
    MARKETING: 'إدارة التسويق',
    READ_ONLY: 'مشاهدة فقط',
    PLATFORM_ARCHITECT: 'مطور النخبة',
  },
  EN: {
    ADMIN: 'General Manager',
    SALES_MANAGER: 'Sales Manager',
    SALES_EMPLOYEE: 'Real Estate Consultant',
    MARKETING: 'Marketing Department',
    READ_ONLY: 'Read Only',
    PLATFORM_ARCHITECT: 'Platform Architect',
  },
};

const ALL_MENU_ITEMS = [
  { id: 'analytics',   titleAr: 'لوحة التحليلات والتقارير',  titleEn: 'Analytics & Reports',     icon: '📈', roles: ['ADMIN','SALES_MANAGER','MARKETING','READ_ONLY'] },
  { id: 'leads',       titleAr: 'العملاء المحتملين',         titleEn: 'Prospective Leads',        icon: '👥', roles: ['ADMIN','SALES_MANAGER','SALES_EMPLOYEE','MARKETING'] },
  { id: 'projects',    titleAr: 'إدارة المشاريع العقارية',   titleEn: 'Real Estate Projects',     icon: '🏢', roles: ['ADMIN','SALES_MANAGER','MARKETING','READ_ONLY'] },
  { id: 'rental',      titleAr: 'إدارة الإيجارات',           titleEn: 'Rental Management',        icon: '🏠', roles: ['ADMIN','SALES_MANAGER','SALES_EMPLOYEE'] },
  { id: 'accounting',  titleAr: 'المحاسبة والتقارير المالية',titleEn: 'Accounting & Finance',     icon: '💰', roles: ['ADMIN','SALES_MANAGER'] },
  { id: 'calculator',  titleAr: 'حاسبة التمويل السكني',      titleEn: 'Mortgage Calculator',      icon: '🧮', roles: ['ADMIN','SALES_MANAGER','SALES_EMPLOYEE'] },
  { id: 'sales',       titleAr: 'أداء المبيعات والمؤشرات',   titleEn: 'Sales Performance',        icon: '📊', roles: ['ADMIN','SALES_MANAGER'] },
  { id: 'tasks',       titleAr: 'المهام والتذكيرات',         titleEn: 'Tasks & Reminders',        icon: '📋', roles: ['ADMIN','SALES_MANAGER','SALES_EMPLOYEE'] },
  { id: 'helpdesk',    titleAr: 'مركز الدعم والوكيل مساعد', titleEn: 'Support Center',           icon: '🛠️', roles: ['ADMIN','SALES_MANAGER','SALES_EMPLOYEE','MARKETING'] },
  { id: 'whatsapp',    titleAr: 'قناة الواتساب والوكلاء',   titleEn: 'WhatsApp Channel',         icon: '💬', roles: ['ADMIN','SALES_MANAGER'] },
  { id: 'settings',    titleAr: 'إعدادات النظام',            titleEn: 'System Settings',          icon: '⚙️', roles: ['ADMIN'] },
];

const ARCHITECT_MENU = [
  { id: 'monitor', titleAr: 'مراقبة الاشتراكات والنظام', titleEn: 'System & Subscription Monitor', icon: '📡' },
];

interface Props {
  initialName: string;
  userRoleKey: string;
  isSuperAdmin: boolean;
  companyName: string;
  isNewTenant: boolean;
  logoutAction: () => void;
  children: React.ReactNode;
}

export default function OperationsLayoutClient({
  initialName, userRoleKey, isSuperAdmin, companyName,
  isNewTenant, logoutAction, children,
}: Props) {
  const { theme, lang } = useApp();
  const isDark = theme === 'dark';
  const dir = lang === 'AR' ? 'rtl' : 'ltr';

  const isPlatformArchitect = userRoleKey === 'PLATFORM_ARCHITECT';
  const menuItems = isPlatformArchitect
    ? ARCHITECT_MENU
    : ALL_MENU_ITEMS.filter(item => item.roles.includes(userRoleKey));

  const defaultTab = isPlatformArchitect ? 'monitor' : (menuItems[0]?.id || 'analytics');
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = new URLSearchParams(window.location.search).get('tab') || defaultTab;
    setActiveTab(t);
    const onPop = () => {
      const pt = new URLSearchParams(window.location.search).get('tab') || defaultTab;
      setActiveTab(pt);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const roleTranslated = ROLE_TRANSLATIONS[lang]?.[userRoleKey] || userRoleKey;

  return (
    <div
      className={`h-screen w-full overflow-hidden flex flex-col antialiased transition-colors duration-300 ${
        isDark ? 'bg-[#0b0f19] text-[#e2e8f0]' : 'bg-[#f9f9fb] text-[#0f172a]'
      }`}
      dir={dir}
    >
      {/* تنبيه المستأجر الجديد */}
      {isNewTenant && (
        <div className="bg-amber-500 text-slate-950 text-[10px] font-black py-2.5 px-6 text-center flex items-center justify-center gap-1.5 border-b border-amber-600/30 shrink-0 select-none animate-pulse">
          <span>⚠️ تنبيه إداري: بيانات ملف منشأتك غير مكتملة حالياً!</span>
          <a href="/operations/onboarding" className="underline hover:text-white transition-colors font-bold">
            [ اضغط هنا لتعبئة وتنشيط ملف منشأتك العقارية الآن ]
          </a>
        </div>
      )}

      {/* ── الجسم: flex-row — aside أول في DOM → يمين في RTL، يسار في LTR ─── */}
      <div className="flex-1 flex flex-row overflow-hidden min-h-0">

        {/* ════ SIDEBAR — جانب اليمين ════ */}
        <aside className={`w-[240px] shrink-0 flex flex-col transition-colors duration-300 ${
          isDark
            ? 'bg-[#0d1220] border-slate-800/80 text-white'
            : 'bg-white border-slate-200 shadow-sm'
        } border-l`}> {/* border-l بدلاً من border-r لأنه على اليمين */}

          {/* رأس الـ Sidebar */}
          <div className={`h-16 flex flex-col items-start justify-center px-6 border-b select-none shrink-0 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            {isPlatformArchitect ? (
              <>
                <span className="text-[9px] font-black tracking-widest uppercase text-amber-500 mb-0.5">
                  PLATFORM ARCHITECT
                </span>
                <span className={`text-[10px] font-black tracking-wider ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  ORCA CRM — Admin
                </span>
              </>
            ) : (
              <>
                <span className={`text-[11px] font-black tracking-widest uppercase ${
                  isDark ? 'text-indigo-400' : 'text-indigo-600'
                }`}>
                  {lang === 'AR' ? 'أوركا العقارية ORCA' : 'ORCA Real Estate'}
                </span>
                {companyName && (
                  <span className={`text-[9px] font-bold mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {companyName}
                  </span>
                )}
              </>
            )}
          </div>

          {/* معلومات المستخدم */}
          <div className={`px-5 py-3 border-b shrink-0 ${isDark ? 'border-slate-800/60' : 'border-slate-100'}`}>
            <p className={`text-[10px] font-black truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              {initialName}
              {isSuperAdmin && (
                <span className="mr-2 text-[8px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-black">SUPER</span>
              )}
            </p>
            <p className={`text-[9px] font-bold mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {roleTranslated}
            </p>
          </div>

          {/* قائمة التبويبات */}
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

          {/* Footer — خروج + إصدار */}
          <div className={`p-3 border-t shrink-0 space-y-1 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <form action={logoutAction}>
              <button
                type="submit"
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                  isDark
                    ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border-transparent hover:border-rose-800/40'
                    : 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-transparent hover:border-rose-200'
                }`}
                style={{ fontFamily: "'Cairo', 'Inter', sans-serif" }}
              >
                <span className="text-sm">🚪</span>
                <span>{lang === 'AR' ? 'تسجيل الخروج' : 'Sign Out'}</span>
              </button>
            </form>
            <p className={`text-[9px] text-center select-none font-bold px-2 ${isDark ? 'text-slate-700' : 'text-slate-400'}`}>
              {lang === 'AR' ? 'رقم الإصدار ١.٠' : 'Version 1.0'}
            </p>
          </div>
        </aside>

        {/* ════ MAIN CONTENT ════ */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <div
            className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col justify-start"
            style={{ overscrollBehavior: 'contain' }}
          >
            <div className="w-full">
              {children}
            </div>
            <footer className={`mt-8 border-t pt-4 pb-2 text-center text-[10px] select-none font-bold shrink-0 ${
              isDark ? 'border-gray-800/30 text-slate-600' : 'border-slate-200 text-slate-400'
            }`}>
              <p>{lang === 'AR' ? 'جميع الحقوق محفوظة لوكالة أوركا CRM © ٢٠٢٦' : 'All rights reserved to Orca CRM © 2026'}</p>
            </footer>
          </div>
        </main>

      </div>
    </div>
  );
}
