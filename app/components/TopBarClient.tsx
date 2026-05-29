// app/components/TopBarClient.tsx
'use client';

import React from 'react';
import { useApp } from '@/app/context/AppContext';

export default function TopBarClient({ 
  initialName, 
  initialRole 
}: { 
  initialName: string; 
  initialRole: string; 
}) {
  const { theme, toggleTheme, lang, toggleLang } = useApp();
  const isDark = theme === 'dark';

  // التأكد من تطبيق الاسم المطلوب في بطاقة المستخدم السيادية
  const displayName = initialName === "أحمد الغامدي" || !initialName 
    ? "أدمن شركة الإنماء العقارية الكبرى" 
    : initialName;

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-md border-b h-16 flex items-center justify-between px-6 shrink-0 shadow-lg select-none transition-colors duration-300 ${
      isDark 
        ? 'bg-[#0b0f19]/95 border-slate-800/80 text-white' 
        : 'bg-white/95 border-slate-200 text-slate-900'
    }`}>
      {/* 1. الملف الشخصي للمستشار / الأدمن المسؤول */}
      <div className="flex items-center space-x-reverse space-x-3.5">
        <div className="relative">
          <span className="absolute bottom-0 left-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-current" />
          <div className={`h-9 w-9 rounded-full flex items-center justify-center font-black text-sm shadow-md ${
            isDark ? 'bg-amber-500 text-slate-950' : 'bg-amber-500 text-slate-950'
          }`}>
            {displayName.charAt(0)}
          </div>
        </div>
        <div className="text-right">
          <p className={`text-xs font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{displayName}</p>
          <p className={`text-[9px] font-extrabold mt-0.5 tracking-wide leading-none ${isDark ? 'text-[#E6C687]' : 'text-[#735334]'}`}>{initialRole}</p>
        </div>
      </div>

      {/* 2. شارة الأمان والتحكم بالسمة واللغة (الكونسول الموحد للتحكم) */}
      <div className="flex items-center space-x-reverse space-x-4">
        {/* شارة الحماية السيبرانية الفاخرة */}
        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold shadow-inner ${
          isDark 
            ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span>حالة الاتصال السحابي: مشفر وآمن ١٠٠٪</span>
        </div>

        {/* محول اللغة */}
        <button
          onClick={toggleLang}
          className={`h-8 px-3 rounded-lg border text-[10px] font-black transition-all cursor-pointer shadow-sm hover:scale-[1.02] ${
            isDark 
              ? 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-[#E6C687]/50 hover:text-[#E6C687]' 
              : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-[#735334]/50 hover:text-[#735334]'
          }`}
        >
          🌐 {lang === 'AR' ? 'EN' : 'عربي'}
        </button>

        {/* زر تبديل المظهر */}
        <button
          onClick={toggleTheme}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs transition-all cursor-pointer shadow-sm hover:scale-[1.02] ${
            isDark 
              ? 'border-slate-700 bg-slate-900/60 text-[#E6C687] hover:border-[#E6C687]/50' 
              : 'border-slate-300 bg-slate-50 text-[#735334] hover:border-[#735334]/50'
          }`}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}

