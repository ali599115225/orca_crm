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
    <div className={`flex flex-col gap-8 ${isDark ? 'text-[#e2e8f0]' : 'text-[#0f172a]'} animate-fadeIn`} dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      {/* Welcome Banner */}
      <div className={`p-6 rounded-2xl border transition-colors ${
        isDark 
          ? 'bg-slate-900/40 border-slate-800/80 backdrop-blur-lg' 
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
          {lang === 'AR' 
            ? `مرحباً بك في لوحة تحليلات ${tenant?.companyName || 'منصتك العقارية الكبرى'}`
            : `Welcome to ${tenant?.companyName || 'Enterprise CRM'} Analytics`
          }
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {lang === 'AR'
            ? 'نظرة شمولية وحية لأداء المبيعات، ومعدلات امتصاص المشاريع العقارية، والمهام المجدولة.'
            : 'A comprehensive, live look at sales performance, property absorption rates, and scheduled tasks.'
          }
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((m, i) => (
          <div
            key={i}
            className={`p-5 rounded-2xl border transition-all hover:scale-[1.01] flex items-center justify-between ${
              isDark ? 'bg-slate-900/30 border-slate-850 backdrop-blur-md' : 'bg-white border-slate-150 shadow-sm'
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {lang === 'AR' ? m.labelAr : m.labelEn}
              </span>
              <span className="text-2xl font-extrabold mt-1 text-slate-850 dark:text-white">
                {formatNum(m.value)}
              </span>
            </div>
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg ${m.colorClass}`}>
              {m.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Two-Column Details Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Ingested Leads */}
        <div className={`p-6 rounded-2xl border transition-colors ${
          isDark ? 'bg-slate-900/30 border-slate-800/80 backdrop-blur-lg' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4 border-b border-slate-250/20 pb-3">
            <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              <span>👥</span>
              <span>{lang === 'AR' ? 'أحدث الطلبات الاستثمارية الموثقة' : 'Latest Registered Leads'}</span>
            </h3>
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 px-2 py-0.5 rounded-full font-bold">
              {lang === 'AR' ? 'حالة نشطة' : 'Live Ingestion'}
            </span>
          </div>

          {recentLeads.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-450">
              {lang === 'AR' ? 'لا يوجد طلبات استثمارية مسجلة حالياً.' : 'No registered leads found.'}
            </div>
          ) : (
            <div className="space-y-3.5">
              {recentLeads.map((lead) => (
                <div 
                  key={lead.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    isDark ? 'bg-slate-950/40 border-slate-850 hover:bg-slate-950/65' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {lead.firstName} {lead.lastName ?? ''}
                    </span>
                    <span className="text-[10px] text-slate-450 dark:text-slate-400 font-mono">
                      {formatNum(lead.phone.slice(0, 3))}××××{formatNum(lead.phone.slice(-3))}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {lead.project && (
                      <span className="text-[9px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-450 font-bold">
                        {lead.project.name}
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400">
                      {formatNum(lead.createdAt.slice(0, 10))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Follow-ups / Tasks */}
        <div className={`p-6 rounded-2xl border transition-colors ${
          isDark ? 'bg-slate-900/30 border-slate-800/80 backdrop-blur-lg' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4 border-b border-slate-250/20 pb-3">
            <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              <span>📋</span>
              <span>{lang === 'AR' ? 'المهام ومواعيد المتابعة الميدانية' : 'Upcoming Follow-ups'}</span>
            </h3>
            <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-250/50 px-2 py-0.5 rounded-full font-bold">
              {formatNum(pendingTasksCount)} {lang === 'AR' ? 'معلقة' : 'Pending'}
            </span>
          </div>

          {recentTasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-450">
              {lang === 'AR' ? 'لا توجد مهام أو تذكيرات معلقة.' : 'No pending tasks found.'}
            </div>
          ) : (
            <div className="space-y-3.5">
              {recentTasks.map((task) => (
                <div 
                  key={task.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    isDark ? 'bg-slate-950/40 border-slate-850 hover:bg-slate-950/65' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{task.title}</span>
                    {task.lead && (
                      <span className="text-[10px] text-slate-450 dark:text-slate-400">
                        {lang === 'AR' ? 'العميل: ' : 'Lead: '} {task.lead.firstName} {task.lead.lastName ?? ''}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                      task.priority === 'HIGH' 
                        ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400' 
                        : task.priority === 'MEDIUM'
                        ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {lang === 'AR' 
                        ? (task.priority === 'HIGH' ? 'حرجة' : task.priority === 'MEDIUM' ? 'متوسطة' : 'عادية') 
                        : task.priority
                      }
                    </span>
                    <span className="text-[9px] text-slate-400">
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
