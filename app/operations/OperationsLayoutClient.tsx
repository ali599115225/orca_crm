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
  overview:    { ar: 'نظرة عامة',         en: 'Overview',    icon: '📈' },
  operations:  { ar: 'العمليات والأصول',  en: 'Operations',  icon: '🏢' },
  monitor:     { ar: 'مراقبة الاشتراكات', en: 'Monitor',     icon: '📡' },
  whatsapp:    { ar: 'الواتساب',          en: 'WhatsApp',    icon: '💬' },
  helpdesk:    { ar: 'الدعم الفني',       en: 'Helpdesk',    icon: '🛠️' },
  settings:    { ar: 'الإعدادات',         en: 'Settings',    icon: '⚙️' },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
  *, *::before, *::after { font-family: Calibri, 'Cairo', sans-serif !important; box-sizing: border-box; }

  .ops-sidebar-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    cursor: pointer;
    transition: all 0.18s ease;
    text-align: right;
  }
  .ops-sidebar-btn:hover {
    background: rgba(115,83,52,0.12);
    color: #d4a97a;
    border-color: rgba(115,83,52,0.2);
  }
  .ops-sidebar-btn.active {
    background: rgba(115,83,52,0.18);
    color: #d4a97a;
    border-color: rgba(115,83,52,0.35);
    font-weight: 900;
    box-shadow: 0 0 12px rgba(115,83,52,0.1) inset;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 99px;
    font-size: 10px;
    font-weight: 700;
  }

  .fade-in { animation: opsFade 0.2s ease; }
  @keyframes opsFade {
    from { opacity: 0; transform: translateY(5px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #0a0d1a; }
  ::-webkit-scrollbar-thumb { background: #735334; border-radius: 3px; }
`;

export default function OperationsLayoutClient({
  initialName, userRoleKey, isSuperAdmin, companyName,
  isNewTenant, logoutAction, children,
}: Props) {
  const { lang } = useApp();
  const router   = useRouter();
  const dir      = 'rtl'; // دائماً RTL للحفاظ على الاتجاه الصحيح

  const isPlatformArchitect = userRoleKey === 'PLATFORM_ARCHITECT';
  const allowedTabs = ROLE_TABS[userRoleKey] ?? ROLE_TABS.READ_ONLY;
  const defaultTab  = isPlatformArchitect ? 'monitor' : allowedTabs[0];

  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    const syncTab = () => {
      const t = new URLSearchParams(window.location.search).get('tab') || defaultTab;
      setActiveTab(allowedTabs.includes(t) ? t : defaultTab);
    };
    syncTab();
    window.addEventListener('popstate', syncTab);
    return () => window.removeEventListener('popstate', syncTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabClick = (tab: string) => {
    if (!allowedTabs.includes(tab)) return;
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState(null, '', url.pathname + url.search);
    window.dispatchEvent(new PopStateEvent('popstate'));
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
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: '#0b0f19',
        color: '#e2e8f0',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ══════════════════════════════════════════════════════════
          HEADER — ثابت في الأعلى فوق كل شيء
      ══════════════════════════════════════════════════════════ */}
      <header style={{
        width: '100%',
        flexShrink: 0,
        height: 48,
        background: 'rgba(10,13,26,0.97)',
        borderBottom: '1px solid rgba(115,83,52,0.35)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 60,
      }}>

        {/* الشعار + اسم الشركة — يمين (RTL: يظهر أول) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/logo.png"
            alt="ORCA"
            style={{
              width: 28, height: 28,
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 7px rgba(115,83,52,0.6))',
            }}
          />
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#d4a97a', letterSpacing: 1 }}>
              ORCA CRM
            </div>
            {companyName && (
              <div style={{ fontSize: 8, color: '#475569', fontWeight: 700 }}>{companyName}</div>
            )}
          </div>
        </div>

        {/* مؤشرات الحالة الأربعة — وسط */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="status-pill" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            🟢 {lang === 'AR' ? 'صحة القاعدة' : 'DB Health'}
          </span>
          <span className="status-pill" style={{ background: 'rgba(0,123,255,0.1)', color: '#5aabff', border: '1px solid rgba(0,123,255,0.2)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#5aabff', display: 'inline-block' }} />
            ⚡ {lang === 'AR' ? 'صحة السيرفر' : 'Server OK'}
          </span>
          <span className="status-pill" style={{ background: 'rgba(115,83,52,0.12)', color: '#d4a97a', border: '1px solid rgba(115,83,52,0.28)' }}>
            ☁️ {lang === 'AR' ? 'مراقبة فيرسيل' : 'Vercel Live'}
          </span>
          <span className="status-pill" style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.07)' }}>
            🔔 {lang === 'AR' ? 'الإشعارات' : 'Notifications'}
          </span>
        </div>

        {/* اسم المستخدم — يسار (RTL: يظهر آخر) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, color: '#475569', fontWeight: 700 }}>{initialName}</span>
          {isSuperAdmin && (
            <span style={{ padding: '2px 7px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: 8, fontWeight: 900 }}>
              ARCH
            </span>
          )}
        </div>
      </header>

      {/* تنبيه المستأجر الجديد */}
      {isNewTenant && !isPlatformArchitect && (
        <div style={{
          flexShrink: 0, background: '#f59e0b', color: '#0b0f19',
          fontSize: 10, fontWeight: 900, padding: '8px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span>⚠️ {lang === 'AR' ? 'بيانات ملف منشأتك غير مكتملة!' : 'Your tenant profile is incomplete!'}</span>
          <a href="/operations/onboarding" style={{ textDecoration: 'underline', fontWeight: 700 }}>
            {lang === 'AR' ? 'اضغط هنا للتفعيل' : 'Activate Now'}
          </a>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          BODY — flex-row-reverse: Sidebar يمين + Content يسار
      ══════════════════════════════════════════════════════════ */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row-reverse', /* ← Sidebar على اليمين */
        overflow: 'hidden',
        minHeight: 0,
      }}>

        {/* ── SIDEBAR — جانب اليمين ─────────────────────────────── */}
        <aside style={{
          width: 228,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#0a0d1a',
          /* border-l بدلاً من border-r لأنه على اليمين */
          borderLeft: '1px solid rgba(115,83,52,0.25)',
          overflowY: 'auto',
        }}>

          {/* رأس السيدبار */}
          <div style={{
            padding: '16px 16px 10px',
            borderBottom: '1px solid rgba(115,83,52,0.15)',
            flexShrink: 0,
          }}>
            {isPlatformArchitect ? (
              <div>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#f59e0b', letterSpacing: 2, textTransform: 'uppercase' }}>
                  Platform Architect
                </div>
                <div style={{ fontSize: 9, color: '#5aabff', fontWeight: 700, marginTop: 2 }}>ORCA CRM — Admin</div>
              </div>
            ) : (
              <div style={{ fontSize: 10, fontWeight: 900, color: '#d4a97a', letterSpacing: 0.5 }}>
                {lang === 'AR' ? 'قائمة التنقل' : 'Navigation'}
              </div>
            )}
          </div>

          {/* قائمة التبويبات */}
          <nav style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {allowedTabs.map(tab => {
              const lbl = TAB_LABELS[tab];
              if (!lbl) return null;
              return (
                <button
                  key={tab}
                  onClick={() => handleTabClick(tab)}
                  className={`ops-sidebar-btn${activeTab === tab ? ' active' : ''}`}
                >
                  <span style={{ fontSize: 14 }}>{lbl.icon}</span>
                  <span>{lang === 'AR' ? lbl.ar : lbl.en}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer الـ Sidebar — زر الخروج */}
          <div style={{
            padding: '10px',
            borderTop: '1px solid rgba(115,83,52,0.15)',
            flexShrink: 0,
          }}>
            <button
              onClick={handleLogout}
              className="ops-sidebar-btn"
              style={{ color: '#f87171' }}
            >
              <span style={{ fontSize: 14 }}>🔒</span>
              <span>{lang === 'AR' ? 'تسجيل الخروج' : 'Sign Out'}</span>
            </button>
            <p style={{
              fontSize: 9, textAlign: 'center', color: '#1e293b',
              fontWeight: 700, marginTop: 8, paddingTop: 6,
              borderTop: '1px solid rgba(255,255,255,0.04)',
            }}>
              {lang === 'AR' ? 'رقم الإصدار ١.٠' : 'Version 1.0'}
            </p>
          </div>
        </aside>

        {/* ── MAIN CONTENT — يسار (مع RTL يكون على الجهة الأخرى من Sidebar) ── */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          padding: '28px 32px',
          minWidth: 0,
        }}>
          <div className="fade-in" style={{ width: '100%' }}>
            {children}
          </div>

          <footer style={{
            marginTop: 40,
            borderTop: '1px solid rgba(115,83,52,0.1)',
            paddingTop: 14,
            paddingBottom: 8,
            textAlign: 'center',
            fontSize: 9,
            color: '#1e293b',
            fontWeight: 700,
          }}>
            {lang === 'AR' ? 'جميع الحقوق محفوظة لأوركا CRM © ٢٠٢٦' : 'All rights reserved to Orca CRM © 2026'}
          </footer>
        </main>
      </div>
    </div>
  );
}
