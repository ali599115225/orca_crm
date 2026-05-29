// app/login/LoginClient.tsx
"use client";

import React, { useState } from "react";
import { loginAction } from "@/app/actions/auth";
import { useRouter } from "next/navigation";

interface LoginClientProps {
  tenantName: string;
  host: string;
}

export default function LoginClient({ tenantName, host }: LoginClientProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [lang, setLang] = useState<"AR" | "EN">("AR");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const router = useRouter();

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const toggleLang = () => {
    setLang((prev) => (prev === "AR" ? "EN" : "AR"));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;

      if (isAdminMode && !["ali.orca@outlook.sa", "elite.orca@outlook.sa"].includes(email.trim().toLowerCase())) {
        setLoading(false);
        setError(lang === "AR" ? "⛔ هذه البوابة مخصصة للإدارة الفوقية فقط. يُمنع الوصول." : "⛔ This gateway is restricted to Super Administrators only.");
        return;
      }

      formData.append("clientHost", host || window.location.host);
      formData.append("clientProto", window.location.protocol.replace(":", ""));
      const result = await loginAction(formData);
      setLoading(false);

      if (!result) {
        setError(lang === "AR" ? "لم يتم تلقي أي استجابة من خادم النظام. يرجى تحديث الصفحة والمحاولة مجدداً." : "No response received from the server. Please try again.");
        return;
      }

      if (result.success) {
        if (result.redirectUrl && result.redirectUrl.startsWith("http")) {
          window.location.href = result.redirectUrl;
        } else {
          router.push(result.redirectUrl || "/operations");
        }
      } else {
        setError(result.error || (lang === "AR" ? "فشل تسجيل الدخول. يرجى التحقق من البيانات." : "Authentication failed."));
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || (lang === "AR" ? "حدث خطأ غير متوقع أثناء تسجيل الدخول." : "An unexpected error occurred."));
    }
  };

  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between items-center px-4 md:px-6 relative overflow-hidden transition-colors duration-500 ${
        isDark ? "bg-[#0b0f19] text-white" : "bg-[#f9f9fb] text-[#0b0f19]"
      }`}
      dir={lang === "AR" ? "rtl" : "ltr"}
    >
      {/* تعميم خط Calibri وعلاج مشكلة تحديد النصوص العربية */}
      <style dangerouslySetInnerHTML={{__html: `
        body, html, * {
          font-family: 'Calibri', sans-serif !important;
        }
        .vault-card, .vault-card * {
          letter-spacing: normal !important;
        }
        .vault-card ::selection {
          background-color: ${isDark ? "rgba(230, 198, 135, 0.15)" : "rgba(115, 83, 52, 0.15)"} !important;
          color: #0b0f19 !important;
          text-shadow: none !important;
          display: inline !important;
        }
        ::selection {
          background-color: ${isDark ? "rgba(230, 198, 135, 0.15)" : "rgba(115, 83, 52, 0.15)"} !important;
          color: #0b0f19 !important;
          text-shadow: none !important;
        }
      `}} />

      {/* خلفية جمالية خافتة تتناسب مع كل وضع */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className={`absolute top-1/4 left-1/4 w-[500px] h-[500px] blur-[120px] rounded-full transition-colors duration-500 ${
          isDark ? "bg-[#cd7f32]/5" : "bg-[#735334]/5"
        }`} />
        <div className={`absolute bottom-1/4 right-1/4 w-[400px] h-[400px] blur-[100px] rounded-full transition-colors duration-500 ${
          isDark ? "bg-emerald-500/3" : "bg-emerald-500/2"
        }`} />
      </div>

      {/* 1. SYSTEM NAVIGATION HEADER */}
      <header className="w-full max-w-7xl h-16 flex items-center justify-between z-20 shrink-0">
        {/* logo */}
        <div className="flex items-center gap-2 select-none cursor-pointer">
          <span className={`text-lg font-black tracking-wider transition-colors duration-500 ${
            isDark ? "text-[#E6C687]" : "text-[#735334]"
          }`}>
            ORCA CRM
          </span>
          <span className={`text-[8px] font-bold border px-1.5 py-0.5 rounded transition-colors duration-500 ${
            isDark ? "border-[#E6C687]/30 text-[#E6C687]/80" : "border-[#735334]/30 text-[#735334]"
          }`} dir="ltr">
            RTL Secure
          </span>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLang}
            className={`h-8 px-2.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
              isDark
                ? "bg-white/5 border-white/10 text-slate-300 hover:border-[#E6C687]/50 hover:text-[#E6C687]"
                : "bg-white border-slate-300 text-slate-700 hover:border-[#735334] hover:text-[#735334] shadow-sm"
            }`}
          >
            🌐 {lang === "AR" ? "EN" : "عربي"}
          </button>
          
          <button
            onClick={toggleTheme}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs transition-all cursor-pointer ${
              isDark
                ? "bg-white/5 border-white/10 text-slate-300 hover:border-[#E6C687]/50 hover:text-[#E6C687]"
                : "bg-white border-slate-300 text-slate-700 hover:border-[#735334] hover:text-[#735334] shadow-sm"
            }`}
            title="تبديل وضع الألوان"
          >
            {isDark ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {/* 2. MAIN ENTRY VAULT */}
      <main className="flex-1 flex items-center justify-center w-full max-w-[460px] z-10 py-6">
        <div className={`vault-card w-full transition-all duration-500 border ${
          isDark
            ? "bg-[#0b0f19]/80 border-[#cd7f32]/30 backdrop-blur-xl shadow-[0_0_40px_rgba(205,127,50,0.15)] rounded-[28px] p-8 md:p-10 shadow-black/80"
            : "bg-white/70 border-slate-200 backdrop-blur-md shadow-sm shadow-slate-200/50 rounded-[28px] p-8 md:p-10"
        }`}>
          
          {/* Admin Switcher Tab */}
          <div className="flex justify-center mb-6">
            <button
              type="button"
              onClick={() => { setIsAdminMode(!isAdminMode); setError(null); }}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer border ${
                isAdminMode 
                  ? (isDark ? "bg-[#E6C687] text-slate-950 border-[#E6C687]" : "bg-[#735334] text-white border-[#735334]") 
                  : (isDark ? "bg-transparent text-slate-400 border-slate-800 hover:text-slate-200" : "bg-transparent text-slate-500 border-slate-200 hover:text-slate-800")
              }`}
            >
              {isAdminMode 
                ? (lang === "AR" ? "🔒 بوابة الإدارة الفوقية" : "🔒 Super Admin Gateway")
                : (lang === "AR" ? "🔑 دخول الموظفين والمستشارين" : "🔑 Employee & Advisor Login")
              }
            </button>
          </div>

          {/* العنوان ووصف الغرفة الآمنة */}
          <div className="text-center space-y-3 mb-8">
            <div className="flex justify-center">
              {isAdminMode ? (
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: "56px", height: "56px", borderRadius: "16px",
                  background: isDark ? "rgba(115, 83, 52, 0.15)" : "rgba(115, 83, 52, 0.1)",
                  border: "1px solid #735334",
                  boxShadow: isDark ? "0 0 20px rgba(115, 83, 52, 0.2)" : "0 5px 15px rgba(115, 83, 52, 0.1)",
                  marginBottom: "8px", fontSize: "24px"
                }}>
                  🛡️
                </div>
              ) : (
                <div className="text-2xl mb-1">🔑</div>
              )}
            </div>
            
            <h1 className={`text-xl md:text-2xl font-black transition-colors duration-500 ${
              isDark ? "text-white" : "text-[#0b0f19]"
            }`}>
              {isAdminMode 
                ? (lang === "AR" ? "بوابة الإدارة الفوقية" : "Super Admin Command Gateway")
                : (lang === "AR" ? "بوابة الوصول الآمن | Orca CRM" : "Secure Entry Portal | Orca CRM")
              }
            </h1>
            <p className={`text-xs font-semibold leading-relaxed transition-colors duration-500 ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}>
              {isAdminMode 
                ? (lang === "AR" ? "مخصصة لفريق أوركا فقط — وصول محظور على الغير" : "Exclusively for Orca Personnel — Unauthorized Access Prohibited")
                : (lang === "AR" ? `مرحباً بك مجدداً. ادخل إلى حصنك الرقمي لإدارة وحماية محفظتك العقارية في لوحة تحكم: ` : "Welcome back. Access your digital vault to manage and protect your portfolio under: ")
              }
              {!isAdminMode && <span className={`font-black ${isDark ? "text-[#E6C687]" : "text-[#735334]"}`}>{tenantName}</span>}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 font-semibold">
            {error && (
              <div className="bg-rose-950/20 border border-rose-900/40 text-rose-400 text-xs p-3.5 rounded-xl font-bold text-center">
                {error}
              </div>
            )}

            {/* البريد الإلكتروني */}
            <div className="space-y-2">
              <label className={`block text-xs font-bold transition-colors duration-500 ${
                isDark ? "text-[#E6C687]" : "text-[#735334]"
              }`}>
                {isAdminMode 
                  ? (lang === "AR" ? "بريد الإدارة الفوقية" : "Super Admin Email Address")
                  : (lang === "AR" ? "البريد الإلكتروني للمؤسسة" : "Organization Email Address")
                }
              </label>
              <div className="relative">
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none select-none">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                  </svg>
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  defaultValue={isAdminMode ? "ali.orca@outlook.sa" : ""}
                  placeholder={isAdminMode ? "ali.orca@outlook.sa" : "name@company.com"}
                  className={`w-full border rounded-xl pl-4 pr-11 py-3.5 text-xs transition-all duration-300 focus:outline-none focus:ring-1 ${
                    isDark
                      ? "bg-[#0b0f19]/60 border-white/10 text-white placeholder:text-slate-600 focus:border-[#E6C687]/50 focus:ring-[#E6C687]/50"
                      : "bg-white/80 border-slate-300 text-[#0b0f19] placeholder:text-slate-400 focus:border-[#735334]/50 focus:ring-[#735334]/50"
                  }`}
                />
              </div>
            </div>

            {/* كلمة المرور */}
            <div className="space-y-2">
              <label className={`block text-xs font-bold transition-colors duration-500 ${
                isDark ? "text-[#E6C687]" : "text-[#735334]"
              }`}>
                {isAdminMode 
                  ? (lang === "AR" ? "كلمة المرور السرية" : "Secret Encryption Password")
                  : (lang === "AR" ? "كلمة المرور" : "Password")
                }
              </label>
              <div className="relative">
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none select-none">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className={`w-full border rounded-xl pl-4 pr-11 py-3.5 text-xs transition-all duration-300 focus:outline-none focus:ring-1 ${
                    isDark
                      ? "bg-[#0b0f19]/60 border-white/10 text-white placeholder:text-slate-600 focus:border-[#E6C687]/50 focus:ring-[#E6C687]/50"
                      : "bg-white/80 border-slate-300 text-[#0b0f19] placeholder:text-slate-400 focus:border-[#735334]/50 focus:ring-[#735334]/50"
                  }`}
                />
              </div>
            </div>

            {/* ضوابط وظيفية */}
            <div className="flex items-center justify-between text-[11px] select-none font-bold">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className={`rounded focus:ring-0 ${
                    isDark
                      ? "bg-[#0b0f19] border-white/20 text-[#E6C687]"
                      : "bg-white border-slate-300 text-[#735334]"
                  }`}
                />
                <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                  {lang === "AR" ? "تذكر هذا الجهاز بأمان" : "Remember this device securely"}
                </span>
              </label>

              <a
                href="#forgot"
                className={`hover:underline transition-colors ${
                  isDark ? "text-[#E6C687]/90 hover:text-white" : "text-[#735334] hover:text-[#5a4028]"
                }`}
              >
                {lang === "AR" ? "نسيت كلمة المرور؟" : "Forgot Password?"}
              </a>
            </div>

            {/* زر تسجيل الدخول */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl p-4 text-xs font-black transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 ${
                isDark
                  ? "bg-[#E6C687] hover:bg-[#d4af37] text-[#0b0f19] shadow-[0_4px_20px_rgba(230,198,135,0.25)]"
                  : "bg-[#735334] hover:bg-[#5a4028] text-white shadow-[0_4px_20px_rgba(115,83,52,0.25)]"
              }`}
            >
              {loading ? (
                <>{lang === "AR" ? "جاري التحقق والولوج الآمن..." : "Verifying Identity..."}</>
              ) : (
                <>
                  {isAdminMode 
                    ? (lang === "AR" ? "🔒 دخول آمن للإدارة ➔" : "🔒 Secure Administrative Entry ➔")
                    : (lang === "AR" ? "دخول آمن إلى محفظتك الاستثمارية ➔" : "Secure Entry to Portfolio ➔")
                  }
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* 3. IRONCLAD SECURITY FOOTER */}
      <footer className={`w-full max-w-4xl py-6 text-center text-[10px] font-bold z-20 shrink-0 border-t transition-colors duration-500 ${
        isDark ? "border-white/5 text-slate-500" : "border-slate-200 text-slate-600"
      }`}>
        <p className="flex items-center justify-center gap-1.5">
          <span>🛡️</span>
          <span>
            {lang === "AR"
              ? "هذه الجلسة مشفرة بالكامل ومعتمدة وفقاً لأعلى معايير الحماية السيبرانية البنكية."
              : "This session is fully encrypted and authenticated in compliance with SAMA/NCA cyber security guidelines."
            }
          </span>
        </p>
      </footer>
    </div>
  );
}
