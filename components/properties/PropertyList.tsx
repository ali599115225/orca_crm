'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import { toast } from '@/app/context/ToastContext';
import { getPropertiesAction, createUnitActionDirect } from '@/app/actions/properties';
import { getDetailedProjectsAction } from '@/app/actions/projects';
import { displayEntity, displayEnum, displayGeo } from '@/lib/display';
import type { DisplayLocale } from '@/lib/display';

interface PropertyUnit {
  id: number | string;
  sku: string;
  type: string;
  project: string;
  projectId?: string;
  area: string;
  price: number;
  priceStr: string;
  status: string;
  desc: string;
  media: string[];
  docs: string[];
  events: any[];
  handovers: any[];
  contractId?: string;
  financialSettlementId?: string;
  priceScenarioDraft?: any;
}

interface PropertyListProps {
  onSelectProperty: (id: string) => void;
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
const secondaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] text-[var(--nc-text-primary)] text-xs font-bold transition-all hover:border-[var(--nc-accent-border)] disabled:cursor-not-allowed disabled:opacity-60';
const inputClass =
  'w-full rounded-xl bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] px-3 py-2.5 text-[var(--nc-text-primary)] text-xs outline-none transition-colors placeholder:text-[var(--nc-text-dim)] focus:border-[var(--nc-accent-border)]';
const labelClass = 'block text-xs font-medium text-[var(--nc-text-secondary)]';
const modalClass =
  'relative w-full max-w-md rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface)] p-6 text-xs shadow-2xl space-y-4';

const PROPERTY_TYPE_OPTIONS = [
  { value: 'شقة سكنية', key: 'apartment' },
  { value: 'دوبلكس', key: 'duplex' },
  { value: 'فيلا مستقلة', key: 'villa' },
  { value: 'فيلا علوية', key: 'upper_villa' },
  { value: 'مكتب تجاري', key: 'office' },
];

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
  if (key === 'available') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
  if (key === 'hold') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
  if (key === 'sold') return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
  return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
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

function localizedLabels(isArabic: boolean) {
  return {
    title: isArabic ? 'سجل العقارات والوحدات' : 'Properties & Units Registry',
    subtitle: isArabic
      ? 'إدارة الوحدات السكنية والتجارية ومتابعة الحالات.'
      : 'Manage residential and commercial units and track their status.',
    addUnit: isArabic ? 'إضافة وحدة' : 'Add unit',
    totalUnits: isArabic ? 'إجمالي الوحدات' : 'Total units',
    available: isArabic ? 'المتاحة' : 'Available',
    hold: isArabic ? 'محجوزة مؤقتاً' : 'On hold',
    sold: isArabic ? 'مباعة' : 'Sold',
    searchPlaceholder: isArabic ? 'ابحث برقم الوحدة أو المشروع...' : 'Search by unit number or project...',
    allStatuses: isArabic ? 'كل الحالات' : 'All statuses',
    allProjects: isArabic ? 'كل المشاريع' : 'All projects',
    loading: isArabic ? 'جاري تحميل العقارات...' : 'Loading properties...',
    empty: isArabic ? 'لا توجد وحدات عقارية مطابقة للبحث.' : 'No matching property units found.',
    unitNo: isArabic ? 'رقم الوحدة' : 'Unit No.',
    project: isArabic ? 'المشروع' : 'Project',
    area: isArabic ? 'المساحة' : 'Area',
    price: isArabic ? 'السعر' : 'Price',
    status: isArabic ? 'الحالة' : 'Status',
    actions: isArabic ? 'إجراءات' : 'Actions',
    open: isArabic ? 'فتح' : 'Open',
    showing: isArabic ? 'عرض' : 'Showing',
    of: isArabic ? 'من' : 'of',
    previous: isArabic ? 'السابق' : 'Previous',
    next: isArabic ? 'التالي' : 'Next',
    page: isArabic ? 'رقم الصفحة' : 'Page',
    addTitle: isArabic ? 'إضافة وحدة عقارية جديدة' : 'Add New Property Unit',
    unitNumber: isArabic ? 'رقم الوحدة:' : 'Unit number:',
    unitNumberPlaceholder: isArabic ? 'مثال: A-103' : 'Example: A-103',
    propertyType: isArabic ? 'نوع العقار:' : 'Property type:',
    residentialProject: isArabic ? 'المشروع السكني:' : 'Residential project:',
    totalArea: isArabic ? 'المساحة الإجمالية:' : 'Total area:',
    areaPlaceholder: isArabic ? 'مثال: 120 م²' : 'Example: 120 sqm',
    askingPrice: isArabic ? 'السعر المطلوب (ر.س):' : 'Asking price (SAR):',
    saveUnit: isArabic ? 'حفظ الوحدة' : 'Save unit',
    cancel: isArabic ? 'إلغاء' : 'Cancel',
    noCreatePermission: isArabic
      ? 'عذراً! دورك الحالي لا يمتلك الصلاحية لإنشاء وحدة.'
      : 'Your current role does not have permission to create a unit.',
    createProjectFirst: isArabic
      ? 'الرجاء إنشاء مشروع عقاري أولاً قبل إضافة وحدات.'
      : 'Please create a real estate project before adding units.',
    createSuccess: isArabic ? 'تمت إضافة الوحدة بنجاح.' : 'Unit added successfully.',
    createFailed: isArabic ? 'خطأ في إنشاء الوحدة: ' : 'Unit creation failed: ',
    fetchFailed: isArabic ? 'تعذر تحميل الوحدات العقارية.' : 'Unable to load property units.',
    dbError: isArabic ? 'حدث خطأ في قاعدة البيانات' : 'A database error occurred',
    newUnitDescription: isArabic
      ? 'وحدة سكنية مضافة حديثاً إلى مستودع العقارات.'
      : 'New residential unit added to the property inventory.',
    fallbackProjectA: isArabic ? 'مشروع النخيل السكني' : 'Palm Residential Project',
    fallbackProjectB: isArabic ? 'واحة الخليج' : 'Gulf Oasis',
  };
}

export default function PropertyList({
  onSelectProperty,
  hasPermission,
  addTelemetryEvent,
  lang,
  isArabic,
}: PropertyListProps) {
  const locale: DisplayLocale = isArabic ? 'ar' : 'en';
  const labels = localizedLabels(isArabic);
  const [properties, setProperties] = useState<PropertyUnit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [newSku, setNewSku] = useState('');
  const [newType, setNewType] = useState('شقة سكنية');
  const [newProject, setNewProject] = useState('مشروع النخيل السكني');
  const [newPrice, setNewPrice] = useState(1000000);
  const [newArea, setNewArea] = useState(isArabic ? '120 م²' : '120 sqm');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function loadProperties() {
      try {
        setIsLoading(true);
        setFetchError(null);
        const result = await getPropertiesAction();
        const data = result && 'data' in result ? result.data : Array.isArray(result) ? result : [];
        setProperties(Array.isArray(data) ? data : []);
        addTelemetryEvent('api.properties_loaded', { count: Array.isArray(data) ? data.length : 0 });
      } catch (err: any) {
        setFetchError(err.message || labels.fetchFailed);
        addTelemetryEvent('api.error', { error: err.message });
        setProperties([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadProperties();
  }, []);

  const logTelemetry = (_type: string, _payload?: any) => {
    // Telemetry removed — production cleanup
  };

  const projectOptions = useMemo(() => Array.from(new Set(properties.map((u) => u.project).filter(Boolean))), [properties]);

  const filteredProperties = properties.filter((u) => {
    const searchable = `${u.sku || ''} ${u.type || ''} ${displayTypeLabel(u.type, locale)} ${u.project || ''} ${displayProjectName(u.project, locale)}`.toLowerCase();
    const matchSearch = !searchTerm || searchable.includes(searchTerm.toLowerCase());
    const matchStatus = !statusFilter || normalizeStatus(u.status) === statusFilter;
    const matchProject = !projectFilter || u.project === projectFilter;
    return matchSearch && matchStatus && matchProject;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, projectFilter]);

  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProperties = filteredProperties.slice(startIndex, startIndex + itemsPerPage);

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('CREATE_UNIT')) {
      toast.error(labels.noCreatePermission);
      return;
    }

    try {
      const projectsResult = await getDetailedProjectsAction();
      const projectsList = projectsResult && 'data' in projectsResult ? projectsResult.data : Array.isArray(projectsResult) ? projectsResult : [];
      const firstProject = projectsList?.[0];
      if (!firstProject) {
        toast.error(labels.createProjectFirst);
        return;
      }

      const res = await createUnitActionDirect({
        projectId: String(firstProject.id),
        unitNumber: newSku,
        priceSar: newPrice,
        type: newType,
        area: newArea,
        description: labels.newUnitDescription,
      });

      if (!res.success || !res.data) throw new Error(res.error || labels.dbError);

      setProperties((prev) => [...prev, res.data]);
      logTelemetry('unit.created', { unitId: res.data.id, sku: newSku, price: newPrice });
      toast.success(labels.createSuccess);
    } catch (err: any) {
      toast.error(labels.createFailed + err.message);
    }

    setNewSku('');
    setNewPrice(1000000);
    setActiveModal(null);
  };

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-5 px-4 pb-8 pt-4 lg:px-6 text-[var(--nc-text-primary)]">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nc-text-primary)]">{labels.title}</h1>
          <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">{labels.subtitle}</p>
        </div>

        <button
          onClick={() => {
            if (!hasPermission('CREATE_UNIT')) {
              toast.error(labels.noCreatePermission);
              return;
            }
            setActiveModal('new_unit');
          }}
          className="nc-btn-primary min-h-[40px] rounded-xl px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
        >
          {labels.addUnit}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5">
          <p className="text-sm text-[var(--nc-text-secondary)]">{labels.totalUnits}</p>
          <p className="mt-3 text-2xl font-bold text-[var(--nc-text-primary)]">
            {formatNumber(properties.length, locale)}
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5">
          <p className="text-sm text-[var(--nc-text-secondary)]">{labels.available}</p>
          <p className="mt-3 text-2xl font-bold text-[var(--nc-text-primary)]">
            {formatNumber(properties.filter((p) => normalizeStatus(p.status) === 'available').length, locale)}
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5">
          <p className="text-sm text-[var(--nc-text-secondary)]">{labels.hold}</p>
          <p className="mt-3 text-2xl font-bold text-[var(--nc-text-primary)]">
            {formatNumber(properties.filter((p) => normalizeStatus(p.status) === 'hold').length, locale)}
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5">
          <p className="text-sm text-[var(--nc-text-secondary)]">{labels.sold}</p>
          <p className="mt-3 text-2xl font-bold text-[var(--nc-text-primary)]">
            {formatNumber(properties.filter((p) => normalizeStatus(p.status) === 'sold').length, locale)}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm flex flex-col">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            placeholder={labels.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-4 text-sm text-[var(--nc-text-primary)] outline-none lg:max-w-md"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-h-[44px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-4 text-sm outline-none w-full lg:w-48">
            <option value="">{labels.allStatuses}</option>
            <option value="available">{labels.available}</option>
            <option value="hold">{labels.hold}</option>
            <option value="sold">{labels.sold}</option>
          </select>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="min-h-[44px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-4 text-sm outline-none w-full lg:w-48">
            <option value="">{labels.allProjects}</option>
            {projectOptions.map((project) => (
              <option key={project} value={project}>
                {displayProjectName(project, locale)}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent" />
            <span className="text-xs font-medium text-[var(--nc-text-secondary)]">{labels.loading}</span>
          </div>
        ) : fetchError ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center">
            <p className="inline-block rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-300">{fetchError}</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center px-4 text-center text-sm font-medium text-[var(--nc-text-secondary)]">
            {labels.empty}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="overflow-x-auto min-h-[500px]">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--nc-border)] text-[var(--nc-text-secondary)]">
                    <th className="px-3 py-3 text-start font-semibold">{labels.unitNo}</th>
                    <th className="px-3 py-3 text-start font-semibold">{labels.project}</th>
                    <th className="px-3 py-3 text-start font-semibold">{labels.area}</th>
                    <th className="px-3 py-3 text-start font-semibold">{labels.price}</th>
                    <th className="px-3 py-3 text-start font-semibold">{labels.status}</th>
                    <th className="px-3 py-3 text-center font-semibold">{labels.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProperties.map((u) => (
                    <tr key={u.id} className="border-b border-[var(--nc-border)] hover:bg-[var(--nc-surface-solid)] transition-colors cursor-pointer" onClick={() => {
                      onSelectProperty(String(u.id));
                      logTelemetry('unit.opened', { unitId: u.id, sku: u.sku });
                    }}>
                      <td className="px-3 py-4 text-sm font-bold text-[var(--nc-text-primary)]">
                        {displayUnitNumber(u.sku, locale)} — {displayTypeLabel(u.type, locale)}
                      </td>
                      <td className="px-3 py-4 text-sm text-[var(--nc-text-secondary)]">{displayProjectName(u.project, locale)}</td>
                      <td className="px-3 py-4 text-sm text-[var(--nc-text-secondary)]">{displayArea(u.area, locale)}</td>
                      <td className="px-3 py-4 text-sm font-bold text-[var(--nc-text-primary)]">{formatMoney(u.price, locale)}</td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(u.status)}`}>
                          {displayStatusLabel(u.status, locale)}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button type="button" className="nc-btn-primary min-h-[32px] rounded-lg px-3 py-1 text-xs font-semibold">{labels.open}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col md:flex-row items-center justify-between border-t border-[var(--nc-border)] pt-4 text-sm text-[var(--nc-text-secondary)]">
              <span>{labels.showing} {formatNumber(Math.min(startIndex + 1, filteredProperties.length), locale)}-{formatNumber(Math.min(startIndex + itemsPerPage, filteredProperties.length), locale)} {labels.of} {formatNumber(filteredProperties.length, locale)}</span>
              <div className="flex items-center gap-2 mt-3 md:mt-0">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1} 
                  className="px-3 py-1.5 rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] disabled:opacity-50 hover:bg-[var(--nc-surface)] transition-colors"
                >
                  {labels.previous}
                </button>
                <span className="px-2">{labels.page} {formatNumber(currentPage, locale)} {labels.of} {formatNumber(totalPages, locale)}</span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0} 
                  className="px-3 py-1.5 rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] disabled:opacity-50 hover:bg-[var(--nc-surface)] transition-colors"
                >
                  {labels.next}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeModal === 'new_unit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <form onSubmit={handleCreateUnit} className={`${modalClass} ${isArabic ? 'text-right' : 'text-left'}`} dir={isArabic ? 'rtl' : 'ltr'}>
            <h3 className="flex items-center gap-2 border-b border-[var(--nc-glass-border)] pb-2 text-base font-extrabold text-[var(--nc-text-primary)]">
              <Plus size={18} />
              {labels.addTitle}
            </h3>

            <div className="space-y-1">
              <label className={labelClass}>{labels.unitNumber}</label>
              <input type="text" required value={newSku} onChange={(e) => setNewSku(e.target.value)} placeholder={labels.unitNumberPlaceholder} className={inputClass} />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>{labels.propertyType}</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value)} className={inputClass}>
                {PROPERTY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {displayTypeLabel(option.value, locale)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className={labelClass}>{labels.residentialProject}</label>
              <select value={newProject} onChange={(e) => setNewProject(e.target.value)} className={inputClass}>
                {projectOptions.length > 0 ? (
                  projectOptions.map((project) => (
                    <option key={project} value={project}>
                      {displayProjectName(project, locale)}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="مشروع النخيل السكني">{labels.fallbackProjectA}</option>
                    <option value="واحة الخليج">{labels.fallbackProjectB}</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className={labelClass}>{labels.totalArea}</label>
              <input type="text" required value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder={labels.areaPlaceholder} className={inputClass} />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>{labels.askingPrice}</label>
              <input type="number" required value={newPrice} onChange={(e) => setNewPrice(Number(e.target.value))} className={inputClass} />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className={`${primaryButtonClass} flex-1`}>
                {labels.saveUnit}
              </button>
              <button type="button" onClick={() => setActiveModal(null)} className={`${secondaryButtonClass} flex-1`}>
                {labels.cancel}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
