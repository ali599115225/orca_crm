"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import {
  OperationsEmptyState,
  OperationsExecutiveGrid,
  OperationsKpiGrid,
  OperationsMetricCard,
  OperationsPageHeader,
  OperationsPanel,
  OperationsPanelHeader,
  OperationsScrollRegion,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";
import { formatDisplayTime } from "@/lib/display/dateTime";

interface HealthData {
  status: string;
  timestamp: string;
  responseTime: string;
  checks: Record<string, unknown>;
}

function healthTone(status: string) {
  const normalized = status.toLowerCase();
  if (["connected", "operational", "online", "ready", "healthy"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
  if (["degraded", "warning"].includes(normalized)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
  return "border-rose-500/30 bg-rose-500/10 text-rose-300";
}

function checkStatus(value: unknown): string {
  if (!value || typeof value !== "object") return "غير محدد";
  const candidate = (value as Record<string, unknown>).status;
  return typeof candidate === "string" ? candidate : "غير محدد";
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [history, setHistory] = useState<HealthData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/health", { cache: "no-store" });
      const data = (await response.json()) as HealthData;
      setHealth(data);
      setHistory((current) => [...current.slice(-19), data]);
    } catch {
      const unavailable: HealthData = {
        status: "unreachable",
        timestamp: new Date().toISOString(),
        responseTime: "N/A",
        checks: {},
      };
      setHealth(unavailable);
      setHistory((current) => [...current.slice(-19), unavailable]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
    const interval = window.setInterval(() => void fetchHealth(), 30_000);
    return () => window.clearInterval(interval);
  }, [fetchHealth]);

  const checks = useMemo(() => Object.entries(health?.checks || {}), [health]);
  const healthyChecks = checks.filter(([, value]) =>
    ["connected", "operational", "online", "ready", "healthy"].includes(
      checkStatus(value).toLowerCase(),
    ),
  ).length;

  return (
    <main className={operationsVisual.page} dir="rtl" data-health-rebuild-v1>
      <div className={operationsVisual.pageStack}>
        <OperationsPageHeader
          eyebrow="المراقبة → الجاهزية → الاستجابة"
          title="صحة النظام"
          description="مراقبة حالة الخدمات والفحوصات الأساسية وسجل الاستجابة من شاشة تشغيلية واحدة."
          icon={ServerCog}
          actions={
            <button
              type="button"
              className={operationsVisual.iconButton}
              onClick={() => void fetchHealth()}
              disabled={loading}
              aria-label="تحديث صحة النظام"
              title="تحديث"
            >
              <RefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
            </button>
          }
        />

        <OperationsKpiGrid>
          <OperationsMetricCard
            title="الحالة العامة"
            value={loading ? "…" : health?.status === "online" ? "سليم" : health?.status || "—"}
            description="آخر قراءة صحية"
            icon={ShieldCheck}
          />
          <OperationsMetricCard
            title="زمن الاستجابة"
            value={loading ? "…" : health?.responseTime || "—"}
            description="استجابة واجهة الصحة"
            icon={Clock3}
          />
          <OperationsMetricCard
            title="الفحوصات السليمة"
            value={loading ? "…" : `${healthyChecks}/${checks.length}`}
            description="خدمات جاهزة من الإجمالي"
            icon={CheckCircle2}
          />
          <OperationsMetricCard
            title="عينات الجلسة"
            value={history.length}
            description="آخر القراءات المحلية"
            icon={Activity}
          />
        </OperationsKpiGrid>

        <OperationsExecutiveGrid>
          <OperationsPanel className="overflow-hidden" dir="rtl">
            <OperationsPanelHeader
              title="الفحوصات الحالية"
              description="الحالة المباشرة للخدمات التي يعيدها مسار الصحة."
              icon={ServerCog}
              meta={
                health ? (
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${healthTone(health.status)}`}>
                    {health.status}
                  </span>
                ) : null
              }
            />

            <div className="grid gap-2 p-2 md:grid-cols-2 xl:grid-cols-3">
              {checks.length === 0 ? (
                <OperationsEmptyState className="md:col-span-2 xl:col-span-3">
                  لا توجد فحوصات متاحة في الاستجابة الحالية.
                </OperationsEmptyState>
              ) : (
                checks.map(([key, value]) => {
                  const objectValue =
                    value && typeof value === "object"
                      ? (value as Record<string, unknown>)
                      : null;
                  const status = checkStatus(value);
                  return (
                    <article key={key} className={`${operationsVisual.contentCard} p-3`}>
                      <div className="flex items-center justify-between gap-3">
                        <strong className="truncate text-xs font-black uppercase">{key}</strong>
                        <span className={`rounded-full border px-2 py-1 text-[9px] font-black ${healthTone(status)}`}>
                          {status}
                        </span>
                      </div>
                      {objectValue ? (
                        <div className="mt-2 space-y-1 text-[10px] text-[var(--nc-text-secondary)]">
                          {Object.entries(objectValue)
                            .filter(([name]) => name !== "status")
                            .slice(0, 4)
                            .map(([name, detail]) => (
                              <div key={name} className="flex items-center justify-between gap-2">
                                <span className="truncate">{name}</span>
                                <strong className="truncate text-[var(--nc-text-primary)]">{String(detail)}</strong>
                              </div>
                            ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </OperationsPanel>

          <OperationsPanel className="overflow-hidden" dir="rtl">
            <OperationsPanelHeader
              title="سجل الفحوصات"
              description="آخر عشرين قراءة خلال هذه الجلسة."
              icon={Activity}
            />
            <OperationsScrollRegion scrollRole="log" className="p-2">
              {history.length === 0 ? (
                <OperationsEmptyState>لا توجد قراءات سابقة.</OperationsEmptyState>
              ) : (
                <div className="grid gap-1.5">
                  {history
                    .slice()
                    .reverse()
                    .map((item, index) => (
                      <div key={`${item.timestamp}:${index}`} className={`${operationsVisual.contentCard} flex items-center justify-between gap-2 px-3 py-2`}>
                        <span className={`rounded-full border px-2 py-1 text-[9px] font-black ${healthTone(item.status)}`}>
                          {item.status}
                        </span>
                        <time dir="ltr" className="text-[10px] text-[var(--nc-text-secondary)]">
                          {formatDisplayTime(item.timestamp)}
                        </time>
                        <strong className="text-[10px]">{item.responseTime}</strong>
                      </div>
                    ))}
                </div>
              )}
            </OperationsScrollRegion>
          </OperationsPanel>
        </OperationsExecutiveGrid>
      </div>
    </main>
  );
}
