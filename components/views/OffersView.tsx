// components/views/OffersView.tsx
'use client';
import React, { useState, useEffect, useTransition } from 'react';

import PageHeader from '@/components/ui/PageHeader';
import {
  Megaphone, Plus, Search, Heart, Map, FileSpreadsheet, Eye,
  Landmark, Calculator, Calendar, ArrowRight, UserCheck, MessageSquare,
  AlertCircle, Bot, Trash2, CheckCircle2, Star, Sparkles
} from 'lucide-react';
import { DateField } from '../ui/DateField';
import { LayoutContainer } from '../ui/LayoutContainer';
import { SmartCard } from '@/components/ui/SmartCard';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from '@/app/context/ToastContext';
import { getPropertiesAction } from '@/app/actions/properties';

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface PropertyOffer {
  id: string;
  title: string;
  type: 'apartment' | 'villa' | 'land';
  status: 'available' | 'reserved' | 'sold';
  price: number;
  beds: number;
  area: number;
  city: string;
  district: string;
  agent: string;
  posted: string; // YYYY-MM-DD
  coords: { lat: number; lng: number };
  description: string;
}

// ─── Initial Mock Data ──────────────────────────────────────────────────────
const initialProperties: PropertyOffer[] = [
  {
    id: 'P-001',
    title: 'شقة فاخرة في العليا',
    type: 'apartment',
    status: 'available',
    price: 950000,
    beds: 3,
    area: 145,
    city: 'الرياض',
    district: 'العليا',
    agent: 'شركة النخبة العقارية',
    posted: '2026-05-10',
    coords: { lat: 24.7136, lng: 46.6753 },
    description: 'شقة سكنية متكاملة الخدمات في أرقى مناطق العليا، تشطيب مودرن حديث، تكييف مركزي بالكامل، ومواقف سيارات خاصة مؤمنة على مدار الساعة.'
  },
  {
    id: 'P-002',
    title: 'فيلا مودرن في النخيل',
    type: 'villa',
    status: 'available',
    price: 3200000,
    beds: 5,
    area: 420,
    city: 'الرياض',
    district: 'النخيل',
    agent: 'شركة مطور الرياض العقاري',
    posted: '2026-04-22',
    coords: { lat: 24.725, lng: 46.68 },
    description: 'فيلا مستقلة رائعة بتصميم معماري فريد يحتوي على واجهة زجاجية، مسبح دافئ خارجي، نظام المنزل الذكي بالكامل، وغرفة خادمة مستقلة.'
  },
  {
    id: 'P-003',
    title: 'أرض سكنية في حي النخبة',
    type: 'land',
    status: 'reserved',
    price: 1200000,
    beds: 0,
    area: 600,
    city: 'الرياض',
    district: 'النخبة',
    agent: 'مكتب سمسار الرياض العقاري',
    posted: '2026-03-15',
    coords: { lat: 24.72, lng: 46.69 },
    description: 'أرض زاوية سكنية ممتازة على شارعين واسعين بطول ٢٠م لكل منهما، قريبة جداً من الخدمات والمدارس والمجمعات التجارية والجامعة.'
  },
  {
    id: 'P-004',
    title: 'شقة استثمارية قرب الجامعة',
    type: 'apartment',
    status: 'available',
    price: 420000,
    beds: 2,
    area: 85,
    city: 'الرياض',
    district: 'الجامعة',
    agent: 'شركة الاستثمار والتشغيل العقاري',
    posted: '2026-05-28',
    coords: { lat: 24.71, lng: 46.66 },
    description: 'شقة مؤثثة بالكامل ومؤجرة حالياً بعائد استثماري سنوي ممتاز يصل لـ ٨.٥٪، قريبة جداً من محطة المترو والمدينة الجامعية.'
  },
  {
    id: 'P-005',
    title: 'فيلا فاخرة مع مسبح بالزهراء',
    type: 'villa',
    status: 'sold',
    price: 4500000,
    beds: 6,
    area: 600,
    city: 'الرياض',
    district: 'الزهراء',
    agent: 'مكتب المطور الفاخر للعقارات',
    posted: '2026-01-10',
    coords: { lat: 24.73, lng: 46.67 },
    description: 'تحفة معمارية في حي الزهراء، مصاعد بانوراما داخلية، ملحق خارجي للضيافة، مجالس واسعة للرجال والنساء، ونظام حماية ومراقبة متكامل.'
  }
];

export default function OffersView() {
  const { hasPermission } = useAuth();
  const [properties, setProperties] = useState<PropertyOffer[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showMap, setShowMap] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOffers() {
      setOffersLoading(true);
      try {
        const offersResult = await getPropertiesAction();
        const propertiesData = offersResult && 'data' in offersResult ? offersResult.data : (Array.isArray(offersResult) ? offersResult : []);
        if (propertiesData && propertiesData.length > 0) {
          const mapped: PropertyOffer[] = propertiesData.map((u: any) => ({
            id: u.id,
            title: u.sku || `${u.type} - ${u.district || ''}`.trim(),
            type: (u.type === 'فيلا' || u.type === 'villa') ? 'villa' : u.type === 'أرض' || u.type === 'land' ? 'land' : 'apartment',
            status: (u.status === 'Available' ? 'available' : u.status === 'Sold' ? 'sold' : 'reserved') as any,
            price: u.price,
            beds: u.beds || 3,
            area: parseInt(u.area) || 100,
            city: u.city || 'الرياض',
            district: u.district || 'غير محدد',
            agent: u.agentName || 'غير معين',
            posted: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '2026-01-01',
            coords: { lat: u.lat || 24.7, lng: u.lng || 46.7 },
            description: u.desc || '',
          }));
          setProperties(mapped);
        } else {
          setProperties(initialProperties);
        }
      } catch (err) {
        setOffersError('تعذر تحميل العروض من قاعدة البيانات');
        setProperties(initialProperties);
      } finally {
        setOffersLoading(false);
      }
    }
    loadOffers();
  }, []);

  // Filters State
  const [searchVal, setSearchVal] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [bedsFilter, setBedsFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState<number | ''>('');
  const [sortVal, setSortVal] = useState('relevance');

  // New Listing Form State
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'apartment' | 'villa' | 'land'>('apartment');
  const [newStatus, setNewStatus] = useState<'available' | 'reserved' | 'sold'>('available');
  const [newPrice, setNewPrice] = useState<number | ''>('');
  const [newBeds, setNewBeds] = useState<number>(0);
  const [newArea, setNewArea] = useState<number | ''>('');
  const [newCity, setNewCity] = useState('الرياض');
  const [newDistrict, setNewDistrict] = useState('');
  const [newAgent, setNewAgent] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Global & Contextual Mortgage Prefills
  const [mPrice, setMPrice] = useState(800000);
  const [mDown, setMDown] = useState(20);
  const [mTerm, setMTerm] = useState(25);
  const [mRate, setMRate] = useState(4.5);
  const [monthlyInstallment, setMonthlyInstallment] = useState<number | null>(null);

  // Schedule Visit State
  const [visitDate, setVisitDate] = useState(''); // YYYY-MM-DD
  const [visitTime, setVisitTime] = useState('10:00');
  const [visitName, setVisitName] = useState('');
  const [visitPhone, setVisitPhone] = useState('');
  const [visitNotes, setVisitNotes] = useState('');

  // Contact Agent State
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsApp, setContactWhatsApp] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  // RBAC permissions — delegated to AuthContext

  // Real-time telemetry log console
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([
    {
      id: 'evt_init',
      type: 'offers.initialized',
      timestamp: new Date().toISOString(),
      actorId: 'system_core',
      payload: { message: 'تهيئة نظام العروض العقارية ومحاكاة التمويل وقاعدة البيانات بنجاح' }
    }
  ]);

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

  const isAllowed = (action: string) => hasPermission(action);

  // Live filtering computation
  const filteredProperties = properties.filter(p => {
    const matchSearch = !searchVal || (p.title + ' ' + p.city + ' ' + p.district + ' ' + p.id).toLowerCase().includes(searchVal.toLowerCase());
    const matchType = !typeFilter || p.type === typeFilter;
    const matchStatus = !statusFilter || p.status === statusFilter;
    const matchMinPrice = minPrice === '' || p.price >= minPrice;
    const matchMaxPrice = maxPrice === '' || p.price <= maxPrice;
    const matchBeds = !bedsFilter || p.beds >= Number(bedsFilter);
    const matchArea = areaFilter === '' || p.area >= areaFilter;
    return matchSearch && matchType && matchStatus && matchMinPrice && matchMaxPrice && matchBeds && matchArea;
  });

  // Sorting
  if (sortVal === 'price_asc') {
    filteredProperties.sort((a, b) => a.price - b.price);
  } else if (sortVal === 'price_desc') {
    filteredProperties.sort((a, b) => b.price - a.price);
  } else if (sortVal === 'newest') {
    filteredProperties.sort((a, b) => new Date(b.posted).getTime() - new Date(a.posted).getTime());
  }

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const exists = prev.includes(id);
      let updated;
      if (exists) {
        updated = prev.filter(x => x !== id);
        addTelemetryEvent('offer.favorite_removed', { propertyId: id });
      } else {
        updated = [...prev, id];
        addTelemetryEvent('offer.favorite_added', { propertyId: id });
      }
      return updated;
    });
  };

  const handleApplyFilters = () => {
    addTelemetryEvent('offers.filters_applied', {
      searchVal,
      typeFilter,
      statusFilter,
      minPrice,
      maxPrice,
      bedsFilter,
      areaFilter,
      sortVal
    });
  };

  const handleClearFilters = () => {
    setSearchVal('');
    setTypeFilter('');
    setStatusFilter('');
    setMinPrice('');
    setMaxPrice('');
    setBedsFilter('');
    setAreaFilter('');
    setSortVal('relevance');
    addTelemetryEvent('offers.filters_cleared', {});
  };

  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowed('CREATE_OFFER')) {
      toast.error('عذراً، لا تملك صلاحية إضافة عروض عقارية جديدة.');
      return;
    }

    if (!newTitle || !newPrice || !newArea || !newDistrict || !newAgent) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة لإنشاء العرض.');
      return;
    }

    const newOfferId = `P-00${properties.length + 1}`;
    const newOffer: PropertyOffer = {
      id: newOfferId,
      title: newTitle,
      type: newType,
      status: newStatus,
      price: Number(newPrice),
      beds: Number(newBeds),
      area: Number(newArea),
      city: newCity,
      district: newDistrict,
      agent: newAgent,
      posted: new Date().toISOString().split('T')[0],
      coords: { lat: 24.71 + Math.random() * 0.05, lng: 46.65 + Math.random() * 0.05 },
      description: newDesc || 'تم إنشاء وصف افتراضي مناسب لهذا العرض السكني.'
    };

    setProperties(prev => [newOffer, ...prev]);
    addTelemetryEvent('offer.created', newOffer);

    // Reset fields
    setNewTitle('');
    setNewType('apartment');
    setNewStatus('available');
    setNewPrice('');
    setNewBeds(0);
    setNewArea('');
    setNewDistrict('');
    setNewAgent('');
    setNewDesc('');
    setActiveModal(null);

    toast.error(`تم بنجاح تسجيل وإدراج العرض العقاري الجديد برقم: ${newOfferId}`);
  };

  // Perform mortgage calculation on form update
  const calculateMortgageVal = (price: number, downPct: number, termYears: number, ratePercent: number) => {
    const loanAmount = price * (1 - downPct / 100);
    const totalMonths = termYears * 12;
    const monthlyRate = ratePercent / 100 / 12;

    let monthly = 0;
    if (monthlyRate === 0) {
      monthly = loanAmount / totalMonths;
    } else {
      monthly = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
    }
    return Math.round(monthly);
  };

  const handleGlobalMortgageCalc = () => {
    const monthly = calculateMortgageVal(mPrice, mDown, mTerm, mRate);
    setMonthlyInstallment(monthly);
    addTelemetryEvent('mortgage.calculated', {
      propertyPrice: mPrice,
      downPct: mDown,
      termYears: mTerm,
      ratePercent: mRate,
      calculatedInstallment: monthly
    });
  };

  const openMortgagePrefilled = (pId: string) => {
    const p = properties.find(x => x.id === pId);
    if (!p) return;
    setMPrice(p.price);
    setMDown(20);
    setMTerm(25);
    setMRate(4.5);
    const monthly = calculateMortgageVal(p.price, 20, 25, 4.5);
    setMonthlyInstallment(monthly);
    setActiveModal('mortgage');
    addTelemetryEvent('mortgage.modal_prefilled', { propertyId: pId, price: p.price });
  };

  const handleScheduleVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitDate || !visitName || !visitPhone) {
      toast.error('يرجى تحديد التاريخ والاسم ورقم الجوال لحجز الزيارة.');
      return;
    }

    const visitPayload = {
      propertyId: selectedPropertyId,
      scheduledAt: visitDate,
      time: visitTime,
      visitorName: visitName,
      visitorPhone: visitPhone,
      notes: visitNotes
    };

    addTelemetryEvent('offer.visit_scheduled', visitPayload);
    setActiveModal(null);
    setVisitName('');
    setVisitPhone('');
    setVisitNotes('');
    toast.error(`تم تأكيد موعد زيارة العقار بتاريخ ${visitDate.split('-').reverse().join('/')} في تمام الساعة ${visitTime}. سيقوم المستشار العقاري بالتواصل معك.`);
  };

  const handleContactAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactPhone) {
      toast.error('يرجى إدخال اسمك ورقم الهاتف لإرسال طلب الاستفسار.');
      return;
    }

    const contactPayload = {
      propertyId: selectedPropertyId,
      clientName: contactName,
      clientPhone: contactPhone,
      whatsApp: contactWhatsApp,
      notes: contactNotes
    };

    addTelemetryEvent('offer.agent_contacted', contactPayload);
    setActiveModal(null);
    setContactName('');
    setContactPhone('');
    setContactWhatsApp('');
    setContactNotes('');
    toast.success('');
  };

  const handleCSVExport = () => {
    const headers = 'ID,Title,City,District,Type,Price,Beds,Area,Status,Posted\n';
    const rows = filteredProperties.map(p => 
      `"${p.id}","${p.title}","${p.city}","${p.district}","${p.type}",${p.price},${p.beds},${p.area},"${p.status}","${p.posted}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ORCA_العروض_العقارية_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    addTelemetryEvent('offers.csv_exported', { count: filteredProperties.length });
  };

  const selectedProp = properties.find(x => x.id === selectedPropertyId);

  // Helper date formatter
  const formatDateToDDMMYYYY = (iso: string): string => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <>
      {/* ─── Loading / Error ───────────────────────────── */}
      {offersLoading && (
        <div className="nc-glass p-6 flex items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent animate-spin"></div>
          <span className="text-sm text-[var(--nc-foreground-muted)]">جاري تحميل العروض من قاعدة البيانات...</span>
        </div>
      )}
      {offersError && !offersLoading && (
        <div className="nc-glass p-6 flex items-center justify-center gap-3">
          <p className="text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '8px 16px' }}>{offersError}</p>
          <button onClick={() => window.location.reload()} className="nc-btn nc-btn-ghost nc-btn-sm">إعادة المحاولة</button>
        </div>
      )}

      {/* ─── Page Header ───────────────────────────── */}
      <div className="px-6 md:px-8 pt-6 pb-2">
        <PageHeader title="العروض العقارية" description="إدارة وتسويق العروض السكنية، حاسبة التموايل، وتوثيق حجوزات العملاء المتكاملة." />
      </div>

      <LayoutContainer
        kpis={null}
        actions={
          <SmartCard className="p-5 h-full">
            <div className="flex flex-col gap-4 w-full">
            {/* فلترة العروض */}
            <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--nc-foreground)] border-b border-[var(--nc-border)] pb-2">البحث وتصفية العروض</h3>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[var(--nc-text-dim)] font-medium font-bold">بحث</label>
                <input
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="ابحث بحي، مدينة، أو ID..."
                  className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-xl px-3 py-2 text-xs text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[var(--nc-text-dim)] font-medium font-bold">النوع</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-xl px-2 py-2 text-xs text-[var(--nc-foreground)] outline-none"
                  >
                    <option value="">كل الأنواع</option>
                    <option value="apartment">شقة</option>
                    <option value="villa">فيلا</option>
                    <option value="land">أرض</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--nc-text-dim)] font-medium font-bold">الحالة</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-xl px-2 py-2 text-xs text-[var(--nc-foreground)] outline-none"
                  >
                    <option value="">الكل</option>
                    <option value="available">متاح</option>
                    <option value="reserved">محجوز</option>
                    <option value="sold">مباع</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[var(--nc-text-dim)] font-medium font-bold">نطاق السعر (ر.س)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="من"
                    className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-xl px-2 py-1.5 text-center text-xs text-[var(--nc-foreground)] outline-none"
                  />
                  <span className="text-[var(--nc-foreground-muted)]">—</span>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="إلى"
                    className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-xl px-2 py-1.5 text-center text-xs text-[var(--nc-foreground)] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[var(--nc-text-dim)] font-medium font-bold">غرف النوم</label>
                  <select
                    value={bedsFilter}
                    onChange={(e) => setBedsFilter(e.target.value)}
                    className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-xl px-2 py-2 text-xs text-[var(--nc-foreground)] outline-none font-mono"
                  >
                    <option value="">الكل</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--nc-text-dim)] font-medium font-bold">الحد الأدنى م²</label>
                  <label htmlFor="offers-min-area" className="sr-only">الحد الأدنى للمساحة</label>
                  <input
                    id="offers-min-area"
                    type="number"
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 150"
                    className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-xl px-2 py-1.5 text-center text-xs text-[var(--nc-foreground)] outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-[var(--nc-border)]">
                <button
                  onClick={handleApplyFilters}
                  className="flex-1 py-2 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white font-bold rounded-xl transition-all"
                >
                  تطبيق الفلاتر
                </button>
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-2 bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] text-[var(--nc-foreground-muted)] rounded-xl transition-all"
                >
                  مسح
                </button>
              </div>
            </div>
            </div>
          </div>
          </SmartCard>
        }
        insights={
          <SmartCard className="p-5 h-full">
          <div className="space-y-4">
            {/* المفضلة الشخصية */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-[var(--nc-foreground)] border-b border-[var(--nc-border)] pb-2">العروض المحفوظة</h3>
              <div className="space-y-2">
                {favorites.length === 0 ? (
                  <p className="text-xs text-[var(--nc-foreground-muted)] py-1 text-center">لا توجد عروض محفوظة</p>
                ) : (
                  favorites.map(fid => {
                    const p = properties.find(x => x.id === fid);
                    if (!p) return null;
                    return (
                      <div
                        key={fid}
                        onClick={() => {
                          setSelectedPropertyId(p.id);
                          setActiveModal('details');
                        }}
                        className="flex justify-between items-center p-2 bg-[var(--nc-surface)] rounded-xl border border-[var(--nc-border)] hover:border-[var(--nc-accent-border)]/35 transition-all text-xs text-[var(--nc-foreground-muted)] cursor-pointer"
                      >
                        <span className="text-[var(--nc-foreground)] truncate max-w-[130px] font-semibold">{p.title}</span>
                        <span className="text-rose-500 font-bold shrink-0">❤️</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          </SmartCard>
        }
        details={
          <div className="space-y-6">
            {/* التحكم العلوي للشبكة */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-[var(--nc-surface-solid)] border border-white/5 p-3 rounded-2xl shadow-md text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[var(--nc-text-dim)] font-medium">العروض المطابقة:</span>
                <strong className="text-white bg-[var(--nc-surface-solid)] px-2 py-0.5 rounded border border-white/5 font-mono text-sm">
                  {filteredProperties.length}
                </strong>
                <label htmlFor="sort-offers" className="sr-only">ترتيب حسب</label>
                <select
                  id="sort-offers"
                  value={sortVal}
                  onChange={(e) => {
                    setSortVal(e.target.value);
                    addTelemetryEvent('offers.sort_changed', { sortBy: e.target.value });
                  }}
                  className="bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white outline-none font-bold mr-2"
                >
                  <option value="relevance">الأكثر صلة</option>
                  <option value="price_asc">الأقل سعراً</option>
                  <option value="price_desc">الأعلى سعراً</option>
                  <option value="newest">الأحدث</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowMap(!showMap)}
                  className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    showMap 
                      ? 'bg-[var(--nc-surface-solid)] border-cyan-500/30 text-cyan-400' 
                      : 'bg-[var(--nc-surface-solid)] border-white/10 text-[var(--nc-text-dim)]'
                  }`}
                >
                  <Map size={14} />
                  {showMap ? 'إخفاء الخريطة' : 'إظهار الخريطة'}
                </button>
                <button
                  onClick={handleCSVExport}
                  className="flex items-center gap-2 bg-[var(--nc-surface-solid)] border border-white/10 text-white rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
                >
                  <FileSpreadsheet size={14} className="text-emerald-500" />
                  تصدير CSV
                </button>
              </div>
            </div>

            {/* شبكة العقارات مع تقييد التمدد */}
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              {filteredProperties.length === 0 ? (
                <div className="bg-[var(--nc-surface-strong)] border border-dashed border-[var(--nc-border)] rounded-3xl p-12 text-center text-[var(--nc-foreground-muted)]">
                  لا توجد عروض مطابقة لشروط الفلترة الحالية.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProperties.map(p => {
                    const isFav = favorites.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPropertyId(p.id);
                          setActiveModal('details');
                          addTelemetryEvent('offer.clicked_detail', { propertyId: p.id });
                        }}
                        className="group bg-[var(--nc-surface-solid)] border rounded-2xl overflow-hidden hover:-translate-y-1 transform transition-all duration-300 cursor-pointer shadow-lg flex flex-col h-full border-white/5 hover:border-[var(--nc-accent-border)]/40"
                      >
                        {/* الميديا */}
                        <div className="h-40 bg-[var(--nc-surface-strong)] relative flex items-center justify-center overflow-hidden shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10" />
                          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(var(--nc-accent-border) 1px,transparent 1px)] [background-size:16px_16px]" />
                          <span className="z-20 text-xs text-[var(--nc-foreground-muted)] font-bold bg-[var(--nc-surface-strong)] px-3 py-1 rounded-full">
                            {p.type === 'villa' ? 'فيلا سكنية' : p.type === 'apartment' ? 'شقة فاخرة' : 'أرض فضاء'}
                          </span>
                          <div className="absolute top-3 right-3 z-20">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shadow-sm ${
                              p.status === 'available' 
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                                : p.status === 'reserved'
                                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                            }`}>
                              {p.status === 'available' ? 'متاح' : p.status === 'reserved' ? 'محجوز' : 'مباع'}
                            </span>
                          </div>
                          <div className="absolute top-3 left-3 z-20">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(p.id);
                                }}
                                className={`p-1.5 rounded-lg border transition-all ${
                                  isFav 
                                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' 
                                    : 'bg-[var(--nc-surface-solid)]/80 border-white/5 text-[var(--nc-text-dim)] font-medium hover:text-rose-400'
                                }`}
                                aria-label={isFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                              >
                                <Heart size={12} className={isFav ? 'fill-rose-500' : ''} />
                              </button>
                          </div>
                        </div>

                        {/* معلومات الكارد */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-white text-lg group-hover:text-[var(--nc-text-secondary)] transition-colors text-xs">{p.title}</h4>
                            <p className="text-xs text-slate-500 text-[var(--nc-text-dim)] font-medium">📍 {p.city} · حي {p.district}</p>
                          </div>
                          <div className="grid grid-cols-3 gap-1 bg-[var(--nc-surface)] p-2 rounded-xl border border-white/5 text-center text-[9px] text-slate-450">
                            <div><p>المساحة</p><p className="font-semibold text-white text-lg font-mono">{p.area} م²</p></div>
                            <div><p>الغرف</p><p className="font-semibold text-white text-lg font-mono">{p.beds > 0 ? p.beds : '—'}</p></div>
                            <div><p>سعر المتر</p><p className="font-bold text-[var(--nc-text-secondary)] font-mono">{Math.round(p.price / p.area).toLocaleString()} ر.س</p></div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[var(--nc-border)]">
                            <div>
                              <p className="text-[9px] text-[var(--nc-text-dim)] font-medium">السعر المطلوب</p>
                              <p className="font-black text-[var(--nc-text-secondary)] text-xs font-mono">{p.price.toLocaleString()} ر.س</p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openMortgagePrefilled(p.id);
                                }}
                                className="px-2 py-1 bg-[var(--nc-surface-solid)] hover:bg-[var(--nc-surface-solid)] border border-white/10 text-[var(--nc-text-secondary)] text-xs text-slate-500 font-bold rounded-lg transition-all"
                              >
                                تمويل
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPropertyId(p.id);
                                  setActiveModal('details');
                                }}
                                className="px-2 py-1 bg-[var(--nc-accent-soft)] hover:bg-[var(--nc-accent-hover)] text-[var(--nc-text-secondary)] hover:text-white text-xs text-slate-500 font-bold rounded-lg transition-all"
                              >
                                تفاصيل
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* شبكة العروض واللوحة الجغرافية */}
            {showMap && (
              <div className="bg-[var(--nc-surface-solid)] border border-white/5 rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h4 className="text-lg font-semibold text-white flex items-center gap-1.5">
                    <Map size={13} className="text-cyan-400" />
                    <span>خريطة توزع العروض</span>
                  </h4>
                  <span className="text-[9px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-black">حي العليا</span>
                </div>
                <div className="h-64 bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-[#0f192b] opacity-40 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:20px_20px]" />
                  {filteredProperties.slice(0, 3).map((p, idx) => (
                    <div
                      key={idx}
                      className="absolute z-20 group cursor-pointer"
                      style={{ top: `${35 + idx * 22}%`, right: `${40 + idx * 18}%` }}
                      title={p.title}
                      onClick={() => {
                        setSelectedPropertyId(p.id);
                        setActiveModal('details');
                      }}
                    >
                      <div className="relative flex items-center justify-center">
                        <span className="absolute inline-flex h-5 w-5 rounded-full bg-cyan-400 opacity-30 animate-ping" />
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-400 border border-white flex-shrink-0" />
                        <span className="absolute top-4 bg-[var(--nc-surface-solid)] border border-white/10 text-[9px] text-white px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap font-mono">{p.id}</span>
                      </div>
                    </div>
                  ))}
                  <span className="z-10 text-xs text-white font-bold tracking-wider bg-[var(--nc-surface-solid)]/90 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    محاكاة الخرائط النشطة
                  </span>
                </div>
                <div className="bg-[var(--nc-surface-solid)] p-2.5 rounded-xl border border-white/5 text-xs text-[var(--nc-text-dim)] leading-relaxed text-center font-semibold">
                  تحمل الخريطة التوضيحية إحداثيات خطوط العرض والطول لكل عقار مع تتبع النقاط وتوجيه المستشارين.
                </div>
              </div>
            )}

          </div>
        }
      />

      {/* ─── Modals Root Control ───────────────────────────────────────────── */}
      
      {/* 1. تفاصيل العقار Modal */}
      {activeModal === 'details' && selectedProp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <div className="relative bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] p-6 rounded-2xl max-w-2xl w-full space-y-5 shadow-2xl text-right max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-start border-b border-[var(--nc-border)] pb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-[var(--nc-foreground)]">{selectedProp.title}</h3>
                <p className="text-xs text-[var(--nc-foreground-muted)] font-medium flex items-center gap-1.5 font-bold">
                  <span>📍</span>
                  <span>{selectedProp.city} · حي {selectedProp.district} · {selectedProp.area} م²</span>
                </p>
              </div>
              <div className="text-left space-y-1">
                <p className="text-xs text-[var(--nc-foreground-muted)] font-medium">القيمة المطلوبة</p>
                <p className="text-lg font-black text-[var(--nc-text-secondary)] font-mono">{selectedProp.price.toLocaleString()} ر.س</p>
              </div>
            </div>

            {/* مجسم الصور البصري */}
            <div className="h-60 bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10" />
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(var(--nc-accent-border) 1.5px,transparent 1.5px)] [background-size:24px_24px]" />
              <div className="z-20 text-center space-y-2">
                <Megaphone size={35} className="mx-auto text-[var(--nc-foreground-muted)] animate-pulse" />
                <span className="inline-block text-xs text-[var(--nc-foreground-muted)] font-medium font-bold bg-[var(--nc-surface-solid)]/90 border border-[var(--nc-border)] px-3 py-1.5 rounded-full">
                  معاينة وسائط ومخططات العقار البصرية المعتمده
                </span>
              </div>
            </div>

            {/* تفاصيل وهيكل */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs border-b border-[var(--nc-border)] pb-4">
              <div className="space-y-3">
                <h4 className="font-bold text-[var(--nc-text-secondary)] border-b border-[var(--nc-border)] pb-1">مواصفات العرض العقاري</h4>
                <ul className="space-y-2 text-[var(--nc-foreground-muted)]">
                  <li className="flex justify-between">
                    <span className="text-[var(--nc-foreground-muted)]">الرقم المرجعي (ID):</span>
                    <span className="font-mono font-semibold text-[var(--nc-foreground)] text-lg">{selectedProp.id}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-[var(--nc-foreground-muted)]">نوع العقار:</span>
                    <span className="font-semibold text-[var(--nc-foreground)] text-lg">
                      {selectedProp.type === 'villa' ? 'فيلا مستقلة' : selectedProp.type === 'apartment' ? 'شقة' : 'أرض'}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-[var(--nc-foreground-muted)]">عدد غرف النوم:</span>
                    <span className="font-mono font-semibold text-[var(--nc-foreground)] text-lg">{selectedProp.beds > 0 ? selectedProp.beds : '—'}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-[var(--nc-foreground-muted)]">المساحة الإجمالية:</span>
                    <span className="font-mono font-semibold text-[var(--nc-foreground)] text-lg">{selectedProp.area} م²</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-[var(--nc-foreground-muted)]">الوكيل المسؤول:</span>
                    <span className="font-semibold text-[var(--nc-foreground)] text-lg">{selectedProp.agent}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-[var(--nc-foreground-muted)]">تاريخ الإدراج والنشر:</span>
                    <span className="font-mono font-semibold text-[var(--nc-foreground)] text-lg">{formatDateToDDMMYYYY(selectedProp.posted)}</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-[var(--nc-foreground)] text-lg border-b border-[var(--nc-border)] pb-1">إجراءات سياقية ذكية</h4>
                <p className="text-xs text-[var(--nc-foreground-muted)] text-[var(--nc-foreground-muted)] leading-relaxed mb-2">اختر أحد الإجراءات التالية لطلب التواصل أو تقديم عرض تمويل مباشر.</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setActiveModal('contact_agent')}
                    className="w-full py-2.5 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-[var(--nc-foreground)] text-xs font-bold rounded-xl transition-all shadow"
                  >
                    تواصل مع الوكيل
                  </button>
                  <button
                    onClick={() => {
                      setMPrice(selectedProp.price);
                      setMDown(20);
                      setMTerm(25);
                      setMRate(4.5);
                      const monthly = calculateMortgageVal(selectedProp.price, 20, 25, 4.5);
                      setMonthlyInstallment(monthly);
                      setActiveModal('mortgage');
                    }}
                    className="w-full py-2.5 bg-[var(--nc-surface-solid)] hover:bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] text-[var(--nc-foreground)] text-xs font-bold rounded-xl transition-all"
                  >
                    تقديم طلب تمويل لهذا العرض
                  </button>
                  <button
                    onClick={() => {
                      setVisitDate(new Date().toISOString().split('T')[0]);
                      setActiveModal('schedule_visit');
                    }}
                    className="w-full py-2.5 bg-[var(--nc-surface-solid)] hover:bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] text-cyan-400 text-xs font-bold rounded-xl transition-all"
                  >
                    حجز موعد زيارة العقار
                  </button>
                </div>
              </div>
            </div>

            {/* الوصف المختصر */}
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-[var(--nc-foreground)]">تفاصيل ووصف إضافي للعرض:</h4>
              <p className="text-xs text-[var(--nc-foreground-muted)] font-medium leading-relaxed bg-[var(--nc-surface)] p-3.5 rounded-xl border border-[var(--nc-border)]">
                {selectedProp.description}
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-6 py-2.5 bg-[var(--nc-surface-solid)] hover:bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] text-xs font-bold rounded-xl transition-all"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. حاسبة التمويل السكني Modal */}
      {activeModal === 'mortgage' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <div className="relative bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs">
            
            <div className="flex items-center justify-between border-b border-[var(--nc-border)] pb-3">
              <h3 className="text-sm font-black text-[var(--nc-foreground)] flex items-center gap-2">
                <Calculator size={16} className="text-[var(--nc-text-secondary)]" />
                <span>حاسبة التمويل السكني التفاعلية</span>
              </h3>
              <span className="text-xs text-[var(--nc-foreground-muted)] bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] text-[var(--nc-text-secondary)] px-2 py-0.5 rounded font-bold font-mono">
                PI Calc
              </span>
            </div>

            <div className="space-y-3.5">
              
              <div className="space-y-1">
                <label className="text-[var(--nc-foreground-muted)] font-bold">سعر العقار المطلوب (ر.س)</label>
                <input
                  type="number"
                  value={mPrice}
                  onChange={(e) => setMPrice(Number(e.target.value))}
                  className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)] font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--nc-foreground-muted)] font-bold">الدفعة الأولى (%)</label>
                  <input
                    type="number"
                    value={mDown}
                    onChange={(e) => setMDown(Number(e.target.value))}
                    className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--nc-foreground-muted)] font-bold">مبلغ التمويل المتبقي</label>
                  <div className="bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 font-bold font-mono text-[var(--nc-foreground-muted)] leading-snug">
                    {(mPrice * (1 - mDown / 100)).toLocaleString()} ر.س
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--nc-foreground-muted)] font-bold">مدة القرض (سنوات)</label>
                  <input
                    type="number"
                    value={mTerm}
                    onChange={(e) => setMTerm(Number(e.target.value))}
                    className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--nc-foreground-muted)] font-bold">نسبة الفائدة السنوية (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={mRate}
                    onChange={(e) => setMRate(Number(e.target.value))}
                    className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)] font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleGlobalMortgageCalc}
                className="w-full py-2.5 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-[var(--nc-foreground)] text-xs font-bold rounded-xl transition-all"
              >
                تحديث وحساب القسط الشهري
              </button>

              {monthlyInstallment !== null && (
                <div className="bg-[var(--nc-surface-solid)] p-4 rounded-xl border border-[var(--nc-border)] text-center space-y-1 bg-gradient-to-b from-slate-950 to-slate-900 shadow-inner">
                  <p className="text-xs text-[var(--nc-foreground-muted)] text-[var(--nc-foreground-muted)] font-bold">القسط الشهري التقريبي (أصل وقروض)</p>
                  <p className="text-lg font-black text-cyan-400 font-mono">
                    {monthlyInstallment.toLocaleString()} ر.س / شهرياً
                  </p>
                  <p className="text-[9px] text-[var(--nc-foreground-muted)] leading-tight">هذه الحسبة تقديرية وتعتمد على الملف الائتماني والجهات التمويلية الشريكة.</p>
                </div>
              )}

            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-[var(--nc-border)]">
              <button
                onClick={() => {
                  toast.success('');
                  setActiveModal(null);
                }}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-[var(--nc-foreground)] text-xs font-bold rounded-xl transition-all"
              >
                تأكيد وإرسال للشركاء
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 bg-[var(--nc-surface-solid)] hover:bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] rounded-xl transition-all"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. إضافة عرض جديد Modal */}
      {activeModal === 'create_listing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <div className="relative bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl text-right text-xs">
            
            <div className="flex items-center justify-between border-b border-[var(--nc-border)] pb-3">
              <h3 className="text-sm font-black text-[var(--nc-foreground)] flex items-center gap-2">
                <Megaphone size={16} className="text-[var(--nc-text-secondary)]" />
                <span>إدراج وتسجيل عرض عقاري جديد</span>
              </h3>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-3">
              
              <div className="space-y-1">
                <label className="text-[var(--nc-foreground-muted)] font-bold">العنوان التعريفي للعرض *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: فيلا فاخرة مودرن حي الصحافة"
                  className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--nc-foreground-muted)] font-bold">النوع *</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)]"
                  >
                    <option value="apartment">شقة سكنية</option>
                    <option value="villa">فيلا مستقلة</option>
                    <option value="land">أرض فضاء</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--nc-foreground-muted)] font-bold">الحالة *</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)]"
                  >
                    <option value="available">متاح</option>
                    <option value="reserved">محجوز مؤقت</option>
                    <option value="sold">مباع</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--nc-foreground-muted)] font-bold">القيمة (ر.س) *</label>
                  <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 1200000"
                    className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--nc-foreground-muted)] font-bold">المساحة (م²) *</label>
                  <input
                    type="number"
                    required
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 320"
                    className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--nc-foreground-muted)] font-bold">غرف النوم</label>
                  <input
                    type="number"
                    value={newBeds}
                    onChange={(e) => setNewBeds(Number(e.target.value))}
                    placeholder="مثال: 4"
                    className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--nc-foreground-muted)] font-bold">المدينة *</label>
                  <input
                    type="text"
                    required
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--nc-foreground-muted)] font-bold">الحي *</label>
                  <input
                    type="text"
                    required
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    placeholder="مثال: الصحافة"
                    className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[var(--nc-foreground-muted)] font-bold">الوكيل المسؤول أو المكتب *</label>
                <input
                  type="text"
                  required
                  value={newAgent}
                  onChange={(e) => setNewAgent(e.target.value)}
                  placeholder="مثال: شركة التطوير العقاري المعتمدة"
                  className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[var(--nc-foreground-muted)] font-bold">الوصف والتفاصيل</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="تفاصيل إضافية عن الموقع والمميزات..."
                  className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none focus:border-[var(--nc-accent-border)] text-xs resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-[var(--nc-border)]">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-[var(--nc-foreground)] text-xs font-bold rounded-xl transition-all"
                >
                  إدراج العرض ونشره
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 bg-[var(--nc-surface-solid)] hover:bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] rounded-xl transition-all"
                >
                  إلغاء
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 4. حجز موعد زيارة Modal */}
      {activeModal === 'schedule_visit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <div className="relative bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl text-right text-xs">
            
            <div className="flex items-center justify-between border-b border-[var(--nc-border)] pb-2">
              <h3 className="text-sm font-black text-[var(--nc-foreground)] flex items-center gap-2">
                <Calendar size={16} className="text-[var(--nc-text-secondary)]" />
                <span>حجز موعد زيارة عقار ميدانية</span>
              </h3>
            </div>

            <form onSubmit={handleScheduleVisit} className="space-y-3.5">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--nc-foreground-muted)] font-bold">التاريخ المطلوب *</label>
                  <DateField
                    value={visitDate}
                    onChange={(val) => setVisitDate(val)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--nc-foreground-muted)] font-bold">الوقت المفضل *</label>
                  <select
                    value={visitTime}
                    onChange={(e) => setVisitTime(e.target.value)}
                    className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none font-mono text-center"
                  >
                    <option value="09:00">09:00 صباحاً</option>
                    <option value="10:00">10:00 صباحاً</option>
                    <option value="11:00">11:00 صباحاً</option>
                    <option value="16:00">04:00 مساءً</option>
                    <option value="17:00">05:00 مساءً</option>
                    <option value="18:00">06:00 مساءً</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[var(--nc-foreground-muted)] font-bold">اسم العميل بالكامل *</label>
                <input
                  type="text"
                  required
                  value={visitName}
                  onChange={(e) => setVisitName(e.target.value)}
                  placeholder="مثال: فهد الحربي"
                  className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[var(--nc-foreground-muted)] font-bold">رقم الجوال للتواصل *</label>
                <input
                  type="text"
                  required
                  value={visitPhone}
                  onChange={(e) => setVisitPhone(e.target.value)}
                  placeholder="مثال: 050XXXXXXX"
                  className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none text-left font-mono"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[var(--nc-foreground-muted)] font-bold">ملاحظات أو استفسارات خاصة</label>
                <textarea
                  rows={2}
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none text-xs resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-[var(--nc-border)]">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-[var(--nc-foreground)] text-xs font-bold rounded-xl transition-all"
                >
                  حجز الموعد وتأكيد الطلب
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('details')}
                  className="px-4 py-2.5 bg-[var(--nc-surface-solid)] hover:bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] rounded-xl transition-all"
                >
                  العودة
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 5. تواصل مع الوكيل Modal */}
      {activeModal === 'contact_agent' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <div className="relative bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl text-right text-xs">
            
            <div className="flex items-center justify-between border-b border-[var(--nc-border)] pb-2">
              <h3 className="text-sm font-black text-[var(--nc-foreground)] flex items-center gap-2">
                <MessageSquare size={16} className="text-[var(--nc-text-secondary)]" />
                <span>إرسال استفسار مباشر للوكيل العقاري</span>
              </h3>
            </div>

            <form onSubmit={handleContactAgent} className="space-y-3.5">
              
              <div className="space-y-1">
                <label className="text-[var(--nc-foreground-muted)] font-bold">اسم العميل *</label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="مثال: خالد المطيري"
                  className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--nc-foreground-muted)] font-bold">رقم الجوال للتواصل *</label>
                  <input
                    type="text"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="050XXXXXXX"
                    className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none text-left font-mono"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--nc-foreground-muted)] font-bold">رقم الواتساب</label>
                  <input
                    type="text"
                    value={contactWhatsApp}
                    onChange={(e) => setContactWhatsApp(e.target.value)}
                    placeholder="050XXXXXXX"
                    className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none text-left font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[var(--nc-foreground-muted)] font-bold">نص الاستفسار</label>
                <textarea
                  rows={2}
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  placeholder="أنا مهتم بهذا العقار وأرغب في الحصول على تفاصيل إضافية..."
                  className="w-full bg-[var(--nc-surface-solid)] border border-[var(--nc-border)] rounded-xl p-2.5 text-[var(--nc-foreground)] outline-none text-xs resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-[var(--nc-border)]">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-[var(--nc-foreground)] text-xs font-bold rounded-xl transition-all"
                >
                  إرسال الطلب الآن
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('details')}
                  className="px-4 py-2.5 bg-[var(--nc-surface-solid)] hover:bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] rounded-xl transition-all"
                >
                  العودة
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </>
  );
}







