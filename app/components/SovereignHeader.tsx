'use client';

import React, { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Menu,
  Search,
  ChevronLeft,
  ChevronRight,
  Globe,
  Moon,
  Sun,
  LogOut,
  X,
  CheckCheck,
  Loader2,
} from 'lucide-react';
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
    analytics: 'tab.analytics',
    leads: 'tab.leads',
    projects: 'tab.projects',
    rental: 'tab.rental',
    calculator: 'tab.calculator',
    sales: 'tab.sales',
    marketing: 'tab.marketing',
    agents: 'tab.agents',
    tasks: 'tab.tasks',
    helpdesk: 'tab.helpdesk',
    whatsapp: 'tab.whatsapp',
    settings: 'tab.settings',
    offers: 'tab.offers',
    tours: 'tab.tours',
    documents: 'tab.documents',
    email: 'tab.email',
    properties: 'tab.properties',
    campaigns: 'tab.campaigns',
  };

  const routeKeyMap: Record<string, string> = {
    '/operations/dashboard': 'tab.analytics',
    '/operations/leads': 'tab.leads',
    '/operations/projects': 'tab.projects',
    '/operations/properties': 'tab.properties',
    '/operations/rental': 'tab.rental',
    '/operations/offers': 'tab.offers',
    '/operations/calculator': 'tab.calculator',
    '/operations/sales': 'tab.sales',
    '/operations/tours': 'tab.tours',
    '/operations/marketing': 'tab.marketing',
    '/operations/agents': 'tab.agents',
    '/operations/tasks': 'tab.tasks',
    '/operations/documents': 'tab.documents',
    '/operations/helpdesk': 'tab.helpdesk',
    '/operations/whatsapp': 'tab.whatsapp',
    '/operations/settings': 'tab.settings',
    '/operations/email': 'tab.email',
    '/operations/campaigns': 'tab.campaigns',
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
    <div className="orca-v1-breadcrumbs" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <span className="orca-v1-breadcrumb-root">{t('header.operations')}</span>
      <ChevronIcon size={15} className="orca-v1-breadcrumb-chevron" aria-hidden="true" />
      <span className="orca-v1-breadcrumb-current">{t(activeKey)}</span>
    </div>
  );
}

export default function SovereignHeader({
  onMenuClick,
  tenant,
  user,
  companyName,
}: SovereignHeaderProps) {
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
  const notificationsPanelRef = useRef<HTMLDivElement>(null);

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

  const displayName = displayPerson(
    user?.name || (lang === 'AR' ? 'المستخدم' : 'User'),
    displayLocale,
    { route: '/operations/dashboard' },
  );

  const displayCompany = displayEntity(
    companyName || 'ORCA',
    'company',
    displayLocale,
    { route: '/operations/dashboard' },
  );

  const initials = getInitials(displayName);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('search-change', { detail: searchQuery }),
      );
    }
  }, [searchQuery]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if (
        event.key === 'Escape' &&
        document.activeElement === searchInputRef.current
      ) {
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
      const target = event.target as Node;
      const clickedTrigger = notificationsRef.current?.contains(target);
      const clickedPanel = notificationsPanelRef.current?.contains(target);

      if (!clickedTrigger && !clickedPanel) {
        setNotificationsOpen(false);
      }
    };

    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [notificationsOpen]);

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const notificationTitle = notificationsOpen
    ? t('header.notificationsClose')
    : t('header.notificationsOpen');

  const handleNotificationsToggle = () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);

    if (nextOpen) {
      void refreshNotifications();
    }
  };

  return (
    <header className="orca-v1-header" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="orca-v1-header-start">
        <button
          type="button"
          className="orca-v1-icon-button orca-v1-mobile-menu"
          onClick={onMenuClick}
          aria-label={t('header.openMenu')}
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <Suspense
          fallback={
            <div className="orca-v1-breadcrumbs">
              <span className="orca-v1-breadcrumb-root">
                {t('header.operations')}
              </span>
            </div>
          }
        >
          <HeaderBreadcrumbs />
        </Suspense>
      </div>

      <div className="orca-v1-header-search-zone">
        <div className="orca-v1-search-wrap">
          <Search
            size={17}
            className="orca-v1-search-icon"
            aria-hidden="true"
          />

          <label htmlFor="global-search" className="sr-only">
            {t('header.searchLabel')}
          </label>

          <input
            ref={searchInputRef}
            id="global-search"
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('header.searchPlaceholder')}
            className="orca-v1-search"
          />

          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="orca-v1-search-clear"
              aria-label={isRTL ? 'مسح البحث' : 'Clear search'}
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : (
            <span className="orca-v1-search-shortcut" aria-hidden="true">
              Ctrl+K
            </span>
          )}
        </div>
      </div>

      <div className="orca-v1-header-actions">
        <div className="orca-v1-notification-wrap" ref={notificationsRef}>
          <button
            type="button"
            onClick={handleNotificationsToggle}
            className="orca-v1-icon-button orca-v1-notification-button"
            title={notificationTitle}
            aria-label={notificationTitle}
            aria-haspopup="menu"
            aria-expanded={notificationsOpen}
          >
            <Bell size={18} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="orca-v1-notification-count">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && typeof document !== 'undefined'
            ? createPortal(
            <div
              ref={notificationsPanelRef}
              role="menu"
              aria-label={t('header.notifications')}
              data-notification-opaque-panel
              className={`orca-v1-notification-panel ${
                isRTL ? 'is-rtl' : 'is-ltr'
              }`}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                right: 'auto',
                bottom: 'auto',
                transform: 'translate(-50%, -50%)',
                zIndex: 2147483000,
                width: 'min(420px, calc(100vw - 32px))',
                maxHeight: 'min(520px, calc(100dvh - 32px))',
                overflow: 'hidden',
                margin: 0,
                boxSizing: 'border-box',
                opacity: 1,
                backgroundColor:
                  theme === 'dark'
                    ? 'var(--nc-surface-solid, #111827)'
                    : 'var(--nc-surface-solid, #ffffff)',
              }}
            >
              <div className="orca-v1-notification-head">
                <div>
                  <p className="orca-v1-notification-title">
                    {t('header.notifications')}
                  </p>
                  <p className="orca-v1-notification-meta">
                    {unreadCount} {t('header.notificationsUnread')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void markAllNotificationsRead()}
                  disabled={unreadCount === 0 || notificationsUpdating}
                  className="orca-v1-secondary-button"
                >
                  {notificationsUpdating ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <CheckCheck size={14} aria-hidden="true" />
                  )}
                  {notificationText.markAll}
                </button>
              </div>

              {notificationsLoading ? (
                <p className="orca-v1-notification-state">
                  {notificationText.loading}
                </p>
              ) : notifications.length === 0 ? (
                <p className="orca-v1-notification-state">
                  {t('header.notificationsEmpty')}
                </p>
              ) : (
                <div
                  className="orca-v1-notification-list"
                  style={{
                    maxHeight: 'min(360px, calc(100dvh - 176px))',
                    overflowY: 'auto',
                    scrollbarWidth: 'none',
                  }}
                >
                  {notifications.slice(0, 10).map((notification) => {
                    const title = isRTL
                      ? notification.titleAr
                      : notification.titleEn;
                    const message = isRTL
                      ? notification.messageAr
                      : notification.messageEn;

                    return (
                      <button
                        key={notification.id}
                        type="button"
                        role="menuitem"
                        data-notification-opaque-item
                        onClick={() => void openNotification(notification)}
                        className={`orca-v1-notification-item ${
                          notification.read ? 'is-read' : 'is-unread'
                        }`}
                        title={notificationText.open}
                      >
                        <span
                          className={`orca-v1-notification-dot ${
                            notification.read ? 'is-read' : 'is-unread'
                          }`}
                          aria-hidden="true"
                        />

                        <span className="orca-v1-notification-copy">
                          <span className="orca-v1-notification-row">
                            <strong>
                              {cleanNotificationText(
                                title,
                                t('header.notifications'),
                              )}
                            </strong>
                            <span className="orca-v1-notification-source">
                              {notificationText.sources[notification.source]}
                            </span>
                          </span>

                          <span className="orca-v1-notification-message">
                            {cleanNotificationText(
                              message,
                              t('header.notifications'),
                            )}
                          </span>

                          <time
                            dir="ltr"
                            className="orca-v1-notification-time"
                          >
                            {formatNotificationTime(notification.createdAt)}
                          </time>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>,
                document.body,
              )
            : null}
        </div>

        <button
          type="button"
          onClick={toggleLang}
          className="orca-v1-icon-button"
          title={t('header.changeLanguage')}
          aria-label={t('header.changeLanguage')}
        >
          <Globe size={18} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="orca-v1-icon-button"
          title={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
          aria-label={
            theme === 'dark' ? t('header.lightMode') : t('header.darkMode')
          }
        >
          {theme === 'dark' ? (
            <Sun size={18} className="text-amber-400" aria-hidden="true" />
          ) : (
            <Moon size={18} aria-hidden="true" />
          )}
        </button>

        <div className="orca-v1-profile">
          <div className="orca-v1-profile-copy">
            <p className="orca-v1-profile-name">{displayName}</p>
            <p className="orca-v1-profile-company">{displayCompany}</p>
          </div>

          <div className="orca-v1-avatar" aria-hidden="true">
            {initials}
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('userRole');
              localStorage.removeItem('token');
              sessionStorage.removeItem('userRole');
              sessionStorage.removeItem('token');
            }

            try {
              await logoutAction();
            } catch (error) {
              console.error('Logout failed:', error);
            }

            router.replace('/login?logged_out=true');
          }}
          className="orca-v1-icon-button"
          title={t('header.logout')}
          aria-label={t('header.logout')}
        >
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}