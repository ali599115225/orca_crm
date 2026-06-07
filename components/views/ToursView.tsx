// components/views/ToursView.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Heart, Eye, Calculator, Calendar, ArrowRight, UserCheck, Play,
  Settings, Bot, Sparkles, FileText, CheckCircle2, AlertCircle, X, ShieldAlert,
  Flame, Monitor, BookOpen
} from 'lucide-react';
import { DateField } from '../ui/DateField';
import { LayoutContainer } from '../ui/LayoutContainer';
import { TOURS_CONFIG, ToursConfigType } from '@/lib/tours-config';

import { getPropertiesAction } from '@/app/actions/properties';
import { scheduleTourActionDirect } from '@/app/actions/tours';

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface PropertyTour {
  id: string;
  title: string;
  type: 'apartment' | 'villa' | 'land';
  status: 'available' | 'reserved' | 'under_review' | 'sold';
  price: number;
  beds: number;
  area: number;
  city: string;
  district: string;
  agent: string;
  posted: string; // YYYY-MM-DD
  coords: { lat: number; lng: number };
  description: string;
  media: string[];
  needsDetailedView: boolean;
  dataCompleteness: number; // 0.0 - 1.0
  tourType: 'video' | '360';
  tourUrl: string;
}

// ─── Mock Database ──────────────────────────────────────────────────────────
const initialProperties: PropertyTour[] = [
  {
    id: 'T-001',
    title: 'شقة الياسمين الذكية - جولة 360',
    type: 'apartment',
    status: 'available',
    price: 1100000,
    beds: 3,
    area: 130,
    city: 'الرياض',
    district: 'الياسمين',
    agent: 'المستشار رائد الغامدي',
    posted: '2026-05-15',
    coords: { lat: 24.7921, lng: 46.6432 },
    description: 'شقة بنظام سمارت كامل تشمل الإضاءة والتكييف، واجهة شمالية تطل على حديقة الحي، تشطيبات مودرن ممتازة ومطبخ راكب.',
    media: ['https://picsum.photos/seed/tour1/400/300'],
    needsDetailedView: false,
    dataCompleteness: 0.95,
    tourType: '360',
    tourUrl: 'https://vinc360.com/sample'
  },
  {
    id: 'T-002',
    title: 'فيلا قرطبة الكلاسيكية - فيديو',
    type: 'villa',
    status: 'available',
    price: 4200000,
    beds: 5,
    area: 400,
    city: 'الرياض',
    district: 'قرطبة',
    agent: 'المستشار فواز الشهري',
    posted: '2026-05-12',
    coords: { lat: 24.811, lng: 46.721 },
    description: 'فيلا كلاسيكية رائعة تقع في زاوية ممتازة بحي قرطبة، حوش واسع يتسع لثلاث سيارات، ملحق خارجي، ومجالس ضيافة منفصلة.',
    media: ['https://picsum.photos/seed/tour2/400/300'],
    needsDetailedView: false,
    dataCompleteness: 0.9,
    tourType: 'video',
    tourUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
  },
  {
    id: 'T-003',
    title: 'شقة الملقا الفاخرة - بدون ميديا',
    type: 'apartment',
    status: 'available',
    price: 1800000,
    beds: 3,
    area: 160,
    city: 'الرياض',
    district: 'الملقا',
    agent: 'المستشار عبدالرحمن العتيبي',
    posted: '2026-05-20',
    coords: { lat: 24.781, lng: 46.611 },
    description: 'شقة دوبلكس واسعة في موقع استراتيجي بحي الملقا قريبة من طريق الملك سلمان، لم ترفع لها ميديا بعد للتحديث الجاري.',
    media: [], // No Media -> Force Modal
    needsDetailedView: false,
    dataCompleteness: 0.85,
    tourType: '360',
    tourUrl: ''
  },
  {
    id: 'T-004',
    title: 'فيلا الغدير - سعر غير معرف',
    type: 'villa',
    status: 'available',
    price: 0, // Price = 0 -> Force Modal
    beds: 4,
    area: 380,
    city: 'الرياض',
    district: 'الغدير',
    agent: 'المستشار صالح الدوسري',
    posted: '2026-05-18',
    coords: { lat: 24.765, lng: 46.654 },
    description: 'فيلا ممتازة في حي الغدير الهادئ، تم الانتهاء من ترميمها بالكامل وجاري تقدير السعر النهائي بالتعاون مع المالك.',
    media: ['https://picsum.photos/seed/tour4/400/300'],
    needsDetailedView: false,
    dataCompleteness: 0.9,
    tourType: 'video',
    tourUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
  },
  {
    id: 'T-005',
    title: 'بنتهاوس النرجس - reserved',
    type: 'apartment',
    status: 'reserved', // Status reserved -> Force Modal
    price: 2100000,
    beds: 4,
    area: 220,
    city: 'الرياض',
    district: 'النرجس',
    agent: 'المستشار سعود السديري',
    posted: '2026-05-01',
    coords: { lat: 24.832, lng: 46.687 },
    description: 'شقة بنتهاوس رائعة مع سطح مستقل ومسبح إسكواش خاص، تم حجزها مؤقتاً لعميل قيد استخراج التمويل العقاري.',
    media: ['https://picsum.photos/seed/tour5/400/300'],
    needsDetailedView: false,
    dataCompleteness: 0.92,
    tourType: '360',
    tourUrl: 'https://vinc360.com/sample'
  },
  {
    id: 'T-006',
    title: 'دوبلكس التعاون - اكتمال منخفض',
    type: 'apartment',
    status: 'available',
    price: 1550000,
    beds: 3,
    area: 180,
    city: 'الرياض',
    district: 'التعاون',
    agent: 'المستشار بدر الرشيد',
    posted: '2026-05-22',
    coords: { lat: 24.778, lng: 46.702 },
    description: 'دوبلكس متميز بتصميم أوروبي مودرن، تنقصه بعض المستندات وشهادة الإتمام، لذا فإن نسبة اكتمال البيانات منخفضة.',
    media: ['https://picsum.photos/seed/tour6/400/300'],
    needsDetailedView: false,
    dataCompleteness: 0.7, // Completeness 0.7 < 0.8 -> Force Modal
    tourType: 'video',
    tourUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
  },
  {
    id: 'T-007',
    title: 'فيلا حطين - force modal',
    type: 'villa',
    status: 'available',
    price: 5600000,
    beds: 6,
    area: 500,
    city: 'الرياض',
    district: 'حطين',
    agent: 'المستشار عمر النفيعي',
    posted: '2026-05-25',
    coords: { lat: 24.756, lng: 46.598 },
    description: 'فيلا قصور فاخرة جداً ذات مواصفات خاصة، تم تحديد خيار force modal لمراجعة الهوية ومستندات العميل بدقة قبل الإفصاح.',
    media: ['https://picsum.photos/seed/tour7/400/300'],
    needsDetailedView: true, // needsDetailedView true -> Force Modal
    dataCompleteness: 0.98,
    tourType: '360',
    tourUrl: 'https://vinc360.com/sample'
  }
];

export default function ToursView() {
  const [properties, setProperties] = useState<PropertyTour[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [inlinePropertyId, setInlinePropertyId] = useState<string | null>(null);
  const [toursLoading, setToursLoading] = useState(true);
  const [toursError, setToursError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTours() {
      setToursLoading(true);
      try {
        const data = await getPropertiesAction();
        if (data && data.length > 0) {
          const mapped: PropertyTour[] = data.map((u: any) => ({
            id: u.id,
            title: u.sku || `${u.type} - ${u.district || ''}`.trim(),
            type: (u.type === 'فيلا' || u.type === 'villa') ? 'villa' : u.type === 'أرض' || u.type === 'land' ? 'land' : 'apartment',
            status: (u.status === 'Available' ? 'available' : u.status === 'Sold' ? 'sold' : u.status === 'Hold' ? 'reserved' : 'under_review') as any,
            price: u.price,
            beds: u.beds || 3,
            area: parseInt(u.area) || 100,
            city: u.city || 'الرياض',
            district: u.district || 'غير محدد',
            agent: u.agentName || 'غير معين',
            posted: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '2026-01-01',
            coords: { lat: u.lat || 24.7, lng: u.lng || 46.7 },
            description: u.desc || '',
            media: u.media?.length ? u.media : ['https://picsum.photos/seed/tour/400/300'],
            needsDetailedView: false,
            dataCompleteness: 0.9,
            tourType: (u.tourType === 'video' ? 'video' : '360') as 'video' | '360',
            tourUrl: u.tourUrl || '',
          }));
          setProperties(mapped);
        } else {
          setProperties(initialProperties);
        }
      } catch (err) {
        setToursError('تعذر تحميل الجولات من قاعدة البيانات');
        setProperties(initialProperties);
      } finally {
        setToursLoading(false);
      }
    }
    loadTours();
  }, []);

  // Dynamic Rule Threshold Flags
  const [config, setConfig] = useState<ToursConfigType>(TOURS_CONFIG);

  // Filters State
  const [searchVal, setSearchVal] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [bedsFilter, setBedsFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState<number | ''>('');
  const [sortVal, setSortVal] = useState('relevance');

  // Form States (Visit Scheduling)
  const [visitDate, setVisitDate] = useState(''); // YYYY-MM-DD
  const [visitTime, setVisitTime] = useState('11:00');
  const [visitName, setVisitName] = useState('');
  const [visitPhone, setVisitPhone] = useState('');

  // Form States (Mortgage Calculator)
  const [mortgagePrice, setMortgagePrice] = useState(800000);
  const [mortgageDownPct, setMortgageDownPct] = useState(20);
  const [mortgageTermYears, setMortgageTermYears] = useState(25);
  const [mortgageRatePct, setMortgageRatePct] = useState(4.5);
  const [calculatedInstallment, setCalculatedInstallment] = useState<number | null>(null);

  // Telemetry Console Logger
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([
    {
      id: 'evt_init',
      type: 'tours.initialized',
      timestamp: new Date().toISOString(),
      payload: { message: 'تهيئة منصة الجولات العقارية التفاعلية وقواعد الفلترة الذكية' }
    }
  ]);

  const addTelemetryEvent = (type: string, payload: any) => {
    const newEvt = {
      id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      timestamp: new Date().toISOString(),
      payload
    };
    setTelemetryLogs(prev => [newEvt, ...prev]);
  };

  // Keyboard accessibility handler for Modal (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync Body scroll-lock when Modal is open
  useEffect(() => {
    if (activeModal && activeModal !== 'settings_flag') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeModal]);

  // Display Mode Decision Maker Function
  const determineDisplayMode = (property: PropertyTour): 'modal' | 'inline' => {
    // 1. Lack of media (requireMedia checks)
    if (config.requireMedia && (!property.media || property.media.length === 0)) {
      return 'modal';
    }
    // 2. Price is undefined or zero
    if (property.price === undefined || property.price <= 0) {
      return 'modal';
    }
    // 3. Status is reserved or under_review
    if (config.forceModalStatuses.includes(property.status)) {
      return 'modal';
    }
    // 4. needsDetailedView is true
    if (property.needsDetailedView === true) {
      return 'modal';
    }
    // 5. Completeness below config limit
    if (property.dataCompleteness !== undefined && property.dataCompleteness < config.minDataCompleteness) {
      return 'modal';
    }

    return 'inline';
  };

  // Trigger click handlers for listings
  const handlePropertySelection = (property: PropertyTour) => {
    const mode = determineDisplayMode(property);
    setSelectedPropertyId(property.id);

    // Call REST analytics endpoints simulation
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: mode === 'modal' ? 'property.view_modal' : 'tour.viewed',
        payload: {
          propertyId: property.id,
          reason: mode === 'modal' ? 'Threshold criteria force modal' : 'Inline view triggered'
        }
      })
    }).catch(err => console.error(err));

    addTelemetryEvent(mode === 'modal' ? 'property.view_modal' : 'tour.viewed', {
      propertyId: property.id,
      title: property.title,
      price: property.price,
      completeness: property.dataCompleteness,
      status: property.status,
      displayMode: mode
    });

    if (mode === 'modal') {
      setInlinePropertyId(null);
      setActiveModal('details');
    } else {
      setInlinePropertyId(property.id);
    }
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    fetch(`/api/properties/${id}/favorite`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setFavorites(prev => {
          const exists = prev.includes(id);
          const updated = exists ? prev.filter(x => x !== id) : [...prev, id];
          addTelemetryEvent(exists ? 'offer.favorite_removed' : 'offer.favorite_added', { propertyId: id });
          return updated;
        });
      })
      .catch(err => console.error(err));
  };

  const handleMortgagePrefill = (property: PropertyTour, e: React.MouseEvent) => {
    e.stopPropagation();
    setMortgagePrice(property.price > 0 ? property.price : 1000000);
    setMortgageDownPct(20);
    setMortgageTermYears(25);
    setMortgageRatePct(4.5);
    
    const initialInstallment = calculateMortgageVal(
      property.price > 0 ? property.price : 1000000,
      20,
      25,
      4.5
    );
    setCalculatedInstallment(initialInstallment);
    setActiveModal('mortgage');

    addTelemetryEvent('mortgage.modal_prefilled', {
      propertyId: property.id,
      price: property.price,
      downPct: 20
    });
  };

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

  const updateCalculations = () => {
    const val = calculateMortgageVal(mortgagePrice, mortgageDownPct, mortgageTermYears, mortgageRatePct);
    setCalculatedInstallment(val);
    addTelemetryEvent('mortgage.calculated', {
      price: mortgagePrice,
      downPct: mortgageDownPct,
      installment: val
    });
  };

  const submitTourSchedule = async (e: React.FormEvent, propId: string) => {
    e.preventDefault();
    if (!visitName || !visitPhone || !visitDate) {
      alert('يرجى ملء جميع حقول الحجز المطلوبة.');
      return;
    }

    try {
      const res = await scheduleTourActionDirect({
        propertyId: propId,
        userName: visitName,
        phone: visitPhone,
        datetime: `${visitDate}T${visitTime}`
      });

      if (res.success) {
        addTelemetryEvent('tour.requested', {
          propertyId: propId,
          userName: visitName,
          phone: visitPhone,
          datetime: `${visitDate}T${visitTime}`
        });

        alert(`تم تأكيد حجز الجولة بنجاح!\nالموعد: ${visitDate.split('-').reverse().join('/')} الساعة ${visitTime}\nسيصلك إشعار بالرسائل الموحدة قريباً.`);
        setActiveModal(null);
        setVisitName('');
        setVisitPhone('');
      } else {
        alert('فشل حجز الجولة: ' + res.error);
      }
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ في عملية الإرسال: ' + err.message);
    }
  };

  // Filter listings
  const filteredListings = properties.filter(p => {
    const matchSearch = !searchVal || (p.title + ' ' + p.city + ' ' + p.district + ' ' + p.id).toLowerCase().includes(searchVal.toLowerCase());
    const matchType = !typeFilter || p.type === typeFilter;
    const matchStatus = !statusFilter || p.status === statusFilter;
    const matchMinPrice = minPrice === '' || p.price >= minPrice;
    const matchMaxPrice = maxPrice === '' || p.price <= maxPrice;
    const matchBeds = !bedsFilter || p.beds >= Number(bedsFilter);
    const matchArea = areaFilter === '' || p.area >= areaFilter;
    return matchSearch && matchType && matchStatus && matchMinPrice && matchMaxPrice && matchBeds && matchArea;
  });

  // Sort listings
  if (sortVal === 'price_asc') {
    filteredListings.sort((a, b) => a.price - b.price);
  } else if (sortVal === 'price_desc') {
    filteredListings.sort((a, b) => b.price - a.price);
  } else if (sortVal === 'newest') {
    filteredListings.sort((a, b) => new Date(b.posted).getTime() - new Date(a.posted).getTime());
  }

  const selectedProp = properties.find(x => x.id === selectedPropertyId);
  const inlineProp = properties.find(x => x.id === inlinePropertyId);

  return (
    <>
      {/* ─── Loading / Error ───────────────────────────── */}
      {toursLoading && (
        <div className="nc-glass p-6 flex items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent animate-spin"></div>
          <span className="text-sm text-slate-400">جاري تحميل الجولات من قاعدة البيانات...</span>
        </div>
      )}
      {toursError && !toursLoading && (
        <div className="nc-glass p-6 flex items-center justify-center gap-3">
          <p className="text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '8px 16px' }}>{toursError}</p>
          <button onClick={() => window.location.reload()} className="nc-btn nc-btn-ghost nc-btn-sm">إعادة المحاولة</button>
        </div>
      )}

      {/* ─── Page Header ───────────────────────────── */}
      <div className="flex items-center justify-between px-6 md:px-8 pt-6 pb-2">
        <div>
          <h1 className="text-2xl font-semibold text-white text-lg">الجولات العقارية</h1>
          <p className="text-sm text-slate-400 mt-1">تصفح الجولات التفاعلية المباشرة، وحلّل طرق العرض وسلوكيات الحجز الفوري لعملائك.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveModal('settings_flag')}
            className="nc-btn nc-btn-ghost nc-btn-sm"
          >
            <Settings size={15} />
            قواعد العرض (Feature Flags)
          </button>
        </div>
      </div>

      <LayoutContainer
        kpis={null}
        actions={
          <div className="space-y-4">
            {/* البحث وتصفية الجولات */}
            <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-white/5 pb-2">البحث وتصفية الجولات</h3>
            
            <div className="space-y-3.5 text-xs">
              
              <div className="space-y-1">
                <label className="text-[var(--nc-text-dim)] font-medium font-bold">بحث</label>
                <input
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="ابحث بحي، مدينة، أو ID..."
                  className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--nc-accent-border)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[var(--nc-text-dim)] font-medium font-bold">النوع</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl px-2 py-2 text-xs text-white outline-none"
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
                    className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl px-2 py-2 text-xs text-white outline-none"
                  >
                    <option value="">الكل</option>
                    <option value="available">متاح</option>
                    <option value="reserved">محجوز</option>
                    <option value="under_review">قيد المراجعة</option>
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
                    className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl px-2 py-1.5 text-center text-xs text-white outline-none"
                  />
                  <span className="text-[var(--nc-text-dim)] font-medium">—</span>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="إلى"
                    className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl px-2 py-1.5 text-center text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[var(--nc-text-dim)] font-medium font-bold">غرف النوم</label>
                  <select
                    value={bedsFilter}
                    onChange={(e) => setBedsFilter(e.target.value)}
                    className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl px-2 py-2 text-xs text-white outline-none font-mono"
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
                  <input
                    type="number"
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 150"
                    className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl px-2 py-1.5 text-center text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => {
                    addTelemetryEvent('tours.filters_applied', { searchVal, typeFilter, statusFilter, minPrice, maxPrice });
                  }}
                  className="flex-1 py-2 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white font-bold rounded-xl transition-all"
                >
                  تطبيق الفلاتر
                </button>
                <button
                  onClick={() => {
                    setSearchVal('');
                    setTypeFilter('');
                    setStatusFilter('');
                    setMinPrice('');
                    setMaxPrice('');
                    setBedsFilter('');
                    setAreaFilter('');
                    addTelemetryEvent('tours.filters_cleared', {});
                  }}
                  className="px-3 py-2 bg-[var(--nc-surface-solid)] hover:bg-[var(--nc-surface-solid)] border border-white/10 text-[var(--nc-text-dim)] font-medium rounded-xl transition-all"
                >
                  مسح
                </button>
              </div>

            </div>
            </div>
          </div>
        }
        insights={
          <div className="space-y-4">
            {/* الجولات المحفوظة */}
            <div className="bg-[var(--nc-surface-solid)] border border-white/5 rounded-2xl p-5 space-y-3">
              <h3 className="text-lg font-semibold text-white border-b border-white/5 pb-2">الجولات المحفوظة</h3>
              <div className="space-y-2">
                {favorites.length === 0 ? (
                  <p className="text-xs text-slate-500 text-[var(--nc-text-dim)] font-medium py-1 text-center">لا توجد جولات محفوظة</p>
                ) : (
                  favorites.map(fid => {
                    const p = properties.find(x => x.id === fid);
                    if (!p) return null;
                    return (
                      <div
                        key={fid}
                        onClick={() => handlePropertySelection(p)}
                        className="flex justify-between items-center p-2 bg-[var(--nc-surface)] rounded-xl border border-white/5 hover:border-[var(--nc-accent-border)]/35 transition-all text-xs text-slate-500 cursor-pointer"
                      >
                        <span className="text-white truncate max-w-[130px] font-semibold">{p.title}</span>
                        <span className="text-rose-500 font-bold shrink-0">❤️</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        }
        details={
          <div className="space-y-6">
            {/* التحكم العلوي للشبكة */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-[var(--nc-surface-solid)] border border-white/5 p-3 rounded-2xl shadow-md text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[var(--nc-text-dim)] font-medium">الجولات المطابقة:</span>
                <strong className="text-white bg-[var(--nc-surface-solid)] px-2 py-0.5 rounded border border-white/5 font-mono text-sm">
                  {filteredListings.length}
                </strong>
                <select
                  value={sortVal}
                  onChange={(e) => setSortVal(e.target.value)}
                  className="bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white outline-none font-bold mr-2"
                >
                  <option value="relevance">الأكثر صلة</option>
                  <option value="price_asc">الأقل سعراً</option>
                  <option value="price_desc">الأعلى سعراً</option>
                  <option value="newest">الأحدث</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 text-[var(--nc-text-dim)] font-medium flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>عرض Inline</span>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 mr-2"></span>
              <span>عرض Modal (إلزامي للوحدات المحدودة/المنقوصة)</span>
            </div>
          </div>

          {/* شبكة الجولات مع تقييد التمدد */}
          <div className="max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {filteredListings.length === 0 ? (
              <div className="bg-[var(--nc-surface-solid)] border border-dashed border-white/10 rounded-3xl p-12 text-center text-[var(--nc-text-dim)] font-medium">
                لا توجد جولات مطابقة لشروط الفلترة الحالية.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredListings.map(p => {
                  const isFav = favorites.includes(p.id);
                  const mode = determineDisplayMode(p);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handlePropertySelection(p)}
                      className={`group bg-[var(--nc-surface-solid)] border rounded-2xl overflow-hidden hover:-translate-y-1 transform transition-all duration-300 cursor-pointer shadow-lg flex flex-col h-full ${
                        inlinePropertyId === p.id 
                          ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                          : 'border-white/5 hover:border-[var(--nc-accent-border)]/40'
                      }`}
                    >
                      {/* الميديا */}
                      <div className="h-40 bg-[var(--nc-surface-solid)] relative flex items-center justify-center overflow-hidden shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10" />
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(var(--nc-accent-border) 1px,transparent 1px)] [background-size:16px_16px]" />
                        {p.media && p.media.length > 0 ? (
                          <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${p.media[0]})` }} />
                        ) : (
                          <span className="z-10 text-xs text-slate-500 text-[var(--nc-text-dim)] font-medium font-bold bg-[var(--nc-surface-solid)] px-3 py-1 rounded-full">لا توجد وسائط متوفرة</span>
                        )}
                        <div className="absolute top-3 right-3 z-20 flex gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shadow-sm ${
                            mode === 'inline' 
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                              : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                          }`}>
                            {mode === 'inline' ? 'عرض تفصيلي Inline' : 'عرض منبثق Modal'}
                          </span>
                        </div>
                        <div className="absolute top-3 left-3 z-20">
                          <button
                            onClick={(e) => handleToggleFavorite(p.id, e)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isFav ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-[var(--nc-surface-solid)]/80 border-white/5 text-[var(--nc-text-dim)] font-medium hover:text-rose-400'
                            }`}
                          >
                            <Heart size={12} className={isFav ? 'fill-rose-500' : ''} />
                          </button>
                        </div>
                        {p.tourType === '360' ? (
                          <span className="absolute bottom-3 right-3 z-20 bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">جولة 360°</span>
                        ) : (
                          <span className="absolute bottom-3 right-3 z-20 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">فيديو HD</span>
                        )}
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
                          <div><p>اكتمال البيانات</p><p className={`font-bold font-mono ${p.dataCompleteness >= 0.8 ? 'text-emerald-400' : 'text-amber-400'}`}>{Math.round(p.dataCompleteness * 100)}%</p></div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                          <div>
                            <p className="text-[9px] text-[var(--nc-text-dim)] font-medium">السعر المطلوب</p>
                            <p className="font-black text-[var(--nc-text-secondary)] text-xs font-mono">{p.price > 0 ? `${p.price.toLocaleString()} ر.س` : 'غير محدد'}</p>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={(e) => handleMortgagePrefill(p, e)} className="px-2 py-1 bg-[var(--nc-surface-solid)] hover:bg-[var(--nc-surface-solid)] border border-white/10 text-[var(--nc-text-secondary)] text-xs text-slate-500 font-bold rounded-lg transition-all">تمويل</button>
                            <button onClick={(e) => { e.stopPropagation(); handlePropertySelection(p); }} className="px-2 py-1 bg-[var(--nc-accent-soft)] hover:bg-[var(--nc-accent-hover)] text-[var(--nc-text-secondary)] hover:text-white text-xs text-slate-500 font-bold rounded-lg transition-all">تفاصيل</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* تفاصيل العقار Inline */}
          {inlineProp && (
            <div className="bg-[var(--nc-surface-solid)] border border-emerald-500/20 rounded-2xl p-4 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h4 className="text-lg font-semibold text-white flex items-center gap-1.5">
                  <Monitor size={13} className="text-emerald-400 animate-pulse" />
                  <span>تفاصيل الجولة (عرض Inline)</span>
                </h4>
                <button onClick={() => setInlinePropertyId(null)} className="text-[var(--nc-text-dim)] font-medium hover:text-white"><X size={14} /></button>
              </div>
              <div className="space-y-3.5 text-xs">
                <h3 className="font-black text-white text-sm">{inlineProp.title}</h3>
                <div className="h-44 bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl relative overflow-hidden flex items-center justify-center">
                  {inlineProp.tourType === 'video' ? (
                    <video src={inlineProp.tourUrl} controls className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center space-y-1.5 p-3">
                      <span className="text-xs text-slate-500 bg-purple-500/10 border border-purple-500/25 text-purple-400 px-2 py-0.5 rounded-full font-bold">جولة 360° نشطة</span>
                      <p className="text-[9px] text-[var(--nc-text-dim)] font-medium">انقر لتشغيل البيئة الافتراضية والتحرك داخل الغرف</p>
                      <a href={inlineProp.tourUrl} target="_blank" rel="noreferrer" className="inline-block mt-2 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs text-slate-500 font-bold">فتح الجولة في نافذة جديدة</a>
                    </div>
                  )}
                </div>
                <ul className="space-y-2 text-[var(--nc-text-dim)] font-medium text-xs text-slate-500 bg-[var(--nc-surface)] p-3 rounded-xl border border-white/5">
                  <li className="flex justify-between"><span>الرقم المرجعي (ID):</span><span className="font-mono text-white font-bold">{inlineProp.id}</span></li>
                  <li className="flex justify-between"><span>المساحة:</span><span className="font-mono text-white font-bold">{inlineProp.area} م²</span></li>
                  <li className="flex justify-between"><span>السعر المطلـوب:</span><span className="font-mono text-[var(--nc-text-secondary)] font-black">{inlineProp.price.toLocaleString()} ر.س</span></li>
                  <li className="flex justify-between"><span>الوكيل المسؤول:</span><span className="text-white font-bold">{inlineProp.agent}</span></li>
                </ul>
                <div className="space-y-3">
                  <h5 className="font-semibold text-white text-lg border-b border-white/5 pb-1">نموذج حجز الجولة العقارية</h5>
                  <form onSubmit={(e) => submitTourSchedule(e, inlineProp.id)} className="space-y-2.5 text-right">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 text-[var(--nc-text-dim)] font-medium font-bold">اسم العميل بالكامل *</label>
                      <input type="text" required value={visitName} onChange={(e) => setVisitName(e.target.value)} placeholder="الاسم" className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2 text-white outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 text-[var(--nc-text-dim)] font-medium font-bold">رقم الجوال للتواصل *</label>
                      <input type="text" required value={visitPhone} onChange={(e) => setVisitPhone(e.target.value)} placeholder="050XXXXXXX" className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2 text-white outline-none text-left font-mono" dir="ltr" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 text-[var(--nc-text-dim)] font-medium font-bold">تاريخ الزيارة *</label>
                        <DateField value={visitDate} onChange={(val) => setVisitDate(val)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 text-[var(--nc-text-dim)] font-medium font-bold">توقيت الزيارة</label>
                        <select value={visitTime} onChange={(e) => setVisitTime(e.target.value)} className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2 text-white outline-none text-center">
                          <option value="09:00">09:00 ص</option>
                          <option value="11:00">11:00 ص</option>
                          <option value="16:00">04:00 م</option>
                          <option value="18:00">06:00 م</option>
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all">تأكيد حجز الجولة الميدانية</button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* شاشة الأحداث الفورية Telemetry Logs */}
          <div className="bg-[var(--nc-surface-solid)] border border-white/5 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                <Bot size={14} className="text-[var(--nc-text-secondary)]" />
                <span>سجل تتبع أحداث الجولات الفورية (Tour Event Telemetry Console)</span>
              </h4>
              <button onClick={() => setTelemetryLogs([])} className="text-xs text-slate-500 text-rose-400 hover:text-rose-300 font-semibold">مسح السجل</button>
            </div>
            <div className="h-32 bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-3 font-mono text-xs text-slate-500 text-[var(--nc-text-dim)] font-medium overflow-y-auto space-y-2 select-text text-left" dir="ltr">
              {telemetryLogs.length === 0 ? (
                <div className="text-center text-[var(--nc-text-dim)] font-medium py-6">No telemetry events logged</div>
              ) : (
                telemetryLogs.map(log => (
                  <div key={log.id} className="p-2 bg-[var(--nc-surface)] rounded border border-white/5 space-y-1">
                    <div className="flex justify-between text-[var(--nc-text-dim)] font-medium border-b border-white/5 pb-1">
                      <span className="text-[var(--nc-text-secondary)] font-bold">{log.type}</span>
                      <span>{log.timestamp}</span>
                    </div>
                    <pre className="text-[9px] text-[var(--nc-text-dim)] font-medium overflow-x-auto whitespace-pre-wrap">{JSON.stringify(log.payload, null, 2)}</pre>
                  </div>
                ))
              )}
            </div>
          </div>
          </div>
        }
      />
      
      {/* ─── Modals Controller ────────────────────── */}
      
      {/* 1. مودال تفاصيل العقار الغني */}
      {activeModal === 'details' && selectedProp && (
        <div className="fixed inset-0 bg-[var(--nc-surface-strong)] backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--nc-surface-solid)] border border-white/10 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl text-right max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-start border-b border-white/5 pb-3">
              <div className="space-y-1">
                <h3 className="text-base font-black text-white">{selectedProp.title}</h3>
                <p className="text-xs text-slate-500 text-[var(--nc-text-dim)] font-medium">📍 {selectedProp.city} · حي {selectedProp.district} · {selectedProp.area} م²</p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-[var(--nc-text-dim)] font-medium hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* مشغل الميديا المدمج بالمودال */}
            <div className="h-64 bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl relative overflow-hidden flex items-center justify-center">
              {selectedProp.media && selectedProp.media.length > 0 ? (
                selectedProp.tourType === 'video' ? (
                  <video src={selectedProp.tourUrl} controls className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center space-y-1.5 p-4 z-20">
                    <span className="text-xs text-slate-500 bg-purple-500/10 border border-purple-500/25 text-purple-400 px-2 py-0.5 rounded-full font-bold">جولة 360° نشطة بالمنظار</span>
                    <p className="text-xs text-slate-500 text-[var(--nc-text-dim)] font-medium">انقر للتنقل الافتراضي داخل الغرف واستعراض المساحات والمرافق.</p>
                    <a href={selectedProp.tourUrl} target="_blank" rel="noreferrer" className="inline-block mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all">فتح معارض المنظار ثلاثي الأبعاد 3D</a>
                  </div>
                )
              ) : (
                <div className="text-center p-4 text-[var(--nc-text-dim)] font-medium">
                  <AlertCircle size={30} className="mx-auto text-amber-500 mb-1.5" />
                  <p className="font-bold text-xs">لا توجد وسائط أو جولات مسجلة لهذه الوحدة</p>
                  <p className="text-xs text-slate-500">يمكنك حجز جولة ميدانية لمشاهدة العقار على أرض الواقع.</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border-b border-white/5 pb-3">
              <div className="space-y-2">
                <h4 className="font-bold text-[var(--nc-text-secondary)] border-b border-white/5 pb-1">المعلومات الأساسية للعقار</h4>
                <ul className="space-y-1.5 text-[var(--nc-text-dim)] font-medium text-xs text-slate-500">
                  <li className="flex justify-between">
                    <span className="text-[var(--nc-text-dim)] font-medium">الرقم المرجعي (ID):</span>
                    <span className="font-mono text-white font-bold">{selectedProp.id}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-[var(--nc-text-dim)] font-medium">المساحة الإجمالية:</span>
                    <span className="font-mono text-white font-bold">{selectedProp.area} م²</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-[var(--nc-text-dim)] font-medium">عدد غرف النوم:</span>
                    <span className="font-mono text-white font-bold">{selectedProp.beds > 0 ? selectedProp.beds : '—'}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-[var(--nc-text-dim)] font-medium">السعر المطلوب:</span>
                    <span className="font-mono text-white font-bold">
                      {selectedProp.price > 0 ? `${selectedProp.price.toLocaleString()} ر.س` : 'غير محدد'}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-[var(--nc-text-dim)] font-medium">الوكيل المسؤول:</span>
                    <span className="text-white font-bold">{selectedProp.agent}</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <h4 className="font-semibold text-white text-lg border-b border-white/5 pb-1">حجز الجولة العقارية</h4>
                <form onSubmit={(e) => submitTourSchedule(e, selectedProp.id)} className="space-y-2 text-right">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={visitName}
                      onChange={(e) => setVisitName(e.target.value)}
                      placeholder="اسم العميل"
                      className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2 text-white outline-none"
                    />
                    <input
                      type="text"
                      required
                      value={visitPhone}
                      onChange={(e) => setVisitPhone(e.target.value)}
                      placeholder="رقم الهاتف"
                      className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2 text-white outline-none text-left font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <DateField
                      value={visitDate}
                      onChange={(val) => setVisitDate(val)}
                    />
                    <select
                      value={visitTime}
                      onChange={(e) => setVisitTime(e.target.value)}
                      className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2 text-white outline-none text-center"
                    >
                      <option value="09:00">09:00 صباحاً</option>
                      <option value="11:00">11:00 صباحاً</option>
                      <option value="16:00">04:00 مساءً</option>
                      <option value="18:00">06:00 مساءً</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all"
                  >
                    تأكيد وحجز الجولة الآن
                  </button>
                </form>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-white">نبذة عن العرض</h4>
              <p className="text-xs text-slate-500 font-medium bg-[var(--nc-surface)] p-3 rounded-xl border border-white/5">
                {selectedProp.description}
              </p>
            </div>

            <div className="flex gap-2 justify-between pt-2">
              <div className="flex gap-2">
                <button
                  onClick={(e) => handleMortgagePrefill(selectedProp, e)}
                  className="px-4 py-2 bg-[var(--nc-surface-solid)] hover:bg-[var(--nc-surface-solid)] border border-white/10 text-[var(--nc-text-secondary)] text-xs font-bold rounded-xl transition-all"
                >
                  احسب تمويل العقار
                </button>
                <button
                  onClick={(e) => {
                    const exists = favorites.includes(selectedProp.id);
                    handleToggleFavorite(selectedProp.id, e);
                  }}
                  className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all ${
                    favorites.includes(selectedProp.id)
                      ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                      : 'bg-[var(--nc-surface-solid)] border-white/10 text-[var(--nc-text-dim)] font-medium'
                  }`}
                >
                  {favorites.includes(selectedProp.id) ? 'محفوظ ❤️' : 'حفظ بالمفضلة'}
                </button>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="px-6 py-2 bg-[var(--nc-surface-solid)] hover:bg-slate-700 text-[var(--nc-text-dim)] font-medium rounded-xl font-bold"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. حاسبة التمويل السكني التلقائية */}
      {activeModal === 'mortgage' && (
        <div className="fixed inset-0 bg-[var(--nc-surface-strong)] backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--nc-surface-solid)] border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-right text-xs">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Calculator size={15} className="text-[var(--nc-text-secondary)]" />
                <span>حاسبة التمويل السكني (حساب فوري محلي)</span>
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-[var(--nc-text-dim)] font-medium hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3.5">
              
              <div className="space-y-1">
                <label className="text-[var(--nc-text-dim)] font-medium font-bold">سعر العقار المطلوب (ر.س)</label>
                <input
                  type="number"
                  value={mortgagePrice}
                  onChange={(e) => setMortgagePrice(Number(e.target.value))}
                  className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[var(--nc-accent-border)] font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--nc-text-dim)] font-medium font-bold">الدفعة الأولى المقترحة (%)</label>
                  <input
                    type="number"
                    value={mortgageDownPct}
                    onChange={(e) => setMortgageDownPct(Number(e.target.value))}
                    className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[var(--nc-accent-border)] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--nc-text-dim)] font-medium font-bold font-semibold">مبلغ التمويل المقدر</label>
                  <div className="bg-[var(--nc-surface-solid)] border border-white/5 rounded-xl p-2.5 font-bold font-mono text-[var(--nc-text-dim)] font-medium leading-snug">
                    {(mortgagePrice * (1 - mortgageDownPct / 100)).toLocaleString()} ر.س
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--nc-text-dim)] font-medium font-bold">فترة السداد (سنوات)</label>
                  <input
                    type="number"
                    value={mortgageTermYears}
                    onChange={(e) => setMortgageTermYears(Number(e.target.value))}
                    className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[var(--nc-accent-border)] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--nc-text-dim)] font-medium font-bold">نسبة الفائدة السنوية (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={mortgageRatePct}
                    onChange={(e) => setMortgageRatePct(Number(e.target.value))}
                    className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[var(--nc-accent-border)] font-mono"
                  />
                </div>
              </div>

              <button
                onClick={updateCalculations}
                className="w-full py-2.5 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white text-xs font-bold rounded-xl transition-all"
              >
                تحديث الحساب التقديري
              </button>

              {calculatedInstallment !== null && (
                <div className="bg-[var(--nc-surface-solid)] p-4 rounded-xl border border-white/5 text-center space-y-1">
                  <p className="text-xs text-slate-500 text-[var(--nc-text-dim)] font-medium font-bold">القسط الشهري التقريبي (أصل وفوائد)</p>
                  <p className="text-lg font-black text-cyan-400 font-mono">
                    {calculatedInstallment.toLocaleString()} ر.س / شهرياً
                  </p>
                  <p className="text-[9px] text-[var(--nc-text-dim)] font-medium">القسط محسوب بناءً على معايير الفائدة الثابتة المحددة محلياً.</p>
                </div>
              )}

            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
              <button
                onClick={() => {
                  fetch(`/api/properties/${selectedPropertyId || 'T-XXX'}/request-finance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: 'ali_dev',
                      loanParams: { price: mortgagePrice, downPct: mortgageDownPct, term: mortgageTermYears, rate: mortgageRatePct },
                      contactInfo: { name: 'عضو منصتي', phone: '050XXXXXXX' }
                    })
                  })
                    .then(res => res.json())
                    .then(() => {
                      addTelemetryEvent('tour.finance_requested', { propertyId: selectedPropertyId });
                      alert('تم تقديم طلب التمويـل المبدئي وإرساله للمشرف العقاري بنجاح.');
                      setActiveModal(null);
                    })
                    .catch(() => alert('حدث خطأ في معالجة طلب التمويل.'));
                }}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all text-center"
              >
                تقديم طلب التمويل
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 bg-[var(--nc-surface-solid)] hover:bg-slate-700 text-[var(--nc-text-dim)] font-medium rounded-xl transition-all"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. مودال Feature Flags لتغيير القواعد */}
      {activeModal === 'settings_flag' && (
        <div className="fixed inset-0 bg-[var(--nc-surface-strong)] backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--nc-surface-solid)] border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-right text-xs">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Settings size={15} className="text-cyan-400" />
                <span>Feature Flags & Thresholds</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-[var(--nc-text-dim)] font-medium hover:text-white">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3.5">
              
              <div className="space-y-1">
                <label className="text-[var(--nc-text-dim)] font-medium font-bold block mb-1">الحد الأدنى لاكتمال البيانات (Data Completeness)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.0"
                  max="1.0"
                  value={config.minDataCompleteness}
                  onChange={(e) => setConfig(prev => ({ ...prev, minDataCompleteness: Number(e.target.value) }))}
                  className="w-full bg-[var(--nc-surface-solid)] border border-white/10 rounded-xl p-2 text-white font-mono"
                />
                <span className="text-xs text-slate-500 text-[var(--nc-text-dim)] font-medium">الجولات التي تقل نسبة اكتمال بياناتها عن هذا التخمين ستفتح في Modal إجبارياً.</span>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-b border-white/5">
                <label className="text-[var(--nc-text-dim)] font-medium font-bold">فرض المودال عند غياب الميديا</label>
                <input
                  type="checkbox"
                  checked={config.requireMedia}
                  onChange={(e) => setConfig(prev => ({ ...prev, requireMedia: e.target.checked }))}
                  className="w-4 h-4 rounded accent-[var(--nc-accent)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[var(--nc-text-dim)] font-medium font-bold">الحالات الإلزامية للمودال (Force Modal Statuses)</label>
                <div className="bg-[var(--nc-surface-solid)] p-2.5 rounded-xl border border-white/5 text-xs text-slate-500 font-mono text-cyan-300">
                  {JSON.stringify(config.forceModalStatuses)}
                </div>
                <span className="text-[9px] text-[var(--nc-text-dim)] font-medium">تشمل الحالات الافتراضية المحجوزة وقيد المراجعة لحماية الخصوصية.</span>
              </div>

            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => {
                  addTelemetryEvent('tours.config_updated', config);
                  setActiveModal(null);
                  alert('تم حفظ وتحديث قواعد ومعايير فتح الجولات بنجاح.');
                }}
                className="w-full py-2 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white font-bold rounded-xl transition-all"
              >
                تحديث وحفظ الإعدادات
              </button>
            </div>

          </div>
        </div>
      )}

    </>
  );
}

