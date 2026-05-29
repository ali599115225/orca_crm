// app/register/RegisterForm.tsx
"use client";

import React, { useState } from "react";
import { registerTenantAction } from "@/app/actions/register";
import { useRouter } from "next/navigation";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await registerTenantAction(formData);
    setLoading(false);

    if (result.success) {
      // في الإنتاج الفعلي، يتم تحويل العميل لنطاقه الفرعي الحقيقي:
      // const targetUrl = `http://${result.subdomain}.orcacrm.sa/operations`;
      // window.location.href = targetUrl;
      
      // في بيئة التطوير المحلي، نوجهه مباشرة للوحة التحليلات
      router.push("/operations");
    } else {
      setError(result.error || "حدث خطأ غير متوقع أثناء التسجيل.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-rose-950/40 border border-rose-900/60 text-rose-400 text-xs p-3 rounded-lg font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المنشأة التطويرية *</label>
          <input 
            type="text" 
            name="companyName"
            required
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="شركة الماجدية العقارية"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">النطاق الفرعي المطلوب (Subdomain) *</label>
          <div className="flex" dir="ltr">
            <span className="bg-slate-800 border border-slate-700 rounded-l-lg px-2.5 py-2.5 text-[10px] text-slate-400">
              .orcacrm.sa
            </span>
            <input 
              type="text" 
              name="subdomain"
              required
              className="flex-1 bg-slate-900 border border-slate-800 rounded-r-lg p-2.5 text-xs text-white text-left focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="al-majediah"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4">
        <p className="text-[10px] font-bold text-slate-400 mb-3">بيانات المدير العام للمنصة (Admin User)</p>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">الاسم الكامل *</label>
            <input 
              type="text" 
              name="adminName"
              required
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              placeholder="عبد العزيز بن محمد"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">البريد الإلكتروني للإدارة *</label>
              <input 
                type="email" 
                name="adminEmail"
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                placeholder="admin@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">كلمة المرور المشفرة *</label>
              <input 
                type="password" 
                name="adminPassword"
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>
      </div>

      <button 
        type="submit"
        disabled={loading}
        className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors p-3 rounded-lg text-xs font-bold mt-2"
      >
        {loading ? "جاري إنشاء منشأتك الآمنة في قاعدة البيانات..." : "تأسيس المنشأة وبدء الفترة التجريبية"}
      </button>

      <div className="text-center pt-2">
        <a href="/login" className="text-[10px] text-slate-400 hover:text-white transition-colors">
          لديك حساب منشأة مسبقاً؟ تسجيل الدخول
        </a>
      </div>
    </form>
  );
}