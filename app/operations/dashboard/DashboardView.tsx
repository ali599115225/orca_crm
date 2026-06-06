// app/operations/dashboard/DashboardView.tsx
'use client';

import React, { useState } from 'react';
import { useApp } from '@/app/context/AppContext';
import { toArabicNumerals as toArabicNumeralsImport, formatCurrency as formatCurrencyImport } from '@/lib/formatters';
import ContractWizard from '@/components/features/ContractWizard';
import { SmartCard } from '@/components/ui/SmartCard';

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
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Helper to translate digits to Arabic
  const formatNum = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return lang === 'AR' ? '٠' : '0';
    return lang === 'AR' ? toArabicNumeralsImport(num) : num.toString();
  };

  // Helper to format currency into SAR
  const formatSAR = (value: number): string => {
    return formatCurrencyImport(value, lang === 'AR' ? 'AR' : 'EN');
  };

  const totalLeadsCount = stats?.totalLeads ?? 0;
  const dailyToursCount = stats?.dailyTours ?? 0;
  const sentOffersCount = stats?.sentOffers ?? 0;
  const closedContractsCount = stats?.closedContracts ?? 0;

  // Refresh page data when contract is created successfully
  const handleWizardSuccess = () => {
    // Optionally trigger routing refresh or telemetry logs reload
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="orca-page orca-stack" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      {/* 1. Welcome Banner (البنر الترحيبي العام) */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl dark:shadow-none transition-all">
        <div className="absolute top-0 right-0 w-64 h-64 bg-corporate-blue/10 dark:bg-cyan-glow/5 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-corporate-blue/10 dark:bg-cyan-glow/10 border border-corporate-blue/20 dark:border-cyan-glow/20 text-corporate-blue dark:text-cyan-glow text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-corporate-blue dark:bg-cyan-glow animate-pulse"></span>
            {lang === 'AR' ? 'نواة العمليات المتكاملة' : 'Bento Intelligence Suite'}
          </div>
          <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
            {lang === 'AR' 
              ? `بوابة ذكاء العمليات - ${tenant?.companyName || 'أوركا العقارية'}`
              : `Operations Portal - ${tenant?.companyName || 'ORCA Properties'}`
            }
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed">
            {lang === 'AR'
              ? 'مراقبة فورية لمؤشرات المبيعات ونشاط الجولات، مدعومة بمكتبة الإجراءات السريعة ومساعد التنبؤات التلقائي المبني على الذكاء الاصطناعي.'
              : 'Real-time sales, property tours tracking, quick workflow actions, and predictive AI analytics.'
            }
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-2 w-full md:w-auto shrink-0">
          <div className="bg-white/50 dark:bg-void/75 backdrop-blur border border-slate-200/50 dark:border-white/10 p-4 rounded-xl text-center md:min-w-[170px] shadow-sm">
             <p className="text-slate-500 dark:text-slate-400 font-medium text-xs mb-1 font-semibold">{lang === 'AR' ? 'تاريخ اليوم' : "Today's Date"}</p>
             <p className="text-corporate-blue dark:text-cyan-glow font-bold text-base md:text-lg">
                {new Date().toLocaleDateString(lang === 'EN' ? 'en-GB' : 'ar-EG', { day: '2-digit', month: 'short', year: 'numeric' })}
             </p>
          </div>
        </div>
      </div>

      {/* 2. Bento Box Grid System (المصفوفة الذكية الكبرى) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* ========================================================
            ROW 1: KPIs (4 SmartCards taking 1 column each)
           ======================================================== */}

        {/* Card 1: Closed Contracts (العقود المغلقة) */}
        <SmartCard className="p-5 border-l-4 border-l-purple-500 hover:scale-[1.02] duration-300">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">
                {lang === 'AR' ? 'العقود المغلقة' : 'Closed Contracts'}
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {formatNum(closedContractsCount)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <i className="ph-fill ph-file-lock text-xl"></i>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] leading-tight">
            {lang === 'AR' ? 'إجمالي عقود المبيعات الموثقة بالنظام' : 'Total validated sales agreements'}
          </p>
        </SmartCard>

        {/* Card 2: Sent Offers (العروض المرسلة) */}
        <SmartCard className="p-5 border-l-4 border-l-sky-500 hover:scale-[1.02] duration-300">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">
                {lang === 'AR' ? 'العروض المرسلة' : 'Sent Offers'}
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {formatNum(sentOffersCount)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <i className="ph-fill ph-paper-plane-tilt text-xl"></i>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] leading-tight">
            {lang === 'AR' ? 'عروض الأسعار المكتوبة قيد التفاوض والمراجعة' : 'Outbound price quotations under negotiation'}
          </p>
        </SmartCard>

        {/* Card 3: Daily Tours (الجولات اليوم) */}
        <SmartCard className="p-5 border-l-4 border-l-rose-500 hover:scale-[1.02] duration-300">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">
                {lang === 'AR' ? 'الجولات اليوم' : 'Daily Tours'}
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {formatNum(dailyToursCount)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-450 shrink-0">
              <i className="ph-fill ph-calendar-check text-xl"></i>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] leading-tight">
            {lang === 'AR' ? 'زيارات ومواعيد المعاينة الميدانية اليوم' : 'Tours and visits scheduled for today'}
          </p>
        </SmartCard>

        {/* Card 4: Total Leads (إجمالي العملاء) */}
        <SmartCard className="p-5 border-l-4 border-l-indigo-500 hover:scale-[1.02] duration-300">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">
                {lang === 'AR' ? 'إجمالي العملاء' : 'Total Leads'}
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {formatNum(totalLeadsCount)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <i className="ph-fill ph-users-three text-xl"></i>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] leading-tight">
            {lang === 'AR' ? 'العملاء المستثمرون المسجلون بقاعدة البيانات' : 'Total prospects registered in CRM database'}
          </p>
        </SmartCard>

        {/* ========================================================
            ROW 2: ACTION & AI (Action = 1 column, AI = 3 columns)
           ======================================================== */}

        {/* Action Card: إجراء سريع (col-span-1) */}
        <SmartCard className="p-5 flex flex-col justify-between hover:scale-[1.02] duration-300 relative overflow-hidden bg-gradient-to-br from-corporate-blue/5 via-white/50 to-transparent dark:from-cyan-glow/5 dark:via-white/5 dark:to-transparent">
          <div className="absolute -top-10 -left-10 w-24 h-24 bg-corporate-blue/10 dark:bg-cyan-glow/10 rounded-full blur-2xl"></div>
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-corporate-blue/15 dark:bg-cyan-glow/15 flex items-center justify-center text-corporate-blue dark:text-cyan-glow">
                <i className="ph-bold ph-lightning text-base"></i>
              </div>
              <h4 className="text-slate-900 dark:text-white font-extrabold text-sm">{lang === 'AR' ? 'إجراء سريع' : 'Quick Actions'}</h4>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mb-6">
              {lang === 'AR' 
                ? 'قم بإصدار العقود والوثائق للوحدات العقارية الشاغرة وربطها بالعميل فورا وتحديث البيانات بالخلفية.'
                : 'Instantly generate new sales agreements, register buyer details and update inventory status.'
              }
            </p>
          </div>

          <button
            onClick={() => setIsWizardOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-corporate-blue dark:bg-gradient-to-r dark:from-indigo-650 dark:to-indigo-500 hover:scale-[1.02] text-white font-extrabold text-xs transition-all shadow-md cursor-pointer"
          >
            <i className="ph-fill ph-file-plus text-sm"></i>
            <span>{lang === 'AR' ? 'إصدار عقد جديد' : 'Issue New Contract'}</span>
          </button>
        </SmartCard>

        {/* AI Assistant Panel: مساعد التنبؤات والذكاء الاصطناعي (col-span-3) */}
        <SmartCard className="xl:col-span-3 relative overflow-hidden p-5 flex flex-col justify-between bg-gradient-to-br from-corporate-blue/5 via-white/50 to-transparent dark:from-cyan-glow/5 dark:via-white/5 dark:to-transparent">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-l from-corporate-blue/5 to-transparent dark:from-cyan-glow/5 dark:to-transparent rounded-full blur-[90px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
          
          <div>
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 pb-3.5 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-corporate-blue dark:bg-gradient-to-tr dark:from-indigo-500 dark:to-purple-550 text-white shadow-sm">
                  <i className="ph-fill ph-sparkles text-base"></i>
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500"></span>
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                    {lang === 'AR' ? 'مساعد التنبؤات والذكاء الاصطناعي' : 'Predictive AI Assistant'}
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                    {lang === 'AR' ? 'مؤشرات توقعات الإغلاق، قنوات الجذب والتوصيات المقترحة' : 'Sales closure, optimal contact windows & automated recommendations'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-corporate-blue/15 dark:bg-cyan-glow/15 text-corporate-blue dark:text-cyan-glow border border-corporate-blue/20 dark:border-cyan-glow/20">
                {lang === 'AR' ? 'محدث ونشط' : 'Synced'}
              </span>
            </div>

            {/* predictions list */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Box 1: Best Contact time */}
              <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-slate-200/50 dark:border-white/10 rounded-xl p-3.5 hover:border-corporate-blue dark:hover:border-cyan-glow transition-all">
                <div className="flex items-center gap-1.5 mb-2 text-corporate-blue dark:text-cyan-glow font-bold text-[11px]">
                  <i className="ph-bold ph-phone-call text-xs"></i>
                  <span>{lang === 'AR' ? 'أفضل أوقات التواصل' : 'Optimal Call Window'}</span>
                </div>
                <div className="space-y-1.5">
                  {aiPredictions?.bestContactTimes && aiPredictions.bestContactTimes.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] bg-slate-250/30 dark:bg-void/50 p-1.5 rounded">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[65px]">{item.name}</span>
                      <span className="text-corporate-blue dark:text-cyan-glow font-bold font-en">{lang === 'AR' ? item.slotAr : item.slotEn}</span>
                    </div>
                  ))}
                  {(!aiPredictions?.bestContactTimes || aiPredictions.bestContactTimes.length === 0) && (
                    <div className="text-slate-500 dark:text-slate-400 text-[9px] py-1 text-center">{lang === 'AR' ? 'لا توجد أوقات مقترحة.' : 'No slots computed.'}</div>
                  )}
                </div>
              </div>

              {/* Box 2: Close predictions */}
              <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-slate-200/50 dark:border-white/10 rounded-xl p-3.5 hover:border-corporate-blue dark:hover:border-cyan-glow transition-all">
                <div className="flex items-center gap-1.5 mb-2 text-corporate-blue dark:text-cyan-glow font-bold text-[11px]">
                  <i className="ph-bold ph-trend-up text-xs"></i>
                  <span>{lang === 'AR' ? 'المتوقع إغلاقهم' : 'Propensity to Close'}</span>
                </div>
                <div className="space-y-1.5">
                  {aiPredictions?.expectedToClose && aiPredictions.expectedToClose.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] bg-slate-250/30 dark:bg-void/50 p-1.5 rounded">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[65px]">{item.name}</span>
                      <span className="bg-corporate-blue/20 dark:bg-cyan-glow/20 text-corporate-blue dark:text-cyan-glow px-1 py-0.5 rounded font-bold">{formatNum(item.score)}%</span>
                    </div>
                  ))}
                  {(!aiPredictions?.expectedToClose || aiPredictions.expectedToClose.length === 0) && (
                    <div className="text-slate-500 dark:text-slate-400 text-[9px] py-1 text-center">{lang === 'AR' ? 'لا توجد صفقات مرشحة.' : 'No closing candidates.'}</div>
                  )}
                </div>
              </div>

              {/* Box 3: Campaign recommendation */}
              <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-slate-200/50 dark:border-white/10 rounded-xl p-3.5 hover:border-corporate-blue dark:hover:border-cyan-glow transition-all">
                <div className="flex items-center gap-1.5 mb-2 text-corporate-blue dark:text-cyan-glow font-bold text-[11px]">
                  <i className="ph-bold ph-megaphone text-xs"></i>
                  <span>{lang === 'AR' ? 'التسويق المقترح' : 'Campaign Guidance'}</span>
                </div>
                <div className="space-y-1.5">
                  {aiPredictions?.projectsNeedingCampaign && aiPredictions.projectsNeedingCampaign.slice(0, 1).map((item, idx) => (
                    <div key={idx} className="bg-slate-250/30 dark:bg-void/50 p-1.5 rounded text-[9px]">
                      <span className="font-bold text-slate-800 dark:text-slate-300 block truncate mb-1">{item.name}</span>
                      <span className="text-slate-500 dark:text-slate-400 leading-tight block">{lang === 'AR' ? item.reasonAr : item.reasonEn}</span>
                    </div>
                  ))}
                  {(!aiPredictions?.projectsNeedingCampaign || aiPredictions.projectsNeedingCampaign.length === 0) && (
                    <div className="text-slate-500 dark:text-slate-400 text-[9px] py-1 text-center">{lang === 'AR' ? 'المبيعات مستقرة.' : 'Sales are optimal.'}</div>
                  )}
                </div>
              </div>

            </div>
          </div>
          
          <div className="text-[10px] text-corporate-blue dark:text-cyan-glow mt-4 border-t border-slate-200/50 dark:border-white/10 pt-2 flex justify-between items-center">
            <span>{lang === 'AR' ? 'معالجة التنبؤات قائمة على خوارزميات التعلم الآلي والبيانات السابقة.' : 'Calculated automatically based on operational machine learning inputs.'}</span>
            <span className="font-bold font-en text-[9px]">OrcaAI v1.6</span>
          </div>
        </SmartCard>



      </div>

      {/* 3. Contract Issuance Drawer/Wizard Modal overlay */}
      <ContractWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={handleWizardSuccess}
      />

    </div>
  );
}
