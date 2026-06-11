// app/operations/dashboard/DashboardView.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/app/context/AppContext';
import { toArabicNumerals as toArabicNumeralsImport, formatCurrency as formatCurrencyImport } from '@/lib/formatters';
import ContractWizard from '@/components/features/ContractWizard';
import { SmartCard } from '@/components/ui/SmartCard';
import PageHeader from '@/components/ui/PageHeader';
import type { PipelineStage, TodayTask } from '@/app/actions/dashboard';

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
  pipelineStages?: PipelineStage[];
  todayTasks?: TodayTask[];
  whatsAppStats?: {
    conversationsCount: number;
    newLeadsCount: number;
    unreadMessagesCount: number;
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
  pipelineStages = [],
  todayTasks = [],
  whatsAppStats,
}: DashboardViewProps) {
  const { theme, lang } = useApp();
  const router = useRouter();
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
    router.refresh();
  };

  return (
    <div className="nc-page nc-stack" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      {/* 1. Welcome Banner (البنر الترحيبي العام) */}
      <PageHeader 
        title={lang === 'AR' 
          ? `مرحباً بك، ${tenant?.companyName || 'علي'}`
          : `Welcome back, ${tenant?.companyName || 'Ali'}`
        }
        description={lang === 'AR'
          ? 'مراقبة فورية لمؤشرات المبيعات ونشاط الجولات، مدعومة بمكتبة الإجراءات السريعة ومساعد التنبؤات التلقائي المبني على الذكاء الاصطناعي.'
          : 'Real-time sales, property tours tracking, quick workflow actions, and predictive AI analytics.'
        }
      >
        <div className="bg-[var(--nc-surface-strong)] backdrop-blur border border-[var(--nc-glass-border)] p-3 rounded-xl text-center md:min-w-[170px] shadow-sm">
           <p className="text-[var(--nc-text-dim)] font-medium text-xs mb-1">{lang === 'AR' ? 'تاريخ اليوم' : "Today's Date"}</p>
           <p className="text-[var(--nc-accent)] font-bold text-base md:text-lg font-mono">
              {new Date().toLocaleDateString(lang === 'EN' ? 'en-GB' : 'ar-EG', { day: '2-digit', month: 'short', year: 'numeric' })}
           </p>
        </div>
      </PageHeader>

      {/* 2. Bento Box Grid System (المصفوفة الذكية الكبرى) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 nc-stagger-enter">
        
        {/* ========================================================
            ROW 1: KPIs (4 elevated SmartCards - primary visual weight)
           ======================================================== */}

        {/* Card 1: Closed Contracts (العقود المغلقة) */}
        <SmartCard elevation="elevated" className="p-3">
          <div className="flex items-start mb-2">
            <div className="flex-1">
              <p className="text-[var(--nc-text-dim)] text-[10px] font-bold uppercase tracking-wider mb-0.5">
                {lang === 'AR' ? 'العقود المغلقة' : 'Closed Contracts'}
              </p>
              <h3 className="text-xl font-black text-[var(--nc-text-primary)]">
                {formatNum(closedContractsCount)}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <i className="ph-fill ph-file-lock text-base"></i>
            </div>
          </div>
          <p className="text-[var(--nc-text-dim)] text-[9px] leading-relaxed">
            {lang === 'AR' ? 'إجمالي عقود المبيعات الموثقة بالنظام' : 'Total validated sales agreements'}
          </p>
        </SmartCard>

        {/* Card 2: Sent Offers (العروض المرسلة) */}
        <SmartCard elevation="elevated" className="p-3">
          <div className="flex items-start mb-2">
            <div className="flex-1">
              <p className="text-[var(--nc-text-dim)] text-[10px] font-bold uppercase tracking-wider mb-0.5">
                {lang === 'AR' ? 'العروض المرسلة' : 'Sent Offers'}
              </p>
              <h3 className="text-xl font-black text-[var(--nc-text-primary)]">
                {formatNum(sentOffersCount)}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <i className="ph-fill ph-paper-plane-tilt text-base"></i>
            </div>
          </div>
          <p className="text-[var(--nc-text-dim)] text-[9px] leading-relaxed">
            {lang === 'AR' ? 'عروض الأسعار المكتوبة قيد التفاوض والمراجعة' : 'Outbound price quotations under negotiation'}
          </p>
        </SmartCard>

        {/* Card 3: Daily Tours (الجولات اليوم) */}
        <SmartCard elevation="elevated" className="p-3">
          <div className="flex items-start mb-2">
            <div className="flex-1">
              <p className="text-[var(--nc-text-dim)] text-[10px] font-bold uppercase tracking-wider mb-0.5">
                {lang === 'AR' ? 'جولات اليوم' : 'Daily Tours'}
              </p>
              <h3 className="text-xl font-black text-[var(--nc-text-primary)]">
                {formatNum(dailyToursCount)}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <i className="ph-fill ph-calendar-check text-base"></i>
            </div>
          </div>
          <p className="text-[var(--nc-text-dim)] text-[9px] leading-relaxed">
            {lang === 'AR' ? 'زيارات ومواعيد المعاينة الميدانية اليوم' : 'Tours and visits scheduled for today'}
          </p>
        </SmartCard>

        {/* Card 4: Total Leads (إجمالي العملاء) */}
        <SmartCard elevation="elevated" className="p-3">
          <div className="flex items-start mb-2">
            <div className="flex-1">
              <p className="text-[var(--nc-text-dim)] text-[10px] font-bold uppercase tracking-wider mb-0.5">
                {lang === 'AR' ? 'إجمالي العملاء' : 'Total Leads'}
              </p>
              <h3 className="text-xl font-black text-[var(--nc-text-primary)]">
                {formatNum(totalLeadsCount)}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <i className="ph-fill ph-users-three text-base"></i>
            </div>
          </div>
          <p className="text-[var(--nc-text-dim)] text-[9px] leading-relaxed">
            {lang === 'AR' ? 'العملاء المستثمرون المسجلون بقاعدة البيانات' : 'Total prospects registered in CRM database'}
          </p>
        </SmartCard>

        {/* WhatsApp Stats Cards */}
        {whatsAppStats && (
          <>
            <SmartCard elevation="elevated" className="p-3">
              <div className="flex items-start mb-2">
                <div className="flex-1">
                  <p className="text-[var(--nc-text-dim)] text-[10px] font-bold uppercase tracking-wider mb-0.5">
                    {lang === 'AR' ? 'محادثات واتساب' : 'WhatsApp Conversations'}
                  </p>
                  <h3 className="text-xl font-black text-[var(--nc-text-primary)]">
                    {formatNum(whatsAppStats.conversationsCount)}
                  </h3>
                </div>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <i className="ph-fill ph-whatsapp-logo text-base"></i>
                </div>
              </div>
              <p className="text-[var(--nc-text-dim)] text-[9px] leading-relaxed">
                {lang === 'AR' ? 'إجمالي المحادثات النشطة عبر واتساب' : 'Total active WhatsApp conversations'}
              </p>
            </SmartCard>

            <SmartCard elevation="elevated" className="p-3">
              <div className="flex items-start mb-2">
                <div className="flex-1">
                  <p className="text-[var(--nc-text-dim)] text-[10px] font-bold uppercase tracking-wider mb-0.5">
                    {lang === 'AR' ? 'عملاء واتساب جدد' : 'New WhatsApp Leads'}
                  </p>
                  <h3 className="text-xl font-black text-[var(--nc-text-primary)]">
                    {formatNum(whatsAppStats.newLeadsCount)}
                  </h3>
                </div>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <i className="ph-fill ph-user-plus text-base"></i>
                </div>
              </div>
              <p className="text-[var(--nc-text-dim)] text-[9px] leading-relaxed">
                {lang === 'AR' ? 'عملاء جدد من واتساب آخر 7 أيام' : 'New WhatsApp leads in last 7 days'}
              </p>
            </SmartCard>

            {whatsAppStats.unreadMessagesCount > 0 && (
              <SmartCard elevation="elevated" className="p-3">
                <div className="flex items-start mb-2">
                  <div className="flex-1">
                    <p className="text-[var(--nc-text-dim)] text-[10px] font-bold uppercase tracking-wider mb-0.5">
                      {lang === 'AR' ? 'رسائل غير مقروءة' : 'Unread Messages'}
                    </p>
                    <h3 className="text-xl font-black text-amber-400">
                      {formatNum(whatsAppStats.unreadMessagesCount)}
                    </h3>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <i className="ph-fill ph-chat-circle-dots text-base"></i>
                  </div>
                </div>
                <p className="text-[var(--nc-text-dim)] text-[9px] leading-relaxed">
                  {lang === 'AR' ? 'رسائل واتساب واردة لم يتم الرد عليها' : 'Inbound WhatsApp messages pending reply'}
                </p>
              </SmartCard>
            )}
          </>
        )}

        {/* ========================================================
            ROW 2: ACTION & AI (Action = 1 column, AI = 3 columns)
           ======================================================== */}

        {/* Action Card: إجراء سريع (col-span-1) */}
        <SmartCard elevation="default" className="p-4 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[var(--nc-accent-soft)] via-transparent to-transparent">
          <div className="absolute -top-10 -left-10 w-24 h-24 bg-[var(--nc-coral-bg)] rounded-full blur-2xl"></div>
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--nc-accent-soft)] flex items-center justify-center text-[var(--nc-accent)]">
                <i className="ph-bold ph-lightning text-base"></i>
              </div>
              <h4 className="text-sm font-bold text-[var(--nc-text-primary)]">{lang === 'AR' ? 'إجراء سريع' : 'Quick Actions'}</h4>
            </div>
            <p className="text-[var(--nc-text-dim)] text-[11px] leading-relaxed mb-6">
              {lang === 'AR' 
                ? 'قم بإصدار العقود والوثائق للوحدات العقارية الشاغرة وربطها بالعميل فورا وتحديث البيانات بالخلفية.'
                : 'Instantly generate new sales agreements, register buyer details and update inventory status.'
              }
            </p>
          </div>

          <button
            onClick={() => setIsWizardOpen(true)}
            className="nc-btn nc-btn-primary w-full text-xs cursor-pointer"
          >
            <i className="ph-fill ph-file-plus text-sm"></i>
            <span>{lang === 'AR' ? 'إصدار عقد جديد' : 'Issue New Contract'}</span>
          </button>
        </SmartCard>

        {/* AI Assistant Panel (col-span-3) - secondary visual weight */}
        <SmartCard elevation="subtle" className="xl:col-span-3 p-4">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--nc-glass-border)] pb-3.5 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--nc-accent-soft)] flex items-center justify-center text-[var(--nc-accent)]">
                  <i className="ph-fill ph-sparkles text-base"></i>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--nc-text-primary)] leading-tight">
                    {lang === 'AR' ? 'مساعد التنبؤات والذكاء الاصطناعي' : 'Predictive AI Assistant'}
                  </h4>
                  <p className="text-[var(--nc-text-dim)] text-[10px]">
                    {lang === 'AR' ? 'مؤشرات توقعات الإغلاق، قنوات الجذب والتوصيات المقترحة' : 'Sales closure, optimal contact windows & automated recommendations'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--nc-accent-soft)] text-[var(--nc-accent)] border border-[var(--nc-accent-border)]">
                {lang === 'AR' ? 'محدث ونشط' : 'Synced'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Box 1: Best Contact time */}
              <div className="nc-card-default p-3.5">
                <div className="flex items-center gap-1.5 mb-2 text-[var(--nc-accent)] font-bold text-[11px]">
                  <i className="ph-bold ph-phone-call text-xs"></i>
                  <span>{lang === 'AR' ? 'أفضل أوقات التواصل' : 'Optimal Call Window'}</span>
                </div>
                <div className="space-y-1.5">
                  {aiPredictions?.bestContactTimes && aiPredictions.bestContactTimes.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] bg-[var(--nc-surface)] p-1.5 rounded">
                      <span className="font-semibold text-[var(--nc-text-primary)] truncate max-w-[65px]">{item.name}</span>
                      <span className="text-[var(--nc-accent)] font-bold font-en">{lang === 'AR' ? item.slotAr : item.slotEn}</span>
                    </div>
                  ))}
                  {(!aiPredictions?.bestContactTimes || aiPredictions.bestContactTimes.length === 0) && (
                    <div className="text-[var(--nc-text-dim)] text-[9px] py-1 text-center">{lang === 'AR' ? 'لا توجد أوقات مقترحة.' : 'No slots computed.'}</div>
                  )}
                </div>
              </div>

              {/* Box 2: Close predictions */}
              <div className="nc-card-default p-3.5">
                <div className="flex items-center gap-1.5 mb-2 text-[var(--nc-accent)] font-bold text-[11px]">
                  <i className="ph-bold ph-trend-up text-xs"></i>
                  <span>{lang === 'AR' ? 'المتوقع إغلاقهم' : 'Propensity to Close'}</span>
                </div>
                <div className="space-y-1.5">
                  {aiPredictions?.expectedToClose && aiPredictions.expectedToClose.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] bg-[var(--nc-surface)] p-1.5 rounded">
                      <span className="font-semibold text-[var(--nc-text-primary)] truncate max-w-[65px]">{item.name}</span>
                      <span className="bg-[var(--nc-accent-soft)] text-[var(--nc-accent)] px-1 py-0.5 rounded font-bold">{formatNum(item.score)}%</span>
                    </div>
                  ))}
                  {(!aiPredictions?.expectedToClose || aiPredictions.expectedToClose.length === 0) && (
                    <div className="text-[var(--nc-text-dim)] text-[9px] py-1 text-center">{lang === 'AR' ? 'لا توجد صفقات مرشحة.' : 'No closing candidates.'}</div>
                  )}
                </div>
              </div>

              {/* Box 3: Campaign recommendation */}
              <div className="nc-card-default p-3.5">
                <div className="flex items-center gap-1.5 mb-2 text-[var(--nc-accent)] font-bold text-[11px]">
                  <i className="ph-bold ph-megaphone text-xs"></i>
                  <span>{lang === 'AR' ? 'التسويق المقترح' : 'Campaign Guidance'}</span>
                </div>
                <div className="space-y-1.5">
                  {aiPredictions?.projectsNeedingCampaign && aiPredictions.projectsNeedingCampaign.slice(0, 1).map((item, idx) => (
                    <div key={idx} className="bg-[var(--nc-surface)] p-1.5 rounded text-[9px]">
                      <span className="font-bold text-[var(--nc-text-primary)] block truncate mb-1">{item.name}</span>
                      <span className="text-[var(--nc-text-dim)] leading-tight block">{lang === 'AR' ? item.reasonAr : item.reasonEn}</span>
                    </div>
                  ))}
                  {(!aiPredictions?.projectsNeedingCampaign || aiPredictions.projectsNeedingCampaign.length === 0) && (
                    <div className="text-[var(--nc-text-dim)] text-[9px] py-1 text-center">{lang === 'AR' ? 'المبيعات مستقرة.' : 'Sales are optimal.'}</div>
                  )}
                </div>
              </div>

            </div>
          </div>
          
          <div className="text-[9px] text-[var(--nc-text-dim)] mt-4 border-t border-[var(--nc-glass-border)] pt-2 flex justify-between items-center">
            <span>{lang === 'AR' ? 'معالجة التنبؤات قائمة على خوارزميات التعلم الآلي والبيانات السابقة.' : 'Calculated automatically based on operational machine learning inputs.'}</span>
            <span className="font-bold font-en">OrcaAI v1.6</span>
          </div>
        </SmartCard>



      </div>

      {/* 3. Pipeline Snapshot + Today's Tasks Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Pipeline Snapshot (col-span-2) - default card */}
        <SmartCard elevation="default" className="xl:col-span-2 p-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400">
                <i className="ph-bold ph-flow-arrow text-base"></i>
              </div>
              <div>
                <h4 className="nc-heading-3">
                  {lang === "AR" ? "مسار الصفقات الحية" : "Pipeline Snapshot"}
                </h4>
                <p className="text-[var(--nc-text-dim)] text-[10px]">
                  {lang === "AR" ? "توزيع العملاء حسب مرحلة البيع" : "Lead distribution by sales stage"}
                </p>
              </div>
            </div>
            {pipelineStages.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-500 border border-green-500/20">
                {lang === "AR" ? "بيانات حية" : "Live"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {pipelineStages.map((stage) => {
              const total = pipelineStages.reduce((s, p) => s + p.count, 0);
              const percent = total > 0 ? Math.round((stage.count / total) * 100) : 0;
              return (
                <div
                  key={stage.key}
                  className="nc-card-default p-4 nc-hover-lift"
                  style={{ borderTopColor: stage.color, borderTopWidth: 3 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[var(--nc-text-secondary)]">
                      {lang === "AR" ? stage.labelAr : stage.labelEn}
                    </span>
                    <span
                      className="text-lg font-black"
                      style={{ color: stage.color }}
                    >
                      {formatNum(stage.count)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[var(--nc-surface)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: stage.color,
                        boxShadow: `0 0 6px ${stage.color}66`,
                      }}
                    />
                  </div>
                  <p className="text-[9px] text-[var(--nc-text-dim)] mt-1.5">
                    {lang === "AR" ? `${percent}% من الإجمالي` : `${percent}% of total`}
                  </p>
                </div>
              );
            })}
          </div>

          {pipelineStages.length === 0 && (
            <div className="text-center py-6 text-[var(--nc-text-dim)] text-xs">
              {lang === "AR" ? "لا توجد بيانات متاحة لعرض مسار الصفقات." : "No pipeline data available."}
            </div>
          )}
        </SmartCard>

        {/* Today's Urgent Tasks (col-span-1) */}
        <SmartCard elevation="default" className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
                <i className="ph-bold ph-clock-countdown text-base"></i>
              </div>
              <div>
                <h4 className="nc-heading-3">
                  {lang === "AR" ? "مهام اليوم العاجلة" : "Today's Urgent Tasks"}
                </h4>
                <p className="text-[var(--nc-text-dim)] text-[10px]">
                  {lang === "AR"
                    ? `${formatNum(todayTasks.length)} ${todayTasks.length === 1 ? "مهمة" : "مهام"} مستحقة اليوم`
                    : `${todayTasks.length} task${todayTasks.length !== 1 ? "s" : ""} due today`}
                </p>
              </div>
            </div>
            {todayTasks.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20 animate-pulse">
                {formatNum(todayTasks.length)}
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar">
            {todayTasks.map((task) => {
              const priorityColor =
                task.priority === "HIGH" ? "#EF4444" :
                task.priority === "MEDIUM" ? "#F59E0B" : "#3B82F6";
              const priorityLabel =
                task.priority === "HIGH" ? (lang === "AR" ? "عالية" : "High") :
                task.priority === "MEDIUM" ? (lang === "AR" ? "متوسطة" : "Medium") : (lang === "AR" ? "منخفضة" : "Low");

              return (
                <div
                  key={task.id}
                  className="nc-card-default p-3 nc-hover-glow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-[var(--nc-text-primary)] leading-snug line-clamp-2">
                      {task.title}
                    </p>
                    <span
                      className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: priorityColor }}
                    >
                      {priorityLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--nc-text-dim)]">
                    {task.leadName && (
                      <span className="flex items-center gap-1">
                        <i className="ph-bold ph-user text-[9px]"></i>
                        {task.leadName}
                      </span>
                    )}
                    {task.assignedName && (
                      <span className="flex items-center gap-1">
                        <i className="ph-bold ph-handshake text-[9px]"></i>
                        {task.assignedName}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-[var(--nc-text-dim)] mt-1">
                    {new Date(task.dueDate).toLocaleTimeString(lang === "AR" ? "ar-SA" : "en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              );
            })}

            {todayTasks.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                  <i className="ph-bold ph-check-circle text-green-400 text-xl"></i>
                </div>
                <p className="text-[var(--nc-text-dim)] text-xs font-medium">
                  {lang === "AR" ? "لا توجد مهام مستحقة اليوم" : "No tasks due today"}
                </p>
                <p className="text-[var(--nc-text-dim)] text-[10px] mt-1">
                  {lang === "AR" ? "جميع المهام منجزة في وقتها" : "All tasks are on schedule"}
                </p>
              </div>
            )}
          </div>
        </SmartCard>

      </div>

      {/* 4. Recent Requests Grid (أحدث الطلبات الاستثمارية) */}
      <div className="grid grid-cols-1 gap-4">
        <SmartCard elevation="default" className="p-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--nc-accent-soft)] flex items-center justify-center text-[var(--nc-accent)]">
                <i className="ph-bold ph-users text-base"></i>
              </div>
              <div>
                <h4 className="nc-heading-3">
                  {lang === "AR" ? "أحدث الطلبات الاستثمارية" : "Recent Requests"}
                </h4>
                <p className="text-[var(--nc-text-dim)] text-[10px]">
                  {lang === "AR" ? "آخر العملاء المسجلين في النظام" : "Latest leads registered"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            {recentLeads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--nc-surface)] border border-[var(--nc-glass-border)] hover:border-[var(--nc-accent-border)] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--nc-accent-soft)] flex items-center justify-center text-[var(--nc-accent)] font-bold text-xs">
                    {lead.firstName.charAt(0)}{lead.lastName?.charAt(0) || ''}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[var(--nc-text-primary)]">{lead.firstName} {lead.lastName}</h5>
                    <p className="text-[10px] text-[var(--nc-text-dim)] mt-0.5">{lead.phone} • {lead.city}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-1 rounded text-[9px] font-bold bg-[var(--nc-accent-soft)] text-[var(--nc-accent)]">
                    {lead.status === 'NEW' ? (lang === 'AR' ? 'جديد' : 'New') : lead.status}
                  </span>
                  {lead.project && <p className="text-[10px] text-[var(--nc-text-dim)] mt-1 truncate max-w-[100px]">{lead.project.name}</p>}
                </div>
              </div>
            ))}
            {recentLeads.length === 0 && (
              <div className="text-center py-6 text-[var(--nc-text-dim)] text-xs">
                {lang === 'AR' ? 'لا توجد طلبات حديثة' : 'No recent requests'}
              </div>
            )}
          </div>
        </SmartCard>
      </div>

      {/* 5. Contract Issuance Drawer/Wizard Modal overlay */}
      <ContractWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={handleWizardSuccess}
      />

    </div>
  );
}
