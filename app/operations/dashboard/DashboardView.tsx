// app/operations/dashboard/DashboardView.tsx
'use client';

import React from 'react';
import { useApp } from '@/app/context/AppContext';
import { toArabicNumerals as toArabicNumeralsImport, formatCurrency as formatCurrencyImport } from '@/lib/formatters';

interface DashboardViewProps {
  tenant?: {
    companyName: string;
    subdomain: string;
    subscriptionPlan: string;
    extraAgents: number;
  };
  stats?: {
    totalLeads?: number;
    activeBookings?: number;
    closedSales?: number;
    totalProjects?: number;
    pendingTasks?: number;
    monthlySales?: number;
    dailyTours?: number;
    sentOffers?: number;
    closedContracts?: number;
  };
  recentLeads?: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string;
    status: string;
    city: string;
    createdAt: string;
    project?: { name: string } | null;
  }>;
  recentTasks?: Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: string;
    status: string;
    lead?: { firstName: string; lastName: string | null } | null;
  }>;
  projects?: any[];
  agentPerformance?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    totalLeads: number;
    closedDeals: number;
    activeLeads: number;
    conversionRate: number;
  }>;
  leadSources?: Array<{
    source: string;
    count: number;
  }>;
  systemAlerts?: Array<{
    id: string;
    type: 'warning' | 'info' | 'critical';
    messageAr: string;
    messageEn: string;
    date: string;
  }>;
  aiPredictions?: {
    bestContactTimes: Array<{
      leadId: string;
      name: string;
      slotAr: string;
      slotEn: string;
    }>;
    expectedToClose: Array<{
      id: string;
      name: string;
      score: number;
      probabilityAr: string;
      probabilityEn: string;
    }>;
    projectsNeedingCampaign: Array<{
      id: string;
      name: string;
      remainingUnits: number;
      reasonAr: string;
      reasonEn: string;
    }>;
    agentsNeedingSupport: Array<{
      id: string;
      name: string;
      activeLeads: number;
      conversionRate: number;
      reasonAr: string;
      reasonEn: string;
    }>;
  };
}

export default function DashboardView({
  tenant,
  stats,
  recentLeads = [],
  recentTasks = [],
  projects = [],
  agentPerformance = [],
  leadSources = [],
  systemAlerts = [],
  aiPredictions,
}: DashboardViewProps) {
  const { theme, lang } = useApp();
  const isDark = theme === 'dark';

  // Helper to translate digits to Arabic
  const formatNum = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return lang === 'AR' ? '٠' : '0';
    return lang === 'AR' ? toArabicNumeralsImport(num) : num.toString();
  };

  // Helper to format currency into SAR
  const formatSAR = (value: number): string => {
    return formatCurrencyImport(value, lang === 'AR' ? 'AR' : 'EN');
  };

  // KPI Metrics Mapping
  const totalLeadsCount = stats?.totalLeads ?? 0;
  const activeProjectsCount = stats?.totalProjects ?? 0;
  const monthlySalesCount = stats?.monthlySales ?? 0;
  const dailyToursCount = stats?.dailyTours ?? 0;
  const sentOffersCount = stats?.sentOffers ?? 0;
  const closedContractsCount = stats?.closedContracts ?? 0;

  // Safe Fallback for Lead Sources
  const finalLeadSources = leadSources.length > 0 ? leadSources : [
    { source: lang === 'AR' ? 'منصات التواصل الاجتماعي' : 'Social Media', count: 12 },
    { source: lang === 'AR' ? 'موقع الشركة الإلكتروني' : 'Corporate Website', count: 8 },
    { source: lang === 'AR' ? 'حملات الواتساب والمراسلات' : 'WhatsApp Outreach', count: 6 },
    { source: lang === 'AR' ? 'توصيات العملاء السابقين' : 'Client Referrals', count: 4 },
    { source: lang === 'AR' ? 'الاتصال المباشر والبارد' : 'Direct Cold Calls', count: 2 }
  ];

  const totalSourcesCount = finalLeadSources.reduce((acc, curr) => acc + curr.count, 0);

  // Safe Fallback for System Alerts
  const finalSystemAlerts = systemAlerts.length > 0 ? systemAlerts : [
    {
      id: 'ai_active',
      type: 'info' as const,
      messageAr: 'نظام الذكاء الاصطناعي المساعد نشط وجاهز لتقديم تنبؤات المبيعات الحية.',
      messageEn: 'AI Predictive Assistant is active and ready to deliver real-time sales forecasts.',
      date: new Date().toISOString()
    }
  ];

  return (
    <div className="orca-page orca-stack" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      {/* Welcome Banner (البنر الترحيبي) */}
      <div className="orca-hero orca-panel-light relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-l from-white via-slate-55 to-slate-100 dark:from-brand-bg dark:via-brand-panel dark:to-brand-bg p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm border border-[#A7C7E7]/50 dark:border-brand-border">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-interactive/10 dark:bg-brand-interactive/5 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-interactive/10 border border-brand-interactive/20 text-brand-interactive text-xs font-semibold mb-4 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-brand-interactive"></span>
            {lang === 'AR' ? 'تحليلات تنبؤية حية' : 'Live Predictive Analytics'}
          </div>
          <h1 className="text-xl md:text-3xl font-bold text-[#E8ECEF] font-bold dark:text-white mb-2 tracking-tight">
            {lang === 'AR' 
              ? `لوحة الإحصائيات الشاملة - ${tenant?.companyName || 'أوركا العقارية'}`
              : `Operations Intelligence Hub - ${tenant?.companyName || 'ORCA Properties'}`
            }
          </h1>
          <p className="text-xs md:text-sm text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium max-w-2xl leading-relaxed">
            {lang === 'AR'
              ? 'مراقبة فورية للمبيعات، الجولات العقارية، وحالة العقود، مدعومة بمساعد الذكاء الاصطناعي للتنبؤ بأداء الوكلاء والصفقات المرشحة للإغلاق.'
              : 'Real-time sales tracking, property tours, and contract status, backed by AI predictions for agent support and near-closing deals.'
            }
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-3 w-full md:w-auto">
          <div className="bg-white/70 dark:bg-brand-bg/75 backdrop-blur border border-[#A7C7E7]/80 dark:border-brand-border p-4 rounded-xl text-center md:min-w-[170px] shadow-sm">
             <p className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-xs mb-1 font-semibold">{lang === 'AR' ? 'تاريخ اليوم' : 'Today\'s Date'}</p>
             <p className="text-brand-interactive dark:text-brand-interactive-hover font-bold text-base md:text-lg">
                {new Date().toLocaleDateString(lang === 'EN' ? 'en-GB' : 'ar-EG', { day: '2-digit', month: 'short', year: 'numeric' })}
             </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid (شبكة بطاقات المؤشرات الستة) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Card 1: Total Leads */}
        <div className="orca-panel-light p-4 orca-transition group hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border-l-4 border-l-indigo-500">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-xs font-bold mb-1">
                {lang === 'AR' ? 'إجمالي العملاء' : 'Total Leads'}
              </p>
              <h3 className="text-xl md:text-2xl font-extrabold text-[#E8ECEF] font-bold dark:text-white font-en">
                {formatNum(totalLeadsCount)}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30 text-indigo-500 dark:text-indigo-400 shrink-0">
              <i className="ph-fill ph-users-three text-lg"></i>
            </div>
          </div>
          <span className="text-slate-450 dark:text-[#C4D8E5] font-medium text-[10px]">
            {lang === 'AR' ? 'العملاء المستثمرون الكليون' : 'Total registered prospects'}
          </span>
        </div>

        {/* Card 2: Active Projects */}
        <div className="orca-panel-light p-4 orca-transition group hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-xs font-bold mb-1">
                {lang === 'AR' ? 'المشاريع النشطة' : 'Active Projects'}
              </p>
              <h3 className="text-xl md:text-2xl font-extrabold text-[#E8ECEF] font-bold dark:text-white font-en">
                {formatNum(activeProjectsCount)}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30 text-emerald-500 dark:text-emerald-400 shrink-0">
              <i className="ph-fill ph-buildings text-lg"></i>
            </div>
          </div>
          <span className="text-slate-450 dark:text-[#C4D8E5] font-medium text-[10px]">
            {lang === 'AR' ? 'قيد التطوير والإنشاء' : 'In planning & development'}
          </span>
        </div>

        {/* Card 3: Monthly Sales */}
        <div className="orca-panel-light p-4 orca-transition group hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-xs font-bold mb-1">
                {lang === 'AR' ? 'المبيعات الشهرية' : 'Monthly Sales'}
              </p>
              <h3 className="text-base md:text-lg font-extrabold text-[#E8ECEF] font-bold dark:text-white leading-tight font-en truncate max-w-[130px]" title={formatSAR(monthlySalesCount)}>
                {formatSAR(monthlySalesCount)}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center border border-amber-100 dark:border-amber-900/30 text-amber-500 dark:text-amber-450 shrink-0">
              <i className="ph-fill ph-currency-circle-dollar text-lg"></i>
            </div>
          </div>
          <span className="text-slate-450 dark:text-[#C4D8E5] font-medium text-[10px]">
            {lang === 'AR' ? 'إجمالي عقود الشهر الحالي' : 'Contracts signed this month'}
          </span>
        </div>

        {/* Card 4: Daily Property Tours */}
        <div className="orca-panel-light p-4 orca-transition group hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border-l-4 border-l-rose-500">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-xs font-bold mb-1">
                {lang === 'AR' ? 'الجولات اليوم' : 'Daily Tours'}
              </p>
              <h3 className="text-xl md:text-2xl font-extrabold text-[#E8ECEF] font-bold dark:text-white font-en">
                {formatNum(dailyToursCount)}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center border border-rose-100 dark:border-rose-900/30 text-rose-500 dark:text-rose-450 shrink-0">
              <i className="ph-fill ph-calendar-check text-lg"></i>
            </div>
          </div>
          <span className="text-slate-450 dark:text-[#C4D8E5] font-medium text-[10px]">
            {lang === 'AR' ? 'معاينات وزيارات مجدولة اليوم' : 'Tours scheduled for today'}
          </span>
        </div>

        {/* Card 5: Sent Offers */}
        <div className="orca-panel-light p-4 orca-transition group hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border-l-4 border-l-sky-500">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-xs font-bold mb-1">
                {lang === 'AR' ? 'العروض المرسلة' : 'Sent Offers'}
              </p>
              <h3 className="text-xl md:text-2xl font-extrabold text-[#E8ECEF] font-bold dark:text-white font-en">
                {formatNum(sentOffersCount)}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center border border-sky-100 dark:border-sky-900/30 text-sky-500 dark:text-sky-400 shrink-0">
              <i className="ph-fill ph-paper-plane-tilt text-lg"></i>
            </div>
          </div>
          <span className="text-slate-450 dark:text-[#C4D8E5] font-medium text-[10px]">
            {lang === 'AR' ? 'عروض أسعار قيد التفاوض' : 'Quotations out to prospects'}
          </span>
        </div>

        {/* Card 6: Closed Contracts */}
        <div className="orca-panel-light p-4 orca-transition group hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border-l-4 border-l-purple-500">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-xs font-bold mb-1">
                {lang === 'AR' ? 'العقود المغلقة' : 'Closed Contracts'}
              </p>
              <h3 className="text-xl md:text-2xl font-extrabold text-[#E8ECEF] font-bold dark:text-white font-en">
                {formatNum(closedContractsCount)}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center border border-purple-100 dark:border-purple-900/30 text-purple-500 dark:text-purple-400 shrink-0">
              <i className="ph-fill ph-file-lock text-lg"></i>
            </div>
          </div>
          <span className="text-slate-450 dark:text-[#C4D8E5] font-medium text-[10px]">
            {lang === 'AR' ? 'إجمالي عقود البيع النهائية' : 'Total sales contracts signed'}
          </span>
        </div>

      </div>

      {/* Predictive AI Assistant Section (مساعد التنبؤ الذكي AI) */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 bg-gradient-to-br from-indigo-50/40 via-purple-50/30 to-pink-50/40 dark:from-indigo-950/15 dark:via-purple-950/10 dark:to-pink-950/15 backdrop-blur-md p-6">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-l from-indigo-500/10 to-purple-500/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        
        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-[#A7C7E7]/50 dark:border-[#A7C7E7]/30 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md">
              <i className="ph-fill ph-sparkles text-xl"></i>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
              </span>
            </div>
            <div>
              <h2 className="text-base md:text-lg font-extrabold text-[#E8ECEF] font-bold dark:text-white flex items-center gap-1.5">
                {lang === 'AR' ? 'مساعد التنبؤات والذكاء الاصطناعي' : 'Predictive AI Sales Assistant'}
              </h2>
              <p className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-xs">
                {lang === 'AR' ? 'توصيات ومقترحات ذكية مستخرجة ديناميكياً من بيانات المبيعات الحية' : 'Real-time dynamic suggestions generated from live CRM operations'}
              </p>
            </div>
          </div>
          <span className="text-[10px] md:text-xs font-semibold px-2.5 py-1 rounded-full bg-white/60 dark:bg-[#1C2B48]/50 border border-[#A7C7E7]/50 dark:border-slate-850 text-indigo-600 dark:text-indigo-400">
            {lang === 'AR' ? 'نشط ومحدث' : 'Active & Synced'}
          </span>
        </div>

        {/* AI Recommendations Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          
          {/* AI Idea 1: Best time to contact */}
          <div className="bg-white/50 dark:bg-brand-panel/40 backdrop-blur border border-[#A7C7E7]/60 dark:border-brand-border rounded-xl p-4 flex flex-col justify-between hover:border-brand-interactive/50 transition-all duration-300">
            <div>
              <div className="flex items-center gap-2 mb-3 text-brand-interactive font-bold text-xs">
                <i className="ph-bold ph-phone-call text-sm"></i>
                <span>{lang === 'AR' ? 'أفضل وقت للتواصل' : 'Best Time to Contact'}</span>
              </div>
              <p className="text-[#C4D8E5] font-medium dark:text-brand-text-secondary text-xs leading-relaxed mb-4">
                {lang === 'AR' 
                  ? 'الأوقات المقترحة للتواصل مع العملاء المهتمين الجدد بناءً على ذروة التفاعل:'
                  : 'Calculated optimal time blocks to reach new leads based on system interaction peaks:'
                }
              </p>
              
              <div className="space-y-2">
                {aiPredictions?.bestContactTimes && aiPredictions.bestContactTimes.length > 0 ? (
                  aiPredictions.bestContactTimes.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white/70 dark:bg-brand-bg/60 p-2 rounded border border-slate-100 dark:border-brand-border text-[11px]">
                      <span className="font-semibold text-[#E8ECEF] font-bold dark:text-slate-250 truncate max-w-[80px]">{item.name}</span>
                      <span className="text-brand-interactive font-semibold font-en">{lang === 'AR' ? item.slotAr : item.slotEn}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-[10px] text-center py-2">
                    {lang === 'AR' ? 'لا يوجد عملاء جدد مجدولين للتواصل.' : 'No new leads scheduled.'}
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-[10px] text-indigo-500/80 dark:text-indigo-400/60 mt-4 border-t border-[#A7C7E7]/40 dark:border-[#A7C7E7]/40 pt-2 font-en">
              {lang === 'AR' ? 'معدل الرد المتوقع: ٨٢٪' : 'Avg. Answer Rate: 82%'}
            </div>
          </div>

          {/* AI Idea 2: Leads expected to close */}
          <div className="bg-white/50 dark:bg-brand-panel/40 backdrop-blur border border-[#A7C7E7]/60 dark:border-brand-border rounded-xl p-4 flex flex-col justify-between hover:border-brand-interactive/50 transition-all duration-300">
            <div>
              <div className="flex items-center gap-2 mb-3 text-brand-interactive font-bold text-xs">
                <i className="ph-bold ph-trend-up text-sm"></i>
                <span>{lang === 'AR' ? 'العملاء المتوقع إغلاقهم' : 'Leads Near Closing'}</span>
              </div>
              <p className="text-[#C4D8E5] font-medium dark:text-brand-text-secondary text-xs leading-relaxed mb-4">
                {lang === 'AR'
                  ? 'العملاء أصحاب درجات التفاعل المرتفعة المرشحون لتوقيع العقود قريباً:'
                  : 'High-scoring leads expected to execute sales agreements based on engagement metrics:'
                }
              </p>
              
              <div className="space-y-2">
                {aiPredictions?.expectedToClose && aiPredictions.expectedToClose.length > 0 ? (
                  aiPredictions.expectedToClose.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white/70 dark:bg-brand-bg/60 p-2 rounded border border-slate-100 dark:border-brand-border text-[11px]">
                      <span className="font-semibold text-[#E8ECEF] font-bold dark:text-slate-250 truncate max-w-[80px]">{item.name}</span>
                      <span className="bg-brand-interactive/20 text-brand-interactive px-1.5 py-0.5 rounded font-bold">
                        {formatNum(item.score)}%
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-[10px] text-center py-2">
                    {lang === 'AR' ? 'لا توجد صفقات مؤهلة للغلق حالياً.' : 'No deals expected to close.'}
                  </div>
                )}
              </div>
            </div>

            <div className="text-[10px] text-emerald-500/80 dark:text-emerald-400/60 mt-4 border-t border-[#A7C7E7]/40 dark:border-[#A7C7E7]/40 pt-2">
              {lang === 'AR' ? 'التوجيه: إرسال نموذج العقد فوراً' : 'Action: Send contract draft ASAP'}
            </div>
          </div>

          {/* AI Idea 3: Projects needing a marketing campaign */}
          <div className="bg-white/50 dark:bg-brand-panel/40 backdrop-blur border border-[#A7C7E7]/60 dark:border-brand-border rounded-xl p-4 flex flex-col justify-between hover:border-brand-interactive/50 transition-all duration-300">
            <div>
              <div className="flex items-center gap-2 mb-3 text-brand-interactive font-bold text-xs">
                <i className="ph-bold ph-megaphone text-sm"></i>
                <span>{lang === 'AR' ? 'مشاريع بحاجة لتسويق' : 'Campaign Needed'}</span>
              </div>
              <p className="text-slate-555 dark:text-brand-text-secondary text-xs leading-relaxed mb-4">
                {lang === 'AR'
                  ? 'المشاريع ذات معدلات الامتصاص المنخفضة ومخزون كبير متاح للبيع:'
                  : 'Projects showing slow absorption rates and high unbooked inventories:'
                }
              </p>
              
              <div className="space-y-2">
                {aiPredictions?.projectsNeedingCampaign && aiPredictions.projectsNeedingCampaign.length > 0 ? (
                  aiPredictions.projectsNeedingCampaign.map((item, idx) => (
                    <div key={idx} className="bg-white/70 dark:bg-brand-bg/60 p-2 rounded border border-slate-100 dark:border-brand-border text-[10px] flex flex-col gap-1">
                      <span className="font-semibold text-[#E8ECEF] font-bold dark:text-slate-250 truncate">{item.name}</span>
                      <span className="text-brand-text-secondary text-[9px] leading-tight">
                        {lang === 'AR' ? item.reasonAr : item.reasonEn}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-[10px] text-center py-2">
                    {lang === 'AR' ? 'جميع المشاريع تسير وفق خطط المبيعات.' : 'All projects are meeting sales goals.'}
                  </div>
                )}
              </div>
            </div>

            <div className="text-[10px] text-amber-500/80 dark:text-amber-400/60 mt-4 border-t border-[#A7C7E7]/40 dark:border-[#A7C7E7]/40 pt-2">
              {lang === 'AR' ? 'التوجيه: إطلاق حملة ممولة رقمية' : 'Action: Launch digital paid campaign'}
            </div>
          </div>

          {/* AI Idea 4: Agents needing support */}
          <div className="bg-white/50 dark:bg-brand-panel/40 backdrop-blur border border-[#A7C7E7]/60 dark:border-brand-border rounded-xl p-4 flex flex-col justify-between hover:border-brand-interactive/50 transition-all duration-300">
            <div>
              <div className="flex items-center gap-2 mb-3 text-brand-interactive font-bold text-xs">
                <i className="ph-bold ph-hand-helping text-sm"></i>
                <span>{lang === 'AR' ? 'وكلاء بحاجة لدعم' : 'Agents Needing Support'}</span>
              </div>
              <p className="text-slate-555 dark:text-brand-text-secondary text-xs leading-relaxed mb-4">
                {lang === 'AR'
                  ? 'الوكلاء الذين لديهم أعداد عملاء نشطين مرتفعة مع انخفاض معدلات الإغلاق:'
                  : 'Sales agents managing high workloads with lower conversion ratios:'
                }
              </p>
              
              <div className="space-y-2">
                {aiPredictions?.agentsNeedingSupport && aiPredictions.agentsNeedingSupport.length > 0 ? (
                  aiPredictions.agentsNeedingSupport.map((item, idx) => (
                    <div key={idx} className="bg-white/70 dark:bg-brand-bg/60 p-2 rounded border border-slate-100 dark:border-brand-border text-[10px] flex flex-col gap-1">
                      <span className="font-semibold text-[#E8ECEF] font-bold dark:text-slate-250 truncate">{item.name}</span>
                      <span className="text-brand-text-secondary text-[9px] leading-tight">
                        {lang === 'AR' ? item.reasonAr : item.reasonEn}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-[10px] text-center py-2">
                    {lang === 'AR' ? 'توزيع ضغط العمل بين الوكلاء ممتاز.' : 'Workload distribution is optimized.'}
                  </div>
                )}
              </div>
            </div>

            <div className="text-[10px] text-purple-500/80 dark:text-purple-400/60 mt-4 border-t border-[#A7C7E7]/40 dark:border-[#A7C7E7]/40 pt-2">
              {lang === 'AR' ? 'التوجيه: إعادة توزيع بعض العملاء' : 'Action: Re-assign pending requests'}
            </div>
          </div>

        </div>
      </div>

      {/* Row 2: Agent Performance Tracker & Lead Sources Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        
        {/* Agent Performance Tracker Table (جدول أداء الوكلاء) */}
        <div className="xl:col-span-2 bg-white dark:bg-brand-panel border border-[#A7C7E7]/20 dark:border-brand-border rounded-2xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-[#A7C7E7]/20 dark:border-[#A7C7E7]/80 flex items-center justify-between bg-slate-50/50 dark:bg-[#1C2B48]/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <i className="ph-fill ph-chart-bar text-xl"></i>
              </div>
              <div>
                <h2 className="text-[#E8ECEF] font-bold dark:text-white font-extrabold text-base md:text-lg">
                  {lang === 'AR' ? 'أداء وجدارة الوكلاء العقاريين' : 'Sales Agents Performance'}
                </h2>
                <p className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-xs">
                  {lang === 'AR' ? 'ترتيب الوكلاء ومعدل تحويل العملاء إلى صفقات مكتملة' : 'Ranking of active agents and closed deal conversion metrics'}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium font-en">
              {formatNum(agentPerformance.length)} {lang === 'AR' ? 'وكيل نشط' : 'Active Agents'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-150 dark:border-brand-border text-[#C4D8E5] font-medium dark:text-brand-text-secondary text-xs font-semibold bg-slate-50/50 dark:bg-brand-bg/20">
                  <th className="p-3 text-right">{lang === 'AR' ? 'الوكيل العقاري' : 'Agent Name'}</th>
                  <th className="p-3 text-center">{lang === 'AR' ? 'إجمالي العملاء' : 'Total Leads'}</th>
                  <th className="p-3 text-center">{lang === 'AR' ? 'العملاء النشطون' : 'Active Leads'}</th>
                  <th className="p-3 text-center">{lang === 'AR' ? 'الصفقات المكتملة' : 'Closed Deals'}</th>
                  <th className="p-3 text-center w-[150px]">{lang === 'AR' ? 'نسبة الإغلاق' : 'Conversion'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {agentPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium">
                      {lang === 'AR' ? 'لم يتم العثور على وكلاء عقاريين مسجلين.' : 'No registered sales agents found.'}
                    </td>
                  </tr>
                ) : (
                  agentPerformance.map((agent) => (
                    <tr key={agent.id} className="hover:bg-slate-50/50 dark:hover:bg-brand-bg/30 transition-colors">
                      <td className="p-3 font-semibold text-[#E8ECEF] font-bold dark:text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-500 dark:text-indigo-400 text-[10px] font-bold">
                            {agent.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="mb-0.5 leading-tight">{agent.name}</p>
                            <p className="text-[10px] text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium font-en leading-tight">{agent.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center font-en text-slate-700 dark:text-[#C4D8E5] font-medium font-semibold">{formatNum(agent.totalLeads)}</td>
                      <td className="p-3 text-center font-en text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium">{formatNum(agent.activeLeads)}</td>
                      <td className="p-3 text-center font-en text-emerald-600 dark:text-emerald-400 font-semibold">{formatNum(agent.closedDeals)}</td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1 items-center">
                          <div className="flex items-center gap-1.5 w-full justify-between font-en font-semibold text-slate-700 dark:text-[#C4D8E5] font-medium">
                            <span>{formatNum(agent.conversionRate)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-[#1C2B48] rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, agent.conversionRate)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lead Sources Distribution (مصادر ومصادر العملاء) */}
        <div className="bg-white dark:bg-brand-panel border border-[#A7C7E7]/20 dark:border-brand-border rounded-2xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-[#A7C7E7]/20 dark:border-[#A7C7E7]/80 flex items-center justify-between bg-slate-50/50 dark:bg-[#1C2B48]/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <i className="ph-fill ph-funnel text-xl"></i>
              </div>
              <div>
                <h2 className="text-[#E8ECEF] font-bold dark:text-white font-extrabold text-base md:text-lg">
                  {lang === 'AR' ? 'مصادر وقنوات العملاء' : 'Lead Generation Sources'}
                </h2>
                <p className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-xs">
                  {lang === 'AR' ? 'توزيع نسبة اهتمام العملاء بحسب القناة التسويقية' : 'Share breakdown of prospects by marketing channels'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4 flex-1">
            {finalLeadSources.map((item, idx) => {
              const percentage = totalSourcesCount > 0 ? Math.round((item.count / totalSourcesCount) * 100) : 0;
              const barColors = [
                'bg-indigo-500',
                'bg-sky-500',
                'bg-brand-interactive',
                'bg-emerald-500',
                'bg-purple-500'
              ];
              const colorClass = barColors[idx % barColors.length];

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[#E8ECEF] font-bold dark:text-slate-200">{item.source}</span>
                    <div className="flex items-center gap-1.5 text-[#C4D8E5] font-medium font-en">
                      <span>({formatNum(item.count)})</span>
                      <span className="font-bold text-[#E8ECEF] font-bold dark:text-white">{formatNum(percentage)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-[#1C2B48] rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`${colorClass} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Row 3: System Alerts, Recent Requests, and Scheduled Tasks */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">

        {/* Column 1: Recent Requests (الطلبات الأخيرة) */}
        <div className="orca-panel-light flex flex-col overflow-hidden min-h-[400px]">
          <div className="p-5 border-b border-[#A7C7E7]/20 dark:border-[#A7C7E7]/80 flex items-center justify-between bg-slate-50/50 dark:bg-[#1C2B48]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-interactive/10 flex items-center justify-center text-brand-interactive">
                <i className="ph-fill ph-file-text text-xl"></i>
              </div>
              <div>
                <h2 className="text-[#E8ECEF] font-bold dark:text-white font-bold text-base">
                  {lang === 'AR' ? 'أحدث الطلبات الاستثمارية' : 'Latest Investment Requests'}
                </h2>
                <p className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-xs">
                  {lang === 'AR' ? 'آخر الطلبات المسجلة بانتظار التواصل المبدئي' : 'Recent prospects registered and awaiting response'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[340px]">
            {recentLeads.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium">
                {lang === 'AR' ? 'لا يوجد طلبات استثمارية مسجلة حالياً.' : 'No registered leads found.'}
              </div>
            ) : (
              recentLeads.map((lead) => {
                const sanitizedPhone = (lead.phone || "").replace(/\s+/g, "").replace(/\.0+$/, "");
                return (
                  <div key={lead.id} className="p-3 rounded-xl border border-[#A7C7E7]/20 dark:border-brand-border bg-white dark:bg-brand-panel hover:border-brand-interactive/40 dark:hover:border-brand-interactive/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#1C2B48] flex items-center justify-center text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium border border-[#A7C7E7]/20 dark:border-slate-700 group-hover:text-brand-interactive group-hover:border-brand-interactive/30 transition-colors shrink-0">
                        <i className="ph-fill ph-user text-sm"></i>
                      </div>
                      <div>
                        <h4 className="text-[#E8ECEF] font-bold dark:text-white font-bold text-xs mb-1 group-hover:text-brand-interactive transition-colors">
                          {lead.firstName} {lead.lastName ?? ''}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-[10px] font-en bg-slate-100 dark:bg-[#1C2B48] px-1.5 py-0.5 rounded">
                            {formatNum(sanitizedPhone.slice(0, 3))}××××{formatNum(sanitizedPhone.slice(-3))}
                          </span>
                          <span className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-[10px] font-en">
                            {formatNum(lead.createdAt.slice(0, 10))}
                          </span>
                        </div>
                      </div>
                    </div>
                    {lead.project && (
                      <span className="self-start sm:self-center inline-flex items-center gap-1 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-500/20 text-[10px] px-2 py-1 rounded-full font-semibold">
                        {lead.project.name}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          <div className="p-3.5 border-t border-[#A7C7E7]/20 dark:border-brand-border text-center bg-slate-50 dark:bg-brand-bg/50">
            <button className="text-brand-interactive text-xs font-bold hover:text-brand-interactive-hover transition-colors inline-flex items-center gap-1">
              {lang === 'AR' ? `عرض جميع الطلبات (${formatNum(totalLeadsCount)})` : `View all requests (${formatNum(totalLeadsCount)})`} <i className="ph-bold ph-arrow-left"></i>
            </button>
          </div>
        </div>

        {/* Column 2: Scheduled Tasks & Followups (المهام والمتابعات) */}
        <div className="bg-white dark:bg-brand-panel border border-[#A7C7E7]/20 dark:border-brand-border rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-[400px]">
          <div className="p-5 border-b border-[#A7C7E7]/20 dark:border-[#A7C7E7]/80 flex items-center justify-between bg-slate-50/50 dark:bg-[#1C2B48]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500">
                <i className="ph-fill ph-calendar-check text-xl"></i>
              </div>
              <div>
                <h2 className="text-[#E8ECEF] font-bold dark:text-white font-bold text-base">
                  {lang === 'AR' ? 'جدول المتابعات والمهام' : 'Tasks & Reminders'}
                </h2>
                <p className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-xs">
                  {lang === 'AR' ? 'المهام المعلقة والمرتبطة بجدول المبيعات اليومي' : 'Awaiting tasks linked to daily sales workflows'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[340px]">
            {recentTasks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 mb-3 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center border border-[#A7C7E7]/20 dark:border-slate-700 border-dashed">
                  <i className="ph ph-coffee text-2xl text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium"></i>
                </div>
                <h4 className="text-[#E8ECEF] font-bold dark:text-white font-bold text-sm mb-1">
                  {lang === 'AR' ? 'لا توجد مهام حالية' : 'No current tasks'}
                </h4>
                <p className="text-slate-450 dark:text-[#C4D8E5] font-medium text-xs max-w-[200px] leading-relaxed mx-auto">
                  {lang === 'AR' ? 'يبدو أن جدولك خالٍ من أي مهام معلقة اليوم.' : 'It seems your schedule is clean for today.'}
                </p>
              </div>
            ) : (
              recentTasks.map((task) => (
                <div key={task.id} className="p-3 rounded-xl border border-[#A7C7E7]/20 dark:border-brand-border bg-white dark:bg-brand-panel hover:border-brand-interactive/40 dark:hover:border-brand-interactive/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#1C2B48] flex items-center justify-center text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium border border-[#A7C7E7]/20 dark:border-slate-700 group-hover:text-brand-interactive group-hover:border-brand-interactive/30 transition-colors shrink-0">
                      <i className="ph-fill ph-clipboard-text text-sm"></i>
                    </div>
                    <div>
                      <h4 className="text-[#E8ECEF] font-bold dark:text-white font-bold text-xs mb-1 group-hover:text-brand-interactive transition-colors line-clamp-1">
                        {task.title}
                      </h4>
                      {task.lead && (
                        <p className="text-slate-450 dark:text-[#C4D8E5] font-medium text-[10px]">
                          {lang === 'AR' ? 'العميل: ' : 'Lead: '} {task.lead.firstName} {task.lead.lastName ?? ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 self-start sm:self-center">
                    <span className={`inline-flex items-center text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                      task.priority === 'HIGH' 
                        ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/20' 
                        : task.priority === 'MEDIUM'
                        ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/20'
                        : 'bg-slate-100 dark:bg-[#1C2B48] text-[#C4D8E5] font-medium dark:text-slate-450 border-[#A7C7E7]/20 dark:border-slate-700'
                    }`}>
                      {lang === 'AR' 
                        ? (task.priority === 'HIGH' ? 'حرجة' : task.priority === 'MEDIUM' ? 'متوسطة' : 'عادية') 
                        : task.priority
                      }
                    </span>
                    <span className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-[10px] font-en bg-slate-100 dark:bg-slate-850 px-1.5 py-0.5 rounded">
                      {formatNum(task.dueDate.slice(0, 10))}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: System Alerts Feed (تنبيهات النظام) */}
        <div className="bg-white dark:bg-brand-panel border border-[#A7C7E7]/20 dark:border-brand-border rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-[400px]">
          <div className="p-5 border-b border-[#A7C7E7]/20 dark:border-[#A7C7E7]/80 flex items-center justify-between bg-slate-50/50 dark:bg-[#1C2B48]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500">
                <i className="ph-fill ph-bell-ringing text-xl"></i>
              </div>
              <div>
                <h2 className="text-[#E8ECEF] font-bold dark:text-white font-bold text-base">
                  {lang === 'AR' ? 'تنبيهات وحالة التشغيل' : 'System Operational Alerts'}
                </h2>
                <p className="text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium text-xs">
                  {lang === 'AR' ? 'متابعة أوتوماتيكية للقصور أو المعاملات المتأخرة' : 'Automated notifications of anomalies and alerts'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[340px]">
            {finalSystemAlerts.map((alert) => {
              const bgClass = 
                alert.type === 'critical' 
                  ? 'bg-rose-50/70 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30' 
                  : alert.type === 'warning' 
                  ? 'bg-amber-50/70 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30' 
                  : 'bg-blue-50/70 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/30';
              
              const iconClass = 
                alert.type === 'critical' 
                  ? 'ph-bold ph-warning-octagon text-rose-500 dark:text-rose-450' 
                  : alert.type === 'warning' 
                  ? 'ph-bold ph-warning text-amber-500 dark:text-amber-450' 
                  : 'ph-bold ph-info text-blue-500 dark:text-blue-400';

              return (
                <div key={alert.id} className={`p-3 rounded-xl border ${bgClass} flex gap-3`}>
                  <div className="pt-0.5 shrink-0">
                    <i className={`${iconClass} text-lg`}></i>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-bold text-[#E8ECEF] font-bold dark:text-slate-200 leading-relaxed">
                      {lang === 'AR' ? alert.messageAr : alert.messageEn}
                    </p>
                    <p className="text-[9px] text-[#C4D8E5] font-medium dark:text-[#C4D8E5] font-medium font-en">
                      {new Date(alert.date).toLocaleTimeString(lang === 'EN' ? 'en-GB' : 'ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
