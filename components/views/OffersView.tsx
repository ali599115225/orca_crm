// components/views/OffersView.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Loader2, Search, X } from 'lucide-react';

import { getPropertiesAction } from '@/app/actions/properties';
import { scheduleTourActionDirect } from '@/app/actions/tours';
import { toast } from '@/app/context/ToastContext';
import { DateField } from '@/components/ui/DateField';
import { useApp } from '@/app/context/AppContext';
import { displayPerson, displayGeo, displayEntity, displayEnum } from '@/lib/display';
import type { DisplayLocale } from '@/lib/display';

type OfferStatus = 'available' | 'reserved' | 'sold' | 'unknown';
type OfferType = 'property' | 'apartment' | 'villa' | 'land' | 'unknown';
type GeoKind = 'city' | 'district';

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
const TABLE_HEADERS_AR = ['العرض', 'الموقع', 'النوع', 'السعر', 'الحالة', 'الوكيل', 'التاريخ'];
const TABLE_HEADERS_EN = ['Offer', 'Location', 'Type', 'Price', 'Status', 'Agent', 'Date'];
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

function emptyValue(locale: DisplayLocale): string {
  return locale === 'ar' ? 'غير محدد' : 'Not specified';
}

function unspecifiedStatusValue(locale: DisplayLocale): string {
  return locale === 'ar' ? 'حالة غير محددة' : 'Unspecified';
}

function noDataValue(locale: DisplayLocale): string {
  return locale === 'ar' ? 'لا توجد بيانات' : 'No data available';
}

function isArabicText(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value);
}

function isTechnicalId(value: unknown): boolean {
  const text = String(value || '').trim();
  if (!text) return false;

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
    return true;
  }

  if (/^[0-9a-f]{8,24}$/i.test(text) && !isArabicText(text)) {
    return true;
  }

  return text.length > 22 && /[0-9a-f]/i.test(text) && /[-_]/.test(text);
}

function isDemoOrMockValue(value: unknown): boolean {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return false;

  return (
    text.includes('demo') ||
    text.includes('stress') ||
    text.includes('mock') ||
    text.includes('test data') ||
    text.includes('بيانات تجريبية') ||
    text.includes('تجريبي') ||
    text.includes('اختباري') ||
    text.includes('محاكاة')
  );
}

function isUnsafeFallbackValue(value: unknown): boolean {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return false;

  return [
    'unnamed person',
    'unknown person',
    'unassigned agent',
    'unknown status',
    'unknown',
    'unnamed property',
    'unnamed project',
    'unknown city',
    'unknown company',
    'no data available',
    'شخص غير محدد',
    'مسؤول غير محدد',
    'حالة غير معروفة',
    'غير محدد',
    'مشروع غير محدد',
    'عقار غير محدد',
    'شركة غير محددة',
    'لا توجد بيانات',
  ].includes(text);
}

function textValue(value: unknown): string {
  const text = String(value || '').trim();
  if (!text || isTechnicalId(text)) return '';
  return text;
}

function safeDisplayText(value: unknown, locale: DisplayLocale, fallback = emptyValue(locale)): string {
  const text = String(value || '').trim();
  if (!text || isTechnicalId(text) || isDemoOrMockValue(text) || isUnsafeFallbackValue(text)) return fallback;
  if (locale === 'en' && isArabicText(text)) return fallback;
  return text;
}

function cleanDisplayCandidate(value: unknown, rawValue: unknown, locale: DisplayLocale): string {
  const text = String(value || '').trim();
  const raw = String(rawValue || '').trim();

  if (!text || isTechnicalId(text) || isDemoOrMockValue(text) || isUnsafeFallbackValue(text)) return '';
  if (locale === 'ar' && !isArabicText(text)) return '';
  if (locale === 'en' && isArabicText(text)) return '';
  if (raw && text === raw) return '';

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
  if (text === 'property' || text === 'عقار' || text === 'وحدة' || text === 'unit') return 'property';
  if (text === 'villa' || text === 'فيلا') return 'villa';
  if (text === 'land' || text === 'أرض') return 'land';
  if (text === 'apartment' || text === 'flat' || text === 'شقة') return 'apartment';
  return 'property';
}

function normalizeStatus(value: unknown): OfferStatus {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'available' || text === 'متاح') return 'available';
  if (text === 'reserved' || text === 'hold' || text === 'محجوز') return 'reserved';
  if (text === 'sold' || text === 'مباع') return 'sold';
  return 'unknown';
}

function displayTypeLabel(type: OfferType, locale: DisplayLocale): string {
  const centralized =
    cleanDisplayCandidate(displayEnum(String(type), 'offerType' as any, locale), type, locale) ||
    cleanDisplayCandidate(displayEnum(String(type), 'propertyType' as any, locale), type, locale);

  if (centralized) return centralized;
  if (type === 'apartment') return locale === 'ar' ? 'شقة' : 'Apartment';
  if (type === 'villa') return locale === 'ar' ? 'فيلا' : 'Villa';
  if (type === 'land') return locale === 'ar' ? 'أرض' : 'Land';
  if (type === 'property') return locale === 'ar' ? 'عقار' : 'Property';
  return emptyValue(locale);
}

function displayStatusLabel(status: OfferStatus, locale: DisplayLocale): string {
  const centralized =
    cleanDisplayCandidate(displayEnum(String(status), 'offerStatus' as any, locale), status, locale) ||
    cleanDisplayCandidate(displayEnum(String(status), 'propertyStatus' as any, locale), status, locale);

  if (centralized) return centralized;
  if (status === 'available') return locale === 'ar' ? 'متاح' : 'Available';
  if (status === 'reserved') return locale === 'ar' ? 'محجوز' : 'Reserved';
  if (status === 'sold') return locale === 'ar' ? 'مباع' : 'Sold';
  return unspecifiedStatusValue(locale);
}

function statusClass(status: OfferStatus): string {
  if (status === 'available') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'reserved') return 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300';
  if (status === 'sold') return 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300';
  return 'border-slate-500/25 bg-slate-500/10 text-slate-700 dark:text-slate-300';
}

function formatNumber(value: number | null, locale: DisplayLocale): string {
  if (value === null || !Number.isFinite(value)) return emptyValue(locale);
  return value.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US');
}

function formatCurrency(value: number | null, locale: DisplayLocale): string {
  if (value === null || !Number.isFinite(value) || value <= 0) return emptyValue(locale);
  const formatted = value.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US');
  return locale === 'ar' ? `${formatted} ر.س` : `SAR ${formatted}`;
}

function formatDate(value: string | null, locale: DisplayLocale): string {
  if (!value) return emptyValue(locale);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return emptyValue(locale);
  return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getOfferTitle(item: any): string {
  const candidates = [
    item.title,
    item.name,
    item.propertyName,
    item.unitName,
    item.sku,
    item.code,
    item.reference,
  ];

  for (const candidate of candidates) {
    const text = textValue(candidate);
    if (text && !isDemoOrMockValue(text)) return text;
  }

  return '';
}

function mapPropertyToOffer(item: any): PropertyOffer {
  return {
    id: String(item.id || ''),
    title: getOfferTitle(item),
    type: normalizeType(item.type || item.propertyType || item.entityType),
    status: normalizeStatus(item.status || item.offerStatus),
    price: numberValue(item.price || item.askingPrice || item.listPrice),
    beds: numberValue(item.beds || item.bedrooms),
    area: numberValue(item.area || item.builtArea),
    city: textValue(item.city),
    district: textValue(item.district || item.location || item.neighborhood),
    agent: textValue(item.agentName || item.assignedToName || item.ownerName || item.agent),
    posted: item.createdAt || item.updatedAt || null,
    description: textValue(item.description || item.desc || item.notes),
  };
}

export default function OffersView() {
  const { lang } = useApp();
  const displayLocale: DisplayLocale = lang === 'EN' ? 'en' : 'ar';
  const isArabic = displayLocale === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  const textAlign = isArabic ? 'text-right' : 'text-left';
  const searchIconPosition = isArabic ? 'right-3' : 'left-3';
  const searchPadding = isArabic ? 'pr-9' : 'pl-9';
  const tableHeaders = isArabic ? TABLE_HEADERS_AR : TABLE_HEADERS_EN;
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const [offers, setOffers] = useState<PropertyOffer[]>([]);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isVisitOpen, setIsVisitOpen] = useState(false);
  const [visitSaving, setVisitSaving] = useState(false);
  const [visitForm, setVisitForm] = useState<VisitForm>(INITIAL_VISIT_FORM);

  const offerTypeLabel = (type: OfferType) => displayTypeLabel(type, displayLocale);
  const offerStatusLabel = (status: OfferStatus) => displayStatusLabel(status, displayLocale);

  const offerTitle = (offer: PropertyOffer) => {
    const centralized = cleanDisplayCandidate(displayEntity(offer.title, 'property' as any, displayLocale), offer.title, displayLocale);
    return centralized || safeDisplayText(offer.title, displayLocale, t('عرض عقاري', 'Property offer'));
  };

  const offerGeo = (value: string, kind: GeoKind) => {
    if (!value) return emptyValue(displayLocale);
    const centralized = cleanDisplayCandidate(displayGeo(value, kind as any, displayLocale), value, displayLocale);
    return centralized || safeDisplayText(value, displayLocale);
  };

  const offerLocation = (offer: PropertyOffer) => {
    const parts = [offerGeo(offer.city, 'city'), offerGeo(offer.district, 'district')].filter((part) => part && part !== emptyValue(displayLocale));
    return parts.length ? parts.join(' - ') : emptyValue(displayLocale);
  };

  const offerAgent = (offer: PropertyOffer) => {
    if (!offer.agent) return emptyValue(displayLocale);
    const centralized = cleanDisplayCandidate(displayPerson(offer.agent, displayLocale), offer.agent, displayLocale);
    return centralized || safeDisplayText(offer.agent, displayLocale);
  };

  const offerDescription = (offer: PropertyOffer) => {
    return safeDisplayText(
      offer.description,
      displayLocale,
      t('لا يوجد وصف تفصيلي مسجل لهذا العرض.', 'No detailed description is recorded for this offer.'),
    );
  };

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
        setError(t('تعذر تحميل العروض العقارية.', 'Unable to load property offers.'));
      } finally {
        setLoading(false);
      }
    }

    void loadOffers();
  }, [displayLocale]);

  const filteredOffers = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    const list = offers.filter((offer) => {
      const matchesSearch =
        !term ||
        [offerTitle(offer), offerLocation(offer), offerAgent(offer), offerTypeLabel(offer.type), offerStatusLabel(offer.status)]
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
  }, [offers, filters, displayLocale]);

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
      { label: t('إجمالي العروض', 'Total offers'), value: formatNumber(offers.length, displayLocale), note: t('ضمن البيانات المحملة', 'From loaded data') },
      { label: t('المتاحة', 'Available'), value: formatNumber(available, displayLocale), note: t('جاهزة للتسويق', 'Ready for marketing') },
      { label: t('المحجوزة', 'Reserved'), value: formatNumber(reserved, displayLocale), note: t('قيد المتابعة', 'Under follow-up') },
      { label: t('قيمة العروض', 'Offers value'), value: formatCurrency(totalValue, displayLocale), note: `${t('المباعة', 'Sold')}: ${formatNumber(sold, displayLocale)}` },
    ];
  }, [offers, displayLocale]);

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
      toast.error(t('يرجى تعبئة التاريخ والوقت واسم العميل ورقم الجوال.', 'Please enter the date, time, customer name, and mobile number.'));
      return;
    }

    const datetime = `${visitForm.date}T${visitForm.time}:00`;
    if (Number.isNaN(Date.parse(datetime))) {
      toast.error(t('التاريخ أو الوقت غير صحيح.', 'The date or time is invalid.'));
      return;
    }

    setVisitSaving(true);
    try {
      const result = await scheduleTourActionDirect({
        propertyId: selectedOffer.id,
        userName: visitForm.name.trim(),
        phone: visitForm.phone.replace(/\D/g, ''),
        datetime,
        location: offerLocation(selectedOffer),
      });

      if (!result?.success) {
        toast.error(result?.error || t('تعذر حجز موعد الزيارة.', 'Unable to schedule the visit.'));
        return;
      }

      toast.success(t('تم حجز موعد الزيارة بنجاح.', 'Visit scheduled successfully.'));
      setIsVisitOpen(false);
      setVisitForm(INITIAL_VISIT_FORM);
    } catch (err: any) {
      toast.error(err?.message || t('حدث خطأ أثناء حجز موعد الزيارة.', 'An error occurred while scheduling the visit.'));
    } finally {
      setVisitSaving(false);
    }
  };

  return (
    <section dir={dir} className="space-y-5 overflow-x-hidden px-4 pb-8 pt-4 text-[var(--nc-text-primary)] lg:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className={textAlign}>
          <h1 className="text-2xl font-bold text-[var(--nc-text-primary)]">{t('العروض العقارية', 'Property Offers')}</h1>
          <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">
            {t('متابعة العروض العقارية المتاحة والمحجوزة والمباعة من مصدر البيانات الفعلي.', 'Track available, reserved, and sold property offers from the live data source.')}
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
              <label className="sr-only">{t('بحث', 'Search')}</label>
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder={t('بحث باسم العرض أو الموقع أو الوكيل', 'Search by offer name, location, or agent')}
                className={`min-h-[40px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 ${searchPadding} text-sm text-[var(--nc-text-primary)] outline-none placeholder:text-[var(--nc-text-dim)] focus:border-[var(--nc-accent-border)]`}
              />
              <Search size={15} className={`absolute ${searchIconPosition} top-1/2 -translate-y-1/2 text-[var(--nc-text-secondary)]`} />
            </div>

            <select
              value={filters.type}
              onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
              className="min-h-[40px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)] md:w-[140px]"
              aria-label={t('نوع العرض', 'Offer type')}
            >
              <option value="">{t('كل الأنواع', 'All types')}</option>
              <option value="property">{displayTypeLabel('property', displayLocale)}</option>
              <option value="apartment">{displayTypeLabel('apartment', displayLocale)}</option>
              <option value="villa">{displayTypeLabel('villa', displayLocale)}</option>
              <option value="land">{displayTypeLabel('land', displayLocale)}</option>
            </select>

            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              className="min-h-[40px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)] md:w-[150px]"
              aria-label={t('حالة العرض', 'Offer status')}
            >
              <option value="">{t('كل الحالات', 'All statuses')}</option>
              <option value="available">{displayStatusLabel('available', displayLocale)}</option>
              <option value="reserved">{displayStatusLabel('reserved', displayLocale)}</option>
              <option value="sold">{displayStatusLabel('sold', displayLocale)}</option>
            </select>

            <select
              value={filters.sort}
              onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}
              className="min-h-[40px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)] md:w-[160px]"
              aria-label={t('ترتيب العروض', 'Sort offers')}
            >
              <option value="newest">{t('الأحدث', 'Newest')}</option>
              <option value="price_asc">{t('السعر: الأقل', 'Price: lowest')}</option>
              <option value="price_desc">{t('السعر: الأعلى', 'Price: highest')}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden min-w-[64px] text-xs text-[var(--nc-text-secondary)] sm:inline">
              {formatNumber(filteredOffers.length, displayLocale)} {t('عرض', 'offers')}
            </span>
            <button type="button" onClick={clearFilters} className="nc-btn-ghost min-h-[40px] rounded-xl px-3 py-2 text-xs font-semibold">
              {t('مسح', 'Clear')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 items-start gap-5 overflow-hidden xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 overflow-hidden rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm">
          <div className="mb-4 flex min-h-[48px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className={textAlign}>
              <h2 className="text-base font-bold text-[var(--nc-text-primary)]">{t('قائمة العروض', 'Offers List')}</h2>
              <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">{formatNumber(filteredOffers.length, displayLocale)} {t('عرض', 'offers')}</p>
            </div>
            <span className="text-xs font-semibold text-[var(--nc-text-secondary)]">
              {t('صفحة', 'Page')} {formatNumber(page, displayLocale)} {t('من', 'of')} {formatNumber(totalPages, displayLocale)}
            </span>
          </div>

          <div>
            <div className="min-w-0 overflow-x-auto">
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
                    {tableHeaders.map((header) => (
                      <th key={header} className={`truncate px-2 py-3 ${textAlign} font-semibold`}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    SKELETON_ROWS.map((row) => <OfferSkeletonRow key={row} headers={tableHeaders} />)
                  ) : error ? (
                    <StateRows colSpan={tableHeaders.length}>
                      <div className="mx-auto max-w-md rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-center">
                        <p className="text-sm font-bold text-rose-300">{error}</p>
                      </div>
                    </StateRows>
                  ) : filteredOffers.length === 0 ? (
                    <StateRows colSpan={tableHeaders.length}>
                      <div className="text-center">
                        <p className="text-sm font-bold text-[var(--nc-text-primary)]">{noDataValue(displayLocale)}</p>
                        <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">{t('غيّر الفلاتر أو تحقق من مصدر البيانات.', 'Change filters or check the data source.')}</p>
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
                              <span className="block min-w-0 truncate">{offerTitle(offer)}</span>
                            </td>
                            <td className="px-2 py-3 text-[var(--nc-text-secondary)]">
                              <span className="block min-w-0 truncate">{offerLocation(offer)}</span>
                            </td>
                            <td className="px-2 py-3 text-[var(--nc-text-secondary)]">
                              <span className="block min-w-0 truncate">{offerTypeLabel(offer.type)}</span>
                            </td>
                            <td className="px-2 py-3 font-semibold text-[var(--nc-text-primary)]">
                              <span className="block min-w-0 truncate">{formatCurrency(offer.price, displayLocale)}</span>
                            </td>
                            <td className="px-1.5 py-3">
                              <StatusPill status={offer.status} label={offerStatusLabel(offer.status)} />
                            </td>
                            <td className="px-2 py-3 text-[var(--nc-text-secondary)]">
                              <span className="block min-w-0 truncate">{offerAgent(offer)}</span>
                            </td>
                            <td className="px-2 py-3 text-[var(--nc-text-secondary)]">
                              <span className="block min-w-0 truncate">{formatDate(offer.posted, displayLocale)}</span>
                            </td>
                          </tr>
                        );
                      })}
                      {Array.from({ length: Math.max(0, PAGE_SIZE - pagedOffers.length) }, (_, index) => (
                        <tr key={`reserved-row-${index}`} className="h-[47px] border-b border-transparent">
                          <td colSpan={tableHeaders.length} />
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
                    ? `${t('عرض', 'Showing')} ${formatNumber(((page - 1) * PAGE_SIZE) + 1, displayLocale)}-${formatNumber(Math.min(page * PAGE_SIZE, filteredOffers.length), displayLocale)} ${t('من', 'of')} ${formatNumber(filteredOffers.length, displayLocale)}`
                    : `${t('عرض', 'Showing')} 0 ${t('من', 'of')} 0`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="nc-btn nc-btn-ghost nc-btn-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t('السابق', 'Previous')}
                  </button>
                  <span className="rounded-lg border border-[var(--nc-border)] px-3 py-1.5 font-black text-[var(--nc-text-primary)]">
                    {t('صفحة', 'Page')} {formatNumber(page, displayLocale)} {t('من', 'of')} {formatNumber(totalPages, displayLocale)}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    className="nc-btn nc-btn-ghost nc-btn-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t('التالي', 'Next')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] shadow-sm">
          {selectedOffer ? (
            <div className="flex max-h-[520px] flex-col">
              <div className="shrink-0 border-b border-[var(--nc-border)] p-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className={`min-w-0 ${textAlign}`}>
                    <h2 className="truncate text-base font-bold text-[var(--nc-text-primary)]">{offerTitle(selectedOffer)}</h2>
                    <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">{offerLocation(selectedOffer)}</p>
                  </div>
                  <StatusPill status={selectedOffer.status} label={offerStatusLabel(selectedOffer.status)} />
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 pt-4">
                <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-2">
                  <DetailRow label={t('السعر', 'Price')} value={formatCurrency(selectedOffer.price, displayLocale)} />
                  <DetailRow label={t('النوع', 'Type')} value={offerTypeLabel(selectedOffer.type)} />
                  <DetailRow label={t('المساحة', 'Area')} value={selectedOffer.area ? `${formatNumber(selectedOffer.area, displayLocale)} ${isArabic ? 'م²' : 'sqm'}` : emptyValue(displayLocale)} />
                  <DetailRow label={t('غرف النوم', 'Bedrooms')} value={selectedOffer.beds ? formatNumber(selectedOffer.beds, displayLocale) : emptyValue(displayLocale)} />
                  <DetailRow label={t('الوكيل', 'Agent')} value={offerAgent(selectedOffer)} />
                  <DetailRow label={t('تاريخ الإدراج', 'Posted date')} value={formatDate(selectedOffer.posted, displayLocale)} last />
                </div>

                <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-4">
                  <span className="mb-2 block text-xs font-bold text-[var(--nc-text-primary)]">{t('الوصف', 'Description')}</span>
                  <p className="text-sm leading-7 text-[var(--nc-text-secondary)]">{offerDescription(selectedOffer)}</p>
                </div>
              </div>

              <div className="shrink-0 border-t border-[var(--nc-border)] p-5 pt-4">
                <button
                  type="button"
                  onClick={() => openVisitModal(selectedOffer.id)}
                  className="nc-btn-primary inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  <Calendar size={15} />
                  {t('حجز زيارة', 'Schedule visit')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[180px] items-center justify-center p-5">
              <div className="rounded-2xl border border-dashed border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-6 text-center">
                <h2 className="text-sm font-bold text-[var(--nc-text-primary)]">{t('تفاصيل العرض', 'Offer Details')}</h2>
                <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">{t('اختر عرضًا من القائمة لعرض التفاصيل هنا.', 'Select an offer from the list to view details here.')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isVisitOpen && selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--nc-border)] px-5 py-4">
              <div className={textAlign}>
                <h2 className="text-base font-bold text-[var(--nc-text-primary)]">{t('حجز زيارة', 'Schedule visit')}</h2>
                <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">{offerTitle(selectedOffer)}</p>
              </div>
              <button
                type="button"
                onClick={closeVisitModal}
                className="rounded-lg border border-[var(--nc-border)] p-2 text-[var(--nc-text-secondary)] hover:text-[var(--nc-text-primary)]"
                aria-label={t('إغلاق', 'Close')}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={submitVisit} className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DateField
                  label={t('تاريخ الزيارة', 'Visit date')}
                  value={visitForm.date}
                  onChange={(value) => updateVisitField('date', value)}
                  placeholder={t('يوم/شهر/سنة', 'day/month/year')}
                />
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">{t('وقت الزيارة', 'Visit time')}</label>
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
                label={t('اسم العميل', 'Customer name')}
                value={visitForm.name}
                onChange={(value) => updateVisitField('name', value)}
                placeholder={t('مثال: فهد الحربي', 'Example: Fahad Al-Harbi')}
                dir={dir}
              />
              <TextInput
                label={t('رقم الجوال', 'Mobile number')}
                value={visitForm.phone}
                onChange={(value) => updateVisitField('phone', value)}
                placeholder="05xxxxxxxx"
                dir="ltr"
              />
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">{t('ملاحظات', 'Notes')}</label>
                <textarea
                  rows={3}
                  value={visitForm.notes}
                  onChange={(event) => updateVisitField('notes', event.target.value)}
                  className="w-full resize-none rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 py-2.5 text-xs font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)]"
                  dir={dir}
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-[var(--nc-border)] pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeVisitModal} disabled={visitSaving} className="nc-btn nc-btn-ghost nc-btn-sm justify-center">
                  {t('إلغاء', 'Cancel')}
                </button>
                <button type="submit" disabled={visitSaving} className="nc-btn nc-btn-primary nc-btn-sm justify-center disabled:opacity-60">
                  {visitSaving ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                  {t('حفظ الموعد', 'Save appointment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function StatusPill({ status, label }: { status: OfferStatus; label: string }) {
  return (
    <span className={`inline-flex min-h-[26px] w-full min-w-0 max-w-full items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full border px-1.5 text-[10px] font-black ${statusClass(status)}`}>
      {label}
    </span>
  );
}

function OfferSkeletonRow({ headers }: { headers: string[] }) {
  return (
    <tr className="h-[47px] border-b border-[var(--nc-border)]">
      {headers.map((header, index) => (
        <td key={header} className="px-2 py-3">
          <div className={`h-3 max-w-full animate-pulse rounded-full bg-[var(--nc-surface-soft)] ${index === 0 ? 'w-3/4' : index === headers.length - 1 ? 'w-1/2' : 'w-2/3'}`} />
        </td>
      ))}
    </tr>
  );
}

function StateRows({ children, colSpan }: { children: React.ReactNode; colSpan: number }) {
  return (
    <>
      <tr className="h-[235px] border-b border-[var(--nc-border)]">
        <td colSpan={colSpan} className="px-2 py-4">
          {children}
        </td>
      </tr>
      {Array.from({ length: PAGE_SIZE - 5 }, (_, index) => (
        <tr key={index} className="h-[47px] border-b border-transparent">
          <td colSpan={colSpan} />
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
