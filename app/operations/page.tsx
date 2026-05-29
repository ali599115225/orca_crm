// app/operations/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/app/context/AppContext";

const TRANSLATIONS = {
  AR: {
    title: "غرفة العمليات المركزية والتحكم السيادي",
    subtitle: "مراقبة حية لبنية الذكاء الاصطناعي، تدفقات الاستحواذ، ومحركات السحب لشركة أوركا",
    pipelineTitle: "مسار تدفق العمليات المتكاملة (End-to-End Core Operations Pipeline Stream)",
    pipelineStep1: "بوابة الاستحواذ الخارجية",
    pipelineStep2: "معالجة ساهر الـ NLP",
    pipelineStep3: "التوزيع والمستشار النشط",
    pipelineStep4: "مطابقة SAMA DSR",
    pipelineStep5: "تحصيل الوكيل سند وإصدار العقد",
    monitorsTitle: "شاشات تشخيص أداء الوكلاء الرقميين (AI Agents Command Monitors)",
    saherName: "الوكيل ساهر - فرز وتأهيل الاستثمار",
    sanadName: "الوكيل سند - التحصيل المالي وجدولة الأقساط",
    processingLoad: "حمل المعالجة الجاري:",
    queueLatency: "زمن استجابة الطابور:",
    circuitBreaker: "حالة قاطع الدائرة الذكي:",
    circuitStable: "مستقر وآمن",
    logsTitle: "بث بروتوكول التتبع والاتصال المباشر (Incoming Tactical Telemetry Logs)",
    activeSession: "جلسة إشرافية نشطة",
  },
  EN: {
    title: "Central War Room Operations Command",
    subtitle: "Real-time telemetry of AI architecture, acquisition streams, and collection engines",
    pipelineTitle: "End-to-End Core Operations Pipeline Stream",
    pipelineStep1: "External Lead Ingestion",
    pipelineStep2: "Saher NLP Intent Classifier",
    pipelineStep3: "Distribution & Active Consultant",
    pipelineStep4: "SAMA DSR Credit Matcher",
    pipelineStep5: "Sanad Automated Payment Linker",
    monitorsTitle: "AI Agents Command Monitors",
    saherName: "Agent Saher - Investment Qualification",
    sanadName: "Agent Sanad - Automated Collection Console",
    processingLoad: "Active Processing Load:",
    queueLatency: "Queue Response Latency:",
    circuitBreaker: "AI Circuit Breaker Threshold:",
    circuitStable: "Stable & Secure",
    logsTitle: "Incoming Tactical Telemetry Logs",
    activeSession: "Active Admin Session",
  }
};

const LOGS_AR = [
  "[معلومات] [ساهر] تم التقاط ليد جديد من سناب شات للمستثمر أ. الشمري برقم هاتف ٠٥٠٥٤٣٢١٠٩ في الرياض.",
  "[تدقيق] [ساهر] فحص الملاءة المالية للعميل المكتشف: درجة الجدية الاستثمارية عالية جداً (٩٢٪).",
  "[توجيه] [ساهر] إحالة المستثمر تلقائياً للمستشار النشط (صلاح الغامدي).",
  "[معلومات] [سند] جدولة القسط الأول للوحدة ٩٩٩ في برج النخبة بقيمة ١٢٥,٠٠٠ ر.س استحقاق بعد ٣ أيام.",
  "[واتساب] [سند] إرسال رابط الدفع الآمن والمشفر للمستثمر أ. أحمد بن عبد العزيز.",
  "[تنبيه] [سند] قيد التحديث: العميل م. خالد الهذلول سدد القسط المستحق للوحدة ٥٠٢ بقيمة ٨٥,٠٠٠ ر.س.",
  "[سيبراني] [سند] تم بنجاح مصادقة الاتصال بقناة بوابة مدى البنكية وتحديث الصك المالي للوحدة.",
  "[أمان] [النظام] تم كشف محاولة اتصال مكررة وجرى تصفية البيانات المشبوهة بنجاح."
];

const LOGS_EN = [
  "[INFO] [Saher] Captured snapchat campaign lead for investor A. Al-Shammari, phone 0505432109, Riyadh.",
  "[AUDIT] [Saher] Verified investor intent and financial solvency status: High intent score (92%).",
  "[ROUTE] [Saher] Routing lead automatically to active consultant Salah Al-Ghamdi.",
  "[INFO] [Sanad] Scheduled installment 1 for Unit 999 at Elite Residence, amount 125,000 SAR due in 3 days.",
  "[WHATSAPP] [Sanad] Dispatched secure encrypted checkout link to investor text.",
  "[WARN] [Sanad] Status update: Investor M. Al-Hathloul paid installment for Unit 502, amount 85,000 SAR.",
  "[CYBER] [Sanad] Successfully authenticated secure channel handshake with SAMA checkout gateway.",
  "[SECURITY] [System] Handled spam attempts; client sessions filtered and logged."
];

export default function WarRoomCommandPage() {
  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;
  const isDark = theme === "dark";

  const [activeLogs, setActiveLogs] = useState<string[]>([]);
  const [logIndex, setLogIndex] = useState(0);

  // دالة تحويل الأرقام إلى الأرقام العربية الشرقية حسب اللغة النشطة
  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (lang === 'EN') return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, "٪");
  };

  useEffect(() => {
    const rawLogs = lang === "AR" ? LOGS_AR : LOGS_EN;
    setActiveLogs(rawLogs.slice(0, 4));
    setLogIndex(4);
  }, [lang]);

  useEffect(() => {
    const interval = setInterval(() => {
      const rawLogs = lang === "AR" ? LOGS_AR : LOGS_EN;
      setActiveLogs((prev) => {
        const nextLog = rawLogs[logIndex % rawLogs.length];
        return [nextLog, ...prev.slice(0, 14)];
      });
      setLogIndex((prev) => prev + 1);
    }, 4000);

    return () => clearInterval(interval);
  }, [logIndex, lang]);

  return (
    <div
      className={`min-h-[85vh] transition-all duration-300 ${
        isDark ? "text-white" : "text-[#0b0f19]"
      }`}
      dir={lang === "AR" ? "rtl" : "ltr"}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .warroom-card-dark {
          background: rgba(11, 15, 25, 0.7) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(115, 83, 52, 0.35) !important; /* Polished Bronze border */
          box-shadow: 0 10px 40px 0 rgba(0, 0, 0, 0.35) !important;
        }
        
        .warroom-card-light {
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
      `}} />

      {/* ترويسة غرفة العمليات */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6 transition-all ${
        isDark ? "warroom-card-dark" : "warroom-card-light"
      }`}>
        <div>
          <h1 className={`text-2xl font-black ${isDark ? "text-white" : "text-[#735334]"}`}>
            {t.title}
          </h1>
          <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? "text-slate-400" : "text-[#735334]/80"}`}>
            {t.subtitle}
          </p>
        </div>
        
        <div className={`px-4 py-2 rounded-xl font-bold text-xs shrink-0 text-center border flex items-center gap-2 ${
          isDark 
            ? "bg-[#735334]/20 text-[#E6C687] border-[#735334]/40" 
            : "bg-[#735334]/10 text-[#735334] border-[#735334]/20"
        }`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>{t.activeSession}</span>
        </div>
      </div>

      {/* LAYER 3: E2E Pipeline Stream View */}
      <div className={`p-6 rounded-2xl border mb-6 transition-all ${
        isDark ? "warroom-card-dark" : "warroom-card-light"
      }`}>
        <h3 className={`text-xs font-black mb-6 ${isDark ? "text-slate-200" : "text-[#735334]"}`}>
          {t.pipelineTitle}
        </h3>
        
        {/* المخطط الانسيابي الأفقي للعمليات */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {[
            t.pipelineStep1,
            t.pipelineStep2,
            t.pipelineStep3,
            t.pipelineStep4,
            t.pipelineStep5
          ].map((step, idx) => (
            <div key={idx} className="relative flex flex-col items-center">
              
              {/* بطاقة الخطوة */}
              <div className={`w-full p-4 rounded-xl border text-center transition-all duration-300 relative z-10 ${
                isDark 
                  ? "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-[#735334]/50" 
                  : "bg-white border-[#735334]/20 text-[#735334] hover:border-[#735334]"
              }`}>
                {/* رقم الخطوة الدائري */}
                <div className="w-5 h-5 rounded-full bg-[#735334] text-white text-[10px] font-black flex items-center justify-center mx-auto mb-2.5">
                  {toArabicNumerals(idx + 1)}
                </div>
                <p className="text-[10px] font-extrabold">{step}</p>
              </div>

              {/* سهم التوجيه بين الخطوات (يظهر فقط على الشاشات الكبيرة) */}
              {idx < 4 && (
                <div className={`hidden md:block absolute top-1/2 -translate-y-1/2 text-xs font-black text-[#735334] ${
                  lang === 'AR' ? 'left-[-12px] rotate-180' : 'right-[-12px]'
                }`}>
                  ➔
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* شاشات تشخيص أداء الوكلاء الرقميين */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`p-6 rounded-2xl border transition-all ${
            isDark ? "warroom-card-dark" : "warroom-card-light"
          }`}>
            <h3 className={`text-xs font-black mb-6 ${isDark ? "text-slate-200" : "text-[#735334]"}`}>
              {t.monitorsTitle}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* شاشة مراقبة الوكيل ساهر */}
              <div className={`p-5 rounded-xl border space-y-4 ${
                isDark ? "bg-slate-950/40 border-slate-800/80" : "bg-white border-[#735334]/20"
              }`}>
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className={`text-xs font-black ${isDark ? "text-white" : "text-[#735334]"}`}>
                    {t.saherName}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse pulse-emerald"></span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between font-bold">
                    <span className={isDark ? "text-slate-400" : "text-slate-600"}>{t.processingLoad}</span>
                    <span className={isDark ? "text-emerald-400" : "text-emerald-700"}>
                      {toArabicNumerals("14%") || "١٤٪"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between font-bold">
                    <span className={isDark ? "text-slate-400" : "text-slate-600"}>{t.queueLatency}</span>
                    <span className={isDark ? "text-white" : "text-[#735334]"}>
                      {toArabicNumerals("45")}{lang === 'AR' ? ' ملي ثانية' : 'ms'}
                    </span>
                  </div>

                  <div className="flex justify-between font-bold">
                    <span className={isDark ? "text-slate-400" : "text-slate-600"}>{t.circuitBreaker}</span>
                    <span className={isDark ? "text-[#E6C687] font-black" : "text-[#735334] font-black"}>{t.circuitStable}</span>
                  </div>
                </div>
              </div>

              {/* شاشة مراقبة الوكيل سند */}
              <div className={`p-5 rounded-xl border space-y-4 ${
                isDark ? "bg-slate-950/40 border-slate-800/80" : "bg-white border-[#735334]/20"
              }`}>
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className={`text-xs font-black ${isDark ? "text-white" : "text-[#735334]"}`}>
                    {t.sanadName}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse pulse-amber"></span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between font-bold">
                    <span className={isDark ? "text-slate-400" : "text-slate-600"}>{t.processingLoad}</span>
                    <span className={isDark ? "text-emerald-400" : "text-emerald-700"}>
                      {toArabicNumerals("8%") || "٨٪"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between font-bold">
                    <span className={isDark ? "text-slate-400" : "text-slate-600"}>{t.queueLatency}</span>
                    <span className={isDark ? "text-white" : "text-[#735334]"}>
                      {toArabicNumerals("12")}{lang === 'AR' ? ' ملي ثانية' : 'ms'}
                    </span>
                  </div>

                  <div className="flex justify-between font-bold">
                    <span className={isDark ? "text-slate-400" : "text-slate-600"}>{t.circuitBreaker}</span>
                    <span className={isDark ? "text-[#E6C687] font-black" : "text-[#735334] font-black"}>{t.circuitStable}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* بث تتبع الاتصال المباشر - Terminal display */}
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all ${
            isDark ? "warroom-card-dark" : "warroom-card-light"
          }`}>
            <h3 className={`font-black text-xs ${isDark ? "text-slate-200" : "text-[#735334]"}`}>
              {t.logsTitle}
            </h3>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
          </div>

          <div className={`p-4 rounded-2xl border transition-all duration-300 ${
            isDark ? "warroom-card-dark border-[#735334]/40" : "warroom-card-light"
          }`}>
            {/* الشاشة الطرفية Terminal */}
            <div className={`p-3 rounded-lg overflow-y-auto max-h-[250px] min-h-[180px] font-mono text-[9px] leading-relaxed border ${
              isDark ? "bg-black/40 border-slate-900 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-800"
            }`}>
              <pre className="whitespace-pre-wrap font-mono">
                {activeLogs.map((log, idx) => (
                  <div key={idx} className={`border-b border-white/5 py-1 ${lang === 'AR' ? 'text-right' : 'text-left'}`} dir={lang === 'AR' ? 'rtl' : 'ltr'}>
                    {toArabicNumerals(log)}
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
