'use client';

import React, { Suspense } from 'react';
import { Menu, Search, Plus, Bell, ChevronLeft, Globe, Moon, LogOut } from 'lucide-react';
import { useSearchParams, usePathname } from 'next/navigation';

interface SovereignHeaderProps {
  onMenuClick?: () => void;
}

const tabNames: Record<string, string> = {
  analytics:  'لوحة التحكم',
  leads:      'العملاء المحتملين',
  projects:   'المشاريع العقارية',
  rental:     'العقود والمدفوعات',
  calculator: 'حاسبة التمويل السكني',
  sales:      'أداء المبيعات',
  // القيم الجديدة بعد sidebar_marketing_reorg
  marketing:  'الإعلان والتسويق',
  shopping:   'الإعلان والتسويق — التسوق',
  agents:     'الوكلاء الذكيون',
  tasks:      'المهام والتذكيرات',
  helpdesk:   'مركز الدعم والمستندات',
  whatsapp:   'قناة الواتساب',
  settings:   'الإعدادات',
  offers:     'العروض العقارية',
  tours:      'الجولات العقارية',
};

const routeNames: Record<string, string> = {
  '/operations/dashboard':  'لوحة التحكم',
  '/operations/leads':      'العملاء المحتملين',
  '/operations/projects':   'المشاريع العقارية',
  '/operations/properties': 'العقارات',
  '/operations/rental':     'العقود والمدفوعات',
  '/operations/offers':     'العروض العقارية',
  '/operations/calculator': 'حاسبة التمويل السكني',
  '/operations/sales':      'أداء المبيعات',
  '/operations/tours':      'الجولات العقارية',
  // المسار الجديد بعد sidebar_marketing_reorg
  '/operations/marketing':  'الإعلان والتسويق',
  '/operations/agents':     'الوكلاء الذكيون',
  '/operations/tasks':      'المهام والتذكيرات',
  '/operations/helpdesk':   'مركز الدعم والمستندات',
  '/operations/whatsapp':   'قناة الواتساب',
  '/operations/settings':   'الإعدادات',
};

function HeaderBreadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  
  let activeTabName = 'نظرة عامة';
  if (pathname === '/operations' && tab) {
    activeTabName = tabNames[tab] || 'نظرة عامة';
  } else {
    activeTabName = routeNames[pathname] || tabNames[tab || 'analytics'] || 'نظرة عامة';
  }

  return (
    <div className="hidden sm:flex items-center text-sm font-medium text-brand-text-secondary/80">
      <span className="hover:text-brand-text-primary cursor-pointer transition-colors">العمليات</span>
      <ChevronLeft size={16} className="mx-1 opacity-50" />
      <span className="text-brand-interactive font-bold">{activeTabName}</span>
    </div>
  );
}

export default function SovereignHeader({ onMenuClick }: SovereignHeaderProps) {
  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 bg-brand-bg border-b border-brand-border shadow-md z-40 w-full dir-rtl text-brand-text-primary">
      
      {/* اليمين: زر الجوال ومسار التنقل */}
      <div className="flex items-center gap-3 lg:w-1/3">
        <button 
          className="md:hidden text-brand-text-secondary hover:text-brand-text-primary transition-colors" 
          onClick={onMenuClick}
          aria-label="فتح القائمة"
        >
          <Menu size={24} />
        </button>
        <Suspense fallback={
          <div className="hidden sm:flex items-center text-sm font-medium text-brand-text-secondary/85">
            <span>العمليات</span>
          </div>
        }>
          <HeaderBreadcrumbs />
        </Suspense>
      </div>

      {/* الوسط: شريط البحث الشامل */}
      <div className="hidden lg:flex justify-center w-1/3">
        <div className="relative w-full max-w-md group">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search size={16} className="text-brand-text-secondary/40 group-focus-within:text-brand-interactive transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="بحث شامل (العملاء، العقود)..." 
            className="w-full bg-brand-panel border border-brand-border focus:border-brand-interactive/50 rounded-lg py-2 pl-14 pr-10 text-sm text-brand-text-primary outline-none transition-all placeholder:text-brand-text-secondary/45 shadow-inner"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-2">
            <span className="text-[10px] font-mono text-brand-text-secondary/40 bg-brand-bg px-1.5 py-0.5 rounded border border-brand-border">Ctrl+K</span>
          </div>
        </div>
      </div>

      {/* اليسار: الإجراءات السريعة، الإشعارات، والملف الشخصي */}
      <div className="flex items-center justify-end gap-2 lg:gap-3 lg:w-1/3">
        
        {/* حالة ساهر */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-brand-panel border border-brand-border rounded-full text-xs font-medium text-brand-text-primary">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
          <span>ساهر</span>
        </div>

        {/* زر اللغة */}
        <button className="hidden sm:flex items-center justify-center w-9 h-9 bg-brand-panel text-brand-text-secondary hover:text-brand-text-primary border border-brand-border hover:border-brand-interactive/50 rounded-lg transition-all shadow-inner" title="تغيير اللغة">
          <Globe size={18} />
        </button>

        {/* زر تبديل الوضع */}
        <button className="hidden sm:flex items-center justify-center w-9 h-9 bg-brand-panel text-brand-text-secondary hover:text-brand-text-primary border border-brand-border hover:border-brand-interactive/50 rounded-lg transition-all shadow-inner" title="تبديل الوضع">
          <Moon size={18} />
        </button>

        {/* الإشعارات */}
        <button className="relative w-9 h-9 flex items-center justify-center bg-brand-panel text-brand-text-secondary hover:text-brand-text-primary border border-brand-border hover:border-brand-interactive/50 rounded-lg transition-all shadow-inner">
          <Bell size={18} />
          <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-red-500 rounded-full border border-brand-bg"></span>
        </button>

        {/* الملف الشخصي للمستخدم */}
        <div className="flex items-center gap-3 pl-2 border-r border-brand-border ml-1 pr-1">
          <div className="hidden md:block text-left mr-2">
            <p className="text-sm font-semibold text-brand-text-primary leading-tight text-right">علي زيلع</p>
            <p className="text-[10px] text-brand-text-secondary/80 text-right mt-0.5">شركة دار الأعمار</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-brand-panel border border-brand-border flex items-center justify-center text-sm font-bold text-brand-interactive shadow-[0_0_8px_rgba(142,177,209,0.15)] cursor-pointer hover:border-brand-interactive/60 transition-colors">
            ع.ز
          </div>
        </div>

        {/* زر تسجيل الخروج */}
        <button className="flex items-center justify-center w-9 h-9 bg-red-500/10 text-[#A7C7E7] hover:bg-red-500 hover:text-brand-text-primary border border-red-500/20 rounded-lg transition-all shadow-sm" title="تسجيل الخروج">
          <LogOut size={18} />
        </button>

      </div>
    </header>
  );
}
