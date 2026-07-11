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
      className="h-screen w-full overflow-hidden flex bg-[var(--nc-bg)] font-sans"
      dir={isRTL ? 'rtl' : 'ltr'}
    >

      {/* ── Mobile Overlay ─────────────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      {/* Arabic: sidebar on right (order: sidebar first in flex, then main)
          English: sidebar on left (order: sidebar first in flex, then main) */}
      <div
        className={`
          fixed inset-y-0 z-50 transition-transform duration-300 ease-in-out
          ${isRTL ? 'right-0' : 'left-0'}
          ${isMobileMenuOpen
            ? 'translate-x-0'
            : isRTL ? 'translate-x-full' : '-translate-x-full'}
          md:translate-x-0 md:static md:z-auto shrink-0
        `}
      >
        <SovereignSidebar onLinkClick={() => setIsMobileMenuOpen(false)} tenant={tenant} companyName={companyName} isSuperAdmin={isSuperAdmin} />
      </div>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">

        {/* Header — fixed height */}
        <SovereignHeader onMenuClick={() => setIsMobileMenuOpen(true)} tenant={tenant} user={user} companyName={companyName} />

        {/* Content Area — internal scroll only */}
        <div className="flex-1 overflow-y-auto min-h-0 relative">
          {children}
        </div>

      </main>
    </div>
    </AuthProvider>
  );
}
