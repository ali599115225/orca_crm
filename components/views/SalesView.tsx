"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  FileCheck2,
  Percent,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { getSalesPerformanceAction, SalesRepKPI } from "@/app/actions/sales";
import { useApp } from "@/app/context/AppContext";
import { displayPerson } from "@/lib/display";
import {
  REALTIME_SYNC_EVENT,
  shouldInvalidateFromSync,
} from "@/lib/realtime/client-runtime";
import {
  OperationsEmptyState,
  OperationsKpiGrid,
  OperationsMetricCard,
  OperationsPageHeader,
  OperationsPanel,
  OperationsPanelHeader,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";

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
    response: "متوسط الاستجابة",
    deals: "الحجوزات / الإغلاقات",
    performance: "الأداء",
    noResponse: "غير متاح",
    minute: "دقيقة",
    noData: "لا توجد بيانات مبيعات مسجلة حاليًا.",
    loading: "جاري تحميل مؤشرات المبيعات…",
    errorTitle: "تعذر تحميل أداء المبيعات",
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
    response: "Average response",
    deals: "Reservations / Closures",
    performance: "Performance",
    noResponse: "Unavailable",
    minute: "min",
    noData: "No sales data is currently recorded.",
    loading: "Loading sales metrics…",
    errorTitle: "Unable to load sales performance",
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
      if (shouldInvalidateFromSync(detail, "deals")) void load(false);
    };
    window.addEventListener(REALTIME_SYNC_EVENT, handler);
    return () => window.removeEventListener(REALTIME_SYNC_EVENT, handler);
  }, [load]);

  const number = (value: number, digits = 0) =>
    new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(value);

  const totals = useMemo(() => {
    const leads = rows.reduce((sum, row) => sum + row.leadsCount, 0);
    const bookings = rows.reduce((sum, row) => sum + row.bookings, 0);
    const contracts = rows.reduce((sum, row) => sum + row.contracts, 0);
    const conversion = leads > 0 ? ((bookings + contracts) / leads) * 100 : 0;
    return { leads, bookings, contracts, conversion };
  }, [rows]);

  return (
    <main className={operationsVisual.page} dir={isArabic ? "rtl" : "ltr"} data-sales-rebuild-v1>
      <div className={operationsVisual.pageStack}>
        <OperationsPageHeader
          eyebrow={isArabic ? "العميل → الاستجابة → الحجز → الإغلاق" : "Lead → response → reservation → closure"}
          title={t.title}
          description={t.description}
          icon={TrendingUp}
          meta={<span className={operationsVisual.statusBadge}>{t.badge}</span>}
          actions={
            <button type="button" className={operationsVisual.iconButton} onClick={() => void load(true)} aria-label={isArabic ? "تحديث الأداء" : "Refresh performance"} title={t.retry}>
              <RefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
            </button>
          }
        />

        <OperationsKpiGrid>
          <OperationsMetricCard title={t.leads} value={loading ? "…" : number(totals.leads)} description={t.badge} icon={Users} />
          <OperationsMetricCard title={t.bookings} value={loading ? "…" : number(totals.bookings)} description={t.badge} icon={CalendarCheck2} />
          <OperationsMetricCard title={t.contracts} value={loading ? "…" : number(totals.contracts)} description={t.badge} icon={FileCheck2} />
          <OperationsMetricCard title={t.conversion} value={loading ? "…" : `${number(totals.conversion, 1)}%`} description={t.performance} icon={Percent} />
        </OperationsKpiGrid>

        {failed && rows.length === 0 ? (
          <OperationsPanel padded>
            <OperationsEmptyState>
              <div className="space-y-3">
                <strong className="block text-sm text-[var(--nc-text-primary)]">{t.errorTitle}</strong>
                <button type="button" className={operationsVisual.secondaryButton} onClick={() => void load(true)}>{t.retry}</button>
              </div>
            </OperationsEmptyState>
          </OperationsPanel>
        ) : (
          <OperationsPanel className="overflow-hidden">
            <OperationsPanelHeader title={t.leaderboard} description={t.description} icon={TrendingUp} meta={<span className={operationsVisual.counterBadge}>{rows.length}</span>} />
            {loading ? (
              <div className="p-3"><OperationsEmptyState>{t.loading}</OperationsEmptyState></div>
            ) : rows.length === 0 ? (
              <div className="p-3"><OperationsEmptyState>{t.noData}</OperationsEmptyState></div>
            ) : (
              <div className="grid gap-1.5 p-2">
                <div className="orca-platform-grid-header hidden grid-cols-[60px_minmax(170px,1.4fr)_110px_110px_110px_150px] gap-3 px-3 py-1 font-black text-[var(--nc-text-dim)] lg:grid">
                  <span>#</span><span>{isArabic ? "المستشار" : "Consultant"}</span><span>{t.leads}</span><span>{t.response}</span><span>{t.deals}</span><span>{t.performance}</span>
                </div>
                {rows.map((row, index) => (
                  <article key={row.id} className={`${operationsVisual.contentCard} orca-platform-grid-row grid min-h-[68px] items-center gap-3 px-3 py-2 lg:grid-cols-[60px_minmax(170px,1.4fr)_110px_110px_110px_150px]`}>
                    <strong className="text-xs font-black">{number(index + 1)}</strong>
                    <div className="min-w-0">
                      <strong className="block truncate text-xs font-black">{displayPerson(row.name, isArabic ? "ar" : "en", { route: "/operations/sales" })}</strong>
                      <span className="mt-1 block truncate text-[10px] text-[var(--nc-text-dim)]">{row.email}</span>
                    </div>
                    <span className="text-xs font-bold">{number(row.leadsCount)}</span>
                    <span className="text-xs font-bold">{row.responseMinutes === null ? t.noResponse : `${number(row.responseMinutes)} ${t.minute}`}</span>
                    <span className="text-xs font-bold">{number(row.bookings)} / {number(row.contracts)}</span>
                    <div className="min-w-0">
                      <div className={operationsVisual.progressTrack}>
                        <div className={operationsVisual.progressBar} style={{ width: `${Math.min(100, Math.max(0, row.performanceScore))}%` }} />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[9px]">
                        <span className="text-[var(--nc-text-dim)]">{number(row.conversionRate, 1)}%</span>
                        <strong>{number(row.performanceScore)}%</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </OperationsPanel>
        )}
      </div>
    </main>
  );
}
