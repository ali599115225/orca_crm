'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { 
  Home, Plus, Search, Calendar, Landmark, MapPin, Eye, 
  FileText, CheckCircle2, ChevronRight, Activity, DollarSign, 
  FileCheck, Award, Bot, Clock, AlertTriangle, 
  CloudUpload, ArrowRight, UserCheck, Trash2, Key, Users, Settings
} from 'lucide-react';
import { Button, Card, Badge } from '../ui/orca-components';
import { DateField, DateRangeField } from '../ui/DateField';
import { useAuth } from '@/app/context/AuthContext';
import LayoutContainer from '../ui/LayoutContainer';
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

  // ─── Bento Grid Unification Layout Elements ───
  const totalUnits = properties.length;
  const availableUnits = properties.filter(u => u.status === 'Available').length;
  const holdUnits = properties.filter(u => u.status === 'Hold').length;
  const soldUnits = properties.filter(u => u.status === 'Sold').length;
  const occupancyRate = totalUnits > 0 ? Math.round((soldUnits / totalUnits) * 100) : 0;

  const kpisContent = (
    <>
      <Card className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">إجمالي الوحدات</p>
            <h3 className="text-2xl font-black text-white">{totalUnits}</h3>
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
            <h3 className="text-2xl font-black text-emerald-500">{availableUnits}</h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">محجوزة مؤقتاً</p>
            <h3 className="text-2xl font-black text-amber-500">{holdUnits}</h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Clock size={18} />
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[var(--nc-text-dim)] font-medium text-xs font-bold mb-1">نسبة الإشغال / المبيعات</p>
            <h3 className="text-2xl font-black text-cyan-400">{occupancyRate}%</h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Activity size={18} />
          </div>
        </div>
      </Card>
    </>
  );

  const actionsContent = (
    <Card className="p-5 space-y-4 h-full flex flex-col justify-between">
      <div className="border-b border-[var(--nc-glass-border)] pb-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Settings size={16} className="text-[var(--nc-text-secondary)]" />
          إجراءات سريعة
        </h4>
        <p className="text-[10px] text-[var(--nc-text-dim)] font-medium mt-1">التحكم الفوري وجدولة الجولات العقارية</p>
      </div>

      <div className="space-y-3 flex-grow pt-2">
        <Button 
          icon={Plus}
          className="w-full justify-center py-2.5 text-xs font-bold"
          onClick={() => {
            if (!isAllowed('CREATE_UNIT')) {
              alert('عذراً! دورك الحالي لا يمتلك الصلاحية لإنشاء وحدة.');
              return;
            }
            setActiveModal('new_unit');
          }}
        >
          إضافة وحدة جديدة
        </Button>

        <div className="border-t border-white/5 my-3 pt-3 space-y-2">
          <button 
            type="button"
            onClick={async () => {
              if (!selectedUnitId) {
                alert('الرجاء تحديد وحدة عقارية أولاً من الجدول.');
                return;
              }
              if (!isAllowed('UPDATE_STATUS')) {
                alert('عذراً! دورك الحالي لا يمتلك الصلاحية لتعديل حالة الوحدات.');
                return;
              }
              try {
                const res = await updateUnitStatusAction(String(selectedUnitId), 'Hold');
                if (res.success && res.status) {
                  setProperties(prev => prev.map(u => u.id === selectedUnitId ? { ...u, status: res.status as PropertyUnit['status'] } : u));
                  addTelemetryEvent('unit.quick_hold', { unitId: selectedUnitId, sku: selectedUnit?.sku });
                  alert('تم وضع الوحدة بحالة الحجز المؤقت (Hold) بنجاح.');
                } else {
                  alert('فشل وضع الوحدة في حالة Hold بقاعدة البيانات: ' + res.error);
                }
              } catch (err: any) {
                alert('خطأ أثناء تحديث حالة الوحدة: ' + err.message);
              }
            }}
            className="w-full py-2 text-right px-3 text-xs bg-[var(--nc-surface-solid)] border border-white/5 hover:border-[var(--nc-accent-border)] rounded-xl hover:text-white transition-all flex items-center justify-between"
          >
            <span>وضع الوحدة بحالة Hold فوري</span>
            <ChevronRight size={14} className="opacity-50" />
          </button>

          <button 
            type="button"
            onClick={() => {
              if (!selectedUnitId) {
                alert('الرجاء تحديد وحدة عقارية أولاً.');
                return;
              }
              addTelemetryEvent('tour.quick_schedule', { unitId: selectedUnitId, sku: selectedUnit?.sku, date: '2026-06-15' });
              alert('تمت جدولة موعد جولة عقارية موجهة للعميل للوحدة العقارية.');
            }}
            className="w-full py-2 text-right px-3 text-xs bg-[var(--nc-surface-solid)] border border-white/5 hover:border-[var(--nc-accent-border)] rounded-xl hover:text-white transition-all flex items-center justify-between"
          >
            <span>جدولة جولة عقارية موجهة</span>
            <ChevronRight size={14} className="opacity-50" />
          </button>
        </div>
      </div>
    </Card>
  );

  const insightsContent = (
    <Card className="p-5 space-y-4 h-full flex flex-col justify-between">
      <div className="border-b border-[var(--nc-glass-border)] pb-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Bot size={16} className="text-cyan-400" />
          مساعد التنبؤ العقاري والتحليل المالي (AI Predictor)
        </h4>
        <p className="text-[10px] text-[var(--nc-text-dim)] font-medium mt-1">توقع فترات البيع ومحاكاة أسعار الوحدات وتوصيات المبيعات</p>
      </div>

      <div className="space-y-4 flex-grow pt-2">
        {selectedUnit ? (
          <div className="space-y-4">
            {/* Sales Forecast */}
            <div className="bg-[var(--nc-surface)] p-3.5 rounded-xl border border-white/5 space-y-2">
              <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Activity size={12} className="text-cyan-400" />
                تحليل المبيعات المتوقع للوحدة ({selectedUnit.sku})
              </h5>
              {selectedUnit.status === 'Sold' ? (
                <p className="text-xs text-[var(--nc-text-dim)] font-medium">الوحدة مباعة وموثقة بالفعل، لا يمكن تنبؤ فترة بقائها.</p>
              ) : (
                <div className="text-[11px] text-[var(--nc-text-dim)] font-medium space-y-1">
                  <p>الوقت المتوقع للبيع: <span className="font-bold text-[var(--nc-text-secondary)]">45 - 60 يومًا</span> (نسبة الثقة: <span className="font-bold text-emerald-400">78%</span>)</p>
                  <p className="text-[10px] text-slate-400">التوصية: إطلاق حملة ممولة مستهدفة في تويتر وسناب شات تستهدف الباحثين عن شقق بشمال الرياض.</p>
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="bg-[var(--nc-surface)] p-3.5 rounded-xl border border-white/5 space-y-2">
              <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Landmark size={12} className="text-[var(--nc-text-secondary)]" />
                الملخص المالي للعقد
              </h5>
              <div className="text-[11px] space-y-1">
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-[var(--nc-text-dim)] font-medium">الحالة المالية</span>
                  <span className="font-bold text-white">
                    {selectedUnit.status === 'Sold' ? 'مباعة بالكامل' : selectedUnit.status === 'Hold' ? 'محجوزة مؤقتاً' : 'متاحة للبيع'}
                  </span>
                </div>
                {selectedUnit.status === 'Sold' ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-[var(--nc-text-dim)] font-medium">مرجع التسوية</span>
                      <span className="font-mono text-cyan-400">{selectedUnit.financialSettlementId || 'قيد المعالجة'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={showFinancialSummary}
                      className="w-full py-1.5 bg-[var(--nc-surface-solid)] border border-[var(--nc-accent-border)] hover:border-[var(--nc-accent-border)]/40 text-[var(--nc-text-secondary)] text-[10px] font-bold rounded-lg transition-all"
                    >
                      تفاصيل تسوية الإيرادات ➔
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-[var(--nc-text-dim)] font-medium text-center">لا يوجد مرجع تسوية مالية بعد للوحدات المتاحة أو المحجوزة.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-[var(--nc-text-dim)] font-medium bg-[var(--nc-surface)] rounded-xl border border-dashed border-white/10">
            <Bot size={28} className="text-[var(--nc-text-secondary)]/40 mb-2" />
            <span>الرجاء اختيار وحدة عقارية من الجدول بالأسفل لتشغيل التنبؤات والتحليلات الذكية.</span>
          </div>
        )}
      </div>
    </Card>
  );

  const detailsContent = (
    <div className="space-y-6">
      {/* Date Range Filter Form */}
      <div className="p-4 bg-[var(--nc-surface)] border border-white/5 rounded-2xl space-y-3">
        <h4 className="text-xs font-bold text-[var(--nc-text-dim)] font-medium">تصفية الوحدات حسب تاريخ الإدراج (DateRangeField)</h4>
        <div className="max-w-md">
          <DateRangeField
            fromDate={filterFromDate}
            toDate={filterToDate}
            onChange={(from, to) => {
              setFilterFromDate(from);
              setFilterToDate(to);
              addTelemetryEvent('filter.dates_changed', { from, to });
            }}
            labelFrom="تاريخ الإدراج من"
            labelTo="تاريخ الإدراج إلى"
          />
        </div>
      </div>

      {/* Inventory Catalog Card */}
      <div className="nc-glass ds-p-xl ds-stack">
        <div className="nc-glass-header">
          <div>
            <h3 className="ds-h3">سجل الوحدات والعقارات (Inventory)</h3>
            <p className="ds-body-sm">إجمالي العقود والوحدات المتاحة والمحجوزة</p>
          </div>

          <div className="nc-row">
            <div className="relative">
              <Search className="absolute right-3 top-2 text-[var(--ds-text-muted)]" size={14} />
              <input
                type="text"
                placeholder="بحث برقم الوحدة أو المشروع..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="nc-glass !py-1.5 pr-8 pl-4 w-52"
                style={{ fontSize: '0.75rem', outline: 'none' }}
              />
            </div>

            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="nc-glass !py-1.5 px-3"
              style={{ fontSize: '0.75rem', outline: 'none' }}
            >
              <option value="">كل الحالات</option>
              <option value="Available">متاحة</option>
              <option value="Hold">محجوزة مؤقتاً</option>
              <option value="Sold">مباعة</option>
            </select>
          </div>
        </div>

        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent animate-spin"></div>
            <span className="text-xs text-[var(--nc-text-dim)] font-medium">جاري تحميل العقارات من قاعدة البيانات...</span>
          </div>
        )}

        {fetchError && !isLoading && (
          <div className="py-8 text-center">
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl inline-block">
              {fetchError}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="block mx-auto mt-3 text-xs text-[var(--nc-text-secondary)] hover:underline"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {!isLoading && !fetchError && filteredProperties.length === 0 && (
          <div className="py-8 text-center text-xs text-[var(--nc-text-dim)] font-medium">
            لا توجد وحدات عقارية مسجلة حالياً.
          </div>
        )}

        {!isLoading && !fetchError && (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-[var(--nc-glass-border)] text-[var(--nc-text-dim)] font-medium text-xs font-bold">
                  <th className="pb-3 px-4">رقم الوحدة</th>
                  <th className="pb-3 px-4">المشروع</th>
                  <th className="pb-3 px-4">المساحة</th>
                  <th className="pb-3 px-4">السعر المطلوب</th>
                  <th className="pb-3 px-4">الحالة</th>
                  <th className="pb-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.map(u => (
                  <tr 
                    key={u.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-white text-xs">{u.sku} — {u.type}</td>
                    <td className="py-3 px-4 text-xs text-[var(--nc-text-dim)] font-medium">{u.project}</td>
                    <td className="py-3 px-4 text-xs text-[var(--nc-text-dim)] font-medium">{u.area}</td>
                    <td className="py-3 px-4 text-xs font-bold text-white">{u.price.toLocaleString()} ر.س</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        u.status === 'Available' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : u.status === 'Hold'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {u.status === 'Available' ? 'متاحة' : u.status === 'Hold' ? 'محجوزة مؤقتاً' : 'مباعة'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUnitId(u.id);
                          setSimulatedPrice(u.price);
                          setPriceSimResult('');
                          addTelemetryEvent('unit.opened', { unitId: u.id, sku: u.sku });
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--nc-surface-solid)] border border-white/5 hover:bg-[var(--nc-accent-soft)] hover:text-[var(--nc-text-secondary)] hover:border-[var(--nc-accent-border)] rounded-lg text-[10px] font-bold transition-all"
                      >
                        <Eye size={12} />
                        تفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Unit Details (wide bento details content) */}
      {selectedUnit && (
        <div className="bg-[var(--nc-surface-solid)] border border-white/5 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--nc-glass-border)] pb-4">
            <div>
              <h3 className="text-base font-black text-white">{selectedUnit.sku} — {selectedUnit.type}</h3>
              <p className="text-[11px] text-[var(--nc-text-dim)] font-medium mt-1">المشروع: {selectedUnit.project} | المساحة: {selectedUnit.area} | المرجع التعاقدي: {selectedUnit.contractId || 'لا يوجد'}</p>
            </div>

            <div className="flex items-center gap-2">
              {selectedUnit.status === 'Available' && (
                <Button 
                  onClick={() => {
                    if (!isAllowed('BOOK_UNIT')) {
                      alert('عذراً! دورك الحالي لا يمتلك الصلاحية لإنشاء حجز.');
                      return;
                    }
                    setBookingOfferPrice(selectedUnit.price);
                    setActiveModal('book_unit');
                  }}
                >
                  إنشاء حجز
                </Button>
              )}

              {selectedUnit.status === 'Sold' && !selectedUnit.financialSettlementId && (
                <Button 
                  variant="secondary"
                  onClick={() => {
                    if (!isAllowed('START_HANDOVER')) {
                      alert('عذراً! دورك الحالي لا يمتلك الصلاحية لبدء تسليم الوحدة.');
                      return;
                    }
                    setActiveModal('handover_assistant');
                  }}
                >
                  بدء تسليم الوحدة
                </Button>
              )}

              <Button 
                variant="secondary"
                onClick={() => {
                  alert(`[UNIT MANIFEST]
                  الـ SKU: ${selectedUnit.sku}
                  المشروع: ${selectedUnit.project}
                  المساحة: ${selectedUnit.area}
                  القيمة الحالية: ${selectedUnit.price.toLocaleString()} ر.س
                  الحالة الحالية: ${selectedUnit.status}`);
                }}
              >
                عرض Manifest
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-bold text-[var(--nc-text-dim)] font-medium mb-2">الوصف العام والمميزات</h4>
              <p className="text-xs text-slate-200 leading-relaxed bg-[var(--nc-surface-solid)]/45 p-4 rounded-xl border border-white/5">{selectedUnit.desc}</p>
              
              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-bold text-[var(--nc-text-dim)] font-medium">مستندات وتراخيص الوحدة المرفقة:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedUnit.docs.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--nc-surface-solid)] rounded-xl border border-white/5 text-[10px] text-[var(--nc-text-dim)] font-medium font-mono">
                      <FileText size={12} className="text-[var(--nc-text-secondary)]" />
                      {doc}
                    </div>
                  ))}
                  {selectedUnit.docs.length === 0 && <span className="text-[10px] text-[var(--nc-text-dim)] font-medium">لا توجد مخططات مرفوعة للوحدة حالياً.</span>}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[var(--nc-text-dim)] font-medium mb-2">معرض صور الوحدة العقارية</h4>
              <div className="grid grid-cols-2 gap-2">
                {selectedUnit.media.map((src, idx) => (
                  <img key={idx} src={src} alt="unit" className="w-full h-24 rounded-lg object-cover border border-white/5 hover:border-cyan-500/30 transition-colors" />
                ))}
                {selectedUnit.media.length === 0 && <div className="col-span-2 py-8 bg-[var(--nc-surface)] border border-dashed border-white/10 rounded-xl flex items-center justify-center text-[10px] text-[var(--nc-text-dim)] font-medium">لا توجد صور متوفرة.</div>}
              </div>
            </div>
          </div>

          {/* Unit Detailed Tabs */}
          <div className="border-t border-[var(--nc-glass-border)] pt-6">
            <div className="flex flex-wrap gap-2 border-b border-[var(--nc-glass-border)] pb-2.5 mb-4">
              {[
                { id: 'events', name: 'سجل التغييرات البصري' },
                { id: 'pricing', name: 'محاكاة الأسعار والخصومات' },
                { id: 'prediction', name: 'توقع البيع (Predictive)' },
                { id: 'handovers', name: 'سجلات التسليم والأعطال' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    startTransition(() => {
                      setActiveTab(tab.id);
                    });
                  }}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    activeTab === tab.id 
                      ? 'bg-[var(--nc-accent)] text-white shadow-sm'
                      : 'bg-[var(--nc-surface)] text-[var(--nc-text-dim)] font-medium hover:text-white border border-white/5'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            {isPending ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent animate-spin"></div>
                <span className="text-[10px] text-[var(--nc-text-dim)] font-medium">جاري تحميل بيانات التبويب...</span>
              </div>
            ) : (
              <div className="tab-pane-content text-xs">
                {activeTab === 'events' && (
                  <div className="space-y-4">
                    <div className="border-r-2 border-[var(--nc-glass-border)] pr-4 space-y-4">
                      {selectedUnit.events.map((ev, idx) => (
                        <div key={idx} className="relative space-y-1">
                          <div className="absolute right-[-21px] top-1.5 w-2 h-2 rounded-full bg-[var(--nc-accent)] border border-slate-900"></div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">{ev.type}</span>
                            <span className="text-[10px] text-[var(--nc-text-dim)] font-medium font-mono">{ev.at}</span>
                          </div>
                          <p className="text-[var(--nc-text-dim)] font-medium text-[11px]">{ev.note}</p>
                          {ev.media && ev.media.length > 0 && (
                            <img src={ev.media[0]} className="w-24 h-16 rounded object-cover mt-2 border border-white/5" alt="event attachment" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'pricing' && (
                  <div className="space-y-4 max-w-md bg-[var(--nc-surface)] p-4 rounded-2xl border border-white/5">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--nc-text-dim)] font-medium">السعر الأساسي المطلوب:</span>
                        <span className="font-bold text-white">{selectedUnit.price.toLocaleString()} ر.س</span>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[var(--nc-text-dim)] font-medium block">السعر المستهدف للمحاكاة (ر.س):</label>
                        <input
                          type="number"
                          value={simulatedPrice}
                          onChange={(e) => setSimulatedPrice(Number(e.target.value))}
                          className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2 text-white outline-none focus:border-[var(--nc-accent-border)]"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[var(--nc-text-dim)] font-medium">
                          <label>نسبة الخصم المعروضة:</label>
                          <span className="font-bold text-[var(--nc-text-secondary)]">{discountPercent}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={discountPercent}
                          onChange={(e) => setDiscountPercent(Number(e.target.value))}
                          className="w-full accent-[var(--nc-accent)] bg-[var(--nc-surface-solid)] h-2 rounded-lg"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handlePriceSimulation}
                          className="px-3 py-1.5 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white rounded-lg transition-colors font-bold"
                        >
                          تشغيل المحاكاة
                        </button>
                        {priceSimResult && (
                          <button
                            type="button"
                            onClick={handleSavePriceDraft}
                            className="px-3 py-1.5 bg-[var(--nc-surface-solid)] hover:bg-slate-700 text-[var(--nc-text-dim)] font-medium rounded-lg transition-colors border border-white/5"
                          >
                            حفظ كمسودة تسعير
                          </button>
                        )}
                      </div>
                    </div>

                    {priceSimResult && (
                      <div className="mt-3 p-3 bg-[var(--nc-surface-solid)]/80 border border-[var(--nc-accent-border)] text-[var(--nc-text-secondary)] font-medium rounded-xl text-[11px] leading-relaxed">
                        {priceSimResult}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'prediction' && (
                  <div className="bg-[var(--nc-surface)] p-4 rounded-xl border border-white/5 space-y-4">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <Bot size={15} className="text-cyan-400" />
                      مساعد التنبؤ الذكي (Predictive Analytics)
                    </h4>
                    
                    {selectedUnit.status === 'Sold' ? (
                      <p className="text-[var(--nc-text-dim)] font-medium">الوحدة مباعة وموثقة بالفعل، لا يمكن تنبؤ فترة بقائها.</p>
                    ) : (
                      <div className="space-y-2 leading-relaxed">
                        <p>بناءً على موقع المشروع ({selectedUnit.project}) وحجم الطلب على الشقق بقيمة تقارب {selectedUnit.price.toLocaleString()} ر.س:</p>
                        <ul className="list-disc list-inside text-[var(--nc-text-dim)] font-medium space-y-1">
                          <li>الوقت المتوقع للبيع: <span className="font-bold text-[var(--nc-text-secondary)]">45 - 60 يومًا</span></li>
                          <li>نسبة الثقة في التحليلات: <span className="font-bold text-emerald-400">78%</span></li>
                          <li>توصية النظام التسويقية: إطلاق حملة ممولة مستهدفة في تويتر وسناب شات تستهدف منطقة شمال الرياض.</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'handovers' && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {selectedUnit.handovers.map((h, idx) => (
                        <div key={idx} className="bg-[var(--nc-surface)] p-4 rounded-xl border border-white/5 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white">معرف محضر الاستلام: {h.id}</span>
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-bold">مكتمل وموقع</span>
                          </div>
                          <p className="text-[var(--nc-text-dim)] font-medium text-[11px]">تاريخ التسجيل: {h.scheduledAt}</p>
                          <div className="border-t border-[var(--nc-glass-border)] pt-2 text-[11px] text-[var(--nc-text-dim)] font-medium space-y-1">
                            <p className="font-bold">قائمة فحص العيوب (Checklist):</p>
                            <pre className="font-sans text-[11px] text-[var(--nc-text-dim)] font-medium bg-[var(--nc-surface-solid)] p-2 rounded">{h.checklist}</pre>
                          </div>
                        </div>
                      ))}
                      {selectedUnit.handovers.length === 0 && (
                        <p className="text-[var(--nc-text-dim)] font-medium text-center py-4">لم يتم تسجيل أي محاضر تسليم أو مراجعة عيوب لهذه الوحدة العقارية.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Telemetry log console at the very bottom */}
      <div className="bg-[var(--nc-surface-solid)] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
          <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-2">
            <Bot size={15} />
            سجل تتبع الأحداث العقارية الفورية (Telemetry Event Bus Logs)
          </h4>
          <button 
            type="button"
            onClick={() => setTelemetryLogs([])}
            className="text-[10px] text-[var(--nc-text-dim)] font-medium hover:text-[var(--nc-text-dim)] font-medium border border-white/5 px-2 py-0.5 rounded"
          >
            مسح السجل
          </button>
        </div>
        
        <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-[10px] font-mono leading-relaxed">
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
    <div className="nc-page nc-stack text-[var(--ds-text-primary)]" dir="rtl">
      <LayoutContainer
        kpis={kpisContent}
        actions={actionsContent}
        insights={insightsContent}
        details={detailsContent}
      />

      {/* ── Modal 1: New Unit Form ── */}
      {activeModal === 'new_unit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <form 
            onSubmit={handleCreateUnit}
            className="relative bg-[var(--nc-surface-solid)] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[var(--nc-text-secondary)] border-b border-[var(--nc-glass-border)] pb-2 flex items-center gap-2">
              <Plus size={18} />
              إضافة وحدة عقارية جديدة
            </h3>
            
            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] font-medium block">رقم الوحدة (SKU / Unit No):</label>
              <input 
                type="text"
                required
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                placeholder="مثال: A-103"
                className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[var(--nc-accent-border)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] font-medium block">نوع العقار:</label>
              <select 
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[var(--nc-accent-border)]"
              >
                <option value="شقة سكنية">شقة سكنية</option>
                <option value="فيلا مستقلة">فيلا مستقلة</option>
                <option value="فيلا علوية">فيلا علوية</option>
                <option value="مكتب تجاري">مكتب تجاري</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] font-medium block">المشروع السكني:</label>
              <select 
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[var(--nc-accent-border)]"
              >
                <option value="مشروع النخيل السكني">مشروع النخيل السكني</option>
                <option value="واحة الخليج">واحة الخليج</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] font-medium block">المساحة الإجمالية:</label>
              <input 
                type="text"
                required
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="مثال: 120 م²"
                className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[var(--nc-accent-border)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] font-medium block">السعر المطلوب (ر.س):</label>
              <input 
                type="number"
                required
                value={newPrice}
                onChange={(e) => setNewPrice(Number(e.target.value))}
                className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[var(--nc-accent-border)]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white font-bold rounded-xl transition-all"
              >
                حفظ الوحدة بالـ Inventory
              </button>
              <button 
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-[var(--nc-surface-solid)] hover:bg-slate-700 text-[var(--nc-text-dim)] font-medium rounded-xl transition-all"
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
            className="relative bg-[var(--nc-surface-solid)] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[var(--nc-text-secondary)] border-b border-[var(--nc-glass-border)] pb-2 flex items-center gap-2">
              <FileCheck size={18} />
              حجز وحدة عقارية وإصدار عقد
            </h3>
            
            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] font-medium block">الوحدة المحددة:</label>
              <p className="font-bold text-white">{selectedUnit.sku} — {selectedUnit.type} ({selectedUnit.project})</p>
            </div>

            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] font-medium block">اسم المشتري أو معرف العميل (Lead ID):</label>
              <input 
                type="text"
                required
                value={bookingLeadId}
                onChange={(e) => setBookingLeadId(e.target.value)}
                placeholder="الاسم الرباعي للمشتري..."
                className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[var(--nc-accent-border)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] font-medium block">القيمة التعاقدية للبيع (ر.س):</label>
              <input 
                type="number"
                required
                value={bookingOfferPrice}
                onChange={(e) => setBookingOfferPrice(Number(e.target.value))}
                className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[var(--nc-accent-border)]"
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
                className="flex-1 py-2.5 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white font-bold rounded-xl transition-all"
              >
                تأكيد وإمضاء العقد
              </button>
              <button 
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-[var(--nc-surface-solid)] hover:bg-slate-700 text-[var(--nc-text-dim)] font-medium rounded-xl transition-all"
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
            className="relative bg-[var(--nc-surface-solid)] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs"
          >
            <h3 className="text-base font-extrabold text-[var(--nc-text-secondary)] border-b border-[var(--nc-glass-border)] pb-2 flex items-center gap-2">
              <Key size={18} />
              معالج التسليم الذكي (Live Handover Assistant)
            </h3>
            
            <p className="text-[var(--nc-text-dim)] font-medium">يقوم هذا المعالج بتسجيل تاريخ التسليم المعتمد، ومراجعة قوائم العيوب وتصوير المعاينة الميدانية لإصدار مخالصة الاستلام.</p>

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
              <label className="text-[var(--nc-text-dim)] font-medium block">قائمة فحص الملاحظات والعيوب (Checklist):</label>
              <textarea 
                rows={3}
                required
                value={handoverChecklist}
                onChange={(e) => setHandoverChecklist(e.target.value)}
                className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[var(--nc-accent-border)] font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[var(--nc-text-dim)] font-medium block">رابط صورة المعاينة الميدانية الموثقة:</label>
              <input 
                type="text"
                required
                value={handoverPhoto}
                onChange={(e) => setHandoverPhoto(e.target.value)}
                className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[var(--nc-accent-border)]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white font-bold rounded-xl transition-all"
              >
                توقيع مخالصة الاستلام وإصدار تسوية مالية
              </button>
              <button 
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-[var(--nc-surface-solid)] hover:bg-slate-700 text-[var(--nc-text-dim)] font-medium rounded-xl transition-all"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
