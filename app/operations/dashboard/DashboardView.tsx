// app/operations/dashboard/DashboardView.tsx
'use client';

import React from 'react';
import { useApp } from '@/app/context/AppContext';

interface DashboardViewProps {
  tenant?: {
    companyName: string;
    subdomain: string;
    subscriptionPlan: string;
    extraAgents: number;
  };
  stats?: {
    totalLeads: number;
    activeBookings: number;
    closedSales: number;
    totalProjects: number;
    pendingTasks: number;
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
}

export default function DashboardView({
  tenant,
  stats,
  recentLeads = [],
  recentTasks = [],
  projects = [],
}: DashboardViewProps) {
  const { theme, lang } = useApp();
  const isDark = theme === 'dark';

  // Helper to format numbers based on active language
  const formatNum = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "٠";
    let str = num.toString();
    if (lang === 'EN') return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, "٪");
  };

  // Safe metrics fallbacks
  const totalLeadsCount = stats?.totalLeads ?? 0;
  const activeBookingsCount = stats?.activeBookings ?? 0;
  const closedSalesCount = stats?.closedSales ?? 0;
  const projectsCount = stats?.totalProjects ?? 0;
  const pendingTasksCount = stats?.pendingTasks ?? 0;

  const metrics = [
    {
      labelAr: 'إجمالي العملاء المستثمرين',
      labelEn: 'Total Investment Leads',
      value: totalLeadsCount,
      icon: '👥',
      colorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/30',
    },
    {
      labelAr: 'الحجوزات النشطة والعربونات',
      labelEn: 'Active Allocations & Deposits',
      value: activeBookingsCount,
      icon: '🔐',
      colorClass: 'text-sky-650 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/30',
    },
    {
      labelAr: 'الصفقات العقارية المغلقة',
      labelEn: 'Closed Property Deals',
      value: closedSalesCount,
      icon: '🏆',
      colorClass: 'text-emerald-650 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/30',
    },
    {
      labelAr: 'المشاريع العقارية النشطة',
      labelEn: 'Active Real Estate Assets',
      value: projectsCount,
      icon: '🏢',
      colorClass: 'text-purple-650 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/30',
    },
  ];

  return (
    <div className="orca-page orca-stack" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      {/* Welcome Banner (البنر الترحيبي) */}
      <div className="orca-hero orca-panel-light relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-l from-white to-slate-50 dark:from-[#151f32] dark:to-[#0b1120] p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#df7b62]/10 dark:bg-[#df7b62]/5 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#df7b62]/10 border border-[#df7b62]/20 text-[#df7b62] text-xs font-semibold mb-4">
            <i className="ph-fill ph-sparkle"></i> {lang === 'AR' ? 'تحديث مباشر للبيانات' : 'Live Data Update'}
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {lang === 'AR' 
              ? `منصة ذكاء الأعمال لـ ${tenant?.companyName || 'مؤسسة أبعاد السكنية'}`
              : `Business Intelligence Portal - ${tenant?.companyName || 'Enterprise CRM'}`
            }
          </h1>
          <p className="text-xs md:text-sm text-slate-550 dark:text-slate-400 max-w-2xl leading-relaxed">
            {lang === 'AR'
              ? 'رصد فوري لمؤشرات الأداء KPIs، ومعدلات امتصاص المشاريع العقارية، وأتمتة العمليات التشغيلية لدعم اتخاذ القرار الاستراتيجي.'
              : 'Real-time monitoring of KPIs, property absorption rates, and process automation to support strategic decisions.'
            }
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-3 w-full md:w-auto">
          <div className="bg-white/60 dark:bg-[#0b1120]/50 backdrop-blur border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-center md:min-w-[160px] shadow-sm">
             <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">{lang === 'AR' ? 'تاريخ اليوم' : 'Today\'s Date'}</p>
             <p className="text-slate-900 dark:text-white font-bold font-en text-lg">
                {new Date().toLocaleDateString(lang === 'EN' ? 'en-GB' : 'ar-EG', { day: '2-digit', month: 'short', year: 'numeric' })}
             </p>
          </div>
        </div>
      </div>

      {/* KPI Cards (بطاقات المؤشرات) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Card 1 */}
        <div className="orca-panel-light p-4 orca-transition group hover:shadow-[0_4px_20px_-4px_rgba(223,123,98,0.12)]">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-0.5">
                {lang === 'AR' ? 'إجمالي المستثمرين' : 'Total Investment Leads'}
              </p>
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-en">
                {formatNum(totalLeadsCount)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-100 dark:border-slate-700 text-indigo-500 dark:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 transition-colors shrink-0">
              <i className="ph-fill ph-users-three text-xl"></i>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-en bg-emerald-50 dark:bg-emerald-500/10 w-fit px-2.5 py-1 rounded-md font-semibold">
            <i className="ph-bold ph-trend-up"></i>
            <span>+2.5%</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="orca-panel-light p-4 orca-transition group relative overflow-hidden hover:shadow-[0_4px_20px_-4px_rgba(223,123,98,0.12)]">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-amber-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-0.5">
                {lang === 'AR' ? 'الحجوزات النشطة' : 'Active Allocations'}
              </p>
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-en">
                {formatNum(activeBookingsCount)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-100 dark:border-slate-700 text-amber-500 group-hover:bg-amber-50 dark:group-hover:bg-amber-500/10 transition-colors shrink-0">
              <i className="ph-fill ph-lock-key text-xl"></i>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-sans bg-slate-100 dark:bg-slate-800/50 w-fit px-2.5 py-1 rounded-md">
            <span>{lang === 'AR' ? 'عربونات قيد المعالجة' : 'Deposits In Process'}</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="orca-panel-light p-4 orca-transition group relative overflow-hidden hover:shadow-[0_4px_20px_-4px_rgba(223,123,98,0.12)]">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-[#df7b62] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-0.5">
                {lang === 'AR' ? 'الصفقات المغلقة' : 'Closed Deals'}
              </p>
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-en">
                {formatNum(closedSalesCount)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-100 dark:border-slate-700 text-[#df7b62] group-hover:bg-[#df7b62]/10 transition-colors shrink-0">
              <i className="ph-fill ph-trophy text-xl"></i>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#df7b62] font-en bg-[#df7b62]/10 w-fit px-2.5 py-1 rounded-md font-semibold">
            <i className="ph-bold ph-trend-up"></i>
            <span>+12.4%</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="orca-panel-light p-4 orca-transition group hover:shadow-[0_4px_20px_-4px_rgba(223,123,98,0.12)]">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-0.5">
                {lang === 'AR' ? 'المشاريع النشطة' : 'Active Projects'}
              </p>
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-en">
                {formatNum(projectsCount)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-100 dark:border-slate-700 text-sky-500 dark:text-sky-400 group-hover:bg-sky-50 dark:group-hover:bg-sky-500/10 transition-colors shrink-0">
              <i className="ph-fill ph-buildings text-xl"></i>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-sans bg-slate-100 dark:bg-slate-800/50 w-fit px-2.5 py-1 rounded-md">
            <span>{lang === 'AR' ? 'مشاريع الرياض وجدة' : 'Riyadh & Jeddah Assets'}</span>
          </div>
        </div>

      </div>

      {/* Main Grid Content (الجداول والمهام) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        
        {/* Recent Requests (الطلبات الحديثة) */}
        <div className="orca-panel-light flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#df7b62]/10 flex items-center justify-center text-[#df7b62]">
                <i className="ph-fill ph-file-text text-xl"></i>
              </div>
              <div>
                <h2 className="text-slate-900 dark:text-white font-bold text-lg">
                  {lang === 'AR' ? 'أحدث الطلبات الاستثمارية' : 'Latest Investment Requests'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  {lang === 'AR' ? 'طلبات تم توثيقها مؤخراً وبانتظار المتابعة' : 'Recent prospects registered and awaiting response'}
                </p>
              </div>
            </div>
            <span className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap text-center">
              {lang === 'AR' ? 'حالة نشطة' : 'Active status'}
            </span>
          </div>

          <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[400px] scrollbar-fade">
            {recentLeads.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                {lang === 'AR' ? 'لا يوجد طلبات استثمارية مسجلة حالياً.' : 'No registered leads found.'}
              </div>
            ) : (
              recentLeads.map((lead) => {
                const sanitizedPhone = (lead.phone || "").replace(/\s+/g, "").replace(/\.0+$/, "");
                return (
                  <div key={lead.id} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0b1120] hover:border-[#df7b62]/40 dark:hover:border-[#df7b62]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group shadow-sm hover:shadow-md">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 group-hover:text-[#df7b62] group-hover:border-[#df7b62]/30 transition-colors shrink-0">
                        <i className="ph-fill ph-user"></i>
                      </div>
                      <div>
                        <h4 className="text-slate-900 dark:text-white font-bold text-sm mb-1 group-hover:text-[#df7b62] transition-colors">
                          {lead.firstName} {lead.lastName ?? ''}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 dark:text-slate-400 text-xs font-en bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {formatNum(sanitizedPhone.slice(0, 3))}××××{formatNum(sanitizedPhone.slice(-3))}
                          </span>
                          <span className="text-slate-400 dark:text-slate-550 text-xs font-en">
                            {formatNum(lead.createdAt.slice(0, 10))}
                          </span>
                        </div>
                      </div>
                    </div>
                    {lead.project && (
                      <div className="sm:text-left">
                        <span className="inline-flex items-center gap-1.5 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-500/20 text-xs px-3 py-1.5 rounded-full font-semibold">
                          <div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div>
                          {lead.project.name}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 text-center bg-slate-50 dark:bg-[#0b1120]/50">
            <button className="text-[#df7b62] text-sm font-semibold hover:text-[#c5654e] transition-colors inline-flex items-center gap-1">
              {lang === 'AR' ? `عرض جميع الطلبات (${formatNum(totalLeadsCount)})` : `View all requests (${formatNum(totalLeadsCount)})`} <i className="ph-bold ph-arrow-left"></i>
            </button>
          </div>
        </div>

        {/* Tasks (المهام والمتابعة) */}
        <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-[400px]">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500">
                <i className="ph-fill ph-calendar-check text-xl"></i>
              </div>
              <div>
                <h2 className="text-slate-900 dark:text-white font-bold text-lg">
                  {lang === 'AR' ? 'المهام والمتابعة الميدانية' : 'Tasks & Field Reminders'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  {lang === 'AR' ? 'جدول أعمالك لليوم' : 'Your work schedule for today'}
                </p>
              </div>
            </div>
            <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs px-3 py-1.5 rounded-full font-semibold">
              {lang === 'AR' ? `معلقة ${formatNum(pendingTasksCount)}` : `Pending ${formatNum(pendingTasksCount)}`}
            </span>
          </div>
          
          {recentTasks.length === 0 ? (
            /* Empty State (حالة عدم وجود مهام) */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-24 h-24 mb-4 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-200 dark:border-slate-700 border-dashed">
                <i className="ph ph-coffee text-4xl text-slate-400 dark:text-slate-500"></i>
              </div>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">
                {lang === 'AR' ? 'لا توجد مهام حالية' : 'No current tasks'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs leading-relaxed">
                {lang === 'AR'
                  ? 'يبدو أن جدولك فارغ ولا توجد أي مهام أو تذكيرات معلقة في الوقت الحالي. يمكنك أخذ قسط من الراحة أو إضافة مهمة جديدة.'
                  : 'It seems your schedule is empty. There are no pending tasks or reminders right now.'
                }
              </p>
              <button className="mt-6 px-6 py-2.5 bg-[#df7b62] hover:bg-[#c5654e] text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                <i className="ph-bold ph-plus"></i> {lang === 'AR' ? 'إضافة مهمة' : 'Add Task'}
              </button>
            </div>
          ) : (
            <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[400px] scrollbar-fade">
              {recentTasks.map((task) => (
                <div key={task.id} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0b1120] hover:border-[#df7b62]/40 dark:hover:border-[#df7b62]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group shadow-sm hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 group-hover:text-[#df7b62] group-hover:border-[#df7b62]/30 transition-colors shrink-0">
                      <i className="ph-fill ph-clipboard-text"></i>
                    </div>
                    <div>
                      <h4 className="text-slate-900 dark:text-white font-bold text-sm mb-1 group-hover:text-[#df7b62] transition-colors">
                        {task.title}
                      </h4>
                      {task.lead && (
                        <p className="text-slate-500 dark:text-slate-450 text-xs">
                          {lang === 'AR' ? 'العميل: ' : 'Lead: '} {task.lead.firstName} {task.lead.lastName ?? ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:text-left">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold border ${
                      task.priority === 'HIGH' 
                        ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/20' 
                        : task.priority === 'MEDIUM'
                        ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/20'
                        : 'bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-850'
                    }`}>
                      {lang === 'AR' 
                        ? (task.priority === 'HIGH' ? 'حرجة' : task.priority === 'MEDIUM' ? 'متوسطة' : 'عادية') 
                        : task.priority
                      }
                    </span>
                    <span className="text-slate-400 dark:text-slate-550 text-xs font-en font-semibold bg-slate-100 dark:bg-slate-850 px-2.5 py-1 rounded-md">
                      {formatNum(task.dueDate.slice(0, 10))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
