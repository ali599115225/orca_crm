'use client';

import React, { useState, useEffect } from 'react';
import { getContractWizardDataAction, issueContractActionDirect } from '@/app/actions/contract';

interface Client {
  id: string;
  name: string;
  phone: string;
  type: string;
}

interface Property {
  id: string;
  unitNumber: string;
  priceSar: number;
  projectName: string;
}

interface ContractWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ContractWizard({ isOpen, onClose, onSuccess }: ContractWizardProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  
  const [clientId, setClientId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [amount, setAmount] = useState('');
  
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. جلب البيانات عند فتح النموذج
  useEffect(() => {
    if (!isOpen) return;

    // إعادة ضبط الحقول عند الفتح
    setClientId('');
    setPropertyId('');
    setAmount('');
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoadingData(true);

    const loadData = async () => {
      try {
        const data = await getContractWizardDataAction();
        
        if (data.success) {
          setClients(data.clients || []);
          setProperties(data.properties || []);
        } else {
          setErrorMsg(data.error || 'فشل جلب بيانات العملاء والوحدات الشاغرة.');
        }
      } catch (err: any) {
        setErrorMsg('حدث خطأ أثناء الاتصال بالخادم لجلب البيانات المساعدة.');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [isOpen]);

  // 2. تحديث السعر تلقائياً عند اختيار الوحدة العقارية كقيمة افتراضية مريحة للمستخدم
  const handlePropertyChange = (propId: string) => {
    setPropertyId(propId);
    const selectedProp = properties.find((p) => p.id === propId);
    if (selectedProp) {
      setAmount(selectedProp.priceSar.toString());
    } else {
      setAmount('');
    }
  };

  // 3. معالجة إرسال العقد
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // التحقق من صحة المدخلات
    if (!clientId) {
      setErrorMsg('يرجى اختيار العميل أولاً.');
      return;
    }
    if (!propertyId) {
      setErrorMsg('يرجى اختيار الوحدة العقارية المتعاقد عليها.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setErrorMsg('يرجى إدخال قيمة العقد وتأكيد صحتها.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await issueContractActionDirect({
        clientId,
        propertyId,
        amount: Number(amount),
      });

      if (result.success) {
        setSuccessMsg('🎉 تم إصدار وتوقيع عقد المبيعات الجديد بنظام أوركا وتحديث حالة المخزون بنجاح!');
        // تنظيف البيانات
        setClientId('');
        setPropertyId('');
        setAmount('');
        
        // إبلاغ المكون الأب لتحديث بيانات لوحة التحكم
        if (onSuccess) {
          onSuccess();
        }

        // إغلاق المودال تلقائياً بعد فترة قصيرة
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMsg(result.error || 'فشل إصدار العقد.');
      }
    } catch (err) {
      setErrorMsg('حدث خطأ غير متوقع في خادم المعاملات.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--nc-surface-solid)]/80 backdrop-blur-md" dir="rtl">
      {/* Backdrop click close */}
      <div className="absolute inset-0 cursor-default" onClick={() => !isSubmitting && onClose()}></div>
      
      {/* Modal Container */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-gradient-to-b from-[var(--nc-surface-solid)] to-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] p-6 shadow-2xl animate-scale-up flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-brand-border pb-4 mb-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <i className="ph-bold ph-signature text-lg"></i>
            </div>
            <div>
              <h3 className="text-white font-extrabold text-base leading-tight">معالج إصدار العقود الذكي</h3>
              <p className="text-[var(--nc-text-dim)] text-[10px] mt-0.5">تسجيل عمليات البيع الفوري وإصدار العقود والتحكم التلقائي بالمخزون</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-[var(--nc-text-dim)] hover:text-white text-base bg-[var(--nc-surface)] hover:bg-[var(--nc-surface-solid)] w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold shadow-sm flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold shadow-sm flex items-start gap-2 animate-pulse">
            <span className="mt-0.5">✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Loading Spinner for initial fetch */}
        {isLoadingData ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-brand-interactive/20 border-t-brand-interactive rounded-full animate-spin"></div>
            <p className="text-xs text-[var(--nc-text-dim)]">{isSubmitting ? 'جاري تنفيذ المعاملة العقارية...' : 'جاري سحب قائمة العملاء والوحدات المتاحة...'}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* 1. Client Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--nc-text-dim)]">اختيار العميل</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-[var(--nc-surface-strong)] border border-brand-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-interactive transition-all cursor-pointer disabled:opacity-50"
              >
                <option value="" className="bg-[#151f32]">{clients.length === 0 ? 'لا يوجد عملاء نشطين متاحين' : 'اختر العميل المشتري...'}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id} className="bg-[#151f32]">
                    {client.name} ({client.phone}) [{client.type === 'lead' ? 'عميل مهتم' : 'دفتر العملاء'}]
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Property Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--nc-text-dim)]">اختيار العقار/المشروع</label>
              <select
                value={propertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-[var(--nc-surface-strong)] border border-brand-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-interactive transition-all cursor-pointer disabled:opacity-50"
              >
                <option value="" className="bg-[#151f32]">{properties.length === 0 ? 'لا توجد وحدات شاغرة متاحة حالياً' : 'اختر الوحدة العقارية المتاحة للبيع...'}</option>
                {properties.map((prop) => (
                  <option key={prop.id} value={prop.id} className="bg-[#151f32]">
                    {prop.projectName} - وحدة رقم: {prop.unitNumber} ({prop.priceSar.toLocaleString('ar-EG')} ر.س)
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Amount Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--nc-text-dim)]">قيمة العقد الإجمالية (ريال سعودي)</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="القيمة المالية الإجمالية للعقد بالريال..."
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-[var(--nc-surface-strong)] border border-brand-border rounded-xl pr-4 pl-12 py-2.5 text-xs text-white focus:outline-none focus:border-brand-interactive transition-all disabled:opacity-50 text-right"
                />
                <span className="absolute left-4 top-2.5 text-[var(--nc-text-dim)] text-[10px] font-bold">ر.س</span>
              </div>
              <p className="text-[10px] text-[var(--nc-text-dim)]/70">تتم تعبئة القيمة تلقائياً بسعر الوحدة المسجل، ويمكنك تعديلها بناءً على الخصم الممنوح للعميل.</p>
            </div>

            {/* Actions */}
            <div className="pt-4 flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-grow flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] text-white font-bold text-xs transition-all border border-indigo-400/20 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>جاري إصدار العقد...</span>
                  </>
                ) : (
                  <>
                    <i className="ph-bold ph-signature text-sm"></i>
                    <span>إصدار وتعميد العقد</span>
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[var(--nc-surface-solid)] hover:bg-[var(--nc-surface)] text-[var(--nc-text-dim)] hover:text-white font-bold text-xs transition-all border border-slate-700 cursor-pointer disabled:opacity-50"
              >
                إلغاء الأمر
              </button>
            </div>
            
          </form>
        )}

      </div>
    </div>
  );
}
