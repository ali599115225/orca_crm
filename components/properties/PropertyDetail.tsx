'use client';

import React, { useState, useEffect } from 'react';
import {
  Home,
  MapPin,
  FileText,
  ChevronRight,
  Activity,
  DollarSign,
  FileCheck,
  Clock,
  Key,
} from 'lucide-react';
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

const primaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--nc-op-blue)] text-white text-xs font-bold transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60';
const accentButtonClass =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--nc-accent)] text-[#0B1220] text-xs font-bold transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] text-[var(--nc-text-primary)] text-xs font-bold transition-all hover:border-[var(--nc-accent-border)] disabled:cursor-not-allowed disabled:opacity-60';
const ghostButtonClass =
  'inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-2 rounded-xl bg-transparent text-[var(--nc-text-secondary)] text-xs font-bold transition-all hover:text-[var(--nc-text-primary)] hover:bg-[var(--nc-surface-solid)]';
const inputClass =
  'w-full rounded-xl bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] px-3 py-2.5 text-[var(--nc-text-primary)] text-xs outline-none transition-colors placeholder:text-[var(--nc-text-dim)] focus:border-[var(--nc-accent-border)]';
const labelClass = 'block text-xs font-medium text-[var(--nc-text-secondary)]';
const modalClass =
  'relative w-full max-w-md rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface)] p-6 text-right text-xs shadow-2xl space-y-4';
const compactEmptyClass =
  'py-6 rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] flex items-center justify-center px-4 text-center text-sm text-[var(--nc-text-secondary)]';

export default function PropertyDetail({
  propertyId,
  onBack,
  hasPermission,
  addTelemetryEvent,
  lang,
  isArabic,
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
  const [handoverChecklist, setHandoverChecklist] = useState(
    '1. فحص تمديدات الكهرباء والإنارة\n2. فحص السباكة ومنافذ الصرف وضغط المياه\n3. نظافة الأبواب والمقابض الخشبية والألمنيوم'
  );
  const [handoverPhoto, setHandoverPhoto] = useState('https://picsum.photos/seed/handover/400/300');

  const [activeModal, setActiveModal] = useState<string | null>(null);

  useEffect(() => {
    async function loadProperty() {
      try {
        setLoading(true);
        const prResult = await getPropertiesAction();
        const propsList = prResult && 'data' in prResult ? prResult.data : Array.isArray(prResult) ? prResult : [];
        const found = propsList?.find((p: any) => String(p.id) === String(propertyId));
        if (found) {
          setProperty(found);
          setSimulatedPrice(found.price || 0);
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
        bookingDate,
      });

      if (!res.success || !res.contractId) {
        throw new Error(res.error || 'حدث خطأ في قاعدة البيانات');
      }

      const contractId = res.contractId;
      const dateObj = new Date(bookingDate);
      const visibleDateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

      setProperty((prev: any) => ({
        ...prev,
        status: 'Sold',
        contractId,
        events: [
          ...(prev.events || []),
          {
            id: `ev_bk_${Date.now()}`,
            type: 'إنشاء حجز وعقد',
            at: bookingDate,
            note: `حجز للعميل ${bookingLeadId || 'غير محدد'} بقيمة ${bookingOfferPrice.toLocaleString()} ر.س`,
          },
        ],
      }));

      addTelemetryEvent('booking.created', {
        unitId: property.id,
        leadId: bookingLeadId,
        offerPrice: bookingOfferPrice,
        bookingDateNative: bookingDate,
        bookingDateVisible: visibleDateStr,
        bookingBirthDate,
        contractId,
      });

      toast.success('تم إنشاء الحجز بنجاح.');
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
        handoverDate,
        checklist: handoverChecklist,
        photoUrl: handoverPhoto,
      });

      if (!res.success || !res.handoverId) {
        throw new Error(res.error || 'حدث خطأ في قاعدة البيانات');
      }

      const handoverId = res.handoverId;
      const dateObj = new Date(handoverDate);
      const visibleDateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

      setProperty((prev: any) => ({
        ...prev,
        handoverCompleted: true,
        handovers: [
          ...(prev.handovers || []),
          {
            id: handoverId,
            scheduledAt: visibleDateStr,
            status: 'Completed',
            checklist: handoverChecklist,
            media: [handoverPhoto],
            completedAt: new Date().toISOString(),
          },
        ],
        events: [
          ...(prev.events || []),
          {
            id: `ev_ho_${Date.now()}`,
            type: 'إتمام معاينة وتسليم نهائي',
            at: handoverDate,
            note: 'تم تسجيل التسليم وإرفاق بيانات المعاينة.',
          },
        ],
      }));

      addTelemetryEvent('handover.completed', {
        handoverId,
        unitId: property.id,
        scheduledNative: handoverDate,
        scheduledVisible: visibleDateStr,
        checklistCount: handoverChecklist.split('\n').length,
      });

      toast.success('تم تسجيل التسليم بنجاح.');
    } catch (err: any) {
      toast.error('خطأ في إتمام التسليم: ' + err.message);
    }

    setHandoverDate('');
    setActiveModal(null);
  };

  const handlePriceCalculation = () => {
    if (!property) return;
    const discounted = Math.round(simulatedPrice * (1 - discountPercent / 100));
    const commission = Math.round(discounted * 0.03);
    const taxes = Math.round(discounted * 0.05);
    const netToOwner = discounted - commission - taxes;

    setPriceSimResult(
      `السعر النهائي: ${discounted.toLocaleString()} ر.س | عمولة المبيعات: ${commission.toLocaleString()} ر.س | الضريبة العقارية: ${taxes.toLocaleString()} ر.س | صافي المالك: ${netToOwner.toLocaleString()} ر.س`
    );
  };

  const showFinancialSummary = () => {
    if (!property) return;
    if (!hasPermission('VIEW_FINANCE')) {
      toast.error('عذراً! دورك الحالي لا يمتلك صلاحية استعراض البيانات المالية التفصيلية.');
      return;
    }

    const grossAmount = property.price || 0;
    const collected = property.status === 'Sold' ? grossAmount : 0;
    const outstanding = property.status === 'Sold' ? 0 : grossAmount;
    const commissionTaxTotal = Math.round(grossAmount * 0.08);

    toast.success(`ملخص مالي للوحدة\nالقيمة الإجمالية: ${grossAmount.toLocaleString()} ر.س\nالمبالغ المحصلة: ${collected.toLocaleString()} ر.س\nالأقساط المتبقية: ${outstanding.toLocaleString()} ر.س\nإجمالي الضرائب والعمولة: ${commissionTaxTotal.toLocaleString()} ر.س`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center p-6">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--nc-accent-border)] border-t-transparent" />
          <p className="text-xs font-medium text-[var(--nc-text-secondary)]">جاري تحميل بيانات الوحدة...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-6" dir="rtl">
        <button onClick={onBack} className={ghostButtonClass}>
          <ChevronRight size={14} />
          العودة إلى القائمة
        </button>
        <div className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-300">
          لم يتم العثور على الوحدة العقارية.
        </div>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    Available: 'متاحة',
    Hold: 'محجوزة مؤقتاً',
    Sold: 'مباعة',
  };
  const statusBadgeClasses: Record<string, string> = {
    Available: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20',
    Hold: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20',
    Sold: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20',
  };
  const hasCompletedHandover = Boolean(
    property.handoverCompleted || property.financialSettlementId || property.handovers?.some((h: any) => h.status === 'Completed')
  );

  return (
    <div className="properties-page p-6 text-[var(--nc-text-primary)]" dir="rtl">
      <button onClick={onBack} className={`${ghostButtonClass} mb-4`}>
        <ChevronRight size={14} />
        العودة إلى قائمة الوحدات
      </button>

      <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 shadow-sm mb-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--nc-text-primary)]">
                  {property.sku} — {property.type}
                </h2>
                <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                  <MapPin size={12} className="ml-1 inline" />
                  {property.project} | {property.area}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusBadgeClasses[property.status] || ''}`}>
                {statusLabels[property.status] || property.status}
              </span>
            </div>
            <p className="line-clamp-2 text-xs leading-relaxed text-[var(--nc-text-secondary)]">{property.desc}</p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <span className="text-lg font-black text-[var(--nc-text-primary)]">{Number(property.price || 0).toLocaleString('ar-SA')} ر.س</span>
              {property.contractId && (
                <span className="rounded-full border border-[var(--nc-glass-border)] px-2 py-1 text-[10px] text-[var(--nc-text-secondary)]">
                  عقد مرتبط
                </span>
              )}
              {hasCompletedHandover && (
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-700 dark:text-emerald-300">
                  تم تسجيل التسليم
                </span>
              )}
            </div>
          </div>
          
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-[var(--nc-surface-solid)] flex items-center justify-center border border-[var(--nc-border)]">
            {property.media?.[0] ? (
              <img src={property.media[0]} alt={property.sku} className="h-full w-full object-cover" />
            ) : (
              <Home size={24} className="text-[var(--nc-text-dim)]" />
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {property.status === 'Available' && (
          <button
            onClick={() => {
              if (!hasPermission('BOOK_UNIT')) {
                toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لإنشاء حجز.');
                return;
              }
              setBookingOfferPrice(property.price || 0);
              setActiveModal('book_unit');
            }}
            className="nc-btn-primary min-h-[40px] rounded-xl px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
          >
            إنشاء حجز فوري
          </button>
        )}
        {property.status === 'Sold' && !hasCompletedHandover && (
          <button
            onClick={() => {
              if (!hasPermission('START_HANDOVER')) {
                toast.error('عذراً! دورك الحالي لا يمتلك الصلاحية لبدء تسليم الوحدة.');
                return;
              }
              setActiveModal('handover_assistant');
            }}
            className="nc-btn-primary min-h-[40px] rounded-xl px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
          >
            بدء تسليم الوحدة
          </button>
        )}
        {property.status === 'Sold' && hasCompletedHandover && (
          <button onClick={showFinancialSummary} className="min-h-[40px] rounded-xl px-5 py-2 text-sm font-semibold bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] text-[var(--nc-text-primary)] hover:border-[var(--nc-accent-border)]">
            عرض ملخص الإيرادات
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--nc-glass-border)]">
        {[
          { key: 'events', label: 'الأحداث', icon: Activity },
          { key: 'pricing', label: 'التسعير', icon: DollarSign },
          { key: 'accounting', label: 'المالية', icon: FileText },
          { key: 'docs', label: 'المستندات', icon: FileCheck },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex min-h-[44px] items-center gap-1.5 rounded-t-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === tab.key
                ? 'border-b-2 border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-accent-text)]'
                : 'text-[var(--nc-text-secondary)] hover:bg-[var(--nc-surface-solid)] hover:text-[var(--nc-text-primary)]'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 shadow-sm">
        {activeTab === 'events' && (
          <div className="space-y-3">
            <h4 className="mb-3 text-sm font-bold text-[var(--nc-text-primary)]">سجل الأحداث</h4>
            {(property.events || []).length === 0 ? (
              <div className={compactEmptyClass}>لا توجد أحداث مسجلة لهذه الوحدة.</div>
            ) : (
              <div className="space-y-2">
                {[...(property.events || [])].reverse().map((evt: any) => (
                  <div key={evt.id} className="flex gap-3 rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--nc-accent-soft)]">
                      <Clock size={14} className="text-[var(--nc-accent-text)]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-bold text-[var(--nc-text-primary)]">{evt.type}</span>
                        <span className="text-[10px] text-[var(--nc-text-secondary)]">{evt.at}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--nc-text-secondary)]">{evt.note}</p>
                      {evt.media && evt.media.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {evt.media.map((m: string, i: number) => (
                            <img key={i} src={m} alt="" className="h-8 w-12 rounded object-cover" />
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

        {activeTab === 'pricing' && (
          <div className="space-y-4">
            <h4 className="mb-3 text-sm font-bold text-[var(--nc-text-primary)]">حاسبة التسعير</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className={labelClass}>السعر الأساسي (ر.س)</label>
                <input type="number" value={simulatedPrice} onChange={(e) => setSimulatedPrice(Number(e.target.value))} className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>نسبة الخصم (%)</label>
                <input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} className={inputClass} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handlePriceCalculation} className={primaryButtonClass}>
                احتساب السعر
              </button>
            </div>
            {priceSimResult && (
              <div className="rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-3 text-xs leading-relaxed text-[var(--nc-text-secondary)]">
                {priceSimResult}
              </div>
            )}
          </div>
        )}

        {activeTab === 'accounting' && (
          <div className="space-y-4">
            <h4 className="mb-3 text-sm font-bold text-[var(--nc-text-primary)]">الملخص المالي</h4>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-3">
                <p className="text-[10px] text-[var(--nc-text-secondary)]">القيمة الإجمالية</p>
                <p className="mt-1 text-sm font-bold text-[var(--nc-text-primary)]">{Number(property.price || 0).toLocaleString()} ر.س</p>
              </div>
              <div className="rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-3">
                <p className="text-[10px] text-[var(--nc-text-secondary)]">المحصل</p>
                <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {property.status === 'Sold' ? Number(property.price || 0).toLocaleString() : '0'} ر.س
                </p>
              </div>
              <div className="rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-3">
                <p className="text-[10px] text-[var(--nc-text-secondary)]">المتبقي</p>
                <p className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-300">
                  {property.status === 'Sold' ? '0' : Number(property.price || 0).toLocaleString()} ر.س
                </p>
              </div>
              <div className="rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-3">
                <p className="text-[10px] text-[var(--nc-text-secondary)]">الضرائب والعمولة</p>
                <p className="mt-1 text-sm font-bold text-rose-700 dark:text-rose-300">
                  {Math.round(Number(property.price || 0) * 0.08).toLocaleString()} ر.س
                </p>
              </div>
            </div>
            <button onClick={showFinancialSummary} className={secondaryButtonClass}>
              عرض تفاصيل الإيرادات
            </button>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-3">
            <h4 className="mb-3 text-sm font-bold text-[var(--nc-text-primary)]">المستندات</h4>
            {(property.docs || []).length === 0 ? (
              <div className={compactEmptyClass}>لا توجد مستندات مرفوعة.</div>
            ) : (
              <div className="space-y-2">
                {(property.docs || []).map((doc: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-2.5">
                    <FileText size={14} className="text-[var(--nc-accent-text)]" />
                    <span className="text-xs text-[var(--nc-text-primary)]">{doc}</span>
                  </div>
                ))}
              </div>
            )}
            {property.media && property.media.length > 0 && (
              <>
                <h5 className="mb-2 mt-4 text-xs font-bold text-[var(--nc-text-primary)]">الصور</h5>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {property.media.map((m: string, i: number) => (
                    <img key={i} src={m} alt="" className="h-24 w-full rounded-xl border border-[var(--nc-glass-border)] object-cover" />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {activeModal === 'book_unit' && property && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <form onSubmit={handleCreateBooking} className={modalClass}>
            <h3 className="flex items-center gap-2 border-b border-[var(--nc-glass-border)] pb-2 text-base font-extrabold text-[var(--nc-text-primary)]">
              <FileCheck size={18} />
              حجز وحدة عقارية وإصدار عقد
            </h3>

            <div className="space-y-1">
              <label className={labelClass}>الوحدة المحددة:</label>
              <p className="font-bold text-[var(--nc-text-primary)]">
                {property.sku} — {property.type} ({property.project})
              </p>
            </div>

            <div className="space-y-1">
              <label className={labelClass}>اسم المشتري أو معرف العميل:</label>
              <input
                type="text"
                required
                value={bookingLeadId}
                onChange={(e) => setBookingLeadId(e.target.value)}
                placeholder="الاسم الرباعي للمشتري..."
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>القيمة التعاقدية للبيع (ر.س):</label>
              <input type="number" required value={bookingOfferPrice} onChange={(e) => setBookingOfferPrice(Number(e.target.value))} className={inputClass} />
            </div>

            <div className="space-y-1">
              <DateField value={bookingDate} onChange={(val) => setBookingDate(val)} label="تاريخ الحجز والتعاقد" />
            </div>

            <div className="space-y-1">
              <DateField value={bookingBirthDate} onChange={(val) => setBookingBirthDate(val)} label="تاريخ ميلاد العميل" />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className={`${primaryButtonClass} flex-1`}>
                تأكيد وإمضاء العقد
              </button>
              <button type="button" onClick={() => setActiveModal(null)} className={`${secondaryButtonClass} flex-1`}>
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {activeModal === 'handover_assistant' && property && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <form onSubmit={handleCompleteHandover} className={modalClass}>
            <h3 className="flex items-center gap-2 border-b border-[var(--nc-glass-border)] pb-2 text-base font-extrabold text-[var(--nc-text-primary)]">
              <Key size={18} />
              تسجيل تسليم الوحدة
            </h3>

            <p className="font-medium text-[var(--nc-text-secondary)]">
              سجّل تاريخ التسليم المعتمد، وأرفق قائمة الملاحظات وصورة المعاينة الميدانية.
            </p>

            <div className="space-y-1">
              <DateField value={handoverDate} onChange={(val) => setHandoverDate(val)} label="تاريخ الاستلام النهائي المعتمد" />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>قائمة فحص الملاحظات والعيوب:</label>
              <textarea rows={3} required value={handoverChecklist} onChange={(e) => setHandoverChecklist(e.target.value)} className={`${inputClass} font-sans`} />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>رابط صورة المعاينة الميدانية الموثقة:</label>
              <input type="text" required value={handoverPhoto} onChange={(e) => setHandoverPhoto(e.target.value)} className={inputClass} />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className={`${accentButtonClass} flex-1`}>
                تسجيل التسليم
              </button>
              <button type="button" onClick={() => setActiveModal(null)} className={`${secondaryButtonClass} flex-1`}>
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
