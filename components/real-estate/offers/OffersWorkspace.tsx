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
} from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import SettingsSelect from "@/components/settings/SettingsSelect";
import {
  OperationsDateTimeFields,
  OperationsDialog,
  OperationsEmptyState,
  OperationsKpiGrid,
  OperationsMetricCard,
  OperationsMasterList,
  OperationsMasterRow,
  OperationsNumberField,
  OperationsPageHeader,
  OperationsPanel,
} from "@/components/operations";
import {
  parseOperationsDate,
  parseOperationsLocalDateTime,
} from "@/components/operations/OperationsDateTimeFields";
import { operationsVisual } from "@/features/operations/visual";

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

type FormErrors = Partial<Record<"opportunity" | "price" | "validUntil" | "tourTime", string>>;

const EMPTY_STATS: Stats = {
  total: 0,
  active: 0,
  expiringSoon: 0,
  accepted: 0,
  converted: 0,
  activeValue: 0,
};

const STATUS_OPTIONS = [
  { value: "", ar: "كل الحالات", en: "All statuses" },
  { value: "PENDING", ar: "مسودة / معلّق", en: "Draft / pending" },
  { value: "SENT", ar: "مرسل", en: "Sent" },
  { value: "NEGOTIATION", ar: "قيد التفاوض", en: "Negotiation" },
  { value: "ACCEPTED", ar: "مقبول", en: "Accepted" },
  { value: "REJECTED", ar: "مرفوض", en: "Rejected" },
  { value: "EXPIRED", ar: "منتهي", en: "Expired" },
];

const PAGE_SIZE = 5;

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
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: string, ar: boolean) {
  const item = STATUS_OPTIONS.find((option) => option.value === status);
  return item ? (ar ? item.ar : item.en) : status;
}

function statusClass(status: string) {
  if (status === "ACCEPTED") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "REJECTED" || status === "EXPIRED") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (status === "NEGOTIATION") return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  if (status === "SENT") return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

function fieldClass(error = false) {
  return [
    "h-11 w-full rounded-xl border bg-[var(--nc-surface-solid)] px-3 text-sm text-[var(--nc-text-primary)] outline-none transition",
    error
      ? "border-rose-500/60 focus:border-rose-400"
      : "border-[var(--nc-border)] focus:border-[var(--nc-accent-border)]",
  ].join(" ");
}

export default function OffersWorkspace({ canWrite }: { canWrite: boolean }) {
  const { lang } = useApp();
  const searchParams = useSearchParams();
  const ar = lang !== "EN";
  const locale = ar ? "ar-SA" : "en-SA";
  const t = useCallback((arabic: string, english: string) => (ar ? arabic : english), [ar]);

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
  const [validUntilDate, setValidUntilDate] = useState("");
  const [tourDate, setTourDate] = useState("");
  const [tourTime, setTourTime] = useState("");
  const [tourNotes, setTourNotes] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

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

      const data = Array.isArray(payload.data) ? payload.data : [];
      setRows(data);
      setOpportunities(Array.isArray(payload.opportunities) ? payload.opportunities : []);
      setStats(payload.stats || EMPTY_STATS);
      setSelectedId((current) => {
        if (current && data.some((row: OfferRow) => row.id === current)) return current;
        return data[0]?.id || "";
      });
    } catch {
      setRows([]);
      setError(t("تعذر تحميل العروض العقارية.", "Unable to load offers."));
    } finally {
      setLoading(false);
    }
  }, [t]);

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

  const selectedOpportunity = opportunities.find((item) => item.id === opportunityId);

  function resetCreate() {
    setOpportunityId("");
    setPrice("");
    setValidUntilDate("");
    setFormErrors({});
  }

  function openCreate() {
    setNotice("");
    setError("");
    resetCreate();
    setCreateOpen(true);
  }

  function validateOffer() {
    const errors: FormErrors = {};
    const numericPrice = Number(price);
    const parsedDate = parseOperationsDate(validUntilDate);

    if (!selectedOpportunity) {
      errors.opportunity = t("اختر فرصة مرتبطة بوحدة.", "Choose an opportunity linked to a unit.");
    }
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      errors.price = t("أدخل سعر عرض أكبر من صفر.", "Enter an offer price greater than zero.");
    }
    if (!parsedDate.valid || !parsedDate.native || !parsedDate.date) {
      errors.validUntil = t("استخدم التاريخ بصيغة DD/MM/YYYY.", "Use DD/MM/YYYY format.");
    } else {
      const endOfSelectedDay = new Date(parsedDate.date);
      endOfSelectedDay.setHours(23, 59, 59, 999);
      if (endOfSelectedDay.getTime() <= Date.now()) {
        errors.validUntil = t("اختر تاريخ صلاحية مستقبليًا.", "Choose a future validity date.");
      }
    }

    setFormErrors(errors);
    return { errors, numericPrice, validUntil: parsedDate.native };
  }

  async function createOffer(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateOffer();
    if (Object.keys(validation.errors).length > 0 || !selectedOpportunity || !validation.validUntil) return;

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
          price: validation.numericPrice,
          validUntil: validation.validUntil,
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
      setError(cause instanceof Error ? cause.message : t("تعذر إنشاء العرض.", "Unable to create offer."));
    } finally {
      setBusy("");
    }
  }

  async function updateStatus(nextStatus: string) {
    if (!selected) return;
    setBusy(`status:${nextStatus}`);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/offers/${selected.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "تعذر تحديث العرض.");
      setNotice(t("تم تحديث مسار العرض.", "Offer lifecycle updated."));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("تعذر تحديث العرض.", "Unable to update offer."));
    } finally {
      setBusy("");
    }
  }

  async function acceptOffer() {
    if (!selected) return;
    setBusy("accept");
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/offers/${selected.id}/accept`, {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "تعذر قبول العرض.");
      window.location.assign(`/operations/rental/sales/contracts/${payload.data.contractId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("تعذر قبول العرض.", "Unable to accept offer."));
      setBusy("");
    }
  }

  function openTourDialog() {
    setTourDate("");
    setTourTime("");
    setTourNotes("");
    setFormErrors({});
    setTourOpen(true);
  }

  async function scheduleTour(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;

    const parsed = parseOperationsLocalDateTime(tourDate, tourTime);

    if (!parsed.valid || !parsed.iso) {
      setFormErrors({ tourTime: t("استخدم DD/MM/YYYY و HH:MM.", "Use DD/MM/YYYY and HH:MM.") });
      return;
    }

    setBusy("tour");
    setError("");
    try {
      const response = await fetch(`/api/v1/offers/${selected.id}/tours`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: parsed.iso,
          durationMinutes: 45,
          notes: tourNotes,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "تعذر جدولة الجولة.");
      setTourOpen(false);
      setNotice(t("تمت جدولة الجولة وربطها بالعرض.", "Tour scheduled and linked."));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("تعذر جدولة الجولة.", "Unable to schedule tour."));
    } finally {
      setBusy("");
    }
  }

  const cards = [
    {
      label: t("إجمالي العروض", "Total offers"),
      value: stats.total,
      note: t("كل العروض المسجلة", "All recorded offers"),
      icon: FileText,
    },
    {
      label: t("العروض النشطة", "Active offers"),
      value: stats.active,
      note: money(stats.activeValue, locale),
      icon: TrendingUp,
    },
    {
      label: t("تنتهي خلال 7 أيام", "Expiring in 7 days"),
      value: stats.expiringSoon,
      note: t("تحتاج متابعة قريبة", "Require near-term follow-up"),
      icon: Clock3,
    },
    {
      label: t("محوّلة إلى عقود", "Converted to contracts"),
      value: stats.converted,
      note: t(`${stats.accepted} عرض مقبول`, `${stats.accepted} accepted offers`),
      icon: CheckCircle2,
    },
  ];

  return (
    <main dir={ar ? "rtl" : "ltr"} className={operationsVisual.page} data-offers-rebuild-v1>
      <div className={operationsVisual.pageStack}>
        <OperationsPageHeader
          eyebrow={t("العرض → التفاوض → القبول → العقد", "Offer → negotiation → acceptance → contract")}
          title={t("العروض العقارية", "Property offers")}
          description={t(
            "إدارة العرض التجاري ومساره حتى التحويل إلى عقد، من سجل واحد مرتبط بالعميل والوحدة.",
            "Manage commercial offers through negotiation and contract conversion from one customer-and-unit-linked record.",
          )}
          icon={Handshake}
          actions={
            <>
              {canWrite ? (
                <button type="button" onClick={openCreate} className={operationsVisual.primaryButton}>
                  <Plus aria-hidden="true" />
                  {t("عرض جديد", "New offer")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void load()}
                className={operationsVisual.iconButton}
                aria-label={t("تحديث العروض", "Refresh offers")}
                title={t("تحديث العروض", "Refresh offers")}
              >
                <RefreshCw aria-hidden="true" />
              </button>
            </>
          }
        />

        <OperationsKpiGrid>
          {cards.map(({ label, value, note, icon: Icon }) => (
            <OperationsMetricCard
              key={label}
              title={label}
              value={value.toLocaleString(locale)}
              description={note}
              icon={Icon}
            />
          ))}
        </OperationsKpiGrid>

        {error || notice ? (
          <div
            role={error ? "alert" : "status"}
            className={`rounded-xl border px-4 py-3 text-xs font-bold ${
              error
                ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {error || notice}
          </div>
        ) : null}

        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_360px]" dir="ltr">
          <OperationsPanel className="min-w-0 overflow-hidden" dir={ar ? "rtl" : "ltr"}>
            <div className={`${operationsVisual.toolbar} flex flex-col gap-2 border-b border-[var(--nc-border)] p-3 md:flex-row`}>
              <label className="relative min-w-0 flex-1">
                <Search
                  className={`absolute top-1/2 -translate-y-1/2 text-[var(--nc-text-dim)] ${ar ? "right-3" : "left-3"}`}
                  size={16}
                  aria-hidden="true"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("ابحث بالعميل أو الوحدة أو المشروع", "Search customer, unit, or project")}
                  className={`${fieldClass()} ${ar ? "pr-10" : "pl-10"}`}
                  aria-label={t("البحث في العروض", "Search offers")}
                />
              </label>
              <SettingsSelect
                value={status}
                onChange={setStatus}
                options={STATUS_OPTIONS.map((item) => ({
                  value: item.value,
                  label: ar ? item.ar : item.en,
                }))}
                className="md:w-52"
                aria-label={t("تصفية حالة العرض", "Offer status filter")}
              />
            </div>

            {loading ? (
              <div className="grid min-h-64 place-items-center">
                <Loader2 className="animate-spin text-[var(--nc-text-secondary)]" aria-label={t("جارٍ التحميل", "Loading")} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-3">
                <OperationsEmptyState>
                  {t("لا توجد عروض مطابقة للبحث أو الحالة المحددة.", "No offers match the current search or status.")}
                </OperationsEmptyState>
              </div>
            ) : (
              <OperationsMasterList>
                <div className="orca-platform-grid-header hidden grid-cols-[minmax(160px,1.2fr)_minmax(120px,.8fr)_120px_118px_105px] gap-3 px-4 py-2 font-black text-[var(--nc-text-dim)] lg:grid">
                  <span>{t("العميل", "Customer")}</span>
                  <span>{t("الوحدة", "Unit")}</span>
                  <span>{t("السعر", "Price")}</span>
                  <span>{t("الصلاحية", "Validity")}</span>
                  <span>{t("الحالة", "Status")}</span>
                </div>
                {paged.map((row) => (
                  <OperationsMasterRow
                    key={row.id}
                    selected={selectedId === row.id}
                    onClick={() => setSelectedId(row.id)}
                    className="orca-platform-grid-row grid min-h-[68px] items-center gap-3 px-4 py-3 lg:grid-cols-[minmax(160px,1.2fr)_minmax(120px,.8fr)_120px_118px_105px]"
                    aria-pressed={selectedId === row.id}
                  >
                    <span className="min-w-0">
                      <strong className="orca-table-primary block truncate text-sm text-[var(--nc-text-primary)]">{row.customerName}</strong>
                      <span className="block truncate text-[11px] text-[var(--nc-text-secondary)]">{row.customerPhone}</span>
                    </span>
                    <span className="min-w-0">
                      <strong className="orca-table-primary block truncate text-sm">{row.unitNumber}</strong>
                      <span className="block truncate text-[11px] text-[var(--nc-text-secondary)]">{row.projectName}</span>
                    </span>
                    <span>
                      <strong className="orca-table-primary block text-sm">{money(row.price, locale)}</strong>
                      {row.discountPercent > 0 ? (
                        <span className="block text-[11px] text-[var(--nc-accent-text)]">-{row.discountPercent.toFixed(1)}%</span>
                      ) : null}
                    </span>
                    <span>
                      <strong className="orca-table-primary block text-sm">{shortDate(row.validUntil, locale)}</strong>
                      <span className="block text-[11px] text-[var(--nc-text-secondary)]">
                        {row.expiresInDays >= 0
                          ? t(`متبقي ${row.expiresInDays} يوم`, `${row.expiresInDays} days left`)
                          : t("منتهي", "Expired")}
                      </span>
                    </span>
                    <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[12px] font-bold ${statusClass(row.status)}`}>
                      {statusLabel(row.status, ar)}
                    </span>
                  </OperationsMasterRow>
                ))}
              </OperationsMasterList>
            )}

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              total={filtered.length}
              locale={locale}
              ar={ar}
              onPage={setPage}
            />
          </OperationsPanel>

          <OperationsPanel padded className="min-w-0" dir={ar ? "rtl" : "ltr"}>
            {selected ? (
              <div className="space-y-3">
                <div className="flex min-w-0 items-start justify-between gap-3 border-b border-[var(--nc-border)] pb-3">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold text-[var(--nc-accent-text)]">{selected.projectName}</p>
                    <h2 className={operationsVisual.sectionTitle}>{selected.customerName}</h2>
                    <p className="mt-1 text-[11px] text-[var(--nc-text-secondary)]">{selected.unitNumber}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[12px] font-bold ${statusClass(selected.status)}`}>
                    {statusLabel(selected.status, ar)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Info label={t("سعر العرض", "Offer price")} value={money(selected.price, locale)} />
                  <Info label={t("السعر الأساسي", "Asking price")} value={money(selected.askingPrice, locale)} />
                  <Info label={t("الخصم", "Discount")} value={money(selected.discountAmount, locale)} />
                  <Info label={t("الجولات المرتبطة", "Linked tours")} value={String(selected.tourCount)} />
                  <Info label={t("احتمالية الفرصة", "Probability")} value={`${selected.probability}%`} />
                  <Info label={t("صلاحية العرض", "Valid until")} value={shortDate(selected.validUntil, locale)} />
                </div>

                {selected.contractId ? (
                  <button
                    type="button"
                    onClick={() => window.location.assign(`/operations/rental/sales/contracts/${selected.contractId}`)}
                    className={`${operationsVisual.primaryButton} w-full`}
                  >
                    {t("فتح العقد الناتج", "Open resulting contract")}
                  </button>
                ) : canWrite ? (
                  <div className="space-y-2 border-t border-[var(--nc-border)] pt-3">
                    {selected.status === "PENDING" ? (
                      <button
                        type="button"
                        onClick={() => void updateStatus("SENT")}
                        disabled={busy !== ""}
                        className={`${operationsVisual.secondaryButton} w-full`}
                      >
                        <Send aria-hidden="true" />
                        {t("تسجيل الإرسال", "Mark sent")}
                      </button>
                    ) : null}

                    {["PENDING", "SENT"].includes(selected.status) ? (
                      <button
                        type="button"
                        onClick={() => void updateStatus("NEGOTIATION")}
                        disabled={busy !== ""}
                        className={`${operationsVisual.secondaryButton} w-full`}
                      >
                        <Handshake aria-hidden="true" />
                        {t("بدء التفاوض", "Start negotiation")}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={openTourDialog}
                      disabled={!selected.unitId || busy !== ""}
                      className={`${operationsVisual.secondaryButton} w-full`}
                    >
                      <CalendarClock aria-hidden="true" />
                      {t("جدولة جولة مرتبطة", "Schedule linked tour")}
                    </button>

                    {["PENDING", "SENT", "NEGOTIATION"].includes(selected.status) ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => void acceptOffer()}
                          disabled={busy !== "" || selected.expiresInDays < 0}
                          className={operationsVisual.primaryButton}
                        >
                          {busy === "accept" ? t("جارٍ التحويل...", "Converting...") : t("قبول العرض", "Accept offer")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateStatus("REJECTED")}
                          disabled={busy !== ""}
                          className={operationsVisual.ghostButton}
                        >
                          {t("تسجيل الرفض", "Mark rejected")}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <OperationsEmptyState className="min-h-[92px]">
                    {t("هذه الصفحة متاحة للقراءة فقط حسب صلاحياتك.", "This page is read-only for your role.")}
                  </OperationsEmptyState>
                )}
              </div>
            ) : (
              <OperationsEmptyState>
                {t("اختر عرضًا من القائمة لعرض تفاصيله.", "Select an offer to view its details.")}
              </OperationsEmptyState>
            )}
          </OperationsPanel>
        </div>
      </div>

      <OperationsDialog
        open={createOpen}
        onClose={() => !busy && setCreateOpen(false)}
        closeDisabled={busy === "create"}
        title={t("إنشاء عرض تجاري", "Create commercial offer")}
        description={t("اختر فرصة مرتبطة بوحدة، ثم حدد السعر وتاريخ الصلاحية.", "Choose a unit-linked opportunity, then set price and validity.")}
        closeLabel={t("إغلاق", "Close")}
        dir={ar ? "rtl" : "ltr"}
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              disabled={busy === "create"}
              className={operationsVisual.secondaryButton}
            >
              {t("إلغاء", "Cancel")}
            </button>
            <button
              type="submit"
              form="offer-create-form"
              disabled={busy === "create"}
              className={operationsVisual.primaryButton}
            >
              {busy === "create" ? t("جارٍ الإنشاء...", "Creating...") : t("إنشاء العرض", "Create offer")}
            </button>
          </>
        }
      >
        <form id="offer-create-form" onSubmit={createOffer} noValidate className="space-y-4">
          <Field label={t("الفرصة المرتبطة", "Linked opportunity")} error={formErrors.opportunity}>
            <SettingsSelect
              value={opportunityId}
              onChange={(value) => {
                setOpportunityId(value);
                const item = opportunities.find((option) => option.id === value);
                setPrice(item ? String(item.askingPrice) : "");
                setFormErrors((current) => ({ ...current, opportunity: undefined }));
              }}
              options={opportunities.map((item) => ({
                value: item.id,
                label: `${item.customerName} · ${item.projectName} · ${item.unitNumber}`,
              }))}
              placeholder={t("اختر فرصة مرتبطة بوحدة", "Choose an opportunity")}
            />
          </Field>

          {selectedOpportunity ? (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3">
              <Info label={t("الوحدة", "Unit")} value={`${selectedOpportunity.projectName} · ${selectedOpportunity.unitNumber}`} />
              <Info label={t("السعر الأساسي", "Asking price")} value={money(selectedOpportunity.askingPrice, locale)} />
            </div>
          ) : null}

          <Field label={t("سعر العرض", "Offer price")} error={formErrors.price}>
            <OperationsNumberField
              mode="decimal"
              value={price}
              onValueChange={(value) => {
                setPrice(value);
                setFormErrors((current) => ({ ...current, price: undefined }));
              }}
              className={fieldClass(Boolean(formErrors.price))}
              aria-invalid={Boolean(formErrors.price)}
            />
          </Field>

          <OperationsDateTimeFields
            dateOnly
            dateValue={validUntilDate}
            timeValue=""
            onDateChange={(value) => {
              setValidUntilDate(value);
              setFormErrors((current) => ({ ...current, validUntil: undefined }));
            }}
            onTimeChange={() => undefined}
            dateLabel={t("صالح حتى", "Valid until")}
            timeLabel={t("الوقت", "Time")}
            error={formErrors.validUntil}
          />
        </form>
      </OperationsDialog>

      <OperationsDialog
        open={tourOpen}
        onClose={() => !busy && setTourOpen(false)}
        closeDisabled={busy === "tour"}
        title={t("جدولة جولة مرتبطة بالعرض", "Schedule offer-linked tour")}
        description={selected ? `${selected.customerName} · ${selected.projectName} · ${selected.unitNumber}` : undefined}
        closeLabel={t("إغلاق", "Close")}
        dir={ar ? "rtl" : "ltr"}
        footer={
          <>
            <button type="button" onClick={() => setTourOpen(false)} disabled={busy === "tour"} className={operationsVisual.secondaryButton}>
              {t("إلغاء", "Cancel")}
            </button>
            <button type="submit" form="offer-tour-form" disabled={busy === "tour"} className={operationsVisual.primaryButton}>
              {busy === "tour" ? t("جارٍ الحفظ...", "Saving...") : t("تأكيد الجولة", "Confirm tour")}
            </button>
          </>
        }
      >
        <form id="offer-tour-form" onSubmit={scheduleTour} noValidate className="space-y-4">
          <OperationsDateTimeFields
            dateValue={tourDate}
            timeValue={tourTime}
            onDateChange={(value) => {
              setTourDate(value);
              setFormErrors((current) => ({ ...current, tourTime: undefined }));
            }}
            onTimeChange={(value) => {
              setTourTime(value);
              setFormErrors((current) => ({ ...current, tourTime: undefined }));
            }}
            dateLabel={t("تاريخ الجولة", "Tour date")}
            timeLabel={t("الوقت", "Time")}
            error={formErrors.tourTime}
          />
          <Field label={t("ملاحظات", "Notes")}>
            <textarea
              value={tourNotes}
              onChange={(event) => setTourNotes(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-3 text-sm outline-none focus:border-[var(--nc-accent-border)]"
            />
          </Field>
        </form>
      </OperationsDialog>
    </main>
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
    <div className={`${operationsVisual.pagination} flex min-h-14 flex-col gap-2 border-t border-[var(--nc-border)] px-3 py-2 text-[11px] text-[var(--nc-text-secondary)] sm:flex-row sm:items-center sm:justify-between`}>
      <span>
        {ar
          ? `عرض ${start.toLocaleString(locale)}–${end.toLocaleString(locale)} من ${total.toLocaleString(locale)}`
          : `Showing ${start.toLocaleString(locale)}–${end.toLocaleString(locale)} of ${total.toLocaleString(locale)}`}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className={operationsVisual.secondaryButton}>
          {ar ? "السابق" : "Previous"}
        </button>
        <span className="min-w-16 text-center font-black text-[var(--nc-text-primary)]">
          {page.toLocaleString(locale)} / {totalPages.toLocaleString(locale)}
        </span>
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages} className={operationsVisual.secondaryButton}>
          {ar ? "التالي" : "Next"}
        </button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-2.5">
      <span className="block break-words text-[11px] font-bold text-[var(--nc-text-dim)]">{label}</span>
      <strong className="mt-1 block break-words text-[14px] text-[var(--nc-text-primary)]">{value || "—"}</strong>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold text-[var(--nc-text-dim)]">{label}</span>
      {children}
      {error ? <span className="block text-[11px] font-bold text-rose-300">{error}</span> : null}
    </label>
  );
}
