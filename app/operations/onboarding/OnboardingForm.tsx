// app/operations/onboarding/OnboardingForm.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeOnboardingAction } from '@/app/actions/onboarding';

export function OnboardingForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await completeOnboardingAction(formData);
    setLoading(false);

    if (result.success) {
      setSuccess("تم تفعيل وتحديث ملف منشأتك العقارية بنجاح! جاري الانتقال للوحة التحكم...");
      setTimeout(() => {
        // تحديث كاش السيرفر والانتقال التلقائي للوحة التحكم
        router.refresh(); 
        router.push("/operations/analytics");
      }, 1500);
    } else {
      setError(result.error || "حدث خطأ غير متوقع.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg font-bold">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg font-bold">
          {success}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1">الاسم الرسمي والكامل للمنشأة العقارية *</label>
        <input 
          type="text" 
          name="companyName" 
          required
          placeholder="مثال: شركة صرح الوطن العقارية"
          className="w-full border rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">المدينة (المقر الرئيسي) *</label>
          <select name="city" className="w-full border rounded-lg p-2 text-xs">
            <option>الرياض</option>
            <option>جدة</option>
            <option>الدمام</option>
            <option>مكة المكرمة</option>
            <option>الخبر</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">هاتف التواصل الإداري *</label>
          <input 
            type="tel" 
            name="phone" 
            required
            placeholder="05xxxxxxxx"
            className="w-full border rounded-lg p-2 text-xs focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1">رقم السجل التجاري أو وثيقة العمل الحر المعنية *</label>
        <input 
          type="text" 
          name="documentNumber" 
          required
          placeholder="مثال: FL-837482"
          className="w-full border rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-slate-900 text-white hover:bg-slate-800 transition-colors p-2.5 rounded-lg text-xs font-bold cursor-pointer"
      >
        {loading ? "جاري تفعيل وحفظ المنشأة..." : "تنشيط وتفعيل كامل لوحة التحكم"}
      </button>
    </form>
  );
}