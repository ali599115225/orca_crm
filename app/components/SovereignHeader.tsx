'use client';

import React from 'react';
import { Menu, Search, Plus, Bell, ChevronLeft, Globe, Moon, LogOut } from 'lucide-react';

interface SovereignHeaderProps {
  onMenuClick?: () => void;
}

export default function SovereignHeader({ onMenuClick }: SovereignHeaderProps) {
  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 bg-[#042A44] border-b border-white/5 shadow-md z-40 w-full dir-rtl text-[#FFFFFF]">
      
      {/* اليمين: زر الجوال ومسار التنقل */}
      <div className="flex items-center gap-3 lg:w-1/3">
        <button 
          className="md:hidden text-white/60 hover:text-[#FFFFFF] transition-colors" 
          onClick={onMenuClick}
          aria-label="فتح القائمة"
        >
          <Menu size={24} />
        </button>
        <div className="hidden sm:flex items-center text-sm font-medium text-white/60">
          <span className="hover:text-[#FFFFFF] cursor-pointer transition-colors">العمليات</span>
          <ChevronLeft size={16} className="mx-1 opacity-50" />
          <span className="text-[#FFFFFF]">نظرة عامة</span>
        </div>
      </div>

      {/* الوسط: شريط البحث الشامل */}
      <div className="hidden lg:flex justify-center w-1/3">
        <div className="relative w-full max-w-md group">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search size={16} className="text-white/40 group-focus-within:text-cyan-400 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="بحث شامل (العملاء، العقود)..." 
            className="w-full bg-[#032238] border border-white/5 focus:border-cyan-500/50 rounded-lg py-2 pl-14 pr-10 text-sm text-[#FFFFFF] outline-none transition-all placeholder:text-white/40 shadow-inner"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-2">
            <span className="text-[10px] font-mono text-white/40 bg-[#042A44] px-1.5 py-0.5 rounded border border-white/5">Ctrl+K</span>
          </div>
        </div>
      </div>

      {/* اليسار: الإجراءات السريعة، الإشعارات، والملف الشخصي */}
      <div className="flex items-center justify-end gap-2 lg:gap-3 lg:w-1/3">
        
        {/* حالة ساهر */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-[#032238] border border-white/5 rounded-full text-xs font-medium text-white/80">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
          <span>ساهر</span>
        </div>

        {/* زر اللغة */}
        <button className="hidden sm:flex items-center justify-center w-9 h-9 bg-[#032238] text-white/80 hover:text-[#FFFFFF] border border-white/5 hover:border-white/10 rounded-lg transition-all shadow-inner" title="تغيير اللغة">
          <Globe size={18} />
        </button>

        {/* زر تبديل الوضع */}
        <button className="hidden sm:flex items-center justify-center w-9 h-9 bg-[#032238] text-white/80 hover:text-[#FFFFFF] border border-white/5 hover:border-white/10 rounded-lg transition-all shadow-inner" title="تبديل الوضع">
          <Moon size={18} />
        </button>

        {/* الإشعارات */}
        <button className="relative w-9 h-9 flex items-center justify-center bg-[#032238] text-white/80 hover:text-[#FFFFFF] border border-white/5 hover:border-white/10 rounded-lg transition-all shadow-inner">
          <Bell size={18} />
          <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#042A44]"></span>
        </button>

        {/* الملف الشخصي للمستخدم */}
        <div className="flex items-center gap-3 pl-2 border-r border-white/10 ml-1 pr-1">
          <div className="hidden md:block text-left mr-2">
            <p className="text-sm font-semibold text-[#FFFFFF] leading-tight text-right">علي زيلع</p>
            <p className="text-[10px] text-white/50 text-right mt-0.5">شركة دار الأعمار</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#032238] border border-cyan-500/30 flex items-center justify-center text-sm font-bold text-cyan-100 shadow-[0_0_8px_rgba(34,211,238,0.1)] cursor-pointer hover:border-cyan-400/60 transition-colors">
            ع.ز
          </div>
        </div>

        {/* زر تسجيل الخروج */}
        <button className="flex items-center justify-center w-9 h-9 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-[#FFFFFF] border border-red-500/20 rounded-lg transition-all shadow-sm" title="تسجيل الخروج">
          <LogOut size={18} />
        </button>

      </div>
    </header>
  );
}
