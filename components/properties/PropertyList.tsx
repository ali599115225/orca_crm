'use client';

import React, { useState, useEffect } from 'react';
import {
  Home, Plus, Search, CheckCircle2, Clock, Landmark,
  Activity, Eye
} from 'lucide-react';
import { Button } from '../ui/orca-components';
import { SmartCard } from '@/components/ui/SmartCard';
import { toast } from '@/app/context/ToastContext';
import LayoutContainer from '../ui/LayoutContainer';
import { KpiCard } from '../ui/KpiCard';
import { getPropertiesAction, createUnitActionDirect } from '@/app/actions/properties';
import { getDetailedProjectsAction } from '@/app/actions/projects';

interface UnitEvent {
  id: string;
  type: string;
  at: string;
  note: string;
  media?: string[];
}

interface HandoverRecord {
  id: string;
  scheduledAt: string;
  status: string;
  checklist: string;
  media?: string[];
  completedAt?: string;
}

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

const initialProperties: PropertyUnit[] = [
  {
    id: 1,
    sku: 'A-101',
    type: 'شقة سكنية',
    project: 'مشروع النخيل السكني',
    area: '120 م²',
    price: 1200000,
    priceStr: '1,200,000 ر.س',
    status: 'Available',
    desc: 'شقة فاخرة تقع في الدور الأول بتشطيبات سوبر ديلوكس، تكييف مركزي متكامل، وتطل مباشرة على المساحات الخضراء والبحيرة الصناعية.',
    media: ['https://picsum.photos/seed/1/400/300', 'https://picsum.photos/seed/2/400/300'],
    docs: ['مخطط_الطابق_الداخلي.pdf', 'رخصة_البناء_البلدية.pdf'],
    events: [
      { id: 'ev_1', type: 'إدراج الوحدة', at: '2025-12-01', note: 'تم إدراج الوحدة بنجاح في نظام إدارة العقارات' },
      { id: 'ev_2', type: 'توثيق صور فوتوغرافية', at: '2026-01-10', note: 'تم تصوير الوحدة واعتمادها من موظف الجودة', media: ['https://picsum.photos/seed/1/400/300'] }
    ],
    handovers: [],
  },
  {
    id: 2,
    sku: 'A-102',
    type: 'شقة سكنية',
    project: 'مشروع النخيل السكني',
    area: '95 م²',
    price: 950000,
    priceStr: '950,000 ر.س',
    status: 'Hold',
    desc: 'شقة نموذجية مريحة بمساحة عملية وتخطيط ذكي للوحدات المفتوحة مع تهوية ممتازة وإضاءة طبيعية واسعة.',
    media: ['https://picsum.photos/seed/3/400/300'],
    docs: ['مخطط_طابق_الملحق.pdf'],
    events: [
      { id: 'ev_3', type: 'حجز مؤقت', at: '2026-05-12', note: 'وضع الوحدة بحالة الحجز المؤقت بطلب من موظف المبيعات' }
    ],
    handovers: [],
    contractId: 'ct_abaad_8891'
  },
  {
    id: 3,
    sku: 'B-201',
    type: 'فيلا مستقلة',
    project: 'واحة الخليج',
    area: '320 م²',
    price: 4500000,
    priceStr: '4,500,000 ر.س',
    status: 'Sold',
    desc: 'فيلا فاخرة بتصميم مودرن تضم 5 غرف نوم ماستر، مسبح خارجي دافئ، حديقة منسقة ومواقف تتسع لسيارتين ذكيتين.',
    media: ['https://picsum.photos/seed/4/400/300', 'https://picsum.photos/seed/5/400/300'],
    docs: ['عقد_البيع_النهائي.pdf', 'رسم_المساقط_الأفقي.pdf'],
    events: [
      { id: 'ev_4', type: 'صب القواعد الهيكلية للوحدة', at: '2025-10-01', note: 'اكتمال صب القواعد الخرسانية واختبار الضغط' },
      { id: 'ev_5', type: 'توقيع عقد البيع النهائي', at: '2026-03-15', note: 'تم توقيع العقد النهائي مع المشتري وتحويل الدفعة للمحاسبة' }
    ],
    handovers: [],
    contractId: 'ct_abaad_7721',
    financialSettlementId: 'fs_abaad_9921'
  }
];

interface PropertyListProps {
  onSelectProperty: (id: string) => void;
  hasPermission: (action: string) => boolean;
  addTelemetryEvent: (type: string, payload?: any) => void;
  lang: 'AR' | 'EN';
  isArabic: boolean;
}

export default function PropertyList({
  onSelectProperty,
  hasPermission,
  addTelemetryEvent,
  lang,
  isArabic
}: PropertyListProps) {
  const [properties, setProperties] = useState<PropertyUnit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [newSku, setNewSku] = useState('');
  const [newType, setNewType] = useState('شقة سكنية');
  const [newProject, setNewProject] = useState('مشروع النخيل السكني');
  const [newPrice, setNewPrice] = useState(1000000);
  const [newArea, setNewArea] = useState('120 م²');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([]);

  useEffect(() => {
    async function loadProperties() {
      try {
        setIsLoading(true);
        setFetchError(null);
        const result = await getPropertiesAction();
        const data = result && 'data' in result ? result.data : (Array.isArray(result) ? result : []);
        if (data && data.length > 0) {
          setProperties(data);
          addTelemetryEvent('api.properties_loaded', { count: data.length });
        } else {
          setUsingFallback(true);
          setProperties(initialProperties);
          addTelemetryEvent('api.properties_loaded_fallback', { count: initialProperties.length });
        }
      } catch (err: any) {
        setUsingFallback(true);
        setFetchError(err.message);
        addTelemetryEvent('api.error', { error: err.message });
        setProperties(initialProperties);
      } finally {
        setIsLoading(false);
      }
    }
    loadProperties();
  }, []);

  const logTelemetry = (_type: string, _payload?: any) => {
    // Telemetry removed — production cleanup
  };

  const filteredProperties = properties.filter(u => {
    const matchSearch = !searchTerm || (u.sku + ' ' + u.type + ' ' + u.project).toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !statusFilter || u.status === statusFilter;
    const matchProject = !projectFilter || u.project === projectFilter;
    let matchDates = true;
    if (filterFromDate || filterToDate) {
      matchDates = true;
    }
    return matchSearch && matchStatus && matchProject && matchDates;
  });

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('CREATE_UNIT')) {
      toast.error('عذراً! دورك الحالي لا يملك الصلاحية لإضافة وحدات جديدة.');
      return;
    }

    try {
      const projectsResult2 = await getDetailedProjectsAction();
      const projectsList2 = projectsResult2 && 'data' in projectsResult2 ? projectsResult2.data : (Array.isArray(projectsResult2) ? projectsResult2 : []);
      const firstProject = projectsList2?.[0];
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
        description: 'وحدة سكنية مضافة حديثاً إلى مستودع العقارات.'
      });

      if (!res.success || !res.data) throw new Error(res.error || 'حدث خطأ في قاعدة البيانات');

      setProperties(prev => [...prev, res.data]);
      logTelemetry('unit.created', { unitId: res.data.id, sku: newSku, price: newPrice });
    } catch (err: any) {
      toast.error('خطأ في إنشاء الوحدة: ' + err.message);
    }

    setNewSku('');
    setNewPrice(1000000);
    setActiveModal(null);
  };

  const kpisContent = (
    <>
      <KpiCard label={isArabic ? 'إجمالي الوحدات' : 'Total Units'} value={properties.length} icon={Home} color="default" />
      <KpiCard label={isArabic ? 'الوحدات المتاحة' : 'Available'} value={properties.filter(p => p.status === 'Available').length} icon={CheckCircle2} color="success" />
      <KpiCard label={isArabic ? 'الوحدات المحجوزة' : 'On Hold'} value={properties.filter(p => p.status === 'Hold').length} icon={Clock} color="warning" />
      <KpiCard label={isArabic ? 'الوحدات المباعة' : 'Sold'} value={properties.filter(p => p.status === 'Sold').length} icon={Landmark} color="danger" />
    </>
  );

  const actionsContent = (
    <div className="flex flex-wrap items-center gap-2">
      <input 
        placeholder={isArabic ? "بحث برقم الوحدة أو المشروع..." : "Search unit number or project..."}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] text-[var(--nc-foreground)] text-xs outline-none focus:border-[var(--nc-accent-border)]" 
      />
      <select 
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="w-auto min-w-[130px] px-3 py-2 rounded-lg bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] text-[var(--nc-foreground)] text-xs outline-none focus:border-[var(--nc-accent-border)]"
      >
        <option value="">{isArabic ? 'كل الحالات' : 'All statuses'}</option>
        <option value="Available">{isArabic ? 'متاحة' : 'Available'}</option>
        <option value="Hold">{isArabic ? 'محجوزة مؤقتاً' : 'On Hold'}</option>
        <option value="Sold">{isArabic ? 'مباعة' : 'Sold'}</option>
      </select>
      <select 
        value={projectFilter}
        onChange={(e) => setProjectFilter(e.target.value)}
        className="w-auto min-w-[130px] px-3 py-2 rounded-lg bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] text-[var(--nc-foreground)] text-xs outline-none focus:border-[var(--nc-accent-border)]"
      >
        <option value="">{isArabic ? 'كل المشاريع' : 'All projects'}</option>
        <option value="مشروع النخيل السكني">مشروع النخيل السكني</option>
        <option value="واحة الخليج">واحة الخليج</option>
      </select>
      <Button 
        onClick={() => {
          if (!hasPermission('CREATE_UNIT')) {
            toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لإنشاء وحدة.');
            return;
          }
          setActiveModal('new_unit');
        }}
        className="py-2 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0"
      >
        <Plus size={14} />
        {isArabic ? 'إضافة وحدة' : 'Add Unit'}
      </Button>
    </div>
  );

  const detailsContent = (
    <div className="space-y-6">
      <SmartCard elevation="default" className="overflow-hidden border border-[var(--nc-glass-border)] p-0">
        <div className="p-4 border-b border-[var(--nc-glass-border)] flex justify-between items-center">
          <h4 className="font-bold text-white">{isArabic ? 'قائمة الوحدات العقارية' : 'Property Units List'}</h4>
          <span className="text-xs text-[var(--nc-text-dim)] font-medium">{isArabic ? `${filteredProperties.length} وحدة` : `${filteredProperties.length} units`}</span>
        </div>

        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent animate-spin"></div>
            <span className="text-xs text-slate-500 font-medium">جاري تحميل العقارات من قاعدة البيانات...</span>
          </div>
        )}

        {fetchError && !isLoading && (
          <div className="py-8 text-center">
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl inline-block">
              {fetchError}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="block mx-auto mt-3 text-xs text-[#8EB1D1] hover:underline"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {!isLoading && !fetchError && filteredProperties.length === 0 && (
          <div className="py-8 text-center text-xs text-[#C4D8E5] font-medium">
            لا توجد وحدات عقارية مسجلة حالياً.
          </div>
        )}

        {!isLoading && !fetchError && filteredProperties.length > 0 && (
          <div className="overflow-x-auto md:max-h-[calc(100vh-360px)] md:overflow-y-auto custom-scrollbar">
            <table className="nc-table">
              <thead>
                <tr>
                  <th>رقم الوحدة</th>
                  <th>المشروع</th>
                  <th>المساحة</th>
                  <th>السعر المطلوب</th>
                  <th>الحالة</th>
                  <th className="text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.map(u => (
                  <tr 
                    key={u.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`فتح تفاصيل العقار: ${u.sku}`}
                    className="hover:bg-[var(--nc-accent-soft)] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--nc-accent)] rounded"
                    onClick={() => {
                      onSelectProperty(String(u.id));
                      logTelemetry('unit.opened', { unitId: u.id, sku: u.sku });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectProperty(String(u.id));
                        logTelemetry('unit.opened', { unitId: u.id, sku: u.sku });
                      }
                    }}
                  >
                    <td className="py-3 px-4 font-bold text-white text-xs">{u.sku} — {u.type}</td>
                    <td className="py-3 px-4 text-xs text-[var(--nc-text-dim)]">{u.project}</td>
                    <td className="py-3 px-4 text-xs text-[var(--nc-text-dim)]">{u.area}</td>
                    <td className="py-3 px-4 text-xs font-bold text-[var(--nc-accent-text)]">{u.price.toLocaleString()} ر.س</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        u.status === 'Available' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        u.status === 'Hold' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {u.status === 'Available' ? 'متاحة' : u.status === 'Hold' ? 'محجوزة مؤقتاً' : 'مباعة'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Eye size={12} className="inline text-[var(--nc-text-dim)]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SmartCard>
    </div>
  );

  return (
    <div className="nc-stack p-6 text-[var(--ds-text-primary)]" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-xs text-[#94A3B8] font-bold tracking-wider uppercase">
            {isArabic ? 'العمليات' : 'Operations'}
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white mt-1">
            {isArabic ? 'سجل العقارات والوحدات' : 'Properties Registry'}
            {usingFallback && (
              <span className="ml-2 align-middle inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-bold">
                {isArabic ? 'بيانات تجريبية' : 'Demo data'}
              </span>
            )}
          </h1>
        </div>
      </div>

      <LayoutContainer
        kpis={kpisContent}
        actions={actionsContent}
        details={detailsContent}
      >
        {activeModal === 'new_unit' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
            <form 
              onSubmit={handleCreateUnit}
              className="relative bg-[#1C2B48] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
            >
              <h3 className="text-base font-extrabold text-[#8EB1D1] border-b border-[#A7C7E7]/20 pb-2 flex items-center gap-2">
                <Plus size={18} />
            {isArabic ? 'إضافة وحدة عقارية جديدة' : 'Add New Property Unit'}
              </h3>

              <div className="space-y-1">
                <label className="text-[#C4D8E5] font-medium block">رقم الوحدة (SKU / Unit No):</label>
                <input 
                  type="text"
                  required
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  placeholder="مثال: A-103"
                  className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#C4D8E5] font-medium block">نوع العقار:</label>
                <select 
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
                >
                  <option value="شقة سكنية">شقة سكنية</option>
                  <option value="فيلا مستقلة">فيلا مستقلة</option>
                  <option value="فيلا علوية">فيلا علوية</option>
                  <option value="مكتب تجاري">مكتب تجاري</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[#C4D8E5] font-medium block">المشروع السكني:</label>
                <select 
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
                >
                  <option value="مشروع النخيل السكني">مشروع النخيل السكني</option>
                  <option value="واحة الخليج">واحة الخليج</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[#C4D8E5] font-medium block">المساحة الإجمالية:</label>
                <input 
                  type="text"
                  required
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  placeholder="مثال: 120 م²"
                  className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#C4D8E5] font-medium block">السعر المطلوب (ر.س):</label>
                <input 
                  type="number"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-white font-bold rounded-xl transition-all"
                >
                  حفظ الوحدة بالـ Inventory
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 bg-[#1C2B48] hover:bg-slate-700 text-[#C4D8E5] font-medium rounded-xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}
      </LayoutContainer>
    </div>
  );
}
