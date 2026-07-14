"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Handshake,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  TrendingUp,
  X,
} from "lucide-react";
import SettingsSelect from "@/components/settings/SettingsSelect";
import { useApp } from "@/app/context/AppContext";

type OfferRow = {
  id: string;
  status: string;
  storedStatus: string;
  price: number;
  askingPrice: number;
  discountAmount: number;
  discountPercent: number;
  validUntil: string;
  expiresInDays: number;
  documentUrl: string | null;
  createdAt: string;
  opportunityId: string;
  opportunityStatus: string;
  probability: number;
  leadId: string;
  customerName: string;
  customerPhone: string;
  unitId: string | null;
  unitNumber: string;
  unitStatus: string;
  projectId: string | null;
  projectName: string;
  contractId: string | null;
  contractStatus: string | null;
  tourCount: number;
};

type OpportunityOption = {
  id: string;
  status: string;
  value: number;
  probability: number;
  leadId: string;
  customerName: string;
  customerPhone: string;
  unitId: string;
  unitNumber: string;
  unitStatus: string;
  askingPrice: number;
  projectName: string;
};

type Stats = {
  total: number;
  active: number;
  expiringSoon: number;
  accepted: number;
  converted: number;
  activeValue: number;
};

const EMPTY_STATS: Stats = {
  total: 0,
  active: 0,
  expiringSoon: 0,
  accepted: 0,
  converted: 0,
  activeValue: 0,
};

const STATUS_OPTIONS = [
  { value: "", label: "كل الحالات" },
  { value: "PENDING", label: "مسودة / معلّق" },
  { value: "SENT", label: "مرسل" },
  { value: "NEGOTIATION", label: "قيد التفاوض" },
  { value: "ACCEPTED", label: "مقبول" },
  { value: "REJECTED", label: "مرفوض" },
  { value: "EXPIRED", label: "منتهي" },
];

function money(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function shortDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function statusLabel(status: string, ar: boolean) {
  const labels: Record<string, [string, string]> = {
    PENDING: ["مسودة / معلّق", "Draft / pending"],
    SENT: ["مرسل", "Sent"],
    NEGOTIATION: ["قيد التفاوض", "Negotiation"],
    ACCEPTED: ["مقبول", "Accepted"],
    REJECTED: ["مرفوض", "Rejected"],
    EXPIRED: ["منتهي", "Expired"],
  };
  const item = labels[status] || [status, status];
  return ar ? item[0] : item[1];
}

function statusClass(status: string) {
  if (status === "ACCEPTED") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "REJECTED" || status === "EXPIRED") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (status === "NEGOTIATION") return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  if (status === "SENT") return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

const PAGE_SIZE = 5;

export default function OffersWorkspace({
  canWrite,
}: {
  canWrite: boolean;
}) {
  const { lang } = useApp();
  const searchParams = useSearchParams();
  const ar = lang !== "EN";
  const locale = ar ? "ar-SA" : "en-SA";
  const t = (arabic: string, english: string) => (ar ? arabic : english);

  const [rows, setRows] = useState<OfferRow[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityOption[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [opportunityId, setOpportunityId] = useState("");
  const [price, setPrice] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [tourStart, setTourStart] = useState("");
  const [tourNotes, setTourNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/offers", {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "تعذر تحميل العروض.");
      }
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setOpportunities(
        Array.isArray(payload.opportunities) ? payload.opportunities : [],
      );
      setStats(payload.stats || EMPTY_STATS);
      setSelectedId((current) => {
        if (current && payload.data?.some((row: OfferRow) => row.id === current)) {
          return current;
        }
        return payload.data?.[0]?.id || "";
      });
    } catch {
      setRows([]);
      setError(t("تعذر تحميل العروض العقارية.", "Unable to load offers."));
    } finally {
      setLoading(false);
    }
  }, [ar]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const requestedOffer = searchParams.get("offerId");
    const requestedUnit = searchParams.get("unitId");
    const match = rows.find(
      (row) =>
        (requestedOffer && row.id === requestedOffer) ||
        (requestedUnit && row.unitId === requestedUnit),
    );
    if (match) setSelectedId(match.id);
  }, [rows, searchParams]);

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) || null,
    [rows, selectedId],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = !status || row.status === status;
      const haystack = [
        row.customerName,
        row.customerPhone,
        row.unitNumber,
        row.projectName,
        row.status,
      ]
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!term || haystack.includes(term));
    });
  }, [rows, search, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );
  useEffect(() => {
    setPage(1);
  }, [search, status]);


  const selectedOpportunity = opportunities.find(
    (item) => item.id === opportunityId,
  );

  function resetCreate() {
    setOpportunityId("");
    setPrice("");
    setValidUntil("");
  }

  async function createOffer(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedOpportunity) return;
    setBusy("create");
    setError("");
    try {
      const response = await fetch("/api/v1/offers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedOpportunityId: selectedOpportunity.id,
          unitId: selectedOpportunity.unitId,
          price: Number(price),
          validUntil,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "تعذر إنشاء العرض.");
      }
      setCreateOpen(false);
      resetCreate();
      setNotice(t("تم إنشاء العرض وربطه بالفرصة والوحدة.", "Offer created and linked."));
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("تعذر إنشاء العرض.", "Unable to create offer."),
      );
    } finally {
      setBusy("");
    }
  }

  async function updateStatus(nextStatus: string) {
    if (!selected) return;
    setBusy(`status:${nextStatus}`);
    setError("");
    try {
      const response = await fetch(`/api/v1/offers/${selected.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "تعذر تحديث العرض.");
      }
      setNotice(t("تم تحديث مسار العرض.", "Offer lifecycle updated."));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحديث العرض.");
    } finally {
      setBusy("");
    }
  }

  async function acceptOffer() {
    if (!selected) return;
    setBusy("accept");
    setError("");
    try {
      const response = await fetch(`/api/v1/offers/${selected.id}/accept`, {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "تعذر قبول العرض.");
      }
      window.location.assign(
        `/operations/rental/sales/contracts/${payload.data.contractId}`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر قبول العرض.");
      setBusy("");
    }
  }

  async function scheduleTour(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy("tour");
    setError("");
    try {
      const response = await fetch(`/api/v1/offers/${selected.id}/tours`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: tourStart,
          durationMinutes: 45,
          notes: tourNotes,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "تعذر جدولة الجولة.");
      }
      setTourOpen(false);
      setTourStart("");
      setTourNotes("");
      setNotice(t("تمت جدولة الجولة وربطها بالعرض.", "Tour scheduled and linked."));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر جدولة الجولة.");
    } finally {
      setBusy("");
    }
  }

  const cards = [
    { label: t("إجمالي العروض", "Total offers"), value: stats.total, icon: FileText },
    { label: t("العروض النشطة", "Active offers"), value: stats.active, icon: TrendingUp },
    { label: t("تنتهي خلال 7 أيام", "Expiring in 7 days"), value: stats.expiringSoon, icon: Clock3 },
    { label: t("محوّلة إلى عقود", "Converted to contracts"), value: stats.converted, icon: CheckCircle2 },
  ];

  return (
    <section dir={ar ? "rtl" : "ltr"} className="nc-page nc-stack orca-container pb-10">
      <header className="orca-workspace-hero">
        <div>
          <p className="text-xs font-bold text-[var(--nc-accent)]">
            {t("العرض → التفاوض → القبول → العقد", "Offer → negotiation → acceptance → contract")}
          </p>
          <h1 className="mt-1 text-2xl font-black text-[var(--nc-text-primary)]">
            {t("مركز العروض العقارية", "Property Offer Command Center")}
          </h1>
          <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">
            {t("إدارة العروض التجارية الحقيقية دون خلطها بمخزون الوحدات.", "Manage real commercial offers without mixing them with inventory.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} className="nc-btn nc-btn-ghost">
            <RefreshCw size={15} /> {t("تحديث", "Refresh")}
          </button>
          {canWrite && (
            <button type="button" onClick={() => setCreateOpen(true)} className="nc-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black">
              <Plus size={16} /> {t("عرض جديد", "New offer")}
            </button>
          )}
        </div>
      </header>

      <div className="orca-workspace-metrics">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="orca-workspace-metric">
            <div className="flex items-center justify-between text-[var(--nc-text-secondary)]">
              <span className="text-xs font-bold">{label}</span><Icon size={17} />
            </div>
            <strong className="mt-3 block text-2xl text-[var(--nc-text-primary)]">{value.toLocaleString(locale)}</strong>
          </div>
        ))}
      </div>

      {(error || notice) && (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${error ? "border-rose-500/30 bg-rose-500/10 text-rose-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"}`}>
          {error || notice}
        </div>
      )}

      <div className="space-y-4">
        <div className="orca-workspace-panel min-w-0 overflow-hidden">
          <div className="orca-workspace-toolbar flex flex-col gap-3 md:flex-row">
            <label className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nc-text-dim)]" size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("ابحث بالعميل أو الوحدة أو المشروع", "Search customer, unit, or project")} className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] py-2.5 pl-3 pr-10 text-sm outline-none" />
            </label>
            <SettingsSelect value={status} onChange={setStatus} options={STATUS_OPTIONS.map((item) => ({ ...item, label: ar ? item.label : item.value || "All statuses" }))} className="md:w-52" aria-label={t("تصفية الحالة", "Status filter")} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-[var(--nc-border)] text-xs text-[var(--nc-text-secondary)]">
                <tr>
                  <th className="px-4 py-3 text-start">{t("العميل", "Customer")}</th>
                  <th className="px-4 py-3 text-start">{t("الوحدة", "Unit")}</th>
                  <th className="px-4 py-3 text-start">{t("السعر", "Price")}</th>
                  <th className="px-4 py-3 text-start">{t("الصلاحية", "Validity")}</th>
                  <th className="px-4 py-3 text-start">{t("الحالة", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-10 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-10 text-center text-[var(--nc-text-secondary)]">{t("لا توجد عروض مطابقة.", "No matching offers.")}</td></tr>
                ) : paged.map((row) => (
                  <tr key={row.id} onClick={() => setSelectedId(row.id)} className={`orca-data-row cursor-pointer border-b border-[var(--nc-border)] ${selectedId === row.id ? "is-selected" : ""}`}>
                    <td className="px-4 py-3"><strong>{row.customerName}</strong><span className="block text-xs text-[var(--nc-text-secondary)]">{row.customerPhone}</span></td>
                    <td className="px-4 py-3">{row.unitNumber}<span className="block text-xs text-[var(--nc-text-secondary)]">{row.projectName}</span></td>
                    <td className="px-4 py-3 font-bold">{money(row.price, locale)}{row.discountPercent > 0 && <span className="block text-xs text-amber-300">-{row.discountPercent.toFixed(1)}%</span>}</td>
                    <td className="px-4 py-3">{shortDate(row.validUntil, locale)}<span className="block text-xs text-[var(--nc-text-secondary)]">{row.expiresInDays >= 0 ? t(`متبقي ${row.expiresInDays} يوم`, `${row.expiresInDays} days left`) : t("منتهي", "Expired")}</span></td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(row.status)}`}>{statusLabel(row.status, ar)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} locale={locale} ar={ar} onPage={setPage} />
        </div>

        <aside className="orca-workspace-panel p-5">
          {selected ? (
            <div className="orca-workspace-detail">
              <div className="orca-detail-header">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0"><p className="text-xs text-[var(--nc-text-secondary)]">{selected.projectName}</p><h2 className="text-lg font-black">{selected.customerName}</h2><p className="text-sm text-[var(--nc-text-secondary)]">{selected.unitNumber}</p></div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(selected.status)}`}>{statusLabel(selected.status, ar)}</span>
                </div>
              </div>
              <div className="orca-detail-primary rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-4 text-sm">
                <Info label={t("سعر العرض", "Offer price")} value={money(selected.price, locale)} />
                <Info label={t("السعر الأساسي", "Asking price")} value={money(selected.askingPrice, locale)} />
                <Info label={t("الخصم", "Discount")} value={money(selected.discountAmount, locale)} />
                <Info label={t("الجولات المرتبطة", "Linked tours")} value={String(selected.tourCount)} />
                <Info label={t("احتمالية الفرصة", "Opportunity probability")} value={`${selected.probability}%`} />
              </div>
              {selected.contractId ? (
                <button type="button" onClick={() => window.location.assign(`/operations/rental/sales/contracts/${selected.contractId}`)} className="orca-detail-secondary nc-btn-primary w-full rounded-xl py-2.5 font-black">
                  {t("فتح العقد الناتج", "Open resulting contract")}
                </button>
              ) : canWrite ? (
                <div className="orca-detail-secondary grid gap-2">
                  <button type="button" onClick={() => setTourOpen(true)} disabled={!selected.unitId || busy !== ""} className="nc-btn nc-btn-ghost justify-center"><CalendarClock size={15} /> {t("جدولة جولة مرتبطة", "Schedule linked tour")}</button>
                  {selected.status === "PENDING" && <button type="button" onClick={() => void updateStatus("SENT")} disabled={busy !== ""} className="nc-btn nc-btn-ghost justify-center"><Send size={15} /> {t("تسجيل الإرسال", "Mark sent")}</button>}
                  {["PENDING", "SENT"].includes(selected.status) && <button type="button" onClick={() => void updateStatus("NEGOTIATION")} disabled={busy !== ""} className="nc-btn nc-btn-ghost justify-center"><Handshake size={15} /> {t("بدء التفاوض", "Start negotiation")}</button>}
                  {["PENDING", "SENT", "NEGOTIATION"].includes(selected.status) && <button type="button" onClick={() => void acceptOffer()} disabled={busy !== "" || selected.expiresInDays < 0} className="nc-btn-primary rounded-xl py-2.5 font-black">{busy === "accept" ? t("جارٍ التحويل...", "Converting...") : t("قبول وتحويل إلى عقد", "Accept and convert to contract")}</button>}
                  {["PENDING", "SENT", "NEGOTIATION"].includes(selected.status) && <button type="button" onClick={() => void updateStatus("REJECTED")} disabled={busy !== ""} className="rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-300">{t("تسجيل الرفض", "Mark rejected")}</button>}
                </div>
              ) : (
                <p className="rounded-xl border border-[var(--nc-border)] p-3 text-center text-xs text-[var(--nc-text-secondary)]">{t("صلاحية قراءة فقط.", "Read-only access.")}</p>
              )}
            </div>
          ) : <p className="py-16 text-center text-sm text-[var(--nc-text-secondary)]">{t("اختر عرضًا لعرض التفاصيل.", "Select an offer.")}</p>}
        </aside>
      </div>

      {createOpen && (
        <Modal title={t("إنشاء عرض تجاري", "Create commercial offer")} onClose={() => setCreateOpen(false)}>
          <form onSubmit={createOffer} className="space-y-4">
            <Field label={t("الفرصة المرتبطة", "Linked opportunity")}>
              <SettingsSelect value={opportunityId} onChange={(value) => { setOpportunityId(value); const item = opportunities.find((option) => option.id === value); setPrice(item ? String(item.askingPrice) : ""); }} options={opportunities.map((item) => ({ value: item.id, label: `${item.customerName} · ${item.projectName} · ${item.unitNumber}` }))} placeholder={t("اختر فرصة مرتبطة بوحدة", "Choose an opportunity")} />
            </Field>
            {selectedOpportunity && <div className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3 text-xs"><Info label={t("الوحدة", "Unit")} value={`${selectedOpportunity.projectName} · ${selectedOpportunity.unitNumber}`} /><Info label={t("السعر الأساسي", "Asking price")} value={money(selectedOpportunity.askingPrice, locale)} /></div>}
            <Field label={t("سعر العرض", "Offer price")}><input type="number" min="1" value={price} onChange={(event) => setPrice(event.target.value)} required className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5" /></Field>
            <Field label={t("صالح حتى", "Valid until")}><input type="date" dir="ltr" lang="en-CA" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} required className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5" /></Field>
            <button type="submit" disabled={busy === "create" || !selectedOpportunity} className="nc-btn-primary w-full rounded-xl py-2.5 font-black">{busy === "create" ? t("جارٍ الإنشاء...", "Creating...") : t("إنشاء العرض", "Create offer")}</button>
          </form>
        </Modal>
      )}

      {tourOpen && selected && (
        <Modal title={t("جدولة جولة مرتبطة بالعرض", "Schedule offer-linked tour")} onClose={() => setTourOpen(false)}>
          <form onSubmit={scheduleTour} className="space-y-4">
            <p className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3 text-sm">{selected.customerName} · {selected.projectName} · {selected.unitNumber}</p>
            <Field label={t("موعد الجولة", "Tour time")}><input type="datetime-local" dir="ltr" lang="en-CA" value={tourStart} onChange={(event) => setTourStart(event.target.value)} required className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5" /></Field>
            <Field label={t("ملاحظات", "Notes")}><textarea value={tourNotes} onChange={(event) => setTourNotes(event.target.value)} rows={3} className="orca-form-textarea w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5" /></Field>
            <button type="submit" disabled={busy === "tour"} className="nc-btn-primary w-full rounded-xl py-2.5 font-black">{busy === "tour" ? t("جارٍ الحفظ...", "Saving...") : t("تأكيد الجولة", "Confirm tour")}</button>
          </form>
        </Modal>
      )}
    </section>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  locale,
  ar,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  locale: string;
  ar: boolean;
  onPage: (page: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--nc-border)] px-4 py-3 text-xs text-[var(--nc-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
      <span>
        {ar
          ? `عرض ${start.toLocaleString(locale)}–${end.toLocaleString(locale)} من ${total.toLocaleString(locale)}`
          : `Showing ${start.toLocaleString(locale)}–${end.toLocaleString(locale)} of ${total.toLocaleString(locale)}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-[var(--nc-border)] px-3 py-1.5 font-bold disabled:cursor-not-allowed disabled:opacity-40"
        >
          {ar ? "السابق" : "Previous"}
        </button>
        <span className="min-w-16 text-center font-bold text-[var(--nc-text-primary)]">
          {page.toLocaleString(locale)} / {totalPages.toLocaleString(locale)}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg border border-[var(--nc-border)] px-3 py-1.5 font-bold disabled:cursor-not-allowed disabled:opacity-40"
        >
          {ar ? "التالي" : "Next"}
        </button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="orca-info-cell"><span>{label}</span><strong>{value}</strong></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-bold text-[var(--nc-text-secondary)]">{label}</span>{children}</label>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="orca-dialog-overlay"><div role="dialog" aria-modal="true" className="orca-dialog max-w-lg"><div className="orca-dialog-header"><h2 className="font-black">{title}</h2><button type="button" onClick={onClose} className="orca-dialog-close"><X size={18} /></button></div><div className="orca-dialog-body">{children}</div></div></div>;
}
