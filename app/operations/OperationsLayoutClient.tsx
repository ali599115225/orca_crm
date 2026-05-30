// app/operations/OperationsLayoutClient.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/app/context/AppContext';
import { useRouter } from 'next/navigation';

interface Props {
  initialName: string;
  userRoleKey: string;
  isSuperAdmin: boolean;
  companyName: string;
  isNewTenant: boolean;
  logoutAction: () => void;
  children: React.ReactNode;
}

const ROLE_TABS: Record<string, string[]> = {
  PLATFORM_ARCHITECT: ['monitor'],
  ADMIN:              ['overview','operations','monitor','whatsapp','helpdesk','settings'],
  SALES_MANAGER:      ['overview','operations','whatsapp','helpdesk'],
  SALES_EMPLOYEE:     ['overview','operations','helpdesk'],
  MARKETING:          ['overview','operations','whatsapp','helpdesk'],
  READ_ONLY:          ['overview'],
};

const TAB_LABELS: Record<string, { ar: string; en: string; icon: string }> = {
  overview:    { ar: 'نظرة عامة',        en: 'Overview',        icon: '📈' },
  operations:  { ar: 'العمليات والأصول', en: 'Operations',      icon: '🏢' },
  monitor:     { ar: 'مراقبة الاشتراكات',en: 'Monitor',         icon: '📡' },
  whatsapp:    { ar: 'الواتساب',         en: 'WhatsApp',        icon: '💬' },
  helpdesk:    { ar: 'الدعم الفني',      en: 'Helpdesk',        icon: '🛠️' },
  settings:    { ar: 'الإعدادات',        en: 'Settings',        icon: '⚙️' },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Calibri:wght@400;600;700;800&display=swap');
  *, *::before, *::after { font-family: Calibri, 'Cairo', sans-serif !important; box-sizing: border-box; }
  .ops-tab { transition: all 0.18s ease; cursor: pointer; }
  .ops-tab:hover { background: rgba(115,83,52,0.15) !important; color: #d4a97a !important; }
  .ops-tab.active {
    background: rgba(115,83,52,0.22) !important;
    border-bottom: 2px solid #735334 !important;
    color: #d4a97a !important;
    font-weight: 800 !important;
  }
  .status-pill { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:99px; font-size:10px; font-weight:700; }
  .fade-in { animation: opsFade 0.2s ease; }
  @keyframes opsFade { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:#0d1020; }
  ::-webkit-scrollbar-thumb { background:#735334; border-radius:3px; }
`;

export default function OperationsLayoutClient({
  initialName, userRoleKey, isSuperAdmin, companyName, isNewTenant, logoutAction, children
}: Props) {
  const { lang } = useApp();
  const router = useRouter();
  const dir = lang === 'AR' ? 'rtl' : 'ltr';

  const isPlatformArchitect = userRoleKey === 'PLATFORM_ARCHITECT';
  const allowedTabs = ROLE_TABS[userRoleKey] ?? ROLE_TABS.READ_ONLY;
  const defaultTab = isPlatformArchitect ? 'monitor' : allowedTabs[0];

  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab') || defaultTab;
    setActiveTab(allowedTabs.includes(t) ? t : defaultTab);
    const onPop = () => {
      const pt = new URLSearchParams(window.location.search).get('tab') || defaultTab;
      setActiveTab(allowedTabs.includes(pt) ? pt : defaultTab);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchTab = (tab: string) => {
    if (!allowedTabs.includes(tab)) return;
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState(null, '', url.pathname + url.search);
  };

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    await (logoutAction as unknown as () => Promise<void>)();
    router.push('/login');
  };

  return (
    <div
      dir={dir}
      style={{
        minHeight: '100vh',
        background: '#0b0f19',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ══════════════════════════════════════════════════════════
          GLOBAL STATUS HEADER — 100% width, 4 metrics
      ══════════════════════════════════════════════════════════ */}
      <div style={{
        width: '100%',
        background: 'rgba(13,16,32,0.95)',
        borderBottom: '1px solid rgba(115,83,52,0.3)',
        backdropFilter: 'blur(12px)',
        padding: '0 32px',
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 60,
        flexShrink: 0,
      }}>
        {/* شعار */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="ORCA" style={{ width: 26, height: 26, objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(115,83,52,0.5))' }} />
          <span style={{ fontSize: 11, fontWeight: 900, color: '#d4a97a', letterSpacing: 1 }}>ORCA CRM</span>
          {companyName && (
            <span style={{ fontSize: 9, color: '#475569', fontWeight: 700 }}>/ {companyName}</span>
          )}
        </div>

        {/* 4 مقاييس الحالة */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="status-pill" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'opsFade 2s infinite' }} />
            🟢 {lang === 'AR' ? 'صحة القاعدة' : 'DB Health'}
          </span>
          <span className="status-pill" style={{ background: 'rgba(0,123,255,0.1)', color: '#5aabff', border: '1px solid rgba(0,123,255,0.2)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#5aabff', display: 'inline-block' }} />
            ⚡ {lang === 'AR' ? 'صحة السيرفر' : 'Server OK'}
          </span>
          <span className="status-pill" style={{ background: 'rgba(115,83,52,0.12)', color: '#d4a97a', border: '1px solid rgba(115,83,52,0.25)' }}>
            ☁️ {lang === 'AR' ? 'مراقبة فيرسيل' : 'Vercel Live'}
          </span>
          <span className="status-pill" style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.07)' }}>
            🔔 {lang === 'AR' ? 'الإشعارات' : 'Notifications'}
          </span>
        </div>

        {/* اسم المستخدم */}
        <div style={{ fontSize: 9, color: '#475569', fontWeight: 700, textAlign: dir === 'rtl' ? 'right' : 'left' }}>
          {initialName}
          {isSuperAdmin && (
            <span style={{ marginRight: 6, marginLeft: 6, padding: '1px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: 8, fontWeight: 900 }}>ARCH</span>
          )}
        </div>
      </div>

      {/* New Tenant Alert */}
      {isNewTenant && !isPlatformArchitect && (
        <div style={{ background: '#f59e0b', color: '#0b0f19', fontSize: 10, fontWeight: 900, padding: '9px 32px', textAlign: 'center', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span>⚠️ {lang === 'AR' ? 'بيانات ملف منشأتك غير مكتملة!' : 'Your tenant profile is incomplete!'}</span>
          <a href="/operations/onboarding" style={{ textDecoration: 'underline', fontWeight: 700 }}>
            {lang === 'AR' ? 'اضغط هنا للتفعيل' : 'Click here to activate'}
          </a>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          HORIZONTAL NAVBAR — 100% width tab row
      ══════════════════════════════════════════════════════════ */}
      <div style={{
        width: '100%',
        background: 'rgba(11,15,25,0.98)',
        borderBottom: '1px solid rgba(115,83,52,0.2)',
        display: 'flex',
        alignItems: 'stretch',
        flexShrink: 0,
        overflowX: 'auto',
        paddingLeft: 24,
        paddingRight: 24,
        zIndex: 50,
      }}>
        {allowedTabs.map(tab => {
          const lbl = TAB_LABELS[tab];
          if (!lbl) return null;
          return (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={`ops-tab${activeTab === tab ? ' active' : ''}`}
              style={{
                padding: '12px 20px',
                fontSize: 11,
                fontWeight: 700,
                color: activeTab === tab ? '#d4a97a' : '#475569',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #735334' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                whiteSpace: 'nowrap',
                outline: 'none',
              }}
            >
              <span style={{ fontSize: 13 }}>{lbl.icon}</span>
              <span>{lang === 'AR' ? lbl.ar : lbl.en}</span>
            </button>
          );
        })}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* زر تسجيل الخروج — نهاية الـ NavBar */}
        <button
          onClick={handleLogout}
          className="ops-tab"
          style={{
            padding: '12px 20px',
            fontSize: 11,
            fontWeight: 800,
            color: '#f87171',
            background: 'transparent',
            border: 'none',
            borderBottom: '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            whiteSpace: 'nowrap',
            outline: 'none',
          }}
        >
          🔒 {lang === 'AR' ? 'تسجيل الخروج' : 'Sign Out'}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          MAIN CONTENT — full viewport width, no aside
      ══════════════════════════════════════════════════════════ */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        padding: '28px 32px',
        width: '100%',
      }}>
        {/* حقن activeTab في children عبر data attribute */}
        <div data-active-tab={activeTab} style={{ width: '100%' }}>
          {children}
        </div>
        <footer style={{
          marginTop: 40,
          borderTop: '1px solid rgba(115,83,52,0.15)',
          paddingTop: 16,
          paddingBottom: 8,
          textAlign: 'center',
          fontSize: 9,
          color: '#334155',
          fontWeight: 700,
        }}>
          {lang === 'AR' ? 'جميع الحقوق محفوظة لأوركا CRM © ٢٠٢٦' : 'All rights reserved to Orca CRM © 2026'}
        </footer>
      </main>
    </div>
  );
}
