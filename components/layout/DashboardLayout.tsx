'use client';
import React, { useState } from 'react';
import SovereignHeader from '../../app/components/SovereignHeader';
import SovereignSidebar from '../../app/components/SovereignSidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen w-full overflow-hidden flex bg-[var(--nc-bg)] font-sans" dir="rtl">

      {/* ── Overlay للجوال ─────────────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── الشريط الجانبي ─────────────────────────────────────────────── */}
      <div
        className={`
          fixed inset-y-0 right-0 z-50 transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
          md:translate-x-0 md:static md:z-auto shrink-0
        `}
      >
        <SovereignSidebar onLinkClick={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* ── المحتوى الرئيسي ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">

        {/* الشريط العلوي — ثابت الارتفاع */}
        <SovereignHeader onMenuClick={() => setIsMobileMenuOpen(true)} />

        {/* منطقة العرض — تمرير داخلي فقط */}
        <div className="flex-1 overflow-y-auto min-h-0 relative">
          {children}
        </div>

      </main>
    </div>
  );
}
