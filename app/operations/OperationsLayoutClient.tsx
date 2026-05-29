'use client';

import React from 'react';
import { useApp } from '@/app/context/AppContext';
import { LogOut } from 'lucide-react'; // تم استيراد أيقونة الخروج

const ROLE_TRANSLATIONS: Record<string, Record<string, string>> = {
  AR: { ADMIN: "المدير العام", SALES_MANAGER: "مدير المبيعات", SALES_EMPLOYEE: "مستشار عقاري", MARKETING: "إدارة التسويق", READ_ONLY: "مشاهدة فقط" },
  EN: { ADMIN: "General Manager", SALES_MANAGER: "Sales Manager", SALES_EMPLOYEE: "Real Estate Consultant", MARKETING: "Marketing Department", READ_ONLY: "Read Only" }
};

const TRANSLATIONS = {
  AR: {
    analytics: "لوحة التحليلات والتقارير", leads: "العملاء المحتملين", projects: "إدارة المشاريع العقارية", calculator: "حاسبة التمويل السكني",
    sales: "أداء المبيعات والمؤشرات", tasks: "المهام والتذكيرات", settings: "إعدادات النظام", helpdesk: "مركز الدعم والوكيل مساعد",
    whatsapp: "قناة الواتساب والوكلاء", logout: "تسجيل الخروج", version: "رقم الإصدار ١.٠", footerCopyrights: "جميع الحقوق محفوظة لوكالة أوركا CRM © ٢٠٢٦"
  },
  EN: {
    analytics: "Analytics & Reporting", leads: "Investment Lead Pipeline", projects: "Real Estate Projects", calculator: "Mortgage Calculator",
    sales: "Sales Performance & KPIs", tasks: "Tasks & Reminders", settings: "System Settings", helpdesk: "Support Center & AI Helpdesk",
    whatsapp: "WhatsApp Integration", logout: "Logout", version: "Version 1.0", footerCopyrights: "All rights reserved to Orca CRM © 2026"
  }
};

export default function OperationsLayoutClient({ initialName, userRoleKey, isSuperAdmin, companyName, isNewTenant, logoutAction, children }: any) {
  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = React.useState('analytics');

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      window.location.href = `/operations?tab=${tabId}`;
    }
  };

  const ALL_MENU_ITEMS = [
    { id: 'analytics', titleAr: 'لوحة التحليلات والتقارير', titleEn: 'Analytics', icon: '📈', roles: ['ADMIN', 'SALES_MANAGER', 'MARKETING', 'READ_ONLY'] },
    { id: 'leads', titleAr: 'العملاء المحتملين', titleEn: 'Leads', icon: '👥', roles: ['ADMIN', 'SALES_MANAGER', 'SALES_EMPLOYEE', 'MARKETING'] },
    { id: 'projects', titleAr: 'إدارة المشاريع', titleEn: 'Projects', icon: '🏢', roles: ['ADMIN', 'SALES_MANAGER', 'MARKETING', 'READ_ONLY'] },
    { id: 'ejar', titleAr: 'عقود الإيجار', titleEn: 'Ejar Contracts', icon: '📄', roles: ['ADMIN', 'SALES_MANAGER'] },
    { id: 'accounting', titleAr: 'المحاسبة', titleEn: 'Accounting', icon: '🧮', roles: ['ADMIN', 'SALES_MANAGER'] },
    { id: 'sales', titleAr: 'أداء المبيعات', titleEn: 'Sales KPIs', icon: '📊', roles: ['ADMIN', 'SALES_MANAGER'] },
    { id: 'tasks', titleAr: 'المهام والتذكيرات', titleEn: 'Tasks', icon: '📋', roles: ['ADMIN', 'SALES_MANAGER', 'SALES_EMPLOYEE'] },
    { id: 'settings', titleAr: 'إعدادات النظام', titleEn: 'Settings', icon: '⚙️', roles: ['ADMIN'] },
    { id: 'helpdesk', titleAr: 'مركز الدعم', titleEn: 'Support', icon: '🛠️', roles: ['ADMIN', 'SALES_MANAGER', 'SALES_EMPLOYEE', 'MARKETING'] },
    { id: 'whatsapp', titleAr: 'قناة الواتساب', titleEn: 'WhatsApp', icon: '💬', roles: ['ADMIN', 'SALES_MANAGER'] },
  ];

  const menuItems = ALL_MENU_ITEMS.filter(item => item.roles.includes(userRoleKey));

  return (
    <div className={`h-screen w-full flex flex-col ${isDark ? 'bg-[#0b0f19]' : 'bg-[#f9f9fb]'}`} dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      <div className="flex-1 flex overflow-hidden">
        <aside className={`w-[240px] flex flex-col border-r ${isDark ? 'bg-[#0d1220] border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="h-16 flex items-center px-6 border-b"><span className="text-[11px] font-black text-indigo-600">ORCA CRM</span></div>
          <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => handleTabClick(item.id)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl ${activeTab === item.id ? 'bg-indigo-600/20 text-indigo-500' : 'text-slate-500 hover:bg-slate-100'}`}>
                <span>{item.icon}</span><span>{lang === 'AR' ? item.titleAr : item.titleEn}</span>
              </button>
            ))}
          </nav>
          {/* زر الخروج المضاف */}
          <div className="p-4 border-t">
            <button onClick={logoutAction} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl text-xs font-bold transition-all">
              <LogOut size={16} /> {t.logout}
            </button>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
