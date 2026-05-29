// app/admin/page.tsx
"use client";

import React, { useState } from "react";
import { loginAction } from "@/app/actions/auth";
import { useApp } from "@/app/context/AppContext";

const SUPER_ADMIN_EMAILS = ["ali.orca@outlook.sa", "elite.orca@outlook.sa"];

const TRANSLATIONS = {
  AR: {
    title: "بوابة الإدارة الفوقية",
    subtitle: "مخصصة لفريق أوركا فقط — وصول محظور على الغير",
    emailLabel: "بريد الإدارة الفوقية",
    passwordLabel: "كلمة المرور السرية",
    submitBtn: "🔒 دخول آمن للإدارة",
    loadingText: "⏳ جارٍ التحقق من الهوية...",
    errorUnauthorized: "⛔ هذه البوابة مخصصة للإدارة الفوقية فقط. يُمنع الوصول.",
    backToSales: "← العودة إلى الصفحة الرئيسية"
  },
  EN: {
    title: "Super Admin Command Gateway",
    subtitle: "Exclusively for Orca Personnel — Unauthorized Access Prohibited",
    emailLabel: "Super Admin Email Address",
    passwordLabel: "Secret Encryption Password",
    submitBtn: "🔒 Secure Administrative Entry",
    loadingText: "⏳ Verifying Identity...",
    errorUnauthorized: "⛔ This gateway is restricted to Super Administrators only.",
    backToSales: "← Back to Main Landing Page"
  }
};

export default function AdminLoginPage() {
  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (lang === 'EN') return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, "٪");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    // التحقق المبدئي من البريد الإلكتروني للإدارة الفوقية
    if (!SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase())) {
      setLoading(false);
      setError(t.errorUnauthorized);
      return;
    }

    formData.append("clientHost", window.location.host);
    formData.append("clientProto", window.location.protocol.replace(":", ""));

    try {
      const result = await loginAction(formData);
      setLoading(false);

      if (!result) {
        setError(lang === 'AR' ? "لم يتم تلقي استجابة من الخادم." : "No response received from the server.");
        return;
      }

      if (result.success) {
        // توجيه الأدمن مباشرة للوحة التحكم الفوقية command commands
        window.location.href = "/operations";
      } else {
        setError(result.error || (lang === 'AR' ? "فشل تسجيل الدخول." : "Authentication failed."));
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || (lang === 'AR' ? "حدث خطأ غير متوقع." : "An unexpected error occurred."));
    }
  };

  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-all duration-300 ${
        isDark ? "bg-[#0b0f19] text-white" : "bg-[#f9f9fb] text-[#735334]"
      }`}
      dir={lang === "AR" ? "rtl" : "ltr"}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .cyber-glass-card {
          background: rgba(11, 15, 25, 0.7) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          border: 1px solid #735334 !important; /* Polished Bronze border */
          box-shadow: 0 0 40px rgba(115, 83, 52, 0.25) !important;
        }
        .milky-glass-card {
          background: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(15px) !important;
          -webkit-backdrop-filter: blur(15px) !important;
          border: 1px solid rgba(115, 83, 52, 0.3) !important;
          box-shadow: 0 15px 35px rgba(115, 83, 52, 0.08) !important;
        }
      `}} />

      <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 10 }}>
        
        {/* Shield Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "64px", height: "64px", borderRadius: "18px",
            background: isDark ? "rgba(115, 83, 52, 0.15)" : "rgba(115, 83, 52, 0.1)",
            border: "1px solid #735334",
            boxShadow: isDark ? "0 0 25px rgba(115, 83, 52, 0.2)" : "0 5px 15px rgba(115, 83, 52, 0.1)",
            marginBottom: "16px", fontSize: "28px"
          }}>
            🛡️
          </div>
          
          <h1 className={`text-xl font-black ${isDark ? "text-white" : "text-[#735334]"}`} style={{ margin: 0 }}>
            {t.title}
          </h1>
          <p className={`text-xs ${isDark ? "text-slate-400" : "text-[#735334]/80"}`} style={{ marginTop: "8px" }}>
            {t.subtitle}
          </p>
        </div>

        {/* Login Card Panel */}
        <div className={isDark ? "cyber-glass-card rounded-3xl p-8" : "milky-glass-card rounded-3xl p-8"}>
          
          {error && (
            <div style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "10px", padding: "12px 16px",
              color: isDark ? "#fca5a5" : "#b91c1c", fontSize: "11px", fontWeight: 700,
              marginBottom: "20px", textAlign: "center"
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label className={`block text-[10px] font-extrabold mb-1.5 ${isDark ? "text-[#E6C687]" : "text-[#735334]"}`}>
                {t.emailLabel}
              </label>
              <input
                type="email"
                name="email"
                required
                defaultValue="ali.orca@outlook.sa"
                placeholder="ali.orca@outlook.sa"
                className={`w-full border rounded-xl p-3 text-xs focus:outline-none transition-colors ${
                  isDark 
                    ? "bg-[#0b0f19] border-slate-700/60 text-white focus:border-[#735334] focus:ring-1 focus:ring-[#735334]" 
                    : "bg-white border-slate-300 text-slate-900 focus:border-[#735334] focus:ring-1 focus:ring-[#735334]"
                }`}
              />
            </div>

            <div>
              <label className={`block text-[10px] font-extrabold mb-1.5 ${isDark ? "text-[#E6C687]" : "text-[#735334]"}`}>
                {t.passwordLabel}
              </label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className={`w-full border rounded-xl p-3 text-xs focus:outline-none transition-colors ${
                  isDark 
                    ? "bg-[#0b0f19] border-slate-700/60 text-white focus:border-[#735334] focus:ring-1 focus:ring-[#735334]" 
                    : "bg-white border-slate-300 text-slate-900 focus:border-[#735334] focus:ring-1 focus:ring-[#735334]"
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full text-xs font-black p-3.5 rounded-xl transition-all cursor-pointer text-white hover:scale-[1.01]`}
              style={{
                background: "#735334",
                border: "none",
                marginTop: "8px",
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? t.loadingText : t.submitBtn}
            </button>
          </form>

        </div>

        {/* Back Link */}
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <a 
            href="/" 
            className={`text-[10px] font-extrabold transition-opacity hover:opacity-85 ${isDark ? "text-slate-500" : "text-[#735334]"}`}
          >
            {t.backToSales}
          </a>
        </div>

      </div>
    </div>
  );
}