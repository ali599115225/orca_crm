"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  OperationsEmptyState,
  OperationsKpiGrid,
  OperationsMetricCard,
  OperationsPageHeader,
  OperationsPanel,
  OperationsPanelHeader,
  OperationsTabs,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";

type Tab = "dashboard" | "activity" | "queue" | "devices";

const STATUS_TONE: Record<string, string> = {
  DRAFT: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  ISSUED: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  REPORTED: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  CLEARED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  REJECTED: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  ERROR: "border-red-500/30 bg-red-500/10 text-red-300",
};

function tone(status: string) {
  return STATUS_TONE[status] || "border-slate-500/30 bg-slate-500/10 text-slate-300";
}

export default function CompliancePage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [dashRes, activityRes, queueRes, deviceRes] = await Promise.all([
        fetch("/api/v1/zatca/dashboard", { cache: "no-store" }),
        fetch("/api/v1/zatca/activity", { cache: "no-store" }),
        fetch("/api/v1/zatca/queue", { cache: "no-store" }),
        fetch("/api/v1/zatca/device", { cache: "no-store" }),
      ]);
      const [dash, act, q, dev] = await Promise.all([
        dashRes.json(),
        activityRes.json(),
        queueRes.json(),
        deviceRes.json(),
      ]);

      if (dash.success) setDashboard(dash.dashboard);
      if (act.success) setActivity(Array.isArray(act.activity) ? act.activity : []);
      if (q.success) setQueue(Array.isArray(q.queue) ? q.queue : []);
      if (dev.success) setDevices(Array.isArray(dev.devices) ? dev.devices : []);

      if (!dashRes.ok && !activityRes.ok && !queueRes.ok && !deviceRes.ok) {
        throw new Error("تعذر تحميل بيانات الامتثال.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل بيانات الامتثال.");
    } finally {
      setLoading(false);
    }
  }

  const invoiceStatuses = dashboard?.invoiceStatuses || {};
  const queueStatuses = dashboard?.queueStatuses || {};
  const failedQueue = Number(queueStatuses.FAILED || 0);
  const cleared = Number(invoiceStatuses.CLEARED || 0);
  const rejected = Number(invoiceStatuses.REJECTED || 0) + Number(invoiceStatuses.ERROR || 0);

  const tabs = useMemo(
    () => [
      { id: "dashboard" as const, label: "الملخص", icon: ShieldCheck },
      { id: "activity" as const, label: "النشاط", icon: Activity },
      { id: "queue" as const, label: "قائمة المعالجة", icon: ListChecks },
      { id: "devices" as const, label: "الأجهزة", icon: Smartphone },
    ],
    [],
  );

  return (
    <main className={operationsVisual.page} dir="rtl" data-compliance-rebuild-v1>
      <div className={operationsVisual.pageStack}>
        <OperationsPageHeader
          eyebrow="الفاتورة → التحقق → الإبلاغ → التخليص"
          title="الامتثال والفوترة الإلكترونية"
          description="مراقبة بنية ZATCA وحالات الفواتير وقائمة المعالجة والأجهزة من عقد تشغيلي موحد."
          icon={ShieldCheck}
          meta={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-300">
              <AlertTriangle size={13} aria-hidden="true" />
              الربط الخارجي لم يُختبر بعد
            </span>
          }
          actions={
            <button
              type="button"
              onClick={() => void fetchData()}
              className={operationsVisual.iconButton}
              aria-label="تحديث بيانات الامتثال"
              title="تحديث"
            >
              <RefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
            </button>
          }
        />

        <OperationsKpiGrid>
          <OperationsMetricCard title="إجمالي الفواتير" value={loading ? "…" : dashboard?.totalInvoices ?? 0} description="السجل المتاح" icon={FileCheck2} />
          <OperationsMetricCard title="تم التخليص" value={loading ? "…" : cleared} description="فواتير بحالة CLEARED" icon={CheckCircle2} />
          <OperationsMetricCard title="رفض / خطأ" value={loading ? "…" : rejected} description="تحتاج معالجة" icon={AlertTriangle} />
          <OperationsMetricCard title="الأجهزة النشطة" value={loading ? "…" : dashboard?.activeDevices ?? 0} description="أجهزة ZATCA المسجلة" icon={Smartphone} />
        </OperationsKpiGrid>

        {error ? (
          <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-300">
            {error}
          </div>
        ) : null}

        <OperationsPanel className="overflow-hidden">
          <div className="border-b border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-2 py-1.5">
            <OperationsTabs>
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  onClick={() => setActiveTab(id)}
                  className={activeTab === id ? operationsVisual.activeTab : operationsVisual.tab}
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </OperationsTabs>
          </div>

          {loading ? (
            <div className="p-3"><OperationsEmptyState>جارٍ تحميل بيانات الامتثال…</OperationsEmptyState></div>
          ) : activeTab === "dashboard" ? (
            <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.85fr)]">
              <section className="min-w-0">
                <OperationsPanelHeader title="حالات الفواتير" description="التوزيع الحالي لحالات ZATCA" icon={FileCheck2} />
                <div className="grid gap-2 pt-2 sm:grid-cols-2 xl:grid-cols-3">
                  {Object.keys(STATUS_TONE).map((status) => (
                    <article key={status} className={`${operationsVisual.contentCard} p-3`}>
                      <span className="text-[10px] font-bold text-[var(--nc-text-dim)]">{status}</span>
                      <strong className="mt-2 block text-2xl font-black">{Number(invoiceStatuses[status] || 0)}</strong>
                    </article>
                  ))}
                </div>
              </section>

              <section className="min-w-0">
                <OperationsPanelHeader title="حالة قائمة المعالجة" description="ملخص محاولات الإرسال" icon={ListChecks} />
                <div className="grid gap-2 pt-2">
                  {Object.keys(queueStatuses).length === 0 ? (
                    <OperationsEmptyState>لا توجد حالات Queue متاحة.</OperationsEmptyState>
                  ) : (
                    Object.entries(queueStatuses).map(([status, count]) => (
                      <div key={status} className={`${operationsVisual.contentCard} flex items-center justify-between gap-3 px-3 py-2.5`}>
                        <span className="text-[10px] font-bold text-[var(--nc-text-secondary)]">{status}</span>
                        <strong className={status === "FAILED" ? "text-rose-300" : status === "COMPLETED" ? "text-emerald-300" : ""}>{Number(count)}</strong>
                      </div>
                    ))
                  )}
                  {failedQueue > 0 ? (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[10px] font-bold text-rose-300">
                      توجد {failedQueue} عناصر فاشلة تحتاج مراجعة.
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          ) : activeTab === "activity" ? (
            <ListTab
              title="نشاط الفواتير"
              icon={Activity}
              empty="لا يوجد نشاط ZATCA مسجل."
              rows={activity.map((item) => ({
                key: String(item.id),
                title: `${item.invoicePrefix || "INV"}-${new Date().getFullYear()}-${String(item.invoiceNumber || "").padStart(6, "0")}`,
                subtitle: [item.lease?.tenantName, item.lease?.unitName].filter(Boolean).join(" · ") || "غير محدد",
                status: item.zatcaStatus || "غير محدد",
                error: item.zatcaError || "",
              }))}
            />
          ) : activeTab === "queue" ? (
            <ListTab
              title="قائمة المعالجة"
              icon={ListChecks}
              empty="لا توجد عناصر في قائمة المعالجة."
              rows={queue.map((item) => ({
                key: String(item.id),
                title: `${item.action || "ACTION"} · Invoice #${item.invoice?.invoiceNumber || "—"}`,
                subtitle: `المحاولة ${item.retryCount ?? 0}/${item.maxRetries ?? 0}`,
                status: item.status || "غير محدد",
                error: item.lastError || "",
              }))}
            />
          ) : (
            <ListTab
              title="الأجهزة"
              icon={Smartphone}
              empty="لا توجد أجهزة مسجلة."
              rows={devices.map((device) => ({
                key: String(device.id),
                title: device.deviceName || "جهاز غير مسمى",
                subtitle: device.deviceType || "غير محدد",
                status: device.status || "غير محدد",
                error: "",
              }))}
            />
          )}
        </OperationsPanel>
      </div>
    </main>
  );
}

function ListTab({
  title,
  icon: Icon,
  rows,
  empty,
}: {
  title: string;
  icon: typeof Activity;
  rows: Array<{ key: string; title: string; subtitle: string; status: string; error: string }>;
  empty: string;
}) {
  return (
    <section className="p-3">
      <OperationsPanelHeader title={title} icon={Icon} meta={<span className={operationsVisual.counterBadge}>{rows.length}</span>} />
      <div className="mt-2 grid gap-1.5">
        {rows.length === 0 ? (
          <OperationsEmptyState>{empty}</OperationsEmptyState>
        ) : (
          rows.map((row) => (
            <article key={row.key} className={`${operationsVisual.contentCard} flex items-center justify-between gap-3 px-3 py-2.5`}>
              <div className="min-w-0">
                <strong className="block truncate text-xs font-black">{row.title}</strong>
                <span className="mt-1 block truncate text-[10px] text-[var(--nc-text-secondary)]">{row.subtitle}</span>
                {row.error ? <span className="mt-1 block truncate text-[9px] text-rose-300">{row.error}</span> : null}
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black ${tone(row.status)}`}>
                {row.status}
              </span>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
