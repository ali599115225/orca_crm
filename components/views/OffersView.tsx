// components/views/OffersView.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Loader2, Search, X } from 'lucide-react';

import { getPropertiesAction } from '@/app/actions/properties';
import { scheduleTourActionDirect } from '@/app/actions/tours';
import { toast } from '@/app/context/ToastContext';
import { DateField } from '@/components/ui/DateField';

type OfferStatus = 'available' | 'reserved' | 'sold' | 'unknown';
type OfferType = 'apartment' | 'villa' | 'land' | 'unknown';

type PropertyOffer = {
  id: string;
  title: string;
  type: OfferType;
  status: OfferStatus;
  price: number | null;
  beds: number | null;
  area: number | null;
  city: string;
  district: string;
  agent: string;
  posted: string | null;
  description: string;
};

type Filters = {
  search: string;
  type: string;
  status: string;
  sort: string;
};

type VisitForm = {
  date: string;
  time: string;
  name: string;
  phone: string;
  notes: string;
};

const PAGE_SIZE = 5;
const TABLE_HEADERS = ['العرض', 'الموقع', 'النوع', 'السعر', 'الحالة', 'الوكيل', 'التاريخ'];
const SKELETON_ROWS = Array.from({ length: PAGE_SIZE }, (_, index) => index);

const INITIAL_FILTERS: Filters = {
  search: '',
  type: '',
  status: '',
  sort: 'newest',
};

const INITIAL_VISIT_FORM: VisitForm = {
  date: '',
  time: '10:00',
  name: '',
  phone: '',
  notes: '',
};

function isTechnicalId(value: unknown): boolean {
  const text = String(value || '').trim();
  if (!text) return false;

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
    return true;
  }

  return text.length > 22 && /[0-9a-f]/i.test(text) && /[-_]/.test(text);
}

function textValue(value: unknown, fallback = 'غير محدد'): string {
  const text = String(value || '').trim();
  if (!text || isTechnicalId(text)) return fallback;
  return text;
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeType(value: unknown): OfferType {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'villa' || text === 'فيلا') return 'villa';
  if (text === 'land' || text === 'أرض') return 'land';
  if (text === 'apartment' || text === 'شقة') return 'apartment';
  return 'unknown';
}

function typeLabel(type: OfferType): string {
  if (type === 'villa') return 'فيلا';
  if (type === 'land') return 'أرض';
  if (type === 'apartment') return 'شقة';
  return 'غير محدد';
}

function normalizeStatus(value: unknown): OfferStatus {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'available' || text === 'متاح') return 'available';
  if (text === 'reserved' || text === 'hold' || text === 'محجوز') return 'reserved';
  if (text === 'sold' || text === 'مباع') return 'sold';
  return 'unknown';
}

function statusLabel(status: OfferStatus): string {
  if (status === 'available') return 'متاح';
  if (status === 'reserved') return 'محجوز';
  if (status === 'sold') return 'مباع';
  return 'غير محدد';
}

function statusClass(status: OfferStatus): string {
  if (status === 'available') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'reserved') return 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300';
  if (status === 'sold') return 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300';
  return 'border-slate-500/25 bg-slate-500/10 text-slate-700 dark:text-slate-300';
}

function formatNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'غير محدد';
  return value.toLocaleString('ar-SA');
}

function formatCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value <= 0) return 'غير محدد';
  return `${value.toLocaleString('ar-SA')} ر.س`;
}

function formatDate(value: string | null): string {
  if (!value) return 'غير محدد';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير محدد';
  return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getOfferTitle(item: any): string {
  const candidates = [
    item.title,
    item.name,
    item.propertyName,
    item.unitName,
    item.sku,
    [item.type, item.district].filter(Boolean).join(' - '),
  ];

  for (const candidate of candidates) {
    const text = String(candidate || '').trim();
    if (text && !isTechnicalId(text)) return text;
  }

  return 'عرض عقاري';
}

function mapPropertyToOffer(item: any): PropertyOffer {
  const city = textValue(item.city, 'غير محدد');
  const district = textValue(item.district || item.location || item.neighborhood, 'غير محدد');

  return {
    id: String(item.id || ''),
    title: getOfferTitle(item),
    type: normalizeType(item.type || item.propertyType),
    status: normalizeStatus(item.status),
    price: numberValue(item.price || item.askingPrice || item.listPrice),
    beds: numberValue(item.beds || item.bedrooms),
    area: numberValue(item.area || item.builtArea),
    city,
    district,
    agent: textValue(item.agentName || item.assignedToName || item.ownerName, 'غير معين'),
    posted: item.createdAt || item.updatedAt || null,
    description: textValue(item.description || item.desc || item.notes, 'لا يوجد وصف تفصيلي مسجل لهذا العرض.'),
  };
}

export default function OffersView() {
  const [offers, setOffers] = useState<PropertyOffer[]>([]);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isVisitOpen, setIsVisitOpen] = useState(false);
  const [visitSaving, setVisitSaving] = useState(false);
  const [visitForm, setVisitForm] = useState<VisitForm>(INITIAL_VISIT_FORM);

  useEffect(() => {
    async function loadOffers() {
      setLoading(true);
      setError(null);

      try {
        const result = await getPropertiesAction();
        const data = result && typeof result === 'object' && 'data' in result
          ? (result as { data?: unknown }).data
          : result;

        setOffers(Array.isArray(data) ? data.map(mapPropertyToOffer).filter((item) => item.id) : []);
      } catch {
        setOffers([]);
        setError('تعذر تحميل العروض العقارية.');
      } finally {
        setLoading(false);
      }
    }

    void loadOffers();
  }, []);

  const filteredOffers = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    const list = offers.filter((offer) => {
      const matchesSearch =
        !term ||
        [offer.title, offer.city, offer.district, offer.agent, typeLabel(offer.type), statusLabel(offer.status)]
          .join(' ')
          .toLowerCase()
          .includes(term);

      const matchesType = !filters.type || offer.type === filters.type;
      const matchesStatus = !filters.status || offer.status === filters.status;

      return matchesSearch && matchesType && matchesStatus;
    });

    return [...list].sort((a, b) => {
      if (filters.sort === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (filters.sort === 'price_desc') return (b.price || 0) - (a.price || 0);
      return new Date(b.posted || 0).getTime() - new Date(a.posted || 0).getTime();
    });
  }, [offers, filters]);

  const selectedOffer = useMemo(
    () => offers.find((offer) => offer.id === selectedOfferId) || null,
    [offers, selectedOfferId],
  );

  const totalPages = Math.max(1, Math.ceil(filteredOffers.length / PAGE_SIZE));
  const pagedOffers = filteredOffers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.type, filters.status, filters.sort]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const stats = useMemo(() => {
    const available = offers.filter((offer) => offer.status === 'available').length;
    const reserved = offers.filter((offer) => offer.status === 'reserved').length;
    const sold = offers.filter((offer) => offer.status === 'sold').length;
    const totalValue = offers.reduce((sum, offer) => sum + (offer.price || 0), 0);

    return [
      { label: 'إجمالي العروض', value: offers.length.toLocaleString('ar-SA'), note: 'ضمن البيانات المحملة' },
      { label: 'المتاحة', value: available.toLocaleString('ar-SA'), note: 'جاهزة للتسويق' },
      { label: 'المحجوزة', value: reserved.toLocaleString('ar-SA'), note: 'قيد المتابعة' },
      { label: 'قيمة العروض', value: formatCurrency(totalValue), note: `المباعة: ${sold.toLocaleString('ar-SA')}` },
    ];
  }, [offers]);

  const clearFilters = () => setFilters(INITIAL_FILTERS);

  const selectOffer = (offerId: string) => {
    setSelectedOfferId(offerId);
  };

  const handleOfferKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, offerId: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    selectOffer(offerId);
  };

  const openVisitModal = (offerId: string) => {
    selectOffer(offerId);
    setVisitForm(INITIAL_VISIT_FORM);
    setIsVisitOpen(true);
  };

  const closeVisitModal = () => {
    if (visitSaving) return;
    setIsVisitOpen(false);
    setVisitForm(INITIAL_VISIT_FORM);
  };

  const updateVisitField = (field: keyof VisitForm, value: string) => {
    setVisitForm((current) => ({ ...current, [field]: value }));
  };

  const submitVisit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedOffer || !visitForm.date || !visitForm.time || !visitForm.name.trim() || !visitForm.phone.trim()) {
      toast.error('يرجى تعبئة التاريخ والوقت واسم العميل ورقم الجوال.');
      return;
    }

    const datetime = `${visitForm.date}T${visitForm.time}:00`;
    if (Number.isNaN(Date.parse(datetime))) {
      toast.error('التاريخ أو الوقت غير صحيح.');
      return;
    }

    setVisitSaving(true);
    try {
      const result = await scheduleTourActionDirect({
        propertyId: selectedOffer.id,
        userName: visitForm.name.trim(),
        phone: visitForm.phone.replace(/\D/g, ''),
        datetime,
        location: `${selectedOffer.city} - ${selectedOffer.district}`,
      });

      if (!result?.success) {
        toast.error(result?.error || 'تعذر حجز موعد الزيارة.');
        return;
      }

      toast.success('تم حجز موعد الزيارة بنجاح.');
      setIsVisitOpen(false);
      setVisitForm(INITIAL_VISIT_FORM);
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء حجز موعد الزيارة.');
    } finally {
      setVisitSaving(false);
    }
  };

  return (
    <section dir="rtl" className="space-y-5 px-4 pb-8 pt-4 text-[var(--nc-text-primary)] lg:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nc-text-primary)]">العروض العقارية</h1>
          <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">
            متابعة العروض العقارية المتاحة والمحجوزة والمباعة من مصدر البيانات الفعلي.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="flex min-h-[96px] flex-col justify-between rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm">
            <span className="text-sm text-[var(--nc-text-secondary)]">{item.label}</span>
            <strong className="truncate text-2xl font-bold text-[var(--nc-text-primary)]">{item.value}</strong>
            <span className="text-xs text-[var(--nc-text-secondary)]">{item.note}</span>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-3 shadow-sm">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
            <div className="relative min-w-0 md:w-[300px]">
              <label className="sr-only">بحث</label>
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="بحث باسم العرض أو الموقع أو الوكيل"
                className="min-h-[40px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 pr-9 text-sm text-[var(--nc-text-primary)] outline-none placeholder:text-[var(--nc-text-dim)] focus:border-[var(--nc-accent-border)]"
              />
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nc-text-secondary)]" />
            </div>

            <select
              value={filters.type}
              onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
              className="min-h-[40px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)] md:w-[140px]"
              aria-label="نوع العرض"
            >
              <option value="">كل الأنواع</option>
              <option value="apartment">شقة</option>
              <option value="villa">فيلا</option>
              <option value="land">أرض</option>
            </select>

            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              className="min-h-[40px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)] md:w-[150px]"
              aria-label="حالة العرض"
            >
              <option value="">كل الحالات</option>
              <option value="available">متاح</option>
              <option value="reserved">محجوز</option>
              <option value="sold">مباع</option>
            </select>

            <select
              value={filters.sort}
              onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}
              className="min-h-[40px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)] md:w-[160px]"
              aria-label="ترتيب العروض"
            >
              <option value="newest">الأحدث</option>
              <option value="price_asc">السعر: الأقل</option>
              <option value="price_desc">السعر: الأعلى</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden min-w-[64px] text-xs text-[var(--nc-text-secondary)] sm:inline">
              {filteredOffers.length.toLocaleString('ar-SA')} عرض
            </span>
            <button type="button" onClick={clearFilters} className="nc-btn-ghost min-h-[40px] rounded-xl px-3 py-2 text-xs font-semibold">
              مسح
            </button>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-fit min-w-0 rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm">
          <div className="mb-4 flex min-h-[48px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--nc-text-primary)]">قائمة العروض</h2>
              <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">{filteredOffers.length.toLocaleString('ar-SA')} عرض</p>
            </div>
            <span className="text-xs font-semibold text-[var(--nc-text-secondary)]">
              صفحة {page.toLocaleString('ar-SA')} من {totalPages.toLocaleString('ar-SA')}
            </span>
          </div>

          <div>
            <div className="min-w-0">
              <table className="w-full min-w-0 table-fixed text-sm">
                <colgroup>
                  <col className="w-[23%]" />
                  <col className="w-[17%]" />
                  <col className="w-[9%]" />
                  <col className="w-[14%]" />
                  <col className="w-[11%]" />
                  <col className="w-[13%]" />
                  <col className="w-[13%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-[var(--nc-border)] text-[var(--nc-text-secondary)]">
                    {TABLE_HEADERS.map((header) => (
                      <th key={header} className="truncate px-2 py-3 text-right font-semibold">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    SKELETON_ROWS.map((row) => <OfferSkeletonRow key={row} />)
                  ) : error ? (
                    <StateRows>
                      <div className="mx-auto max-w-md rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-center">
                        <p className="text-sm font-bold text-rose-300">{error}</p>
                      </div>
                    </StateRows>
                  ) : filteredOffers.length === 0 ? (
                    <StateRows>
                      <div className="text-center">
                        <p className="text-sm font-bold text-[var(--nc-text-primary)]">لا توجد عروض عقارية مطابقة</p>
                        <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">غيّر الفلاتر أو تحقق من مصدر البيانات.</p>
                      </div>
                    </StateRows>
                  ) : (
                    <>
                      {pagedOffers.map((offer) => {
                        const selected = selectedOfferId === offer.id;
                        return (
                          <tr
                            key={offer.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => selectOffer(offer.id)}
                            onKeyDown={(event) => handleOfferKeyDown(event, offer.id)}
                            className={`h-[47px] cursor-pointer border-b border-[var(--nc-border)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--nc-accent-border)] ${
                              selected ? 'bg-[var(--nc-surface-soft)] ring-1 ring-inset ring-[var(--nc-accent-border)]' : 'hover:bg-[var(--nc-surface-soft)]'
                            }`}
                          >
                            <td className="px-2 py-3 font-semibold text-[var(--nc-text-primary)]">
                              <span className="block min-w-0 truncate">{offer.title}</span>
                            </td>
                            <td className="px-2 py-3 text-[var(--nc-text-secondary)]">
                              <span className="block min-w-0 truncate">{offer.city} - {offer.district}</span>
                            </td>
                            <td className="px-2 py-3 text-[var(--nc-text-secondary)]">
                              <span className="block min-w-0 truncate">{typeLabel(offer.type)}</span>
                            </td>
                            <td className="px-2 py-3 font-semibold text-[var(--nc-text-primary)]">
                              <span className="block min-w-0 truncate">{formatCurrency(offer.price)}</span>
                            </td>
                            <td className="px-1.5 py-3">
                              <StatusPill status={offer.status} />
                            </td>
                            <td className="px-2 py-3 text-[var(--nc-text-secondary)]">
                              <span className="block min-w-0 truncate">{offer.agent}</span>
                            </td>
                            <td className="px-2 py-3 text-[var(--nc-text-secondary)]">
                              <span className="block min-w-0 truncate">{formatDate(offer.posted)}</span>
                            </td>
                          </tr>
                        );
                      })}
                      {Array.from({ length: Math.max(0, PAGE_SIZE - pagedOffers.length) }, (_, index) => (
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
                  {filteredOffers.length > 0
                    ? `عرض ${(((page - 1) * PAGE_SIZE) + 1).toLocaleString('ar-SA')}-${Math.min(page * PAGE_SIZE, filteredOffers.length).toLocaleString('ar-SA')} من ${filteredOffers.length.toLocaleString('ar-SA')}`
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
        </div>

        <div className="h-fit rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 shadow-sm">
          {selectedOffer ? (
            <div className="space-y-4">
              <div className="border-b border-[var(--nc-border)] pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold text-[var(--nc-text-primary)]">{selectedOffer.title}</h2>
                    <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">{selectedOffer.city} - {selectedOffer.district}</p>
                  </div>
                  <StatusPill status={selectedOffer.status} />
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-2">
                <DetailRow label="السعر" value={formatCurrency(selectedOffer.price)} />
                <DetailRow label="النوع" value={typeLabel(selectedOffer.type)} />
                <DetailRow label="المساحة" value={selectedOffer.area ? `${formatNumber(selectedOffer.area)} م²` : 'غير محدد'} />
                <DetailRow label="غرف النوم" value={selectedOffer.beds ? formatNumber(selectedOffer.beds) : 'غير محدد'} />
                <DetailRow label="الوكيل" value={selectedOffer.agent} />
                <DetailRow label="تاريخ الإدراج" value={formatDate(selectedOffer.posted)} last />
              </div>

              <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-4">
                <span className="mb-2 block text-xs font-bold text-[var(--nc-text-primary)]">الوصف</span>
                <p className="text-sm leading-7 text-[var(--nc-text-secondary)]">{selectedOffer.description}</p>
              </div>

              <button
                type="button"
                onClick={() => openVisitModal(selectedOffer.id)}
                className="nc-btn-primary inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
              >
                <Calendar size={15} />
                حجز زيارة
              </button>
            </div>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 text-center">
              <div>
                <h2 className="text-base font-bold text-[var(--nc-text-primary)]">تفاصيل العرض</h2>
                <p className="mt-2 text-sm text-[var(--nc-text-secondary)]">اختر عرضًا من القائمة لعرض التفاصيل هنا.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isVisitOpen && selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--nc-border)] px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-[var(--nc-text-primary)]">حجز زيارة</h2>
                <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">{selectedOffer.title}</p>
              </div>
              <button
                type="button"
                onClick={closeVisitModal}
                className="rounded-lg border border-[var(--nc-border)] p-2 text-[var(--nc-text-secondary)] hover:text-[var(--nc-text-primary)]"
                aria-label="إغلاق"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={submitVisit} className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DateField
                  label="تاريخ الزيارة"
                  value={visitForm.date}
                  onChange={(value) => updateVisitField('date', value)}
                  placeholder="يوم/شهر/سنة"
                />
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">وقت الزيارة</label>
                  <input
                    type="time"
                    value={visitForm.time}
                    onChange={(event) => updateVisitField('time', event.target.value)}
                    className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 py-2 text-center text-xs font-bold text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)]"
                    dir="ltr"
                  />
                </div>
              </div>

              <TextInput
                label="اسم العميل"
                value={visitForm.name}
                onChange={(value) => updateVisitField('name', value)}
                placeholder="مثال: فهد الحربي"
              />
              <TextInput
                label="رقم الجوال"
                value={visitForm.phone}
                onChange={(value) => updateVisitField('phone', value)}
                placeholder="05xxxxxxxx"
                dir="ltr"
              />
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">ملاحظات</label>
                <textarea
                  rows={3}
                  value={visitForm.notes}
                  onChange={(event) => updateVisitField('notes', event.target.value)}
                  className="w-full resize-none rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 py-2.5 text-xs font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)]"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-[var(--nc-border)] pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeVisitModal} disabled={visitSaving} className="nc-btn nc-btn-ghost nc-btn-sm justify-center">
                  إلغاء
                </button>
                <button type="submit" disabled={visitSaving} className="nc-btn nc-btn-primary nc-btn-sm justify-center disabled:opacity-60">
                  {visitSaving ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                  حفظ الموعد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function StatusPill({ status }: { status: OfferStatus }) {
  return (
    <span className={`inline-flex min-h-[26px] w-full min-w-0 max-w-full items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full border px-1.5 text-[10px] font-black ${statusClass(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

function OfferSkeletonRow() {
  return (
    <tr className="h-[47px] border-b border-[var(--nc-border)]">
      {TABLE_HEADERS.map((header, index) => (
        <td key={header} className="px-2 py-3">
          <div className={`h-3 max-w-full animate-pulse rounded-full bg-[var(--nc-surface-soft)] ${index === 0 ? 'w-3/4' : index === TABLE_HEADERS.length - 1 ? 'w-1/2' : 'w-2/3'}`} />
        </td>
      ))}
    </tr>
  );
}

function StateRows({ children }: { children: React.ReactNode }) {
  return (
    <>
      <tr className="h-[235px] border-b border-[var(--nc-border)]">
        <td colSpan={TABLE_HEADERS.length} className="px-2 py-4">
          {children}
        </td>
      </tr>
      {Array.from({ length: PAGE_SIZE - 5 }, (_, index) => (
        <tr key={index} className="h-[47px] border-b border-transparent">
          <td colSpan={TABLE_HEADERS.length} />
        </tr>
      ))}
    </>
  );
}

function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`grid min-h-[46px] grid-cols-[104px_minmax(0,1fr)] items-center gap-3 py-2 ${last ? '' : 'border-b border-[var(--nc-border)]'}`}>
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
