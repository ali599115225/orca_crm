'use client';

import React, { useState, useEffect } from 'react';
import {
  Home,
  MapPin,
  FileText,
  ChevronRight,
  ChevronLeft,
  Activity,
  DollarSign,
  FileCheck,
  Clock,
  Key,
} from 'lucide-react';
import { toast } from '@/app/context/ToastContext';
import { DateField } from '../ui/DateField';
import { getPropertiesAction, bookUnitActionDirect, completeHandoverActionDirect } from '@/app/actions/properties';
import { displayEntity, displayEnum, displayGeo } from '@/lib/display';
import type { DisplayLocale } from '@/lib/display';

interface PropertyDetailProps {
  propertyId: string;
  onBack: () => void;
  hasPermission: (action: string) => boolean;
  addTelemetryEvent: (type: string, payload?: any) => void;
  lang: 'AR' | 'EN';
  isArabic: boolean;
}

type PropertyStatusKey = 'available' | 'hold' | 'sold' | 'unknown';
type PropertyTypeKey =
  | 'apartment'
  | 'duplex'
  | 'villa'
  | 'upper_villa'
  | 'office'
  | 'land'
  | 'property'
  | 'unknown';

const primaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--nc-op-blue)] text-white text-xs font-bold transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60';
const accentButtonClass =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--nc-accent)] text-[#0B1220] text-xs font-bold transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] text-[var(--nc-text-primary)] text-xs font-bold transition-all hover:border-[var(--nc-accent-border)] disabled:cursor-not-allowed disabled:opacity-60';
const ghostButtonClass =
  'inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-2 rounded-xl bg-transparent text-[var(--nc-text-secondary)] text-xs font-bold transition-all hover:text-[var(--nc-text-primary)] hover:bg-[var(--nc-surface-solid)]';
const inputClass =
  'w-full rounded-xl bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] px-3 py-2.5 text-[var(--nc-text-primary)] text-xs outline-none transition-colors placeholder:text-[var(--nc-text-dim)] focus:border-[var(--nc-accent-border)]';
const labelClass = 'block text-xs font-medium text-[var(--nc-text-secondary)]';
const modalClass =
  'relative w-full max-w-md rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface)] p-6 text-xs shadow-2xl space-y-4';
const compactEmptyClass =
  'py-6 rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] flex items-center justify-center px-4 text-center text-sm text-[var(--nc-text-secondary)]';

function emptyValue(locale: DisplayLocale): string {
  return locale === 'ar' ? 'غير محدد' : 'Not specified';
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
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) return true;
  if (/^[0-9a-f]{8,24}$/i.test(text) && !isArabicText(text)) return true;
  return text.length > 22 && /[0-9a-f]/i.test(text) && /[-_]/.test(text);
}

function isDemoOrMockValue(value: unknown): boolean {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return false;
  return (
    text.includes('demo') ||
    text.includes('stress') ||
    text.includes('mock') ||
    text.includes('trial district') ||
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
    'unnamed property',
    'unnamed project',
    'unknown property',
    'unknown project',
    'unknown city',
    'unknown',
    'غير معروف',
    'مشروع غير محدد',
    'عقار غير محدد',
  ].includes(text);
}

function safeDisplayText(value: unknown, locale: DisplayLocale, fallback = emptyValue(locale)): string {
  const text = String(value || '').trim();
  if (!text || isTechnicalId(text) || isDemoOrMockValue(text) || isUnsafeFallbackValue(text)) return fallback;
  if (locale === 'en' && isArabicText(text)) return fallback;
  if (locale === 'ar' && /^[A-Z0-9_ -]+$/.test(text) && text.length > 2) return fallback;
  return text;
}

function safeLongText(value: unknown, locale: DisplayLocale, fallback: string): string {
  const text = String(value || '').trim();
  if (!text || isTechnicalId(text) || isDemoOrMockValue(text) || isUnsafeFallbackValue(text)) return fallback;
  if (locale === 'en' && isArabicText(text)) return fallback;
  return text;
}

function cleanDisplayCandidate(value: unknown, rawValue: unknown, locale: DisplayLocale): string {
  const text = String(value || '').trim();
  const raw = String(rawValue || '').trim();
  if (!text || isTechnicalId(text) || isDemoOrMockValue(text) || isUnsafeFallbackValue(text)) return '';
  if (locale === 'ar' && !isArabicText(text) && raw && text.toLowerCase() === raw.toLowerCase()) return '';
  if (locale === 'en' && isArabicText(text)) return '';
  if (raw && text === raw) return '';
  return text;
}

function normalizeStatus(value: unknown): PropertyStatusKey {
  const text = String(value || '').trim().toLowerCase();
  if (['available', 'متاح', 'متاحة'].includes(text)) return 'available';
  if (['hold', 'held', 'reserved', 'محجوز', 'محجوزة', 'محجوزة مؤقتاً'].includes(text)) return 'hold';
  if (['sold', 'مباع', 'مباعة'].includes(text)) return 'sold';
  return 'unknown';
}

function normalizeType(value: unknown): PropertyTypeKey {
  const text = String(value || '').trim().toLowerCase();
  if (['apartment', 'flat', 'شقة', 'شقة سكنية'].includes(text)) return 'apartment';
  if (['duplex', 'دوبلكس'].includes(text)) return 'duplex';
  if (['villa', 'standalone_villa', 'فيلا', 'فيلا مستقلة'].includes(text)) return 'villa';
  if (['upper_villa', 'upper villa', 'فيلا علوية'].includes(text)) return 'upper_villa';
  if (['office', 'commercial_office', 'مكتب', 'مكتب تجاري'].includes(text)) return 'office';
  if (['land', 'plot', 'أرض'].includes(text)) return 'land';
  if (['property', 'unit', 'عقار', 'وحدة'].includes(text)) return 'property';
  return 'unknown';
}

function displayStatusLabel(value: unknown, locale: DisplayLocale): string {
  const key = normalizeStatus(value);
  const centralized =
    cleanDisplayCandidate(displayEnum(String(value || key), 'propertyStatus' as any, locale), value, locale) ||
    cleanDisplayCandidate(displayEnum(key, 'propertyStatus' as any, locale), key, locale) ||
    cleanDisplayCandidate(displayEnum(key, 'unitStatus' as any, locale), key, locale);

  if (centralized) return centralized;
  if (key === 'available') return locale === 'ar' ? 'متاحة' : 'Available';
  if (key === 'hold') return locale === 'ar' ? 'محجوزة مؤقتاً' : 'On hold';
  if (key === 'sold') return locale === 'ar' ? 'مباعة' : 'Sold';
  return locale === 'ar' ? 'حالة غير محددة' : 'Unspecified';
}

function statusBadgeClass(value: unknown): string {
  const key = normalizeStatus(value);
  if (key === 'available') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20';
  if (key === 'hold') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20';
  if (key === 'sold') return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20';
  return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20';
}

function displayTypeLabel(value: unknown, locale: DisplayLocale): string {
  const key = normalizeType(value);
  const centralized =
    cleanDisplayCandidate(displayEnum(String(value || key), 'propertyType' as any, locale), value, locale) ||
    cleanDisplayCandidate(displayEnum(key, 'propertyType' as any, locale), key, locale) ||
    cleanDisplayCandidate(displayEnum(key, 'unitType' as any, locale), key, locale) ||
    cleanDisplayCandidate(displayEntity(String(value || key), 'property' as any, locale), value, locale);

  if (centralized) return centralized;
  if (key === 'apartment') return locale === 'ar' ? 'شقة سكنية' : 'Residential apartment';
  if (key === 'duplex') return locale === 'ar' ? 'دوبلكس' : 'Duplex';
  if (key === 'villa') return locale === 'ar' ? 'فيلا مستقلة' : 'Standalone villa';
  if (key === 'upper_villa') return locale === 'ar' ? 'فيلا علوية' : 'Upper villa';
  if (key === 'office') return locale === 'ar' ? 'مكتب تجاري' : 'Commercial office';
  if (key === 'land') return locale === 'ar' ? 'أرض' : 'Land';
  if (key === 'property') return locale === 'ar' ? 'عقار' : 'Property';
  return emptyValue(locale);
}

function displayProjectName(value: unknown, locale: DisplayLocale): string {
  const centralized = cleanDisplayCandidate(displayEntity(String(value || ''), 'project' as any, locale), value, locale);
  return centralized || safeDisplayText(value, locale);
}

function displayUnitNumber(value: unknown, locale: DisplayLocale): string {
  const text = safeDisplayText(value, locale, '');
  if (text) return text;
  return locale === 'ar' ? 'وحدة غير محددة' : 'Unspecified unit';
}

function displayArea(value: unknown, locale: DisplayLocale): string {
  const text = String(value || '').trim();
  if (!text || isTechnicalId(text) || isDemoOrMockValue(text)) return emptyValue(locale);
  const numeric = text.match(/\d+([.,]\d+)?/)?.[0];
  if (!numeric) return safeDisplayText(text, locale);
  return locale === 'ar' ? `${numeric} م²` : `${numeric} sqm`;
}

function formatNumber(value: number, locale: DisplayLocale): string {
  return Number(value || 0).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US');
}

function formatMoney(value: number, locale: DisplayLocale): string {
  const amount = Number(value || 0).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US');
  return locale === 'ar' ? `${amount} ر.س` : `SAR ${amount}`;
}

function formatDateValue(value: unknown, locale: DisplayLocale): string {
  const raw = String(value || '').trim();
  if (!raw || isTechnicalId(raw) || isDemoOrMockValue(raw)) return emptyValue(locale);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return safeDisplayText(raw, locale);
  return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function initialChecklist(isArabic: boolean): string {
  return isArabic
    ? '1. فحص تمديدات الكهرباء والإنارة\n2. فحص السباكة ومنافذ الصرف وضغط المياه\n3. نظافة الأبواب والمقابض الخشبية والألمنيوم'
    : '1. Inspect electrical wiring and lighting\n2. Inspect plumbing, drains, and water pressure\n3. Check doors, handles, and finishing quality';
}

function localizedLabels(isArabic: boolean) {
  return {
    loading: isArabic ? 'جاري تحميل بيانات الوحدة...' : 'Loading unit details...',
    backToList: isArabic ? 'العودة إلى قائمة الوحدات' : 'Back to units list',
    notFound: isArabic ? 'لم يتم العثور على الوحدة العقارية.' : 'Property unit was not found.',
    contractLinked: isArabic ? 'عقد مرتبط' : 'Linked contract',
    handoverRegistered: isArabic ? 'تم تسجيل التسليم' : 'Handover registered',
    createBooking: isArabic ? 'إنشاء حجز فوري' : 'Create booking',
    startHandover: isArabic ? 'بدء تسليم الوحدة' : 'Start handover',
    showRevenueSummary: isArabic ? 'عرض ملخص الإيرادات' : 'Show revenue summary',
    tabs: {
      events: isArabic ? 'الأحداث' : 'Events',
      pricing: isArabic ? 'التسعير' : 'Pricing',
      accounting: isArabic ? 'المالية' : 'Finance',
      docs: isArabic ? 'المستندات' : 'Documents',
    },
    eventsTitle: isArabic ? 'سجل الأحداث' : 'Event log',
    noEvents: isArabic ? 'لا توجد أحداث مسجلة لهذه الوحدة.' : 'No events are recorded for this unit.',
    eventFallback: isArabic ? 'حدث عقاري' : 'Property event',
    eventNoteFallback: isArabic ? 'لا توجد تفاصيل إضافية.' : 'No additional details.',
    pricingTitle: isArabic ? 'حاسبة التسعير' : 'Pricing calculator',
    basePrice: isArabic ? 'السعر الأساسي (ر.س)' : 'Base price (SAR)',
    discountPercent: isArabic ? 'نسبة الخصم (%)' : 'Discount (%)',
    calculatePrice: isArabic ? 'احتساب السعر' : 'Calculate price',
    accountingTitle: isArabic ? 'الملخص المالي' : 'Financial summary',
    grossValue: isArabic ? 'القيمة الإجمالية' : 'Gross value',
    collected: isArabic ? 'المحصل' : 'Collected',
    remaining: isArabic ? 'المتبقي' : 'Remaining',
    taxAndCommission: isArabic ? 'الضرائب والعمولة' : 'Taxes and commission',
    showRevenueDetails: isArabic ? 'عرض تفاصيل الإيرادات' : 'Show revenue details',
    docsTitle: isArabic ? 'المستندات' : 'Documents',
    noDocs: isArabic ? 'لا توجد مستندات مرفوعة.' : 'No uploaded documents.',
    images: isArabic ? 'الصور' : 'Images',
    bookTitle: isArabic ? 'حجز وحدة عقارية وإصدار عقد' : 'Book property unit and issue contract',
    selectedUnit: isArabic ? 'الوحدة المحددة:' : 'Selected unit:',
    buyerName: isArabic ? 'اسم المشتري أو معرف العميل:' : 'Buyer name or client reference:',
    buyerPlaceholder: isArabic ? 'الاسم الرباعي للمشتري...' : 'Buyer full name...',
    contractValue: isArabic ? 'القيمة التعاقدية للبيع (ر.س):' : 'Contract sale value (SAR):',
    bookingDate: isArabic ? 'تاريخ الحجز والتعاقد' : 'Booking and contract date',
    birthDate: isArabic ? 'تاريخ ميلاد العميل' : 'Client birth date',
    confirmContract: isArabic ? 'تأكيد وإمضاء العقد' : 'Confirm and issue contract',
    cancel: isArabic ? 'إلغاء' : 'Cancel',
    handoverTitle: isArabic ? 'تسجيل تسليم الوحدة' : 'Register unit handover',
    handoverDescription: isArabic
      ? 'سجّل تاريخ التسليم المعتمد، وأرفق قائمة الملاحظات وصورة المعاينة الميدانية.'
      : 'Record the approved handover date, checklist notes, and field inspection photo.',
    handoverDate: isArabic ? 'تاريخ الاستلام النهائي المعتمد' : 'Approved final handover date',
    checklist: isArabic ? 'قائمة فحص الملاحظات والعيوب:' : 'Notes and defects checklist:',
    handoverPhoto: isArabic ? 'رابط صورة المعاينة الميدانية الموثقة:' : 'Documented field inspection photo URL:',
    registerHandover: isArabic ? 'تسجيل التسليم' : 'Register handover',
    noBookPermission: isArabic
      ? 'عذراً! دورك الحالي لا يمتلك الصلاحية لإنشاء حجز.'
      : 'Your current role does not have permission to create a booking.',
    noHandoverPermission: isArabic
      ? 'عذراً! دورك الحالي لا يمتلك الصلاحية لبدء تسليم الوحدة.'
      : 'Your current role does not have permission to start unit handover.',
    noFinancePermission: isArabic
      ? 'عذراً! دورك الحالي لا يمتلك صلاحية استعراض البيانات المالية التفصيلية.'
      : 'Your current role does not have permission to view detailed financial data.',
    bookingDateRequired: isArabic ? 'يرجى تحديد تاريخ الحجز بصيغة صحيحة.' : 'Please select a valid booking date.',
    handoverDateRequired: isArabic ? 'يرجى تحديد تاريخ التسليم المعتمد.' : 'Please select the approved handover date.',
    dbError: isArabic ? 'حدث خطأ في قاعدة البيانات' : 'A database error occurred',
    bookingSuccess: isArabic ? 'تم إنشاء الحجز بنجاح.' : 'Booking created successfully.',
    bookingFailed: isArabic ? 'خطأ في إتمام الحجز: ' : 'Booking failed: ',
    handoverSuccess: isArabic ? 'تم تسجيل التسليم بنجاح.' : 'Handover registered successfully.',
    handoverFailed: isArabic ? 'خطأ في إتمام التسليم: ' : 'Handover failed: ',
    noDescription: isArabic ? 'لا يوجد وصف تفصيلي مسجل لهذه الوحدة.' : 'No detailed description is recorded for this unit.',
    noPhoto: isArabic ? 'لا توجد صورة' : 'No image',
    priceResult: (discounted: string, commission: string, taxes: string, netToOwner: string) =>
      isArabic
        ? `السعر النهائي: ${discounted} | عمولة المبيعات: ${commission} | الضريبة العقارية: ${taxes} | صافي المالك: ${netToOwner}`
        : `Final price: ${discounted} | Sales commission: ${commission} | Real estate tax: ${taxes} | Owner net: ${netToOwner}`,
    financeToast: (gross: string, collected: string, outstanding: string, commissionTax: string) =>
      isArabic
        ? `ملخص مالي للوحدة\nالقيمة الإجمالية: ${gross}\nالمبالغ المحصلة: ${collected}\nالأقساط المتبقية: ${outstanding}\nإجمالي الضرائب والعمولة: ${commissionTax}`
        : `Unit financial summary\nGross value: ${gross}\nCollected: ${collected}\nOutstanding: ${outstanding}\nTaxes and commission: ${commissionTax}`,
    bookingEventType: isArabic ? 'إنشاء حجز وعقد' : 'Booking and contract created',
    handoverEventType: isArabic ? 'إتمام معاينة وتسليم نهائي' : 'Final inspection and handover completed',
    handoverEventNote: isArabic ? 'تم تسجيل التسليم وإرفاق بيانات المعاينة.' : 'Handover was registered with inspection details.',
  };
}

export default function PropertyDetail({
  propertyId,
  onBack,
  hasPermission,
  addTelemetryEvent,
  lang,
  isArabic,
}: PropertyDetailProps) {
  const locale: DisplayLocale = isArabic ? 'ar' : 'en';
  const labels = localizedLabels(isArabic);
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('events');

  const [simulatedPrice, setSimulatedPrice] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [priceSimResult, setPriceSimResult] = useState('');

  const [bookingDate, setBookingDate] = useState('');
  const [bookingBirthDate, setBookingBirthDate] = useState('');
  const [bookingLeadId, setBookingLeadId] = useState('');
  const [bookingOfferPrice, setBookingOfferPrice] = useState(0);

  const [handoverDate, setHandoverDate] = useState('');
  const [handoverChecklist, setHandoverChecklist] = useState(() => initialChecklist(isArabic));
  const [handoverPhoto, setHandoverPhoto] = useState('https://picsum.photos/seed/handover/400/300');

  const [activeModal, setActiveModal] = useState<string | null>(null);

  useEffect(() => {
    async function loadProperty() {
      try {
        setLoading(true);
        const prResult = await getPropertiesAction();
        const propsList = prResult && 'data' in prResult ? prResult.data : Array.isArray(prResult) ? prResult : [];
        const found = propsList?.find((p: any) => String(p.id) === String(propertyId));
        if (found) {
          setProperty(found);
          setSimulatedPrice(found.price || 0);
        } else {
          toast.error(labels.notFound);
        }
      } catch (err: any) {
        toast.error(isArabic ? 'خطأ في تحميل بيانات الوحدة' : 'Failed to load unit details');
      } finally {
        setLoading(false);
      }
    }
    loadProperty();
  }, [propertyId]);

  const propertyTitle = property
    ? `${displayUnitNumber(property.sku, locale)} — ${displayTypeLabel(property.type, locale)}`
    : emptyValue(locale);
  const propertyProject = property ? displayProjectName(property.project, locale) : emptyValue(locale);
  const propertyArea = property ? displayArea(property.area, locale) : emptyValue(locale);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    if (!hasPermission('BOOK_UNIT')) {
      toast.error(labels.noBookPermission);
      return;
    }
    if (!bookingDate) {
      toast.error(labels.bookingDateRequired);
      return;
    }

    try {
      const res = await bookUnitActionDirect({
        unitId: String(property.id),
        clientId: bookingLeadId,
        offerPrice: bookingOfferPrice,
        bookingDate,
      });

      if (!res.success || !res.contractId) {
        throw new Error(res.error || labels.dbError);
      }

      const contractId = res.contractId;
      const dateObj = new Date(bookingDate);
      const visibleDateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

      setProperty((prev: any) => ({
        ...prev,
        status: 'Sold',
        contractId,
        events: [
          ...(prev.events || []),
          {
            id: `ev_bk_${Date.now()}`,
            type: labels.bookingEventType,
            at: bookingDate,
            note: isArabic
              ? `حجز للعميل ${safeDisplayText(bookingLeadId, locale)} بقيمة ${formatMoney(bookingOfferPrice, locale)}`
              : `Booking for ${safeDisplayText(bookingLeadId, locale)} at ${formatMoney(bookingOfferPrice, locale)}`,
          },
        ],
      }));

      addTelemetryEvent('booking.created', {
        unitId: property.id,
        leadId: bookingLeadId,
        offerPrice: bookingOfferPrice,
        bookingDateNative: bookingDate,
        bookingDateVisible: visibleDateStr,
        bookingBirthDate,
        contractId,
      });

      toast.success(labels.bookingSuccess);
    } catch (err: any) {
      toast.error(labels.bookingFailed + err.message);
    }

    setBookingLeadId('');
    setBookingOfferPrice(0);
    setBookingDate('');
    setBookingBirthDate('');
    setActiveModal(null);
  };

  const handleCompleteHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    if (!hasPermission('START_HANDOVER')) {
      toast.error(labels.noHandoverPermission);
      return;
    }
    if (!handoverDate) {
      toast.error(labels.handoverDateRequired);
      return;
    }

    try {
      const res = await completeHandoverActionDirect({
        unitId: String(property.id),
        handoverDate,
        checklist: handoverChecklist,
        photoUrl: handoverPhoto,
      });

      if (!res.success || !res.handoverId) {
        throw new Error(res.error || labels.dbError);
      }

      const handoverId = res.handoverId;
      const dateObj = new Date(handoverDate);
      const visibleDateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

      setProperty((prev: any) => ({
        ...prev,
        handoverCompleted: true,
        handovers: [
          ...(prev.handovers || []),
          {
            id: handoverId,
            scheduledAt: visibleDateStr,
            status: 'Completed',
            checklist: handoverChecklist,
            media: [handoverPhoto],
            completedAt: new Date().toISOString(),
          },
        ],
        events: [
          ...(prev.events || []),
          {
            id: `ev_ho_${Date.now()}`,
            type: labels.handoverEventType,
            at: handoverDate,
            note: labels.handoverEventNote,
          },
        ],
      }));

      addTelemetryEvent('handover.completed', {
        handoverId,
        unitId: property.id,
        scheduledNative: handoverDate,
        scheduledVisible: visibleDateStr,
        checklistCount: handoverChecklist.split('\n').length,
      });

      toast.success(labels.handoverSuccess);
    } catch (err: any) {
      toast.error(labels.handoverFailed + err.message);
    }

    setHandoverDate('');
    setActiveModal(null);
  };

  const handlePriceCalculation = () => {
    if (!property) return;
    const discounted = Math.round(simulatedPrice * (1 - discountPercent / 100));
    const commission = Math.round(discounted * 0.03);
    const taxes = Math.round(discounted * 0.05);
    const netToOwner = discounted - commission - taxes;

    setPriceSimResult(
      labels.priceResult(
        formatMoney(discounted, locale),
        formatMoney(commission, locale),
        formatMoney(taxes, locale),
        formatMoney(netToOwner, locale)
      )
    );
  };

  const showFinancialSummary = () => {
    if (!property) return;
    if (!hasPermission('VIEW_FINANCE')) {
      toast.error(labels.noFinancePermission);
      return;
    }

    const grossAmount = property.price || 0;
    const collected = normalizeStatus(property.status) === 'sold' ? grossAmount : 0;
    const outstanding = normalizeStatus(property.status) === 'sold' ? 0 : grossAmount;
    const commissionTaxTotal = Math.round(grossAmount * 0.08);

    toast.success(
      labels.financeToast(
        formatMoney(grossAmount, locale),
        formatMoney(collected, locale),
        formatMoney(outstanding, locale),
        formatMoney(commissionTaxTotal, locale)
      )
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center p-6">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent" />
          <p className="text-xs font-medium text-[var(--nc-text-secondary)]">{labels.loading}</p>
        </div>
      </div>
    );
  }

  if (!property) {
    const BackIcon = isArabic ? ChevronRight : ChevronLeft;
    return (
      <div className="p-6" dir={isArabic ? 'rtl' : 'ltr'}>
        <button onClick={onBack} className={ghostButtonClass}>
          <BackIcon size={14} />
          {labels.backToList}
        </button>
        <div className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-300">
          {labels.notFound}
        </div>
      </div>
    );
  }

  const hasCompletedHandover = Boolean(
    property.handoverCompleted || property.financialSettlementId || property.handovers?.some((h: any) => h.status === 'Completed')
  );

  const BackIcon = isArabic ? ChevronRight : ChevronLeft;

  return (
    <div className="properties-page p-6 text-[var(--nc-text-primary)]" dir={isArabic ? 'rtl' : 'ltr'}>
      <button onClick={onBack} className={`${ghostButtonClass} mb-4`}>
        <BackIcon size={14} />
        {labels.backToList}
      </button>

      <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 shadow-sm mb-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--nc-text-primary)]">
                  {propertyTitle}
                </h2>
                <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                  <MapPin size={12} className={`${isArabic ? 'ml-1' : 'mr-1'} inline`} />
                  {propertyProject} | {propertyArea}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusBadgeClass(property.status)}`}>
                {displayStatusLabel(property.status, locale)}
              </span>
            </div>
            <p className="line-clamp-2 text-xs leading-relaxed text-[var(--nc-text-secondary)]">
              {safeLongText(property.desc, locale, labels.noDescription)}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <span className="text-lg font-black text-[var(--nc-text-primary)]">{formatMoney(Number(property.price || 0), locale)}</span>
              {property.contractId && (
                <span className="rounded-full border border-[var(--nc-glass-border)] px-2 py-1 text-[10px] text-[var(--nc-text-secondary)]">
                  {labels.contractLinked}
                </span>
              )}
              {hasCompletedHandover && (
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-700 dark:text-emerald-300">
                  {labels.handoverRegistered}
                </span>
              )}
            </div>
          </div>

          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-[var(--nc-surface-solid)] flex items-center justify-center border border-[var(--nc-border)]">
            {property.media?.[0] ? (
              <img src={property.media[0]} alt={propertyTitle} className="h-full w-full object-cover" />
            ) : (
              <Home size={24} className="text-[var(--nc-text-dim)]" aria-label={labels.noPhoto} />
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {normalizeStatus(property.status) === 'available' && (
          <button
            onClick={() => {
              if (!hasPermission('BOOK_UNIT')) {
                toast.error(labels.noBookPermission);
                return;
              }
              setBookingOfferPrice(property.price || 0);
              setActiveModal('book_unit');
            }}
            className="nc-btn-primary min-h-[40px] rounded-xl px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
          >
            {labels.createBooking}
          </button>
        )}
        {normalizeStatus(property.status) === 'sold' && !hasCompletedHandover && (
          <button
            onClick={() => {
              if (!hasPermission('START_HANDOVER')) {
                toast.error(labels.noHandoverPermission);
                return;
              }
              setActiveModal('handover_assistant');
            }}
            className="nc-btn-primary min-h-[40px] rounded-xl px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
          >
            {labels.startHandover}
          </button>
        )}
        {normalizeStatus(property.status) === 'sold' && hasCompletedHandover && (
          <button onClick={showFinancialSummary} className="min-h-[40px] rounded-xl px-5 py-2 text-sm font-semibold bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] text-[var(--nc-text-primary)] hover:border-[var(--nc-accent-border)]">
            {labels.showRevenueSummary}
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--nc-glass-border)]">
        {[
          { key: 'events', label: labels.tabs.events, icon: Activity },
          { key: 'pricing', label: labels.tabs.pricing, icon: DollarSign },
          { key: 'accounting', label: labels.tabs.accounting, icon: FileText },
          { key: 'docs', label: labels.tabs.docs, icon: FileCheck },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex min-h-[44px] items-center gap-1.5 rounded-t-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === tab.key
                ? 'border-b-2 border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-accent-text)]'
                : 'text-[var(--nc-text-secondary)] hover:bg-[var(--nc-surface-solid)] hover:text-[var(--nc-text-primary)]'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 shadow-sm">
        {activeTab === 'events' && (
          <div className="space-y-3">
            <h4 className="mb-3 text-sm font-bold text-[var(--nc-text-primary)]">{labels.eventsTitle}</h4>
            {(property.events || []).length === 0 ? (
              <div className={compactEmptyClass}>{labels.noEvents}</div>
            ) : (
              <div className="space-y-2">
                {[...(property.events || [])].reverse().map((evt: any) => (
                  <div key={evt.id || `${evt.at}-${evt.type}`} className="flex gap-3 rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--nc-accent-soft)]">
                      <Clock size={14} className="text-[var(--nc-accent-text)]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-bold text-[var(--nc-text-primary)]">
                          {safeLongText(evt.type, locale, labels.eventFallback)}
                        </span>
                        <span className="text-[10px] text-[var(--nc-text-secondary)]">{formatDateValue(evt.at, locale)}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--nc-text-secondary)]">
                        {safeLongText(evt.note, locale, labels.eventNoteFallback)}
                      </p>
                      {evt.media && evt.media.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {evt.media.map((m: string, i: number) => (
                            <img key={i} src={m} alt="" className="h-8 w-12 rounded object-cover" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-4">
            <h4 className="mb-3 text-sm font-bold text-[var(--nc-text-primary)]">{labels.pricingTitle}</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className={labelClass}>{labels.basePrice}</label>
                <input type="number" value={simulatedPrice} onChange={(e) => setSimulatedPrice(Number(e.target.value))} className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>{labels.discountPercent}</label>
                <input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} className={inputClass} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handlePriceCalculation} className={primaryButtonClass}>
                {labels.calculatePrice}
              </button>
            </div>
            {priceSimResult && (
              <div className="rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-3 text-xs leading-relaxed text-[var(--nc-text-secondary)]">
                {priceSimResult}
              </div>
            )}
          </div>
        )}

        {activeTab === 'accounting' && (
          <div className="space-y-4">
            <h4 className="mb-3 text-sm font-bold text-[var(--nc-text-primary)]">{labels.accountingTitle}</h4>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-3">
                <p className="text-[10px] text-[var(--nc-text-secondary)]">{labels.grossValue}</p>
                <p className="mt-1 text-sm font-bold text-[var(--nc-text-primary)]">{formatMoney(Number(property.price || 0), locale)}</p>
              </div>
              <div className="rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-3">
                <p className="text-[10px] text-[var(--nc-text-secondary)]">{labels.collected}</p>
                <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {formatMoney(normalizeStatus(property.status) === 'sold' ? Number(property.price || 0) : 0, locale)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-3">
                <p className="text-[10px] text-[var(--nc-text-secondary)]">{labels.remaining}</p>
                <p className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-300">
                  {formatMoney(normalizeStatus(property.status) === 'sold' ? 0 : Number(property.price || 0), locale)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-3">
                <p className="text-[10px] text-[var(--nc-text-secondary)]">{labels.taxAndCommission}</p>
                <p className="mt-1 text-sm font-bold text-rose-700 dark:text-rose-300">
                  {formatMoney(Math.round(Number(property.price || 0) * 0.08), locale)}
                </p>
              </div>
            </div>
            <button onClick={showFinancialSummary} className={secondaryButtonClass}>
              {labels.showRevenueDetails}
            </button>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-3">
            <h4 className="mb-3 text-sm font-bold text-[var(--nc-text-primary)]">{labels.docsTitle}</h4>
            {(property.docs || []).length === 0 ? (
              <div className={compactEmptyClass}>{labels.noDocs}</div>
            ) : (
              <div className="space-y-2">
                {(property.docs || []).map((doc: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-2.5">
                    <FileText size={14} className="text-[var(--nc-accent-text)]" />
                    <span className="text-xs text-[var(--nc-text-primary)]">
                      {safeDisplayText(doc, locale, locale === 'ar' ? `مستند ${formatNumber(i + 1, locale)}` : `Document ${formatNumber(i + 1, locale)}`)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {property.media && property.media.length > 0 && (
              <>
                <h5 className="mb-2 mt-4 text-xs font-bold text-[var(--nc-text-primary)]">{labels.images}</h5>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {property.media.map((m: string, i: number) => (
                    <img key={i} src={m} alt="" className="h-24 w-full rounded-xl border border-[var(--nc-glass-border)] object-cover" />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {activeModal === 'book_unit' && property && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <form onSubmit={handleCreateBooking} className={`${modalClass} ${isArabic ? 'text-right' : 'text-left'}`} dir={isArabic ? 'rtl' : 'ltr'}>
            <h3 className="flex items-center gap-2 border-b border-[var(--nc-glass-border)] pb-2 text-base font-extrabold text-[var(--nc-text-primary)]">
              <FileCheck size={18} />
              {labels.bookTitle}
            </h3>

            <div className="space-y-1">
              <label className={labelClass}>{labels.selectedUnit}</label>
              <p className="font-bold text-[var(--nc-text-primary)]">
                {propertyTitle} ({propertyProject})
              </p>
            </div>

            <div className="space-y-1">
              <label className={labelClass}>{labels.buyerName}</label>
              <input
                type="text"
                required
                value={bookingLeadId}
                onChange={(e) => setBookingLeadId(e.target.value)}
                placeholder={labels.buyerPlaceholder}
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>{labels.contractValue}</label>
              <input type="number" required value={bookingOfferPrice} onChange={(e) => setBookingOfferPrice(Number(e.target.value))} className={inputClass} />
            </div>

            <div className="space-y-1">
              <DateField value={bookingDate} onChange={(val) => setBookingDate(val)} label={labels.bookingDate} />
            </div>

            <div className="space-y-1">
              <DateField value={bookingBirthDate} onChange={(val) => setBookingBirthDate(val)} label={labels.birthDate} />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className={`${primaryButtonClass} flex-1`}>
                {labels.confirmContract}
              </button>
              <button type="button" onClick={() => setActiveModal(null)} className={`${secondaryButtonClass} flex-1`}>
                {labels.cancel}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeModal === 'handover_assistant' && property && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <form onSubmit={handleCompleteHandover} className={`${modalClass} ${isArabic ? 'text-right' : 'text-left'}`} dir={isArabic ? 'rtl' : 'ltr'}>
            <h3 className="flex items-center gap-2 border-b border-[var(--nc-glass-border)] pb-2 text-base font-extrabold text-[var(--nc-text-primary)]">
              <Key size={18} />
              {labels.handoverTitle}
            </h3>

            <p className="font-medium text-[var(--nc-text-secondary)]">
              {labels.handoverDescription}
            </p>

            <div className="space-y-1">
              <DateField value={handoverDate} onChange={(val) => setHandoverDate(val)} label={labels.handoverDate} />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>{labels.checklist}</label>
              <textarea rows={3} required value={handoverChecklist} onChange={(e) => setHandoverChecklist(e.target.value)} className={`${inputClass} font-sans`} />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>{labels.handoverPhoto}</label>
              <input type="text" required value={handoverPhoto} onChange={(e) => setHandoverPhoto(e.target.value)} className={inputClass} />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className={`${accentButtonClass} flex-1`}>
                {labels.registerHandover}
              </button>
              <button type="button" onClick={() => setActiveModal(null)} className={`${secondaryButtonClass} flex-1`}>
                {labels.cancel}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
