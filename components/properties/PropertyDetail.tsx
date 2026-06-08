'use client';

import React, { useState, useEffect } from 'react';
import {
  Home, MapPin, FileText, CheckCircle2, ChevronRight,
  Activity, DollarSign, FileCheck, Clock,
  Key
} from 'lucide-react';
import { Card } from '../ui/orca-components';
import { toast } from '@/app/context/ToastContext';
import { DateField } from '../ui/DateField';
import { getPropertiesAction, bookUnitActionDirect, completeHandoverActionDirect } from '@/app/actions/properties';

interface PropertyDetailProps {
  propertyId: string;
  onBack: () => void;
  hasPermission: (action: string) => boolean;
  addTelemetryEvent: (type: string, payload?: any) => void;
  lang: 'AR' | 'EN';
  isArabic: boolean;
}

export default function PropertyDetail({
  propertyId,
  onBack,
  hasPermission,
  addTelemetryEvent,
  lang,
  isArabic
}: PropertyDetailProps) {
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('events');

  const [simulatedPrice, setSimulatedPrice] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [priceSimResult, setPriceSimResult] = useState('');

  const [bookingDate, setBookingDate] = useState('');
  const [bookingBirthDate, setBookingBirthDate] = useState('');
  const [bookingLeadId, setBookingLeadId] = useState('');
  const [bookingOfferPrice, setBookingOfferPrice] = useState(0);

  const [handoverDate, setHandoverDate] = useState('');
  const [handoverChecklist, setHandoverChecklist] = useState('1. فحص تمديدات الكهرباء والإنارة\n2. فحص السباكة ومنافذ الصرف وضغط المياه\n3. نظافة الأبواب والمقابض الخشبية والألمنيوم');
  const [handoverPhoto, setHandoverPhoto] = useState('https://picsum.photos/seed/handover/400/300');

  const [activeModal, setActiveModal] = useState<string | null>(null);

  useEffect(() => {
    async function loadProperty() {
      try {
        setLoading(true);
        const data = await getPropertiesAction();
        const found = data?.find((p: any) => String(p.id) === String(propertyId));
        if (found) {
          setProperty(found);
          setSimulatedPrice(found.price);
        } else {
          toast.error('لم يتم العثور على الوحدة العقارية');
        }
      } catch (err: any) {
        toast.error('خطأ في تحميل بيانات الوحدة');
      } finally {
        setLoading(false);
      }
    }
    loadProperty();
  }, [propertyId]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    if (!hasPermission('BOOK_UNIT')) {
      toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لإنشاء حجز.');
      return;
    }
    if (!bookingDate) {
      toast.error('يرجى تحديد تاريخ الحجز بصيغة صحيحة.');
      return;
    }

    try {
      const res = await bookUnitActionDirect({
        unitId: String(property.id),
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

      setProperty((prev: any) => ({
        ...prev,
        status: 'Sold',
        contractId: ctId,
        events: [
          ...prev.events,
          { id: `ev_bk_${Date.now()}`, type: 'إنشاء حجز وعقد', at: bookingDate, note: `حجز للعميل المعرف بـ ${bookingLeadId} بقيمة تعاقدية ${bookingOfferPrice.toLocaleString()} ر.س` }
        ]
      }));

      addTelemetryEvent('booking.created', {
        bookingId: `bk_${Date.now()}`,
        unitId: property.id,
        leadId: bookingLeadId,
        offerPrice: bookingOfferPrice,
        bookingDateNative: bookingDate,
        bookingDateVisible: visibleDateStr,
        bookingBirthDate: bookingBirthDate,
        contractId: ctId
      });

      toast.success(`تم إنشاء الحجز بنجاح! رقم مرجع العقد المصدر للمبيعات: ${ctId}`);
    } catch (err: any) {
      toast.error('خطأ في إتمام الحجز: ' + err.message);
    }

    setBookingLeadId('');
    setBookingOfferPrice(0);
    setBookingDate('');
    setBookingBirthDate('');
    setActiveModal(null);
  };

  const handleCompleteHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    if (!hasPermission('START_HANDOVER')) {
      toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لبدء التسليم.');
      return;
    }
    if (!handoverDate) {
      toast.error('يرجى تحديد تاريخ التسليم المعتمد.');
      return;
    }

    try {
      const res = await completeHandoverActionDirect({
        unitId: String(property.id),
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

      setProperty((prev: any) => ({
        ...prev,
        financialSettlementId: fsId,
        handovers: [
          ...prev.handovers,
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
          ...prev.events,
          { id: `ev_ho_${Date.now()}`, type: 'إتمام معاينة والتسليم النهائي', at: handoverDate, note: 'تم تسليم الوحدة وإمضاء محضر الاستلام الخالي من الملاحظات' }
        ]
      }));

      addTelemetryEvent('handover.completed', {
        handoverId: hoId,
        unitId: property.id,
        scheduledNative: handoverDate,
        scheduledVisible: visibleDateStr,
        checklistCount: handoverChecklist.split('\n').length
      });

      setTimeout(() => {
        addTelemetryEvent('accounting.settlement', {
          financialSettlementId: fsId,
          grossAmount: property.price,
          taxes: Math.round(property.price * 0.05),
          commissions: Math.round(property.price * 0.03),
          netToOwner: Math.round(property.price * 0.92)
        });
        toast.success(`تمت تسوية الإيرادات المالية مع خدمة الحسابات. رقم التسوية المرجعي: ${fsId}`);
      }, 1000);
    } catch (err: any) {
      toast.error('خطأ في إتمام التسليم: ' + err.message);
    }

    setHandoverDate('');
    setActiveModal(null);
  };

  const handlePriceSimulation = () => {
    if (!property) return;
    const discounted = Math.round(simulatedPrice * (1 - discountPercent / 100));
    const commission = Math.round(discounted * 0.03);
    const taxes = Math.round(discounted * 0.05);
    const netToOwner = discounted - commission - taxes;

    setPriceSimResult(
      `السعر النهائي: ${discounted.toLocaleString()} ر.س | عمولة المبيعات: ${commission.toLocaleString()} ر.س | الضريبة العقارية: ${taxes.toLocaleString()} ر.س | صافي المالك: ${netToOwner.toLocaleString()} ر.س`
    );
  };

  const handleSavePriceDraft = () => {
    if (!property) return;
    setProperty((prev: any) => ({
      ...prev,
      priceScenarioDraft: {
        simulatedPrice,
        discountPercent,
        result: priceSimResult,
        createdAt: new Date().toISOString()
      }
    }));
    addTelemetryEvent('price_scenario.saved', {
      unitId: property.id,
      simulatedPrice,
      discountPercent
    });
    toast.success('تم حفظ سيناريو تسعير الوحدة كمسودة تسعير مؤقتة بنجاح.');
  };

  const showFinancialSummary = () => {
    if (!property) return;
    if (!hasPermission('VIEW_FINANCE')) {
      toast.error('عذراً! دورك الحالي لا يمتلك صلاحية استعراض البيانات المالية التفصيلية.');
      return;
    }

    const summary = {
      financialSettlementId: property.financialSettlementId || 'N/A',
      grossAmount: property.price,
      collected: property.status === 'Sold' ? property.price : 0,
      outstanding: property.status === 'Sold' ? 0 : property.price,
      commissionTaxTotal: Math.round(property.price * 0.08)
    };

    toast.success(`[ACCOUNTING PROXY]
رقم التسوية: ${summary.financialSettlementId}
القيمة الإجمالية للعقد: ${summary.grossAmount.toLocaleString()} ر.س
المبالغ المحصلة: ${summary.collected.toLocaleString()} ر.س
الأقساط المتبقية: ${summary.outstanding.toLocaleString()} ر.س
إجمالي الضرائب والعمولة (8%): ${summary.commissionTaxTotal.toLocaleString()} ر.س`);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">جاري تحميل بيانات الوحدة...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-xs text-[#8EB1D1] hover:underline mb-4">&larr; العودة إلى القائمة</button>
        <p className="text-xs text-rose-400">لم يتم العثور على الوحدة العقارية.</p>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    Available: 'متاحة',
    Hold: 'محجوزة مؤقتاً',
    Sold: 'مباعة'
  };
  const statusBadgeClasses: Record<string, string> = {
    Available: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    Hold: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    Sold: 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
  };

  return (
    <div className="properties-page p-6 text-[var(--ds-text-primary)]" dir="rtl">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-[#8EB1D1] hover:text-white font-medium mb-4 transition-colors"
      >
        <ChevronRight size={14} />
        العودة إلى قائمة الوحدات
      </button>

      <Card className="p-5 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-48 h-36 rounded-xl overflow-hidden bg-[var(--nc-surface-solid)] flex-shrink-0">
            {property.media?.[0] ? (
              <img src={property.media[0]} alt={property.sku} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--nc-text-dim)]">
                <Home size={32} />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-extrabold text-white">{property.sku} — {property.type}</h2>
                <p className="text-xs text-[var(--nc-text-dim)] mt-1">
                  <MapPin size={12} className="inline ml-1" />
                  {property.project} | {property.area}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${statusBadgeClasses[property.status] || ''}`}>
                {statusLabels[property.status]}
              </span>
            </div>
            <p className="text-xs text-[var(--nc-text-dim)] leading-relaxed line-clamp-2">{property.desc}</p>
            <div className="flex items-center gap-4 pt-1">
              <span className="text-lg font-black text-[var(--nc-accent-text)]">{property.price.toLocaleString()} ر.س</span>
              {property.contractId && (
                <span className="text-[10px] text-[var(--nc-text-dim)]">العقد: {property.contractId}</span>
              )}
              {property.financialSettlementId && (
                <span className="text-[10px] text-[var(--nc-text-dim)]">التسوية: {property.financialSettlementId}</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3 mb-6">
        {property.status === 'Available' && (
          <button
            onClick={() => {
              if (!hasPermission('BOOK_UNIT')) {
                toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لإنشاء حجز.');
                return;
              }
              setBookingOfferPrice(property.price);
              setActiveModal('book_unit');
            }}
            className="flex-1 min-w-[140px] py-3 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white text-xs font-bold rounded-xl transition-all"
          >
            إنشاء حجز فوري
          </button>
        )}
        {property.status === 'Sold' && !property.financialSettlementId && (
          <button
            onClick={() => {
              if (!hasPermission('START_HANDOVER')) {
                toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لبدء تسليم الوحدة.');
                return;
              }
              setActiveModal('handover_assistant');
            }}
            className="flex-1 min-w-[140px] py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all"
          >
            بدء تسليم الوحدة (Handover)
          </button>
        )}
        {property.status === 'Sold' && property.financialSettlementId && (
          <button
            onClick={showFinancialSummary}
            className="flex-1 min-w-[140px] py-3 bg-[var(--nc-surface-solid)] border border-white/10 hover:border-white/20 text-white text-xs font-bold rounded-xl transition-all"
          >
            عرض تفاصيل الإيرادات المحدثة
          </button>
        )}
      </div>

      <div className="flex border-b border-white/10 mb-4 gap-1 overflow-x-auto">
        {[
          { key: 'events', label: 'الأحداث', icon: Activity },
          { key: 'simulator', label: 'محاكي التسعير', icon: DollarSign },
          { key: 'accounting', label: 'المحاسبة', icon: FileText },
          { key: 'docs', label: 'المستندات', icon: FileCheck },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 flex-shrink-0 ${
              activeTab === tab.key
                ? 'text-[var(--nc-accent-text)] border-b-2 border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)]'
                : 'text-[var(--nc-text-dim)] hover:text-white'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="p-5 min-h-[250px]">
        {activeTab === 'events' && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white mb-3">سجل الأحداث</h4>
            {property.events.length === 0 ? (
              <p className="text-xs text-[var(--nc-text-dim)]">لا توجد أحداث مسجلة لهذه الوحدة.</p>
            ) : (
              <div className="space-y-2">
                {[...property.events].reverse().map((evt: any) => (
                  <div key={evt.id} className="flex gap-3 p-3 bg-[var(--nc-surface-solid)] rounded-xl border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-[var(--nc-accent-soft)] flex items-center justify-center flex-shrink-0">
                      <Clock size={14} className="text-[var(--nc-accent-text)]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-white">{evt.type}</span>
                        <span className="text-[10px] text-[var(--nc-text-dim)]">{evt.at}</span>
                      </div>
                      <p className="text-[11px] text-[var(--nc-text-dim)] mt-0.5">{evt.note}</p>
                      {evt.media && evt.media.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {evt.media.map((m: string, i: number) => (
                            <img key={i} src={m} alt="" className="w-12 h-8 rounded object-cover" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'simulator' && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white mb-3">محاكي التسعير</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-[var(--nc-text-dim)]">السعر الأساسي (ر.س)</label>
                <input
                  type="number"
                  value={simulatedPrice}
                  onChange={(e) => setSimulatedPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--nc-surface-solid)] border border-white/10 text-white text-xs outline-none focus:border-[var(--nc-accent-border)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[var(--nc-text-dim)]">نسبة الخصم (%)</label>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--nc-surface-solid)] border border-white/10 text-white text-xs outline-none focus:border-[var(--nc-accent-border)]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePriceSimulation}
                className="px-4 py-2 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white text-xs font-bold rounded-xl transition-all"
              >
                احتساب السعر
              </button>
              <button
                onClick={handleSavePriceDraft}
                className="px-4 py-2 bg-[var(--nc-surface-solid)] border border-white/10 hover:border-white/20 text-white text-xs font-bold rounded-xl transition-all"
              >
                حفظ كمسودة
              </button>
            </div>
            {priceSimResult && (
              <div className="p-3 bg-[var(--nc-surface-solid)] rounded-xl border border-white/5 text-xs text-[var(--nc-text-secondary)] leading-relaxed">
                {priceSimResult}
              </div>
            )}
            {property.priceScenarioDraft && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-[10px] text-amber-400 font-bold">مسودة تسعير محفوظة مسبقاً</p>
                <p className="text-[10px] text-[var(--nc-text-dim)] mt-1">{property.priceScenarioDraft.result}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'accounting' && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white mb-3">الملخص المالي</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-[var(--nc-surface-solid)] rounded-xl border border-white/5">
                <p className="text-[10px] text-[var(--nc-text-dim)]">القيمة الإجمالية</p>
                <p className="text-sm font-bold text-white mt-1">{property.price.toLocaleString()} ر.س</p>
              </div>
              <div className="p-3 bg-[var(--nc-surface-solid)] rounded-xl border border-white/5">
                <p className="text-[10px] text-[var(--nc-text-dim)]">المحصل</p>
                <p className="text-sm font-bold text-emerald-400 mt-1">{property.status === 'Sold' ? property.price.toLocaleString() : '0'} ر.س</p>
              </div>
              <div className="p-3 bg-[var(--nc-surface-solid)] rounded-xl border border-white/5">
                <p className="text-[10px] text-[var(--nc-text-dim)]">المتبقي</p>
                <p className="text-sm font-bold text-amber-400 mt-1">{property.status === 'Sold' ? '0' : property.price.toLocaleString()} ر.س</p>
              </div>
              <div className="p-3 bg-[var(--nc-surface-solid)] rounded-xl border border-white/5">
                <p className="text-[10px] text-[var(--nc-text-dim)]">الضرائب والعمولة</p>
                <p className="text-sm font-bold text-rose-400 mt-1">{Math.round(property.price * 0.08).toLocaleString()} ر.س</p>
              </div>
            </div>
            <button
              onClick={showFinancialSummary}
              className="px-4 py-2 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white text-xs font-bold rounded-xl transition-all"
            >
              عرض تفاصيل الإيرادات الكاملة
            </button>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white mb-3">المستندات</h4>
            {property.docs.length === 0 ? (
              <p className="text-xs text-[var(--nc-text-dim)]">لا توجد مستندات مرفوعة.</p>
            ) : (
              <div className="space-y-2">
                {property.docs.map((doc: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 bg-[var(--nc-surface-solid)] rounded-xl border border-white/5">
                    <FileText size={14} className="text-[var(--nc-accent-text)]" />
                    <span className="text-xs text-white">{doc}</span>
                  </div>
                ))}
              </div>
            )}
            {property.media && property.media.length > 0 && (
              <>
                <h5 className="text-xs font-bold text-white mt-4 mb-2">الصور</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {property.media.map((m: string, i: number) => (
                    <img key={i} src={m} alt="" className="w-full h-24 rounded-xl object-cover border border-white/5" />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      {activeModal === 'book_unit' && property && (
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
              <p className="font-bold text-white">{property.sku} — {property.type} ({property.project})</p>
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

            <div className="space-y-1">
              <DateField
                value={bookingDate}
                onChange={(val) => setBookingDate(val)}
                label="تاريخ الحجز والتعاقد (DateField)"
              />
            </div>

            <div className="space-y-1">
              <DateField
                value={bookingBirthDate}
                onChange={(val) => setBookingBirthDate(val)}
                label="تاريخ ميلاد العميل (DateField)"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 py-2.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-white font-bold rounded-xl transition-all">
                تأكيد وإمضاء العقد
              </button>
              <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2.5 bg-[#1C2B48] hover:bg-slate-700 text-[#C4D8E5] font-medium rounded-xl transition-all">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {activeModal === 'handover_assistant' && property && (
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

            <div className="space-y-1">
              <DateField
                value={handoverDate}
                onChange={(val) => setHandoverDate(val)}
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
              <button type="submit" className="flex-1 py-2.5 bg-[#8EB1D1] hover:bg-[#A7C7E7] text-white font-bold rounded-xl transition-all">
                توقيع مخالصة الاستلام وإصدار تسوية مالية
              </button>
              <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2.5 bg-[#1C2B48] hover:bg-slate-700 text-[#C4D8E5] font-medium rounded-xl transition-all">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
