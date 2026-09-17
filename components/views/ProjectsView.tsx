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
import { getDetailedProjectsAction, getProjectUnitsAction, createProjectAction, toggleUnitStatusAction } from '@/app/actions/projects';
import { displayGeo, displayEntity, displayEnum } from '@/lib/display';
import type { DisplayLocale } from '@/lib/display';
import {
  OperationsBackAction,
  OperationsDialog,
  OperationsEmptyState,
  OperationsFormField,
  OperationsKpiGrid,
  OperationsMasterList,
  OperationsMasterRow,
  OperationsMetricCard,
  OperationsPageHeader,
  OperationsPanel,
  OperationsPanelHeader,
  OperationsTabs,
  OperationsTextField,
} from '@/components/operations';
import { operationsVisual } from '@/features/operations/visual';
import SettingsSelect from '@/components/settings/SettingsSelect';

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
  no?: string;
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

const PAGE_SIZE = 5;

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

function formatNumber(value: unknown, _isArabic: boolean): string {
  return toNumber(value).toLocaleString('en-US');
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

function normalizeUnitStatus(status: string | undefined, labels: typeof copy.ar, _locale: DisplayLocale): string {
  return labels[unitStatusKey(status)];
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
  const candidates = [unit.displayNumber, unit.unitNumber, unit.no, unit.number, unit.code, unit.name];

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
          className={`${operationsVisual.secondaryButton} min-h-11 px-3 py-2 text-[12px] disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {labels.previous}
        </button>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={onNext}
          className={`${operationsVisual.secondaryButton} min-h-11 px-3 py-2 text-[12px] disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {labels.next}
        </button>
      </div>
    </div>
  );
}

function ProjectDialogCell({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className={`${operationsVisual.softPanel} p-4`}>
      <p className={operationsVisual.meta}>{label}</p>
      <p className="mt-1 font-semibold text-[var(--nc-text-primary)]">{value}</p>
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
  const [isBookingUnit, setIsBookingUnit] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createProjectStatus, setCreateProjectStatus] = useState('PLANNING');

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

  useEffect(() => {
    setProjectPage(1);
  }, [searchTerm]);

  async function submitCreateProject(formData: FormData) {
    setIsCreatingProject(true);
    setCreateError('');
    try {
      const result = await createProjectAction(formData);
      if (!result?.success) {
        setCreateError(result?.error || labels.createProject);
        return;
      }
      setShowCreateProject(false);
      setCreateProjectStatus('PLANNING');
      await loadProjects();
    } catch {
      setCreateError(labels.createProject);
    } finally {
      setIsCreatingProject(false);
    }
  }

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

    setBookingError('');
    setBookingUnit({
      ...unit,
      displayNumber: getUnitDisplayNumber(unit, absoluteIndex, labels.unitFallback),
    });
  }

  async function confirmBooking() {
    if (!bookingUnit?.id || !selectedProjectId || isBookingUnit) return;

    setIsBookingUnit(true);
    setBookingError('');

    try {
      const result = await toggleUnitStatusAction(
        String(bookingUnit.id),
        String(bookingUnit.status || 'Available'),
      );

      if (!result?.success) {
        setBookingError(result?.error || labels.notBookable);
        return;
      }

      const refreshedUnits = await getProjectUnitsAction(String(selectedProjectId));
      setUnits(extractArray(refreshedUnits));
      setBookingUnit(null);
    } catch {
      setBookingError(labels.notBookable);
    } finally {
      setIsBookingUnit(false);
    }
  }

  if (selectedProject) {
    return (
      <section dir={direction} className={operationsVisual.page} data-project-detail-contract="dashboard-v2">
        <div className={operationsVisual.pageStack}>
          <OperationsPageHeader
            eyebrow={labels.breadcrumb}
            title={displayProjectName(selectedProject, displayLocale, labels)}
            description={displayProjectLocation(selectedProject, displayLocale, labels)}
            icon={FolderKanban}
            meta={<StatusBadge>{normalizeProjectStatus(selectedProject.status, labels, displayLocale)}</StatusBadge>}
            actions={
              <OperationsBackAction
                onClick={handleBackToList}
                label={labels.backToProjects}
                locale={displayLocale}
              />
            }
          />

          <OperationsKpiGrid aria-label={labels.pageTitle}>
            <OperationsMetricCard title={labels.totalUnits} value={formatNumber(selectedProject.unitsTotal, isArabic)} description={labels.expectedUnits} icon={LayoutGrid} />
            <OperationsMetricCard title={labels.soldUnits} value={formatNumber(selectedProject.unitsSold, isArabic)} description={labels.soldUnits} icon={CheckCircle2} />
            <OperationsMetricCard title={labels.progress} value={`${formatNumber(selectedProject.progressPercent, isArabic)}%`} description={labels.projectSummary} icon={Building2} />
            <OperationsMetricCard title={labels.status} value={normalizeProjectStatus(selectedProject.status, labels, displayLocale)} description={labels.location} icon={FolderKanban} />
          </OperationsKpiGrid>

          <OperationsPanel>
            <OperationsTabs aria-label={labels.pageTitle}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={isActive ? operationsVisual.activeTab : operationsVisual.tab} aria-selected={isActive} role="tab">
                    {labels[tab.labelKey]}
                  </button>
                );
              })}
            </OperationsTabs>

            <div className="p-3">
              {activeTab === 'overview' ? (
                <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
                  <div className={`${operationsVisual.softPanel} p-4`}>
                    <p className={operationsVisual.meta}>{labels.projectSummary}</p>
                    <p className="mt-2 min-h-[48px] text-sm leading-7 text-[var(--nc-text-primary)]">{safeDisplay(selectedProject.description, labels.noProjectDescription)}</p>
                  </div>
                  <div className="grid gap-2">
                    <div className={`${operationsVisual.contentCard} p-3`}><p className={operationsVisual.meta}>{labels.expectedUnits}</p><strong className="mt-1 block text-lg">{formatNumber(selectedProject.unitsTotal, isArabic)}</strong></div>
                    <div className={`${operationsVisual.contentCard} p-3`}><p className={operationsVisual.meta}>{labels.progress}</p><strong className="mt-1 block text-lg">{formatNumber(selectedProject.progressPercent, isArabic)}%</strong></div>
                  </div>
                </div>
              ) : null}

              {activeTab === 'phases' ? <OperationsEmptyState>{labels.noPhases}</OperationsEmptyState> : null}

              {activeTab === 'units' ? (
                <div className="space-y-2">
                  {isLoadingUnits ? (
                    <OperationsEmptyState>{labels.loadingUnits}</OperationsEmptyState>
                  ) : units.length > 0 ? (
                    <>
                      <div className="grid grid-cols-[minmax(90px,1fr)_minmax(110px,1fr)_minmax(90px,.8fr)_minmax(120px,1fr)_minmax(100px,.8fr)_auto] items-center gap-3 border-b border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2 text-[12px] font-bold text-[var(--nc-text-secondary)]">
                        <span>{labels.unitNumber}</span>
                        <span>{labels.type}</span>
                        <span>{labels.area}</span>
                        <span>{labels.price}</span>
                        <span>{labels.status}</span>
                        <span>{labels.action}</span>
                      </div>
                      <OperationsMasterList>
                        {pagedUnits.map((unit, index) => {
                          const absoluteIndex = (unitPage - 1) * PAGE_SIZE + index + 1;
                          const bookable = isUnitBookable(unit.status);
                          return (
                            <div key={String(unit.id || absoluteIndex)} className="grid min-h-[64px] grid-cols-[minmax(90px,1fr)_minmax(110px,1fr)_minmax(90px,.8fr)_minmax(120px,1fr)_minmax(100px,.8fr)_auto] items-center gap-3 rounded-xl border border-transparent px-3 py-2 hover:border-[var(--nc-border)] hover:bg-[var(--nc-surface-soft)]">
                              <strong className="text-[14px] font-bold text-[var(--nc-text-primary)]">{getUnitDisplayNumber(unit, absoluteIndex, labels.unitFallback)}</strong>
                              <span className="text-[11px] text-[var(--nc-text-secondary)]">{getUnitType(unit, labels, displayLocale)}</span>
                              <span className="text-[11px] text-[var(--nc-text-secondary)]">{getUnitArea(unit, labels)}</span>
                              <span className="text-[14px] text-[var(--nc-text-primary)]">{formatCurrency(unit.price || unit.askingPrice || unit.listPrice, isArabic, labels.notSpecified, labels.sar)}</span>
                              <StatusBadge>{normalizeUnitStatus(unit.status, labels, displayLocale)}</StatusBadge>
                              <button type="button" disabled={!bookable} onClick={() => openBookingModal(unit, index)} className={`${operationsVisual.primaryButton} text-[12px]`}>{bookable ? labels.bookUnit : labels.notBookable}</button>
                            </div>
                          );
                        })}
                      </OperationsMasterList>
                      <PaginationBar page={unitPage} totalPages={unitTotalPages} labels={labels} isArabic={isArabic} onPrevious={() => setUnitPage((page) => Math.max(1, page - 1))} onNext={() => setUnitPage((page) => Math.min(unitTotalPages, page + 1))} />
                    </>
                  ) : toNumber(selectedProject.unitsTotal) > 0 ? (
                    <OperationsEmptyState>{`${labels.noUnitsLoaded} ${formatNumber(selectedProject.unitsTotal, isArabic)}`}</OperationsEmptyState>
                  ) : (
                    <OperationsEmptyState>{labels.noUnits}</OperationsEmptyState>
                  )}
                </div>
              ) : null}

              {activeTab === 'bookings' ? <OperationsEmptyState>{labels.noBookings}</OperationsEmptyState> : null}
              {activeTab === 'documents' ? <OperationsEmptyState>{labels.noDocuments}</OperationsEmptyState> : null}
              {activeTab === 'reports' ? <OperationsEmptyState>{labels.noReports}</OperationsEmptyState> : null}
            </div>
          </OperationsPanel>

          <OperationsDialog
            open={Boolean(bookingUnit)}
            onClose={() => { if (!isBookingUnit) { setBookingError(''); setBookingUnit(null); } }}
            title={labels.bookingTitle}
            description={bookingUnit ? `${displayProjectName(selectedProject, displayLocale, labels)} — ${getUnitDisplayNumber(bookingUnit, 1, labels.unitFallback)}` : undefined}
            closeLabel={labels.close}
            closeDisabled={isBookingUnit}
            dir={direction}
            footer={bookingUnit ? (
              <>
                <button type="button" onClick={() => { setBookingError(''); setBookingUnit(null); }} disabled={isBookingUnit} className={operationsVisual.secondaryButton}>{labels.cancel}</button>
                <button type="button" onClick={() => void confirmBooking()} disabled={isBookingUnit} className={operationsVisual.primaryButton}>{labels.confirmSelection}</button>
              </>
            ) : null}
          >
            {bookingUnit ? (
              <div className="grid gap-3">
                <ProjectDialogCell label={labels.selectedUnit} value={getUnitDisplayNumber(bookingUnit, 1, labels.unitFallback)} />
                <ProjectDialogCell label={labels.unitStatus} value={normalizeUnitStatus(bookingUnit.status, labels, displayLocale)} />
                <ProjectDialogCell label={labels.unitPrice} value={formatCurrency(bookingUnit.price || bookingUnit.askingPrice || bookingUnit.listPrice, isArabic, labels.notSpecified, labels.sar)} />
                {bookingError ? <p className="text-sm font-semibold text-rose-400">{bookingError}</p> : null}
              </div>
            ) : null}
          </OperationsDialog>
        </div>
      </section>
    );
  }

  return (
    <section
      dir={direction}
      className={operationsVisual.page}
>
      <div className={operationsVisual.pageStack}>
      <OperationsPageHeader
        eyebrow={labels.breadcrumb}
        title={labels.pageTitle}
        description={labels.pageSubtitle}
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                void loadProjects();
              }}
              disabled={isLoadingProjects}
              className={operationsVisual.iconButton}
              title={labels.refresh}
              aria-label={labels.refresh}
            >
              <RefreshCw
                className={isLoadingProjects ? 'animate-spin' : ''}
                aria-hidden="true"
              />
            </button>
            {hasPermission('CREATE_PROJECT') ? (
              <button
                type="button"
                onClick={() => {
                  setCreateError('');
                  setCreateProjectStatus('PLANNING');
                  setShowCreateProject(true);
                }}
                className={operationsVisual.primaryButton}
              >
                <Plus aria-hidden="true" />
                {labels.createProject}
              </button>
            ) : null}
          </>
        }
      />

      <OperationsDialog
        open={showCreateProject}
        onClose={() => {
          if (!isCreatingProject) {
            setCreateError('');
            setCreateProjectStatus('PLANNING');
            setShowCreateProject(false);
          }
        }}
        title={labels.createProject}
        closeLabel={labels.cancel}
        closeDisabled={isCreatingProject}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setCreateError('');
                setCreateProjectStatus('PLANNING');
                setShowCreateProject(false);
              }}
              disabled={isCreatingProject}
              className={operationsVisual.ghostButton}
            >
              {labels.cancel}
            </button>
            <button
              type="submit"
              form="project-create-form"
              disabled={isCreatingProject}
              className={operationsVisual.primaryButton}
            >
              {labels.createProject}
            </button>
          </>
        }
      >
        <form id="project-create-form" action={(formData) => { void submitCreateProject(formData); }} noValidate className="grid gap-3">
          <OperationsFormField label={labels.projectName} error={createError || undefined}><OperationsTextField name="name" autoFocus /></OperationsFormField>
          <OperationsFormField label={labels.location}><OperationsTextField name="city" /></OperationsFormField>
          <OperationsFormField label={labels.status}>
            <SettingsSelect
              name="status"
              value={createProjectStatus}
              onChange={setCreateProjectStatus}
              aria-label={labels.status}
              className="w-full"
              options={[
                { value: 'PLANNING', label: labels.planned },
                { value: 'UNDER_CONSTRUCTION', label: labels.underConstruction },
                { value: 'COMPLETED', label: labels.completed },
                { value: 'SOLD_OUT', label: isArabic ? 'مباع بالكامل' : 'Sold Out' },
              ]}
            />
          </OperationsFormField>
        </form>
      </OperationsDialog>

      <OperationsKpiGrid aria-label={labels.pageTitle}>
        {listKpis.map((item) => (
          <OperationsMetricCard key={item.label} title={item.label} value={item.value} description={item.note} icon={item.icon} />
        ))}
      </OperationsKpiGrid>

      <OperationsPanel className="flex min-w-0 flex-col overflow-hidden" data-operational-list-card>
        <OperationsPanelHeader title={labels.pageTitle} description={`${filteredProjects.length} ${isArabic ? 'نتيجة' : 'results'}`} icon={FolderKanban} />
        <div className="shrink-0 border-b border-[var(--nc-border)] p-2.5">
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
              className={`orca-operations-input ${searchInputPad}`}
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
            <div className="grid grid-cols-[minmax(160px,1.5fr)_minmax(120px,1fr)_minmax(110px,.8fr)_minmax(90px,.7fr)_90px] items-center gap-3 border-b border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2 text-[12px] font-bold text-[var(--nc-text-secondary)]">
              <span>{labels.projectName}</span>
              <span>{labels.location}</span>
              <span>{labels.status}</span>
              <span>{labels.units}</span>
              <span>{labels.progress}</span>
            </div>
            <OperationsMasterList>
              {pagedProjects.map((project) => (
                <OperationsMasterRow key={String(project.id)} onClick={() => { void handleSelectProject(project.id); }} className="grid min-h-[64px] grid-cols-[minmax(160px,1.5fr)_minmax(120px,1fr)_minmax(110px,.8fr)_minmax(90px,.7fr)_90px] items-center gap-3 px-3 py-2.5">
                  <strong className="truncate text-[14px] font-bold text-[var(--nc-text-primary)]">{displayProjectName(project, displayLocale, labels)}</strong>
                  <span className="truncate text-[11px] text-[var(--nc-text-secondary)]">{displayProjectLocation(project, displayLocale, labels)}</span>
                  <StatusBadge>{normalizeProjectStatus(project.status, labels, displayLocale)}</StatusBadge>
                  <span className="text-[14px] text-[var(--nc-text-primary)]">{formatNumber(project.unitsSold, isArabic)} / {formatNumber(project.unitsTotal, isArabic)}</span>
                  <span className="text-[14px] font-bold text-[var(--nc-text-primary)]">{formatNumber(project.progressPercent, isArabic)}%</span>
                </OperationsMasterRow>
              ))}
            </OperationsMasterList>
            <PaginationBar page={projectPage} totalPages={projectTotalPages} labels={labels} isArabic={isArabic} onPrevious={() => setProjectPage((page) => Math.max(1, page - 1))} onNext={() => setProjectPage((page) => Math.min(projectTotalPages, page + 1))} />
          </>
        ) : (
          <div className="flex min-h-[180px] max-h-[220px] flex-col items-center justify-center px-4 py-6 text-center">
            <p className="text-sm font-medium text-[var(--nc-text-secondary)]">
              {hasActiveSearch ? labels.noProjects : labels.noProjectsYet}
            </p>
          </div>
        )}
      </OperationsPanel>
      </div>
    </section>
  );
}