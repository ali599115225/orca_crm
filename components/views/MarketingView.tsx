// components/views/MarketingView.tsx
'use client';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useApp } from '@/app/context/AppContext';
import { Campaign, RAW_CAMPAIGNS } from './CampaignsView';
import PlatformConnectors, { RAW_PLATFORMS } from '@/components/marketing/PlatformConnectors';
import MarketingCampaigns from '@/components/marketing/MarketingCampaigns';

/* ─── Translations (tab labels only) ─────────────────────────── */
const T = {
  AR: {
    title: 'منصات التسوّق الإعلاني',
    desc: 'تتبع أداء المنصات العقارية المتخصصة — مؤشرات CAC وROI والتحويل مع إدارة التكامل.',
    tabMarketing: 'منصات التسوّق الإعلاني',
    tabCampaigns: 'مركز الحملات',
    tabConnect: 'ربط منصة جديدة',
    tabCampaignsDesc: 'تحليل أداء الحملات التسويقية النشطة وتكاليف الاستحواذ ونسب العائد لجميع القنوات.',
    connectDesc: 'أدخل بيانات الاعتماد ومفتاح الـ API لربط المنصة ومزامنة بيانات الأداء تلقائياً.',
  },
  EN: {
    title: 'Advertising Marketplace Platforms',
    desc: 'Track specialized real estate platform performance — CAC, ROI, CVR metrics with integration management.',
    tabMarketing: 'Marketplaces',
    tabCampaigns: 'Campaign Center',
    tabConnect: 'Link Platform',
    tabCampaignsDesc: 'Analyze performance of active marketing campaigns, acquisition costs, and ROI across all channels.',
    connectDesc: 'Enter API credentials and account details to start synchronizing performance metrics automatically.',
  },
};

export default function MarketingView() {
  const { lang } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = T[lang] || T.AR;
  const isArabic = lang === 'AR';
  const dir = isArabic ? 'rtl' : 'ltr';

  /* ── Router and tab state ──────────────────────────────────── */
  const isCampaignsPage = pathname.includes('/campaigns');

  const initialTab = useMemo(() => {
    const tabParam = searchParams.get('tab');
    if (isCampaignsPage) {
      if (tabParam === 'campaigns' || tabParam === 'connect') return tabParam;
      return 'campaigns';
    } else {
      if (tabParam === 'marketing' || tabParam === 'connect') return tabParam;
      return 'marketing';
    }
  }, [isCampaignsPage, searchParams]);

  const [activeTab, setActiveTab] = useState<'marketing' | 'campaigns' | 'connect'>(initialTab);
  const [platformFilter, setPlatformFilter] = useState<string | null>(searchParams.get('platform'));
  const [usingFallback, setUsingFallback] = useState(true);

  const [campaignsList, setCampaignsList] = useState<Campaign[]>(RAW_CAMPAIGNS);

  /* ── Platform list state (shared, persists across tab switches) ── */
  const [platformsList, setPlatformsList] = useState(RAW_PLATFORMS);

  // sync tab from query param if it changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (isCampaignsPage) {
      if (tabParam === 'campaigns' || tabParam === 'connect') {
        setActiveTab(tabParam);
      }
    } else {
      if (tabParam === 'marketing' || tabParam === 'connect') {
        setActiveTab(tabParam);
      }
    }
  }, [searchParams, isCampaignsPage]);

  // sync platformFilter from query param if it changes
  useEffect(() => {
    const platformParam = searchParams.get('platform');
    if (platformParam) {
      setPlatformFilter(platformParam);
    }
  }, [searchParams]);

  const addTelemetryEvent = useCallback((_type: string, _payload?: any) => {
    // Telemetry disabled — production cleanup
  }, []);

  return (
    <div className="space-y-5 p-6" dir={dir}>

      {/* ── Page Header with Tab Selector ────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {activeTab === 'marketing' ? t.title : activeTab === 'campaigns' ? t.tabCampaigns : t.tabConnect}
            {usingFallback && activeTab === 'marketing' && (
              <span className="mr-2 align-middle inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-bold">
                <i className="ph-bold ph-warning-circle"></i>
                {isArabic ? 'بيانات تجريبية' : 'Demo data'}
              </span>
            )}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5 font-medium">
            {activeTab === 'marketing' ? t.desc : activeTab === 'campaigns' ? t.tabCampaignsDesc : t.connectDesc}
          </p>
        </div>
        <div className="flex bg-[var(--nc-surface)] p-1 rounded-xl border border-[var(--nc-border)] shrink-0 animate-[ncFadeIn_0.25s_ease]">
          {!isCampaignsPage && (
            <button
              onClick={() => { setActiveTab('marketing'); setPlatformFilter(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'marketing'
                  ? 'bg-[var(--nc-surface-strong)] text-[var(--nc-foreground)] shadow-sm'
                  : 'text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)]'
              }`}
            >
              <i className="ph-bold ph-storefront text-sm"></i>
              {t.tabMarketing}
            </button>
          )}
          {isCampaignsPage && (
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'campaigns'
                  ? 'bg-[var(--nc-surface-strong)] text-[var(--nc-foreground)] shadow-sm'
                  : 'text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)]'
              }`}
            >
              <i className="ph-bold ph-megaphone text-sm"></i>
              {t.tabCampaigns}
            </button>
          )}
          <button
            onClick={() => {
              setActiveTab('connect');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'connect'
                ? 'bg-[var(--nc-surface-strong)] text-[var(--nc-foreground)] shadow-sm'
                : 'text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)]'
            }`}
          >
            <i className="ph-bold ph-plus-circle text-sm"></i>
            {t.tabConnect}
          </button>
        </div>
      </div>

      {/* ── Tab Contents ─────────────────────────────────────── */}

      {activeTab !== 'campaigns' && (
        <PlatformConnectors
          key={activeTab}
          lang={lang}
          isArabic={isArabic}
          addTelemetryEvent={addTelemetryEvent}
          platformsList={platformsList}
          setPlatformsList={setPlatformsList}
          campaignsList={campaignsList}
          setCampaignsList={setCampaignsList}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCampaignsPage={isCampaignsPage}
        />
      )}

      {activeTab === 'campaigns' && (
        <MarketingCampaigns
          lang={lang}
          isArabic={isArabic}
          addTelemetryEvent={addTelemetryEvent}
          campaignsList={campaignsList}
          platformFilter={platformFilter}
          setPlatformFilter={setPlatformFilter}
        />
      )}

    </div>
  );
}
