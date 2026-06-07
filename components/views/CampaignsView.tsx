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
    <div className="w-full" dir="rtl">
      <div className="nc-page nc-stack p-6">
        
        {/* ── Page Header ── */}
        <div className="nc-section">
          <div className="nc-section-header">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] text-[var(--nc-accent)] text-xs font-semibold w-fit">
              <Megaphone size={13} />
              الحملات الإعلانية
            </div>
            <h1 className="nc-title">مركز إدارة الحملات</h1>
            <p className="nc-subtitle">تتبع أداء الحملات التسويقية النشطة، ومعدلات التحويل وحجم الاستحواذ الاستثماري.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="nc-grid nc-grid-4">
          {[
            { label: 'إجمالي الميزانية',   value: '63,500 ر.س', color: 'text-[var(--nc-text-primary)]', icon: DollarSign },
            { label: 'إجمالي العملاء',     value: '336',         color: 'text-[var(--nc-accent)]', icon: Users },
            { label: 'متوسط CAC',          value: '189 ر.س',    color: 'text-[var(--nc-warning)]', icon: TrendingUp },
            { label: 'حملات نشطة',         value: '2',           color: 'text-[var(--nc-success)]', icon: Megaphone },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <SmartCard key={kpi.label} className="p-4 flex items-center justify-between hover:scale-[1.02] duration-300">
                <div>
                  <p className="text-[10px] text-[var(--nc-text-dim)] font-bold mb-1">{kpi.label}</p>
                  <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[var(--nc-accent-soft)] flex items-center justify-center text-[var(--nc-text-dim)]">
                  <Icon size={16} />
                </div>
              </SmartCard>
            );
          })}
        </div>

        {/* Table */}
        <SmartCard className="overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--nc-glass-border)] flex items-center gap-2">
            <Megaphone size={15} className="text-[var(--nc-accent)]" />
            <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">تفاصيل الحملات الإعلانية</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[var(--nc-glass-border)] text-[var(--nc-text-dim)] font-medium bg-[var(--nc-accent-soft)]">
                  <th className="py-2.5 px-4 font-bold text-right">الحملة</th>
                  <th className="py-2.5 px-3 font-bold">المنصة</th>
                  <th className="py-2.5 px-3 font-bold">الميزانية</th>
                  <th className="py-2.5 px-3 font-bold">العملاء</th>
                  <th className="py-2.5 px-3 font-bold">CAC</th>
                  <th className="py-2.5 px-3 font-bold">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--nc-glass-border)]">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--nc-accent-soft)] transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-[var(--nc-text-primary)]">{c.name}</p>
                      <p className="text-[10px] text-[var(--nc-text-dim)] font-medium">{c.id}</p>
                    </td>
                    <td className="py-3 px-3 text-[var(--nc-text-secondary)] font-semibold">{c.platform}</td>
                    <td className="py-3 px-3 text-[var(--nc-text-primary)] font-bold">{c.budget.toLocaleString()} <span className="text-[var(--nc-text-dim)] text-[10px]">ر.س</span></td>
                    <td className="py-3 px-3 text-[var(--nc-accent)] font-bold">{c.leads}</td>
                    <td className="py-3 px-3 text-[var(--nc-warning)] font-bold">{c.cac} <span className="text-[var(--nc-text-dim)] text-[10px]">ر.س</span></td>
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
