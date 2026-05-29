// app/components/TopBarClient.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/app/context/AppContext';

export default function TopBarClient({ 
  initialName, 
  initialRole,
  isSuperAdmin = false,
  logoutAction
}: { 
  initialName: string; 
  initialRole: string; 
  isSuperAdmin?: boolean;
  logoutAction?: () => void;
}) {
  const { theme, toggleTheme, lang, toggleLang } = useApp();
  const isDark = theme === 'dark';

  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Sync state with URL parameter changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentTab = new URLSearchParams(window.location.search).get("tab") || "overview";
      setActiveTab(currentTab);

      const handleLocationChange = () => {
        const updatedTab = new URLSearchParams(window.location.search).get("tab") || "overview";
        setActiveTab(updatedTab);
      };

      window.addEventListener("popstate", handleLocationChange);
      return () => window.removeEventListener("popstate", handleLocationChange);
    }
  }, []);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      window.history.pushState(null, '', url.pathname + url.search);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // التأكد من تطبيق الاسم المطلوب في بطاقة المستخدم السيادية
  const displayName = initialName === "أحمد الغامدي" || !initialName 
    ? "أدمن شركة الإنماء العقارية الكبرى" 
    : initialName;

  // دالة تحويل الأرقام إلى الأرقام العربية الشرقية حسب اللغة النشطة
  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (lang === 'EN') return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, "٪");
  };

  const getTooltipContent = (node: string) => {
    if (lang === 'AR') {
      switch (node) {
        case 'db':
          return `صحة قاعدة البيانات: نشطة ومتصلة (الاستجابة: ${toArabicNumerals("0.8")} ملي ثانية - التجمع: ${toArabicNumerals("12")}/${toArabicNumerals("15")})`;
        case 'server':
          return `صحة الخادم: مستقرة (المعالج: ${toArabicNumerals("14%")} - الذاكرة: ${toArabicNumerals("42%")})`;
        case 'vercel':
          return `شبكة فيرسيل: متصلة بنجاح (orca.az-ez.pro)`;
        case 'alerts':
          return `التنبيهات النشطة: تم رصد ${toArabicNumerals("2")} تحديثات مؤخراً`;
        case 'logout':
          return `تسجيل الخروج الآمن من الجلسة`;
        default:
          return '';
      }
    } else {
      switch (node) {
        case 'db':
          return `Database Health: Active & Connected (Latency: 0.8 ms - Pool: 12/15)`;
        case 'server':
          return `Server Health: Stable (CPU: 14% - Memory: 42%)`;
        case 'vercel':
          return `Vercel Network: Connected successfully (orca.az-ez.pro)`;
        case 'alerts':
          return `Active Alerts: 2 updates recently detected`;
        case 'logout':
          return `Secure session termination`;
        default:
          return '';
      }
    }
  };

  const devTabs = [
    { id: 'overview', titleAr: '📊 نظرة عامة', titleEn: '📊 Overview' },
    { id: 'systems', titleAr: '⚡ الأنظمة التشغيلية', titleEn: '⚡ Operational Systems' },
    { id: 'whatsapp', titleAr: '💬 قناة الواتس والوكلاء', titleEn: '💬 WhatsApp Channel' },
    { id: 'helpdesk', titleAr: '🛠️ مركز الدعم والوكيل المساعد', titleEn: '🛠️ Support Center & AI Helpdesk' },
    { id: 'settings', titleAr: '⚙️ النظام', titleEn: '⚙️ System & Settings' },
  ];

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-md border-b flex flex-col w-full shrink-0 shadow-lg select-none transition-colors duration-300 ${
      isDark 
        ? 'bg-[#0b0f19]/95 border-slate-800/80 text-white' 
        : 'bg-white/95 border-slate-200 text-slate-900'
    }`}>
      <style dangerouslySetInnerHTML={{ __html: `
        .hud-tooltip {
          position: absolute;
          top: 38px;
          transform: translateX(-50%);
          white-space: nowrap;
          z-index: 100;
          font-family: 'Cairo', 'Inter', sans-serif !important;
          animation: tooltipFadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translate(-50%, -4px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .header-tab-active {
          border-bottom: 2px solid ${isDark ? '#818cf8' : '#4f46e5'} !important;
          color: ${isDark ? '#818cf8' : '#4f46e5'} !important;
          font-weight: 900 !important;
          background: ${isDark ? 'rgba(79, 70, 229, 0.1)' : 'rgba(79, 70, 229, 0.05)'};
        }
      `}} />

      {/* Row 1: Controls & User Profile */}
      <div className="h-16 flex items-center justify-between px-6 w-full">
        {/* 1. الملف الشخصي للمستشار / الأدمن المسؤول */}
        <div className="flex items-center space-x-reverse space-x-3.5">
          <div className="relative">
            <span className="absolute bottom-0 left-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-current" />
            <div className={`h-9 w-9 rounded-full flex items-center justify-center font-black text-sm shadow-md bg-indigo-600 text-white`}>
              {displayName.charAt(0)}
            </div>
          </div>
          <div className="text-right">
            <p className={`text-xs font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{displayName}</p>
            <p className={`text-[9px] font-extrabold mt-0.5 tracking-wide leading-none ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{initialRole}</p>
          </div>
        </div>

        {/* 2. شارة الأمان والتحكم بالسمة واللغة والوصول */}
        <div className="flex items-center space-x-reverse space-x-3">
          {/* شارة الحماية السيبرانية الفاخرة */}
          <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold shadow-inner ${
            isDark 
              ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span>{lang === 'AR' ? 'حالة الاتصال السحابي: مشفر وآمن ١٠٠٪' : 'Cloud Sync Status: 100% Encrypted & Secure'}</span>
          </div>

          {/* محول اللغة */}
          <button
            onClick={toggleLang}
            className={`h-8 px-3 rounded-lg border text-[10px] font-black transition-all cursor-pointer shadow-sm hover:scale-[1.02] ${
              isDark 
                ? 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-indigo-400/50 hover:text-indigo-400' 
                : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-indigo-600/50 hover:text-indigo-600'
            }`}
          >
            🌐 {lang === 'AR' ? 'EN' : 'عربي'}
          </button>

          {/* زر تبديل المظهر */}
          <button
            onClick={toggleTheme}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs transition-all cursor-pointer shadow-sm hover:scale-[1.02] ${
              isDark 
                ? 'border-slate-700 bg-slate-900/60 text-indigo-400 hover:border-indigo-400/50' 
                : 'border-slate-300 bg-slate-50 text-indigo-600 hover:border-indigo-600/50'
            }`}
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          {/* زر تسجيل الخروج */}
          {logoutAction && (
            <button
              onClick={logoutAction}
              title={lang === 'AR' ? 'تسجيل الخروج' : 'Logout'}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs transition-all cursor-pointer shadow-sm hover:scale-[1.02] ${
                isDark 
                  ? 'border-slate-700 bg-slate-900/60 text-rose-450 hover:border-rose-500/40 hover:bg-rose-950/20' 
                  : 'border-slate-300 bg-slate-50 text-rose-600 hover:border-slate-350 hover:bg-rose-50'
              }`}
            >
              🚪
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
