'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from '@/app/context/ToastContext';
import { Calendar, Search, Eye, X, Clock } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { SmartCard } from '@/components/ui/SmartCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { BadgeVariant } from '@/components/ui/StatusBadge';
import { getToursAction, scheduleTourActionDirect } from '@/app/actions/tours';
import type { TourListItem, TourStats } from '@/app/actions/tours';

const statusBadgeMap: Record<string, BadgeVariant> = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'noShow',
  FOLLOW_UP: 'followUp',
};

const statusLabelMap: Record<string, string> = {
  SCHEDULED: 'مجدولة',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغاة',
  NO_SHOW: 'لم يحضر',
  FOLLOW_UP: 'تحتاج متابعة',
};

function toBadgeVariant(status: string): BadgeVariant {
  return statusBadgeMap[status] || 'default';
}

function toStatusLabel(status: string): string {
  return statusLabelMap[status] || status;
}

const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const period = hours >= 12 ? 'م' : 'ص';
    if (hours === 0) hours = 12;
    else if (hours > 12) hours -= 12;
    const timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${period}`;
    return `${day}/${month}/${year} — ${timeStr}`;
  } catch {
    return iso;
  }
}

function formatDateOnly(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

const KPI_CARD_BG = 'bg-[var(--nc-surface-solid)]';

export default function ToursView() {
  const [tours, setTours] = useState<TourListItem[]>([]);
  const [stats, setStats] = useState<TourStats>({ today: 0, upcoming: 0, completed: 0, needsFollowUp: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedTour, setSelectedTour] = useState<TourListItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedName, setSchedName] = useState('');
  const [schedPhone, setSchedPhone] = useState('');
  const [schedProperty, setSchedProperty] = useState('');
  const [schedDatetime, setSchedDatetime] = useState('');
  const [schedSubmitting, setSchedSubmitting] = useState(false);

  const loadTours = useCallback(async (p = 1) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const filters: any = {};
      if (appliedSearch) filters.search = appliedSearch;
      if (statusFilter) filters.status = statusFilter;
      if (fromDate) filters.fromDate = fromDate;
      if (toDate) filters.toDate = toDate;

      const result = await getToursAction(filters, p, 10);
      if (result.success) {
        setTours(result.data.tours);
        setStats(result.data.stats);
        setPagination(result.data.pagination);
      } else {
        setFetchError(result.error || 'تعذر تحميل الجولات');
      }
    } catch (err: any) {
      setFetchError('تعذر تحميل الجولات من قاعدة البيانات');
    } finally {
      setIsLoading(false);
    }
  }, [appliedSearch, statusFilter, fromDate, toDate]);

  useEffect(() => { loadTours(1); }, [loadTours]);

  const handleSearch = () => setAppliedSearch(searchTerm);

  const handleClearFilters = () => {
    setSearchTerm('');
    setAppliedSearch('');
    setStatusFilter('');
    setFromDate('');
    setToDate('');
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedName.trim() || !schedPhone.trim() || !schedDatetime) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة.');
      return;
    }
    setSchedSubmitting(true);
    try {
      const res = await scheduleTourActionDirect({
        propertyId: schedProperty.trim() || 'general',
        userName: schedName.trim(),
        phone: schedPhone.trim(),
        datetime: schedDatetime,
      });
      if (res.success) {
        toast.success('تمت جدولة الجولة بنجاح.');
        setShowScheduleModal(false);
        setSchedName('');
        setSchedPhone('');
        setSchedProperty('');
        setSchedDatetime('');
        loadTours(1);
      } else {
        toast.error(res.error || 'فشلت جدولة الجولة.');
      }
    } catch (err: any) {
      toast.error('خطأ أثناء جدولة الجولة: ' + err.message);
    } finally {
      setSchedSubmitting(false);
    }
  };

  const handleRowClick = (tour: TourListItem) => setSelectedTour(tour);

  const statusOptions = ['', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'FOLLOW_UP'];

  const columns: Column<TourListItem>[] = [
    {
      header: 'الموعد',
      accessor: (t) => <span className="font-bold text-xs whitespace-nowrap">{formatDateTime(t.startAt)}</span>,
    },
    {
      header: 'العميل',
      accessor: 'leadName',
    },
    {
      header: 'الموقع',
      accessor: 'location',
    },
    {
      header: 'الحالة',
      accessor: (t) => <StatusBadge variant={toBadgeVariant(t.status)} />,
    },
    {
      header: 'المسؤول',
      accessor: 'assignedToName',
    },
    {
      header: '',
      accessor: (t) => (
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedTour(t); }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded nc-btn nc-btn-ghost nc-btn-sm text-[10px] font-bold"
        >
          <Eye size={11} /> تفاصيل
        </button>
      ),
      className: 'text-center',
      headerClassName: 'text-center',
    },
  ];

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        title="الجولات العقارية"
        description="متابعة الجولات المجدولة، المكتملة، الملغاة، والجولات التي تحتاج متابعة."
      >
        <button
          onClick={() => setShowScheduleModal(true)}
          className="nc-btn nc-btn-primary text-xs font-bold"
        >
          <Calendar size={16} />
          جدولة جولة
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SmartCard elevation="default" className={`p-4 ${KPI_CARD_BG}`}>
          <p className="text-[var(--nc-text-dim)] text-[10px] font-bold mb-1">جولات اليوم</p>
          <h3 className="text-2xl font-black text-[var(--nc-text-primary)]">{stats.today}</h3>
        </SmartCard>
        <SmartCard elevation="default" className={`p-4 ${KPI_CARD_BG}`}>
          <p className="text-[var(--nc-text-dim)] text-[10px] font-bold mb-1">القادمة</p>
          <h3 className="text-2xl font-black text-sky-600 dark:text-sky-400">{stats.upcoming}</h3>
        </SmartCard>
        <SmartCard elevation="default" className={`p-4 ${KPI_CARD_BG}`}>
          <p className="text-[var(--nc-text-dim)] text-[10px] font-bold mb-1">المكتملة</p>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.completed}</h3>
        </SmartCard>
        <SmartCard elevation="default" className={`p-4 ${KPI_CARD_BG}`}>
          <p className="text-[var(--nc-text-dim)] text-[10px] font-bold mb-1">تحتاج متابعة</p>
          <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.needsFollowUp}</h3>
        </SmartCard>
      </div>

      {/* Filters Bar */}
      <SmartCard elevation="default" className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nc-text-dim)]" />
            <input
              placeholder="بحث بالموقع أو العميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pr-9 pl-3 py-2 rounded-lg bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] text-[var(--nc-text-primary)] text-xs outline-none focus:border-[var(--nc-accent-border)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] text-[var(--nc-text-primary)] text-xs p-2 outline-none focus:border-[var(--nc-accent-border)]"
          >
            <option value="">كل الحالات</option>
            {statusOptions.filter(Boolean).map((s) => (
              <option key={s} value={s}>{toStatusLabel(s)}</option>
            ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full rounded-lg bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] text-[var(--nc-text-primary)] text-xs p-2 outline-none focus:border-[var(--nc-accent-border)]"
            placeholder="من تاريخ"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full rounded-lg bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] text-[var(--nc-text-primary)] text-xs p-2 outline-none focus:border-[var(--nc-accent-border)]"
            placeholder="إلى تاريخ"
          />
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleSearch} className="nc-btn nc-btn-primary nc-btn-sm text-[11px] font-bold">
            تطبيق
          </button>
          <button onClick={handleClearFilters} className="nc-btn nc-btn-ghost nc-btn-sm text-[11px] font-bold">
            مسح
          </button>
          <span className="flex-1" />
          <span className="text-[11px] text-[var(--nc-text-dim)] font-medium self-center">
            {pagination.total} جولة
          </span>
        </div>
      </SmartCard>

      {/* Table & Details */}
      <div className="space-y-4">
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent animate-spin"></div>
            <span className="text-xs text-[var(--nc-text-dim)] font-medium">جاري تحميل الجولات...</span>
          </div>
        )}

        {fetchError && !isLoading && (
          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-center">
            <p className="text-xs text-rose-400 font-medium mb-2">{fetchError}</p>
            <button onClick={() => loadTours(1)} className="nc-btn nc-btn-ghost nc-btn-sm text-[11px] font-bold text-rose-400">
              إعادة المحاولة
            </button>
          </div>
        )}

        {!isLoading && !fetchError && tours.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
            <Calendar size={40} className="text-[var(--nc-text-dim)] opacity-40" />
            <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">لا توجد جولات عقارية حتى الآن</h3>
            <p className="text-xs text-[var(--nc-text-dim)] max-w-md">
              ستظهر هنا الجولات المجدولة والمتابعة عند توفرها.
            </p>
          </div>
        )}

        {!isLoading && !fetchError && tours.length > 0 && (
          <DataTable
            columns={columns as Column<TourListItem>[]}
            data={tours}
            onRowClick={handleRowClick}
            selectedId={selectedTour?.id}
            getId={(t) => t.id}
            pageSize={10}
            emptyMessage="لا توجد جولات مطابقة للفلاتر"
          />
        )}

        {selectedTour && (
          <SmartCard elevation="default" className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--nc-glass-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">تفاصيل الجولة</h3>
              <button
                onClick={() => setSelectedTour(null)}
                className="p-1 rounded hover:bg-[var(--nc-accent-soft)] text-[var(--nc-text-dim)] hover:text-[var(--nc-text-primary)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-[var(--nc-text-dim)] font-medium mb-0.5">الموعد</p>
                <p className="font-bold text-[var(--nc-text-primary)]">{formatDateTime(selectedTour.startAt)}</p>
              </div>
              <div>
                <p className="text-[var(--nc-text-dim)] font-medium mb-0.5">الانتهاء المتوقع</p>
                <p className="font-bold text-[var(--nc-text-primary)]">{formatDateTime(selectedTour.endAt)}</p>
              </div>
              <div>
                <p className="text-[var(--nc-text-dim)] font-medium mb-0.5">عدد الحضور</p>
                <p className="font-bold text-[var(--nc-text-primary)]">{selectedTour.attendees}</p>
              </div>
              <div>
                <p className="text-[var(--nc-text-dim)] font-medium mb-0.5">العميل</p>
                <p className="font-bold text-[var(--nc-text-primary)]">{selectedTour.leadName}</p>
              </div>
              <div>
                <p className="text-[var(--nc-text-dim)] font-medium mb-0.5">الموقع</p>
                <p className="font-bold text-[var(--nc-text-primary)]">{selectedTour.location}</p>
              </div>
              <div>
                <p className="text-[var(--nc-text-dim)] font-medium mb-0.5">المسؤول</p>
                <p className="font-bold text-[var(--nc-text-primary)]">{selectedTour.assignedToName}</p>
              </div>
              <div>
                <p className="text-[var(--nc-text-dim)] font-medium mb-0.5">الحالة</p>
                <StatusBadge variant={toBadgeVariant(selectedTour.status)} />
              </div>
              <div>
                <p className="text-[var(--nc-text-dim)] font-medium mb-0.5">تاريخ الإنشاء</p>
                <p className="font-medium text-[var(--nc-text-secondary)]">{formatDateOnly(selectedTour.createdAt)}</p>
              </div>
            </div>

            {selectedTour.notes && (
              <div className="pt-3 border-t border-[var(--nc-glass-border)]">
                <p className="text-[var(--nc-text-dim)] text-[11px] font-medium mb-1">الملاحظات</p>
                <div className="p-3 rounded-lg bg-[var(--nc-surface-soft)] border border-[var(--nc-glass-border)]">
                  <p className="text-xs text-[var(--nc-text-secondary)] leading-relaxed">{selectedTour.notes}</p>
                </div>
              </div>
            )}

            {!selectedTour.notes && (
              <div className="pt-3 border-t border-[var(--nc-glass-border)]">
                <p className="text-[var(--nc-text-dim)] text-[11px] font-medium mb-1">الملاحظات</p>
                <p className="text-xs text-[var(--nc-text-dim)] italic">لا توجد ملاحظات مسجلة.</p>
              </div>
            )}
          </SmartCard>
        )}

        {!selectedTour && !isLoading && !fetchError && tours.length > 0 && (
          <div className="py-10 flex flex-col items-center justify-center gap-2 text-center border border-dashed border-[var(--nc-glass-border)] rounded-2xl">
            <Eye size={24} className="text-[var(--nc-text-dim)] opacity-40" />
            <p className="text-xs text-[var(--nc-text-dim)] font-medium">اختر جولة من الجدول لعرض التفاصيل</p>
          </div>
        )}
      </div>

      {/* Schedule Tour Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowScheduleModal(false)}></div>
          <form
            onSubmit={handleScheduleSubmit}
            className="relative bg-[var(--nc-surface-strong)] border border-[var(--nc-glass-border)] p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[var(--nc-text-primary)] border-b border-[var(--nc-glass-border)] pb-2 flex items-center gap-2">
              <Clock size={18} />
              جدولة جولة عقارية
            </h3>

            <div className="space-y-1">
              <label className="text-[var(--nc-text-secondary)] font-medium block">اسم العميل *</label>
              <input
                type="text"
                required
                value={schedName}
                onChange={(e) => setSchedName(e.target.value)}
                placeholder="الاسم الرباعي..."
                className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-text-primary)] text-xs outline-none focus:border-[var(--nc-accent-border)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[var(--nc-text-secondary)] font-medium block">رقم الهاتف *</label>
              <input
                type="tel"
                required
                value={schedPhone}
                onChange={(e) => setSchedPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                dir="ltr"
                className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-text-primary)] text-xs outline-none focus:border-[var(--nc-accent-border)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[var(--nc-text-secondary)] font-medium block">الوحدة / العقار</label>
              <input
                type="text"
                value={schedProperty}
                onChange={(e) => setSchedProperty(e.target.value)}
                placeholder="رقم الوحدة أو وصف العقار..."
                className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-text-primary)] text-xs outline-none focus:border-[var(--nc-accent-border)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[var(--nc-text-secondary)] font-medium block">تاريخ ووقت الجولة *</label>
              <input
                type="datetime-local"
                required
                value={schedDatetime}
                onChange={(e) => setSchedDatetime(e.target.value)}
                className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-text-primary)] text-xs outline-none focus:border-[var(--nc-accent-border)]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={schedSubmitting} className="flex-1 py-2.5 nc-btn nc-btn-primary font-bold rounded-xl transition-all text-xs">
                {schedSubmitting ? 'جارٍ الجدولة...' : 'تأكيد الجدولة'}
              </button>
              <button type="button" onClick={() => setShowScheduleModal(false)} className="flex-1 py-2.5 nc-btn nc-btn-ghost font-medium rounded-xl transition-all text-xs">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
