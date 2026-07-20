"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import {
  getMarketingOverviewAction,
  MarketingOverview,
} from "@/app/actions/marketing";

/* ─── visual tokens (mirrors dashboardVisual) ──────────────────────────── */
const V = {
  page: "nc-page nc-stack orca-container orca-marketing-final pb-10",
  shell: "space-y-4",
  hero: "orca-workspace-hero",
  metrics: "orca-workspace-metrics",
  metric:
    "orca-workspace-metric group flex min-h-[98px] flex-col justify-between text-start transition-[border-color,background-color,box-shadow] duration-150 hover:!border-[var(--nc-accent-border)] hover:!bg-[var(--nc-surface-soft)] hover:!shadow-sm",
  metricIconTile:
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] text-[var(--nc-text-secondary)] transition-colors duration-150 group-hover:border-[var(--nc-accent-border)] group-hover:bg-[var(--nc-surface-strong)] group-hover:text-[var(--nc-accent)]",
  panel: "orca-workspace-panel",
  sectionTitle: "text-sm font-bold text-[var(--nc-text-primary)]",
  sectionDesc: "mt-0.5 text-xs text-[var(--nc-text-secondary)]",
  eyebrow: "text-xs font-bold text-[var(--nc-accent)]",
  title: "mt-1 text-2xl font-black text-[var(--nc-text-primary)]",
  desc: "mt-1 text-sm text-[var(--nc-text-secondary)]",
  headerSecondaryButton:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-4 text-sm font-bold text-[var(--nc-text-primary)] transition-colors duration-150 hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)] hover:text-[var(--nc-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)] disabled:cursor-not-allowed disabled:opacity-50",
  primaryButton:
    "nc-btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)] disabled:cursor-not-allowed disabled:opacity-50",
  statusBadge:
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black",
  dataRow:
    "orca-data-row border-t border-[var(--nc-border)] transition-colors duration-150",
} as const;

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
        className={V.page}
        dir={isArabic ? "rtl" : "ltr"}
        aria-busy="true"
        aria-label={t.loading}
      >
        <div className={V.shell}>
          {/* hero skeleton */}
          <div className="orca-workspace-panel h-[88px] animate-pulse bg-[var(--nc-surface-strong)]" />
          {/* metrics skeleton */}
          <div className={V.metrics}>
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
        className={V.page}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className={V.shell}>
          <div className="orca-workspace-panel flex flex-col items-center justify-center gap-4 p-12 text-center">
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
              className={V.primaryButton}
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
      icon: "ph-users",
    },
    {
      id: "marketing-kpi-converted",
      label: t.converted,
      desc: t.convertedDesc,
      value: number(data.totals.convertedLeads),
      icon: "ph-funnel",
    },
    {
      id: "marketing-kpi-contracts",
      label: t.contracts,
      desc: t.contractsDesc,
      value: number(data.totals.signedContracts),
      icon: "ph-file-text",
    },
    {
      id: "marketing-kpi-value",
      label: t.value,
      desc: t.valueDesc,
      value: money(data.totals.contractValue),
      icon: "ph-currency-circle-dollar",
    },
  ];

  return (
    <main
      className={V.page}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className={V.shell}>

        {/* ── 1. Header ────────────────────────────────────────────────── */}
        <header className={V.hero} data-marketing-card="title">
          <div className="min-w-0 flex-1">
            <p className={V.eyebrow}>{eyebrow}</p>
            <h1 className={V.title}>{title}</h1>
            <p className={V.desc}>{description}</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            {/* live badge */}
            <span
              className="inline-flex items-center gap-2 rounded-full border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--nc-accent)]"
              aria-label={t.live}
            >
              <i className="ph-bold ph-database" aria-hidden="true" />
              {t.live}
            </span>
          </div>
        </header>

        {/* ── 2. KPI Cards ─────────────────────────────────────────────── */}
        <section className={V.metrics} aria-label={t.leads}>
          {kpiItems.map((kpi) => (
            <div
              key={kpi.id}
              id={kpi.id}
              className={V.metric}
              data-marketing-card="kpi"
            >
              {/* top row: label + icon */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--nc-text-primary)]">
                    {kpi.label}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[var(--nc-text-secondary)]">
                    {kpi.desc}
                  </p>
                </div>
                <span className={V.metricIconTile} aria-hidden="true">
                  <i className={`ph-bold ${kpi.icon} text-[18px]`} />
                </span>
              </div>

              {/* bottom: value */}
              <div className="mt-3">
                <strong className="text-3xl font-black leading-none text-[var(--nc-text-primary)]">
                  {kpi.value}
                </strong>
              </div>
            </div>
          ))}
        </section>

        {/* ── 3. Lead source performance table ─────────────────────────── */}
        <div className={`${V.panel} overflow-hidden`}>
          {/* panel header */}
          <div className="border-b border-[var(--nc-border)] px-5 py-4">
            <h2 className={V.sectionTitle}>{t.sourcesTitle}</h2>
            <p className={V.sectionDesc}>{t.sourcesDesc}</p>
          </div>

          {data.sources.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--nc-text-secondary)]">
              {t.noSources}
            </p>
          ) : (
            <div
              className="overflow-x-auto [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none" }}
            >
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-[var(--nc-surface-solid)] text-[10px] uppercase tracking-wider text-[var(--nc-text-dim)]">
                  <tr>
                    <th
                      scope="col"
                      className="px-5 py-3 text-start font-bold"
                    >
                      {t.source}
                    </th>
                    <th scope="col" className="px-4 py-3 text-center font-bold">
                      {t.leads}
                    </th>
                    <th scope="col" className="px-4 py-3 text-center font-bold">
                      {t.reservations}
                    </th>
                    <th scope="col" className="px-4 py-3 text-center font-bold">
                      {t.won}
                    </th>
                    <th scope="col" className="px-4 py-3 text-center font-bold">
                      {t.contracts}
                    </th>
                    <th scope="col" className="px-4 py-3 text-center font-bold">
                      {t.conversion}
                    </th>
                    <th scope="col" className="px-5 py-3 text-end font-bold">
                      {t.value}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.sources.map((source) => (
                    <tr
                      key={source.source}
                      className={V.dataRow}
                    >
                      <td className="px-5 py-3.5 font-black text-[var(--nc-text-primary)]">
                        {source.source}
                      </td>
                      <td className="px-4 py-3.5 text-center text-[var(--nc-text-primary)]">
                        {number(source.leads)}
                      </td>
                      <td className="px-4 py-3.5 text-center text-[var(--nc-text-primary)]">
                        {number(source.reservations)}
                      </td>
                      <td className="px-4 py-3.5 text-center text-[var(--nc-text-primary)]">
                        {number(source.wonLeads)}
                      </td>
                      <td className="px-4 py-3.5 text-center text-[var(--nc-text-primary)]">
                        {number(source.signedContracts)}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-[var(--nc-accent)]">
                        {number(source.conversionRate, 1)}%
                      </td>
                      <td className="px-5 py-3.5 text-end font-black text-[var(--nc-text-primary)]">
                        {money(source.contractValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── 4. Platform connections ───────────────────────────────────── */}
        {mode === "marketing" && (
          <div className={`${V.panel} overflow-hidden`}>
            {/* panel header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--nc-border)] px-5 py-4">
              <div>
                <h2 className={V.sectionTitle}>{t.connectionsTitle}</h2>
                <p className={V.sectionDesc}>{t.connectionsDesc}</p>
              </div>
              <button
                id="marketing-manage-integrations-btn"
                type="button"
                onClick={() =>
                  router.push("/operations/settings?tab=advertising")
                }
                className={V.headerSecondaryButton}
              >
                <i className="ph-bold ph-plug" aria-hidden="true" />
                {t.settings}
              </button>
            </div>

            {data.connections.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--nc-text-secondary)]">
                {t.noConnections}
              </p>
            ) : (
              <div
                className="divide-y divide-[var(--nc-border)]"
                role="list"
                aria-label={t.connectionsTitle}
              >
                {data.connections.map((connection) => (
                  <div
                    key={connection.id}
                    role="listitem"
                    className="grid grid-cols-1 gap-x-4 gap-y-2 px-5 py-4 sm:grid-cols-2 md:grid-cols-4 md:items-center"
                  >
                    {/* platform name */}
                    <strong className="text-sm font-bold text-[var(--nc-text-primary)]">
                      {connection.platform}
                    </strong>

                    {/* masked account */}
                    <span className="font-mono text-xs text-[var(--nc-text-secondary)]">
                      {maskAccount(connection.accountId)}
                    </span>

                    {/* status badge — translated */}
                    <span
                      className={`${V.statusBadge} w-fit ${statusBadgeClass(connection.status)}`}
                    >
                      {statusLabel(connection.status, t)}
                    </span>

                    {/* last updated */}
                    <span className="text-xs text-[var(--nc-text-dim)] md:text-end">
                      {new Intl.DateTimeFormat(
                        isArabic ? "ar-SA" : "en-US",
                        { dateStyle: "medium" },
                      ).format(new Date(connection.updatedAt))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
