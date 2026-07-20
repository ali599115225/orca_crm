'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  FolderKanban,
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useApp } from '@/app/context/AppContext';
import { getDetailedProjectsAction, getProjectUnitsAction } from '@/app/actions/projects';
import { displayGeo, displayEntity, displayEnum } from '@/lib/display';
import type { DisplayLocale } from '@/lib/display';

type ProjectItem = {
  id: string | number;
  name: string;
  city?: string;
  location?: string;
  status?: string;
  unitsTotal?: number;
  unitsSold?: number;
  progressPercent?: number;
  description?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type UnitItem = {
  id?: string | number;
  number?: string;
  unitNumber?: string;
  code?: string;
  name?: string;
  type?: string;
  propertyType?: string;
  area?: number | string;
  builtArea?: number | string;
  price?: number | string;
  askingPrice?: number | string;
  listPrice?: number | string;
  status?: string;
  displayNumber?: string;
};

type TabKey = 'overview' | 'phases' | 'units' | 'bookings' | 'documents' | 'reports';

const PAGE_SIZE = 10;

const copy = {
  ar: {
    breadcrumb: 'العمليات / المشاريع العقارية',
    pageTitle: 'المشاريع العقارية',
    pageSubtitle: 'إدارة مشاريع التطوير العقاري ومتابعة الوحدات والإنجاز.',
    createProject: 'إنشاء مشروع',
    refresh: 'تحديث',
    totalProjects: 'إجمالي المشاريع',
    activeProjects: 'المشاريع النشطة',
    totalUnits: 'إجمالي الوحدات',
    completedProjects: 'المشاريع المكتملة',
    soldUnits: 'المباعة',
    kpiRegistryNote: 'سجل المشاريع الحالي',
    kpiActiveNote: 'غير مكتملة ضمن السجل',
    kpiUnitsNote: 'إجمالي الوحدات المرتبطة',
    kpiCompletedNote: 'مشاريع بحالة مكتمل',
    searchPlaceholder: 'ابحث باسم المشروع أو الموقع أو الحالة',
    loadingProjects: 'جاري تحميل المشاريع العقارية...',
    noProjects: 'لا توجد مشاريع عقارية مطابقة للبحث الحالي.',
    noProjectsYet: 'لا توجد مشاريع عقارية حتى الآن.',
    projectName: 'اسم المشروع',
    location: 'الموقع',
    status: 'الحالة',
    units: 'الوحدات',
    progress: 'نسبة الإنجاز',
    action: 'الإجراء',
    open: 'فتح',
    page: 'صفحة',
    of: 'من',
    previous: 'السابق',
    next: 'التالي',
    backToProjects: 'العودة لقائمة المشاريع',
    locationNotSet: 'الموقع غير محدد',
    overview: 'نظرة عامة',
    phases: 'المراحل',
    unitsTab: 'الوحدات',
    bookings: 'الحجوزات',
    documents: 'المستندات',
    reports: 'التقارير',
    projectSummary: 'ملخص المشروع',
    noProjectDescription: 'لا يوجد وصف تفصيلي لهذا المشروع حاليًا.',
    expectedUnits: 'الوحدات المتوقعة',
    noPhases: 'لم يتم ربط مراحل تنفيذية بهذا المشروع حتى الآن.',
    loadingUnits: 'جاري تحميل وحدات المشروع...',
    unitNumber: 'رقم الوحدة',
    type: 'النوع',
    area: 'المساحة',
    price: 'السعر',
    bookUnit: 'حجز وحدة',
    notBookable: 'غير متاحة',
    unitFallback: 'وحدة',
    notSpecified: 'غير محدد',
    noUnitsLoaded: 'بيانات الوحدات لم تُحمّل بعد من قاعدة البيانات. إجمالي الوحدات المتوقع:',
    noUnits: 'لا توجد وحدات مرتبطة بهذا المشروع حاليًا.',
    noBookings: 'لا توجد حجوزات مرتبطة بهذا المشروع حاليًا.',
    uploadDocument: 'رفع مخطط أو مستند',
    noDocuments: 'لا توجد مستندات مرفوعة لهذا المشروع حاليًا.',
    noReports: 'لا توجد تقارير تقدم مرتبطة بهذا المشروع حاليًا.',
    bookingTitle: 'حجز وحدة',
    close: 'إغلاق',
    cancel: 'إلغاء',
    confirmSelection: 'تأكيد اختيار الوحدة',
    selectedUnit: 'الوحدة',
    unitStatus: 'الحالة',
    unitPrice: 'السعر',
    squareMeter: 'م²',
    sar: 'ر.س',
    completed: 'مكتمل',
    planned: 'مخطط له',
    active: 'نشط',
    underConstruction: 'قيد الإنشاء',
    available: 'متاحة',
    hold: 'محجوزة مؤقتًا',
    sold: 'مباعة',
    reserved: 'محجوزة',
    blocked: 'متوقفة',
  },
  en: {
    breadcrumb: 'Operations / Real Estate Projects',
    pageTitle: 'Real Estate Projects',
    pageSubtitle: 'Manage development projects, units, and execution progress.',
    createProject: 'Create Project',
    refresh: 'Refresh',
    totalProjects: 'Total Projects',
    activeProjects: 'Active Projects',
    totalUnits: 'Total Units',
    completedProjects: 'Completed Projects',
    soldUnits: 'Sold',
    kpiRegistryNote: 'Current project registry',
    kpiActiveNote: 'Not completed in registry',
    kpiUnitsNote: 'Linked units total',
    kpiCompletedNote: 'Projects marked completed',
    searchPlaceholder: 'Search by project name, location, or status',
    loadingProjects: 'Loading real estate projects...',
    noProjects: 'No projects match the current search.',
    noProjectsYet: 'No real estate projects yet.',
    projectName: 'Project Name',
    location: 'Location',
    status: 'Status',
    units: 'Units',
    progress: 'Progress',
    action: 'Action',
    open: 'Open',
    page: 'Page',
    of: 'of',
    previous: 'Previous',
    next: 'Next',
    backToProjects: 'Back to Projects List',
    locationNotSet: 'Location not set',
    overview: 'Overview',
    phases: 'Phases',
    unitsTab: 'Units',
    bookings: 'Bookings',
    documents: 'Documents',
    reports: 'Reports',
    projectSummary: 'Project Summary',
    noProjectDescription: 'No detailed description is available for this project yet.',
    expectedUnits: 'Expected Units',
    noPhases: 'No execution phases are linked to this project yet.',
    loadingUnits: 'Loading project units...',
    unitNumber: 'Unit No.',
    type: 'Type',
    area: 'Area',
    price: 'Price',
    bookUnit: 'Book Unit',
    notBookable: 'Unavailable',
    unitFallback: 'Unit',
    notSpecified: 'Not specified',
    noUnitsLoaded: 'Unit data has not been loaded from the database yet. Expected total units:',
    noUnits: 'No units are currently linked to this project.',
    noBookings: 'No bookings are currently linked to this project.',
    uploadDocument: 'Upload Plan or Document',
    noDocuments: 'No documents have been uploaded for this project yet.',
    noReports: 'No progress reports are linked to this project yet.',
    bookingTitle: 'Book Unit',
    close: 'Close',
    cancel: 'Cancel',
    confirmSelection: 'Confirm Unit Selection',
    selectedUnit: 'Unit',
    unitStatus: 'Status',
    unitPrice: 'Price',
    squareMeter: 'sqm',
    sar: 'SAR',
    completed: 'Completed',
    planned: 'Planned',
    active: 'Active',
    underConstruction: 'Under Construction',
    available: 'Available',
    hold: 'Temporarily Reserved',
    sold: 'Sold',
    reserved: 'Reserved',
    blocked: 'Blocked',
  },
};

const tabs: Array<{ key: TabKey; labelKey: keyof typeof copy.ar }> = [
  { key: 'overview', labelKey: 'overview' },
  { key: 'phases', labelKey: 'phases' },
  { key: 'units', labelKey: 'unitsTab' },
  { key: 'bookings', labelKey: 'bookings' },
  { key: 'documents', labelKey: 'documents' },
  { key: 'reports', labelKey: 'reports' },
];

function extractArray(result: unknown): any[] {
  if (Array.isArray(result)) return result;

  if (result && typeof result === 'object' && 'data' in result) {
    const data = (result as { data?: unknown }).data;
    return Array.isArray(data) ? data : [];
  }

  return [];
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatNumber(value: unknown, isArabic: boolean): string {
  return toNumber(value).toLocaleString(isArabic ? 'ar-SA' : 'en-US');
}

function formatCurrency(value: unknown, isArabic: boolean, notSpecified: string, sar: string): string {
  const numberValue = toNumber(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return notSpecified;
  }

  return `${formatNumber(numberValue, isArabic)} ${sar}`;
}

function isTechnicalId(value: unknown): boolean {
  if (typeof value !== 'string') return false;

  const text = value.trim();

  if (!text) return false;

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidPattern.test(text)) return true;
  if (/^[0-9a-f]{8,24}$/i.test(text)) return true;

  return text.length > 22 && /[0-9a-f]/i.test(text) && /[-_]/.test(text);
}

type CopyLabels = typeof copy.ar;

function isDemoLeak(value: unknown): boolean {
  const text = String(value || '').trim();
  return /\b(demo|stress|mock|trial)\b/i.test(text) || /تجريبي|تجريبية/.test(text);
}

function safeDisplay(value: unknown, fallback: string): string {
  const text = String(value || '').trim();
  if (!text || isTechnicalId(text) || isDemoLeak(text)) return fallback;
  return text;
}

function displayProjectName(project: ProjectItem, locale: DisplayLocale, labels: CopyLabels): string {
  return safeDisplay(
    displayEntity(project.name, 'project' as any, locale, { route: '/operations/projects' }),
    labels.notSpecified,
  );
}

function displayProjectLocation(project: ProjectItem, locale: DisplayLocale, labels: CopyLabels): string {
  const location = project.location || project.city;
  return safeDisplay(
    displayGeo(location, 'city' as any, locale, { route: '/operations/projects' }),
    labels.locationNotSet,
  );
}

function displayProjectStatus(status: string | undefined, locale: DisplayLocale, labels: CopyLabels): string {
  return safeDisplay(
    displayEnum(status || 'UNSPECIFIED', 'projectStatus' as any, locale),
    labels.notSpecified,
  );
}

function displayUnitStatus(status: string | undefined, locale: DisplayLocale, labels: CopyLabels): string {
  return safeDisplay(
    displayEnum(status || 'UNSPECIFIED', 'unitStatus' as any, locale),
    labels.notSpecified,
  );
}

function displayUnitType(unit: UnitItem, locale: DisplayLocale, labels: CopyLabels): string {
  const value = unit.type || unit.propertyType;
  return safeDisplay(
    displayEnum(value || 'UNSPECIFIED', 'unitType' as any, locale),
    labels.notSpecified,
  );
}

function projectStatusKey(status?: string): 'completed' | 'planned' | 'active' | 'underConstruction' {
  const value = String(status || '').trim().toUpperCase();

  if (value === 'COMPLETED' || value === 'مكتمل') return 'completed';
  if (value === 'PLANNING' || value === 'PLANNED' || value === 'مخطط له') return 'planned';
  if (value === 'ACTIVE' || value === 'نشط') return 'active';

  return 'underConstruction';
}

function normalizeProjectStatus(status: string | undefined, labels: typeof copy.ar, locale: DisplayLocale): string {
  return displayProjectStatus(status, locale, labels);
}

function isCompletedProject(status?: string): boolean {
  return projectStatusKey(status) === 'completed';
}

function unitStatusKey(
  status?: string,
): 'available' | 'hold' | 'sold' | 'reserved' | 'blocked' {
  const value = String(status || 'AVAILABLE').trim().toUpperCase();

  if (value === 'AVAILABLE' || value === 'متاحة') return 'available';
  if (value === 'HOLD' || value === 'محجوزة مؤقتًا') return 'hold';
  if (value === 'SOLD' || value === 'مباعة') return 'sold';
  if (value === 'RESERVED' || value === 'محجوزة') return 'reserved';
  if (value === 'BLOCKED' || value === 'متوقفة') return 'blocked';

  return 'available';
}

function normalizeUnitStatus(status: string | undefined, labels: typeof copy.ar, locale: DisplayLocale): string {
  return displayUnitStatus(status, locale, labels);
}

function isUnitBookable(status?: string): boolean {
  return unitStatusKey(status) === 'available';
}

function normalizeProject(project: any): ProjectItem {
  return {
    id: project.id,
    name: project.name || '',
    city: project.city,
    location: project.location || project.city,
    status: project.status,
    unitsTotal: toNumber(project.unitsTotal || project.unitsCount || project._count?.units || 0),
    unitsSold: toNumber(project.unitsSold || project.soldUnits || 0),
    progressPercent: toNumber(project.progressPercent || project.progress || 0),
    description: project.description || '',
    createdAt: project.createdAt,
    updatedAt: project.updatedAt || project.createdAt,
  };
}

function getUnitDisplayNumber(
  unit: UnitItem,
  fallbackIndex: number,
  unitFallback: string,
): string {
  const candidates = [unit.displayNumber, unit.unitNumber, unit.number, unit.code, unit.name];

  for (const candidate of candidates) {
    if (candidate && !isTechnicalId(candidate) && !isDemoLeak(candidate)) {
      return String(candidate);
    }
  }

  return `${unitFallback} ${fallbackIndex}`;
}

function getUnitType(unit: UnitItem, labels: CopyLabels, locale: DisplayLocale): string {
  return displayUnitType(unit, locale, labels);
}

function getUnitArea(unit: UnitItem, labels: typeof copy.ar): string {
  const area = unit.area || unit.builtArea;
  const numberValue = toNumber(area);

  if (!numberValue) return labels.notSpecified;

  return `${formatNumber(numberValue, labels === copy.ar)} ${labels.squareMeter}`;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-4 py-6 text-center">
      <p className="text-sm font-medium text-[var(--nc-text-secondary)]">{message}</p>
    </div>
  );
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--nc-text-primary)]">
      {children}
    </span>
  );
}

function PaginationBar({
  page,
  totalPages,
  labels,
  isArabic,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  labels: typeof copy.ar;
  isArabic: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="orca-workspace-pagination flex items-center justify-between px-4 py-3 text-sm text-[var(--nc-text-secondary)]">
      <span>
        {labels.page} {formatNumber(page, isArabic)} {labels.of}{' '}
        {formatNumber(totalPages, isArabic)}
      </span>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={onPrevious}
          className="nc-btn-ghost min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.previous}
        </button>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={onNext}
          className="nc-btn-primary min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.next}
        </button>
      </div>
    </div>
  );
}

export default function ProjectsView() {
  const { hasPermission } = useAuth();
  const { lang } = useApp();
  const isArabic = lang === 'AR';
  const displayLocale: DisplayLocale = isArabic ? 'ar' : 'en';
  const labels = isArabic ? copy.ar : copy.en;
  const direction = isArabic ? 'rtl' : 'ltr';
  const textAlign = isArabic ? 'text-right' : 'text-left';

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | number | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [projectPage, setProjectPage] = useState(1);
  const [unitPage, setUnitPage] = useState(1);
  const [bookingUnit, setBookingUnit] = useState<UnitItem | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setIsLoadingProjects(true);

      const result = await getDetailedProjectsAction();
      const data = extractArray(result).map(normalizeProject);

      setProjects(data);
    } catch {
      setProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return projects;

    return projects.filter((project) => {
      return (
        displayProjectName(project, displayLocale, labels).toLowerCase().includes(term) ||
        displayProjectLocation(project, displayLocale, labels).toLowerCase().includes(term) ||
        normalizeProjectStatus(project.status, labels, displayLocale).toLowerCase().includes(term)
      );
    });
  }, [projects, searchTerm, labels, displayLocale]);

  const projectTotalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const pagedProjects = filteredProjects.slice(
    (projectPage - 1) * PAGE_SIZE,
    projectPage * PAGE_SIZE,
  );

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const unitTotalPages = Math.max(1, Math.ceil(units.length / PAGE_SIZE));
  const pagedUnits = units.slice((unitPage - 1) * PAGE_SIZE, unitPage * PAGE_SIZE);

  const totalUnits = projects.reduce((sum, project) => sum + toNumber(project.unitsTotal), 0);
  const soldUnits = projects.reduce((sum, project) => sum + toNumber(project.unitsSold), 0);
  const completedProjects = projects.filter((project) => isCompletedProject(project.status)).length;
  const activeProjects = projects.length - completedProjects;
  const hasActiveSearch = searchTerm.trim().length > 0;
  const searchIconSide = isArabic ? 'right-3' : 'left-3';
  const searchInputPad = isArabic ? 'pr-9 pl-3' : 'pl-9 pr-3';

  const listKpis = [
    {
      label: labels.totalProjects,
      value: formatNumber(projects.length, isArabic),
      note: labels.kpiRegistryNote,
      icon: FolderKanban,
    },
    {
      label: labels.activeProjects,
      value: formatNumber(activeProjects, isArabic),
      note: labels.kpiActiveNote,
      icon: Building2,
    },
    {
      label: labels.totalUnits,
      value: formatNumber(totalUnits, isArabic),
      note: `${labels.soldUnits}: ${formatNumber(soldUnits, isArabic)}`,
      icon: LayoutGrid,
    },
    {
      label: labels.completedProjects,
      value: formatNumber(completedProjects, isArabic),
      note: labels.kpiCompletedNote,
      icon: CheckCircle2,
    },
  ];

  async function handleSelectProject(projectId: string | number) {
    setSelectedProjectId(projectId);
    setActiveTab('overview');
    setUnits([]);
    setUnitPage(1);
    setBookingUnit(null);

    try {
      setIsLoadingUnits(true);
      const result = await getProjectUnitsAction(String(projectId));
      setUnits(extractArray(result));
    } catch {
      setUnits([]);
    } finally {
      setIsLoadingUnits(false);
    }
  }

  function handleBackToList() {
    setSelectedProjectId(null);
    setActiveTab('overview');
    setUnits([]);
    setUnitPage(1);
    setBookingUnit(null);
  }

  function openBookingModal(unit: UnitItem, index: number) {
    const absoluteIndex = (unitPage - 1) * PAGE_SIZE + index + 1;

    setBookingUnit({
      ...unit,
      displayNumber: getUnitDisplayNumber(unit, absoluteIndex, labels.unitFallback),
    });
  }

  if (selectedProject) {
    return (
      <section dir={direction} className="space-y-4 overflow-x-hidden px-4 pb-8 pt-4 lg:px-6">
        <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleBackToList}
                className="nc-btn-ghost inline-flex min-h-[36px] items-center rounded-xl px-3 py-1.5 text-xs font-semibold"
              >
                {labels.backToProjects}
              </button>

              <div>
                <h1 className="text-xl font-bold text-[var(--nc-text-primary)]">
                  {displayProjectName(selectedProject, displayLocale, labels)}
                </h1>
                <p className="mt-0.5 text-xs text-[var(--nc-text-secondary)]">
                  {displayProjectLocation(selectedProject, displayLocale, labels)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusBadge>{normalizeProjectStatus(selectedProject.status, labels, displayLocale)}</StatusBadge>
                <StatusBadge>
                  {labels.progress} {formatNumber(selectedProject.progressPercent, isArabic)}%
                </StatusBadge>
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-2 gap-2 lg:min-w-[300px]">
              <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-3 py-2.5">
                <p className="text-xs text-[var(--nc-text-secondary)]">{labels.totalUnits}</p>
                <p className="mt-1 text-lg font-bold text-[var(--nc-text-primary)]">
                  {formatNumber(selectedProject.unitsTotal, isArabic)}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-3 py-2.5">
                <p className="text-xs text-[var(--nc-text-secondary)]">{labels.soldUnits}</p>
                <p className="mt-1 text-lg font-bold text-[var(--nc-text-primary)]">
                  {formatNumber(selectedProject.unitsSold, isArabic)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={
                    isActive
                      ? 'nc-btn-primary min-h-[40px] rounded-xl px-4 py-2 text-sm font-semibold'
                      : 'nc-btn-ghost min-h-[40px] rounded-xl px-4 py-2 text-sm font-semibold'
                  }
                >
                  {labels[tab.labelKey]}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="grid min-w-0 gap-3 lg:grid-cols-4">
            <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 lg:col-span-2">
              <p className="text-xs font-semibold text-[var(--nc-text-secondary)]">
                {labels.projectSummary}
              </p>
              <p className="mt-2 min-h-[48px] text-sm leading-7 text-[var(--nc-text-primary)]">
                {safeDisplay(selectedProject.description, labels.noProjectDescription)}
              </p>
            </div>

            <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4">
              <p className="text-xs text-[var(--nc-text-secondary)]">{labels.expectedUnits}</p>
              <p className="mt-1.5 text-xl font-bold text-[var(--nc-text-primary)]">
                {formatNumber(selectedProject.unitsTotal, isArabic)}
              </p>
            </div>

            <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4">
              <p className="text-xs text-[var(--nc-text-secondary)]">{labels.progress}</p>
              <p className="mt-1.5 text-xl font-bold text-[var(--nc-text-primary)]">
                {formatNumber(selectedProject.progressPercent, isArabic)}%
              </p>
            </div>
          </div>
        )}

        {activeTab === 'phases' && <EmptyState message={labels.noPhases} />}

        {activeTab === 'units' && (
          <div className="min-w-0 overflow-hidden rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4">
            {isLoadingUnits ? (
              <EmptyState message={labels.loadingUnits} />
            ) : units.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--nc-border)] text-[var(--nc-text-secondary)]">
                        <th className={`px-3 py-3 ${textAlign} font-semibold`}>
                          {labels.unitNumber}
                        </th>
                        <th className={`px-3 py-3 ${textAlign} font-semibold`}>
                          {labels.type}
                        </th>
                        <th className={`px-3 py-3 ${textAlign} font-semibold`}>
                          {labels.area}
                        </th>
                        <th className={`px-3 py-3 ${textAlign} font-semibold`}>
                          {labels.price}
                        </th>
                        <th className={`px-3 py-3 ${textAlign} font-semibold`}>
                          {labels.status}
                        </th>
                        <th className={`px-3 py-3 ${textAlign} font-semibold`}>
                          {labels.action}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {pagedUnits.map((unit, index) => {
                        const absoluteIndex = (unitPage - 1) * PAGE_SIZE + index + 1;
                        const bookable = isUnitBookable(unit.status);

                        return (
                          <tr key={unit.id || absoluteIndex} className="border-b border-[var(--nc-border)]">
                            <td className="px-3 py-3 text-[var(--nc-text-primary)]">
                              {getUnitDisplayNumber(unit, absoluteIndex, labels.unitFallback)}
                            </td>

                            <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                              {getUnitType(unit, labels, displayLocale)}
                            </td>

                            <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                              {getUnitArea(unit, labels)}
                            </td>

                            <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                              {formatCurrency(
                                unit.price || unit.askingPrice || unit.listPrice,
                                isArabic,
                                labels.notSpecified,
                                labels.sar,
                              )}
                            </td>

                            <td className="px-3 py-3">
                              <StatusBadge>{normalizeUnitStatus(unit.status, labels, displayLocale)}</StatusBadge>
                            </td>

                            <td className="px-3 py-3">
                              <button
                                type="button"
                                disabled={!bookable}
                                onClick={() => openBookingModal(unit, index)}
                                className="nc-btn-primary min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {bookable ? labels.bookUnit : labels.notBookable}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <PaginationBar
                  page={unitPage}
                  totalPages={unitTotalPages}
                  labels={labels}
                  isArabic={isArabic}
                  onPrevious={() => setUnitPage((page) => Math.max(1, page - 1))}
                  onNext={() => setUnitPage((page) => Math.min(unitTotalPages, page + 1))}
                />
              </>
            ) : toNumber(selectedProject.unitsTotal) > 0 ? (
              <EmptyState
                message={`${labels.noUnitsLoaded} ${formatNumber(selectedProject.unitsTotal, isArabic)}`}
              />
            ) : (
              <EmptyState message={labels.noUnits} />
            )}
          </div>
        )}

        {activeTab === 'bookings' && <EmptyState message={labels.noBookings} />}

        {activeTab === 'documents' && (
          <div className="space-y-3">
            {hasPermission('UPLOAD_DOC') && (
              <button
                type="button"
                className="nc-btn-ghost min-h-[40px] rounded-xl px-4 py-2 text-sm font-semibold"
              >
                {labels.uploadDocument}
              </button>
            )}

            <EmptyState message={labels.noDocuments} />
          </div>
        )}

        {activeTab === 'reports' && <EmptyState message={labels.noReports} />}

        {bookingUnit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-lg rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[var(--nc-text-primary)]">
                    {labels.bookingTitle}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">
                    {displayProjectName(selectedProject, displayLocale, labels)} —{' '}
                    {getUnitDisplayNumber(bookingUnit, 1, labels.unitFallback)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setBookingUnit(null)}
                  className="nc-btn-ghost min-h-[36px] rounded-xl px-3 py-1.5 text-sm font-semibold"
                >
                  {labels.close}
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-4">
                  <p className="text-xs text-[var(--nc-text-secondary)]">{labels.selectedUnit}</p>
                  <p className="mt-1 font-semibold text-[var(--nc-text-primary)]">
                    {getUnitDisplayNumber(bookingUnit, 1, labels.unitFallback)}
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-4">
                  <p className="text-xs text-[var(--nc-text-secondary)]">{labels.unitStatus}</p>
                  <p className="mt-1 font-semibold text-[var(--nc-text-primary)]">
                    {normalizeUnitStatus(bookingUnit.status, labels, displayLocale)}
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-4">
                  <p className="text-xs text-[var(--nc-text-secondary)]">{labels.unitPrice}</p>
                  <p className="mt-1 font-semibold text-[var(--nc-text-primary)]">
                    {formatCurrency(
                      bookingUnit.price || bookingUnit.askingPrice || bookingUnit.listPrice,
                      isArabic,
                      labels.notSpecified,
                      labels.sar,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBookingUnit(null)}
                  className="nc-btn-ghost min-h-[40px] rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  {labels.cancel}
                </button>

                <button
                  type="button"
                  onClick={() => setBookingUnit(null)}
                  className="nc-btn-primary min-h-[40px] rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  {labels.confirmSelection}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      dir={direction}
      className="nc-page nc-stack orca-container space-y-5 overflow-x-hidden px-4 pb-8 pt-4 text-[var(--nc-text-primary)] lg:px-6"
    >
      <header className="orca-workspace-hero">
        <div>
          <p className="text-xs font-bold text-[var(--nc-accent)]">{labels.breadcrumb}</p>
          <h1 className="mt-1 text-2xl font-black tracking-[-0.02em] text-[var(--nc-text-primary)]">
            {labels.pageTitle}
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--nc-text-secondary)]">
            {labels.pageSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void loadProjects();
            }}
            disabled={isLoadingProjects}
            className="nc-btn nc-btn-ghost inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--nc-border)] px-4 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={15} className={isLoadingProjects ? 'animate-spin' : ''} aria-hidden="true" />
            {labels.refresh}
          </button>

          {hasPermission('CREATE_PROJECT') && (
            <button
              type="button"
              className="nc-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-xs font-black"
            >
              <Plus size={16} aria-hidden="true" />
              {labels.createProject}
            </button>
          )}
        </div>
      </header>

      <div className="orca-workspace-metrics">
        {listKpis.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="orca-workspace-metric min-h-[96px]">
              <div className="flex items-start justify-between gap-3 text-start">
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-5 text-[var(--nc-text-secondary)]">
                    {item.label}
                  </p>
                  <strong className="mt-2 block text-2xl font-black tabular-nums tracking-tight text-[var(--nc-text-primary)]">
                    {item.value}
                  </strong>
                </div>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-soft)] text-[var(--nc-text-secondary)]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-3 text-start text-xs font-medium leading-5 text-[var(--nc-text-secondary)]">
                {item.note}
              </p>
            </div>
          );
        })}
      </div>

      <div className="orca-workspace-panel flex min-w-0 flex-col overflow-hidden" data-operational-list-card>
        <div className="orca-workspace-toolbar shrink-0 border-b border-[var(--nc-border)] p-3">
          <div className="relative w-full lg:max-w-md">
            <Search
              size={15}
              className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--nc-text-secondary)] ${searchIconSide}`}
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setProjectPage(1);
              }}
              placeholder={labels.searchPlaceholder}
              aria-label={labels.searchPlaceholder}
              className={`min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] ${searchInputPad} text-sm font-semibold text-[var(--nc-text-primary)] outline-none placeholder:text-[var(--nc-text-dim)] focus-visible:border-[var(--nc-accent-border)]`}
            />
          </div>
        </div>

        {isLoadingProjects ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 px-4 py-6">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent" />
            <span className="text-xs font-medium text-[var(--nc-text-secondary)]">
              {labels.loadingProjects}
            </span>
          </div>
        ) : filteredProjects.length > 0 ? (
          <>
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--nc-border)] text-[var(--nc-text-secondary)]">
                    <th className={`px-3 py-3 ${textAlign} font-semibold`}>{labels.projectName}</th>
                    <th className={`px-3 py-3 ${textAlign} font-semibold`}>{labels.location}</th>
                    <th className={`px-3 py-3 ${textAlign} font-semibold`}>{labels.status}</th>
                    <th className={`px-3 py-3 ${textAlign} font-semibold`}>{labels.units}</th>
                    <th className={`px-3 py-3 ${textAlign} font-semibold`}>{labels.progress}</th>
                  </tr>
                </thead>

                <tbody>
                  {pagedProjects.map((project) => (
                    <tr
                      key={project.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        void handleSelectProject(project.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          void handleSelectProject(project.id);
                        }
                      }}
                      className="orca-data-row cursor-pointer border-b border-[var(--nc-border)] transition-colors hover:bg-[var(--nc-accent-soft)] focus-visible:bg-[var(--nc-accent-soft)] focus-visible:outline-none"
                    >
                      <td className="px-3 py-3 font-semibold text-[var(--nc-text-primary)]">
                        {displayProjectName(project, displayLocale, labels)}
                      </td>

                      <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                        {displayProjectLocation(project, displayLocale, labels)}
                      </td>

                      <td className="px-3 py-3">
                        <StatusBadge>
                          {normalizeProjectStatus(project.status, labels, displayLocale)}
                        </StatusBadge>
                      </td>

                      <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                        {formatNumber(project.unitsSold, isArabic)} /{' '}
                        {formatNumber(project.unitsTotal, isArabic)}
                      </td>

                      <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                        {formatNumber(project.progressPercent, isArabic)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationBar
              page={projectPage}
              totalPages={projectTotalPages}
              labels={labels}
              isArabic={isArabic}
              onPrevious={() => setProjectPage((page) => Math.max(1, page - 1))}
              onNext={() => setProjectPage((page) => Math.min(projectTotalPages, page + 1))}
            />
          </>
        ) : (
          <div className="flex min-h-[180px] max-h-[220px] flex-col items-center justify-center px-4 py-6 text-center">
            <p className="text-sm font-medium text-[var(--nc-text-secondary)]">
              {hasActiveSearch ? labels.noProjects : labels.noProjectsYet}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}