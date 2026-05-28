// app/operations/analytics/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getAnalyticsDataAction, AnalyticsSummary } from '@/app/actions/analytics';

// هيكل الترجمة المزدوج للوحة التشغيل الفاخرة لأسواق المملكة والخليج
const TRANSLATIONS = {
  AR: {
    title: "الجيل الجديد من إدارة العقارات: لوحة التحكم والتحليلات السيادية",
    system_logo: "ORCA CRM",
    cloud_status: "حالة الاتصال السحابي: مشفر وآمن ١٠٠٪",
    agent_saher: "الوكيل: ساهر (نشط - يقوم بفرز وتحليل التدفقات التسويقية الآن)",
    agent_sanad: "الوكيل: سند (نشط - يراقب المحفظة المالية وجداول التحصيل)",
    card1_title: "إجمالي العملاء المتابعين",
    card1_sub: "عميل مسجل بالكامل",
    card2_title: "حجوزات نشطة (عربونات)",
    card2_sub: "بانتظار استكمال التمويل",
    card3_title: "عقود البيع النهائي",
    card3_sub: "توقيع وإصدار الفاتورة",
    card4_title: "معدل التحويل الكلي",
    card4_sub: "تحديث لحظي",
    card5_title: "فرص تسويقية مستبعدة",
    card5_sub: "عدم تلاءم ميزانية/تمويل",
    matrix_title: "مصفوفة المخزون العقاري الحركي (برج النخبة السكني)",
    matrix_sold: "مباع (٤٢٠ وحدة)",
    matrix_avail: "متاح (١٥٠ وحدة)",
    matrix_res: "محجوز (٨٥ وحدة)",
    matrix_caption: "٨٥٪ من المحفظة العقارية",
    matrix_sub: "وحدات نشطة ومحميّة بالكامل",
    log_title: "سجل بث وكلاء الذكاء الاصطناعي",
    sources_title: "كفاءة قنوات التسويق والمصادر",
    cities_title: "التوزيع الجغرافي للمبيعات والطلب",
    funnel_title: "مراحل قمع ومسار المبيعات العقارية",
    active_staff: "الطاقم الرقمي المستقل:",
    no_marketing: "لا توجد بيانات تسويقية حية حالياً للتحليل.",
    no_cities: "لا توجد جغرافيا مسجلة حالياً للتحليل.",
    local_clients: "عميل محلي",
    active_update: "تحديث فوري نشط",
    unit_label: "شقة رقم",
    status_sold: "مباعة",
    status_res: "محجوزة",
    status_avail: "متاحة",
    unit_details_title: "تفاصيل الوحدة العقارية",
    floor: "الطابق",
    area: "المساحة",
    price: "السعر",
    loading_text: "جاري جلب وحساب المؤشرات والتقارير العقارية الشاملة..."
  },
  EN: {
    title: "Next-Gen Real Estate Ops: Sovereign Dashboard & Analytics",
    system_logo: "ORCA CRM",
    cloud_status: "Cloud Link: 100% Encrypted & Secure",
    agent_saher: "Agent: Saher (Active - Analyzing marketing streams)",
    agent_sanad: "Agent: Sanad (Active - Monitoring collection schedules)",
    card1_title: "Total Followed Clients",
    card1_sub: "Fully registered clients",
    card2_title: "Active Reservations",
    card2_sub: "Awaiting finance completion",
    card3_title: "Final Sales Contracts",
    card3_sub: "Signed & invoiced",
    card4_title: "Total Conversion Rate",
    card4_sub: "Real-time updates",
    card5_title: "Excluded Marketing Leads",
    card5_sub: "Budget/Funding mismatch",
    matrix_title: "Dynamic Inventory Matrix (Elite Tower Compound)",
    matrix_sold: "Sold (420 Units)",
    matrix_avail: "Available (150 Units)",
    matrix_res: "Reserved (85 Units)",
    matrix_caption: "85% of Portfolio Active",
    matrix_sub: "Fully secured properties",
    log_title: "AI Agents Live Broadcast Log",
    sources_title: "Marketing Channels Efficiency",
    cities_title: "Geographical Sales Distribution",
    funnel_title: "Sales Funnel Stages",
    active_staff: "Autonomous AI Staff:",
    no_marketing: "No live marketing data available for analysis.",
    no_cities: "No locations registered for analysis.",
    local_clients: "local client",
    active_update: "Active Live Sync",
    unit_label: "Unit No.",
    status_sold: "Sold",
    status_res: "Reserved",
    status_avail: "Available",
    unit_details_title: "Property Unit Details",
    floor: "Floor",
    area: "Area",
    price: "Price",
    loading_text: "Fetching and calculating comprehensive real estate metrics..."
  }
};

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lang, setLang] = useState<'AR' | 'EN'>('AR');

  // حاله نشاط الوكلاء الذاتيين
  const [saherActive, setSaherActive] = useState(true);
  const [sanadActive, setSanadActive] = useState(true);

  // سجل العمليات التفاعلية للوكلاء
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<{
    id: number;
    status: 'sold' | 'available' | 'reserved';
    floor: number;
    price: number;
    area: number;
  } | null>(null);

  const logEndRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetch("/api/v1/dashboard/metrics");
        const json = await res.json();
        if (json.success && json.data) {
          setAnalytics(json.data);
        } else {
          const data = await getAnalyticsDataAction();
          setAnalytics(data);
        }
      } catch (err) {
        const data = await getAnalyticsDataAction();
        setAnalytics(data);
      } finally {
        setLoading(false);
      }
    }

    async function loadTelemetry() {
      try {
        const res = await fetch("/api/v1/dashboard/telemetry");
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          // ترتيب السجلات تصاعدياً حسب تاريخ الإنشاء لضمان التمرير الزمني الصحيح
          const sorted = [...json.data].sort(
            (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          const dbLogs = sorted.map((item: any) => item.logMessageAr);
          setLogs(dbLogs);
        }
      } catch (err) {
        console.error("Failed to load telemetry logs:", err);
      }
    }

    loadAnalytics();
    loadTelemetry();

    // تحديث المؤشرات كل 15 ثانية، وتحديث البث للوكلاء كل 7 ثواني
    const metricsInterval = setInterval(loadAnalytics, 15000);
    const telemetryInterval = setInterval(loadTelemetry, 7000);

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setTheme(customEvent.detail);
      }
    };
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setLang(customEvent.detail);
      }
    };

    window.addEventListener('theme-change', handleThemeChange);
    window.addEventListener('lang-change', handleLangChange);

    return () => {
      clearInterval(metricsInterval);
      clearInterval(telemetryInterval);
      window.removeEventListener('theme-change', handleThemeChange);
      window.removeEventListener('lang-change', handleLangChange);
    };
  }, []);

  // تهيئة السجلات الافتراضية كاحتياط عند بدء التشغيل
  useEffect(() => {
    if (lang === 'AR') {
      setLogs([
        "«قام الوكيل ساهر بفرز عميل جديد من حملة قنوات التواصل وتوجيهه لفريق النخبة لارتفاع ملاءته المالية تلقائياً»",
        "«قام الوكيل سند بتوليد رابط دفع مشفر وإرساله عبر الواتساب الآمن للمشتري (...) لتذكيره بالقسط الثالث»",
        "«الدرع السيبراني: تم تشفير وتأمين صك الملكية للوحدة (١٠٤) فور تأكيد عملية السداد بنجاح»"
      ]);
    } else {
      setLogs([
        "«Agent Saher sorted a new lead from social media channels and routed it to the Elite team due to high solvency status automatically»",
        "«Agent Sanad generated an encrypted payment link and sent it via secure WhatsApp to buyer (...) for the 3rd installment reminder»",
        "«Cyber Shield: Encrypted and secured title deed for Unit (104) immediately upon successful payment confirmation»"
      ]);
    }
  }, [lang]);

  // التمرير التلقائي لسجل الأحداث
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // دالة تحويل الأرقام إلى الأرقام العربية الشرقية
  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    
    // تنظيف النسبة المئوية إذا كانت جزءاً من النص
    let str = num.toString();
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    
    // تحويل الأرقام الإنجليزية إلى شرقية
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, "٪");
  };

  // تنسيق المبالغ المالية مع إضافة العملة بالترميز العربي الشرقي
  const formatCurrency = (val: number): string => {
    const formatted = val.toLocaleString('en-US');
    return toArabicNumerals(formatted) + " ر.س";
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[450px] text-xs font-bold text-[#735334] tracking-normal">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping ml-2"></span>
        {t.loading_text}
      </div>
    );
  }

  // مصفوفة تمثل شقق البرج العقاري (المصفوفة الحركية)
  const inventoryUnits = Array.from({ length: 64 }, (_, i) => {
    const floor = Math.floor(i / 8) + 1;
    const id = floor * 100 + (i % 8 + 1);
    let status: 'sold' | 'available' | 'reserved' = 'available';
    if (i % 3 === 0) status = 'sold';
    else if (i % 7 === 0) status = 'reserved';

    const price = (2200000 + (i % 6) * 450000);
    const area = 160 + (i % 5) * 35;

    return { id, status, floor, price, area };
  });

  return (
    <div className={`space-y-6 selection-fix p-1 transition-colors duration-500 ${
      theme === 'dark' ? 'text-white' : 'text-[#0b0f19]'
    }`} dir="rtl">
      
      {/* حقن خط Calibri وعلاج مشكلة التحديد والتنقل الجانبي ديناميكياً */}
      <style dangerouslySetInnerHTML={{__html: `
        body, html, * {
          font-family: 'Calibri', sans-serif !important;
          letter-spacing: normal !important;
        }
        .selection-fix, .selection-fix * {
          letter-spacing: normal !important;
        }
        ::selection {
          background-color: ${theme === "dark" ? "rgba(205, 127, 50, 0.15)" : "rgba(115, 83, 52, 0.12)"} !important;
          color: #27272a !important;
          text-shadow: none !important;
        }
        
        /* إعادة صياغة مظهر لوحة العمليات الكلية من خلال الـ Page */
        .min-h-screen {
          background-color: ${theme === 'dark' ? '#0b0f19' : '#f9f9fb'} !important;
          transition: background-color 0.5s ease;
        }
        main {
          background-color: ${theme === 'dark' ? '#0b0f19' : '#f9f9fb'} !important;
          transition: background-color 0.5s ease;
        }
        main > div.flex-1 {
          background-color: transparent !important;
        }
        main > header {
          background-color: ${theme === 'dark' ? '#0f1422' : '#ffffff'} !important;
          border-bottom: 1px solid ${theme === 'dark' ? 'rgba(205, 127, 50, 0.15)' : '#e2e8f0'} !important;
          color: ${theme === 'dark' ? '#ffffff' : '#0b0f19'} !important;
          transition: background-color 0.5s ease, border-color 0.5s ease, color 0.5s ease;
          box-shadow: ${theme === 'dark' ? '0 4px 20px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.05)'} !important;
        }
        main > header p {
          color: ${theme === 'dark' ? '#e2e8f0' : '#0b0f19'} !important;
        }
        main > header span.bg-slate-100 {
          background-color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'} !important;
          color: ${theme === 'dark' ? '#E6C687' : '#735334'} !important;
          border-color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'} !important;
        }
        
        /* تلوين وتنقية الشريط الجانبي الفاخر */
        aside.bg-slate-900 {
          background-color: ${theme === 'dark' ? '#0e121e' : '#ffffff'} !important;
          border-right: 1px solid ${theme === 'dark' ? 'rgba(205, 127, 50, 0.15)' : '#e5e7eb'} !important;
          color: ${theme === 'dark' ? '#ffffff' : '#0b0f19'} !important;
          transition: background-color 0.5s ease, border-color 0.5s ease, color 0.5s ease;
          box-shadow: ${theme === 'dark' ? '0 10px 30px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.02)'} !important;
        }
        aside.bg-slate-900 a {
          color: ${theme === 'dark' ? '#cbd5e1' : '#4b5563'} !important;
          transition: all 0.3s ease;
        }
        aside.bg-slate-900 a:hover {
          color: ${theme === 'dark' ? '#E6C687' : '#735334'} !important;
          background-color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f3f4f6'} !important;
        }
        aside.bg-slate-900 div.border-b, aside.bg-slate-900 nav.border-t, aside.bg-slate-900 div.border-t {
          border-color: ${theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#e5e7eb'} !important;
        }
        aside.bg-slate-900 p.text-slate-400 {
          color: ${theme === 'dark' ? '#94a3b8' : '#6b7280'} !important;
        }
        aside.bg-slate-900 p.text-slate-100 {
          color: ${theme === 'dark' ? '#f1f5f9' : '#0b0f19'} !important;
        }
        aside.bg-slate-900 span.bg-emerald-950\/60 {
          background-color: ${theme === 'dark' ? 'rgba(6,78,59,0.5)' : '#d1fae5'} !important;
          color: ${theme === 'dark' ? '#34d399' : '#065f46'} !important;
          border-color: ${theme === 'dark' ? 'rgba(16,185,129,0.2)' : '#a7f3d0'} !important;
        }
        aside.bg-slate-900 span.text-amber-500 {
          color: ${theme === 'dark' ? '#E6C687' : '#735334'} !important;
        }
        aside.bg-slate-900 span.text-amber-300 {
          color: ${theme === 'dark' ? '#E6C687' : '#735334'} !important;
          background-color: ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f9fafb'} !important;
          border-color: ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'} !important;
        }
        aside.bg-slate-900 svg {
          color: ${theme === 'dark' ? '#E6C687' : '#735334'} !important;
        }
        
        /* حظر وإخفاء أي علامات مائية أو نصوص غير مرغوب فيها خاصة بـ TradingView */
        [class*="tradingview"], [id*="tradingview"], .tradingview, #tradingview, iframe[src*="tradingview"], div[class*="TradingView"] {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }
      `}} />

      {/* 1. TOP TELEMETRY HEADER & CONTROL BAR - Cleaned up to prevent duplication */}
      <header className={`border p-6 rounded-2xl transition-all duration-500 ${
        theme === 'dark' 
          ? 'bg-[#111726]/60 backdrop-blur-md border-[#cd7f32]/25 shadow-[0_0_30px_rgba(205,127,50,0.04)]' 
          : 'bg-white/80 backdrop-blur-md border-transparent shadow-[0_8px_30px_rgba(0,0,0,0.035)]'
      }`}>
        <h1 className={`text-xl font-bold tracking-normal transition-colors text-right ${
          theme === 'dark' ? 'text-white' : 'text-[#0b0f19]'
        }`}>
          {t.title}
        </h1>
      </header>

      {/* شريط حالة وكلاء الذكاء الاصطناعي المستقلين */}
      <div className={`p-5 rounded-2xl flex flex-col md:flex-row gap-4 justify-between transition-all duration-500 border ${
        theme === 'dark' 
          ? 'bg-[#111726]/40 border-white/5 shadow-inner' 
          : 'bg-white border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)]'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-xs">🤖</span>
          <span className={`text-[11px] font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {t.active_staff}
          </span>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          
          {/* وكيل ساهر */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={saherActive}
              onChange={() => setSaherActive(prev => !prev)}
              className={`rounded focus:ring-0 ${
                theme === 'dark' ? 'bg-slate-900 border-white/20 text-[#E6C687]' : 'bg-white border-slate-300 text-[#735334]'
              }`}
            />
            <span className={`text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
              saherActive ? (theme === 'dark' ? 'text-emerald-400 font-extrabold' : 'text-emerald-700 font-extrabold') : 'text-slate-400'
            }`}>
              {saherActive && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
              )}
              {t.agent_saher}
            </span>
          </label>

          {/* وكيل سند */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sanadActive}
              onChange={() => setSanadActive(prev => !prev)}
              className={`rounded focus:ring-0 ${
                theme === 'dark' ? 'bg-slate-900 border-white/20 text-[#E6C687]' : 'bg-white border-slate-300 text-[#735334]'
              }`}
            />
            <span className={`text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
              sanadActive ? (theme === 'dark' ? 'text-emerald-400 font-extrabold' : 'text-emerald-700 font-extrabold') : 'text-slate-400'
            }`}>
              {sanadActive && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
              )}
              {t.agent_sanad}
            </span>
          </label>

        </div>
      </div>

      {/* 2. THE WEALTH & FINANCES ROW (Live API Metrics) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* كارت 1: إجمالي العملاء المتابعين */}
        <div className={`border p-6 rounded-2xl transition-all duration-500 ${
          theme === 'dark' 
            ? 'bg-[#111726]/60 border-[#cd7f32]/20 hover:border-[#cd7f32]/40 shadow-[0_0_20px_rgba(205,127,50,0.02)]' 
            : 'bg-white/80 border-transparent shadow-[0_8px_30px_rgba(0,0,0,0.035)]'
        }`}>
          <p className={`text-[11px] font-bold transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {t.card1_title}
          </p>
          <p className={`text-4xl font-black mt-3 transition-colors ${theme === 'dark' ? 'text-white' : 'text-[#0b0f19]'}`}>
            {toArabicNumerals(analytics.totalLeads)}
          </p>
          <span className={`text-[10px] font-bold block mt-1.5 transition-colors ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            {t.card1_sub}
          </span>
        </div>

        {/* كارت 2: حجوزات نشطة */}
        <div className={`border p-6 rounded-2xl transition-all duration-500 ${
          theme === 'dark' 
            ? 'bg-[#111726]/60 border-[#cd7f32]/35 hover:border-[#cd7f32]/50 shadow-[0_0_25px_rgba(205,127,50,0.06)]' 
            : 'bg-white/80 border-transparent shadow-[0_8px_30px_rgba(0,0,0,0.035)]'
        }`}>
          <p className={`text-[11px] font-bold transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {t.card2_title}
          </p>
          <p className={`text-4xl font-black mt-3 transition-colors ${
            theme === 'dark' ? 'text-[#E6C687] drop-shadow-[0_2px_10px_rgba(230,198,135,0.25)]' : 'text-[#735334]'
          }`}>
            {toArabicNumerals(analytics.activeBookings)}
          </p>
          <span className={`text-[10px] font-bold block mt-1.5 transition-colors ${theme === 'dark' ? 'text-[#E6C687]/80' : 'text-[#735334]'}`}>
            {t.card2_sub}
          </span>
        </div>

        {/* كارت 3: عقود البيع النهائي */}
        <div className={`border p-6 rounded-2xl transition-all duration-500 ${
          theme === 'dark' 
            ? 'bg-[#111726]/60 border-[#cd7f32]/20 hover:border-[#cd7f32]/40 shadow-[0_0_20px_rgba(205,127,50,0.02)]' 
            : 'bg-white/80 border-transparent shadow-[0_8px_30px_rgba(0,0,0,0.035)]'
        }`}>
          <p className={`text-[11px] font-bold transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {t.card3_title}
          </p>
          <p className={`text-4xl font-black mt-3 transition-colors ${
            theme === 'dark' ? 'text-emerald-400 drop-shadow-[0_2px_10px_rgba(52,211,153,0.2)]' : 'text-emerald-700'
          }`}>
            {toArabicNumerals(analytics.closedSales)}
          </p>
          <span className={`text-[10px] font-bold block mt-1.5 transition-colors ${theme === 'dark' ? 'text-emerald-400/80' : 'text-emerald-700'}`}>
            {t.card3_sub}
          </span>
        </div>

        {/* كارت 4: معدل التحويل الكلي */}
        <div className={`border p-6 rounded-2xl transition-all duration-500 ${
          theme === 'dark' 
            ? 'bg-[#111726]/60 border-[#cd7f32]/20 hover:border-[#cd7f32]/40 shadow-[0_0_20px_rgba(205,127,50,0.02)]' 
            : 'bg-white/80 border-transparent shadow-[0_8px_30px_rgba(0,0,0,0.035)]'
        }`}>
          <p className={`text-[11px] font-bold transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {t.card4_title}
          </p>
          <p className={`text-4xl font-black mt-3 transition-colors ${theme === 'dark' ? 'text-white' : 'text-[#0b0f19]'}`}>
            {toArabicNumerals(analytics.conversionRate)}
          </p>
          <span className="text-[10px] font-bold block mt-1.5 text-emerald-500">
            {t.card4_sub}
          </span>
        </div>

        {/* كارت 5: فرص تسويقية مستبعدة */}
        <div className={`border p-6 rounded-2xl transition-all duration-500 ${
          theme === 'dark' 
            ? 'bg-[#111726]/60 border-[#cd7f32]/20 hover:border-[#cd7f32]/40 shadow-[0_0_20px_rgba(205,127,50,0.02)]' 
            : 'bg-white/80 border-transparent shadow-[0_8px_30px_rgba(0,0,0,0.035)]'
        }`}>
          <p className={`text-[11px] font-bold transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {t.card5_title}
          </p>
          <p className={`text-4xl font-black mt-3 text-rose-500`}>
            {toArabicNumerals(analytics.lostLeads)}
          </p>
          <span className="text-[10px] font-bold block mt-1.5 text-rose-500">
            {t.card5_sub}
          </span>
        </div>

      </div>

      {/* 3 & 4. Grid Container (Interactive compound grid + stream log + analytics) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* العمود الأيمن والأوسط (مصفوفة المخزون وقمع المبيعات) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* المخطط الحركي للمحفظة العقارية (Inventory Matrix) */}
          <div className={`border p-6 rounded-3xl relative overflow-hidden transition-all duration-500 ${
            theme === 'dark' 
              ? 'bg-[#111726]/60 border-[#cd7f32]/25 shadow-2xl' 
              : 'bg-white/80 border-transparent shadow-[0_8px_30px_rgba(0,0,0,0.035)]'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-200/10 dark:border-white/5 mb-6 gap-3">
              <h3 className={`font-black text-sm transition-colors ${theme === 'dark' ? 'text-[#E6C687]' : 'text-[#735334]'}`}>
                {t.matrix_title}
              </h3>
              
              {/* دليل الألوان */}
              <div className="flex items-center flex-wrap gap-4 text-[10px] font-bold">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{t.matrix_sold}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{t.matrix_avail}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-[#cd7f32]" />
                  <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{t.matrix_res}</span>
                </div>
              </div>
            </div>

            {/* شبكة محاكاة أجزاء البرج العقاري */}
            <div className="relative">
              <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 md:gap-2.5 p-4 bg-slate-950/20 dark:bg-black/20 border border-white/5 dark:border-white/5 rounded-2xl">
                {inventoryUnits.map((unit) => {
                  let statusColor = "";
                  if (unit.status === 'sold') {
                    statusColor = theme === 'dark' 
                      ? "bg-emerald-500/15 border-emerald-500/60 hover:bg-emerald-500/25 text-emerald-400" 
                      : "bg-emerald-50 border-emerald-300 hover:bg-emerald-100 text-emerald-800";
                  } else if (unit.status === 'reserved') {
                    statusColor = theme === 'dark' 
                      ? "bg-[#cd7f32]/15 border-[#E6C687]/50 hover:bg-[#cd7f32]/25 text-[#E6C687]" 
                      : "bg-amber-50 border-[#735334]/50 hover:bg-amber-100 text-[#735334]";
                  } else {
                    statusColor = theme === 'dark' 
                      ? "bg-blue-500/15 border-blue-500/60 hover:bg-blue-500/25 text-blue-400" 
                      : "bg-blue-50 border-blue-300 hover:bg-blue-100 text-blue-800";
                  }

                  return (
                    <button
                      key={unit.id}
                      onClick={() => setSelectedUnit(unit)}
                      title={`${t.unit_label} ${toArabicNumerals(unit.id)} (${unit.status === 'sold' ? t.status_sold : unit.status === 'reserved' ? t.status_res : t.status_avail})`}
                      className={`aspect-square border rounded-md flex items-center justify-center text-[8px] md:text-[9px] font-black cursor-pointer select-none transition-all duration-300 hover:scale-105 active:scale-95 ${statusColor}`}
                    >
                      {toArabicNumerals(unit.id)}
                    </button>
                  );
                })}
              </div>

              {/* الشعار التوضيحي الأوسط بالكامل في المنتصف */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`border px-8 py-4 rounded-2xl backdrop-blur-md shadow-2xl transition-all duration-500 ${
                  theme === 'dark' ? 'bg-slate-900/90 border-[#E6C687]/30' : 'bg-white/95 border-[#735334]/30'
                }`}>
                  <span className={`text-2xl font-black block text-center ${
                    theme === 'dark' ? 'text-[#E6C687] drop-shadow-[0_2px_8px_rgba(230,198,135,0.3)]' : 'text-[#735334]'
                  }`}>
                    {t.matrix_caption}
                  </span>
                  <span className={`text-[10px] font-bold block text-center mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t.matrix_sub}
                  </span>
                </div>
              </div>
            </div>

            {/* عرض تفاصيل الوحدة التي تم النقر عليها */}
            {selectedUnit && (
              <div className={`mt-5 p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-center gap-4 transition-all duration-500 animate-fadeIn ${
                theme === 'dark' ? 'bg-white/5 border-[#cd7f32]/30' : 'bg-[#735334]/5 border-[#735334]/20'
              }`}>
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${
                    selectedUnit.status === 'sold' ? 'bg-emerald-500' : selectedUnit.status === 'reserved' ? 'bg-[#cd7f32]' : 'bg-blue-500'
                  }`} />
                  <div>
                    <h4 className="font-extrabold text-xs">
                      {t.unit_details_title} | <span dir="ltr">{t.unit_label} {toArabicNumerals(selectedUnit.id)}</span>
                    </h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {t.floor} {toArabicNumerals(selectedUnit.floor)} - {selectedUnit.status === 'sold' ? t.status_sold : selectedUnit.status === 'reserved' ? t.status_res : t.status_avail}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 text-xs font-black">
                  <div>
                    <span className="text-gray-400 font-bold block text-[9px]">{t.area}</span>
                    <span>{toArabicNumerals(selectedUnit.area)} م²</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block text-[9px]">{t.price}</span>
                    <span className={theme === 'dark' ? 'text-[#E6C687]' : 'text-[#735334]'}>
                      {formatCurrency(selectedUnit.price)}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUnit(null)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded border cursor-pointer transition-all ${
                    theme === 'dark' 
                      ? 'border-white/10 hover:bg-white/5 text-slate-300' 
                      : 'border-slate-300 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  إغلاق ✕
                </button>
              </div>
            )}
          </div>

          {/* قمع المبيعات ومسار الفرص */}
          <div className={`border p-6 rounded-3xl transition-all duration-500 ${
            theme === 'dark' 
              ? 'bg-[#111726]/60 border-[#cd7f32]/25 shadow-2xl' 
              : 'bg-white/80 border-transparent shadow-[0_8px_30px_rgba(0,0,0,0.035)]'
          }`}>
            <h3 className={`font-black text-sm pb-4 border-b border-gray-200/10 dark:border-white/5 mb-5 transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-[#0b0f19]'
            }`}>
              {t.funnel_title}
            </h3>
            
            <div className="space-y-4 font-semibold">
              {analytics.pipelineStages.map((stage) => (
                <div key={stage.status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{stage.status}</span>
                    <span className={theme === 'dark' ? 'text-[#E6C687]' : 'text-[#735334] font-black'}>
                      {toArabicNumerals(stage.count)} {lang === 'AR' ? 'عميل' : 'leads'} ({toArabicNumerals(stage.percentage)}%)
                    </span>
                  </div>
                  <div className={`w-full rounded-full h-3 overflow-hidden ${
                    theme === 'dark' ? 'bg-slate-900/80 border border-white/5' : 'bg-slate-100'
                  }`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        theme === 'dark' ? 'bg-gradient-to-r from-[#cd7f32] to-[#E6C687]' : 'bg-[#735334]'
                      }`}
                      style={{ width: `${stage.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* العمود الأيسر (سجل العمليات وتحليل المدن والقنوات) */}
        <div className="space-y-6">
          
          {/* سجل بث وكلاء الذكاء الاصطناعي (Live Agent Telemetry Stream Log) */}
          <div className={`border p-6 rounded-3xl flex flex-col h-[340px] transition-all duration-500 ${
            theme === 'dark' 
              ? 'bg-black/40 border-[#cd7f32]/25 shadow-inner' 
              : 'bg-slate-100/70 border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-200/10 dark:border-white/5 mb-4 shrink-0">
              <h3 className={`font-black text-sm transition-colors ${theme === 'dark' ? 'text-white' : 'text-[#0b0f19]'}`}>
                {t.log_title}
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-[11px] leading-relaxed">
              {logs.map((log, lIdx) => {
                let agentColor = theme === 'dark' ? 'text-slate-300' : 'text-slate-700';
                if (log.includes("ساهر") || log.includes("Saher")) {
                  agentColor = theme === 'dark' ? 'text-[#E6C687]' : 'text-[#735334] font-bold';
                } else if (log.includes("سند") || log.includes("Sanad")) {
                  agentColor = 'text-emerald-500 font-bold';
                } else if (log.includes("الدرع") || log.includes("Shield")) {
                  agentColor = 'text-blue-400 font-bold';
                }

                return (
                  <div key={lIdx} className={`p-3 rounded-lg transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'bg-white/5 border border-white/5 hover:bg-white/10' 
                      : 'bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)]'
                  } ${agentColor}`}>
                    {log}
                  </div>
                );
              })}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* قنوات التسويق والمصادر */}
          <div className={`border p-6 rounded-3xl transition-all duration-500 ${
            theme === 'dark' 
              ? 'bg-[#111726]/60 border-[#cd7f32]/25 shadow-2xl' 
              : 'bg-white/80 border-transparent shadow-[0_8px_30px_rgba(0,0,0,0.035)]'
          }`}>
            <h3 className={`font-black text-sm pb-4 border-b border-gray-200/10 dark:border-white/5 mb-4 transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-[#0b0f19]'
            }`}>
              {t.sources_title}
            </h3>
            {analytics.sourcesBreakdown.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">{t.no_marketing}</p>
            ) : (
              <div className="space-y-2">
                {analytics.sourcesBreakdown.map((src) => (
                  <div key={src.source} className={`flex items-center justify-between p-3 rounded-lg border ${
                    theme === 'dark' ? 'bg-[#0b0f19]/40 border-white/5' : 'bg-slate-50/50 border-slate-200/50'
                  }`}>
                    <span className="text-xs font-bold">
                      {src.source === "Snapchat Ads" ? (lang === 'AR' ? "إعلانات سناب شات" : "Snapchat Ads") : 
                       src.source === "Meta Ads" ? (lang === 'AR' ? "حملة ميتا الإعلانية" : "Meta Ads") : src.source}
                    </span>
                    <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                      theme === 'dark' ? 'bg-[#E6C687]/15 text-[#E6C687]' : 'bg-[#735334]/15 text-[#735334]'
                    }`}>
                      {toArabicNumerals(src.count)} {lang === 'AR' ? 'عملاء' : 'leads'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* التوزيع الجغرافي للمبيعات والطلب بالمدن */}
          <div className={`border p-6 rounded-3xl transition-all duration-500 ${
            theme === 'dark' 
              ? 'bg-[#111726]/60 border-[#cd7f32]/25 shadow-2xl' 
              : 'bg-white/80 border-transparent shadow-[0_8px_30px_rgba(0,0,0,0.035)]'
          }`}>
            <h3 className={`font-black text-sm pb-4 border-b border-gray-200/10 dark:border-white/5 mb-4 transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-[#0b0f19]'
            }`}>
              {t.cities_title}
            </h3>
            {analytics.citiesBreakdown.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">{t.no_cities}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 font-semibold">
                {analytics.citiesBreakdown.map((city) => (
                  <div key={city.city} className={`p-4 border rounded-xl text-center transition-all ${
                    theme === 'dark' ? 'bg-[#0b0f19]/40 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <p className="text-[10px] text-gray-400 font-bold">{city.city}</p>
                    <p className={`text-xl font-black mt-1 ${theme === 'dark' ? 'text-white' : 'text-[#0b0f19]'}`}>
                      {toArabicNumerals(city.count)}
                    </p>
                    <span className="text-[9px] text-slate-500 font-bold">{t.local_clients}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}