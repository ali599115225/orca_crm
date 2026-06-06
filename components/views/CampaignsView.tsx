// components/views/CampaignsView.tsx
'use client';

import React from 'react';
import { Megaphone, TrendingUp, Users, DollarSign } from 'lucide-react';
import { SmartCard } from '@/components/ui/SmartCard';

export default function CampaignsView() {
  const campaigns = [
    { id: 'C-001', name: 'حملة صيف 2026 — شقق الرياض',  platform: 'Meta Ads',      budget: 25000, leads: 142, cac: 176,  status: 'نشطة'    },
    { id: 'C-002', name: 'فلل الدرعية — قوقل دسبلاي',   platform: 'Google Ads',    budget: 18000, leads:  89, cac: 202,  status: 'نشطة'    },
    { id: 'C-003', name: 'إعلان سناب — مشروع الواجهة',   platform: 'Snapchat Ads',  budget: 12000, leads:  61, cac: 196,  status: 'متوقفة'  },
    { id: 'C-004', name: 'تيك توك — شقق مفروشة الخبر',   platform: 'TikTok Ads',   budget:  8500, leads:  44, cac: 193,  status: 'مسودة'   },
  ];

  const statusColor: Record<string, string> = {
    'نشطة':   'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/25',
    'متوقفة': 'bg-amber-500/15   text-amber-600   dark:text-amber-400   border-amber-500/25',
    'مسودة':  'bg-slate-200 dark:bg-slate-700/50 text-slate-650 dark:text-slate-350 border-slate-300 dark:border-slate-650',
  };

  return (
    <div className="w-full orca-view-enter" dir="rtl">
      <div className="orca-page orca-stack p-6">
        
        {/* ── Page Header ────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-5 md:p-6 flex flex-col gap-2 transition-all">
          <div className="absolute top-0 right-0 w-80 h-80 bg-corporate-blue/5 dark:bg-cyan-glow/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-corporate-blue/10 dark:bg-cyan-glow/10 border border-corporate-blue/20 dark:border-cyan-glow/20 text-corporate-blue dark:text-cyan-glow text-xs font-semibold w-fit">
              <Megaphone size={13} />
              الحملات الإعلانية
            </div>
            <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-wide">
              مركز إدارة الحملات
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-xl">
              تتبع أداء الحملات التسويقية النشطة، ومعدلات التحويل وحجم الاستحواذ الاستثماري.
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'إجمالي الميزانية',   value: '63,500 ر.س', color: 'text-slate-900 dark:text-white', icon: DollarSign },
            { label: 'إجمالي العملاء',     value: '336',         color: 'text-indigo-600 dark:text-indigo-400', icon: Users },
            { label: 'متوسط CAC',          value: '189 ر.س',    color: 'text-amber-600 dark:text-amber-400', icon: TrendingUp },
            { label: 'حملات نشطة',         value: '2',           color: 'text-emerald-600 dark:text-emerald-450', icon: Megaphone },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <SmartCard key={kpi.label} className="p-4 flex items-center justify-between hover:scale-[1.02] duration-300">
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">{kpi.label}</p>
                  <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-200/50 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400">
                  <Icon size={16} />
                </div>
              </SmartCard>
            );
          })}
        </div>

        {/* Table */}
        <SmartCard className="overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200/50 dark:border-white/10 flex items-center gap-2">
            <Megaphone size={15} className="text-corporate-blue dark:text-cyan-glow" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">تفاصيل الحملات الإعلانية</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200/50 dark:border-white/10 text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-void/50">
                  <th className="py-2.5 px-4 font-bold text-right">الحملة</th>
                  <th className="py-2.5 px-3 font-bold">المنصة</th>
                  <th className="py-2.5 px-3 font-bold">الميزانية</th>
                  <th className="py-2.5 px-3 font-bold">العملاء</th>
                  <th className="py-2.5 px-3 font-bold">CAC</th>
                  <th className="py-2.5 px-3 font-bold">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-white/10">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{c.id}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium font-semibold">{c.platform}</td>
                    <td className="py-3 px-3 text-slate-900 dark:text-white font-bold font-en">{c.budget.toLocaleString()} <span className="text-slate-500 dark:text-slate-400 font-medium text-[10px]">ر.س</span></td>
                    <td className="py-3 px-3 text-indigo-600 dark:text-indigo-400 font-bold font-en">{c.leads}</td>
                    <td className="py-3 px-3 text-amber-600 dark:text-amber-450 font-bold font-en">{c.cac} <span className="text-slate-500 dark:text-slate-400 font-medium text-[10px]">ر.س</span></td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusColor[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SmartCard>

      </div>
    </div>
  );
}
