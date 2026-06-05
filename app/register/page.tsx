// app/register/page.tsx
import React from "react";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#1C2B48] flex items-center justify-center p-4 text-right" dir="rtl">
      <div className="w-full max-w-lg bg-[#1C2B48] border border-[#A7C7E7]/20 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <span className="inline-block text-[10px] bg-[#1C2B48] text-amber-500 font-bold px-3 py-1 rounded-full">
            انضم الآن إلى منصة ORCA كشريك نجاح عقاري
          </span>
          <h1 className="text-2xl font-black text-white">تسجيل منشأة تطوير عقاري</h1>
          <p className="text-xs text-[#C4D8E5] font-medium">
            أنشئ لوحة تحكمك الخاصة وابدأ بإدارة مشاريعك وعملائك بدقائق معدودة
          </p>
        </div>

        {/* نموذج استمارة التسجيل التفاعلي */}
        <RegisterForm />
      </div>
    </div>
  );
}
