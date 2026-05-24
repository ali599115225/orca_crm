// app/login/page.tsx
import React from "react";
import { getActiveTenant } from "@/lib/tenant";
import { LoginForm } from "./LoginForm"; // قمنا بالتعديل هنا لاستدعاء مسمّى ومحدد {}

export default async function LoginPage() {
  let tenantName = "منصة ORCA العقارية";
  try {
    const tenant = await getActiveTenant();
    tenantName = tenant.companyName;
  } catch (e) {
    // قيمة بديلة في حال تعذر قراءة النطاق الفرعي
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-right" dir="rtl">
      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <span className="inline-block text-[10px] bg-slate-800 text-amber-500 font-bold px-3 py-1 rounded-full">
            بوابة الدخول الموحدة للنظام العقاري CRM
          </span>
          <h1 className="text-2xl font-black text-white">تسجيل الدخول</h1>
          <p className="text-xs text-slate-400">
            مرحباً بك في لوحة تحكم: <span className="font-bold text-amber-500">{tenantName}</span>
          </p>
        </div>

        {/* نموذج تسجيل الدخول التفاعلي للعميل المسمّى */}
        <LoginForm />
      </div>
    </div>
  );
}