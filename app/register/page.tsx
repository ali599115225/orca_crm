// app/register/page.tsx
import React from "react";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-right" dir="rtl">
      <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <span className="inline-block text-[10px] bg-slate-800 text-amber-500 font-bold px-3 py-1 rounded-full">
            انضم الآن إلى منصة ORCA كشريك نجاح عقاري
          </span>
          <h1 className="text-2xl font-black text-white">تسجيل منشأة تطوير عقاري</h1>
          <p className="text-xs text-slate-400">
            أنشئ لوحة تحكمك الخاصة وابدأ بإدارة مشاريعك وعملائك بدقائق معدودة
          </p>
        </div>

        {/* نموذج استمارة التسجيل التفاعلي */}
        <RegisterForm />
      </div>
    </div>
  );
}
