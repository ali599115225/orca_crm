'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useApp } from '@/app/context/AppContext';
import { getDetailedProjectsAction, getProjectUnitsAction } from '@/app/actions/projects';

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
  type?: string;
  area?: number | string;
  price?: number | string;
  status?: string;
};

type TabKey = 'overview' | 'phases' | 'units' | 'bookings' | 'documents' | 'reports';

const PAGE_SIZE = 10;

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'نظرة عامة' },
  { key: 'phases', label: 'المراحل' },
  { key: 'units', label: 'الوحدات' },
  { key: 'bookings', label: 'الحجوزات' },
  { key: 'documents', label: 'المستندات' },
  { key: 'reports', label: 'التقارير' },
];

function extractArray(result: unknown): any[] {
  if (Array.isArray(result)) return result;

  if (result && typeof result === 'object' && 'data' in result) {
    const data = (result as { data?: unknown }).data;
    return Array.isArray(data) ? data : [];
  }

  return [];
}

function normalizeStatus(status?: string): string {
  if (!status) return 'قيد الإنشاء';

  const value = String(status).toUpperCase();

  if (value === 'COMPLETED') return 'مكتمل';
  if (value === 'PLANNING') return 'مخطط له';
  if (value === 'ACTIVE') return 'نشط';
  if (value === 'IN_PROGRESS') return 'قيد الإنشاء';
  if (value === 'UNDER_CONSTRUCTION') return 'قيد الإنشاء';

  return status;
}

function normalizeUnitStatus(status?: string): string {
  if (!status) return 'متاحة';

  const value = String(status).toUpperCase();

  if (value === 'AVAILABLE') return 'متاحة';
  if (value === 'HOLD') return 'محجوزة مؤقتًا';
  if (value === 'SOLD') return 'مباعة';
  if (value === 'RESERVED') return 'محجوزة';
  if (value === 'BLOCKED') return 'متوقفة';

  return status;
}

function normalizeProject(project: any): ProjectItem {
  return {
    id: project.id,
    name: project.name || 'مشروع بدون اسم',
    city: project.city,
    location: project.location || project.city,
    status: normalizeStatus(project.status),
    unitsTotal: Number(project.unitsTotal || project.unitsCount || 0),
    unitsSold: Number(project.unitsSold || project.soldUnits || 0),
    progressPercent: Number(project.progressPercent || project.progress || 0),
    description: project.description || '',
    createdAt: project.createdAt,
    updatedAt: project.updatedAt || project.createdAt,
  };
}

function formatNumber(value: unknown): string {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue.toLocaleString('ar-SA') : '0';
}

function formatCurrency(value: unknown): string {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return 'غير محدد';

  return `${numberValue.toLocaleString('ar-SA')} ر.س`;
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

export default function ProjectsView() {
  const { hasPermission } = useAuth();
  const { lang } = useApp();
  const isArabic = lang === 'AR';

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | number | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [projectPage, setProjectPage] = useState(1);
  const [unitPage, setUnitPage] = useState(1);

  useEffect(() => {
    let mounted = true;

    async function loadProjects() {
      try {
        setIsLoadingProjects(true);

        const result = await getDetailedProjectsAction();
        const data = extractArray(result).map(normalizeProject);

        if (!mounted) return;

        setProjects(data);
      } catch {
        if (!mounted) return;

        setProjects([]);
      } finally {
        if (!mounted) return;

        setIsLoadingProjects(false);
      }
    }

    void loadProjects();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return projects;

    return projects.filter((project) => {
      return (
        project.name.toLowerCase().includes(term) ||
        String(project.location || '').toLowerCase().includes(term) ||
        String(project.status || '').toLowerCase().includes(term)
      );
    });
  }, [projects, searchTerm]);

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

  const totalUnits = projects.reduce((sum, project) => sum + Number(project.unitsTotal || 0), 0);
  const soldUnits = projects.reduce((sum, project) => sum + Number(project.unitsSold || 0), 0);
  const activeProjects = projects.filter((project) => project.status !== 'مكتمل').length;

  async function handleSelectProject(projectId: string | number) {
    setSelectedProjectId(projectId);
    setActiveTab('overview');
    setUnits([]);
    setUnitPage(1);

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
  }

  if (selectedProject) {
    return (
      <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-5 px-4 pb-8 pt-4 lg:px-6">
        <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleBackToList}
                className="nc-btn-ghost inline-flex min-h-[40px] items-center rounded-xl px-3 py-2 text-sm font-semibold"
              >
                العودة لقائمة المشاريع
              </button>

              <div>
                <h1 className="text-2xl font-bold text-[var(--nc-text-primary)]">
                  {selectedProject.name}
                </h1>
                <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">
                  {selectedProject.location || 'الموقع غير محدد'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusBadge>{selectedProject.status || 'قيد الإنشاء'}</StatusBadge>
                <StatusBadge>نسبة الإنجاز {formatNumber(selectedProject.progressPercent)}%</StatusBadge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:min-w-[360px]">
              <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-4">
                <p className="text-xs text-[var(--nc-text-secondary)]">إجمالي الوحدات</p>
                <p className="mt-2 text-xl font-bold text-[var(--nc-text-primary)]">
                  {formatNumber(selectedProject.unitsTotal)}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-4">
                <p className="text-xs text-[var(--nc-text-secondary)]">الوحدات المباعة</p>
                <p className="mt-2 text-xl font-bold text-[var(--nc-text-primary)]">
                  {formatNumber(selectedProject.unitsSold)}
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
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 lg:col-span-2">
              <p className="text-sm font-semibold text-[var(--nc-text-secondary)]">ملخص المشروع</p>
              <p className="mt-3 min-h-[80px] text-sm leading-7 text-[var(--nc-text-primary)]">
                {selectedProject.description || 'لا يوجد وصف تفصيلي لهذا المشروع حاليًا.'}
              </p>
            </div>

            <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5">
              <p className="text-sm text-[var(--nc-text-secondary)]">الوحدات المتوقعة</p>
              <p className="mt-3 text-2xl font-bold text-[var(--nc-text-primary)]">
                {formatNumber(selectedProject.unitsTotal)}
              </p>
            </div>

            <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5">
              <p className="text-sm text-[var(--nc-text-secondary)]">نسبة الإنجاز</p>
              <p className="mt-3 text-2xl font-bold text-[var(--nc-text-primary)]">
                {formatNumber(selectedProject.progressPercent)}%
              </p>
            </div>
          </div>
        )}

        {activeTab === 'phases' && (
          <EmptyState message="لم يتم ربط مراحل تنفيذية بهذا المشروع حتى الآن." />
        )}

        {activeTab === 'units' && (
          <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4">
            {isLoadingUnits ? (
              <EmptyState message="جاري تحميل وحدات المشروع..." />
            ) : units.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--nc-border)] text-[var(--nc-text-secondary)]">
                        <th className="px-3 py-3 text-right font-semibold">رقم الوحدة</th>
                        <th className="px-3 py-3 text-right font-semibold">النوع</th>
                        <th className="px-3 py-3 text-right font-semibold">المساحة</th>
                        <th className="px-3 py-3 text-right font-semibold">السعر</th>
                        <th className="px-3 py-3 text-right font-semibold">الحالة</th>
                        <th className="px-3 py-3 text-right font-semibold">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedUnits.map((unit, index) => (
                        <tr key={unit.id || index} className="border-b border-[var(--nc-border)]">
                          <td className="px-3 py-3 text-[var(--nc-text-primary)]">
                            {unit.unitNumber ||
                              unit.number ||
                              `وحدة ${(unitPage - 1) * PAGE_SIZE + index + 1}`}
                          </td>
                          <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                            {unit.type || 'غير محدد'}
                          </td>
                          <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                            {unit.area ? `${unit.area} م²` : 'غير محدد'}
                          </td>
                          <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                            {formatCurrency(unit.price)}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge>{normalizeUnitStatus(unit.status)}</StatusBadge>
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              className="nc-btn-primary min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-semibold"
                            >
                              حجز وحدة
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {units.length > PAGE_SIZE && (
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-3 text-sm text-[var(--nc-text-secondary)]">
                    <span>
                      صفحة {formatNumber(unitPage)} من {formatNumber(unitTotalPages)}
                    </span>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={unitPage <= 1}
                        onClick={() => setUnitPage((page) => Math.max(1, page - 1))}
                        className="nc-btn-ghost min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      >
                        السابق
                      </button>

                      <button
                        type="button"
                        disabled={unitPage >= unitTotalPages}
                        onClick={() => setUnitPage((page) => Math.min(unitTotalPages, page + 1))}
                        className="nc-btn-primary min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      >
                        التالي
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : Number(selectedProject.unitsTotal || 0) > 0 ? (
              <EmptyState
                message={`بيانات الوحدات لم تُحمّل بعد من قاعدة البيانات. إجمالي الوحدات المتوقع: ${formatNumber(
                  selectedProject.unitsTotal,
                )}`}
              />
            ) : (
              <EmptyState message="لا توجد وحدات مرتبطة بهذا المشروع حاليًا." />
            )}
          </div>
        )}

        {activeTab === 'bookings' && (
          <EmptyState message="لا توجد حجوزات مرتبطة بهذا المشروع حاليًا." />
        )}

        {activeTab === 'documents' && (
          <div className="space-y-3">
            {hasPermission('manage_projects') && (
              <button
                type="button"
                className="nc-btn-ghost min-h-[40px] rounded-xl px-4 py-2 text-sm font-semibold"
              >
                رفع مخطط أو مستند
              </button>
            )}
            <EmptyState message="لا توجد مستندات مرفوعة لهذا المشروع حاليًا." />
          </div>
        )}

        {activeTab === 'reports' && (
          <EmptyState message="لا توجد تقارير تقدم مرتبطة بهذا المشروع حاليًا." />
        )}
      </section>
    );
  }

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-5 px-4 pb-8 pt-4 lg:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nc-text-primary)]">المشاريع العقارية</h1>
          <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">
            إدارة مشاريع التطوير العقاري ومتابعة الوحدات والإنجاز.
          </p>
        </div>

        {hasPermission('manage_projects') && (
          <button
            type="button"
            className="nc-btn-primary min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold"
          >
            إنشاء مشروع
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5">
          <p className="text-sm text-[var(--nc-text-secondary)]">إجمالي المشاريع</p>
          <p className="mt-3 text-2xl font-bold text-[var(--nc-text-primary)]">
            {formatNumber(projects.length)}
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5">
          <p className="text-sm text-[var(--nc-text-secondary)]">المشاريع النشطة</p>
          <p className="mt-3 text-2xl font-bold text-[var(--nc-text-primary)]">
            {formatNumber(activeProjects)}
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5">
          <p className="text-sm text-[var(--nc-text-secondary)]">إجمالي الوحدات</p>
          <p className="mt-3 text-2xl font-bold text-[var(--nc-text-primary)]">
            {formatNumber(totalUnits)}
          </p>
          <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
            المباعة: {formatNumber(soldUnits)}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setProjectPage(1);
            }}
            placeholder="ابحث باسم المشروع أو الموقع أو الحالة"
            className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-4 text-sm text-[var(--nc-text-primary)] outline-none lg:max-w-md"
          />
        </div>

        {isLoadingProjects ? (
          <EmptyState message="جاري تحميل المشاريع العقارية..." />
        ) : filteredProjects.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[var(--nc-border)] text-[var(--nc-text-secondary)]">
                  <th className="px-3 py-3 text-right font-semibold">اسم المشروع</th>
                  <th className="px-3 py-3 text-right font-semibold">الموقع</th>
                  <th className="px-3 py-3 text-right font-semibold">الحالة</th>
                  <th className="px-3 py-3 text-right font-semibold">الوحدات</th>
                  <th className="px-3 py-3 text-right font-semibold">نسبة الإنجاز</th>
                  <th className="px-3 py-3 text-right font-semibold">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {pagedProjects.map((project) => (
                  <tr key={project.id} className="border-b border-[var(--nc-border)]">
                    <td className="px-3 py-3 font-semibold text-[var(--nc-text-primary)]">
                      {project.name}
                    </td>
                    <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                      {project.location || 'غير محدد'}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge>{project.status || 'قيد الإنشاء'}</StatusBadge>
                    </td>
                    <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                      {formatNumber(project.unitsSold)} / {formatNumber(project.unitsTotal)}
                    </td>
                    <td className="px-3 py-3 text-[var(--nc-text-secondary)]">
                      {formatNumber(project.progressPercent)}%
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          void handleSelectProject(project.id);
                        }}
                        className="nc-btn-primary min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-semibold"
                      >
                        فتح
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredProjects.length > PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-3 text-sm text-[var(--nc-text-secondary)]">
                <span>
                  صفحة {formatNumber(projectPage)} من {formatNumber(projectTotalPages)}
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={projectPage <= 1}
                    onClick={() => setProjectPage((page) => Math.max(1, page - 1))}
                    className="nc-btn-ghost min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    السابق
                  </button>

                  <button
                    type="button"
                    disabled={projectPage >= projectTotalPages}
                    onClick={() => setProjectPage((page) => Math.min(projectTotalPages, page + 1))}
                    className="nc-btn-primary min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState message="لا توجد مشاريع عقارية مطابقة للبحث الحالي." />
        )}
      </div>
    </section>
  );
}