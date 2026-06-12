// components/views/CampaignsView.tsx
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { SmartCard } from '@/components/ui/SmartCard';
import { KpiCard } from '@/components/ui/KpiCard';
import { useApp } from '@/app/context/AppContext';

/* ─── Types ─────────────────────────────────────────────────── */
export interface Campaign {
  id: string;
  name: string;
  nameEn: string;
  platform: string;
  platformUrl: string;
  platformColor: string;
  platformBg: string;
  platformEmoji: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  revenue: number;
  status: 'نشطة' | 'متوقفة' | 'مسودة';
  statusEn: 'Active' | 'Paused' | 'Draft';
}

/* ─── Mock Data ─────────────────────────────────────────────── */
export const RAW_CAMPAIGNS: Campaign[] = [
  {
    id: 'C-001', name: 'حملة صيف 2026 — شقق الرياض', nameEn: 'Summer 2026 — Riyadh Apartments',
    platform: 'Meta Ads', platformUrl: 'https://www.facebook.com/adsmanager',
    platformColor: 'text-blue-500', platformBg: 'bg-blue-500/10 border-blue-500/20',
    platformEmoji: '📘',
    budget: 25000, spend: 22400, impressions: 520000, clicks: 15600, leads: 142, revenue: 890000,
    status: 'نشطة', statusEn: 'Active',
  },
  {
    id: 'C-002', name: 'فلل الدرعية — قوقل دسبلاي', nameEn: 'Ad-Diriyah Villas — Google Display',
    platform: 'Google Ads', platformUrl: 'https://ads.google.com',
    platformColor: 'text-rose-500', platformBg: 'bg-rose-500/10 border-rose-500/20',
    platformEmoji: '🔴',
    budget: 18000, spend: 17200, impressions: 380000, clicks: 9500, leads: 89, revenue: 630000,
    status: 'نشطة', statusEn: 'Active',
  },
  {
    id: 'C-003', name: 'إعلان سناب — مشروع الواجهة', nameEn: 'Snapchat — Waterfront Project',
    platform: 'Snapchat Ads', platformUrl: 'https://ads.snapchat.com',
    platformColor: 'text-yellow-500', platformBg: 'bg-yellow-500/10 border-yellow-500/20',
    platformEmoji: '👻',
    budget: 12000, spend: 11800, impressions: 210000, clicks: 4200, leads: 61, revenue: 310000,
    status: 'متوقفة', statusEn: 'Paused',
  },
  {
    id: 'C-004', name: 'تيك توك — شقق مفروشة الخبر', nameEn: 'TikTok — Furnished Apartments',
    platform: 'TikTok Ads', platformUrl: 'https://ads.tiktok.com',
    platformColor: 'text-pink-500', platformBg: 'bg-pink-500/10 border-pink-500/20',
    platformEmoji: '🎵',
    budget: 8500, spend: 7600, impressions: 175000, clicks: 5250, leads: 44, revenue: 180000,
    status: 'مسودة', statusEn: 'Draft',
  },
];

const T = {
  AR: {
    title: 'مركز إدارة الحملات الإعلانية',
    desc: 'تحليل متقدم للأداء التسويقي — مؤشرات CTR وROAS والتحويل مع توصيات ذكية آنية.',
    totalBudget: 'إجمالي الميزانية', totalLeads: 'إجمالي العملاء',
    totalSpend: 'إجمالي الإنفاق', avgCTR: 'متوسط CTR',
    avgCVR: 'معدل التحويل', avgROAS: 'متوسط ROAS',
    avgCPL: 'تكلفة العميل', activeCampaigns: 'حملات نشطة',
    campaignDetails: 'تفاصيل الحملات', platformInsights: 'تحليل أداء المنصات',
    aiRecommendations: 'توصيات ذكية لتحسين الأداء',
    platform: 'المنصة', cac: 'التكلفة/عميل', leads: 'العملاء',
    spend: 'الإنفاق', relativePerf: 'الأداء النسبي',
    campaign: 'الحملة', budget: 'الميزانية', impressions: 'الظهور',
    clicks: 'النقرات', ctr: 'CTR', cvr: 'CVR', roas: 'ROAS', cpl: 'CPL',
    status: 'الحالة', actions: 'الإجراءات', openPlatform: 'فتح المنصة',
    active: 'نشطة', paused: 'متوقفة', draft: 'مسودة',
    reduceBudget: 'خفض الميزانية',
    improveContent: 'تحسين المحتوى والاستهداف',
    increaseBudget: 'زيادة الميزانية للاستفادة',
    highCAC: 'تكلفة العميل أعلى من المتوسط بـ +20%',
    lowCVR: 'معدل التحويل منخفض — يحتاج تحسين',
    highROAS: 'عائد مرتفع — يمكن الاستثمار أكثر',
    currency: 'ر.س', unit: 'ألف',
    noRec: 'أداء متوازن — لا توصيات حالياً',
    excellent: 'ممتاز', good: 'جيد', fair: 'مقبول', poor: 'ضعيف',
  },
  EN: {
    title: 'Campaign Management Center',
    desc: 'Advanced marketing performance analysis — CTR, ROAS, Conversion metrics with live AI recommendations.',
    totalBudget: 'Total Budget', totalLeads: 'Total Leads',
    totalSpend: 'Total Spend', avgCTR: 'Avg CTR',
    avgCVR: 'Conversion Rate', avgROAS: 'Avg ROAS',
    avgCPL: 'Cost per Lead', activeCampaigns: 'Active Campaigns',
    campaignDetails: 'Campaign Details', platformInsights: 'Platform Performance Insights',
    aiRecommendations: 'AI-Powered Performance Recommendations',
    platform: 'Platform', cac: 'CAC', leads: 'Leads',
    spend: 'Spend', relativePerf: 'Relative Performance',
    campaign: 'Campaign', budget: 'Budget', impressions: 'Impressions',
    clicks: 'Clicks', ctr: 'CTR', cvr: 'CVR', roas: 'ROAS', cpl: 'CPL',
    status: 'Status', actions: 'Actions', openPlatform: 'Open Platform',
    active: 'Active', paused: 'Paused', draft: 'Draft',
    reduceBudget: 'Reduce Budget',
    improveContent: 'Improve Content & Targeting',
    increaseBudget: 'Scale Budget for Higher Returns',
    highCAC: 'CAC is >20% above average',
    lowCVR: 'Low conversion rate — needs improvement',
    highROAS: 'High ROAS — good scaling opportunity',
    currency: 'SAR', unit: 'K',
    noRec: 'Balanced performance — no recommendations',
    excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor',
  },
};

/* ─── Helpers ───────────────────────────────────────────────── */
const pct = (n: number, d: number) => d > 0 ? ((n / d) * 100) : 0;
const fmt = (n: number, dec = 1) => n.toFixed(dec);
const fmtK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

type RecType = 'reduce' | 'improve' | 'scale';
interface Recommendation {
  campaignId: string;
  campaignName: string;
  type: RecType;
  reason: string;
  action: string;
  metric: string;
}

export default function CampaignsView({
  embedded = false,
  campaignsState,
  platformFilterState,
  setPlatformFilterState,
}: {
  embedded?: boolean;
  campaignsState?: Campaign[];
  platformFilterState?: string | null;
  setPlatformFilterState?: (p: string | null) => void;
}) {
  const { lang } = useApp();
  const t = T[lang] || T.AR;
  const isArabic = lang === 'AR';
  const dir = isArabic ? 'rtl' : 'ltr';

  const searchParams = useSearchParams();
  const urlPlatform = searchParams.get('platform');

  const [usingFallback, setUsingFallback] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'paused' | 'draft'>('all');
  const [localPlatformFilter, setLocalPlatformFilter] = useState<string | null>(urlPlatform);

  const platformFilter = platformFilterState !== undefined ? platformFilterState : localPlatformFilter;
  const setPlatformFilter = setPlatformFilterState !== undefined ? setPlatformFilterState : setLocalPlatformFilter;

  // detect if using mock data
  useEffect(() => {
    if (!campaignsState) setUsingFallback(true);
  }, [campaignsState]);

  // sync URL param if it changes
  useEffect(() => { 
    if (platformFilterState === undefined) {
      setLocalPlatformFilter(searchParams.get('platform')); 
    }
  }, [searchParams, platformFilterState]);

  /* ── Computed Metrics per Campaign ──────────────────────── */
  const activeCampaignsList = campaignsState || RAW_CAMPAIGNS;
  const campaigns = useMemo(() => activeCampaignsList.map(c => ({
    ...c,
    ctr:  pct(c.clicks, c.impressions),
    cvr:  pct(c.leads, c.clicks),
    roas: c.spend > 0 ? c.revenue / c.spend : 0,
    cpl:  c.leads > 0 ? c.spend / c.leads   : 0,
  })), [activeCampaignsList]);

  /* ── Aggregate KPIs ─────────────────────────────────────── */
  const totalBudget   = campaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpend    = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalLeads    = campaigns.reduce((s, c) => s + c.leads, 0);
  const totalImps     = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks   = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalRevenue  = campaigns.reduce((s, c) => s + c.revenue, 0);
  const avgCTR        = pct(totalClicks, totalImps);
  const avgCVR        = pct(totalLeads, totalClicks);
  const avgROAS       = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const avgCPL        = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const avgCAC        = avgCPL;
  const activeCampaigns = campaigns.filter(c => c.status === 'نشطة').length;

  /* ── AI Recommendations ─────────────────────────────────── */
  const recommendations: Recommendation[] = useMemo(() => {
    const recs: Recommendation[] = [];
    campaigns.forEach(c => {
      if (c.cpl > avgCAC * 1.2) {
        recs.push({
          campaignId: c.id, campaignName: c.name,
          type: 'reduce',
          reason: t.highCAC,
          action: t.reduceBudget,
          metric: `CPL: ${fmt(c.cpl)} ${t.currency} (avg: ${fmt(avgCAC)} ${t.currency})`,
        });
      }
      if (c.cvr < 1.5 && c.status === 'نشطة') {
        recs.push({
          campaignId: c.id + '_cvr', campaignName: c.name,
          type: 'improve',
          reason: t.lowCVR,
          action: t.improveContent,
          metric: `CVR: ${fmt(c.cvr)}% (target: >1.5%)`,
        });
      }
      if (c.roas > 30) {
        recs.push({
          campaignId: c.id + '_roas', campaignName: c.name,
          type: 'scale',
          reason: t.highROAS,
          action: t.increaseBudget,
          metric: `ROAS: ${fmt(c.roas, 1)}x`,
        });
      }
    });
    return recs;
  }, [campaigns, avgCAC, t]);

  /* ── Platform Insights ──────────────────────────────────── */
  const platformInsights = useMemo(() => {
    const map: Record<string, { platform: string; platformBg: string; platformEmoji: string; leads: number; spend: number; revenue: number }> = {};
    campaigns.forEach(c => {
      if (!map[c.platform]) {
        map[c.platform] = { platform: c.platform, platformBg: c.platformBg, platformEmoji: c.platformEmoji, leads: 0, spend: 0, revenue: 0 };
      }
      map[c.platform].leads   += c.leads;
      map[c.platform].spend   += c.spend;
      map[c.platform].revenue += c.revenue;
    });
    return Object.values(map).map(p => ({
      ...p,
      cac:  p.leads > 0 ? p.spend / p.leads   : 0,
      roas: p.spend > 0 ? p.revenue / p.spend : 0,
      score: Math.min(100, Math.round(
        (p.leads > 0 ? Math.min(40, (avgCPL / (p.spend / p.leads)) * 40) : 0) +
        (p.spend > 0 ? Math.min(60, ((p.revenue / p.spend) / avgROAS) * 60) : 0)
      )),
    })).sort((a, b) => b.score - a.score);
  }, [campaigns, avgCAC, avgROAS]);

  /* ── Filtered Campaigns ─────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = campaigns;
    if (platformFilter) list = list.filter(c => c.platform === platformFilter);
    if (activeTab === 'all') return list;
    const map = { active: 'نشطة', paused: 'متوقفة', draft: 'مسودة' };
    return list.filter(c => c.status === map[activeTab]);
  }, [campaigns, activeTab, platformFilter]);

  /* ── Status Badge ───────────────────────────────────────── */
  const statusBadge = (status: string) => {
    if (status === 'نشطة') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (status === 'متوقفة') return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] border-[var(--nc-border)]';
  };

  const statusLabel = (status: string) => {
    if (status === 'نشطة') return isArabic ? t.active : 'Active';
    if (status === 'متوقفة') return isArabic ? t.paused : 'Paused';
    return isArabic ? t.draft : 'Draft';
  };

  const scoreLabel = (score: number) => {
    if (score >= 80) return { label: t.excellent, cls: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 60) return { label: t.good,      cls: 'text-blue-500 bg-blue-500/10 border-blue-500/20'         };
    if (score >= 40) return { label: t.fair,      cls: 'text-amber-500 bg-amber-500/10 border-amber-500/20'      };
    return              { label: t.poor,     cls: 'text-rose-500 bg-rose-500/10 border-rose-500/20'         };
  };

  const recIcon = (type: RecType) => {
    if (type === 'reduce') return { icon: 'ph-trend-down', cls: 'bg-rose-500/10 border-rose-500/20 text-rose-500'  };
    if (type === 'scale')  return { icon: 'ph-trend-up',   cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' };
    return                        { icon: 'ph-lightbulb',  cls: 'bg-amber-500/10 border-amber-500/20 text-amber-500'   };
  };

  return (
    <div className={embedded ? "space-y-5" : "space-y-5 p-6"} dir={dir}>

      {/* ── Page Header ─────────────────────────────────────── */}
      {!embedded && (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              {t.title}
              {usingFallback && (
                <span className="mr-2 align-middle inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-bold">
                  <i className="ph-bold ph-warning-circle"></i>
                  {isArabic ? 'بيانات تجريبية' : 'Demo data'}
                </span>
              )}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5 font-medium">{t.desc}</p>
          </div>
        </div>
      )}

      {/* ── Demo Data Warning Banner ──────────────────────── */}
      {usingFallback && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs font-bold">
          <i className="ph-bold ph-warning text-base"></i>
          <span>{isArabic ? '⚠️ هذه بيانات توضيحية (Demo) — لم يتم ربطها بقاعدة البيانات بعد' : '⚠️ This is demo data — not connected to database'}</span>
        </div>
      )}

      {/* ── Platform Filter Banner ───────────────────────────── */}
      {platformFilter && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] rounded-xl">
          <i className="ph-bold ph-funnel text-[var(--nc-accent)]"></i>
          <span className="text-xs font-bold text-[var(--nc-foreground)]">
            {isArabic ? `فلترة: حملات منصة` : 'Filtered by platform:'}{' '}
            <span className="text-[var(--nc-accent)]">{platformFilter}</span>
          </span>
          <button
            onClick={() => setPlatformFilter(null)}
            className="mr-auto text-[10px] font-bold text-[var(--nc-foreground-muted)] hover:text-rose-500 flex items-center gap-1 transition-colors"
          >
            <i className="ph ph-x-circle text-sm"></i>
            {isArabic ? 'إلغاء الفلتر' : 'Clear filter'}
          </button>
        </div>
      )}

      {/* ── KPI Cards Row 1 ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label={t.totalBudget} value={`${(totalBudget/1000).toFixed(0)}K ${t.currency}`} color="accent" />
        <KpiCard label={t.totalSpend} value={`${(totalSpend/1000).toFixed(1)}K ${t.currency}`} color="info" />
        <KpiCard label={t.totalLeads} value={`${totalLeads}`} color="success" />
        <KpiCard label={t.activeCampaigns} value={`${activeCampaigns}`} color="warning" />
      </div>

      {/* ── KPI Cards Row 2: Calculated Metrics ─────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label={t.avgCTR} value={`${fmt(avgCTR)}%`} color="info" />
        <KpiCard label={t.avgCVR} value={`${fmt(avgCVR)}%`} color="default" />
        <KpiCard label={t.avgROAS} value={`${fmt(avgROAS, 1)}×`} color="success" />
        <KpiCard label={t.avgCPL} value={`${fmt(avgCPL, 0)} ${t.currency}`} color="warning" />
      </div>

      {/* ── Main Grid: Table + Platform Insights ────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">

        {/* Campaign Table */}
        <SmartCard className="overflow-hidden">
          {/* Table Header */}
          <div className="px-5 py-3.5 border-b border-[var(--nc-border)] flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <i className="ph-bold ph-megaphone text-[var(--nc-accent)] text-base"></i>
              <h3 className="text-sm font-extrabold text-[var(--nc-foreground)]">{t.campaignDetails}</h3>
            </div>
            {/* Filter tabs */}
            <div className="flex gap-1">
              {[
                { key: 'all',    label: isArabic ? 'الكل' : 'All',    count: campaigns.length },
                { key: 'active', label: isArabic ? 'نشطة' : 'Active', count: campaigns.filter(c=>c.status==='نشطة').length },
                { key: 'paused', label: isArabic ? 'متوقفة' : 'Paused',count: campaigns.filter(c=>c.status==='متوقفة').length },
                { key: 'draft',  label: isArabic ? 'مسودة' : 'Draft', count: campaigns.filter(c=>c.status==='مسودة').length },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    activeTab === tab.key
                      ? 'bg-[var(--nc-accent)] text-white'
                      : 'text-[var(--nc-foreground-muted)] hover:bg-[var(--nc-surface)]'
                  }`}
                >
                  {tab.label} <span className="opacity-70">({tab.count})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="nc-table text-xs" dir={dir}>
              <thead>
                <tr>
                  <th className="text-right whitespace-nowrap">{t.campaign}</th>
                  <th className="whitespace-nowrap">{t.spend}</th>
                  <th className="whitespace-nowrap">{t.leads}</th>
                  <th className="whitespace-nowrap">{t.ctr}</th>
                  <th className="whitespace-nowrap">{t.cvr}</th>
                  <th className="whitespace-nowrap">{t.roas}</th>
                  <th className="whitespace-nowrap">{t.cpl}</th>
                  <th className="whitespace-nowrap">{t.status}</th>
                  <th className="whitespace-nowrap">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="nc-hover-glow group">
                    {/* Campaign Name + Platform */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg border text-sm flex items-center justify-center shrink-0 ${c.platformBg}`}>
                          {c.platformEmoji}
                        </span>
                        <div>
                          <p className="font-bold text-[var(--nc-foreground)] leading-tight">{isArabic ? c.name : c.nameEn}</p>
                          <p className="text-[9px] text-[var(--nc-foreground-muted)] font-en mt-0.5">{c.id} · {c.platform}</p>
                        </div>
                      </div>
                    </td>
                    {/* Spend */}
                    <td className="py-3 px-3 font-bold text-[var(--nc-foreground)] whitespace-nowrap">
                      {c.spend.toLocaleString()} <span className="text-[9px] text-[var(--nc-foreground-muted)]">{t.currency}</span>
                    </td>
                    {/* Leads */}
                    <td className="py-3 px-3 font-black text-[var(--nc-accent)] text-center">{c.leads}</td>
                    {/* CTR */}
                    <td className="py-3 px-3 font-bold text-blue-500 whitespace-nowrap">
                      {fmt(c.ctr)}%
                      <div className="w-12 h-1 bg-[var(--nc-border)] rounded-full mt-1">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, c.ctr * 20)}%` }}></div>
                      </div>
                    </td>
                    {/* CVR */}
                    <td className="py-3 px-3 font-bold text-purple-500 whitespace-nowrap">
                      {fmt(c.cvr)}%
                      <div className="w-12 h-1 bg-[var(--nc-border)] rounded-full mt-1">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, c.cvr * 15)}%` }}></div>
                      </div>
                    </td>
                    {/* ROAS */}
                    <td className="py-3 px-3 font-bold text-emerald-500 whitespace-nowrap">{fmt(c.roas, 1)}×</td>
                    {/* CPL */}
                    <td className="py-3 px-3 font-bold text-amber-500 whitespace-nowrap">
                      {fmt(c.cpl, 0)} <span className="text-[9px] text-[var(--nc-foreground-muted)]">{t.currency}</span>
                    </td>
                    {/* Status */}
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(c.status)}`}>
                        {statusLabel(c.status)}
                      </span>
                    </td>
                    {/* Platform Link */}
                    <td className="py-3 px-3">
                      <a
                        href={c.platformUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all hover:scale-[1.05] ${c.platformBg} ${c.platformColor}`}
                        title={t.openPlatform}
                      >
                        <i className="ph-bold ph-arrow-square-out text-sm"></i>
                        {t.openPlatform}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SmartCard>

        {/* Platform Insights */}
        <SmartCard className="p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--nc-border)] pb-3">
            <i className="ph-bold ph-chart-bar text-[var(--nc-accent)] text-base"></i>
            <h3 className="text-sm font-extrabold text-[var(--nc-foreground)]">{t.platformInsights}</h3>
          </div>

          <div className="space-y-3">
            {platformInsights.map((p, i) => {
              const sc = scoreLabel(p.score);
              return (
                <div key={p.platform} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-lg border text-xs flex items-center justify-center ${p.platformBg}`}>
                        {p.platformEmoji}
                      </span>
                      <span className="text-xs font-bold text-[var(--nc-foreground)]">{p.platform}</span>
                    </div>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${sc.cls}`}>
                      {sc.label}
                    </span>
                  </div>
                  {/* Score Bar */}
                  <div className="h-1.5 bg-[var(--nc-border)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${p.score}%`,
                        background: p.score >= 80 ? '#22c55e' : p.score >= 60 ? '#3b82f6' : p.score >= 40 ? '#f59e0b' : '#ef4444',
                      }}
                    ></div>
                  </div>
                  {/* Stats row */}
                  <div className="flex justify-between text-[9px] text-[var(--nc-foreground-muted)] font-en">
                    <span>{t.leads}: <strong className="text-[var(--nc-foreground)]">{p.leads}</strong></span>
                    <span>CAC: <strong className="text-amber-500">{fmt(p.cac, 0)}{t.currency}</strong></span>
                    <span>ROAS: <strong className="text-emerald-500">{fmt(p.roas, 1)}×</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </SmartCard>
      </div>

      {/* ── AI Recommendations ──────────────────────────────── */}
      <SmartCard className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--nc-border)] pb-3">
          <i className="ph-bold ph-robot text-[var(--nc-accent)] text-base"></i>
          <h3 className="text-sm font-extrabold text-[var(--nc-foreground)]">{t.aiRecommendations}</h3>
          <span className="text-[9px] font-black bg-[var(--nc-accent-soft)] text-[var(--nc-accent)] border border-[var(--nc-accent-border)] px-1.5 py-0.5 rounded-full">
            AI · {recommendations.length} {isArabic ? 'توصية' : 'recommendations'}
          </span>
        </div>

        {recommendations.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-[var(--nc-border)] rounded-xl">
            <i className="ph ph-check-circle text-3xl text-emerald-500 block mb-2"></i>
            <p className="text-sm text-[var(--nc-foreground-muted)]">{t.noRec}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {recommendations.map(rec => {
              const ri = recIcon(rec.type);
              return (
                <div key={rec.campaignId} className={`p-4 rounded-xl border space-y-2 ${ri.cls.split(' ').slice(0,2).join(' ')}`}>
                  <div className="flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${ri.cls}`}>
                      <i className={`ph-bold ${ri.icon} text-sm`}></i>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-[var(--nc-foreground)] leading-tight truncate">
                        {isArabic ? rec.campaignName.split(' — ')[0] : rec.campaignName.split(' — ')[0]}
                      </p>
                      <p className="text-[10px] text-[var(--nc-foreground-muted)] mt-0.5 leading-snug">{rec.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${ri.cls}`}>
                      {rec.action}
                    </span>
                    <span className="text-[9px] text-[var(--nc-foreground-muted)] font-en">{rec.metric}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SmartCard>

    </div>
  );
}
