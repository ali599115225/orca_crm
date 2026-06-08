'use client';

import React, { Suspense } from 'react';
import { Menu, Search, Bell, ChevronLeft, Globe, Moon, Sun, LogOut } from 'lucide-react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/app/context/AppContext';
import { logoutAction } from '@/app/actions/auth';


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
  '/operations/marketing':  'الإعلان والتسويق',
  '/operations/agents':     'الوكلاء الذكيون',
  '/operations/tasks':      'المهام والتذكيرات',
  '/operations/documents':  'مستودع المستندات',
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
    <div className="hidden sm:flex items-center text-sm font-medium text-[var(--nc-foreground-muted)]">
      <span className="hover:text-[var(--nc-foreground)] cursor-pointer transition-colors">العمليات</span>
      <ChevronLeft size={16} className="mx-1 opacity-40" />
      <span className="text-[var(--nc-accent)] font-bold">{activeTabName}</span>
    </div>
  );
}

export default function SovereignHeader({ onMenuClick }: SovereignHeaderProps) {
  const { theme, toggleTheme, lang, toggleLang } = useApp();
  const router = useRouter();

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 bg-[var(--nc-surface-strong)]/90 backdrop-blur-xl border-b border-[var(--nc-border)] shadow-sm z-40 w-full dir-rtl text-[var(--nc-foreground)] transition-all">

      {/* Right: Mobile menu + breadcrumbs */}
      <div className="flex items-center gap-3 lg:w-1/3">
        <button
          className="md:hidden text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] transition-colors"
          onClick={onMenuClick}
          aria-label="فتح القائمة"
        >
          <Menu size={24} />
        </button>
        <Suspense fallback={
          <div className="hidden sm:flex items-center text-sm font-medium text-[var(--nc-foreground-muted)]">
            <span>العمليات</span>
          </div>
        }>
          <HeaderBreadcrumbs />
        </Suspense>
      </div>

      {/* Center: Global search bar */}
      <div className="hidden lg:flex justify-center w-1/3">
        <div className="relative w-full max-w-md group">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search
              size={16}
              className="text-[var(--nc-foreground-muted)] group-focus-within:text-[var(--nc-accent)] transition-colors"
            />
          </div>
          <input
            type="text"
            placeholder="بحث شامل (العملاء، العقود)..."
            className="w-full bg-[var(--nc-surface)] border border-[var(--nc-border)] focus:border-[var(--nc-accent-border)] rounded-xl py-2 pl-14 pr-10 text-sm text-[var(--nc-foreground)] outline-none transition-all placeholder:text-[var(--nc-foreground-muted)] shadow-inner"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-2">
            <span className="text-[10px] font-mono text-[var(--nc-foreground-muted)] bg-[var(--nc-surface-strong)] px-1.5 py-0.5 rounded border border-[var(--nc-border)]">Ctrl+K</span>
          </div>
        </div>
      </div>

      {/* Left: Quick actions, notifications, profile */}
      <div className="flex items-center justify-end gap-2 lg:gap-3 lg:w-1/3">

        {/* Saher connection status */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-full text-xs font-medium text-[var(--nc-foreground)]">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
          <span>ساهر</span>
        </div>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="hidden sm:flex items-center justify-center w-9 h-9 bg-[var(--nc-surface-strong)] text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] border border-[var(--nc-border)] hover:border-[var(--nc-accent-border)] rounded-lg transition-all"
          title="تغيير اللغة"
        >
          <Globe size={18} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="hidden sm:flex items-center justify-center w-9 h-9 bg-[var(--nc-surface-strong)] text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] border border-[var(--nc-border)] hover:border-[var(--nc-accent-border)] rounded-lg transition-all"
          title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
        >
          {theme === 'dark'
            ? <Sun size={18} className="text-amber-400" />
            : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center bg-[var(--nc-surface-strong)] text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] border border-[var(--nc-border)] hover:border-[var(--nc-accent-border)] rounded-lg transition-all">
          <Bell size={18} />
          <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--nc-surface-strong)]"></span>
        </button>

        {/* User profile */}
        <div className="flex items-center gap-3 pl-2 border-r border-[var(--nc-border)] ml-1 pr-1">
          <div className="hidden md:block text-left mr-2">
            <p className="text-sm font-semibold text-[var(--nc-foreground)] leading-tight text-right">علي زيلع</p>
            <p className="text-[10px] text-[var(--nc-foreground-muted)] text-right mt-0.5">شركة دار الأعمار</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] flex items-center justify-center text-sm font-bold text-[var(--nc-accent)] shadow-sm transition-colors cursor-pointer">
            ع.ز
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={async () => {
            localStorage.removeItem('userRole');
            localStorage.removeItem('token');
            try {
              await logoutAction();
            } catch (err) {
              console.error(err);
              router.push('/');
            }
          }}
          className="flex items-center justify-center w-9 h-9 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-lg transition-all"
          title="تسجيل الخروج"
        >
          <LogOut size={18} />
        </button>

      </div>
    </header>
  );
}
