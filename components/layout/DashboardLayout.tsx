'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/app/context/AppContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentUserRole?: string;
}

export default function DashboardLayout({ children, currentUserRole = 'READ_ONLY' }: DashboardLayoutProps) {
  const { theme, toggleTheme, lang, toggleLang } = useApp();
  const isDarkMode = theme === 'dark';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('analytics');

  // مزامنة حالة التبويب النشط من الرابط
  useEffect(() => {
    const getTab = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        setActiveTab(params.get('tab') || 'analytics');
      }
    };
    getTab();
    window.addEventListener('popstate', getTab);
    const interval = setInterval(getTab, 200);
    return () => {
      window.removeEventListener('popstate', getTab);
      clearInterval(interval);
    };
  }, []);

  const handleTabClick = (e: React.MouseEvent, tab: string) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `?tab=${tab}`);
      window.dispatchEvent(new CustomEvent('popstate'));
    }
  };

  const rawNavItems = lang === 'AR' ? [
    { label: 'لوحة التحليلات والتقارير', icon: 'ph-chart-line-up', tab: 'analytics' },
    { label: 'العملاء المحتملين', icon: 'ph-users-three', tab: 'leads' },
    { label: 'إدارة المشاريع العقارية', icon: 'ph-buildings', tab: 'projects' },
    { label: 'الإيجارات والمحاسبة', icon: 'ph-house-line', tab: 'rental' },
    { label: 'حاسبة التمويل السكني', icon: 'ph-calculator', tab: 'calculator' },
    { label: 'أداء المبيعات والمؤشرات', icon: 'ph-trend-up', tab: 'sales' },
    { label: 'لوحة النمو والتسويق', icon: 'ph-rocket-launch', tab: 'growth' },
    { label: 'إدارة الوكلاء والذكاء الاصطناعي', icon: 'ph-robot', tab: 'agents' },
    { label: 'المهام والتذكيرات', icon: 'ph-clipboard-text', tab: 'tasks', badge: '3' },
    { label: 'مركز الدعم والوكيل مساعد', icon: 'ph-headset', tab: 'helpdesk' },
    { label: 'قناة الواتساب والوكلاء', icon: 'ph-whatsapp-logo', tab: 'whatsapp' },
    { label: 'سجل النظام (Logs)', icon: 'ph-notebook', tab: 'logs' },
    { label: 'إعدادات النظام', icon: 'ph-gear', tab: 'settings' },
    { label: 'مراقبة المنصة', icon: 'ph-radar', tab: 'monitor' },
  ] : [
    { label: 'Analytics & Reports', icon: 'ph-chart-line-up', tab: 'analytics' },
    { label: 'Prospective Investors', icon: 'ph-users-three', tab: 'leads' },
    { label: 'Real Estate Projects', icon: 'ph-buildings', tab: 'projects' },
    { label: 'Rental Accounting', icon: 'ph-house-line', tab: 'rental' },
    { label: 'Housing Finance Calc', icon: 'ph-calculator', tab: 'calculator' },
    { label: 'Sales Performance & KPIs', icon: 'ph-trend-up', tab: 'sales' },
    { label: 'Growth & Marketing', icon: 'ph-rocket-launch', tab: 'growth' },
    { label: 'Agent Management & AI', icon: 'ph-robot', tab: 'agents' },
    { label: 'Tasks & Reminders', icon: 'ph-clipboard-text', tab: 'tasks', badge: '3' },
    { label: 'Support & Helpdesk', icon: 'ph-headset', tab: 'helpdesk' },
    { label: 'WhatsApp & Channels', icon: 'ph-whatsapp-logo', tab: 'whatsapp' },
    { label: 'System Logs', icon: 'ph-notebook', tab: 'logs' },
    { label: 'System Settings', icon: 'ph-gear', tab: 'settings' },
    { label: 'Platform Monitor', icon: 'ph-radar', tab: 'monitor' },
  ];

  const navItems = rawNavItems.filter(item => {
    if (item.tab === 'logs' && currentUserRole !== 'ADMIN' && currentUserRole !== 'PLATFORM_ARCHITECT') {
      return false;
    }
    // تبويب Monitor حصري لـ PLATFORM_ARCHITECT فقط
    if (item.tab === 'monitor' && currentUserRole !== 'PLATFORM_ARCHITECT') {
      return false;
    }
    return true;
  });

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-500 font-sans ${isDarkMode ? 'bg-[#0b1120] text-[#f8fafc]' : 'bg-[#f8fafc] text-slate-800'}`} dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative top-0 ${lang === 'AR' ? 'right-0 border-l' : 'left-0 border-r'} h-full w-72 flex flex-col flex-shrink-0 z-50 transition-transform duration-300 ease-in-out ${isDarkMode ? 'bg-[#0b1120]/95 border-[#1e293b]' : 'bg-white/95 border-slate-200'} backdrop-blur-xl shadow-2xl md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : (lang === 'AR' ? 'translate-x-full' : '-translate-x-full')}`}>
        
        {/* Header/Logo */}
        <div className="p-6 pb-6 flex justify-between items-center">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded bg-[#df7b62]/25 flex items-center justify-center border border-[#df7b62]/45">
                    <i className="ph-fill ph-buildings text-[#df7b62] text-xl"></i>
                </div>
                <span className={`font-bold text-xl tracking-wide font-en ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>ORCA CRM</span>
            </div>
            <span className={`text-[10px] ${lang === 'AR' ? 'mr-11' : 'ml-11'} font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {lang === 'AR' ? 'مؤسسة أبعاد السكنية' : 'Abaad Real Estate Est.'}
            </span>
          </div>
          {/* Close button for mobile */}
          <button className="md:hidden text-slate-500 text-2xl cursor-pointer" onClick={() => setIsMobileMenuOpen(false)}>
            <i className="ph ph-x"></i>
          </button>
        </div>

        {/* User Profile */}
        <div className={`px-6 pb-6 border-b ${isDarkMode ? 'border-slate-800/50' : 'border-slate-200'}`}>
            <div className={`border rounded-xl p-3 flex items-center gap-3 transition-colors cursor-pointer ${isDarkMode ? 'bg-[#151f32] border-slate-700 hover:border-[#df7b62]/30' : 'bg-slate-50 border-slate-200 hover:border-[#df7b62]/30'}`}>
                <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-lg border border-slate-600 font-en shadow-inner">ع</div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 bg-[#10b981] border-[3px] rounded-full ${isDarkMode ? 'border-[#151f32]' : 'border-slate-50'}`}></div>
                </div>
                <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between w-full">
                        <span className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {lang === 'AR' ? 'علي محمد' : 'Ali Mohamed'}
                        </span>
                        <span className="bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Super</span>
                    </div>
                    <span className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {lang === 'AR' ? 'المدير العام' : 'General Manager'}
                    </span>
                </div>
            </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-4 scroll-container scrollbar-fade mask-fade-vertical">
            <nav className="space-y-1">
                {navItems.map((item, index) => {
                  const isActive = activeTab === item.tab;
                  return (
                    <a 
                      key={index} 
                      href={`?tab=${item.tab}`}
                      onClick={(e) => handleTabClick(e, item.tab)}
                      className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all group ${
                        isActive 
                          ? (isDarkMode ? 'bg-[#df7b62]/10 border-r-4 border-[#df7b62] text-white font-bold' : 'bg-[#df7b62]/10 border-r-4 border-[#df7b62] text-slate-900 font-bold') 
                          : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
                      }`}
                    >
                        <i className={`${item.icon} text-lg transition-colors ${isActive ? 'text-[#df7b62]' : 'text-slate-400 group-hover:text-[#df7b62]'}`}></i>
                        <span>{item.label}</span>
                        {item.badge && (
                            <span className={`${lang === 'AR' ? 'mr-auto' : 'ml-auto'} bg-[#df7b62]/20 text-[#df7b62] text-[10px] px-2 py-0.5 rounded-full font-en`}>{item.badge}</span>
                        )}
                    </a>
                  );
                })}
            </nav>
        </div>

        {/* Logout Button */}
        <div className={`p-4 border-t ${isDarkMode ? 'border-slate-800/50' : 'border-slate-200'}`}>
            <button 
              onClick={async () => {
                const { logoutAction } = await import('@/app/actions/auth');
                await logoutAction();
              }}
              className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                isDarkMode 
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/30' 
                  : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:border-rose-300'
              } cursor-pointer`}
            >
                <div className="flex items-center gap-3">
                    <i className="ph ph-sign-out text-lg"></i>
                    <span>{lang === 'AR' ? 'تسجيل الخروج' : 'Log Out'}</span>
                </div>
                <i className={`ph ${lang === 'AR' ? 'ph-arrow-left' : 'ph-arrow-right'} text-xs opacity-60`}></i>
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col h-screen overflow-hidden">
        
        {/* Header */}
        <header className={`h-20 flex items-center justify-between px-4 lg:px-8 border-b z-10 sticky top-0 transition-colors duration-500 ${isDarkMode ? 'bg-[#0b1120]/80 border-slate-800/80 backdrop-blur-md' : 'bg-white/80 border-slate-200 backdrop-blur-md'}`}>
            
            {/* Mobile Menu Button */}
            <button 
              className={`md:hidden p-2 rounded-lg border transition-colors cursor-pointer ${isDarkMode ? 'text-slate-400 hover:text-white bg-[#151f32] border-slate-700' : 'text-slate-600 hover:text-slate-900 bg-slate-50 border-slate-200'}`}
              onClick={() => setIsMobileMenuOpen(true)}
            >
                <i className="ph ph-list text-xl"></i>
            </button>

            {/* Actions Bar */}
            <div className={`flex items-center gap-3 ${lang === 'AR' ? 'mr-auto' : 'ml-auto'}`}>
                <div className={`hidden md:flex items-center border rounded-full px-4 py-2 transition-all ${isDarkMode ? 'bg-[#151f32] border-slate-700 focus-within:border-[#df7b62]/50 focus-within:ring-1 focus-within:ring-[#df7b62]/50' : 'bg-slate-50 border-slate-300 focus-within:border-[#df7b62]/50 focus-within:ring-1 focus-within:ring-[#df7b62]/50'}`}>
                    <i className="ph ph-magnifying-glass text-slate-400 text-lg ml-2"></i>
                    <input 
                      type="text" 
                      placeholder={lang === 'AR' ? 'ابحث عن عميل، مشروع...' : 'Search for client, project...'} 
                      className={`bg-transparent border-none outline-none text-sm w-48 font-sans ${isDarkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`} 
                    />
                </div>

                <div className={`w-px h-6 mx-2 hidden md:block ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`}></div>

                {/* Theme Toggle */}
                <button 
                  onClick={toggleTheme}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${isDarkMode ? 'bg-[#151f32] border-slate-700 text-slate-400 hover:text-[#df7b62] hover:border-[#df7b62]/50' : 'bg-slate-50 border-slate-300 text-slate-600 hover:text-[#df7b62] hover:border-[#df7b62]/50'}`}
                >
                    <i className={`ph ${isDarkMode ? 'ph-moon' : 'ph-sun'} text-lg`}></i>
                </button>
                
                {/* Language Toggle */}
                <button 
                  onClick={toggleLang}
                  className={`flex items-center gap-2 h-10 px-4 rounded-full border transition-colors text-sm font-en cursor-pointer ${isDarkMode ? 'bg-[#151f32] border-slate-700 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-300 text-slate-600 hover:text-slate-900'}`}
                >
                    <i className="ph ph-globe"></i>
                    <span className="font-medium">{lang === 'AR' ? 'EN' : 'AR'}</span>
                </button>
            </div>

            {/* Cyber Guard Status badge */}
            <div className="flex items-center gap-4 hidden sm:flex">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#10b981]/20 bg-[#10b981]/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                    <div className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981]"></span>
                    </div>
                    <span className="text-[#10b981] text-xs font-semibold tracking-wide">
                      {lang === 'AR' ? 'مشفر وآمن ١٠٠٪' : '100% Encrypted & Secure'}
                    </span>
                </div>
            </div>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto scrollbar-fade relative w-full">
            {children}
        </main>
        
      </div>
    </div>
  );
}
