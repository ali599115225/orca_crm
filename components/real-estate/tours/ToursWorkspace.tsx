"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  UserRoundX,
  Users,
  X,
} from "lucide-react";
import SettingsSelect from "@/components/settings/SettingsSelect";
import { useApp } from "@/app/context/AppContext";

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
  units: Array<{ id: string; unitNumber: string; status: string; projectName: string; city: string | null; district: string | null; virtualTourType: string | null; virtualTourUrl: string | null }>;
  offers: Array<{ id: string; status: string; opportunityId: string; leadId: string; customerName: string; unitId: string; unitNumber: string; projectName: string }>;
  users: Array<{ id: string; name: string; role: string }>;
};

const EMPTY_OPTIONS: Options = { leads: [], units: [], offers: [], users: [] };
const EMPTY_STATS = { total: 0, today: 0, upcoming: 0, completed: 0, noShow: 0, followUp: 0 };

const STATUS_FILTERS = [
  { value: "", labelAr: "كل الحالات", labelEn: "All statuses" },
  { value: "SCHEDULED", labelAr: "مجدولة", labelEn: "Scheduled" },
  { value: "FOLLOW_UP", labelAr: "متابعة", labelEn: "Follow-up" },
  { value: "COMPLETED", labelAr: "مكتملة", labelEn: "Completed" },
  { value: "NO_SHOW", labelAr: "لم يحضر", labelEn: "No show" },
  { value: "CANCELLED", labelAr: "ملغاة", labelEn: "Cancelled" },
];

function statusLabel(status: string, ar: boolean) {
  const item = STATUS_FILTERS.find((option) => option.value === status);
  return item ? (ar ? item.labelAr : item.labelEn) : status;
}
function statusClass(status: string) {
  if (status === "COMPLETED") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "NO_SHOW" || status === "CANCELLED") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (status === "FOLLOW_UP") return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}
function dateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
function toLocalInput(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

const PAGE_SIZE = 5;

export default function ToursWorkspace({ canWrite }: { canWrite: boolean }) {
  const { lang } = useApp();
  const searchParams = useSearchParams();
  const ar = lang !== "EN";
  const locale = ar ? "ar-SA" : "en-SA";
  const t = (arabic: string, english: string) => (ar ? arabic : english);

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

  const [leadId, setLeadId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [startAt, setStartAt] = useState("");
  const [attendees, setAttendees] = useState("1");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/tours", { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "load failed");
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setStats(payload.stats || EMPTY_STATS);
      setOptions(payload.options || EMPTY_OPTIONS);
      setSelectedId((current) => payload.data?.some((row: TourRow) => row.id === current) ? current : payload.data?.[0]?.id || "");
    } catch {
      setRows([]);
      setError(t("تعذر تحميل الجولات العقارية.", "Unable to load tours."));
    } finally {
      setLoading(false);
    }
  }, [ar]);

  useEffect(() => { void load(); }, [load]);
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

  const selected = useMemo(() => rows.find((row) => row.id === selectedId) || null, [rows, selectedId]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = !status || row.status === status;
      const text = [row.customerName, row.customerPhone, row.projectName, row.unitNumber, row.assignedName, row.location].join(" ").toLowerCase();
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
    setLeadId(""); setUnitId(""); setOfferId(""); setAssignedTo(options.users[0]?.id || "");
    setStartAt(""); setAttendees("1"); setLocation(""); setNotes("");
  }

  function openSchedule() {
    clearForm();
    setScheduleOpen(true);
  }

  function selectOffer(value: string) {
    setOfferId(value);
    const offer = options.offers.find((item) => item.id === value);
    if (offer) {
      setLeadId(offer.leadId);
      setUnitId(offer.unitId);
      setLocation(`${offer.projectName} · ${offer.unitNumber}`);
    }
  }

  function selectUnit(value: string) {
    setUnitId(value);
    const unit = options.units.find((item) => item.id === value);
    if (unit) setLocation([unit.projectName, unit.unitNumber, unit.city, unit.district].filter(Boolean).join(" · "));
  }

  async function createTour(event: React.FormEvent) {
    event.preventDefault();
    setBusy("create"); setError("");
    try {
      const response = await fetch("/api/v1/tours", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, unitId: unitId || undefined, offerId: offerId || undefined, assignedTo: assignedTo || undefined, startAt, attendees: Number(attendees), durationMinutes: 45, location, notes }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "تعذر جدولة الجولة.");
      setScheduleOpen(false); clearForm(); setNotice(t("تمت جدولة الجولة وربطها بالسجل التشغيلي.", "Tour scheduled and linked."));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("تعذر جدولة الجولة.", "Unable to schedule tour."));
    } finally { setBusy(""); }
  }

  async function changeStatus(next: string) {
    if (!selected) return;
    setBusy(`status:${next}`); setError("");
    try {
      const response = await fetch(`/api/v1/tours/${selected.id}/status`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "تعذر تحديث الجولة.");
      setNotice(payload.followUpCreated ? t("تم تحديث الجولة وإنشاء متابعة.", "Tour updated and follow-up created.") : t("تم تحديث حالة الجولة.", "Tour status updated."));
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تحديث الجولة."); }
    finally { setBusy(""); }
  }

  function openEdit() {
    if (!selected) return;
    setStartAt(toLocalInput(selected.startAt)); setAssignedTo(selected.assignedTo); setAttendees(String(selected.attendees)); setNotes(selected.notes || "");
    setEditOpen(true);
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy("edit"); setError("");
    try {
      const response = await fetch(`/api/v1/tours/${selected.id}`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startAt, durationMinutes: 45, assignedTo, attendees: Number(attendees), notes }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "تعذر تعديل الجولة.");
      setEditOpen(false); setNotice(t("تم تحديث الموعد والمسؤول.", "Schedule and assignee updated.")); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تعديل الجولة."); }
    finally { setBusy(""); }
  }

  const cards = [
    { label: t("جولات اليوم", "Today"), value: stats.today, icon: CalendarDays },
    { label: t("القادمة", "Upcoming"), value: stats.upcoming, icon: Clock3 },
    { label: t("المكتملة", "Completed"), value: stats.completed, icon: CheckCircle2 },
    { label: t("تحتاج متابعة", "Follow-up"), value: stats.followUp, icon: RotateCcw },
  ];

  return (
    <section dir={ar ? "rtl" : "ltr"} className="nc-page nc-stack orca-container pb-10">
      <header className="orca-workspace-hero">
        <div><p className="text-xs font-bold text-[var(--nc-accent)]">{t("العميل → الجولة → النتيجة → المتابعة", "Customer → tour → outcome → follow-up")}</p><h1 className="mt-1 text-2xl font-black">{t("لوحة تشغيل الجولات", "Tour Operations Board")}</h1><p className="mt-1 text-sm text-[var(--nc-text-secondary)]">{t("مواعيد حقيقية مرتبطة بالعميل والوحدة والعرض، مع إجراءات مباشرة بعد الجولة.", "Real appointments linked to customers, units and offers, with direct outcome actions.")}</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void load()} className="nc-btn nc-btn-ghost"><RefreshCw size={15} />{t("تحديث", "Refresh")}</button>{canWrite && <button type="button" onClick={openSchedule} className="nc-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black"><Plus size={16} />{t("جدولة جولة", "Schedule tour")}</button>}</div>
      </header>

      <div className="orca-workspace-metrics">{cards.map(({ label, value, icon: Icon }) => <div key={label} className="orca-workspace-metric"><div className="flex justify-between text-xs font-bold text-[var(--nc-text-secondary)]"><span>{label}</span><Icon size={17} /></div><strong className="mt-3 block text-2xl">{value.toLocaleString(locale)}</strong></div>)}</div>

      {(error || notice) && <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${error ? "border-rose-500/30 bg-rose-500/10 text-rose-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"}`}>{error || notice}</div>}

      <div className="space-y-4">
        <div className="orca-workspace-panel min-w-0 overflow-hidden">
          <div className="orca-workspace-toolbar flex flex-col gap-3 md:flex-row">
            <label className="relative flex-1"><Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nc-text-dim)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("ابحث بالعميل أو الوحدة أو الموظف", "Search customer, unit, or assignee")} className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] py-2.5 pl-3 pr-10 text-sm outline-none" /></label>
            <SettingsSelect value={status} onChange={setStatus} options={STATUS_FILTERS.map((item) => ({ value: item.value, label: ar ? item.labelAr : item.labelEn }))} className="md:w-52" />
          </div>
          <div className="divide-y divide-[var(--nc-border)]">
            {loading ? <div className="p-12 text-center"><Loader2 className="mx-auto animate-spin" /></div> : filtered.length === 0 ? <div className="p-12 text-center text-sm text-[var(--nc-text-secondary)]">{t("لا توجد جولات مطابقة.", "No matching tours.")}</div> : paged.map((row) => <button type="button" key={row.id} onClick={() => setSelectedId(row.id)} className={`orca-data-row grid w-full min-w-0 gap-3 p-4 text-center transition lg:grid-cols-[minmax(150px,170px)_minmax(0,1fr)_minmax(120px,150px)_minmax(100px,120px)] ${selectedId === row.id ? "is-selected" : ""}`}><div><strong className="block text-sm">{dateTime(row.startAt, locale)}</strong><span className="text-xs text-[var(--nc-text-secondary)]">{Math.round((new Date(row.endAt).getTime()-new Date(row.startAt).getTime())/60000)} {t("دقيقة", "min")}</span></div><div><strong className="block">{row.customerName}</strong><span className="text-xs text-[var(--nc-text-secondary)]">{row.projectName} · {row.unitNumber}</span></div><div><span className="block text-sm">{row.assignedName}</span><span className="text-xs text-[var(--nc-text-secondary)]">{row.attendees} {t("حضور", "attendees")}</span></div><div><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(row.status)}`}>{statusLabel(row.status, ar)}</span></div></button>)}
          </div>
          <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} locale={locale} ar={ar} onPage={setPage} />
        </div>

        <aside className="orca-workspace-panel p-5">
          {selected ? <div className="orca-workspace-detail">
            <div className="orca-detail-header flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-[var(--nc-text-secondary)]">{selected.projectName}</p><h2 className="text-lg font-black">{selected.customerName}</h2><p className="text-sm text-[var(--nc-text-secondary)]">{selected.customerPhone}</p></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(selected.status)}`}>{statusLabel(selected.status, ar)}</span></div>
            <div className="orca-detail-primary rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-4 text-sm"><Info label={t("الموعد", "Time")} value={dateTime(selected.startAt, locale)} /><Info label={t("الوحدة", "Unit")} value={`${selected.projectName} · ${selected.unitNumber}`} /><Info label={t("المسؤول", "Assignee")} value={selected.assignedName} /><Info label={t("الموقع", "Location")} value={selected.location} /><Info label={t("العرض المرتبط", "Linked offer")} value={selected.offerId ? statusLabel(selected.offerStatus || "", ar) : t("لا يوجد", "None")} /></div>
            {selected.notes && <p className="orca-detail-secondary rounded-xl border border-[var(--nc-border)] p-3 text-sm text-[var(--nc-text-secondary)]">{selected.notes}</p>}
            {selected.virtualTourUrl && <button type="button" onClick={() => window.open(selected.virtualTourUrl!, "_blank", "noopener,noreferrer")} className="orca-detail-secondary nc-btn nc-btn-ghost w-full justify-center"><ExternalLink size={15} />{t("فتح الجولة الافتراضية", "Open virtual tour")}</button>}
            {canWrite && ["SCHEDULED","FOLLOW_UP"].includes(selected.status) && <div className="orca-detail-full grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5"><button type="button" onClick={openEdit} className="nc-btn nc-btn-ghost justify-center">{t("تعديل الموعد", "Reschedule")}</button><button type="button" onClick={() => void changeStatus("COMPLETED")} disabled={busy !== ""} className="rounded-xl border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-300">{t("إكمال الجولة", "Complete")}</button><button type="button" onClick={() => void changeStatus("NO_SHOW")} disabled={busy !== ""} className="rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-300"><UserRoundX size={14} className="inline" /> {t("لم يحضر", "No show")}</button><button type="button" onClick={() => void changeStatus("FOLLOW_UP")} disabled={busy !== ""} className="rounded-xl border border-violet-500/30 px-3 py-2 text-xs font-bold text-violet-300">{t("إنشاء متابعة", "Follow-up")}</button><button type="button" onClick={() => void changeStatus("CANCELLED")} disabled={busy !== ""} className="rounded-xl border border-[var(--nc-border)] px-3 py-2 text-xs font-bold text-[var(--nc-text-secondary)] sm:col-span-2 lg:col-span-1">{t("إلغاء الجولة", "Cancel tour")}</button></div>}
          </div> : <p className="py-16 text-center text-sm text-[var(--nc-text-secondary)]">{t("اختر جولة لعرض تفاصيلها.", "Select a tour.")}</p>}
        </aside>
      </div>

      {scheduleOpen && <Modal title={t("جدولة جولة جديدة", "Schedule new tour")} onClose={() => setScheduleOpen(false)}><form onSubmit={createTour} className="space-y-4"><Field label={t("عرض مرتبط (اختياري)", "Linked offer (optional)")}><SettingsSelect value={offerId} onChange={selectOffer} options={[{value:"",label:t("بدون عرض مرتبط","No linked offer")},...options.offers.map((item)=>({value:item.id,label:`${item.customerName} · ${item.projectName} · ${item.unitNumber}`}))]} /></Field><Field label={t("العميل", "Customer")}><SettingsSelect value={leadId} onChange={setLeadId} disabled={Boolean(offerId)} options={options.leads.map((item)=>({value:item.id,label:`${item.name} · ${item.phone}`}))} placeholder={t("اختر العميل","Choose customer")} /></Field><Field label={t("الوحدة", "Unit")}><SettingsSelect value={unitId} onChange={selectUnit} disabled={Boolean(offerId)} options={[{value:"",label:t("بدون وحدة","No unit")},...options.units.map((item)=>({value:item.id,label:`${item.projectName} · ${item.unitNumber}`}))]} /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label={t("الموعد", "Time")}><input type="datetime-local" dir="ltr" lang="en-CA" value={startAt} onChange={(event)=>setStartAt(event.target.value)} required className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 text-left" /></Field><Field label={t("المسؤول", "Assignee")}><SettingsSelect value={assignedTo} onChange={setAssignedTo} options={options.users.map((item)=>({value:item.id,label:item.name}))} /></Field></div><div className="grid gap-3 sm:grid-cols-2"><Field label={t("عدد الحضور", "Attendees")}><input type="number" min="1" max="20" value={attendees} onChange={(event)=>setAttendees(event.target.value)} className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5" /></Field><Field label={t("الموقع", "Location")}><input value={location} onChange={(event)=>setLocation(event.target.value)} required className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5" /></Field></div><Field label={t("ملاحظات", "Notes")}><textarea rows={3} value={notes} onChange={(event)=>setNotes(event.target.value)} className="orca-form-textarea w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5" /></Field><button type="submit" disabled={busy==="create" || !leadId || !startAt} className="nc-btn-primary w-full rounded-xl py-2.5 font-black">{busy==="create"?t("جارٍ الجدولة...","Scheduling..."):t("تأكيد الجولة","Confirm tour")}</button></form></Modal>}

      {editOpen && selected && <Modal title={t("تعديل موعد الجولة", "Reschedule tour")} onClose={()=>setEditOpen(false)}><form onSubmit={saveEdit} className="space-y-4"><Field label={t("الموعد الجديد", "New time")}><input type="datetime-local" dir="ltr" lang="en-CA" value={startAt} onChange={(event)=>setStartAt(event.target.value)} required className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 text-left" /></Field><Field label={t("المسؤول", "Assignee")}><SettingsSelect value={assignedTo} onChange={setAssignedTo} options={options.users.map((item)=>({value:item.id,label:item.name}))} /></Field><Field label={t("الملاحظات / النتيجة", "Notes / outcome")}><textarea rows={4} value={notes} onChange={(event)=>setNotes(event.target.value)} className="orca-form-textarea w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5" /></Field><button type="submit" disabled={busy==="edit"} className="nc-btn-primary w-full rounded-xl py-2.5 font-black">{t("حفظ التعديل", "Save changes")}</button></form></Modal>}
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

function Info({label,value}:{label:string;value:string}){return <div className="orca-info-cell"><span>{label}</span><strong>{value}</strong></div>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block space-y-1.5"><span className="text-xs font-bold text-[var(--nc-text-secondary)]">{label}</span>{children}</label>}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){return <div className="orca-dialog-overlay"><div role="dialog" aria-modal="true" className="orca-dialog max-w-2xl"><div className="orca-dialog-header"><h2 className="font-black">{title}</h2><button type="button" onClick={onClose} className="orca-dialog-close"><X size={18}/></button></div><div className="orca-dialog-body">{children}</div></div></div>}
