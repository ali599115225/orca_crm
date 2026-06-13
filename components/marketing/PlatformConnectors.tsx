// components/marketing/PlatformConnectors.tsx
'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SmartCard } from '@/components/ui/SmartCard';
import { KpiCard } from '@/components/ui/KpiCard';
import { Campaign } from '@/components/views/CampaignsView';

/* ─── Types ──────────────────────────────────────────────────── */
type IntegrationStatus = 'connected' | 'pending' | 'disconnected';

interface Platform {
  id: string;
  name: string;
  nameAr: string;
  emoji: string;
  color: string;
  bg: string;
  iconBg: string;
  platformId: string;
  leads: number;
  spend: number;
  revenue: number;
  clicks: number;
  impressions: number;
  integrationStatus: IntegrationStatus;
  lastSync: string | null;
  apiKey: string | null;
  url: string;
}

type RecType = 'connect' | 'budget' | 'scale' | 'update';

interface Recommendation {
  platformId: string;
  platformName: string;
  platformEmoji: string;
  type: RecType;
  reason: string;
  action: string;
  metric: string;
}

/* ─── Platform Data ──────────────────────────────────────────── */
const RAW_PLATFORMS: Platform[] = [
  {
    id: 'bayut', name: 'Bayut Arabia', nameAr: 'بيوت السعودية',
    emoji: '🏠', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20',
    iconBg: 'bg-blue-500',
    platformId: 'Bayut Arabia',
    leads: 72, spend: 15800, revenue: 680000, clicks: 5100, impressions: 165000,
    integrationStatus: 'connected',
    lastSync: '2026-06-08T09:15:00', apiKey: 'BAY-****-3341', url: 'https://www.bayut.com',
  },
  {
    id: 'propertyfinder', name: 'Property Finder', nameAr: 'بروبرتي فايندر',
    emoji: '🔍', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20',
    iconBg: 'bg-emerald-500',
    platformId: 'Property Finder',
    leads: 54, spend: 12400, revenue: 395000, clicks: 3800, impressions: 128000,
    integrationStatus: 'pending',
    lastSync: '2026-06-05T14:20:00', apiKey: 'PF-****-9912', url: 'https://www.propertyfinder.sa',
  },
  {
    id: 'noon', name: 'Noon Real Estate', nameAr: 'نون العقارية',
    emoji: '🌙', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20',
    iconBg: 'bg-yellow-500',
    platformId: 'Noon Real Estate',
    leads: 38, spend: 9200, revenue: 285000, clicks: 2400, impressions: 85000,
    integrationStatus: 'connected',
    lastSync: '2026-06-07T18:30:00', apiKey: 'NOON-****-7823', url: 'https://noon.com',
  },
  {
    id: 'aqar', name: 'Aqar.com', nameAr: 'عقار.كوم',
    emoji: '🏗️', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20',
    iconBg: 'bg-orange-500',
    platformId: 'Aqar',
    leads: 29, spend: 6800, revenue: 145000, clicks: 1900, impressions: 72000,
    integrationStatus: 'disconnected',
    lastSync: null, apiKey: null, url: 'https://aqar.com',
  },
  {
    id: 'wasalt', name: 'Wasalt', nameAr: 'وصلت',
    emoji: '🔗', color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20',
    iconBg: 'bg-purple-500',
    platformId: 'Wasalt',
    leads: 21, spend: 4500, revenue: 98000, clicks: 1200, impressions: 51000,
    integrationStatus: 'disconnected',
    lastSync: null, apiKey: null, url: 'https://wasalt.com',
  },
];

/* ─── Translations ───────────────────────────────────────────── */
const T = {
  AR: {
    title: 'منصات التسوّق الإعلاني',
    desc: 'تتبع أداء المنصات العقارية المتخصصة — مؤشرات CAC وROI والتحويل مع إدارة التكامل.',
    totalLeads: 'إجمالي العملاء', totalSpend: 'إجمالي الإنفاق',
    avgCAC: 'متوسط CAC', avgROI: 'متوسط ROI',
    avgCVR: 'معدل التحويل', connectedPlatforms: 'منصات متكاملة',
    platformCards: 'بطاقات المنصات', aiRec: 'توصيات ذكية للمنصات',
    manageIntegration: 'إدارة الربط', viewCampaigns: 'الحملات',
    integrationStatus: 'حالة الربط', lastSync: 'آخر مزامنة',
    apiKey: 'مفتاح API', refreshData: 'تحديث البيانات',
    syncLog: 'سجل المزامنة', close: 'إغلاق',
    connected: '✅ متكامل', pending: '⚠️ يحتاج تحديث', disconnected: '❌ غير مرتبط',
    noSync: 'لم تتم مزامنة بعد',
    cvr: 'معدل التحويل', cac: 'تكلفة العميل', roi: 'العائد ROI',
    leads: 'عملاء', spend: 'إنفاق', revenue: 'إيرادات',
    rec_connect: 'ربط المنصة', rec_budget: 'مراجعة الميزانية',
    rec_scale: 'زيادة الإنفاق', rec_update: 'تحديث الربط',
    why_connect: 'المنصة غير مرتبطة — فاتتك فرص عملاء',
    why_budget: 'ROI منخفض — يحتاج مراجعة الحملات',
    why_scale: 'معدل التحويل مرتفع — فرصة للتوسع',
    why_update: 'الربط قيد التحديث — تحقق من الـ API',
    noRec: 'أداء متوازن — لا توصيات حالياً',
    currency: 'ر.س', refreshing: 'جاري التحديث...',
    syncLogs: ['مزامنة بيانات العملاء اكتملت', 'تحديث معدلات التحويل', 'تحديث بيانات الإنفاق', 'الاتصال بـ API نجح'],
    never: 'لم يتم بعد',

    // Connect Platform Form
    connectTitle: 'ربط قناة إعلانية جديدة',
    connectDesc: 'أدخل بيانات الاعتماد ومفتاح الـ API لربط المنصة ومزامنة بيانات الأداء تلقائياً.',
    platformNameLabel: 'اسم المنصة المخصصة',
    platformTypeLabel: 'نوع المنصة الإعلانية',
    adAccountIdLabel: 'معرّف الحساب الإعلاني (Ad Account ID)',
    apiKeyLabel: 'مفتاح الـ API / رمز الوصول (Access Token)',
    monthlyBudgetLabel: 'الميزانية الشهرية المحددة (ر.س)',
    campaignGoalLabel: 'الهدف الرئيسي للحملة',
    goalLeads: 'توليد عملاء محتملين',
    goalAwareness: 'زيادة الوعي والظهور',
    goalConversion: 'تحويل المبيعات',
    goalTraffic: 'زيادة زيارات الموقع',
    connectSubmit: 'تفعيل وتأكيد الربط الذكي',
    connecting: 'جاري تفعيل الاتصال بمخدم المنصة...',
    connectSuccessTitle: 'تم ربط المنصة بنجاح! 🎉',
    connectSuccessDesc: 'تم تأمين الاتصال عبر الـ API. تم سحب الحملات النشطة بنجاح ودمجها في لوحة التحكم.',
    supportedPlatformsTitle: 'القنوات المدعومة',
    instructionsTitle: 'خطوات الربط والاتصال الآمن',
    inst1: 'احصل على رمز الوصول (Token) من لوحة المطورين للمنصة.',
    inst2: 'تأكد من إدخال معرّف الحساب بدقة لمطابقة الحملات المطلوبة.',
    inst3: 'نقوم بتشفير جميع الرموز والمفاتيح في خوادمنا المشفرة بأعلى معايير الأمان.',
    viewPlatformBtn: 'عرض المنصة في القائمة',
  },
  EN: {
    title: 'Advertising Marketplace Platforms',
    desc: 'Track specialized real estate platform performance — CAC, ROI, CVR metrics with integration management.',
    totalLeads: 'Total Leads', totalSpend: 'Total Spend',
    avgCAC: 'Avg CAC', avgROI: 'Avg ROI',
    avgCVR: 'Avg CVR', connectedPlatforms: 'Connected Platforms',
    platformCards: 'Platform Cards', aiRec: 'Smart Platform Recommendations',
    manageIntegration: 'Manage Integration', viewCampaigns: 'Campaigns',
    integrationStatus: 'Integration Status', lastSync: 'Last Sync',
    apiKey: 'API Key', refreshData: 'Refresh Data',
    syncLog: 'Sync Log', close: 'Close',
    connected: '✅ Integrated', pending: '⚠️ Needs Update', disconnected: '❌ Not Connected',
    noSync: 'No sync yet',
    cvr: 'Conv. Rate', cac: 'CAC', roi: 'ROI',
    leads: 'leads', spend: 'spend', revenue: 'revenue',
    rec_connect: 'Connect Platform', rec_budget: 'Review Budget',
    rec_scale: 'Scale Spend', rec_update: 'Update Integration',
    why_connect: 'Platform not connected — missing lead opportunities',
    why_budget: 'Low ROI — campaign review needed',
    why_scale: 'High conversion rate — scaling opportunity',
    why_update: 'Integration pending — check API credentials',
    noRec: 'Balanced performance — no recommendations',
    currency: 'SAR', refreshing: 'Refreshing...',
    syncLogs: ['Lead data sync completed', 'Conversion rates updated', 'Spend data refreshed', 'API connection successful'],
    never: 'Never synced',

    // Connect Platform Form
    connectTitle: 'Connect New Advertising Channel',
    connectDesc: 'Enter API credentials and account details to start synchronizing performance metrics automatically.',
    platformNameLabel: 'Custom Platform Name',
    platformTypeLabel: 'Advertising Platform Type',
    adAccountIdLabel: 'Ad Account ID',
    apiKeyLabel: 'API Key / Access Token',
    monthlyBudgetLabel: 'Monthly Budget Allocation (SAR)',
    campaignGoalLabel: 'Primary Campaign Goal',
    goalLeads: 'Lead Generation',
    goalAwareness: 'Brand Awareness',
    goalConversion: 'Sales Conversion',
    goalTraffic: 'Website Traffic',
    connectSubmit: 'Activate Integration Connection',
    connecting: 'Establishing connection to API endpoints...',
    connectSuccessTitle: 'Platform Connected Successfully! 🎉',
    connectSuccessDesc: 'The API bridge is active. Campaign data has been successfully imported and integrated.',
    supportedPlatformsTitle: 'Supported Channels',
    instructionsTitle: 'Security & Integration Steps',
    inst1: 'Generate a long-lived access token from the developer dashboard.',
    inst2: 'Provide correct account IDs to fetch matching campaigns.',
    inst3: 'All tokens are stored with AES-256 bank-grade encryption.',
    viewPlatformBtn: 'View Platform Card',
  },
};

/* ─── Helpers ────────────────────────────────────────────────── */
const pct = (n: number, d: number) => d > 0 ? (n / d) * 100 : 0;
const fmt = (n: number, dec = 1) => n.toFixed(dec);

/* ─── Props ──────────────────────────────────────────────────── */
interface PlatformConnectorsProps {
  lang: 'AR' | 'EN';
  isArabic: boolean;
  addTelemetryEvent: (type: string, payload?: any) => void;
  platformsList: Platform[];
  setPlatformsList: React.Dispatch<React.SetStateAction<Platform[]>>;
  campaignsList: Campaign[];
  setCampaignsList: React.Dispatch<React.SetStateAction<Campaign[]>>;
  activeTab: 'marketing' | 'campaigns' | 'connect';
  setActiveTab: (tab: 'marketing' | 'campaigns' | 'connect') => void;
  isCampaignsPage: boolean;
}

export type { PlatformConnectorsProps, Platform };
export { RAW_PLATFORMS };

export default function PlatformConnectors({
  lang,
  isArabic,
  addTelemetryEvent,
  platformsList,
  setPlatformsList,
  campaignsList,
  setCampaignsList,
  activeTab,
  setActiveTab,
  isCampaignsPage,
}: PlatformConnectorsProps) {
  const router = useRouter();
  const t = T[lang] || T.AR;

  /* ── Modal & refresh state ─────────────────────────────────── */
  const [modalPlatform, setModalPlatform] = useState<Platform | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState<Set<string>>(new Set());

  /* ── Form States for Connect Tab ───────────────────────────── */
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('meta');
  const [formAccountId, setFormAccountId] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formGoal, setFormGoal] = useState('leads');

  const [isConnecting, setIsConnecting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastAddedPlatformId, setLastAddedPlatformId] = useState('');

  /* ── Computed platform metrics ──────────────────────────────── */
  const platforms = useMemo(() => platformsList.map(p => ({
    ...p,
    cvr: pct(p.leads, p.clicks),
    cac: p.leads > 0 ? p.spend / p.leads : 0,
    roi: p.spend > 0 ? ((p.revenue - p.spend) / p.spend) * 100 : 0,
  })), [platformsList]);

  /* ── Aggregates ────────────────────────────────────────────── */
  const totalLeads   = platforms.reduce((s, p) => s + p.leads, 0);
  const totalSpend   = platforms.reduce((s, p) => s + p.spend, 0);
  const totalRev     = platforms.reduce((s, p) => s + p.revenue, 0);
  const totalClicks  = platforms.reduce((s, p) => s + p.clicks, 0);
  const avgCAC       = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const avgROI       = totalSpend > 0 ? ((totalRev - totalSpend) / totalSpend) * 100 : 0;
  const avgCVR       = pct(totalLeads, totalClicks);
  const connectedCnt = platforms.filter(p => p.integrationStatus === 'connected').length;

  /* ── Recommendations ───────────────────────────────────────── */
  const recommendations: Recommendation[] = useMemo(() => {
    const recs: Recommendation[] = [];
    platforms.forEach(p => {
      if (p.integrationStatus === 'disconnected') {
        recs.push({ platformId: p.id, platformName: isArabic ? p.nameAr : p.name, platformEmoji: p.emoji, type: 'connect', reason: t.why_connect, action: t.rec_connect, metric: `0 ${t.leads}` });
      }
      if (p.integrationStatus === 'pending') {
        recs.push({ platformId: p.id + '_update', platformName: isArabic ? p.nameAr : p.name, platformEmoji: p.emoji, type: 'update', reason: t.why_update, action: t.rec_update, metric: 'API pending' });
      }
      if (p.integrationStatus === 'connected' && p.roi < 1500) {
        recs.push({ platformId: p.id + '_budget', platformName: isArabic ? p.nameAr : p.name, platformEmoji: p.emoji, type: 'budget', reason: t.why_budget, action: t.rec_budget, metric: `ROI: ${fmt(p.roi, 0)}%` });
      }
      if (p.integrationStatus === 'connected' && p.cvr > 2.5) {
        recs.push({ platformId: p.id + '_scale', platformName: isArabic ? p.nameAr : p.name, platformEmoji: p.emoji, type: 'scale', reason: t.why_scale, action: t.rec_scale, metric: `CVR: ${fmt(p.cvr)}%` });
      }
    });
    return recs;
  }, [platforms, isArabic, t]);

  /* ── Handle Refresh ────────────────────────────────────────── */
  const handleRefresh = useCallback(async (platformId: string) => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1800));
    setRefreshed(prev => new Set([...prev, platformId]));
    setRefreshing(false);
  }, []);

  /* ── Switch to Campaigns Tab ────────────────────────────────── */
  const goToCampaigns = (platformId: string) => {
    if (!isCampaignsPage) {
      router.push(`/operations/campaigns?platform=${encodeURIComponent(platformId)}`);
    } else {
      setActiveTab('campaigns');
    }
  };

  /* ── Submit Connection Form ────────────────────────────────── */
  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsConnecting(false);
    setIsSuccess(true);

    const matchedType = formType;
    let existingIndex = platformsList.findIndex(p => p.id === matchedType);

    if (existingIndex > -1) {
      setPlatformsList(prev => prev.map((p, idx) => {
        if (idx === existingIndex) {
          return {
            ...p,
            integrationStatus: 'connected',
            apiKey: formApiKey ? `${formApiKey.substring(0, 3)}****${formApiKey.substring(formApiKey.length - 4)}` : 'API-****-KEY',
            lastSync: new Date().toISOString(),
          };
        }
        return p;
      }));
      setLastAddedPlatformId(platformsList[existingIndex].id);
    } else {
      const platformMap: Record<string, Partial<Platform>> = {
        meta: { name: 'Meta Ads', nameAr: 'ميتا للإعلانات', emoji: '📘', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20', iconBg: 'bg-blue-500', platformId: 'Meta Ads', url: 'https://www.facebook.com/adsmanager' },
        google: { name: 'Google Ads', nameAr: 'إعلانات قوقل', emoji: '🔴', color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20', iconBg: 'bg-rose-500', platformId: 'Google Ads', url: 'https://ads.google.com' },
        snapchat: { name: 'Snapchat Ads', nameAr: 'سناب شات', emoji: '👻', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20', iconBg: 'bg-yellow-500', platformId: 'Snapchat Ads', url: 'https://ads.snapchat.com' },
        tiktok: { name: 'TikTok Ads', nameAr: 'تيك توك', emoji: '🎵', color: 'text-pink-500', bg: 'bg-pink-500/10 border-pink-500/20', iconBg: 'bg-pink-500', platformId: 'TikTok Ads', url: 'https://ads.tiktok.com' },
        bayut: { name: 'Bayut Arabia', nameAr: 'بيوت السعودية', emoji: '🏠', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20', iconBg: 'bg-blue-500', platformId: 'Bayut Arabia', url: 'https://www.bayut.com' },
        propertyfinder: { name: 'Property Finder', nameAr: 'بروبرتي فايندر', emoji: '🔍', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', iconBg: 'bg-emerald-500', platformId: 'Property Finder', url: 'https://www.propertyfinder.sa' },
        noon: { name: 'Noon Real Estate', nameAr: 'نون العقارية', emoji: '🌙', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20', iconBg: 'bg-yellow-500', platformId: 'Noon Real Estate', url: 'https://noon.com' },
      };

      const details = platformMap[formType] || {
        name: formName || 'Custom Platform',
        nameAr: formName || 'منصة مخصصة',
        emoji: '🌐',
        color: 'text-purple-500',
        bg: 'bg-purple-500/10 border-purple-500/20',
        iconBg: 'bg-purple-500',
        platformId: formName || 'Custom Platform',
        url: 'https://google.com',
      };

      const newPlatformId = `platform_${Date.now()}`;
      const newPlatform: Platform = {
        id: newPlatformId,
        name: details.name!,
        nameAr: details.nameAr!,
        emoji: details.emoji!,
        color: details.color!,
        bg: details.bg!,
        iconBg: details.iconBg!,
        platformId: details.platformId!,
        leads: Math.floor(Math.random() * 30) + 15,
        spend: Number(formBudget) || 4500,
        revenue: (Number(formBudget) || 4500) * (Math.floor(Math.random() * 3) + 2),
        clicks: Math.floor(Math.random() * 800) + 400,
        impressions: Math.floor(Math.random() * 40000) + 10000,
        integrationStatus: 'connected',
        lastSync: new Date().toISOString(),
        apiKey: formApiKey ? `${formApiKey.substring(0, 3)}****${formApiKey.substring(formApiKey.length - 4)}` : 'API-****-KEY',
        url: details.url!,
      };

      setPlatformsList(prev => [...prev, newPlatform]);
      setLastAddedPlatformId(newPlatform.id);

      const newCampaign: Campaign = {
        id: `C-${Math.floor(Math.random() * 900) + 100}`,
        name: isArabic ? `حملة ربط ذكي — ${details.nameAr}` : `Smart Campaign — ${details.name}`,
        nameEn: `Smart Campaign — ${details.name}`,
        platform: details.platformId!,
        platformUrl: details.url!,
        platformColor: details.color!,
        platformBg: details.bg!,
        platformEmoji: details.emoji!,
        budget: (Number(formBudget) || 4500) * 1.4,
        spend: Number(formBudget) || 4500,
        impressions: newPlatform.impressions,
        clicks: newPlatform.clicks,
        leads: newPlatform.leads,
        revenue: newPlatform.revenue,
        status: 'نشطة',
        statusEn: 'Active',
      };
      setCampaignsList(prev => [newCampaign, ...prev]);
    }
  };

  /* ── Status badge ──────────────────────────────────────────── */
  const statusBadge = (status: IntegrationStatus) => ({
    connected:    { cls: 'bg-[var(--nc-accent-soft)] text-[var(--nc-accent)] border-[var(--nc-accent-border)]', label: t.connected },
    pending:      { cls: 'bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] border-[var(--nc-border)]',  label: t.pending   },
    disconnected: { cls: 'bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] border-[var(--nc-border)]',  label: t.disconnected },
  }[status]);

  /* ── Rec icon/style ────────────────────────────────────────── */
  const recStyle = (type: RecType) => ({
    connect: { icon: 'ph-plug', cls: 'bg-[var(--nc-accent-soft)] border-[var(--nc-accent-border)] text-[var(--nc-accent)]' },
    budget:  { icon: 'ph-currency-circle-dollar', cls: 'bg-[var(--nc-surface)] border-[var(--nc-border)] text-[var(--nc-foreground-muted)]' },
    scale:   { icon: 'ph-trend-up', cls: 'bg-[var(--nc-accent-soft)] border-[var(--nc-accent-border)] text-[var(--nc-accent)]' },
    update:  { icon: 'ph-arrows-clockwise', cls: 'bg-[var(--nc-surface)] border-[var(--nc-border)] text-[var(--nc-foreground-muted)]' },
  }[type]);

  /* ── Format date ───────────────────────────────────────────── */
  const fmtDate = (d: string | null) => {
    if (!d) return t.never;
    return new Date(d).toLocaleString(isArabic ? 'ar-EG' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Tab 1: Marketing Marketplaces */}
          {activeTab === 'marketing' && (
        <div className="space-y-5 animate-[ncFadeIn_0.3s_ease]">
          {/* Demo data badge */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <i className="ph-bold ph-warning text-amber-400"></i>
            <p className="text-[11px] font-bold text-amber-400">{isArabic ? '⚠️ بيانات تجريبية — لم يتم ربطها بقاعدة البيانات' : '⚠️ Demo data — not connected to database'}</p>
          </div>
          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard label={t.totalLeads} value={totalLeads.toString()} color="accent" />
            <KpiCard label={t.totalSpend} value={`${(totalSpend/1000).toFixed(1)}K`} color="info" />
            <KpiCard label={t.avgCAC} value={`${fmt(avgCAC, 0)}`} color="warning" />
            <KpiCard label={t.avgROI} value={`${fmt(avgROI, 0)}%`} color="success" />
            <KpiCard label={t.avgCVR} value={`${fmt(avgCVR)}%`} color="default" />
            <KpiCard label={t.connectedPlatforms} value={`${connectedCnt}/${platforms.length}`} color="info" />
          </div>

          {/* Platform Cards Grid */}
          <div>
            <h3 className="text-sm font-extrabold text-[var(--nc-foreground)] mb-3 flex items-center gap-2">
              <i className="ph-bold ph-storefront text-[var(--nc-accent)]"></i>
              {t.platformCards}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
              {platforms.map(p => {
                const sb = statusBadge(p.integrationStatus);
                return (
                  <SmartCard key={p.id} className="p-4 space-y-3 h-full flex flex-col">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface)] flex items-center justify-center text-xl shrink-0">
                          {p.emoji}
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-[var(--nc-foreground)] leading-tight">{isArabic ? p.nameAr : p.name}</h3>
                          <p className="text-[10px] text-[var(--nc-foreground-muted)] font-en">{p.name}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-full border shrink-0 ${sb.cls}`}>
                        {sb.label}
                      </span>
                    </div>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[var(--nc-surface)] border border-[var(--nc-border)] rounded-lg p-2 text-center">
                        <p className="text-[8px] text-[var(--nc-foreground-muted)] font-bold uppercase">{t.leads}</p>
                        <p className="text-lg font-black text-[var(--nc-foreground)]">{p.leads}</p>
                      </div>
                      <div className="bg-[var(--nc-surface)] border border-[var(--nc-border)] rounded-lg p-2 text-center">
                        <p className="text-[8px] text-[var(--nc-foreground-muted)] font-bold uppercase">{t.cac}</p>
                        <p className="text-base font-black text-[var(--nc-foreground)]">{fmt(p.cac, 0)}</p>
                        <p className="text-[7px] text-[var(--nc-foreground-muted)]">{t.currency}</p>
                      </div>
                      <div className="bg-[var(--nc-surface)] border border-[var(--nc-border)] rounded-lg p-2 text-center">
                        <p className="text-[8px] text-[var(--nc-foreground-muted)] font-bold uppercase">{t.cvr}</p>
                        <p className="text-base font-black text-[var(--nc-foreground)]">{fmt(p.cvr)}%</p>
                      </div>
                    </div>

                    {/* ROI + progress bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--nc-foreground-muted)]">{t.roi}</span>
                        <span className="font-black text-[var(--nc-foreground)]">
                          {fmt(p.roi, 0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-[var(--nc-border)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            p.roi >= 2000 ? 'bg-[var(--nc-accent)]' : p.roi >= 1000 ? 'bg-[var(--nc-foreground-muted)]' : 'bg-amber-500/60'
                          }`}
                          style={{ width: `${Math.min(100, p.roi / 50)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1 mt-auto">
                      <button
                        onClick={() => setModalPlatform(p)}
                        className="flex-1 py-2 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] hover:bg-[var(--nc-surface-strong)] text-[var(--nc-foreground)] text-[10px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <i className="ph-bold ph-link text-sm"></i>
                        {t.manageIntegration}
                      </button>
                      <button
                        onClick={() => goToCampaigns(p.platformId)}
                        className="flex-1 py-2 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] text-[10px] font-bold transition-colors flex items-center justify-center gap-1.5 hover:border-[var(--nc-accent-border)] hover:text-[var(--nc-accent)] cursor-pointer"
                      >
                        <i className="ph-bold ph-megaphone text-sm"></i>
                        {t.viewCampaigns}
                      </button>
                    </div>
                  </SmartCard>
                );
              })}
            </div>
          </div>

          {/* AI Recommendations */}
          <SmartCard className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--nc-border)] pb-3">
              <i className="ph-bold ph-robot text-[var(--nc-accent)] text-base"></i>
              <h3 className="text-sm font-extrabold text-[var(--nc-foreground)]">{t.aiRec}</h3>
              <span className="text-[9px] font-black bg-[var(--nc-accent-soft)] text-[var(--nc-accent)] border border-[var(--nc-accent-border)] px-1.5 py-0.5 rounded-full">
                {recommendations.length} {isArabic ? 'توصية' : 'recs'}
              </span>
            </div>

            {recommendations.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-[var(--nc-border)] rounded-xl">
                <i className="ph ph-check-circle text-3xl text-emerald-500 block mb-2"></i>
                <p className="text-sm text-[var(--nc-foreground-muted)]">{t.noRec}</p>
              </div>
            ) : (
              <div className="space-y-0">
                {recommendations.map(rec => {
                  const rs = recStyle(rec.type);
                  return (
                    <div key={rec.platformId} className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-[var(--nc-border)] last:border-b-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${rs.cls}`}>
                          <i className={`ph-bold ${rs.icon} text-sm`}></i>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-[var(--nc-foreground)] leading-tight">
                            {rec.platformEmoji} {rec.platformName}
                          </p>
                          <p className="text-[9px] text-[var(--nc-foreground-muted)] leading-tight">{rec.reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full border border-[var(--nc-border)] bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)]">
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
      )}

      {/* Tab 3: Connect Platform Form */}
      {activeTab === 'connect' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start animate-[ncFadeIn_0.3s_ease]">
          {/* Form Card */}
          <SmartCard className="p-6">
            {isSuccess ? (
              <div className="py-10 text-center space-y-6 animate-[ncFadeIn_0.3s_ease]">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center text-4xl mx-auto shadow-lg shadow-emerald-500/5">
                  <i className="ph-bold ph-check"></i>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-[var(--nc-foreground)]">{t.connectSuccessTitle}</h3>
                  <p className="text-xs text-[var(--nc-foreground-muted)] max-w-md mx-auto leading-relaxed">
                    {t.connectSuccessDesc}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab(isCampaignsPage ? 'campaigns' : 'marketing');
                    setIsSuccess(false);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-lg hover:shadow-xl"
                >
                  <i className={`ph-bold ${isCampaignsPage ? 'ph-megaphone' : 'ph-storefront'} text-sm`}></i>
                  {isCampaignsPage ? (isArabic ? 'عرض الحملات في القائمة' : 'View Campaigns List') : t.viewPlatformBtn}
                </button>
              </div>
            ) : (
              <form onSubmit={handleConnectSubmit} className="space-y-4">
                <div className="border-b border-[var(--nc-border)] pb-3">
                  <h3 className="text-sm font-extrabold text-[var(--nc-foreground)] flex items-center gap-2">
                    <i className="ph-bold ph-link text-[var(--nc-accent)]"></i>
                    {t.connectTitle}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-1.5">{t.platformTypeLabel}</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      required
                      className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-3.5 py-2.5 text-xs text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent-border)] font-semibold cursor-pointer"
                    >
                      <option value="meta">Meta Ads (فيسبوك/إنستغرام)</option>
                      <option value="google">Google Ads (إعلانات قوقل)</option>
                      <option value="snapchat">Snapchat Ads (سناب شات)</option>
                      <option value="tiktok">TikTok Ads (تيك توك)</option>
                      <option value="bayut">Bayut Arabia (بيوت السعودية)</option>
                      <option value="propertyfinder">Property Finder (بروبرتي فايندر)</option>
                      <option value="noon">Noon Real Estate (نون العقارية)</option>
                      <option value="aqar">Aqar.com (عقار.كوم)</option>
                      <option value="wasalt">Wasalt (وصلت)</option>
                      <option value="custom">منصة إعلانية مخصصة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-1.5">{t.platformNameLabel}</label>
                    <input
                      type="text"
                      value={formType === 'custom' ? formName : (isArabic ? 'تلقائي' : 'Auto')}
                      disabled={formType !== 'custom'}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder={isArabic ? "اسم المنصة الجديدة..." : "Enter custom platform name..."}
                      required={formType === 'custom'}
                      className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-3.5 py-2.5 text-xs text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent-border)] disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-1.5">{t.adAccountIdLabel}</label>
                    <input
                      type="text"
                      value={formAccountId}
                      onChange={(e) => setFormAccountId(e.target.value)}
                      placeholder="e.g. 884-991-2234"
                      required
                      className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-3.5 py-2.5 text-xs text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent-border)] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-1.5">{t.apiKeyLabel}</label>
                    <input
                      type="password"
                      value={formApiKey}
                      onChange={(e) => setFormApiKey(e.target.value)}
                      placeholder="••••••••••••••••••••••••"
                      required
                      className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-3.5 py-2.5 text-xs text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent-border)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-1.5">{t.monthlyBudgetLabel}</label>
                    <input
                      type="number"
                      value={formBudget}
                      onChange={(e) => setFormBudget(e.target.value)}
                      placeholder="e.g. 15000"
                      required
                      className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-3.5 py-2.5 text-xs text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent-border)] font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-1.5">{t.campaignGoalLabel}</label>
                    <select
                      value={formGoal}
                      onChange={(e) => setFormGoal(e.target.value)}
                      required
                      className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-3.5 py-2.5 text-xs text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent-border)] font-semibold cursor-pointer"
                    >
                      <option value="leads">{t.goalLeads}</option>
                      <option value="awareness">{t.goalAwareness}</option>
                      <option value="conversion">{t.goalConversion}</option>
                      <option value="traffic">{t.goalTraffic}</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isConnecting}
                  className="w-full py-3.5 rounded-xl bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-60 mt-2"
                >
                  {isConnecting ? (
                    <>
                      <i className="ph-bold ph-arrows-clockwise animate-spin text-sm"></i>
                      {t.connecting}
                    </>
                  ) : (
                    <>
                      <i className="ph-bold ph-link text-sm"></i>
                      {t.connectSubmit}
                    </>
                  )}
                </button>
              </form>
            )}
          </SmartCard>

          {/* Guide/Instructions Card */}
          <div className="space-y-4">
            <SmartCard className="p-5 space-y-3">
              <h4 className="text-xs font-extrabold text-[var(--nc-foreground)] border-b border-[var(--nc-border)] pb-2 flex items-center gap-1.5">
                <i className="ph-bold ph-broadcast text-[var(--nc-accent)]"></i>
                {t.supportedPlatformsTitle}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {['Meta Ads', 'Google Ads', 'Snapchat', 'TikTok', 'Bayut', 'Property Finder', 'Noon Real Estate'].map(ch => (
                  <span key={ch} className="px-2.5 py-1 rounded-lg bg-[var(--nc-surface)] border border-[var(--nc-border)] text-[10px] text-[var(--nc-foreground-muted)] font-bold">
                    {ch}
                  </span>
                ))}
              </div>
            </SmartCard>

            <SmartCard className="p-5 space-y-3">
              <h4 className="text-xs font-extrabold text-[var(--nc-foreground)] border-b border-[var(--nc-border)] pb-2 flex items-center gap-1.5">
                <i className="ph-bold ph-info text-amber-500"></i>
                {t.instructionsTitle}
              </h4>
              <ul className="space-y-2.5 text-[10px] text-[var(--nc-foreground-muted)] leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <i className="ph-bold ph-check-circle text-emerald-500 mt-0.5 shrink-0"></i>
                  <span>{t.inst1}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <i className="ph-bold ph-check-circle text-emerald-500 mt-0.5 shrink-0"></i>
                  <span>{t.inst2}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <i className="ph-bold ph-shield text-indigo-500 mt-0.5 shrink-0"></i>
                  <span>{t.inst3}</span>
                </li>
              </ul>
            </SmartCard>
          </div>
        </div>
      )}

      {/* ── Integration Modal ────────────────────────────────── */}
      {modalPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setModalPlatform(null)}>
          <div
            className="relative w-full max-w-md bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-2xl shadow-2xl p-6 space-y-5 animate-[ncFadeIn_0.2s_ease]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] flex items-center justify-center text-xl">
                  {modalPlatform.emoji}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[var(--nc-foreground)]">
                    {isArabic ? modalPlatform.nameAr : modalPlatform.name}
                  </h3>
                  <p className="text-[10px] text-[var(--nc-foreground-muted)]">{t.integrationStatus}</p>
                </div>
              </div>
              <button
                onClick={() => setModalPlatform(null)}
                className="w-8 h-8 rounded-full bg-[var(--nc-surface)] hover:bg-[var(--nc-border)] text-[var(--nc-foreground-muted)] flex items-center justify-center transition-colors"
              >
                <i className="ph ph-x text-sm"></i>
              </button>
            </div>

            {/* Status + details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[var(--nc-surface)] border border-[var(--nc-border)] rounded-xl">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">{t.integrationStatus}</span>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${statusBadge(modalPlatform.integrationStatus).cls}`}>
                  {statusBadge(modalPlatform.integrationStatus).label}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[var(--nc-surface)] border border-[var(--nc-border)] rounded-xl">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">{t.apiKey}</span>
                <span className="text-xs font-mono font-bold text-[var(--nc-foreground)]">
                  {modalPlatform.apiKey ?? '—'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[var(--nc-surface)] border border-[var(--nc-border)] rounded-xl">
                <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">{t.lastSync}</span>
                <span className="text-xs font-semibold text-[var(--nc-foreground)]">
                  {refreshed.has(modalPlatform.id)
                    ? new Date().toLocaleString(isArabic ? 'ar-EG' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : fmtDate(modalPlatform.lastSync)
                  }
                </span>
              </div>

              <div className="p-3 bg-[var(--nc-surface)] border border-[var(--nc-border)] rounded-xl space-y-2">
                <p className="text-[10px] font-bold text-[var(--nc-foreground-muted)] uppercase tracking-wide">{t.syncLog}</p>
                {refreshed.has(modalPlatform.id) ? (
                  t.syncLogs.map((log: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-[var(--nc-foreground-muted)]">
                      <i className="ph-fill ph-check-circle text-emerald-500 shrink-0"></i>
                      <span>{log}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-[var(--nc-foreground-muted)] italic">{t.noSync}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => handleRefresh(modalPlatform.id)}
                disabled={refreshing}
                className="flex-1 py-2.5 rounded-xl bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <i className={`ph-bold ph-arrows-clockwise text-sm ${refreshing ? 'animate-spin' : ''}`}></i>
                {refreshing ? t.refreshing : t.refreshData}
              </button>
              <button
                onClick={() => { setModalPlatform(null); goToCampaigns(modalPlatform.platformId); }}
                className="flex-1 py-2.5 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] font-bold text-xs transition-colors flex items-center justify-center gap-2 hover:border-[var(--nc-accent-border)] hover:text-[var(--nc-accent)] cursor-pointer"
              >
                <i className="ph-bold ph-megaphone text-sm"></i>
                {t.viewCampaigns}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
