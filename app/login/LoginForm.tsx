// app/login/LoginForm.tsx
"use client";

import React, { useState } from "react";
import { loginAction } from "@/app/actions/auth";
import { useRouter } from "next/navigation";

// قمنا بتغيير التصدير هنا إلى named export لمنع أخطاء Turbopack
export function LoginForm() { 
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      formData.append("clientHost", window.location.host);
      formData.append("clientProto", window.location.protocol.replace(":", ""));
      const result = await loginAction(formData);
      setLoading(false);

      if (!result) {
        setError("لم يتم تلقي أي استجابة من خادم النظام. يرجى تحديث الصفحة والمحاولة مجدداً.");
        return;
      }

      if (result.success) {
        if (result.redirectUrl && result.redirectUrl.startsWith("http")) {
          window.location.href = result.redirectUrl;
        } else {
          router.push(result.redirectUrl || "/operations/analytics");
        }
      } else {
        setError(result.error || "فشل تسجيل الدخول. يرجى التحقق من البيانات.");
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "حدث خطأ غير متوقع أثناء تسجيل الدخول.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-rose-950/40 border border-rose-900/60 text-rose-400 text-xs p-3 rounded-lg font-bold">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">البريد الإلكتروني المعتمد</label>
        <input 
          type="email" 
          name="email"
          required
          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="ahmed@dar.com"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">كلمة المرور</label>
        <input 
          type="password" 
          name="password"
          required
          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="••••••••"
        />
      </div>

      <button 
        type="submit"
        disabled={loading}
        className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors p-2.5 rounded-lg text-xs font-bold"
      >
        {loading ? "جاري التحقق والدخول الآمن..." : "دخول آمن للنظام"}
      </button>
    </form>
  );
}