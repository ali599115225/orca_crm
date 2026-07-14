'use client';

import React, { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Menu, Search, ChevronLeft, ChevronRight, Globe, Moon, Sun, LogOut, X, CheckCheck, Loader2 } from 'lucide-react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/app/context/AppContext';
import { logoutAction } from '@/app/actions/auth';
import { displayPerson, displayEntity } from '@/lib/display';
import type { DisplayLocale } from '@/lib/display';
import {
  getHeaderNotificationsAction,
  markAllHeaderNotificationsReadAction,
  markHeaderNotificationReadAction,
} from '@/app/actions/notifications';
import type { OperationalNotification } from '@/lib/operational-notifications';

interface SovereignHeaderProps {
  onMenuClick?: () => void;
  tenant?: any;
  user?: { name: string; email: string; role: string };
  companyName?: string;
}

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0);
  return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
}

function cleanNotificationText(value: string, fallback: string): string {
  const cleaned = String(value || '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    .replace(/\b(?:WHATSAPP|META|GRAPH|JWT|TOKEN|SECRET)_[A-Z0-9_]+\b/g, '')
    .replace(/\b(?:chat|contact|lead|task|user|id)_[a-z0-9_-]+\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned || fallback;
}

function HeaderBreadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const { t, lang } = useApp();
  const isRTL = lang === 'AR';
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  const tabKeyMap: Record<string, string> = {
    analytics: 'tab.analytics', leads: 'tab.leads', projects: 'tab.projects',
    rental: 'tab.rental', calculator: 'tab.calculator', sales: 'tab.sales',
    marketing: 'tab.marketing', agents: 'tab.agents', tasks: 'tab.tasks',
    helpdesk: 'tab.helpdesk', whatsapp: 'tab.whatsapp', settings: 'tab.settings',
    offers: 'tab.offers', tours: 'tab.tours', documents: 'tab.documents',
    email: 'tab.email', properties: 'tab.properties', campaigns: 'tab.campaigns',
  };

  const routeKeyMap: Record<string, string> = {
    '/operations/dashboard': 'tab.analytics', '/operations/leads': 'tab.leads',
    '/operations/projects': 'tab.projects', '/operations/properties': 'tab.properties',
    '/operations/rental': 'tab.rental', '/operations/offers': 'tab.offers',
    '/operations/calculator': 'tab.calculator', '/operations/sales': 'tab.sales',
    '/operations/tours': 'tab.tours', '/operations/marketing': 'tab.marketing',
    '/operations/agents': 'tab.agents', '/operations/tasks': 'tab.tasks',
    '/operations/documents': 'tab.documents', '/operations/helpdesk': 'tab.helpdesk',
    '/operations/whatsapp': 'tab.whatsapp', '/operations/settings': 'tab.settings',
    '/operations/email': 'tab.email', '/operations/campaigns': 'tab.campaigns',
  };

  const normalizedPathname =
    pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const matchedRoute = Object.keys(routeKeyMap)
    .sort((a, b) => b.length - a.length)
    .find(
      (route) =>
        normalizedPathname === route ||
        normalizedPathname.startsWith(`${route}/`),
    );

  let activeKey = 'header.overview';
  if (normalizedPathname === '/operations' && tab) {
    activeKey = tabKeyMap[tab] || 'header.overview';
  } else {
    activeKey =
      (matchedRoute ? routeKeyMap[matchedRoute] : undefined) ||
      tabKeyMap[tab || 'analytics'] ||
      'header.overview';
  }

  return (
    <div className="hidden sm:flex items-center text-sm font-medium text-[var(--nc-foreground-muted)]" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <span className="hover:text-[var(--nc-foreground)] cursor-pointer transition-colors">{t('header.operations')}</span>
      <ChevronIcon size={16} className="mx-1 opacity-40" />
      <span className="text-[var(--nc-accent-text)] font-bold">{t(activeKey)}</span>
    </div>
  );
}

export default function SovereignHeader({ onMenuClick, tenant, user, companyName }: SovereignHeaderProps) {
  const { theme, toggleTheme, t, toggleLang, lang } = useApp();
  const [notifications, setNotifications] = useState<OperationalNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsUpdating, setNotificationsUpdating] = useState(false);
  const router = useRouter();
  const isRTL = lang === 'AR';

  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const refreshNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const result = await getHeaderNotificationsAction();
      if (result.success) {
        setNotifications(result.notifications);
      }
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshNotifications();

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshNotifications();
      }
    }, 30000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshNotifications();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refreshNotifications]);

  const openNotification = useCallback(
    async (notification: OperationalNotification) => {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item,
        ),
      );
      setNotificationsOpen(false);
      await markHeaderNotificationReadAction(notification.id);
      router.push(notification.href);
    },
    [router],
  );

  const markAllNotificationsRead = useCallback(async () => {
    if (notificationsUpdating) return;
    setNotificationsUpdating(true);
    try {
      const result = await markAllHeaderNotificationsReadAction();
      if (result.success) {
        setNotifications((current) =>
          current.map((item) => ({ ...item, read: true })),
        );
      }
    } finally {
      setNotificationsUpdating(false);
    }
  }, [notificationsUpdating]);

  const notificationText = {
    markAll: isRTL ? 'تعيين الكل كمقروء' : 'Mark all as read',
    loading: isRTL ? 'جارٍ تحميل الإشعارات…' : 'Loading notifications…',
    open: isRTL ? 'فتح الإشعار' : 'Open notification',
    sources: {
      WHATSAPP: isRTL ? 'واتساب' : 'WhatsApp',
      EMAIL: isRTL ? 'البريد' : 'Email',
      SUPPORT: isRTL ? 'الدعم' : 'Support',
      TASKS: isRTL ? 'المهام' : 'Tasks',
    } as Record<string, string>,
  };

  const formatNotificationTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(
      date.getFullYear(),
    ).slice(-2)} • ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const displayLocale: DisplayLocale = lang === 'EN' ? 'en' : 'ar';

  const displayName = displayPerson(user?.name || (lang === 'AR' ? 'المستخدم' : 'User'), displayLocale, { route: '/operations/dashboard' });
  const displayCompany = displayEntity(companyName || 'ORCA', 'company', displayLocale, { route: '/operations/dashboard' });
  const initials = getInitials(displayName);

  // ── Dispatch search to custom event for Dashboard to listen ──
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-change', { detail: searchQuery }));
    }
  }, [searchQuery]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K — focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape — clear search
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;

    const handler = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [notificationsOpen]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const notificationTitle = notificationsOpen ? t('header.notificationsClose') : t('header.notificationsOpen');

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 bg-[var(--nc-surface-strong)]/95 backdrop-blur-xl border-b border-[var(--nc-glass-border)] z-40 w-full text-[var(--nc-foreground)] transition-all" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Right: Mobile menu + breadcrumbs (in LTR this becomes left side) */}
      <div className="flex items-center gap-3 lg:w-1/3" style={{ justifyContent: isRTL ? 'flex-start' : 'flex-start' }}>
        <button
          className="md:hidden text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] transition-colors flex-shrink-0"
          onClick={onMenuClick}
          aria-label={t('header.openMenu')}
        >
          <Menu size={24} />
        </button>
        <Suspense fallback={
          <div className="hidden sm:flex items-center text-sm font-medium text-[var(--nc-foreground-muted)]">
            <span>{t('header.operations')}</span>
          </div>
        }>
          <HeaderBreadcrumbs />
        </Suspense>
      </div>

      {/* Center: Global search bar */}
      <div className="hidden lg:flex justify-center w-1/3">
        <div className="relative w-full max-w-md group">
          <div className={`absolute inset-y-0 flex items-center pointer-events-none ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'}`}>
            <Search
              size={16}
              className="text-[var(--nc-foreground-muted)] group-focus-within:text-[var(--nc-accent-text)] transition-colors"
            />
          </div>
          <label htmlFor="global-search" className="sr-only">{t('header.searchLabel')}</label>
          <input
            ref={searchInputRef}
            id="global-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('header.searchPlaceholder')}
            className={`w-full bg-[var(--nc-surface)] border border-[var(--nc-border)] focus:border-[var(--nc-accent-border)] rounded-xl py-2 text-sm text-[var(--nc-foreground)] outline-none transition-all placeholder:text-[var(--nc-foreground-muted)] shadow-inner ${isRTL ? 'pr-10 pl-14' : 'pl-10 pr-14'}`}
          />
          <div className={`absolute inset-y-0 flex items-center ${isRTL ? 'left-0 pl-2' : 'right-0 pr-2'}`}>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] p-1"
              >
                <X size={14} />
              </button>
            ) : (
              <span className="text-[9px] font-mono text-[var(--nc-foreground-muted)] bg-[var(--nc-surface-strong)] px-1.5 py-0.5 rounded border border-[var(--nc-glass-border)]">Ctrl+K</span>
            )}
          </div>
        </div>
      </div>

      {/* Left: Quick actions, profile (in LTR this becomes right side) */}
      <div className="flex items-center gap-2 lg:gap-3 lg:w-1/3" style={{ justifyContent: 'flex-end' }}>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() =>
              setNotificationsOpen((open) => {
                if (!open) void refreshNotifications();
                return !open;
              })
            }
            className="relative flex items-center justify-center w-10 h-10 sm:w-[42px] sm:h-[42px] bg-[var(--nc-surface)] text-[var(--nc-foreground)] border border-[var(--nc-border)] hover:border-[var(--nc-accent-border)] rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[var(--nc-accent-border)]"
            title={notificationTitle}
            aria-label={notificationTitle}
            aria-haspopup="menu"
            aria-expanded={notificationsOpen}
          >
            <Bell size={19} aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                className={`absolute -top-1 ${isRTL ? '-left-1' : '-right-1'} min-w-[18px] h-[18px] rounded-full bg-red-600 px-1 text-[10px] leading-[18px] font-bold text-white text-center shadow-sm`}
                aria-label={`${unreadCount} ${t('header.notificationsUnread')}`}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              role="menu"
              aria-label={t('header.notifications')}
              data-notification-opaque-panel
              className={`absolute top-12 z-[80] isolate w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.34)] ring-1 ring-black/5 backdrop-blur-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:ring-white/10 ${isRTL ? 'left-0' : 'right-0'}`}
            >
              <div className="mb-2 flex items-center justify-between gap-3 border-b border-[var(--nc-border)] pb-2">
                <div>
                  <p className="text-sm font-bold text-[var(--nc-foreground)]">
                    {t('header.notifications')}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--nc-foreground-muted)]">
                    {unreadCount} {t('header.notificationsUnread')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void markAllNotificationsRead()}
                  disabled={unreadCount === 0 || notificationsUpdating}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--nc-border)] px-2.5 text-[11px] font-bold text-[var(--nc-foreground-muted)] hover:border-[var(--nc-accent-border)] hover:text-[var(--nc-foreground)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {notificationsUpdating ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckCheck size={14} aria-hidden="true" />
                  )}
                  {notificationText.markAll}
                </button>
              </div>

              {notificationsLoading ? (
                <p className="py-5 text-center text-xs font-semibold text-[var(--nc-foreground-muted)]">
                  {notificationText.loading}
                </p>
              ) : notifications.length === 0 ? (
                <p className="py-5 text-center text-xs font-semibold text-[var(--nc-foreground-muted)]">
                  {t('header.notificationsEmpty')}
                </p>
              ) : (
                <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {notifications.slice(0, 10).map((notification) => {
                    const title = isRTL ? notification.titleAr : notification.titleEn;
                    const message = isRTL ? notification.messageAr : notification.messageEn;

                    return (
                      <button
                        key={notification.id}
                        type="button"
                        role="menuitem"
                        data-notification-opaque-item
                        onClick={() => void openNotification(notification)}
                        className={`w-full rounded-lg border p-3 text-start transition-colors ${
                          notification.read
                            ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'
                            : 'border-amber-300 bg-amber-50 dark:border-amber-600/60 dark:bg-slate-800'
                        }`}
                        title={notificationText.open}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              notification.read
                                ? 'bg-[var(--nc-border)]'
                                : 'bg-[var(--nc-accent)]'
                            }`}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <strong className="truncate text-sm leading-5 text-[var(--nc-foreground)]">
                                {cleanNotificationText(title, t('header.notifications'))}
                              </strong>
                              <span className="shrink-0 rounded-full border border-[var(--nc-border)] px-2 py-0.5 text-[10px] font-bold text-[var(--nc-foreground-muted)]">
                                {notificationText.sources[notification.source]}
                              </span>
                            </span>
                            <span className="mt-1 block break-words text-xs leading-5 text-[var(--nc-foreground-muted)]">
                              {cleanNotificationText(message, t('header.notifications'))}
                            </span>
                            <time
                              dir="ltr"
                              className="mt-1 block text-[10px] text-[var(--nc-foreground-muted)]"
                            >
                              {formatNotificationTime(notification.createdAt)}
                            </time>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="hidden sm:flex items-center justify-center w-9 h-9 bg-[var(--nc-surface-strong)] text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] border border-[var(--nc-border)] hover:border-[var(--nc-accent-border)] rounded-lg transition-all"
          title={t('header.changeLanguage')}
          aria-label={t('header.changeLanguage')}
        >
          <Globe size={18} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="hidden sm:flex items-center justify-center w-9 h-9 bg-[var(--nc-surface-strong)] text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] border border-[var(--nc-border)] hover:border-[var(--nc-accent-border)] rounded-lg transition-all"
          title={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
          aria-label={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
        >
          {theme === 'dark'
            ? <Sun size={18} className="text-amber-400" />
            : <Moon size={18} />}
        </button>

        {/* User profile */}
        <div className={`flex items-center gap-3 ${isRTL ? 'border-r pl-2 ml-1 pr-1' : 'border-l pr-2 mr-1 pl-1'} border-[var(--nc-border)]`}>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-[var(--nc-foreground)] leading-tight" style={{ textAlign: isRTL ? 'right' : 'left' }}>{displayName}</p>
            <p className="text-xs text-[var(--nc-foreground-muted)] mt-0.5" style={{ textAlign: isRTL ? 'right' : 'left' }}>{displayCompany}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] flex items-center justify-center text-sm font-bold text-[var(--nc-accent-text)] shadow-sm transition-colors cursor-pointer">
            {initials}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={async () => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('userRole');
              localStorage.removeItem('token');
              sessionStorage.removeItem('userRole');
              sessionStorage.removeItem('token');
            }

            try {
              await logoutAction();
            } catch (err) {
              console.error("Logout failed:", err);
            }

            router.replace('/login?logged_out=true');
          }}
          className="flex items-center justify-center w-9 h-9 bg-[var(--nc-surface-strong)] text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] border border-[var(--nc-border)] hover:border-[var(--nc-accent-border)] rounded-lg transition-all"
          title={t('header.logout')}
          aria-label={t('header.logout')}
        >
          <LogOut size={18} />
        </button>

      </div>
    </header>
  );
}
