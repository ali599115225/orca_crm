'use client';
import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import SovereignHeader from '../../app/components/SovereignHeader';
import SovereignSidebar from '../../app/components/SovereignSidebar';

export default function DashboardLayout({
  children,
  currentUserRole,
}: {
  children: React.ReactNode;
  currentUserRole?: string;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#0b1120] text-white overflow-hidden font-sans" dir="rtl">

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
          md:translate-x-0 md:static md:z-auto
        `}
      >
        <SovereignSidebar />
      </div>

      {/* ── المحتوى الرئيسي ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

        {/* الشريط العلوي */}
        <SovereignHeader onMenuClick={() => setIsMobileMenuOpen(true)} />

        {/* منطقة العرض */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {children}
        </div>

      </main>
    </div>
  );
}
