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
          router.push(result.redirectUrl || "/operations");
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-rose-950/40 border border-rose-900/60 text-rose-400 text-xs p-3.5 rounded-xl font-bold text-center">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-yellow-500/80 mb-1.5">البريد الإلكتروني المعتمد</label>
        <input 
          type="email" 
          name="email"
          required
          className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all placeholder:text-slate-600"
          placeholder="ahmed@dar.com"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-yellow-500/80 mb-1.5">كلمة المرور</label>
        <input 
          type="password" 
          name="password"
          required
          className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all placeholder:text-slate-600"
          placeholder="••••••••"
        />
      </div>

      <button 
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-slate-950 transition-all p-3.5 rounded-xl text-xs font-black shadow-lg shadow-yellow-500/10 hover:shadow-yellow-500/20 active:scale-[0.99] cursor-pointer"
      >
        {loading ? "جاري التحقق والدخول الآمن..." : "دخول آمن للنظام"}
      </button>
    </form>
  );
}
