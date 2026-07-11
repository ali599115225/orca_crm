// components/views/ToursView.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Eye, Loader2, Search, X } from 'lucide-react';

import { toast } from '@/app/context/ToastContext';
import { getToursAction, scheduleTourActionDirect } from '@/app/actions/tours';
import { DateField } from '@/components/ui/DateField';
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

type TourBadgeVariant = 'scheduled' | 'completed' | 'cancelled' | 'noShow' | 'followUp' | 'default';

const PAGE_SIZE = 5;

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

const copy = {
  ar: {
    pageTitle: 'الجولات العقارية',
    pageSubtitle: 'متابعة الجولات المجدولة، المكتملة، الملغاة، والجولات التي تحتاج متابعة.',
    scheduleTour: 'جدولة جولة',
    todayTours: 'جولات اليوم',
    upcoming: 'القادمة',
    completed: 'المكتملة',
    needsFollowUp: 'تحتاج متابعة',
    currentScope: 'ضمن نطاق الجولات الحالي',
    search: 'بحث',
    searchPlaceholder: 'بحث بالموقع أو العميل...',
    allStatuses: 'كل الحالات',
    statusAria: 'الحالة',
    fromDate: 'من تاريخ',
    toDate: 'إلى تاريخ',
    tourCount: 'جولة',
    apply: 'تطبيق',
    clear: 'مسح',
    toursList: 'قائمة الجولات',
    page: 'صفحة',
    of: 'من',
    showing: 'عرض',
    previous: 'السابق',
    next: 'التالي',
    retry: 'إعادة المحاولة',
    noToursTitle: 'لا توجد جولات عقارية حتى الآن',
    noToursDescription: 'ستظهر هنا الجولات المجدولة والمتابعة عند توفرها.',
    details: 'تفاصيل',
    tourDetails: 'تفاصيل الجولة',
    closeDetails: 'إغلاق التفاصيل',
    appointment: 'الموعد',
    expectedEnd: 'الانتهاء المتوقع',
    attendees: 'عدد الحضور',
    customer: 'العميل',
    agent: 'المسؤول',
    createdAt: 'تاريخ الإنشاء',
    status: 'الحالة',
    nextAction: 'الإجراء التالي',
    notes: 'الملاحظات',
    noNotes: 'لا توجد ملاحظات مسجلة لهذه الجولة.',
    selectTour: 'اختر جولة من الجدول لعرض التفاصيل هنا.',
    scheduleTitle: 'جدولة جولة عقارية',
    scheduleSubtitle: 'أدخل بيانات العميل والموقع والموعد.',
    customerName: 'اسم العميل',
    customerNamePlaceholder: 'مثال: راشد الحربي',
    phone: 'رقم الهاتف',
    phonePlaceholder: '05xxxxxxxx',
    locationUnit: 'الموقع / الوحدة',
    locationPlaceholder: 'مثال: مكتب المبيعات أو معرض العقار',
    tourDate: 'تاريخ الجولة',
    datePlaceholder: 'يوم/شهر/سنة',
    tourTime: 'وقت الجولة',
    cancel: 'إلغاء',
    saveTour: 'حفظ الجولة',
    validationError: 'يرجى تعبئة اسم العميل، الهاتف، الموقع، التاريخ والوقت.',
    invalidDate: 'التاريخ أو الوقت غير صحيح.',
    scheduleFailed: 'تعذر جدولة الجولة.',
    scheduleSuccess: 'تمت جدولة الجولة بنجاح.',
    scheduleError: 'حدث خطأ أثناء جدولة الجولة.',
    loadingFailed: 'تعذر تحميل الجولات',
    notSpecified: 'غير محدد',
    notAssigned: 'غير محدد',
    noData: 'لا توجد بيانات',
    tableHeaders: ['الموعد', 'العميل', 'الموقع', 'الحالة', 'المسؤول', 'الإجراء'],
    actions: {
      scheduled: 'تأكيد الحضور قبل الموعد',
      completed: 'تسجيل نتيجة الجولة والمتابعة',
      cancelled: 'إعادة الجدولة أو إغلاق الطلب',
      noShow: 'التواصل مع العميل لمعرفة السبب',
      followUp: 'متابعة العميل خلال 24 ساعة',
      default: 'مراجعة حالة الجولة',
    },
  },
  en: {
    pageTitle: 'Property Tours',
    pageSubtitle: 'Track scheduled, completed, cancelled, and follow-up tours.',
    scheduleTour: 'Schedule tour',
    todayTours: 'Today tours',
    upcoming: 'Upcoming',
    completed: 'Completed',
    needsFollowUp: 'Needs follow-up',
    currentScope: 'Within current tour scope',
    search: 'Search',
    searchPlaceholder: 'Search by location or customer...',
    allStatuses: 'All statuses',
    statusAria: 'Status',
    fromDate: 'From date',
    toDate: 'To date',
    tourCount: 'tours',
    apply: 'Apply',
    clear: 'Clear',
    toursList: 'Tours List',
    page: 'Page',
    of: 'of',
    showing: 'Showing',
    previous: 'Previous',
    next: 'Next',
    retry: 'Retry',
    noToursTitle: 'No property tours yet',
    noToursDescription: 'Scheduled and follow-up tours will appear here once available.',
    details: 'Details',
    tourDetails: 'Tour details',
    closeDetails: 'Close details',
    appointment: 'Appointment',
    expectedEnd: 'Expected end',
    attendees: 'Attendees',
    customer: 'Customer',
    agent: 'Owner',
    createdAt: 'Created date',
    status: 'Status',
    nextAction: 'Next action',
    notes: 'Notes',
    noNotes: 'No notes have been recorded for this tour.',
    selectTour: 'Select a tour from the table to view details here.',
    scheduleTitle: 'Schedule property tour',
    scheduleSubtitle: 'Enter the customer, location, date, and time.',
    customerName: 'Customer name',
    customerNamePlaceholder: 'Example: Rashed Al-Harbi',
    phone: 'Mobile number',
    phonePlaceholder: '05xxxxxxxx',
    locationUnit: 'Location / unit',
    locationPlaceholder: 'Example: sales office or property showroom',
    tourDate: 'Tour date',
    datePlaceholder: 'day/month/year',
    tourTime: 'Tour time',
    cancel: 'Cancel',
    saveTour: 'Save tour',
    validationError: 'Please enter the customer name, phone, location, date, and time.',
    invalidDate: 'The date or time is invalid.',
    scheduleFailed: 'Unable to schedule the tour.',
    scheduleSuccess: 'Tour scheduled successfully.',
    scheduleError: 'An error occurred while scheduling the tour.',
    loadingFailed: 'Unable to load tours',
    notSpecified: 'Not specified',
    notAssigned: 'Not specified',
    noData: 'No data available',
    tableHeaders: ['Appointment', 'Customer', 'Location', 'Status', 'Owner', 'Action'],
    actions: {
      scheduled: 'Confirm attendance before the appointment',
      completed: 'Record the tour outcome and follow up',
      cancelled: 'Reschedule or close the request',
      noShow: 'Contact the customer to understand the reason',
      followUp: 'Follow up with the customer within 24 hours',
      default: 'Review the tour status',
    },
  },
};

function statusToBadge(status: string): TourBadgeVariant {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'SCHEDULED') return 'scheduled';
  if (normalized === 'COMPLETED') return 'completed';
  if (normalized === 'CANCELLED') return 'cancelled';
  if (normalized === 'NO_SHOW') return 'noShow';
  if (normalized === 'FOLLOW_UP') return 'followUp';
  return 'default';
}

function nextActionForStatus(status: string, labels: typeof copy.ar): string {
  return labels.actions[statusToBadge(status)] || labels.actions.default;
}

function isTechnicalId(value?: string | null): boolean {
  const text = String(value || '').trim();
  if (!text) return false;

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
    return true;
  }

  if (/^[0-9a-f]{8,24}$/i.test(text)) {
    return true;
  }

  return /^(owner|user|lead|tour|property|project|unit|createdBy|updatedBy)[_-]?[a-z0-9-]+$/i.test(text);
}

function isDemoLeak(value?: string | null): boolean {
  const text = String(value || '').trim();
  return /\b(demo|stress|mock|trial)\b/i.test(text) || /تجريبي|تجريبية/.test(text);
}

function safeText(value: unknown, fallback: string): string {
  const text = String(value || '').trim();
  if (!text || isTechnicalId(text) || isDemoLeak(text)) return fallback;
  return text;
}

function hasArabicScript(value: unknown): boolean {
  return /[\u0600-\u06FF]/.test(String(value || ''));
}

function safeLocalizedNote(value: unknown, locale: DisplayLocale, fallback: string): string {
  const text = safeText(value, fallback);
  if (text === fallback) return fallback;
  if (locale === 'en' && hasArabicScript(text)) return fallback;
  return text;
}

function formatDateTime(value: string | null | undefined, locale: DisplayLocale, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDateOnly(value: string | null | undefined, locale: DisplayLocale, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatNumber(value: number, locale: DisplayLocale): string {
  return Number(value || 0).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US');
}

function TourStatusBadge({ status, locale }: { status: string; locale: DisplayLocale }) {
  const variant = statusToBadge(status);
  const label = displayEnum(status || 'UNSPECIFIED', 'tourStatus' as any, locale);

  const toneClass =
    variant === 'scheduled'
      ? 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200'
      : variant === 'completed'
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
        : variant === 'cancelled'
          ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200'
          : variant === 'noShow'
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200'
            : variant === 'followUp'
              ? 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-200'
              : 'border-[var(--nc-border)] bg-[var(--nc-surface-soft)] text-[var(--nc-text-primary)]';

  return (
    <span className={`inline-flex min-w-[92px] items-center justify-center rounded-full border px-3 py-1 text-xs font-bold ${toneClass}`}>
      {safeText(label, locale === 'ar' ? copy.ar.notSpecified : copy.en.notSpecified)}
    </span>
  );
}

export default function ToursView() {
  const { lang } = useApp();
  const displayLocale: DisplayLocale = lang === 'EN' ? 'en' : 'ar';
  const isArabic = displayLocale === 'ar';
  const labels = isArabic ? copy.ar : copy.en;
  const direction = isArabic ? 'rtl' : 'ltr';
  const textAlign = isArabic ? 'text-right' : 'text-left';
  const iconSideClass = isArabic ? 'right-3' : 'left-3';
  const inputIconPadding = isArabic ? 'pr-9' : 'pl-9';

  const statusOptions = useMemo(
    () => [
      { value: '', label: labels.allStatuses },
      { value: 'SCHEDULED', label: displayEnum('SCHEDULED', 'tourStatus' as any, displayLocale) },
      { value: 'COMPLETED', label: displayEnum('COMPLETED', 'tourStatus' as any, displayLocale) },
      { value: 'CANCELLED', label: displayEnum('CANCELLED', 'tourStatus' as any, displayLocale) },
      { value: 'NO_SHOW', label: displayEnum('NO_SHOW', 'tourStatus' as any, displayLocale) },
      { value: 'FOLLOW_UP', label: displayEnum('FOLLOW_UP', 'tourStatus' as any, displayLocale) },
    ],
    [displayLocale, labels.allStatuses],
  );

  const displayTourLead = (name: string | null | undefined) =>
    safeText(displayPerson(name, displayLocale, { route: '/operations/tours' }), labels.notSpecified);
  const displayTourLocation = (loc: string | null | undefined) =>
    safeText(displayGeo(loc, 'city' as any, displayLocale, { route: '/operations/tours' }), labels.notSpecified);
  const displayTourAgent = (name: string | null | undefined) =>
    safeText(displayPerson(name, displayLocale, { route: '/operations/tours' }), labels.notAssigned);

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
    [selectedTourId, tours],
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
        200,
      );

      if (!result?.success) {
        throw new Error(result?.error || labels.loadingFailed);
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
      setError(labels.loadingFailed);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, labels.loadingFailed]);

  useEffect(() => {
    loadTours();
  }, [loadTours]);

  const applyFilters = () => setAppliedFilters(filters);

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
      toast.error(labels.validationError);
      return;
    }

    const datetime = `${scheduleForm.date}T${scheduleForm.time}:00`;
    if (Number.isNaN(Date.parse(datetime))) {
      toast.error(labels.invalidDate);
      return;
    }

    setScheduleSaving(true);
    try {
      const result = await scheduleTourActionDirect({ userName, phone, datetime, location });

      if (!result?.success) {
        toast.error(
          result && "error" in result && typeof result.error === "string"
            ? result.error
            : labels.scheduleFailed,
        );
        return;
      }

      toast.success(labels.scheduleSuccess);
      setIsScheduleOpen(false);
      setScheduleForm(INITIAL_SCHEDULE_FORM);
      await loadTours();
    } catch (err: any) {
      toast.error(labels.scheduleError);
    } finally {
      setScheduleSaving(false);
    }
  };

  const kpis = [
    { label: labels.todayTours, value: stats.today, tone: 'text-[var(--nc-text-primary)]' },
    { label: labels.upcoming, value: stats.upcoming, tone: 'text-sky-600 dark:text-sky-300' },
    { label: labels.completed, value: stats.completed, tone: 'text-emerald-600 dark:text-emerald-300' },
    { label: labels.needsFollowUp, value: stats.needsFollowUp, tone: 'text-rose-600 dark:text-rose-300' },
  ];

  return (
    <section dir={direction} className="space-y-5 overflow-x-hidden px-4 pb-8 pt-4 text-[var(--nc-text-primary)] lg:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nc-text-primary)]">{labels.pageTitle}</h1>
          <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">{labels.pageSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsScheduleOpen(true)}
          className="nc-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          <Calendar size={16} />
          {labels.scheduleTour}
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <div
            key={item.label}
            className="flex min-h-[96px] flex-col justify-between rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm"
          >
            <span className="text-sm text-[var(--nc-text-secondary)]">{item.label}</span>
            <strong className={`text-2xl font-bold ${item.tone}`}>{formatNumber(item.value, displayLocale)}</strong>
            <span className="text-xs text-[var(--nc-text-secondary)]">{labels.currentScope}</span>
          </div>
        ))}
      </section>

      <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-3 shadow-sm">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
            <div className="relative min-w-0 md:w-[280px]">
              <label className="sr-only">{labels.search}</label>
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder={labels.searchPlaceholder}
                className={`min-h-[40px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 ${inputIconPadding} text-sm text-[var(--nc-text-primary)] outline-none placeholder:text-[var(--nc-text-dim)] focus:border-[var(--nc-accent-border)]`}
              />
              <Search size={15} className={`absolute ${iconSideClass} top-1/2 -translate-y-1/2 text-[var(--nc-text-secondary)]`} />
            </div>

            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              className="min-h-[40px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)] md:w-[160px]"
              aria-label={labels.statusAria}
            >
              {statusOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <DateField
              value={filters.fromDate}
              onChange={(value) => setFilters((current) => ({ ...current, fromDate: value }))}
              placeholder={labels.fromDate}
              className="md:w-[150px] [&_input]:min-h-[40px] [&_input]:bg-[var(--nc-surface-solid)]"
            />

            <DateField
              value={filters.toDate}
              onChange={(value) => setFilters((current) => ({ ...current, toDate: value }))}
              placeholder={labels.toDate}
              className="md:w-[150px] [&_input]:min-h-[40px] [&_input]:bg-[var(--nc-surface-solid)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden min-w-[56px] text-xs text-[var(--nc-text-secondary)] sm:inline">
              {formatNumber(tours.length, displayLocale)} {labels.tourCount}
            </span>
            <button type="button" onClick={applyFilters} className="nc-btn-primary min-h-[40px] rounded-xl px-4 py-2 text-xs font-semibold">
              {labels.apply}
            </button>
            <button type="button" onClick={clearFilters} className="nc-btn-ghost min-h-[40px] rounded-xl px-3 py-2 text-xs font-semibold">
              {labels.clear}
            </button>
          </div>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm">
        <div className="mb-4 flex min-h-[48px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--nc-text-primary)]">{labels.toursList}</h2>
            <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
              {formatNumber(tours.length, displayLocale)} {labels.tourCount}
            </p>
          </div>
          <span className="text-xs font-semibold text-[var(--nc-text-secondary)]">
            {labels.page} {formatNumber(page, displayLocale)} {labels.of} {formatNumber(totalPages, displayLocale)}
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
                {labels.tableHeaders.map((header) => (
                  <th key={header} className={`truncate px-3 py-3 ${textAlign} font-semibold`}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: PAGE_SIZE }, (_, index) => (
                  <tr key={`skel-${index}`} className="h-[47px] border-b border-[var(--nc-border)]">
                    {labels.tableHeaders.map((header, ci) => (
                      <td key={header} className="px-3 py-3">
                        <div className={`h-3 animate-pulse rounded-full bg-[var(--nc-surface-soft)] ${ci === 0 ? 'w-32' : ci === labels.tableHeaders.length - 1 ? 'w-16' : 'w-24'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr className="h-[235px] border-b border-[var(--nc-border)]">
                  <td colSpan={labels.tableHeaders.length} className="px-3 py-4">
                    <div className="mx-auto max-w-md rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-center">
                      <p className="text-sm font-bold text-rose-700 dark:text-rose-200">{error}</p>
                      <button type="button" onClick={loadTours} className="nc-btn nc-btn-ghost nc-btn-sm mt-3">
                        {labels.retry}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : tours.length === 0 ? (
                <tr className="h-[235px] border-b border-[var(--nc-border)]">
                  <td colSpan={labels.tableHeaders.length} className="px-3 py-4 text-center">
                    <p className="text-sm font-bold text-[var(--nc-text-primary)]">{labels.noToursTitle}</p>
                    <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">{labels.noToursDescription}</p>
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
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedTourId(tour.id);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        className={`h-[47px] cursor-pointer border-b border-[var(--nc-border)] transition-colors ${
                          selected ? 'bg-[var(--nc-surface-soft)]' : 'hover:bg-[var(--nc-surface-soft)]'
                        }`}
                      >
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-[var(--nc-text-primary)]">
                          {formatDateTime(tour.startAt, displayLocale, labels.notSpecified)}
                        </td>
                        <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                          <span className="block min-w-0 truncate">{displayTourLead(tour.leadName)}</span>
                        </td>
                        <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                          <span className="block min-w-0 truncate">{displayTourLocation(tour.location)}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <TourStatusBadge status={tour.status} locale={displayLocale} />
                        </td>
                        <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                          <span className="block min-w-0 truncate">{displayTourAgent(tour.assignedToName)}</span>
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
                            {labels.details}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {Array.from({ length: Math.max(0, PAGE_SIZE - pagedTours.length) }, (_, index) => (
                    <tr key={`reserved-${index}`} className="h-[47px] border-b border-transparent">
                      <td colSpan={labels.tableHeaders.length} />
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
                ? `${labels.showing} ${formatNumber((page - 1) * PAGE_SIZE + 1, displayLocale)}-${formatNumber(Math.min(page * PAGE_SIZE, tours.length), displayLocale)} ${labels.of} ${formatNumber(tours.length, displayLocale)}`
                : `${labels.showing} 0 ${labels.of} 0`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="nc-btn nc-btn-ghost nc-btn-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                {labels.previous}
              </button>
              <span className="rounded-lg border border-[var(--nc-border)] px-3 py-1.5 font-black text-[var(--nc-text-primary)]">
                {labels.page} {formatNumber(page, displayLocale)} {labels.of} {formatNumber(totalPages, displayLocale)}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="nc-btn nc-btn-ghost nc-btn-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                {labels.next}
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
                <h2 className="text-base font-bold text-[var(--nc-text-primary)]">{labels.tourDetails}</h2>
                <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                  {displayTourLead(selectedTour.leadName)} · {displayTourLocation(selectedTour.location)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTourId(null)}
                className="nc-btn-ghost min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-semibold"
                aria-label={labels.closeDetails}
              >
                <X size={15} />
              </button>
            </div>

            <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-2">
              <DetailRow label={labels.appointment} value={formatDateTime(selectedTour.startAt, displayLocale, labels.notSpecified)} />
              <DetailRow label={labels.expectedEnd} value={formatDateTime(selectedTour.endAt, displayLocale, labels.notSpecified)} />
              <DetailRow label={labels.attendees} value={formatNumber(selectedTour.attendees ?? 1, displayLocale)} />
              <DetailRow label={labels.customer} value={displayTourLead(selectedTour.leadName)} />
              <DetailRow label={labels.agent} value={displayTourAgent(selectedTour.assignedToName)} />
              <DetailRow label={labels.createdAt} value={formatDateOnly(selectedTour.createdAt, displayLocale, labels.notSpecified)} />
              <div className="grid min-h-[48px] grid-cols-[104px_minmax(0,1fr)] items-center gap-3 border-b border-[var(--nc-border)] py-2">
                <span className="text-xs font-bold text-[var(--nc-text-primary)]">{labels.status}</span>
                <span><TourStatusBadge status={selectedTour.status} locale={displayLocale} /></span>
              </div>
              <DetailRow label={labels.nextAction} value={nextActionForStatus(selectedTour.status, labels)} last />
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-4">
              <span className="mb-2 block text-xs font-bold text-[var(--nc-text-primary)]">{labels.notes}</span>
              <p className="text-sm leading-7 text-[var(--nc-text-secondary)]">
                {safeLocalizedNote(selectedTour.notes, displayLocale, labels.noNotes)}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 text-center">
            <div>
              <h2 className="text-sm font-bold text-[var(--nc-text-primary)]">{labels.tourDetails}</h2>
              <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">{labels.selectTour}</p>
            </div>
          </div>
        )}
      </div>

      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" dir={direction}>
          <div className="w-full max-w-xl rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--nc-glass-border)] px-5 py-4">
              <div>
                <h2 className="text-base font-black text-[var(--nc-text-primary)]">{labels.scheduleTitle}</h2>
                <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">{labels.scheduleSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={closeScheduleModal}
                className="rounded-lg border border-[var(--nc-border)] p-2 text-[var(--nc-text-secondary)] hover:text-[var(--nc-text-primary)]"
                aria-label={labels.closeDetails}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={submitSchedule} className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextInput
                  label={labels.customerName}
                  value={scheduleForm.userName}
                  onChange={(value) => updateScheduleField('userName', value)}
                  placeholder={labels.customerNamePlaceholder}
                  dir={direction}
                />
                <TextInput
                  label={labels.phone}
                  value={scheduleForm.phone}
                  onChange={(value) => updateScheduleField('phone', value)}
                  placeholder={labels.phonePlaceholder}
                  dir="ltr"
                />
              </div>

              <TextInput
                label={labels.locationUnit}
                value={scheduleForm.location}
                onChange={(value) => updateScheduleField('location', value)}
                placeholder={labels.locationPlaceholder}
                dir={direction}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DateField
                  label={labels.tourDate}
                  value={scheduleForm.date}
                  onChange={(value) => updateScheduleField('date', value)}
                  placeholder={labels.datePlaceholder}
                />
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">{labels.tourTime}</label>
                  <input
                    type="time"
                    value={scheduleForm.time}
                    onChange={(event) => updateScheduleField('time', event.target.value)}
                    className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 py-2 text-center text-xs font-bold text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)]"
                    dir="ltr"
                    lang={isArabic ? 'ar-SA' : 'en-US'}
                    aria-label={labels.tourTime}
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-[var(--nc-glass-border)] pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeScheduleModal} disabled={scheduleSaving} className="nc-btn nc-btn-ghost nc-btn-sm justify-center">
                  {labels.cancel}
                </button>
                <button type="submit" disabled={scheduleSaving} className="nc-btn nc-btn-primary nc-btn-sm justify-center disabled:opacity-60">
                  {scheduleSaving ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                  {labels.saveTour}
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
