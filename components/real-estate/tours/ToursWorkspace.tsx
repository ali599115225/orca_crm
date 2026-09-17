"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  UserRoundX,
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
  parseOperationsLocalDateTime,
  splitOperationsDateTime,
} from "@/components/operations/OperationsDateTimeFields";
import { operationsVisual } from "@/features/operations/visual";

type TourRow = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  location: string;
  attendees: number;
  notes: string | null;
  leadId: string;
  customerName: string;
  customerPhone: string;
  leadStatus: string;
  opportunityId: string | null;
  opportunityStatus: string | null;
  probability: number | null;
  unitId: string | null;
  unitNumber: string;
  unitStatus: string | null;
  projectName: string;
  city: string | null;
  district: string | null;
  virtualTourType: string | null;
  virtualTourUrl: string | null;
  assignedTo: string;
  assignedName: string;
  offerId: string | null;
  offerStatus: string | null;
  offerPrice: number | null;
};

type Options = {
  leads: Array<{ id: string; name: string; phone: string; status: string }>;
  units: Array<{
    id: string;
    unitNumber: string;
    status: string;
    projectName: string;
    city: string | null;
    district: string | null;
    virtualTourType: string | null;
    virtualTourUrl: string | null;
  }>;
  offers: Array<{
    id: string;
    status: string;
    opportunityId: string;
    leadId: string;
    customerName: string;
    unitId: string;
    unitNumber: string;
    projectName: string;
  }>;
  users: Array<{ id: string; name: string; role: string }>;
};

type FormErrors = Partial<Record<"leadId" | "startAt" | "attendees" | "location", string>>;

const EMPTY_OPTIONS: Options = { leads: [], units: [], offers: [], users: [] };
const EMPTY_STATS = { total: 0, today: 0, upcoming: 0, completed: 0, noShow: 0, followUp: 0 };
const PAGE_SIZE = 5;

const STATUS_FILTERS = [
  { value: "", ar: "كل الحالات", en: "All statuses" },
  { value: "SCHEDULED", ar: "مجدولة", en: "Scheduled" },
  { value: "FOLLOW_UP", ar: "متابعة", en: "Follow-up" },
  { value: "COMPLETED", ar: "مكتملة", en: "Completed" },
  { value: "NO_SHOW", ar: "لم يحضر", en: "No show" },
  { value: "CANCELLED", ar: "ملغاة", en: "Cancelled" },
];

function statusLabel(status: string, ar: boolean) {
  const item = STATUS_FILTERS.find((option) => option.value === status);
  return item ? (ar ? item.ar : item.en) : status;
}

function statusClass(status: string) {
  if (status === "COMPLETED") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "NO_SHOW" || status === "CANCELLED") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (status === "FOLLOW_UP") return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

function offerStatusLabel(status: string, ar: boolean) {
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

function dateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function fieldClass(error = false) {
  return [
    "h-11 w-full rounded-xl border bg-[var(--nc-surface-solid)] px-3 text-sm text-[var(--nc-text-primary)] outline-none transition",
    error
      ? "border-rose-500/60 focus:border-rose-400"
      : "border-[var(--nc-border)] focus:border-[var(--nc-accent-border)]",
  ].join(" ");
}

export default function ToursWorkspace({ canWrite }: { canWrite: boolean }) {
  const { lang } = useApp();
  const searchParams = useSearchParams();
  const ar = lang !== "EN";
  const locale = ar ? "ar-SA" : "en-SA";
  const t = useCallback((arabic: string, english: string) => (ar ? arabic : english), [ar]);

  const [rows, setRows] = useState<TourRow[]>([]);
  const [options, setOptions] = useState<Options>(EMPTY_OPTIONS);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [leadId, setLeadId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [attendees, setAttendees] = useState("1");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/tours", {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "load failed");

      const data = Array.isArray(payload.data) ? payload.data : [];
      setRows(data);
      setStats(payload.stats || EMPTY_STATS);
      setOptions(payload.options || EMPTY_OPTIONS);
      setSelectedId((current) => {
        if (current && data.some((row: TourRow) => row.id === current)) return current;
        return data[0]?.id || "";
      });
    } catch {
      setRows([]);
      setError(t("تعذر تحميل الجولات العقارية.", "Unable to load tours."));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const requestedTour = searchParams.get("tourId");
    const requestedUnit = searchParams.get("unitId");
    const match = rows.find(
      (row) =>
        (requestedTour && row.id === requestedTour) ||
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
      const text = [
        row.customerName,
        row.customerPhone,
        row.projectName,
        row.unitNumber,
        row.assignedName,
        row.location,
      ]
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!term || text.includes(term));
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

  function clearForm() {
    setLeadId("");
    setUnitId("");
    setOfferId("");
    setAssignedTo(options.users[0]?.id || "");
    setStartDate("");
    setStartTime("");
    setAttendees("1");
    setLocation("");
    setNotes("");
    setFormErrors({});
  }

  function openSchedule() {
    clearForm();
    setError("");
    setNotice("");
    setScheduleOpen(true);
  }

  function selectOffer(value: string) {
    setOfferId(value);
    const offer = options.offers.find((item) => item.id === value);
    if (offer) {
      setLeadId(offer.leadId);
      setUnitId(offer.unitId);
      setLocation(`${offer.projectName} · ${offer.unitNumber}`);
      setFormErrors((current) => ({ ...current, leadId: undefined, location: undefined }));
    }
  }

  function selectUnit(value: string) {
    setUnitId(value);
    const unit = options.units.find((item) => item.id === value);
    if (unit) {
      setLocation([unit.projectName, unit.unitNumber, unit.city, unit.district].filter(Boolean).join(" · "));
      setFormErrors((current) => ({ ...current, location: undefined }));
    }
  }

  function validateTourForm() {
    const errors: FormErrors = {};
    const parsed = parseOperationsLocalDateTime(startDate, startTime);
    const attendeeCount = Number(attendees);

    if (!leadId) errors.leadId = t("اختر العميل المرتبط بالجولة.", "Choose the customer for the tour.");
    if (!parsed.valid || !parsed.iso) errors.startAt = t("استخدم DD/MM/YYYY و HH:MM.", "Use DD/MM/YYYY and HH:MM.");
    if (!Number.isFinite(attendeeCount) || attendeeCount < 1 || attendeeCount > 20) {
      errors.attendees = t("عدد الحضور يجب أن يكون بين 1 و20.", "Attendees must be between 1 and 20.");
    }
    if (!location.trim()) errors.location = t("أدخل موقع الجولة.", "Enter the tour location.");

    setFormErrors(errors);
    return { errors, startAt: parsed.iso, attendeeCount };
  }

  async function createTour(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateTourForm();
    if (Object.keys(validation.errors).length > 0 || !validation.startAt) return;

    setBusy("create");
    setError("");
    try {
      const response = await fetch("/api/v1/tours", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          unitId: unitId || undefined,
          offerId: offerId || undefined,
          assignedTo: assignedTo || undefined,
          startAt: validation.startAt,
          attendees: validation.attendeeCount,
          durationMinutes: 45,
          location,
          notes,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "تعذر جدولة الجولة.");
      setScheduleOpen(false);
      clearForm();
      setNotice(t("تمت جدولة الجولة وربطها بالسجل التشغيلي.", "Tour scheduled and linked."));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("تعذر جدولة الجولة.", "Unable to schedule tour."));
    } finally {
      setBusy("");
    }
  }

  async function changeStatus(next: string) {
    if (!selected) return;
    setBusy(`status:${next}`);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/tours/${selected.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "تعذر تحديث الجولة.");
      setNotice(
        payload.followUpCreated
          ? t("تم تحديث الجولة وإنشاء متابعة.", "Tour updated and follow-up created.")
          : t("تم تحديث حالة الجولة.", "Tour status updated."),
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("تعذر تحديث الجولة.", "Unable to update tour."));
    } finally {
      setBusy("");
    }
  }

  function openEdit() {
    if (!selected) return;
    const split = splitOperationsDateTime(selected.startAt);
    setStartDate(split.date);
    setStartTime(split.time);
    setAssignedTo(selected.assignedTo);
    setAttendees(String(selected.attendees));
    setNotes(selected.notes || "");
    setFormErrors({});
    setEditOpen(true);
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;

    const parsed = parseOperationsLocalDateTime(startDate, startTime);
    const attendeeCount = Number(attendees);
    const errors: FormErrors = {};
    if (!parsed.valid || !parsed.iso) errors.startAt = t("استخدم DD/MM/YYYY و HH:MM.", "Use DD/MM/YYYY and HH:MM.");
    if (!Number.isFinite(attendeeCount) || attendeeCount < 1 || attendeeCount > 20) {
      errors.attendees = t("عدد الحضور يجب أن يكون بين 1 و20.", "Attendees must be between 1 and 20.");
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0 || !parsed.iso) return;

    setBusy("edit");
    setError("");
    try {
      const response = await fetch(`/api/v1/tours/${selected.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: parsed.iso,
          durationMinutes: 45,
          assignedTo,
          attendees: attendeeCount,
          notes,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "تعذر تعديل الجولة.");
      setEditOpen(false);
      setNotice(t("تم تحديث الموعد والمسؤول.", "Schedule and assignee updated."));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("تعذر تعديل الجولة.", "Unable to update tour."));
    } finally {
      setBusy("");
    }
  }

  const cards = [
    {
      label: t("جولات اليوم", "Today"),
      value: stats.today,
      note: t("المواعيد المسجلة اليوم", "Appointments scheduled today"),
      icon: CalendarDays,
    },
    {
      label: t("القادمة", "Upcoming"),
      value: stats.upcoming,
      note: t("الجولات المفتوحة القادمة", "Upcoming open tours"),
      icon: Clock3,
    },
    {
      label: t("المكتملة", "Completed"),
      value: stats.completed,
      note: t("جولات أُغلقت كمكتملة", "Tours closed as completed"),
      icon: CheckCircle2,
    },
    {
      label: t("تحتاج متابعة", "Follow-up"),
      value: stats.followUp,
      note: t(`${stats.noShow} لم يحضر`, `${stats.noShow} no-show`),
      icon: RotateCcw,
    },
  ];

  return (
    <main dir={ar ? "rtl" : "ltr"} className={operationsVisual.page} data-tours-rebuild-v1>
      <div className={operationsVisual.pageStack}>
        <OperationsPageHeader
          eyebrow={t("العميل → الجولة → النتيجة → المتابعة", "Customer → tour → outcome → follow-up")}
          title={t("الجولات العقارية", "Property tours")}
          description={t(
            "تشغيل مواعيد الجولات وربطها بالعميل والوحدة والعرض، ثم تسجيل النتيجة والمتابعة.",
            "Operate property tours linked to the customer, unit and offer, then record outcome and follow-up.",
          )}
          icon={CalendarDays}
          actions={
            <>
              {canWrite ? (
                <button type="button" onClick={openSchedule} className={operationsVisual.primaryButton}>
                  <Plus aria-hidden="true" />
                  {t("جدولة جولة", "Schedule tour")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void load()}
                className={operationsVisual.iconButton}
                aria-label={t("تحديث الجولات", "Refresh tours")}
                title={t("تحديث الجولات", "Refresh tours")}
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
                  size={16}
                  className={`absolute top-1/2 -translate-y-1/2 text-[var(--nc-text-dim)] ${ar ? "right-3" : "left-3"}`}
                  aria-hidden="true"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("ابحث بالعميل أو الوحدة أو الموظف", "Search customer, unit, or assignee")}
                  className={`${fieldClass()} ${ar ? "pr-10" : "pl-10"}`}
                  aria-label={t("البحث في الجولات", "Search tours")}
                />
              </label>
              <SettingsSelect
                value={status}
                onChange={setStatus}
                options={STATUS_FILTERS.map((item) => ({
                  value: item.value,
                  label: ar ? item.ar : item.en,
                }))}
                className="md:w-52"
                aria-label={t("تصفية حالة الجولة", "Tour status filter")}
              />
            </div>

            {loading ? (
              <div className="grid min-h-64 place-items-center">
                <Loader2 className="animate-spin text-[var(--nc-text-secondary)]" aria-label={t("جارٍ التحميل", "Loading")} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-3">
                <OperationsEmptyState>
                  {t("لا توجد جولات مطابقة للبحث أو الحالة المحددة.", "No tours match the current search or status.")}
                </OperationsEmptyState>
              </div>
            ) : (
              <OperationsMasterList>
                <div className="orca-platform-grid-header hidden grid-cols-[150px_minmax(170px,1fr)_minmax(120px,.8fr)_105px] gap-3 px-4 py-2 font-black text-[var(--nc-text-dim)] lg:grid">
                  <span>{t("الموعد", "Time")}</span>
                  <span>{t("العميل والوحدة", "Customer & unit")}</span>
                  <span>{t("المسؤول", "Assignee")}</span>
                  <span>{t("الحالة", "Status")}</span>
                </div>
                {paged.map((row) => (
                  <OperationsMasterRow
                    key={row.id}
                    selected={selectedId === row.id}
                    onClick={() => setSelectedId(row.id)}
                    className="orca-platform-grid-row grid min-h-[68px] items-center gap-3 px-4 py-3 lg:grid-cols-[150px_minmax(170px,1fr)_minmax(120px,.8fr)_105px]"
                    aria-pressed={selectedId === row.id}
                  >
                    <span>
                      <strong className="orca-table-primary block text-sm">{dateTime(row.startAt, locale)}</strong>
                      <span className="block text-[11px] text-[var(--nc-text-secondary)]">
                        {Math.round((new Date(row.endAt).getTime() - new Date(row.startAt).getTime()) / 60_000)} {t("دقيقة", "min")}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <strong className="orca-table-primary block truncate text-sm">{row.customerName}</strong>
                      <span className="block truncate text-[11px] text-[var(--nc-text-secondary)]">{row.projectName} · {row.unitNumber}</span>
                    </span>
                    <span className="min-w-0">
                      <strong className="orca-table-primary block truncate text-sm">{row.assignedName}</strong>
                      <span className="block text-[11px] text-[var(--nc-text-secondary)]">{row.attendees} {t("حضور", "attendees")}</span>
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
                    <p className="mt-1 text-[11px] text-[var(--nc-text-secondary)]">{selected.customerPhone}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[12px] font-bold ${statusClass(selected.status)}`}>
                    {statusLabel(selected.status, ar)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Info label={t("الموعد", "Time")} value={dateTime(selected.startAt, locale)} />
                  <Info label={t("الوحدة", "Unit")} value={`${selected.projectName} · ${selected.unitNumber}`} />
                  <Info label={t("المسؤول", "Assignee")} value={selected.assignedName} />
                  <Info label={t("الحضور", "Attendees")} value={String(selected.attendees)} />
                  <Info label={t("الموقع", "Location")} value={selected.location} />
                  <Info
                    label={t("العرض المرتبط", "Linked offer")}
                    value={selected.offerId ? offerStatusLabel(selected.offerStatus || "", ar) : t("لا يوجد", "None")}
                  />
                </div>

                {selected.notes ? (
                  <div className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3 text-[11px] leading-5 text-[var(--nc-text-secondary)]">
                    {selected.notes}
                  </div>
                ) : null}

                {selected.virtualTourUrl ? (
                  <button
                    type="button"
                    onClick={() => window.open(selected.virtualTourUrl!, "_blank", "noopener,noreferrer")}
                    className={`${operationsVisual.secondaryButton} w-full`}
                  >
                    <ExternalLink aria-hidden="true" />
                    {t("فتح الجولة الافتراضية", "Open virtual tour")}
                  </button>
                ) : null}

                {canWrite && ["SCHEDULED", "FOLLOW_UP"].includes(selected.status) ? (
                  <div className="space-y-2 border-t border-[var(--nc-border)] pt-3">
                    <button type="button" onClick={openEdit} className={`${operationsVisual.secondaryButton} w-full`}>
                      {t("تعديل الموعد", "Reschedule")}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void changeStatus("COMPLETED")}
                        disabled={busy !== ""}
                        className={operationsVisual.primaryButton}
                      >
                        {t("إكمال الجولة", "Complete")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void changeStatus("NO_SHOW")}
                        disabled={busy !== ""}
                        className={operationsVisual.secondaryButton}
                      >
                        <UserRoundX aria-hidden="true" />
                        {t("لم يحضر", "No show")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void changeStatus("FOLLOW_UP")}
                        disabled={busy !== ""}
                        className={operationsVisual.secondaryButton}
                      >
                        <RotateCcw aria-hidden="true" />
                        {t("إنشاء متابعة", "Follow-up")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void changeStatus("CANCELLED")}
                        disabled={busy !== ""}
                        className={operationsVisual.ghostButton}
                      >
                        {t("إلغاء الجولة", "Cancel tour")}
                      </button>
                    </div>
                  </div>
                ) : !canWrite ? (
                  <OperationsEmptyState className="min-h-[92px]">
                    {t("هذه الصفحة متاحة للقراءة فقط حسب صلاحياتك.", "This page is read-only for your role.")}
                  </OperationsEmptyState>
                ) : null}
              </div>
            ) : (
              <OperationsEmptyState>
                {t("اختر جولة من القائمة لعرض تفاصيلها.", "Select a tour to view its details.")}
              </OperationsEmptyState>
            )}
          </OperationsPanel>
        </div>
      </div>

      <OperationsDialog
        open={scheduleOpen}
        onClose={() => !busy && setScheduleOpen(false)}
        closeDisabled={busy === "create"}
        title={t("جدولة جولة جديدة", "Schedule new tour")}
        description={t("اربط الجولة بعميل ووحدة أو بعرض قائم، ثم حدد الموعد والمسؤول.", "Link the tour to a customer and unit or an existing offer, then set time and assignee.")}
        closeLabel={t("إغلاق", "Close")}
        dir={ar ? "rtl" : "ltr"}
        className="max-w-2xl"
        footer={
          <>
            <button type="button" onClick={() => setScheduleOpen(false)} disabled={busy === "create"} className={operationsVisual.secondaryButton}>
              {t("إلغاء", "Cancel")}
            </button>
            <button type="submit" form="tour-create-form" disabled={busy === "create"} className={operationsVisual.primaryButton}>
              {busy === "create" ? t("جارٍ الجدولة...", "Scheduling...") : t("تأكيد الجولة", "Confirm tour")}
            </button>
          </>
        }
      >
        <form id="tour-create-form" onSubmit={createTour} noValidate className="space-y-4">
          <Field label={t("عرض مرتبط (اختياري)", "Linked offer (optional)")}>
            <SettingsSelect
              value={offerId}
              onChange={selectOffer}
              options={[
                { value: "", label: t("بدون عرض مرتبط", "No linked offer") },
                ...options.offers.map((item) => ({
                  value: item.id,
                  label: `${item.customerName} · ${item.projectName} · ${item.unitNumber}`,
                })),
              ]}
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label={t("العميل", "Customer")} error={formErrors.leadId}>
              <SettingsSelect
                value={leadId}
                onChange={(value) => {
                  setLeadId(value);
                  setFormErrors((current) => ({ ...current, leadId: undefined }));
                }}
                disabled={Boolean(offerId)}
                options={options.leads.map((item) => ({ value: item.id, label: `${item.name} · ${item.phone}` }))}
                placeholder={t("اختر العميل", "Choose customer")}
              />
            </Field>
            <Field label={t("الوحدة", "Unit")}>
              <SettingsSelect
                value={unitId}
                onChange={selectUnit}
                disabled={Boolean(offerId)}
                options={[
                  { value: "", label: t("بدون وحدة", "No unit") },
                  ...options.units.map((item) => ({
                    value: item.id,
                    label: `${item.projectName} · ${item.unitNumber}`,
                  })),
                ]}
              />
            </Field>
          </div>

          <OperationsDateTimeFields
            dateValue={startDate}
            timeValue={startTime}
            onDateChange={(value) => {
              setStartDate(value);
              setFormErrors((current) => ({ ...current, startAt: undefined }));
            }}
            onTimeChange={(value) => {
              setStartTime(value);
              setFormErrors((current) => ({ ...current, startAt: undefined }));
            }}
            dateLabel={t("تاريخ الجولة", "Tour date")}
            timeLabel={t("الوقت", "Time")}
            error={formErrors.startAt}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <Field label={t("المسؤول", "Assignee")}>
              <SettingsSelect
                value={assignedTo}
                onChange={setAssignedTo}
                options={options.users.map((item) => ({ value: item.id, label: item.name }))}
                placeholder={t("الموظف الحالي", "Current user")}
              />
            </Field>
            <Field label={t("عدد الحضور", "Attendees")} error={formErrors.attendees}>
              <OperationsNumberField
                mode="integer"
                value={attendees}
                onValueChange={(value) => {
                  setAttendees(value);
                  setFormErrors((current) => ({ ...current, attendees: undefined }));
                }}
                className={fieldClass(Boolean(formErrors.attendees))}
                aria-invalid={Boolean(formErrors.attendees)}
              />
            </Field>
          </div>

          <Field label={t("الموقع", "Location")} error={formErrors.location}>
            <input
              value={location}
              onChange={(event) => {
                setLocation(event.target.value);
                setFormErrors((current) => ({ ...current, location: undefined }));
              }}
              className={fieldClass(Boolean(formErrors.location))}
            />
          </Field>

          <Field label={t("ملاحظات", "Notes")}>
            <textarea
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full resize-none rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-3 text-sm outline-none focus:border-[var(--nc-accent-border)]"
            />
          </Field>
        </form>
      </OperationsDialog>

      <OperationsDialog
        open={editOpen}
        onClose={() => !busy && setEditOpen(false)}
        closeDisabled={busy === "edit"}
        title={t("تعديل موعد الجولة", "Reschedule tour")}
        description={selected ? `${selected.customerName} · ${selected.projectName} · ${selected.unitNumber}` : undefined}
        closeLabel={t("إغلاق", "Close")}
        dir={ar ? "rtl" : "ltr"}
        footer={
          <>
            <button type="button" onClick={() => setEditOpen(false)} disabled={busy === "edit"} className={operationsVisual.secondaryButton}>
              {t("إلغاء", "Cancel")}
            </button>
            <button type="submit" form="tour-edit-form" disabled={busy === "edit"} className={operationsVisual.primaryButton}>
              {busy === "edit" ? t("جارٍ الحفظ...", "Saving...") : t("حفظ التعديل", "Save changes")}
            </button>
          </>
        }
      >
        <form id="tour-edit-form" onSubmit={saveEdit} noValidate className="space-y-4">
          <OperationsDateTimeFields
            dateValue={startDate}
            timeValue={startTime}
            onDateChange={(value) => {
              setStartDate(value);
              setFormErrors((current) => ({ ...current, startAt: undefined }));
            }}
            onTimeChange={(value) => {
              setStartTime(value);
              setFormErrors((current) => ({ ...current, startAt: undefined }));
            }}
            dateLabel={t("التاريخ الجديد", "New date")}
            timeLabel={t("الوقت", "Time")}
            error={formErrors.startAt}
          />
          <Field label={t("المسؤول", "Assignee")}>
            <SettingsSelect
              value={assignedTo}
              onChange={setAssignedTo}
              options={options.users.map((item) => ({ value: item.id, label: item.name }))}
            />
          </Field>
          <Field label={t("عدد الحضور", "Attendees")} error={formErrors.attendees}>
            <OperationsNumberField
              mode="integer"
              value={attendees}
              onValueChange={(value) => {
                setAttendees(value);
                setFormErrors((current) => ({ ...current, attendees: undefined }));
              }}
              className={fieldClass(Boolean(formErrors.attendees))}
              aria-invalid={Boolean(formErrors.attendees)}
            />
          </Field>
          <Field label={t("الملاحظات / النتيجة", "Notes / outcome")}>
            <textarea
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
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
