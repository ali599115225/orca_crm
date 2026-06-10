// app/operations/onboarding/page.tsx
import React from 'react';
import { getActiveTenant } from '@/lib/tenant';
import { redirect } from 'next/navigation';
import { OnboardingForm } from './OnboardingForm'; // استدعاء استمارة العميل

// تعيين اسم التبويب العلوي للمتصفح باللغة العربية بدقة
export const metadata = {
  title: "خطوة التفعيل النهائية - ORCA",
};

export default async function OnboardingPage() {
  // 1. جلب بيانات المنشأة في السيرفر للتحقق من الأمان
  const tenant = await getActiveTenant();
  
  const rawCompanyName = tenant?.companyName || "";
  const isNewTenant = rawCompanyName === "" || rawCompanyName === "منشأة جديدة قيد التأسيس" || rawCompanyName.includes("قيد التأسيس");

  // 2. فحص أمان SaaS ذكي: إذا كانت البيانات مكتملة ومفعّلة مسبقاً (مثل شركة العلي)،
  // نقوم بتحويل العميل تلقائياً بداخل السيرفر لصفحة التحليلات مباشرة دون عرض الاستمارة
  if (!isNewTenant) {
    redirect("/operations");
  }

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
      <div className="text-center space-y-1">
        <span className="inline-block text-[10px] bg-amber-500/10 text-amber-500 font-bold px-3 py-1 rounded-full border border-amber-500/10">
          خطوة التفعيل النهائية لنظام الـ SaaS 🏢
        </span>
        <h2 className="text-xl font-black text-[var(--nc-text-primary)] font-bold">إكمال بيانات ملف منشأتك العقارية</h2>
        <p className="text-xs text-[var(--nc-text-dim)] font-medium">
          يرجى تدوين الاسم الرسمي والوثائق لتنشيط لوحة العمليات الخاصة بك وتخصيص التقارير والفواتير [1.2.1]
        </p>
      </div>

      {/* استدعاء استمارة التفعيل التفاعلية للعميل */}
      <OnboardingForm />
    </div>
  );
}
