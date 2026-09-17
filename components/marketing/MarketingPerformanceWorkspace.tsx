"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Banknote, FileCheck2, Funnel, Plug, RefreshCw, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import { operationsVisual } from "@/features/operations/visual";
import {
  OperationsEmptyState,
  OperationsKpiGrid,
  OperationsMasterList,
  OperationsMasterRow,
  OperationsMetricCard,
  OperationsPageHeader,
  OperationsPanel,
  OperationsPanelHeader,
} from "@/components/operations";
import {
  getMarketingOverviewAction,
  MarketingOverview,
} from "@/app/actions/marketing";

/* ─── copy ───────────────────────────────────────────────────────────────── */
const COPY = {
  AR: {
    eyebrow: "الإعلان والتسويق",
    marketingTitle: "الإعلان والتسويق",
    marketingDescription:
      "قراءة أداء مصادر العملاء واتصالات المنصات اعتمادًا على البيانات التشغيلية الفعلية.",
    campaignsTitle: "أداء الحملات ومصادر العملاء",
    campaignsDescription:
      "تحليل التحويل والعقود حسب المصدر المسجل للعميل دون إنشاء حملات أو ميزانيات افتراضية.",
    live: "بيانات تشغيلية",
    leads: "إجمالي العملاء",
    leadsDesc: "إجمالي العملاء المسجلين في النظام",
    converted: "عملاء متقدمون",
    convertedDesc: "انتقلوا إلى مرحلة متقدمة في المسار",
    contracts: "عقود موقعة",
    contractsDesc: "عقود مُغلقة بنجاح خلال الفترة",
    value: "قيمة العقود",
    valueDesc: "القيمة الإجمالية للعقود الموقعة",
    sourcesTitle: "أداء مصادر العملاء",
    sourcesDesc: "تحليل التحويل حسب المصدر المسجل",
    source: "المصدر",
    reservations: "حجوزات",
    won: "إغلاق ناجح",
    conversion: "التحويل",
    connectionsTitle: "اتصالات المنصات",
    connectionsDesc: "المنصات الإعلانية المرتبطة بهذه المنشأة",
    platform: "المنصة",
    account: "الحساب",
    status: "الحالة",
    updated: "آخر تحديث",
    noSources: "لا توجد بيانات مصادر عملاء مسجلة حاليًا.",
    noConnections: "لا توجد اتصالات منصات محفوظة لهذه المنشأة.",
    settings: "إدارة التكاملات",
    loading: "جاري تحميل البيانات التشغيلية…",
    errorTitle: "تعذر تحميل بيانات التسويق",
    errorDescription: "لم يتم جلب البيانات التشغيلية الحالية.",
    retry: "إعادة المحاولة",
    sar: "ر.س",
    statusConnected: "متصل",
    statusPending: "في الانتظار",
    statusDisconnected: "غير متصل",
    undefined: "غير محدد",
  },
  EN: {
    eyebrow: "Advertising & Marketing",
    marketingTitle: "Advertising & Marketing",
    marketingDescription:
      "Operational performance for lead sources and platform connections using organization-scoped data.",
    campaignsTitle: "Campaign & Lead Source Performance",
    campaignsDescription:
      "Conversion and signed-contract analysis by recorded lead source, without generated campaigns or budgets.",
    live: "Operational data",
    leads: "Total leads",
    leadsDesc: "All leads registered in the system",
    converted: "Advanced leads",
    convertedDesc: "Progressed to an advanced pipeline stage",
    contracts: "Signed contracts",
    contractsDesc: "Successfully closed contracts this period",
    value: "Contract value",
    valueDesc: "Total value of signed contracts",
    sourcesTitle: "Lead source performance",
    sourcesDesc: "Conversion analysis by recorded lead source",
    source: "Source",
    reservations: "Reservations",
    won: "Successful closures",
    conversion: "Conversion",
    connectionsTitle: "Platform connections",
    connectionsDesc: "Ad platforms linked to this organization",
    platform: "Platform",
    account: "Account",
    status: "Status",
    updated: "Last updated",
    noSources: "No lead source data is currently recorded.",
    noConnections: "No platform connections are saved for this organization.",
    settings: "Manage integrations",
    loading: "Loading operational data…",
    errorTitle: "Unable to load marketing data",
    errorDescription: "The current operational data could not be retrieved.",
    retry: "Try again",
    sar: "SAR",
    statusConnected: "Connected",
    statusPending: "Pending",
    statusDisconnected: "Disconnected",
    undefined: "Not set",
  },
} as const;

/* ─── helpers ────────────────────────────────────────────────────────────── */
function statusLabel(
  raw: string,
  t: (typeof COPY)["AR"] | (typeof COPY)["EN"],
): string {
  const n = raw.toUpperCase();
  if (n === "CONNECTED" || n === "ACTIVE") return t.statusConnected;
  if (n === "PENDING") return t.statusPending;
  if (n === "DISCONNECTED" || n === "ERROR") return t.statusDisconnected;
  return raw;
}

function statusBadgeClass(raw: string): string {
  const n = raw.toUpperCase();
  if (n === "CONNECTED" || n === "ACTIVE")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (n === "PENDING")
    return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "border-[var(--nc-border)] bg-[var(--nc-surface-soft)] text-[var(--nc-text-secondary)]";
}

function maskAccount(value: string): string {
  if (!value) return "—";
  if (value.length <= 4) return value;
  return `•••• ${value.slice(-4)}`;
}

/* ─── component ──────────────────────────────────────────────────────────── */
export default function MarketingPerformanceWorkspace({
  mode,
}: {
  mode: "marketing" | "campaigns";
}) {
  const { lang } = useApp();
  const router = useRouter();
  const isArabic = lang === "AR";
  const t = COPY[lang as keyof typeof COPY] ?? COPY.AR;

  const [data, setData] = useState<MarketingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setData(await getMarketingOverviewAction());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const number = (v: number, digits = 0) =>
    new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(v);

  const money = (v: number) => `${number(v)} ${t.sar}`;

  /* ── Loading ── */
  if (loading) {
    return (
      <div
        className={operationsVisual.page}
        dir={isArabic ? "rtl" : "ltr"}
        aria-busy="true"
        aria-label={t.loading}
      >
        <div className={operationsVisual.pageStack}>
          {/* hero skeleton */}
          <div className={`${operationsVisual.panel} h-[88px] animate-pulse`} />
          {/* metrics skeleton */}
          <div className={operationsVisual.metrics}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="min-h-[98px] animate-pulse rounded-2xl bg-[var(--nc-surface)] dark:bg-white/5"
              />
            ))}
          </div>
          {/* panel skeleton */}
          <div className="h-48 animate-pulse rounded-2xl bg-[var(--nc-surface)] dark:bg-white/5" />
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (failed || !data) {
    return (
      <div
        className={operationsVisual.page}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className={operationsVisual.pageStack}>
          <div className={`${operationsVisual.panelPadded} flex flex-col items-center justify-center gap-4 text-center`}>
            <span
              className="grid h-14 w-14 place-items-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-2xl text-amber-500"
              aria-hidden="true"
            >
              <i className="ph-bold ph-warning-circle" />
            </span>
            <div>
              <h2 className="text-lg font-black text-[var(--nc-text-primary)]">
                {t.errorTitle}
              </h2>
              <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">
                {t.errorDescription}
              </p>
            </div>
            <button
              id="marketing-retry-btn"
              type="button"
              onClick={() => void load()}
              className={operationsVisual.primaryButton}
            >
              {t.retry}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const title = mode === "marketing" ? t.marketingTitle : t.campaignsTitle;
  const description =
    mode === "marketing" ? t.marketingDescription : t.campaignsDescription;
  const eyebrow =
    mode === "marketing"
      ? isArabic
        ? "المصدر → العميل → التحويل → العقد"
        : "Source → lead → conversion → contract"
      : isArabic
        ? "الحملة → القناة → العميل → العائد"
        : "Campaign → channel → lead → return";

  /* ── KPI rows ── */
  const kpiItems = [
    {
      id: "marketing-kpi-leads",
      label: t.leads,
      desc: t.leadsDesc,
      value: number(data.totals.leads),
      icon: UsersRound,
    },
    {
      id: "marketing-kpi-converted",
      label: t.converted,
      desc: t.convertedDesc,
      value: number(data.totals.convertedLeads),
      icon: Funnel,
    },
    {
      id: "marketing-kpi-contracts",
      label: t.contracts,
      desc: t.contractsDesc,
      value: number(data.totals.signedContracts),
      icon: FileCheck2,
    },
    {
      id: "marketing-kpi-value",
      label: t.value,
      desc: t.valueDesc,
      value: money(data.totals.contractValue),
      icon: Banknote,
    },
  ];

  return (
    <main className={`${operationsVisual.page} orca-marketing-final`} dir={isArabic ? "rtl" : "ltr"} data-marketing-contract="dashboard-v2">
      <div className={operationsVisual.pageStack}>
        <OperationsPageHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          icon={Funnel}
          meta={<span className={operationsVisual.statusBadge}>{t.live}</span>}
          actions={
            <button type="button" onClick={() => void load()} className={operationsVisual.iconButton} aria-label={t.retry} title={t.retry}>
              <RefreshCw aria-hidden="true" />
            </button>
          }
        />

        <OperationsKpiGrid aria-label={t.leads}>
          {kpiItems.map((kpi) => (
            <OperationsMetricCard key={kpi.id} id={kpi.id} data-marketing-card="kpi" title={kpi.label} value={kpi.value} description={kpi.desc} icon={kpi.icon} />
          ))}
        </OperationsKpiGrid>

        <OperationsPanel className="overflow-hidden">
          <OperationsPanelHeader title={t.sourcesTitle} description={t.sourcesDesc} icon={Funnel} />
          {data.sources.length === 0 ? (
            <div className="p-3"><OperationsEmptyState>{t.noSources}</OperationsEmptyState></div>
          ) : (
            <OperationsMasterList>
              <div className="orca-platform-grid-header hidden grid-cols-[minmax(150px,1.2fr)_repeat(4,minmax(80px,.7fr))_100px_minmax(120px,1fr)] gap-3 px-3 py-2 font-black text-[var(--nc-text-dim)] lg:grid" aria-hidden="true">
                <span>{t.source}</span><span>{t.leads}</span><span>{t.reservations}</span><span>{t.won}</span><span>{t.contracts}</span><span>{t.conversion}</span><span>{t.value}</span>
              </div>
              {data.sources.map((source) => (
                <div key={source.source} className="orca-platform-grid-row grid min-h-[58px] grid-cols-2 items-center gap-2 rounded-xl border border-transparent px-3 py-2 hover:border-[var(--nc-border)] hover:bg-[var(--nc-surface-soft)] lg:grid-cols-[minmax(150px,1.2fr)_repeat(4,minmax(80px,.7fr))_100px_minmax(120px,1fr)] lg:gap-3">
                  <strong className="truncate text-xs text-[var(--nc-text-primary)]">{source.source}</strong>
                  <span className="text-xs">{number(source.leads)}</span>
                  <span className="text-xs">{number(source.reservations)}</span>
                  <span className="text-xs">{number(source.wonLeads)}</span>
                  <span className="text-xs">{number(source.signedContracts)}</span>
                  <span className="text-xs font-bold text-[var(--nc-accent)]">{number(source.conversionRate, 1)}%</span>
                  <strong className="text-xs text-[var(--nc-text-primary)]">{money(source.contractValue)}</strong>
                </div>
              ))}
            </OperationsMasterList>
          )}
        </OperationsPanel>

        {mode === "marketing" ? (
          <OperationsPanel className="overflow-hidden">
            <OperationsPanelHeader
              title={t.connectionsTitle}
              description={t.connectionsDesc}
              icon={Plug}
              actions={
                <button id="marketing-manage-integrations-btn" type="button" onClick={() => router.push("/operations/settings?tab=advertising")} className={operationsVisual.secondaryButton}>
                  <Plug aria-hidden="true" />{t.settings}
                </button>
              }
            />
            {data.connections.length === 0 ? (
              <div className="p-3"><OperationsEmptyState>{t.noConnections}</OperationsEmptyState></div>
            ) : (
              <OperationsMasterList role="list" aria-label={t.connectionsTitle}>
                {data.connections.map((connection) => (
                  <div key={connection.id} role="listitem" className="grid min-h-[58px] grid-cols-2 items-center gap-2 rounded-xl border border-transparent px-3 py-2 hover:border-[var(--nc-border)] hover:bg-[var(--nc-surface-soft)] md:grid-cols-[minmax(140px,1fr)_minmax(120px,1fr)_110px_140px]">
                    <strong className="truncate text-xs">{connection.platform}</strong>
                    <span className="font-mono text-xs text-[var(--nc-text-secondary)]">{maskAccount(connection.accountId)}</span>
                    <span className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-black ${statusBadgeClass(connection.status)}`}>{statusLabel(connection.status, t)}</span>
                    <span className="text-xs text-[var(--nc-text-dim)] md:text-end">{new Intl.DateTimeFormat(isArabic ? "ar-SA" : "en-US", { dateStyle: "medium" }).format(new Date(connection.updatedAt))}</span>
                  </div>
                ))}
              </OperationsMasterList>
            )}
          </OperationsPanel>
        ) : null}
      </div>
    </main>
  );
}
