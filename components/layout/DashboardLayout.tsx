'use client';

import React, { useState } from 'react';
import { useApp } from '../../app/context/AppContext';
import SovereignHeader from '../../app/components/SovereignHeader';
import SovereignSidebar from '../../app/components/SovereignSidebar';
import { AuthProvider } from '../../app/context/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
  tenant?: any;
  user?: { name: string; email: string; role: string };
  companyName?: string;
  isSuperAdmin?: boolean;
}

export default function DashboardLayout({
  children,
  tenant,
  user,
  companyName,
  isSuperAdmin,
}: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { lang } = useApp();
  const isRTL = lang === 'AR';

  return (
    <AuthProvider initialRole={user?.role}>
      <div
        className="orca-v1-shell"
        dir={isRTL ? 'rtl' : 'ltr'}
        data-orca-visual-system="zero-base-v1"
        data-layout-direction={isRTL ? 'rtl' : 'ltr'}
      >
        {isMobileMenuOpen && (
          <button
            type="button"
            className="orca-v1-mobile-overlay"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label={isRTL ? 'إغلاق القائمة' : 'Close menu'}
          />
        )}

        <div
          className={[
            'orca-v1-sidebar-slot',
            isRTL ? 'is-rtl' : 'is-ltr',
            isMobileMenuOpen ? 'is-open' : '',
          ].join(' ')}
        >
          <SovereignSidebar
            onLinkClick={() => setIsMobileMenuOpen(false)}
            tenant={tenant}
            companyName={companyName}
            isSuperAdmin={isSuperAdmin}
          />
        </div>

        <main className="orca-v1-main">
          <SovereignHeader
            onMenuClick={() => setIsMobileMenuOpen(true)}
            tenant={tenant}
            user={user}
            companyName={companyName}
          />

          <div className="orca-v1-content-scroll">
            {children}
          </div>
        </main>
      </div>
    </AuthProvider>
  );
}