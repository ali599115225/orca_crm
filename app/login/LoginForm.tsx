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
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs p-3.5 rounded-xl font-bold text-center">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">البريد الإلكتروني المعتمد</label>
        <input 
          type="email" 
          name="email"
          required
          className="w-full bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-corporate-blue dark:focus:border-cyan-glow focus:ring-1 focus:ring-corporate-blue dark:focus:ring-cyan-glow transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
          placeholder="ahmed@dar.com"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">كلمة المرور</label>
        <input 
          type="password" 
          name="password"
          required
          className="w-full bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-corporate-blue dark:focus:border-cyan-glow focus:ring-1 focus:ring-corporate-blue dark:focus:ring-cyan-glow transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
          placeholder="••••••••"
        />
      </div>

      <button 
        type="submit"
        disabled={loading}
        className="w-full bg-corporate-blue dark:bg-cyan-glow text-white dark:text-slate-950 transition-all p-3.5 rounded-xl text-xs font-black shadow-lg hover:opacity-90 active:scale-[0.99] cursor-pointer"
      >
        {loading ? "جاري التحقق والدخول الآمن..." : "دخول آمن للنظام"}
      </button>
    </form>
  );
}
