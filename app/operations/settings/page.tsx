// app/operations/settings/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { initiateSubscriptionPaymentAction } from '@/app/actions/payment';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // قراءة رسائل النجاح أو الفشل من رابط الـ Redirect للبوابة
    const successMsg = searchParams.get('success');
    const errorMsg = searchParams.get('error');
    if (successMsg) setSuccess(successMsg);
    if (errorMsg) setError(errorMsg);
  }, [searchParams]);

  const handleUpgrade = async (plan: "basic" | "professional" | "enterprise") => {
    setSuccess(null);
    setError(null);
    setLoadingPlan(plan);

    const result = await initiateSubscriptionPaymentAction(plan);
    setLoadingPlan(null);

    if (result.success && result.paymentUrl) {
      // توجيه العميل فوراً لصفحة ميسر السحابية المشفرة لإتمام عملية الدفع بـ مدى أو فيزا
      window.location.href = result.paymentUrl;
    } else {
      setError(result.error || "عذراً، فشل بدء عملية الدفع والاتصال بالبوابة.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">إعدادات النظام والترقيات العقارية (SaaS)</h1>
        <p className="text-gray-500 text-sm mt-1">تخصيص هوية المنشأة، تتبع باقة المبيعات، والترقية الحية لرفع سعة العمليات</p>
      </div>

      {/* التنبيهات من بوابة الدفع */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-xl font-bold">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-xl font-bold">
          {error}
        </div>
      )}

      {/* تفاصيل المنشأة العقارية */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-sm font-bold text-slate-800 border-b pb-2">بيانات الشركة ومستأجر النظام (Tenant Information)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">اسم المنشأة العقارية</label>
              <input type="text" disabled className="w-full bg-gray-50 border rounded-lg p-2.5 text-xs text-gray-700 font-medium" value="شركة دار الأعمار العقارية" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">النطاق الفرعي (Subdomain)</label>
              <div className="flex" dir="ltr">
                <span className="bg-gray-100 border border-r-0 rounded-l-lg px-3 py-2 text-xs text-gray-500">.orcacrm.sa</span>
                <input type="text" disabled className="flex-1 bg-gray-50 border rounded-r-lg p-2.5 text-xs text-gray-700 font-medium text-left" value="dar-al-amar" />
              </div>
            </div>
          </div>
        </div>

        {/* عرض خطط الاشتراك التفاعلية ومنافذ الدفع بـ مدى */}
        <div className="pt-2">
          <h2 className="text-sm font-bold text-slate-800 border-b pb-4 mb-4">باقات وخطط الاشتراك في منصة ORCA العقارية</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* الباقة الأساسية */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-white flex flex-col justify-between shadow-sm hover:border-amber-400 transition-all">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">الباقة الأساسية (Basic)</h3>
                <p className="text-xs text-slate-400 mt-1">تأسيس ممتاز للشركات الناشئة</p>
                <div className="my-4">
                  <span className="text-2xl font-black text-slate-900">299</span>
                  <span className="text-xs text-slate-500 font-medium"> ر.س / شهرياً</span>
                </div>
                <ul className="text-[10px] text-slate-600 space-y-2 mt-4 border-t pt-4">
                  <li>✔ إدخال حتى 500 عميل محتمل</li>
                  <li>✔ إدارة حتى 3 مشاريع عقارية</li>
                  <li>✔ 2 مستشاري مبيعات</li>
                  <li>✔ ربط محلي ودعم فني أساسي</li>
                </ul>
              </div>
              <button 
                onClick={() => handleUpgrade('basic')}
                disabled={loadingPlan !== null}
                className="w-full mt-6 bg-slate-900 text-white hover:bg-slate-800 transition-colors p-2 rounded-lg text-xs font-bold"
              >
                {loadingPlan === 'basic' ? 'جاري التحضير للبوابة...' : 'ترقية الآن (مدى / فيزا)'}
              </button>
            </div>

            {/* الباقة الاحترافية */}
            <div className="border border-amber-400 rounded-2xl p-6 bg-amber-50/20 flex flex-col justify-between shadow-sm relative overflow-hidden">
              <span className="absolute top-0 right-0 bg-amber-400 text-slate-950 font-bold text-[8px] px-3 py-1 rounded-bl-lg"> الأكثر طلباً </span>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">الباقة الاحترافية (Professional)</h3>
                <p className="text-xs text-slate-400 mt-1">لشركات التطوير النشطة والنمو</p>
                <div className="my-4">
                  <span className="text-2xl font-black text-slate-900">599</span>
                  <span className="text-xs text-slate-500 font-medium"> ر.س / شهرياً</span>
                </div>
                <ul className="text-[10px] text-slate-600 space-y-2 mt-4 border-t pt-4">
                  <li>✔ عملاء محتملين غير محدودين</li>
                  <li>✔ مشاريع عقارية غير محدودة</li>
                  <li>✔ حتى 10 مستشاري مبيعات</li>
                  <li>✔ ميزة منع التكرار الذكي</li>
                  <li>✔ ربط Snapchat و Meta Ads</li>
                </ul>
              </div>
              <button 
                onClick={() => handleUpgrade('professional')}
                disabled={loadingPlan !== null}
                className="w-full mt-6 bg-amber-500 text-slate-950 hover:bg-amber-600 transition-colors p-2 rounded-lg text-xs font-bold"
              >
                {loadingPlan === 'professional' ? 'جاري التحضير للبوابة...' : 'ترقية الآن (مدى / فيزا)'}
              </button>
            </div>

            {/* باقة الشركات */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-white flex flex-col justify-between shadow-sm hover:border-amber-400 transition-all">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">باقة الشركات (Enterprise)</h3>
                <p className="text-xs text-slate-400 mt-1">للمطورين الكبار وشركات الاستثمار</p>
                <div className="my-4">
                  <span className="text-2xl font-black text-slate-900">1,299</span>
                  <span className="text-xs text-slate-500 font-medium"> ر.س / شهرياً</span>
                </div>
                <ul className="text-[10px] text-slate-600 space-y-2 mt-4 border-t pt-4">
                  <li>✔ جميع ميزات الباقة الاحترافية</li>
                  <li>✔ مستخدمين ومبيعات غير محدودين</li>
                  <li>✔ حماية وعزل مخصص (Private Pool)</li>
                  <li>✔ ربط مع WhatsApp API المباشر</li>
                  <li>✔ دعم فني ومحاسبي مخصص 24/7</li>
                </ul>
              </div>
              <button 
                onClick={() => handleUpgrade('enterprise')}
                disabled={loadingPlan !== null}
                className="w-full mt-6 bg-slate-900 text-white hover:bg-slate-800 transition-colors p-2 rounded-lg text-xs font-bold"
              >
                {loadingPlan === 'enterprise' ? 'جاري التحضير للبوابة...' : 'ترقية الآن (مدى / فيزا)'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}