// app/studio-operations/page.tsx
"use client";

import React from "react";
import { useApp } from "@/app/context/AppContext";

const TRANSLATIONS = {
  AR: {
    title: "مكتب استوديو العمليات المستقل — Ali.orca.E",
    subtitle: "تتبع حالة وتكامل أصول برمجيات الاستوديو وواجهات الإنتاج",
    assetsTitle: "مصفوفة تتبع المنتجات والواجهات البرمجية",
    assetLabel: "الأصل البرمجي",
    statusLabel: "حالة العمليات:",
    asset1Title: "واجهة التطوير العقاري المتقدم (Orca CRM)",
    asset1Status: "تم النشر والإنتاج على النطاق الحي orca-az-ez.pro",
    asset2Title: "قالب متجر إلكتروني فاخر",
    asset2Status: "قيد هندسة الكود",
    asset3Title: "صفحة هبوط شخصية ومحفظة أعمال",
    asset3Status: "مرحلة التصميم المبدئي",
  },
  EN: {
    title: "Ali.orca.E — Independent Studio Operations Desk",
    subtitle: "Telemetry of studio software assets, development modules, and production viewports",
    assetsTitle: "Studio Software Assets Tracking Grid",
    assetLabel: "Software Asset",
    statusLabel: "Operations Status:",
    asset1Title: "Advanced Real Estate CRM (Orca CRM)",
    asset1Status: "Deployed & Live in Production at domain orca-az-ez.pro",
    asset2Title: "Luxury E-Commerce Template",
    asset2Status: "Code Engineering Phase",
    asset3Title: "Personal Portfolio & Landing Page",
    asset3Status: "Initial Design Concept",
  }
};

export default function StudioOperationsPage() {
  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;
  const isDark = theme === "dark";

  // دالة تحويل الأرقام إلى الأرقام العربية الشرقية حسب اللغة النشطة
  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (lang === 'EN') return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)]);
  };

  return (
    <div
      className={`min-h-[80vh] transition-all duration-300`}
      dir={lang === "AR" ? "rtl" : "ltr"}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .studio-card-dark {
          background: rgba(11, 15, 25, 0.7) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(115, 83, 52, 0.35) !important; /* Polished Bronze border */
          box-shadow: 0 10px 40px 0 rgba(0, 0, 0, 0.35) !important;
        }
        
        .studio-card-light {
          background: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(15px) !important;
          -webkit-backdrop-filter: blur(15px) !important;
          border: 1px solid rgba(115, 83, 52, 0.25) !important;
          box-shadow: 0 12px 35px rgba(115, 83, 52, 0.08) !important;
        }

        .pulse-emerald {
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.6);
        }
        .pulse-amber {
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.6);
        }
        .pulse-slate {
          box-shadow: 0 0 10px rgba(100, 116, 139, 0.6);
        }
      `}} />

      {/* ترويسة مكتب الاستوديو */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6 transition-all ${
        isDark ? "studio-card-dark" : "studio-card-light"
      }`}>
        <div>
          <span className="bg-[#735334] text-white font-extrabold text-[9px] px-3 py-1 rounded-full uppercase tracking-wider">
            Ali.orca.E Studio
          </span>
          <h1 className={`text-2xl font-black mt-2 ${isDark ? "text-white" : "text-[#735334]"}`}>
            {t.title}
          </h1>
          <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? "text-slate-400" : "text-[#735334]/80"}`}>
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* شبكة الأصول البرمجية للواجهات */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isDark ? "studio-card-dark" : "studio-card-light"
      }`}>
        <h3 className={`text-sm font-black mb-6 ${isDark ? "text-slate-200" : "text-[#735334]"}`}>
          {t.assetsTitle}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Asset 1: Orca CRM */}
          <div className={`p-5 rounded-xl border flex flex-col justify-between h-[180px] ${
            isDark ? "bg-slate-950/40 border-slate-800/80" : "bg-white border-[#735334]/25"
          }`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black bg-[#735334]/15 text-[#E6C687] px-2 py-0.5 rounded border border-[#735334]/30">
                  {t.assetLabel} {toArabicNumerals("1")}
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 pulse-emerald"></span>
                </span>
              </div>
              <h4 className={`text-xs font-black leading-relaxed ${isDark ? "text-white" : "text-[#735334]"}`}>
                {t.asset1Title}
              </h4>
            </div>

            <div className="border-t border-white/5 pt-3">
              <span className={`block text-[9px] font-extrabold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {t.statusLabel}
              </span>
              <span className={`text-[10px] font-bold ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                {t.asset1Status}
              </span>
            </div>
          </div>

          {/* Asset 2: Premium Shop Template */}
          <div className={`p-5 rounded-xl border flex flex-col justify-between h-[180px] ${
            isDark ? "bg-slate-950/40 border-slate-800/80" : "bg-white border-[#735334]/25"
          }`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black bg-[#735334]/15 text-[#E6C687] px-2 py-0.5 rounded border border-[#735334]/30">
                  {t.assetLabel} {toArabicNumerals("2")}
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 pulse-amber"></span>
                </span>
              </div>
              <h4 className={`text-xs font-black leading-relaxed ${isDark ? "text-white" : "text-[#735334]"}`}>
                {t.asset2Title}
              </h4>
            </div>

            <div className="border-t border-white/5 pt-3">
              <span className={`block text-[9px] font-extrabold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {t.statusLabel}
              </span>
              <span className={`text-[10px] font-bold ${isDark ? "text-amber-400" : "text-amber-700"}`}>
                {t.asset2Status}
              </span>
            </div>
          </div>

          {/* Asset 3: Personal Landing Page */}
          <div className={`p-5 rounded-xl border flex flex-col justify-between h-[180px] ${
            isDark ? "bg-slate-950/40 border-slate-800/80" : "bg-white border-[#735334]/25"
          }`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black bg-[#735334]/15 text-[#E6C687] px-2 py-0.5 rounded border border-[#735334]/30">
                  {t.assetLabel} {toArabicNumerals("3")}
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500 pulse-slate"></span>
                </span>
              </div>
              <h4 className={`text-xs font-black leading-relaxed ${isDark ? "text-white" : "text-[#735334]"}`}>
                {t.asset3Title}
              </h4>
            </div>

            <div className="border-t border-white/5 pt-3">
              <span className={`block text-[9px] font-extrabold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {t.statusLabel}
              </span>
              <span className={`text-[10px] font-bold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                {t.asset3Status}
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
