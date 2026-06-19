// components/views/ToursView.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Eye, Loader2, Search, X } from 'lucide-react';

import { toast } from '@/app/context/ToastContext';
import { getToursAction, scheduleTourActionDirect } from '@/app/actions/tours';
import { DateField } from '@/components/ui/DateField';
import StatusBadge, { type BadgeVariant } from '@/components/ui/StatusBadge';
import { useApp } from '@/app/context/AppContext';
import { displayPerson, displayGeo, displayEnum } from '@/lib/display';
import type { DisplayLocale } from '@/lib/display';

type TourListItem = {
  id: string;
  startAt: string;
  endAt: string | null;
  location: string;
  status: string;
  attendees: number | null;
  notes: string | null;
  leadName: string;
  assignedToName: string;
  createdAt?: string | null;
};

type TourStats = {
  today: number;
  upcoming: number;
  completed: number;
  needsFollowUp: number;
};

type Filters = {
  search: string;
  status: string;
  fromDate: string;
  toDate: string;
};

type ScheduleForm = {
  userName: string;
  phone: string;
  location: string;
  date: string;
  time: string;
};

const PAGE_SIZE = 5;
const TABLE_HEADERS = ['الموعد', 'العميل', 'الموقع', 'الحالة', 'المسؤول', 'الإجراء'];

const INITIAL_FILTERS: Filters = {
  search: '',
  status: '',
  fromDate: '',
  toDate: '',
};

const INITIAL_SCHEDULE_FORM: ScheduleForm = {
  userName: '',
  phone: '',
  location: '',
  date: '',
  time: '',
};

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'SCHEDULED', label: 'مجدولة' },
  { value: 'COMPLETED', label: 'مكتملة' },
  { value: 'CANCELLED', label: 'ملغاة' },
  { value: 'NO_SHOW', label: 'لم يحضر' },
  { value: 'FOLLOW_UP', label: 'تحتاج متابعة' },
];

function statusToBadge(status: string): BadgeVariant {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'SCHEDULED') return 'scheduled';
  if (normalized === 'COMPLETED') return 'completed';
  if (normalized === 'CANCELLED') return 'cancelled';
  if (normalized === 'NO_SHOW') return 'noShow';
  if (normalized === 'FOLLOW_UP') return 'followUp';
  return 'default';
}

function nextActionForStatus(status: string): string {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'SCHEDULED') return 'تأكيد الحضور قبل الموعد';
  if (normalized === 'COMPLETED') return 'تسجيل نتيجة الجولة والمتابعة';
  if (normalized === 'CANCELLED') return 'إعادة الجدولة أو إغلاق الطلب';
  if (normalized === 'NO_SHOW') return 'التواصل مع العميل لمعرفة السبب';
  if (normalized === 'FOLLOW_UP') return 'متابعة العميل خلال 24 ساعة';
  return 'مراجعة حالة الجولة';
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'غير محدد';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير محدد';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const rawHours = date.getHours();
  const suffix = rawHours >= 12 ? 'م' : 'ص';
  const hours = String(rawHours % 12 || 12).padStart(2, '0');

  return `${day}/${month}/${year} — ${hours}:${minutes} ${suffix}`;
}

function formatDateOnly(value?: string | null): string {
  if (!value) return 'غير محدد';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير محدد';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function safeText(value?: string | null, fallback = 'غير محدد'): string {
  const text = String(value || '').trim();
  return text.length > 0 ? text : fallback;
}

export default function ToursView() {
  const { lang } = useApp();
  const displayLocale: DisplayLocale = lang === 'EN' ? 'en' : 'ar';
  const isArabic = displayLocale === 'ar';

  const STATUS_OPTIONS = [
    { value: '', label: isArabic ? 'كل الحالات' : 'All statuses' },
    { value: 'SCHEDULED', label: displayEnum('SCHEDULED', 'tourStatus', displayLocale) },
    { value: 'COMPLETED', label: displayEnum('COMPLETED', 'tourStatus', displayLocale) },
    { value: 'CANCELLED', label: displayEnum('CANCELLED', 'tourStatus', displayLocale) },
    { value: 'NO_SHOW', label: displayEnum('NO_SHOW', 'tourStatus', displayLocale) },
    { value: 'FOLLOW_UP', label: displayEnum('FOLLOW_UP', 'tourStatus', displayLocale) },
  ];

  const displayTourLead = (name: string | null | undefined) => displayPerson(name, displayLocale, { route: '/operations/tours' });
  const displayTourLocation = (loc: string | null | undefined) => displayGeo(loc, 'city', displayLocale, { route: '/operations/tours' });
  const displayTourAgent = (name: string | null | undefined) => displayPerson(name, displayLocale, { route: '/operations/tours' });
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(INITIAL_FILTERS);
  const [tours, setTours] = useState<TourListItem[]>([]);
  const [stats, setStats] = useState<TourStats>({ today: 0, upcoming: 0, completed: 0, needsFollowUp: 0 });
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(INITIAL_SCHEDULE_FORM);

  const selectedTour = useMemo(
    () => tours.find((tour) => tour.id === selectedTourId) || null,
    [selectedTourId, tours]
  );

  const totalPages = Math.max(1, Math.ceil(tours.length / PAGE_SIZE));
  const pagedTours = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return tours.slice(start, start + PAGE_SIZE);
  }, [page, tours]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const loadTours = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getToursAction(
        {
          search: appliedFilters.search.trim() || undefined,
          status: appliedFilters.status || undefined,
          fromDate: appliedFilters.fromDate || undefined,
          toDate: appliedFilters.toDate || undefined,
        },
        1,
        200
      );

      if (!result?.success) {
        throw new Error(result?.error || 'تعذر تحميل الجولات');
      }

      const data = result.data;
      setTours(Array.isArray(data?.tours) ? data.tours : []);
      setStats(data?.stats || { today: 0, upcoming: 0, completed: 0, needsFollowUp: 0 });
      setSelectedTourId(null);
      setPage(1);
    } catch (err: any) {
      setTours([]);
      setStats({ today: 0, upcoming: 0, completed: 0, needsFollowUp: 0 });
      setSelectedTourId(null);
      setError(err?.message || 'تعذر تحميل الجولات');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadTours();
  }, [loadTours]);

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
  };

  const updateScheduleField = (field: keyof ScheduleForm, value: string) => {
    setScheduleForm((current) => ({ ...current, [field]: value }));
  };

  const closeScheduleModal = () => {
    if (scheduleSaving) return;
    setIsScheduleOpen(false);
    setScheduleForm(INITIAL_SCHEDULE_FORM);
  };

  const submitSchedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const userName = scheduleForm.userName.trim();
    const phone = scheduleForm.phone.replace(/\s+/g, '').trim();
    const location = scheduleForm.location.trim();

    if (!userName || !phone || !location || !scheduleForm.date || !scheduleForm.time) {
      toast.error('يرجى تعبئة اسم العميل، الهاتف، الموقع، التاريخ والوقت.');
      return;
    }

    const datetime = `${scheduleForm.date}T${scheduleForm.time}:00`;
    if (Number.isNaN(Date.parse(datetime))) {
      toast.error('التاريخ أو الوقت غير صحيح.');
      return;
    }

    setScheduleSaving(true);
    try {
      const result = await scheduleTourActionDirect({
        userName,
        phone,
        datetime,
        location,
      });

      if (!result?.success) {
        toast.error(result?.error || 'تعذر جدولة الجولة.');
        return;
      }

      toast.success('تمت جدولة الجولة بنجاح.');
      setIsScheduleOpen(false);
      setScheduleForm(INITIAL_SCHEDULE_FORM);
      await loadTours();
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء جدولة الجولة.');
    } finally {
      setScheduleSaving(false);
    }
  };

  const kpis = [
    { label: 'جولات اليوم', value: stats.today, tone: 'text-[var(--nc-text-primary)]' },
    { label: 'القادمة', value: stats.upcoming, tone: 'text-sky-400 dark:text-sky-300' },
    { label: 'المكتملة', value: stats.completed, tone: 'text-emerald-500 dark:text-emerald-300' },
    { label: 'تحتاج متابعة', value: stats.needsFollowUp, tone: 'text-rose-500 dark:text-rose-300' },
  ];

  return (
    <section dir="rtl" className="space-y-5 overflow-x-hidden px-4 pb-8 pt-4 text-[var(--nc-text-primary)] lg:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nc-text-primary)]">الجولات العقارية</h1>
          <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">
            متابعة الجولات المجدولة، المكتملة، الملغاة، والجولات التي تحتاج متابعة.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsScheduleOpen(true)}
          className="nc-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          <Calendar size={16} />
          جدولة جولة
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <div
            key={item.label}
            className="flex min-h-[96px] flex-col justify-between rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm"
          >
            <span className="text-sm text-[var(--nc-text-secondary)]">{item.label}</span>
            <strong className={`text-2xl font-bold ${item.tone}`}>{item.value}</strong>
            <span className="text-xs text-[var(--nc-text-secondary)]">ضمن نطاق الجولات الحالي</span>
          </div>
        ))}
      </section>

      <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-3 shadow-sm">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
            <div className="relative min-w-0 md:w-[280px]">
              <label className="sr-only">بحث</label>
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="بحث بالموقع أو العميل..."
                className="min-h-[40px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 pr-9 text-sm text-[var(--nc-text-primary)] outline-none placeholder:text-[var(--nc-text-dim)] focus:border-[var(--nc-accent-border)]"
              />
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nc-text-secondary)]" />
            </div>

            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              className="min-h-[40px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)] md:w-[160px]"
              aria-label="الحالة"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <DateField
              value={filters.fromDate}
              onChange={(value) => setFilters((current) => ({ ...current, fromDate: value }))}
              placeholder="من تاريخ"
              className="md:w-[150px] [&_input]:min-h-[40px] [&_input]:bg-[var(--nc-surface-solid)]"
            />

            <DateField
              value={filters.toDate}
              onChange={(value) => setFilters((current) => ({ ...current, toDate: value }))}
              placeholder="إلى تاريخ"
              className="md:w-[150px] [&_input]:min-h-[40px] [&_input]:bg-[var(--nc-surface-solid)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden min-w-[56px] text-xs text-[var(--nc-text-secondary)] sm:inline">
              {tours.length} جولة
            </span>
            <button type="button" onClick={applyFilters} className="nc-btn-primary min-h-[40px] rounded-xl px-4 py-2 text-xs font-semibold">
              تطبيق
            </button>
            <button type="button" onClick={clearFilters} className="nc-btn-ghost min-h-[40px] rounded-xl px-3 py-2 text-xs font-semibold">
              مسح
            </button>
          </div>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm">
        <div className="mb-4 flex min-h-[48px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--nc-text-primary)]">قائمة الجولات</h2>
            <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">{tours.length} جولة</p>
          </div>
          <span className="text-xs font-semibold text-[var(--nc-text-secondary)]">
            صفحة {page.toLocaleString('ar-SA')} من {totalPages.toLocaleString('ar-SA')}
          </span>
        </div>

        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed text-sm">
            <colgroup>
              <col className="w-[195px]" />
              <col className="w-[180px]" />
              <col className="w-[210px]" />
              <col className="w-[130px]" />
              <col className="w-[170px]" />
              <col className="w-[120px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--nc-border)] text-[var(--nc-text-secondary)]">
                {TABLE_HEADERS.map((header) => (
                  <th key={header} className="truncate px-3 py-3 text-right font-semibold">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: PAGE_SIZE }, (_, index) => (
                  <tr key={`skel-${index}`} className="h-[47px] border-b border-[var(--nc-border)]">
                    {TABLE_HEADERS.map((header, ci) => (
                      <td key={header} className="px-3 py-3">
                        <div className={`h-3 animate-pulse rounded-full bg-[var(--nc-surface-soft)] ${ci === 0 ? 'w-32' : ci === TABLE_HEADERS.length - 1 ? 'w-16' : 'w-24'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr className="h-[235px] border-b border-[var(--nc-border)]">
                  <td colSpan={TABLE_HEADERS.length} className="px-3 py-4">
                    <div className="mx-auto max-w-md rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-center">
                      <p className="text-sm font-bold text-rose-300">{error}</p>
                      <button type="button" onClick={loadTours} className="nc-btn nc-btn-ghost nc-btn-sm mt-3">
                        إعادة المحاولة
                      </button>
                    </div>
                  </td>
                </tr>
              ) : tours.length === 0 ? (
                <tr className="h-[235px] border-b border-[var(--nc-border)]">
                  <td colSpan={TABLE_HEADERS.length} className="px-3 py-4 text-center">
                    <p className="text-sm font-bold text-[var(--nc-text-primary)]">لا توجد جولات عقارية حتى الآن</p>
                    <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">ستظهر هنا الجولات المجدولة والمتابعة عند توفرها.</p>
                  </td>
                </tr>
              ) : (
                <>
                  {pagedTours.map((tour) => {
                    const selected = tour.id === selectedTourId;
                    return (
                      <tr
                        key={tour.id}
                        onClick={() => setSelectedTourId(tour.id)}
                        className={`h-[47px] cursor-pointer border-b border-[var(--nc-border)] transition-colors ${
                          selected ? 'bg-[var(--nc-surface-soft)]' : 'hover:bg-[var(--nc-surface-soft)]'
                        }`}
                      >
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-[var(--nc-text-primary)]">
                          {formatDateTime(tour.startAt)}
                        </td>
                        <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                          <span className="block min-w-0 truncate">{safeText(tour.leadName)}</span>
                        </td>
                        <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                          <span className="block min-w-0 truncate">{safeText(tour.location)}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <StatusBadge variant={statusToBadge(tour.status)} />
                        </td>
                        <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                          <span className="block min-w-0 truncate">{safeText(tour.assignedToName, 'غير معين')}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedTourId(tour.id);
                            }}
                            className="nc-btn-primary inline-flex min-h-[34px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
                          >
                            <Eye size={13} />
                            تفاصيل
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {Array.from({ length: Math.max(0, PAGE_SIZE - pagedTours.length) }, (_, index) => (
                    <tr key={`reserved-${index}`} className="h-[47px] border-b border-transparent">
                      <td colSpan={TABLE_HEADERS.length} />
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <div className="flex min-h-[52px] flex-col gap-3 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-3 text-sm text-[var(--nc-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
            <span className="font-bold">
              {tours.length > 0
                ? `عرض ${((page - 1) * PAGE_SIZE + 1).toLocaleString('ar-SA')}-${Math.min(page * PAGE_SIZE, tours.length).toLocaleString('ar-SA')} من ${tours.length.toLocaleString('ar-SA')}`
                : 'عرض 0 من 0'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="nc-btn nc-btn-ghost nc-btn-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                السابق
              </button>
              <span className="rounded-lg border border-[var(--nc-border)] px-3 py-1.5 font-black text-[var(--nc-text-primary)]">
                صفحة {page.toLocaleString('ar-SA')} من {totalPages.toLocaleString('ar-SA')}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="nc-btn nc-btn-ghost nc-btn-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                التالي
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 shadow-sm">
        {selectedTour ? (
          <div className="space-y-0">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--nc-border)] pb-4">
              <div>
                <h2 className="text-base font-bold text-[var(--nc-text-primary)]">تفاصيل الجولة</h2>
                <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                  {safeText(selectedTour.leadName)} · {safeText(selectedTour.location)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTourId(null)}
                className="nc-btn-ghost min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-semibold"
                aria-label="إغلاق التفاصيل"
              >
                <X size={15} />
              </button>
            </div>

            <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-2">
              <DetailRow label="الموعد" value={formatDateTime(selectedTour.startAt)} />
              <DetailRow label="الانتهاء المتوقع" value={formatDateTime(selectedTour.endAt)} />
              <DetailRow label="عدد الحضور" value={String(selectedTour.attendees ?? 1)} />
              <DetailRow label="العميل" value={safeText(selectedTour.leadName)} />
              <DetailRow label="المسؤول" value={safeText(selectedTour.assignedToName, 'غير معين')} />
              <DetailRow label="تاريخ الإنشاء" value={formatDateOnly(selectedTour.createdAt)} />
              <div className="grid min-h-[48px] grid-cols-[104px_minmax(0,1fr)] items-center gap-3 border-b border-[var(--nc-border)] py-2">
                <span className="text-xs font-bold text-[var(--nc-text-primary)]">الحالة</span>
                <span><StatusBadge variant={statusToBadge(selectedTour.status)} /></span>
              </div>
              <DetailRow label="الإجراء التالي" value={nextActionForStatus(selectedTour.status)} last />
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-4">
              <span className="mb-2 block text-xs font-bold text-[var(--nc-text-primary)]">الملاحظات</span>
              <p className="text-sm leading-7 text-[var(--nc-text-secondary)]">
                {safeText(selectedTour.notes, 'لا توجد ملاحظات مسجلة لهذه الجولة.')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 text-center">
            <div>
              <h2 className="text-sm font-bold text-[var(--nc-text-primary)]">تفاصيل الجولة</h2>
              <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">اختر جولة من الجدول لعرض التفاصيل هنا.</p>
            </div>
          </div>
        )}
      </div>

      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--nc-glass-border)] px-5 py-4">
              <div>
                <h2 className="text-base font-black text-[var(--nc-text-primary)]">جدولة جولة عقارية</h2>
                <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">أدخل بيانات العميل والموقع والموعد.</p>
              </div>
              <button
                type="button"
                onClick={closeScheduleModal}
                className="rounded-lg border border-[var(--nc-border)] p-2 text-[var(--nc-text-secondary)] hover:text-[var(--nc-text-primary)]"
                aria-label="إغلاق"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={submitSchedule} className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextInput
                  label="اسم العميل"
                  value={scheduleForm.userName}
                  onChange={(value) => updateScheduleField('userName', value)}
                  placeholder="مثال: راشد الحربي"
                />
                <TextInput
                  label="رقم الهاتف"
                  value={scheduleForm.phone}
                  onChange={(value) => updateScheduleField('phone', value)}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
              </div>

              <TextInput
                label="الموقع / الوحدة"
                value={scheduleForm.location}
                onChange={(value) => updateScheduleField('location', value)}
                placeholder="مثال: مكتب المبيعات أو معرض العقار"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DateField
                  label="تاريخ الجولة"
                  value={scheduleForm.date}
                  onChange={(value) => updateScheduleField('date', value)}
                  placeholder="يوم/شهر/سنة"
                />
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">وقت الجولة</label>
                  <input
                    type="time"
                    value={scheduleForm.time}
                    onChange={(event) => updateScheduleField('time', event.target.value)}
                    className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 py-2 text-center text-xs font-bold text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-[var(--nc-glass-border)] pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeScheduleModal} disabled={scheduleSaving} className="nc-btn nc-btn-ghost nc-btn-sm justify-center">
                  إلغاء
                </button>
                <button type="submit" disabled={scheduleSaving} className="nc-btn nc-btn-primary nc-btn-sm justify-center disabled:opacity-60">
                  {scheduleSaving ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                  حفظ الجولة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`grid min-h-[48px] grid-cols-[104px_minmax(0,1fr)] items-center gap-3 py-2 ${last ? '' : 'border-b border-[var(--nc-border)]'}`}>
      <span className="text-xs font-bold text-[var(--nc-text-primary)]">{label}</span>
      <span className="truncate text-xs leading-6 text-[var(--nc-text-secondary)]">{value}</span>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  dir = 'rtl',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  dir?: 'rtl' | 'ltr';
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        dir={dir}
        className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 py-2.5 text-xs font-semibold text-[var(--nc-text-primary)] outline-none placeholder:text-[var(--nc-text-dim)] focus:border-[var(--nc-accent-border)]"
      />
    </div>
  );
}
