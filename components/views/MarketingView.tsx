// components/views/MarketingView.tsx
'use client';

import React, { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Megaphone, ShoppingBag, ChevronLeft } from 'lucide-react';

type MarketingTab = 'campaigns' | 'shopping';

const TABS: { id: MarketingTab; label: string; icon: React.ElementType; desc: string }[] = [
  {
    id: 'campaigns',
    label: 'الحملات',
    icon: Megaphone,
    desc: 'إدارة الإعلان والتسويق وتحليلات ROI',
  },
  {
    id: 'shopping',
    label: 'التسوق',
    icon: ShoppingBag,
    desc: 'منصات التسوق الإعلاني والعروض الترويجية',
  },
];

/**
 * MarketingView
 * الصفحة المدمجة للإعلان والتسويق — تحتوي تبويبين:
 *   - الحملات  → /operations/marketing
 *   - التسوق    → /operations/marketing?tab=shopping
 */
export default function MarketingView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab') as MarketingTab | null;
  const activeTab: MarketingTab = tabParam && ['campaigns', 'shopping'].includes(tabParam)
    ? tabParam
    : 'campaigns';

  const setTab = (tab: MarketingTab) => {
    if (tab === 'campaigns') {
      router.push('/operations/marketing');
    } else {
      router.push(`/operations/marketing?tab=${tab}`);
    }
  };

  return (
    <div className="w-full orca-view-enter" dir="rtl">
      <div className="orca-page orca-stack">

        {/* ── Page Header ────────────────────────────────────────────────── */}
        <div className="orca-hero bg-gradient-to-r from-slate-900 via-[#151f32] to-slate-900 p-5 md:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#8EB1D1]/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8EB1D1]/10 border border-[#8EB1D1]/20 text-[#8EB1D1] text-xs font-semibold w-fit">
              <Megaphone size={13} />
              الإعلان والتسويق
            </div>
            <h1 className="text-xl md:text-3xl font-black text-white tracking-wide">
              مركز الإعلان والتسويق
            </h1>
            <p className="text-xs md:text-sm text-[#C4D8E5] font-medium font-medium max-w-xl">
              إدارة الإعلان والتسويق، ومنصات التسوق الإعلاني — في مكان واحد.
            </p>
          </div>
        </div>

        {/* ── Subtab Navigation ──────────────────────────────────────────── */}
        <div className="flex gap-2 flex-wrap px-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={[
                  'group flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer',
                  isActive
                    ? 'bg-[#8EB1D1]/15 text-[#8EB1D1] border-[#8EB1D1]/30'
                    : 'text-[#C4D8E5] font-medium border-[#A7C7E7]/20 hover:text-slate-200 hover:bg-[#1C2B48]/40 hover:border-slate-700',
                ].join(' ')}
                title={tab.desc}
              >
                <Icon
                  size={15}
                  className={isActive ? 'text-[#8EB1D1]' : 'text-[#C4D8E5] font-medium group-hover:text-[#C4D8E5] font-medium'}
                />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ────────────────────────────────────────────────── */}

        {activeTab === 'campaigns' && <CampaignsTab />}
        {activeTab === 'shopping' && <ShoppingTab />}

      </div>
    </div>
  );
}

/* ─── Campaigns Tab ─────────────────────────────────────────────────────────── */
function CampaignsTab() {
  const campaigns = [
    { id: 'C-001', name: 'حملة صيف 2026 — شقق الرياض',  platform: 'Meta Ads',      budget: 25000, leads: 142, cac: 176,  status: 'نشطة'    },
    { id: 'C-002', name: 'فلل الدرعية — قوقل دسبلاي',   platform: 'Google Ads',    budget: 18000, leads:  89, cac: 202,  status: 'نشطة'    },
    { id: 'C-003', name: 'إعلان سناب — مشروع الواجهة',   platform: 'Snapchat Ads',  budget: 12000, leads:  61, cac: 196,  status: 'متوقفة'  },
    { id: 'C-004', name: 'تيك توك — شقق مفروشة الخبر',   platform: 'TikTok Ads',   budget:  8500, leads:  44, cac: 193,  status: 'مسودة'   },
  ];

  const statusColor: Record<string, string> = {
    'نشطة':   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    'متوقفة': 'bg-amber-500/15   text-amber-400   border-amber-500/25',
    'مسودة':  'bg-slate-700/50   text-[#C4D8E5] font-medium   border-slate-600/40',
  };

  return (
    <div className="orca-stack">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الميزانية',   value: '63,500 ر.س', color: 'text-white'          },
          { label: 'إجمالي العملاء',     value: '336',         color: 'text-indigo-400'     },
          { label: 'متوسط CAC',          value: '189 ر.س',    color: 'text-amber-400'      },
          { label: 'حملات نشطة',         value: '2',           color: 'text-emerald-400'    },
        ].map((kpi) => (
          <div key={kpi.label} className="orca-panel p-4">
            <p className="text-[10px] text-[#C4D8E5] font-medium font-bold mb-1">{kpi.label}</p>
            <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="orca-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-[#A7C7E7]/20 flex items-center gap-2">
          <Megaphone size={15} className="text-[#8EB1D1]" />
          <h3 className="text-sm font-bold text-white">الإعلان والتسويق</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-[#A7C7E7]/20 text-[#C4D8E5] font-medium">
                <th className="py-2.5 px-4 font-bold text-right">الحملة</th>
                <th className="py-2.5 px-3 font-bold">المنصة</th>
                <th className="py-2.5 px-3 font-bold">الميزانية</th>
                <th className="py-2.5 px-3 font-bold">العملاء</th>
                <th className="py-2.5 px-3 font-bold">CAC</th>
                <th className="py-2.5 px-3 font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-[#1C2B48]/20 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-white">{c.name}</p>
                    <p className="text-[10px] text-[#C4D8E5] font-medium">{c.id}</p>
                  </td>
                  <td className="py-3 px-3 text-[#C4D8E5] font-medium font-semibold">{c.platform}</td>
                  <td className="py-3 px-3 text-white font-bold font-en">{c.budget.toLocaleString()} <span className="text-[#C4D8E5] font-medium text-[10px]">ر.س</span></td>
                  <td className="py-3 px-3 text-indigo-400 font-bold font-en">{c.leads}</td>
                  <td className="py-3 px-3 text-amber-400 font-bold font-en">{c.cac} <span className="text-[#C4D8E5] font-medium text-[10px]">ر.س</span></td>
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
      </div>
    </div>
  );
}

/* ─── Shopping Tab (placeholder / expandable) ────────────────────────────────── */
function ShoppingTab() {
  const platforms = [
    { name: 'Noon Real Estate',  leads: 38, spend: 9200,  status: 'مرتبط'    },
    { name: 'Bayut Arabia',      leads: 72, spend: 15800, status: 'مرتبط'    },
    { name: 'Property Finder',   leads: 54, spend: 12400, status: 'قيد الربط' },
  ];

  return (
    <div className="orca-stack">
      <div className="orca-hero bg-gradient-to-br from-indigo-500/5 to-[#8EB1D1]/5 border border-[#A7C7E7]/20 rounded-2xl p-5 flex items-start gap-4">
        <ShoppingBag size={28} className="text-[#8EB1D1] shrink-0 mt-0.5" />
        <div>
          <h2 className="text-base font-black text-white mb-1">منصات التسوق الإعلاني</h2>
          <p className="text-xs text-[#C4D8E5] font-medium leading-relaxed">
            تتبع أداء المنصات العقارية المتخصصة وتكاليف الاستحواذ من كل قناة تسويق رقمي.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {platforms.map((p) => (
          <div key={p.name} className="orca-panel p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{p.name}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                p.status === 'مرتبط'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {p.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-[#1C2B48]/40 rounded-xl p-2">
                <p className="text-[9px] text-[#C4D8E5] font-medium font-bold">العملاء</p>
                <p className="text-lg font-black text-indigo-400">{p.leads}</p>
              </div>
              <div className="bg-[#1C2B48]/40 rounded-xl p-2">
                <p className="text-[9px] text-[#C4D8E5] font-medium font-bold">الإنفاق</p>
                <p className="text-sm font-black text-white">{p.spend.toLocaleString()} <span className="text-[#C4D8E5] font-medium text-[9px]">ر.س</span></p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
