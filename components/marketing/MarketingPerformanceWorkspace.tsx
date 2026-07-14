"use client";

import React, { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import LayoutContainer from "@/components/ui/LayoutContainer";
import { SmartCard } from "@/components/ui/SmartCard";
import { useApp } from "@/app/context/AppContext";
import {
  getMarketingOverviewAction,
  MarketingOverview,
} from "@/app/actions/marketing";

const COPY = {
  AR: {
    marketingTitle: "الإعلان والتسويق",
    marketingDescription: "قراءة أداء مصادر العملاء واتصالات المنصات اعتمادًا على بيانات المستأجر الفعلية.",
    campaignsTitle: "أداء الحملات ومصادر العملاء",
    campaignsDescription: "تحليل التحويل والعقود حسب المصدر المسجل للعميل دون إنشاء حملات أو ميزانيات افتراضية.",
    live: "بيانات تشغيلية",
    leads: "إجمالي العملاء",
    converted: "عملاء متقدمون",
    contracts: "عقود موقعة",
    value: "قيمة العقود",
    sources: "أداء مصادر العملاء",
    source: "المصدر",
    reservations: "حجوزات",
    won: "إغلاق ناجح",
    conversion: "التحويل",
    connections: "اتصالات المنصات",
    platform: "المنصة",
    account: "الحساب",
    status: "الحالة",
    updated: "آخر تحديث",
    noSources: "لا توجد بيانات مصادر عملاء مسجلة حاليًا.",
    noConnections: "لا توجد اتصالات منصات محفوظة لهذا المستأجر.",
    settings: "إدارة التكاملات",
    loading: "جاري تحميل البيانات التشغيلية...",
    errorTitle: "تعذر تحميل بيانات التسويق",
    errorDescription: "لم يتم جلب البيانات التشغيلية الحالية.",
    retry: "إعادة المحاولة",
    sar: "ر.س",
  },
  EN: {
    marketingTitle: "Advertising & Marketing",
    marketingDescription: "Operational performance for lead sources and platform connections using tenant-scoped data.",
    campaignsTitle: "Campaign & Lead Source Performance",
    campaignsDescription: "Conversion and signed-contract analysis by recorded lead source, without generated campaigns or budgets.",
    live: "Operational data",
    leads: "Total leads",
    converted: "Advanced leads",
    contracts: "Signed contracts",
    value: "Contract value",
    sources: "Lead source performance",
    source: "Source",
    reservations: "Reservations",
    won: "Successful closures",
    conversion: "Conversion",
    connections: "Platform connections",
    platform: "Platform",
    account: "Account",
    status: "Status",
    updated: "Last updated",
    noSources: "No lead source data is currently recorded.",
    noConnections: "No platform connections are saved for this tenant.",
    settings: "Manage integrations",
    loading: "Loading operational data...",
    errorTitle: "Unable to load marketing data",
    errorDescription: "The current operational data could not be retrieved.",
    retry: "Try again",
    sar: "SAR",
  },
};

export default function MarketingPerformanceWorkspace({
  mode,
}: {
  mode: "marketing" | "campaigns";
}) {
  const { lang } = useApp();
  const isArabic = lang === "AR";
  const t = COPY[lang] || COPY.AR;
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

  const number = (value: number, digits = 0) =>
    new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(value);

  const money = (value: number) => `${number(value)} ${t.sar}`;

  const maskAccount = (value: string) => {
    if (!value) return "—";
    if (value.length <= 4) return value;
    return `•••• ${value.slice(-4)}`;
  };

  const statusClass = (status: string) => {
    const normalized = status.toUpperCase();
    if (normalized === "CONNECTED" || normalized === "ACTIVE") {
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600";
    }
    if (normalized === "PENDING") {
      return "border-amber-500/30 bg-amber-500/10 text-amber-600";
    }
    return "border-[var(--nc-border)] bg-[var(--nc-surface)] text-[var(--nc-text-secondary)]";
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--nc-accent-border)] border-t-transparent" />
        <p className="text-sm font-bold text-[var(--nc-text-secondary)]">
          {t.loading}
        </p>
      </div>
    );
  }

  if (failed || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6" dir={isArabic ? "rtl" : "ltr"}>
        <SmartCard className="w-full max-w-xl p-8 text-center">
          <i className="ph-bold ph-warning-circle text-3xl text-amber-500" />
          <h2 className="mt-4 text-lg font-black text-[var(--nc-text-primary)]">
            {t.errorTitle}
          </h2>
          <p className="mt-2 text-sm text-[var(--nc-text-secondary)]">
            {t.errorDescription}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--nc-accent)] px-5 text-sm font-bold text-slate-950"
          >
            {t.retry}
          </button>
        </SmartCard>
      </div>
    );
  }

  const title = mode === "marketing" ? t.marketingTitle : t.campaignsTitle;
  const description =
    mode === "marketing"
      ? t.marketingDescription
      : t.campaignsDescription;

  return (
    <div className="nc-page nc-stack orca-container orca-marketing-final pb-10" dir={isArabic ? "rtl" : "ltr"}>
      <PageHeader
        title={title}
        description={description}
        eyebrow={
          mode === "marketing"
            ? isArabic
              ? "المصدر → العميل → التحويل → العقد"
              : "Source → lead → conversion → contract"
            : isArabic
              ? "الحملة → القناة → العميل → العائد"
              : "Campaign → channel → lead → return"
        }
        workspace
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--nc-accent)]">
          <i className="ph-bold ph-database" />
          {t.live}
        </span>
      </PageHeader>

      <LayoutContainer
        workspace
        kpis={
          <>
            {[
              [t.leads, number(data.totals.leads), "ph-users"],
              [t.converted, number(data.totals.convertedLeads), "ph-funnel"],
              [t.contracts, number(data.totals.signedContracts), "ph-file-text"],
              [t.value, money(data.totals.contractValue), "ph-currency-circle-dollar"],
            ].map(([label, value, icon]) => (
              <SmartCard key={label} elevation="elevated" className="orca-workspace-metric p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--nc-text-dim)]">
                      {label}
                    </p>
                    <p className="mt-2 text-xl font-black text-[var(--nc-text-primary)]">
                      {value}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--nc-accent-soft)] text-[var(--nc-accent)]">
                    <i className={`ph-bold ${icon}`} />
                  </span>
                </div>
              </SmartCard>
            ))}
          </>
        }
        details={
          <div className="space-y-5">
            <SmartCard className="orca-workspace-panel overflow-hidden">
              <div className="border-b border-[var(--nc-border)] px-5 py-4">
                <h2 className="text-sm font-black text-[var(--nc-text-primary)]">
                  {t.sources}
                </h2>
              </div>

              {data.sources.length === 0 ? (
                <p className="p-8 text-center text-sm text-[var(--nc-text-secondary)]">
                  {t.noSources}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-[var(--nc-surface)] text-[10px] uppercase tracking-wider text-[var(--nc-text-dim)]">
                      <tr>
                        <th className="px-4 py-3 text-start">{t.source}</th>
                        <th className="px-4 py-3 text-center">{t.leads}</th>
                        <th className="px-4 py-3 text-center">{t.reservations}</th>
                        <th className="px-4 py-3 text-center">{t.won}</th>
                        <th className="px-4 py-3 text-center">{t.contracts}</th>
                        <th className="px-4 py-3 text-center">{t.conversion}</th>
                        <th className="px-4 py-3 text-end">{t.value}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sources.map((source) => (
                        <tr
                          key={source.source}
                          className="border-t border-[var(--nc-border)] text-[var(--nc-text-primary)]"
                        >
                          <td className="px-4 py-3 font-black">{source.source}</td>
                          <td className="px-4 py-3 text-center">{number(source.leads)}</td>
                          <td className="px-4 py-3 text-center">{number(source.reservations)}</td>
                          <td className="px-4 py-3 text-center">{number(source.wonLeads)}</td>
                          <td className="px-4 py-3 text-center">{number(source.signedContracts)}</td>
                          <td className="px-4 py-3 text-center font-bold text-[var(--nc-accent)]">
                            {number(source.conversionRate, 1)}%
                          </td>
                          <td className="px-4 py-3 text-end font-black">
                            {money(source.contractValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SmartCard>

            {mode === "marketing" && (
              <SmartCard className="orca-workspace-panel overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--nc-border)] px-5 py-4">
                  <h2 className="text-sm font-black text-[var(--nc-text-primary)]">
                    {t.connections}
                  </h2>
                  <button
                    type="button"
                    onClick={() => window.location.assign("/operations/settings?tab=advertising")}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--nc-border)] px-4 text-sm font-semibold text-[var(--nc-text-primary)]"
                  >
                    {t.settings}
                  </button>
                </div>

                {data.connections.length === 0 ? (
                  <p className="p-8 text-center text-sm text-[var(--nc-text-secondary)]">
                    {t.noConnections}
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--nc-border)]">
                    {data.connections.map((connection) => (
                      <div
                        key={connection.id}
                        className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-4 md:items-center"
                      >
                        <strong className="text-sm text-[var(--nc-text-primary)]">
                          {connection.platform}
                        </strong>
                        <span className="text-xs text-[var(--nc-text-secondary)]">
                          {maskAccount(connection.accountId)}
                        </span>
                        <span
                          className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass(connection.status)}`}
                        >
                          {connection.status}
                        </span>
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
              </SmartCard>
            )}
          </div>
        }
      />
    </div>
  );
}
