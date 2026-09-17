"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCw,
  Wrench,
} from "lucide-react";
import {
  OperationsDialog,
  OperationsEmptyState,
  OperationsExecutiveGrid,
  OperationsFormField,
  OperationsKpiGrid,
  OperationsMasterList,
  OperationsMasterRow,
  OperationsMetricCard,
  OperationsPageHeader,
  OperationsPanel,
  OperationsPanelHeader,
  OperationsTextField,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";

type MaintenanceTicket = {
  id: string;
  title: string;
  status: string;
};

function normalizeStatus(status: string) {
  return status.trim().toUpperCase();
}

function statusLabel(status: string) {
  const value = normalizeStatus(status);
  if (["DONE", "CLOSED", "COMPLETED"].includes(value)) return "مغلقة";
  if (["IN_PROGRESS", "PROCESSING", "ACTIVE"].includes(value)) return "قيد التنفيذ";
  return "مفتوحة";
}

function statusTone(status: string) {
  const value = normalizeStatus(status);
  if (["DONE", "CLOSED", "COMPLETED"].includes(value)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
  if (["IN_PROGRESS", "PROCESSING", "ACTIVE"].includes(value)) {
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [title, setTitle] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/maintenance", {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "تعذر تحميل تذاكر الصيانة.");
      }
      const next: MaintenanceTicket[] = Array.isArray(payload.tickets)
        ? payload.tickets
        : [];
      setTickets(next);
      setSelectedId((current) =>
        current && next.some((ticket) => ticket.id === current)
          ? current
          : next[0]?.id || "",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل تذاكر الصيانة.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("أدخل عنوان التذكرة.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/maintenance", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      const payload = await response.json();
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "تعذر إنشاء تذكرة الصيانة.");
      }
      setTitle("");
      setCreateOpen(false);
      await loadTickets();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إنشاء تذكرة الصيانة.");
    } finally {
      setBusy(false);
    }
  }

  const selected = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedId) || null,
    [tickets, selectedId],
  );
  const openCount = tickets.filter((ticket) => statusLabel(ticket.status) === "مفتوحة").length;
  const activeCount = tickets.filter((ticket) => statusLabel(ticket.status) === "قيد التنفيذ").length;
  const closedCount = tickets.filter((ticket) => statusLabel(ticket.status) === "مغلقة").length;

  return (
    <main className={operationsVisual.page} dir="rtl" data-maintenance-rebuild-v1>
      <div className={operationsVisual.pageStack}>
        <OperationsPageHeader
          eyebrow="الخدمة → المتابعة → الإغلاق"
          title="الصيانة"
          description="تسجيل ومتابعة طلبات الصيانة من سجل تشغيلي موحد."
          icon={Wrench}
          actions={
            <>
              <button
                type="button"
                className={operationsVisual.iconButton}
                onClick={() => void loadTickets()}
                aria-label="تحديث تذاكر الصيانة"
                title="تحديث"
              >
                <RefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={operationsVisual.primaryButton}
                onClick={() => {
                  setTitle("");
                  setError("");
                  setCreateOpen(true);
                }}
              >
                <Plus aria-hidden="true" />
                تذكرة جديدة
              </button>
            </>
          }
        />

        <OperationsKpiGrid>
          <OperationsMetricCard title="إجمالي التذاكر" value={tickets.length} description="كل الطلبات المسجلة" icon={Wrench} />
          <OperationsMetricCard title="مفتوحة" value={openCount} description="تحتاج بدء المعالجة" icon={Clock3} />
          <OperationsMetricCard title="قيد التنفيذ" value={activeCount} description="تحت المعالجة" icon={RefreshCw} />
          <OperationsMetricCard title="مغلقة" value={closedCount} description="تم إنهاؤها" icon={CheckCircle2} />
        </OperationsKpiGrid>

        {error ? (
          <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-300">
            {error}
          </div>
        ) : null}

        <OperationsExecutiveGrid>
          <OperationsPanel className="overflow-hidden" dir="rtl">
            <OperationsPanelHeader title="تذاكر الصيانة" description="القائمة التشغيلية الحالية" icon={Wrench} meta={<span className={operationsVisual.counterBadge}>{tickets.length}</span>} />
            <div className="orca-operations-flow-region">
              {loading ? (
                <div className="p-3"><OperationsEmptyState>جارٍ تحميل التذاكر…</OperationsEmptyState></div>
              ) : tickets.length === 0 ? (
                <div className="p-3"><OperationsEmptyState>لا توجد تذاكر صيانة مسجلة.</OperationsEmptyState></div>
              ) : (
                <OperationsMasterList>
                  {tickets.map((ticket) => (
                    <OperationsMasterRow
                      key={ticket.id}
                      selected={ticket.id === selectedId}
                      onClick={() => setSelectedId(ticket.id)}
                      className="grid min-h-[64px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2"
                    >
                      <span className="min-w-0">
                        <strong className="block truncate text-xs font-black">{ticket.title}</strong>
                        <span className="mt-1 block text-[10px] text-[var(--nc-text-secondary)]">طلب صيانة</span>
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusTone(ticket.status)}`}>
                        {statusLabel(ticket.status)}
                      </span>
                    </OperationsMasterRow>
                  ))}
                </OperationsMasterList>
              )}
            </div>
          </OperationsPanel>

          <OperationsPanel className="overflow-hidden" dir="rtl">
            <OperationsPanelHeader title="تفاصيل التذكرة" description="السجل المحدد" icon={Wrench} />
            <div className="p-3">
              {selected ? (
                <div className="space-y-3">
                  <div className={`${operationsVisual.contentCard} p-3`}>
                    <span className={operationsVisual.meta}>العنوان</span>
                    <strong className="mt-1 block text-sm font-black">{selected.title}</strong>
                  </div>
                  <div className={`${operationsVisual.contentCard} p-3`}>
                    <span className={operationsVisual.meta}>الحالة</span>
                    <div className="mt-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusTone(selected.status)}`}>
                        {statusLabel(selected.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <OperationsEmptyState>اختر تذكرة لعرض تفاصيلها.</OperationsEmptyState>
              )}
            </div>
          </OperationsPanel>
        </OperationsExecutiveGrid>
      </div>

      <OperationsDialog
        open={createOpen}
        onClose={() => !busy && setCreateOpen(false)}
        title="إنشاء تذكرة صيانة"
        description="أدخل عنوانًا واضحًا للمشكلة."
        closeLabel="إغلاق"
        closeDisabled={busy}
        dir="rtl"
        footer={
          <>
            <button type="button" className={operationsVisual.secondaryButton} onClick={() => setCreateOpen(false)} disabled={busy}>
              إلغاء
            </button>
            <button type="submit" form="maintenance-create-form" className={operationsVisual.primaryButton} disabled={busy}>
              {busy ? "جارٍ الإنشاء…" : "إنشاء التذكرة"}
            </button>
          </>
        }
      >
        <form id="maintenance-create-form" onSubmit={createTicket} noValidate>
          <OperationsFormField label="عنوان التذكرة" error={error || undefined}>
            <OperationsTextField value={title} onChange={(event) => setTitle(event.target.value)} autoFocus placeholder="مثال: فحص التكييف في الوحدة" />
          </OperationsFormField>
        </form>
      </OperationsDialog>
    </main>
  );
}
