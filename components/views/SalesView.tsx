"use client";

import React, { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import LayoutContainer from "@/components/ui/LayoutContainer";
import { SmartCard } from "@/components/ui/SmartCard";
import {
  getSalesPerformanceAction,
  SalesRepKPI,
} from "@/app/actions/sales";
import { useApp } from "@/app/context/AppContext";
import { displayPerson } from "@/lib/display";
import {
  REALTIME_SYNC_EVENT,
  shouldInvalidateFromSync,
} from "@/lib/realtime/client-runtime";

const COPY = {
  AR: {
    title: "أداء فريق المبيعات",
    description: "مؤشرات تشغيلية فعلية مبنية على العملاء المسندين والحجوزات والإغلاقات وأوقات التواصل المسجلة.",
    badge: "بيانات تشغيلية",
    leads: "العملاء المسندون",
    bookings: "الحجوزات",
    contracts: "الإغلاقات",
    conversion: "معدل التحويل",
    leaderboard: "ترتيب فريق المبيعات",
    rank: "الترتيب",
    rep: "المستشار",
    response: "متوسط الاستجابة",
    deals: "حجوزات / إغلاقات",
    performance: "مؤشر الأداء",
    noResponse: "غير متاح",
    minute: "دقيقة",
    noData: "لا توجد بيانات مبيعات مسجلة حاليًا.",
    loading: "جاري تحميل مؤشرات المبيعات...",
    errorTitle: "تعذر تحميل أداء المبيعات",
    errorDescription: "لم يتم جلب المؤشرات التشغيلية الحالية.",
    retry: "إعادة المحاولة",
  },
  EN: {
    title: "Sales Team Performance",
    description: "Operational metrics based on assigned leads, reservations, closures, and recorded contact times.",
    badge: "Operational data",
    leads: "Assigned leads",
    bookings: "Reservations",
    contracts: "Closures",
    conversion: "Conversion rate",
    leaderboard: "Sales team ranking",
    rank: "Rank",
    rep: "Consultant",
    response: "Average response",
    deals: "Reservations / Closures",
    performance: "Performance score",
    noResponse: "Unavailable",
    minute: "min",
    noData: "No sales data is currently recorded.",
    loading: "Loading sales metrics...",
    errorTitle: "Unable to load sales performance",
    errorDescription: "The current operational metrics could not be retrieved.",
    retry: "Try again",
  },
};

export default function SalesView() {
  const { lang } = useApp();
  const isArabic = lang === "AR";
  const t = COPY[lang] || COPY.AR;
  const [rows, setRows] = useState<SalesRepKPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setFailed(false);
    try {
      setRows(await getSalesPerformanceAction());
    } catch {
      setFailed(true);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (shouldInvalidateFromSync(detail, "deals")) {
        void load(false);
      }
    };

    window.addEventListener(REALTIME_SYNC_EVENT, handler);
    return () => window.removeEventListener(REALTIME_SYNC_EVENT, handler);
  }, [load]);

  const number = (value: number, digits = 0) =>
    new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(value);

  const totalLeads = rows.reduce((sum, row) => sum + row.leadsCount, 0);
  const totalBookings = rows.reduce((sum, row) => sum + row.bookings, 0);
  const totalContracts = rows.reduce((sum, row) => sum + row.contracts, 0);
  const totalConverted = totalBookings + totalContracts;
  const conversion =
    totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0;

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

  if (failed && rows.length === 0) {
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
            onClick={() => void load(true)}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--nc-accent)] px-5 text-sm font-bold text-slate-950"
          >
            {t.retry}
          </button>
        </SmartCard>
      </div>
    );
  }

  return (
    <div className="nc-page nc-stack orca-container orca-sales-final pb-10" dir={isArabic ? "rtl" : "ltr"}>
      <PageHeader
        title={t.title}
        description={t.description}
        eyebrow={
          isArabic
            ? "العميل → الاستجابة → الحجز → الإغلاق"
            : "Lead → response → reservation → closure"
        }
        workspace
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--nc-accent)]">
          <i className="ph-bold ph-trend-up" />
          {t.badge}
        </span>
      </PageHeader>

      <LayoutContainer
        workspace
        kpis={
          <>
            {[
              [t.leads, number(totalLeads), "ph-users"],
              [t.bookings, number(totalBookings), "ph-calendar-check"],
              [t.contracts, number(totalContracts), "ph-file-text"],
              [t.conversion, `${number(conversion, 1)}%`, "ph-percent"],
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
          <SmartCard className="orca-workspace-panel overflow-hidden">
            <div className="border-b border-[var(--nc-border)] px-5 py-4">
              <h2 className="text-sm font-black text-[var(--nc-text-primary)]">
                {t.leaderboard}
              </h2>
            </div>

            {rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--nc-text-secondary)]">
                {t.noData}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-[var(--nc-surface)] text-[10px] uppercase tracking-wider text-[var(--nc-text-dim)]">
                    <tr>
                      <th className="px-4 py-3 text-center">{t.rank}</th>
                      <th className="px-4 py-3 text-start">{t.rep}</th>
                      <th className="px-4 py-3 text-center">{t.leads}</th>
                      <th className="px-4 py-3 text-center">{t.response}</th>
                      <th className="px-4 py-3 text-center">{t.conversion}</th>
                      <th className="px-4 py-3 text-center">{t.deals}</th>
                      <th className="px-4 py-3 text-center">{t.performance}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr
                        key={row.id}
                        className="border-t border-[var(--nc-border)] text-[var(--nc-text-primary)]"
                      >
                        <td className="px-4 py-3 text-center font-black">
                          {number(index + 1)}
                        </td>
                        <td className="px-4 py-3">
                          <strong className="block">
                            {displayPerson(
                              row.name,
                              isArabic ? "ar" : "en",
                              { route: "/operations/sales" },
                            )}
                          </strong>
                          <span className="text-[10px] text-[var(--nc-text-dim)]">
                            {row.email}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {number(row.leadsCount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.responseMinutes === null
                            ? t.noResponse
                            : `${number(row.responseMinutes)} ${t.minute}`}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-[var(--nc-accent)]">
                          {number(row.conversionRate, 1)}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          {number(row.bookings)} / {number(row.contracts)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="mx-auto w-28">
                            <div className="h-2 overflow-hidden rounded-full bg-[var(--nc-surface)]">
                              <div
                                className="h-full rounded-full bg-[var(--nc-accent)]"
                                style={{ width: `${row.performanceScore}%` }}
                              />
                            </div>
                            <p className="mt-1 text-center text-[10px] font-bold text-[var(--nc-text-secondary)]">
                              {number(row.performanceScore)}%
                            </p>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SmartCard>
        }
      />
    </div>
  );
}
