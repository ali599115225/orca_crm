'use client';

import React, { useState, useEffect } from 'react';
import { Home, Plus, CheckCircle2, Clock, Landmark, Eye } from 'lucide-react';
import { Button } from '../ui/orca-components';
import { SmartCard } from '@/components/ui/SmartCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusCell } from '@/components/ui/orca-table/cells/StatusCell';
import { MoneyCell } from '@/components/ui/orca-table/cells/MoneyCell';
import { formatPropertyStatus } from '@/lib/ui-status';
import { toast } from '@/app/context/ToastContext';
import { KpiCard } from '../ui/KpiCard';
import { getPropertiesAction, createUnitActionDirect } from '@/app/actions/properties';
import { getDetailedProjectsAction } from '@/app/actions/projects';

interface PropertyUnit {
  id: number | string;
  sku: string;
  type: string;
  project: string;
  projectId?: string;
  area: string;
  price: number;
  priceStr: string;
  status: 'Available' | 'Hold' | 'Sold';
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

const primaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--nc-op-blue)] text-white text-xs font-bold transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] text-[var(--nc-text-primary)] text-xs font-bold transition-all hover:border-[var(--nc-accent-border)] disabled:cursor-not-allowed disabled:opacity-60';
const inputClass =
  'w-full rounded-xl bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] px-3 py-2.5 text-[var(--nc-text-primary)] text-xs outline-none transition-colors placeholder:text-[var(--nc-text-dim)] focus:border-[var(--nc-accent-border)]';
const selectClass =
  'w-auto min-w-[130px] rounded-lg bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] px-3 py-2 text-[var(--nc-text-primary)] text-xs outline-none focus:border-[var(--nc-accent-border)]';
const labelClass = 'block text-xs font-medium text-[var(--nc-text-secondary)]';
const modalClass =
  'relative w-full max-w-md rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface)] p-6 text-right text-xs shadow-2xl space-y-4';

export default function PropertyList({
  onSelectProperty,
  hasPermission,
  addTelemetryEvent,
  lang,
  isArabic,
}: PropertyListProps) {
  const [properties, setProperties] = useState<PropertyUnit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [newSku, setNewSku] = useState('');
  const [newType, setNewType] = useState('شقة سكنية');
  const [newProject, setNewProject] = useState('مشروع النخيل السكني');
  const [newPrice, setNewPrice] = useState(1000000);
  const [newArea, setNewArea] = useState('120 م²');
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
        setFetchError(err.message || 'تعذر تحميل الوحدات العقارية.');
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

  const projectOptions = Array.from(new Set(properties.map((u) => u.project).filter(Boolean)));

  const filteredProperties = properties.filter((u) => {
    const searchable = `${u.sku || ''} ${u.type || ''} ${u.project || ''}`.toLowerCase();
    const matchSearch = !searchTerm || searchable.includes(searchTerm.toLowerCase());
    const matchStatus = !statusFilter || u.status === statusFilter;
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
      toast.error('عذراً! دورك الحالي لا يملك الصلاحية لإضافة وحدات جديدة.');
      return;
    }

    try {
      const projectsResult = await getDetailedProjectsAction();
      const projectsList = projectsResult && 'data' in projectsResult ? projectsResult.data : Array.isArray(projectsResult) ? projectsResult : [];
      const firstProject = projectsList?.[0];
      if (!firstProject) {
        toast.error('الرجاء إنشاء مشروع عقاري أولاً قبل إضافة وحدات.');
        return;
      }

      const res = await createUnitActionDirect({
        projectId: String(firstProject.id),
        unitNumber: newSku,
        priceSar: newPrice,
        type: newType,
        area: newArea,
        description: 'وحدة سكنية مضافة حديثاً إلى مستودع العقارات.',
      });

      if (!res.success || !res.data) throw new Error(res.error || 'حدث خطأ في قاعدة البيانات');

      setProperties((prev) => [...prev, res.data]);
      logTelemetry('unit.created', { unitId: res.data.id, sku: newSku, price: newPrice });
      toast.success('تمت إضافة الوحدة بنجاح.');
    } catch (err: any) {
      toast.error('خطأ في إنشاء الوحدة: ' + err.message);
    }

    setNewSku('');
    setNewPrice(1000000);
    setActiveModal(null);
  };

  const formatNumber = (val: number) => val.toLocaleString('ar-SA');

  return (
    <section dir="rtl" className="space-y-5 px-4 pb-8 pt-4 lg:px-6 text-[var(--nc-text-primary)]">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--nc-text-primary)]">سجل العقارات والوحدات</h1>
          <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">إدارة الوحدات السكنية والتجارية ومتابعة الحالات.</p>
        </div>

        <button
          onClick={() => {
            if (!hasPermission('CREATE_UNIT')) {
              toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لإنشاء وحدة.');
              return;
            }
            setActiveModal('new_unit');
          }}
          className="nc-btn-primary min-h-[40px] rounded-xl px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
        >
          إضافة وحدة
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5">
          <p className="text-sm text-[var(--nc-text-secondary)]">إجمالي الوحدات</p>
          <p className="mt-3 text-2xl font-bold text-[var(--nc-text-primary)]">
            {formatNumber(properties.length)}
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5">
          <p className="text-sm text-[var(--nc-text-secondary)]">المتاحة</p>
          <p className="mt-3 text-2xl font-bold text-[var(--nc-text-primary)]">
            {formatNumber(properties.filter((p) => p.status === 'Available').length)}
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5">
          <p className="text-sm text-[var(--nc-text-secondary)]">محجوزة مؤقتاً</p>
          <p className="mt-3 text-2xl font-bold text-[var(--nc-text-primary)]">
            {formatNumber(properties.filter((p) => p.status === 'Hold').length)}
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5">
          <p className="text-sm text-[var(--nc-text-secondary)]">مباعة</p>
          <p className="mt-3 text-2xl font-bold text-[var(--nc-text-primary)]">
            {formatNumber(properties.filter((p) => p.status === 'Sold').length)}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm flex flex-col">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            placeholder="ابحث برقم الوحدة أو المشروع..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-4 text-sm text-[var(--nc-text-primary)] outline-none lg:max-w-md"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-h-[44px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-4 text-sm outline-none w-full lg:w-48">
            <option value="">كل الحالات</option>
            <option value="Available">المتاحة</option>
            <option value="Hold">محجوزة مؤقتاً</option>
            <option value="Sold">مباعة</option>
          </select>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="min-h-[44px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-4 text-sm outline-none w-full lg:w-48">
            <option value="">كل المشاريع</option>
            {projectOptions.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent" />
            <span className="text-xs font-medium text-[var(--nc-text-secondary)]">جاري تحميل العقارات...</span>
          </div>
        ) : fetchError ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center">
            <p className="inline-block rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-300">{fetchError}</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center px-4 text-center text-sm font-medium text-[var(--nc-text-secondary)]">
            لا توجد وحدات عقارية مطابقة للبحث.
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="overflow-x-auto min-h-[500px]">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--nc-border)] text-[var(--nc-text-secondary)]">
                    <th className="px-3 py-3 text-start font-semibold">رقم الوحدة</th>
                    <th className="px-3 py-3 text-start font-semibold">المشروع</th>
                    <th className="px-3 py-3 text-start font-semibold">المساحة</th>
                    <th className="px-3 py-3 text-start font-semibold">السعر</th>
                    <th className="px-3 py-3 text-start font-semibold">الحالة</th>
                    <th className="px-3 py-3 text-center font-semibold">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProperties.map((u) => (
                    <tr key={u.id} className="border-b border-[var(--nc-border)] hover:bg-[var(--nc-surface-solid)] transition-colors cursor-pointer" onClick={() => {
                      onSelectProperty(String(u.id));
                      logTelemetry('unit.opened', { unitId: u.id, sku: u.sku });
                    }}>
                      <td className="px-3 py-4 text-sm font-bold text-[var(--nc-text-primary)]">{u.sku} — {u.type}</td>
                      <td className="px-3 py-4 text-sm text-[var(--nc-text-secondary)]">{u.project}</td>
                      <td className="px-3 py-4 text-sm text-[var(--nc-text-secondary)]">{u.area}</td>
                      <td className="px-3 py-4 text-sm font-bold text-[var(--nc-text-primary)]">{Number(u.price).toLocaleString('ar-SA')} ر.س</td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                          u.status === 'Hold' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' : 
                          u.status === 'Sold' ? 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20' : 
                          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                        }`}>
                          {u.status === 'Available' ? 'متاحة' : u.status === 'Hold' ? 'محجوزة مؤقتاً' : 'مباعة'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button type="button" className="nc-btn-primary min-h-[32px] rounded-lg px-3 py-1 text-xs font-semibold">فتح</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex flex-col md:flex-row items-center justify-between border-t border-[var(--nc-border)] pt-4 text-sm text-[var(--nc-text-secondary)]">
              <span>عرض {Math.min(startIndex + 1, filteredProperties.length)}-{Math.min(startIndex + itemsPerPage, filteredProperties.length)} من {filteredProperties.length}</span>
              <div className="flex items-center gap-2 mt-3 md:mt-0">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1} 
                  className="px-3 py-1.5 rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] disabled:opacity-50 hover:bg-[var(--nc-surface)] transition-colors"
                >
                  السابق
                </button>
                <span className="px-2">رقم الصفحة {currentPage} من {totalPages}</span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0} 
                  className="px-3 py-1.5 rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] disabled:opacity-50 hover:bg-[var(--nc-surface)] transition-colors"
                >
                  التالي
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeModal === 'new_unit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <form onSubmit={handleCreateUnit} className={modalClass}>
            <h3 className="flex items-center gap-2 border-b border-[var(--nc-glass-border)] pb-2 text-base font-extrabold text-[var(--nc-text-primary)]">
              <Plus size={18} />
              {isArabic ? 'إضافة وحدة عقارية جديدة' : 'Add New Property Unit'}
            </h3>

            <div className="space-y-1">
              <label className={labelClass}>رقم الوحدة:</label>
              <input type="text" required value={newSku} onChange={(e) => setNewSku(e.target.value)} placeholder="مثال: A-103" className={inputClass} />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>نوع العقار:</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value)} className={inputClass}>
                <option value="شقة سكنية">شقة سكنية</option>
                <option value="فيلا مستقلة">فيلا مستقلة</option>
                <option value="فيلا علوية">فيلا علوية</option>
                <option value="مكتب تجاري">مكتب تجاري</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className={labelClass}>المشروع السكني:</label>
              <select value={newProject} onChange={(e) => setNewProject(e.target.value)} className={inputClass}>
                {projectOptions.length > 0 ? (
                  projectOptions.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="مشروع النخيل السكني">مشروع النخيل السكني</option>
                    <option value="واحة الخليج">واحة الخليج</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className={labelClass}>المساحة الإجمالية:</label>
              <input type="text" required value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="مثال: 120 م²" className={inputClass} />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>السعر المطلوب (ر.س):</label>
              <input type="number" required value={newPrice} onChange={(e) => setNewPrice(Number(e.target.value))} className={inputClass} />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className={`${primaryButtonClass} flex-1`}>
                حفظ الوحدة
              </button>
              <button type="button" onClick={() => setActiveModal(null)} className={`${secondaryButtonClass} flex-1`}>
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
