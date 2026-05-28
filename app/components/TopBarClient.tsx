// app/components/TopBarClient.tsx
'use client';

import React, { useState, useEffect } from 'react';

export default function TopBarClient({ 
  initialName, 
  initialRole 
}: { 
  initialName: string; 
  initialRole: string; 
}) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lang, setLang] = useState<'AR' | 'EN'>('AR');

  // إرسال الأحداث الأولية للمزامنة مع الكومبوننت التابع
  useEffect(() => {
    // ننتظر قليلاً للتأكد من جاهزية الصفحة للاستماع للأحداث
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('theme-change', { detail: theme }));
      window.dispatchEvent(new CustomEvent('lang-change', { detail: lang }));
    }, 100);
    return () => clearTimeout(t);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    window.dispatchEvent(new CustomEvent('theme-change', { detail: nextTheme }));
  };

  const toggleLang = () => {
    const nextLang = lang === 'AR' ? 'EN' : 'AR';
    setLang(nextLang);
    window.dispatchEvent(new CustomEvent('lang-change', { detail: nextLang }));
  };

  // التأكد من تطبيق الاسم المطلوب في بطاقة المستخدم السيادية
  const displayName = initialName === "أحمد الغامدي" || !initialName 
    ? "أدمن شركة الإنماء العقارية الكبرى" 
    : initialName;

  return (
    <header className="sticky top-0 z-50 bg-[#0b0f19]/95 backdrop-blur-md border-b border-slate-800/80 h-16 flex items-center justify-between px-6 shrink-0 shadow-lg text-white select-none">
      {/* 1. الملف الشخصي للمستشار / الأدمن المسؤول */}
      <div className="flex items-center space-x-reverse space-x-3.5">
        <div className="relative">
          <span className="absolute bottom-0 left-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0b0f19]" />
          <div className="h-9 w-9 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center font-black text-sm shadow-md">
            {displayName.charAt(0)}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-white leading-tight">{displayName}</p>
          <p className="text-[9px] text-[#E6C687] font-extrabold mt-0.5 tracking-wide leading-none">{initialRole}</p>
        </div>
      </div>

      {/* 2. شارة الأمان والتحكم بالسمة واللغة (الكونسول الموحد للتحكم) */}
      <div className="flex items-center space-x-reverse space-x-4">
        {/* شارة الحماية السيبرانية الفاخرة */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-[10px] font-bold shadow-inner">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span>حالة الاتصال السحابي: مشفر وآمن ١٠٠٪</span>
        </div>

        {/* محول اللغة */}
        <button
          onClick={toggleLang}
          className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-900/60 text-slate-300 hover:border-[#E6C687]/50 hover:text-[#E6C687] text-[10px] font-black transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
        >
          🌐 {lang === 'AR' ? 'EN' : 'عربي'}
        </button>

        {/* زر تبديل المظهر */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-900/60 text-[#E6C687] hover:border-[#E6C687]/50 flex items-center justify-center text-xs transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
