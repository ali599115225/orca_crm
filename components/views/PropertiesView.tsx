'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { 
  Home, Plus, Search, Calendar, Landmark, MapPin, Eye, 
  FileText, CheckCircle2, ChevronRight, Activity, DollarSign, 
  FileCheck, Award, Bot, Clock, AlertTriangle, 
  CloudUpload, ArrowRight, UserCheck, Trash2, Key, Users
} from 'lucide-react';
import { Button, Card, Badge } from '../ui/orca-components';
import { DateField } from '../ui/DateField';
import { useAuth } from '@/app/context/AuthContext';
import LayoutContainer from '../ui/LayoutContainer';
import PageHeader from '../ui/PageHeader';
import { 
  getPropertiesAction, 
  createUnitActionDirect, 
  bookUnitActionDirect, 
  completeHandoverActionDirect,
  updateUnitStatusAction
} from '@/app/actions/properties';
import { getDetailedProjectsAction } from '@/app/actions/projects';

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface UnitEvent {
  id: string;
  type: string;
  at: string; // YYYY-MM-DD
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

// ─── Initial Mock Data ──────────────────────────────────────────────────────
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

export default function PropertiesView() {
  const { hasPermission } = useAuth();
  const [properties, setProperties] = useState<PropertyUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<number | string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  // Tabs Controller
  const [activeTab, setActiveTab] = useState('events');
  const [isPending, startTransition] = useTransition();

  // Price Simulator state
  const [simulatedPrice, setSimulatedPrice] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [priceSimResult, setPriceSimResult] = useState<string>('');

  // Modals state
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Date values for forms
  const [bookingDate, setBookingDate] = useState(''); // YYYY-MM-DD
  const [bookingBirthDate, setBookingBirthDate] = useState(''); // YYYY-MM-DD
  const [bookingLeadId, setBookingLeadId] = useState('');
  const [bookingOfferPrice, setBookingOfferPrice] = useState(0);

  const [handoverDate, setHandoverDate] = useState(''); // YYYY-MM-DD
  const [handoverChecklist, setHandoverChecklist] = useState('1. فحص تمديدات الكهرباء والإنارة\n2. فحص السباكة ومنافذ الصرف وضغط المياه\n3. نظافة الأبواب والمقابض الخشبية والألمنيوم');
  const [handoverPhoto, setHandoverPhoto] = useState('https://picsum.photos/seed/handover/400/300');

  // New Unit Form state
  const [newSku, setNewSku] = useState('');
  const [newType, setNewType] = useState('شقة سكنية');
  const [newProject, setNewProject] = useState('مشروع النخيل السكني');
  const [newPrice, setNewPrice] = useState(1000000);
  const [newArea, setNewArea] = useState('120 م²');

  // Date range filter values (demo)
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  // API loading states
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch properties from API on mount
  useEffect(() => {
    async function loadProperties() {
      try {
        setIsLoading(true);
        setFetchError(null);
        const data = await getPropertiesAction();
        if (data && data.length > 0) {
          setProperties(data);
          addTelemetryEvent('api.properties_loaded', { count: data.length });
        } else {
          setProperties(initialProperties);
          addTelemetryEvent('api.properties_loaded_fallback', { count: initialProperties.length });
        }
      } catch (err: any) {
        setFetchError(err.message);
        addTelemetryEvent('api.error', { error: err.message });
        setProperties(initialProperties);
      } finally {
        setIsLoading(false);
      }
    }
    loadProperties();
  }, []);

  // Telemetry event logging console
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([
    {
      id: 'evt_init',
      type: 'units.initialized',
      timestamp: new Date().toISOString(),
      actorId: 'system_core',
      payload: { message: 'تهيئة نظام إدارة سجل الوحدات والعقارات بنجاح' }
    }
  ]);

  // Permission check — delegated to AuthContext
  const isAllowed = (action: string) => hasPermission(action);

  const addTelemetryEvent = (type: string, payload: any) => {
    const newEvt = {
      id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      timestamp: new Date().toISOString(),
      actorId: 'usr_active',
      payload
    };
    setTelemetryLogs(prev => [newEvt, ...prev]);
  };

  const selectedUnit = properties.find(u => u.id === selectedUnitId);

  // Filter properties
  const filteredProperties = properties.filter(u => {
    const matchSearch = !searchTerm || (u.sku + ' ' + u.type + ' ' + u.project).toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !statusFilter || u.status === statusFilter;
    const matchProject = !projectFilter || u.project === projectFilter;
    
    // Date filter validation checking if unit creation falls in range
    let matchDates = true;
    if (filterFromDate || filterToDate) {
      // Just simulate filter check for dates against today's date for demo properties
      matchDates = true;
    }
    
    return matchSearch && matchStatus && matchProject && matchDates;
  });

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowed('CREATE_UNIT')) {
      alert('عذراً! دورك الحالي لا يملك الصلاحية لإضافة وحدات جديدة.');
      return;
    }

    try {
      const projects = await getDetailedProjectsAction();
      const firstProject = projects?.[0];
      if (!firstProject) {
        alert('الرجاء إنشاء مشروع عقاري أولاً قبل إضافة وحدات.');
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
      addTelemetryEvent('unit.created', { unitId: res.data.id, sku: newSku, price: newPrice });
    } catch (err: any) {
      alert('خطأ في إنشاء الوحدة: ' + err.message);
    }

    setNewSku('');
    setNewPrice(1000000);
    setActiveModal(null);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    if (!isAllowed('BOOK_UNIT')) {
      alert('عذراً! دورك الحالي لا يمتلك الصلاحية لإنشاء حجز.');
      return;
    }

    // 1. Validate date
    if (!bookingDate) {
      alert('يرجى تحديد تاريخ الحجز بصيغة صحيحة.');
      return;
    }

    try {
      const res = await bookUnitActionDirect({
        unitId: String(selectedUnit.id),
        clientId: bookingLeadId,
        offerPrice: bookingOfferPrice,
        bookingDate: bookingDate,
      });

      if (!res.success || !res.contractId) {
        throw new Error(res.error || 'حدث خطأ في قاعدة البيانات');
      }

      const ctId = res.contractId;
      const dateObj = new Date(bookingDate);
      const visibleDateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

      // 2. Update unit locally
      setProperties(prev => prev.map(u => u.id === selectedUnit.id ? { 
        ...u, 
        status: 'Sold', 
        contractId: ctId,
        events: [
          ...u.events,
          { id: `ev_bk_${Date.now()}`, type: 'إنشاء حجز وعقد', at: bookingDate, note: `حجز للعميل المعرف بـ ${bookingLeadId} بقيمة تعاقدية ${bookingOfferPrice.toLocaleString()} ر.س` }
        ]
      } : u));

      addTelemetryEvent('booking.created', {
        bookingId: `bk_${Date.now()}`,
        unitId: selectedUnit.id,
        leadId: bookingLeadId,
        offerPrice: bookingOfferPrice,
        bookingDateNative: bookingDate,
        bookingDateVisible: visibleDateStr,
        bookingBirthDate: bookingBirthDate,
        contractId: ctId
      });

      alert(`تم إنشاء الحجز بنجاح! رقم مرجع العقد المصدر للمبيعات: ${ctId}`);
    } catch (err: any) {
      alert('خطأ في إتمام الحجز: ' + err.message);
    }

    // reset
    setBookingLeadId('');
    setBookingOfferPrice(0);
    setBookingDate('');
    setBookingBirthDate('');
    setActiveModal(null);
  };

  const handleCompleteHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    if (!isAllowed('START_HANDOVER')) {
      alert('عذراً! دورك الحالي لا يمتلك الصلاحية لبدء التسليم.');
      return;
    }

    if (!handoverDate) {
      alert('يرجى تحديد تاريخ التسليم المعتمد.');
      return;
    }

    try {
      const res = await completeHandoverActionDirect({
        unitId: String(selectedUnit.id),
        handoverDate: handoverDate,
        checklist: handoverChecklist,
        photoUrl: handoverPhoto
      });

      if (!res.success || !res.handoverId) {
        throw new Error(res.error || 'حدث خطأ في قاعدة البيانات');
      }

      const hoId = res.handoverId;
      const fsId = `fs_abaad_${Date.now().toString().slice(-4)}`;
      const dateObj = new Date(handoverDate);
      const visibleDateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

      // Add handover record
      setProperties(prev => prev.map(u => u.id === selectedUnit.id ? {
        ...u,
        financialSettlementId: fsId,
        handovers: [
          ...u.handovers,
          {
            id: hoId,
            scheduledAt: visibleDateStr,
            status: 'Completed',
            checklist: handoverChecklist,
            media: [handoverPhoto],
            completedAt: new Date().toISOString()
          }
        ],
        events: [
          ...u.events,
          { id: `ev_ho_${Date.now()}`, type: 'إتمام معاينة والتسليم النهائي', at: handoverDate, note: 'تم تسليم الوحدة وإمضاء محضر الاستلام الخالي من الملاحظات' }
        ]
      } : u));

      addTelemetryEvent('handover.completed', {
        handoverId: hoId,
        unitId: selectedUnit.id,
        scheduledNative: handoverDate,
        scheduledVisible: visibleDateStr,
        checklistCount: handoverChecklist.split('\n').length
      });

      // Cross-service simulated settlement call
      setTimeout(() => {
        addTelemetryEvent('accounting.settlement', {
          financialSettlementId: fsId,
          grossAmount: selectedUnit.price,
          taxes: Math.round(selectedUnit.price * 0.05),
          commissions: Math.round(selectedUnit.price * 0.03),
          netToOwner: Math.round(selectedUnit.price * 0.92)
        });
        alert(`تمت تسوية الإيرادات المالية مع خدمة الحسابات. رقم التسوية المرجعي: ${fsId}`);
      }, 1000);
    } catch (err: any) {
      alert('خطأ في إتمام التسليم: ' + err.message);
    }

    setHandoverDate('');
    setActiveModal(null);
  };

  const handlePriceSimulation = () => {
    if (!selectedUnit) return;
    const discounted = Math.round(simulatedPrice * (1 - discountPercent / 100));
    const commission = Math.round(discounted * 0.03);
    const taxes = Math.round(discounted * 0.05);
    const netToOwner = discounted - commission - taxes;

    setPriceSimResult(
      `السعر النهائي: ${discounted.toLocaleString()} ر.س | عمولة المبيعات: ${commission.toLocaleString()} ر.س | الضريبة العقارية: ${taxes.toLocaleString()} ر.س | صافي المالك: ${netToOwner.toLocaleString()} ر.س`
    );
  };

  const handleSavePriceDraft = () => {
    if (!selectedUnit) return;
    setProperties(prev => prev.map(u => u.id === selectedUnit.id ? {
      ...u,
      priceScenarioDraft: {
        simulatedPrice,
        discountPercent,
        result: priceSimResult,
        createdAt: new Date().toISOString()
      }
    } : u));
    
    addTelemetryEvent('price_scenario.saved', {
      unitId: selectedUnit.id,
      simulatedPrice,
      discountPercent
    });

    alert('تم حفظ سيناريو تسعير الوحدة كمسودة تسعير مؤقتة بنجاح.');
  };

  const showFinancialSummary = () => {
    if (!selectedUnit) return;
    if (!isAllowed('VIEW_FINANCE')) {
      alert('عذراً! دورك الحالي لا يمتلك صلاحية استعراض البيانات المالية التفصيلية.');
      return;
    }

    // Simulate calling GET /accounting/contracts/:contractId/summary
    const summary = {
      financialSettlementId: selectedUnit.financialSettlementId || 'N/A',
      grossAmount: selectedUnit.price,
      collected: selectedUnit.status === 'Sold' ? selectedUnit.price : 0,
      outstanding: selectedUnit.status === 'Sold' ? 0 : selectedUnit.price,
      commissionTaxTotal: Math.round(selectedUnit.price * 0.08)
    };

    alert(`[ACCOUNTING PROXY SUCCESS]
    رقم التسوية: ${summary.financialSettlementId}
    القيمة الإجمالية للعقد: ${summary.grossAmount.toLocaleString()} ر.س
    المبالغ المحصلة: ${summary.collected.toLocaleString()} ر.س
    الأقساط المتبقية: ${summary.outstanding.toLocaleString()} ر.س
    إجمالي الضرائب والعمولة (8%): ${summary.commissionTaxTotal.toLocaleString()} ر.س`);
  };


  // KPIs
  const kpisContent = (
    <>
      <Card className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">إجمالي الوحدات</p>
            <h3 className="text-2xl font-black text-white">{properties.length}</h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[var(--nc-accent-soft)] flex items-center justify-center text-[var(--nc-text-secondary)]">
            <Home size={18} />
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">الوحدات المتاحة</p>
            <h3 className="text-2xl font-black text-emerald-500">{properties.filter(p => p.status === 'Available').length}</h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">الوحدات المحجوزة</p>
            <h3 className="text-2xl font-black text-amber-500">{properties.filter(p => p.status === 'Hold').length}</h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Clock size={18} />
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">الوحدات المباعة</p>
            <h3 className="text-2xl font-black text-rose-400">{properties.filter(p => p.status === 'Sold').length}</h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
            <Landmark size={18} />
          </div>
        </div>
      </Card>
    </>
  );

  // Actions
  const actionsContent = (
    <Card className="p-5 space-y-4 h-full flex flex-col justify-between">
      <div className="border-b border-[var(--nc-glass-border)] pb-3">
        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
          <Search size={16} className="text-[var(--nc-text-secondary)]" />
          البحث والتصفية
        </h4>
        <p className="text-xs text-[var(--nc-text-dim)] font-medium mt-1">ابحث عن الوحدات السكنية عبر الفلاتر المتقدمة</p>
      </div>

      <div className="space-y-3 flex-grow pt-2">
        <div className="flex gap-2">
          <input 
            placeholder="بحث برقم الوحدة أو المشروع..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[var(--nc-surface-solid)] border border-white/10 text-white text-xs outline-none focus:border-[var(--nc-accent-border)]" 
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-1/2 px-3 py-2 rounded-xl bg-[var(--nc-surface-solid)] border border-white/10 text-white text-xs outline-none focus:border-[var(--nc-accent-border)]"
          >
            <option value="">كل الحالات</option>
            <option value="Available">متاحة</option>
            <option value="Hold">محجوزة مؤقتاً</option>
            <option value="Sold">مباعة</option>
          </select>
          <select 
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-1/2 px-3 py-2 rounded-xl bg-[var(--nc-surface-solid)] border border-white/10 text-white text-xs outline-none focus:border-[var(--nc-accent-border)]"
          >
            <option value="">كل المشاريع</option>
            <option value="مشروع النخيل السكني">مشروع النخيل السكني</option>
            <option value="واحة الخليج">واحة الخليج</option>
          </select>
        </div>

        <div className="border-t border-white/5 my-3 pt-3">
          <Button 
            onClick={() => {
              if (!isAllowed('CREATE_UNIT')) {
                alert('عذراً! دورك الحالي لا يمتلك الصلاحية لإنشاء وحدة.');
                return;
              }
              setActiveModal('new_unit');
            }}
            className="w-full py-2 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            إضافة وحدة عقارية جديدة
          </Button>
        </div>
      </div>
    </Card>
  );

  // Insights (AI Predictor or Details)
  const insightsContent = (
    <Card className="p-5 space-y-4 h-full flex flex-col justify-between">
      <div className="border-b border-[var(--nc-glass-border)] pb-3">
        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bot size={16} className="text-cyan-400" />
          تفاصيل وإجراءات الوحدة
        </h4>
        <p className="text-xs text-[var(--nc-text-dim)] font-medium mt-1">
          {selectedUnit ? 'بيانات الوحدة المختارة للإجراء السريع' : 'يرجى تحديد وحدة لعرض الإجراءات السريعة'}
        </p>
      </div>

      <div className="space-y-4 flex-grow pt-2 text-xs">
        {selectedUnit ? (
          <div className="space-y-3">
            <div className="bg-[var(--nc-surface)] p-3 rounded-xl border border-white/5 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm">{selectedUnit.sku} — {selectedUnit.type}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  selectedUnit.status === 'Available' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  selectedUnit.status === 'Hold' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {selectedUnit.status === 'Available' ? 'متاحة' : selectedUnit.status === 'Hold' ? 'محجوزة مؤقتاً' : 'مباعة'}
                </span>
              </div>
              <p className="text-xs text-[var(--nc-text-dim)]">المشروع: {selectedUnit.project} | المساحة: {selectedUnit.area}</p>
              <p className="text-xs font-bold text-[var(--nc-accent-text)] mt-1">السعر المطلوب: {selectedUnit.price.toLocaleString()} ر.س</p>
            </div>
            
            <div className="flex flex-col gap-2">
              {selectedUnit.status === 'Available' && (
                <button 
                  onClick={() => {
                    if (!isAllowed('BOOK_UNIT')) {
                      alert('عذراً! دورك الحالي لا يمتلك الصلاحية لإنشاء حجز.');
                      return;
                    }
                    setBookingOfferPrice(selectedUnit.price);
                    setActiveModal('book_unit');
                  }}
                  className="w-full py-2 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white text-xs font-bold rounded-xl transition-all"
                >
                  إنشاء حجز فوري
                </button>
              )}
              {selectedUnit.status === 'Sold' && !selectedUnit.financialSettlementId && (
                <button 
                  onClick={() => {
                    if (!isAllowed('START_HANDOVER')) {
                      alert('عذراً! دورك الحالي لا يمتلك الصلاحية لبدء تسليم الوحدة.');
                      return;
                    }
                    setActiveModal('handover_assistant');
                  }}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all"
                >
                  بدء تسليم الوحدة (Handover)
                </button>
              )}
              {selectedUnit.status === 'Sold' && selectedUnit.financialSettlementId && (
                <button 
                  onClick={showFinancialSummary}
                  className="w-full py-2 bg-[var(--nc-surface-solid)] border border-white/10 hover:border-white/20 text-white text-xs font-bold rounded-xl transition-all"
                >
                  عرض تفاصيل الإيرادات المحدثة
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-50 pt-4">
            <Home size={32} className="text-[var(--nc-text-dim)]" />
            <p className="text-[var(--nc-text-dim)]">اختر وحدة من القائمة أدناه<br/>لعرض الإجراءات المتاحة لها</p>
          </div>
        )}
      </div>
    </Card>
  );

  // Details
  const detailsContent = (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-white/5">
        <div className="p-4 border-b border-[var(--nc-glass-border)] flex justify-between items-center">
          <h4 className="font-bold text-white">قائمة الوحدات العقارية</h4>
          <span className="text-xs text-[var(--nc-text-dim)] font-medium">{filteredProperties.length} وحدة متطابقة</span>
        </div>
        
        {/* Loading / Error / Empty States */}
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
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[var(--nc-surface-solid)] border-y border-white/5 text-[var(--nc-text-dim)] text-[11px] font-bold">
                  <th className="py-3 px-4">رقم الوحدة</th>
                  <th className="py-3 px-4">المشروع</th>
                  <th className="py-3 px-4">المساحة</th>
                  <th className="py-3 px-4">السعر المطلوب</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.map(u => (
                  <tr 
                    key={u.id}
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${selectedUnitId === u.id ? 'bg-[var(--nc-surface-solid)] border-l-4 border-l-[var(--nc-accent-border)]' : 'border-l-4 border-l-transparent'}`}
                    onClick={() => {
                      setSelectedUnitId(u.id);
                      setSimulatedPrice(u.price);
                      setPriceSimResult('');
                      addTelemetryEvent('unit.opened', { unitId: u.id, sku: u.sku });
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
                      <button
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--nc-surface)] border border-white/5 hover:bg-[var(--nc-accent-soft)] hover:text-[var(--nc-accent-text)] rounded-lg text-[10px] font-bold transition-all"
                      >
                        <Eye size={12} />
                        تحديد
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Telemetry log console */}
      <div className="bg-[var(--nc-surface-strong)] border border-[var(--nc-glass-border)] rounded-3xl p-5 shadow-2xl flex flex-col space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
          <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-2">
            <Activity size={15} />
            سجل الأحداث العقارية الفورية (Telemetry Logs)
          </h4>
          <button 
            type="button"
            onClick={() => setTelemetryLogs([])}
            className="text-[10px] text-[var(--nc-text-dim)] font-medium hover:text-white border border-white/5 px-2 py-0.5 rounded"
          >
            مسح السجل
          </button>
        </div>
        
        <div className="max-h-40 overflow-y-auto mt-2 space-y-2 pr-1 custom-scrollbar text-[10px] font-mono leading-relaxed">
          {telemetryLogs.map((log) => (
            <div key={log.id} className="p-2.5 bg-[var(--nc-surface-strong)] rounded-xl border border-white/5 space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-[var(--nc-text-secondary)] font-bold">[{log.type.toUpperCase()}]</span>
                <span className="text-[var(--nc-text-dim)] font-medium">{log.timestamp}</span>
              </div>
              <pre className="text-[9px] text-[var(--nc-text-dim)] font-medium bg-[var(--nc-surface-solid)] p-1.5 rounded overflow-x-auto">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="properties-page p-6 text-[var(--ds-text-primary)]" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-xs text-[#94A3B8] font-bold tracking-wider uppercase">
            العمليات
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white mt-1">
            سجل العقارات والوحدات
          </h1>
        </div>
      </div>

      <LayoutContainer
        kpis={kpisContent}
        actions={actionsContent}
        insights={insightsContent}
        details={detailsContent}
      >

            {/* ── Modal 1: New Unit Form ── */}
      {activeModal === 'new_unit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <form 
            onSubmit={handleCreateUnit}
            className="relative bg-[#1C2B48] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[#8EB1D1] border-b border-[#A7C7E7]/20 pb-2 flex items-center gap-2">
              <Plus size={18} />
              إضافة وحدة عقارية جديدة
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

      {/* ── Modal 2: Create Booking Form (DateField Integrated) ── */}
      {activeModal === 'book_unit' && selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <form 
            onSubmit={handleCreateBooking}
            className="relative bg-[#1C2B48] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[#8EB1D1] border-b border-[#A7C7E7]/20 pb-2 flex items-center gap-2">
              <FileCheck size={18} />
              حجز وحدة عقارية وإصدار عقد
            </h3>
            
            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">الوحدة المحددة:</label>
              <p className="font-bold text-white">{selectedUnit.sku} — {selectedUnit.type} ({selectedUnit.project})</p>
            </div>

            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">اسم المشتري أو معرف العميل (Lead ID):</label>
              <input 
                type="text"
                required
                value={bookingLeadId}
                onChange={(e) => setBookingLeadId(e.target.value)}
                placeholder="الاسم الرباعي للمشتري..."
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">القيمة التعاقدية للبيع (ر.س):</label>
              <input 
                type="number"
                required
                value={bookingOfferPrice}
                onChange={(e) => setBookingOfferPrice(Number(e.target.value))}
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>

            {/* DateField Component Integration */}
            <div className="space-y-1">
              <DateField
                value={bookingDate}
                onChange={(val) => {
                  setBookingDate(val);
                }}
                label="تاريخ الحجز والتعاقد (DateField)"
              />
            </div>

            {/* حقل تاريخ الميلاد */}
            <div className="space-y-1">
              <DateField
                value={bookingBirthDate}
                onChange={(val) => {
                  setBookingBirthDate(val);
                }}
                label="تاريخ ميلاد العميل (DateField)"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-white font-bold rounded-xl transition-all"
              >
                تأكيد وإمضاء العقد
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

      {/* ── Modal 3: Handover Assistant Form (DateField Integrated) ── */}
      {activeModal === 'handover_assistant' && selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <form 
            onSubmit={handleCompleteHandover}
            className="relative bg-[#1C2B48] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[#8EB1D1] border-b border-[#A7C7E7]/20 pb-2 flex items-center gap-2">
              <Key size={18} />
              معالج التسليم الذكي (Live Handover Assistant)
            </h3>
            
            <p className="text-[#C4D8E5] font-medium">يقوم هذا المعالج بتسجيل تاريخ التسليم المعتمد، ومراجعة قوائم العيوب وتصوير المعاينة الميدانية لإصدار مخالصة الاستلام.</p>

            {/* DateField Component Integration */}
            <div className="space-y-1">
              <DateField
                value={handoverDate}
                onChange={(val) => {
                  setHandoverDate(val);
                }}
                label="تاريخ الاستلام النهائي المعتمد (DateField)"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">قائمة فحص الملاحظات والعيوب (Checklist):</label>
              <textarea 
                rows={3}
                required
                value={handoverChecklist}
                onChange={(e) => setHandoverChecklist(e.target.value)}
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1] font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#C4D8E5] font-medium block">رابط صورة المعاينة الميدانية الموثقة:</label>
              <input 
                type="text"
                required
                value={handoverPhoto}
                onChange={(e) => setHandoverPhoto(e.target.value)}
                className="w-full bg-[#1C2B48] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#8EB1D1]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-white font-bold rounded-xl transition-all"
              >
                توقيع مخالصة الاستلام وإصدار تسوية مالية
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
