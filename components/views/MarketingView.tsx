// components/views/MarketingView.tsx
'use client';

import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { SmartCard } from '@/components/ui/SmartCard';

/**
 * MarketingView
 * الصفحة المستقلة للإعلان والتسويق — تعرض فقط منصات التسوق الإعلاني المترابطة.
 */
export default function MarketingView() {
  const platforms = [
    { name: 'Noon Real Estate',  leads: 38, spend: 9200,  status: 'مرتبط'    },
    { name: 'Bayut Arabia',      leads: 72, spend: 15800, status: 'مرتبط'    },
    { name: 'Property Finder',   leads: 54, spend: 12400, status: 'قيد الربط' },
  ];

  return (
    <div className="w-full orca-view-enter" dir="rtl">
      <div className="orca-page orca-stack p-6">

        {/* ── Page Header ────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-5 md:p-6 flex flex-col gap-2 transition-all">
          <div className="absolute top-0 right-0 w-80 h-80 bg-corporate-blue/5 dark:bg-cyan-glow/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-corporate-blue/10 dark:bg-cyan-glow/10 border border-corporate-blue/20 dark:border-cyan-glow/20 text-corporate-blue dark:text-cyan-glow text-xs font-semibold w-fit">
              <ShoppingBag size={13} />
              الإعلان والتسويق
            </div>
            <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-wide">
              منصات التسوق الإعلاني
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-xl">
              تتبع أداء المنصات العقارية المتخصصة وتكاليف الاستحواذ من كل قناة تسويق رقمي.
            </p>
          </div>
        </div>

        {/* ── Grid Platforms ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {platforms.map((p) => (
            <SmartCard key={p.name} className="p-5 flex flex-col gap-3 hover:scale-[1.02] duration-300">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{p.name}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  p.status === 'مرتبط'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                }`}>
                  {p.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white/50 dark:bg-void/50 border border-slate-200/50 dark:border-white/10 rounded-xl p-2">
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">العملاء</p>
                  <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{p.leads}</p>
                </div>
                <div className="bg-white/50 dark:bg-void/50 border border-slate-200/50 dark:border-white/10 rounded-xl p-2">
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">الإنفاق</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{p.spend.toLocaleString()} <span className="text-slate-500 dark:text-slate-400 font-medium text-[9px]">ر.س</span></p>
                </div>
              </div>
            </SmartCard>
          ))}
        </div>

      </div>
    </div>
  );
}
