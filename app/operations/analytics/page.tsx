// app/operations/analytics/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getAnalyticsDataAction, AnalyticsSummary } from '@/app/actions/analytics';
import { getAgentStatusAction, toggleAgentStatusAction } from '@/app/actions/agentSlots';
import { useApp } from '@/app/context/AppContext';

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
    loading_text: "جاري جلب وحساب المؤشرات والتقارير العقارية الشاملة...",
    agent_filter_label: "الوكيل: الكل",
    agent_filter_saher: "الوكيل: ساهر",
    agent_filter_sanad: "الوكيل: سند",
    severity_filter_all: "المستوى: الكل",
    severity_filter_info: "معلومات (Info)",
    severity_filter_warning: "تنبيه (Warning)",
    severity_filter_critical: "حرج (Critical)",
    leads_unit: "عميل",
    close_btn: "إغلاق ✕"
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
    loading_text: "Fetching and calculating comprehensive real estate metrics...",
    agent_filter_label: "Agent: All",
    agent_filter_saher: "Agent: Saher",
    agent_filter_sanad: "Agent: Sanad",
    severity_filter_all: "Severity: All",
    severity_filter_info: "Info",
    severity_filter_warning: "Warning",
    severity_filter_critical: "Critical",
    leads_unit: "leads",
    close_btn: "Close ✕"
  }
};

export default function AnalyticsDashboard() {
  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // حاله نشاط الوكلاء الذاتيين
  const [saherActive, setSaherActive] = useState(false);
  const [sanadActive, setSanadActive] = useState(false);

  // سجل العمليات التفاعلية للوكلاء
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([]);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('ALL'); // ALL, SAHER, SANAD
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('ALL'); // ALL, Info, Warning, Critical
  
  // المخزن الحركي للوحدات والوحدة المحددة للتفاصيل
  const [inventoryUnits, setInventoryUnits] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<{
    id: string;
    unitNumber: string;
    floorPosition: number;
    priceSar: number;
    status: string;
    area: number;
  } | null>(null);

  // مرجع حاوية سجل البث لمنع تمرير الصفحة تلقائياً
  const logContainerRef = useRef<HTMLDivElement>(null);

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
          // ترتيب السجلات تنازلياً حسب تاريخ الإنشاء لضمان التمرير الزمني الصحيح (الجديد في الأعلى)
          const sorted = [...json.data].sort(
            (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setTelemetryLogs(sorted);
        }
      } catch (err) {
        console.error("Failed to load telemetry logs:", err);
      }
    }

    async function loadUnits() {
      try {
        const res = await fetch("/api/v1/dashboard/units");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setInventoryUnits(json.data);
        }
      } catch (err) {
        console.error("Failed to load inventory units:", err);
      }
    }

    async function loadAgentStatuses() {
      try {
        const saherRes = await getAgentStatusAction('SAHER');
        if (saherRes.success) setSaherActive(saherRes.isActive);
        
        const sanadRes = await getAgentStatusAction('SANAD');
        if (sanadRes.success) setSanadActive(sanadRes.isActive);
      } catch (err) {
        console.error("Failed to load agent statuses:", err);
      }
    }

    loadAnalytics();
    loadTelemetry();
    loadUnits();
    loadAgentStatuses();

    // تحديث المؤشرات والوحدات كل 15 ثانية، وتحديث البث للوكلاء كل 7 ثواني
    const metricsInterval = setInterval(loadAnalytics, 15000);
    const telemetryInterval = setInterval(loadTelemetry, 7000);
    const unitsInterval = setInterval(loadUnits, 15000);
    const agentsInterval = setInterval(loadAgentStatuses, 15000);

    return () => {
      clearInterval(metricsInterval);
      clearInterval(telemetryInterval);
      clearInterval(unitsInterval);
      clearInterval(agentsInterval);
    };
  }, []);

  // تهيئة السجلات الافتراضية كاحتياط عند بدء التشغيل
  useEffect(() => {
    if (lang === 'AR') {
      setTelemetryLogs([
        {
          id: "mock-1",
          agentId: "SAHER",
          actionType: "Lead_Screening",
          logMessageAr: "«قام الوكيل ساهر بفرز عميل جديد من حملة قنوات التواصل وتوجيهه لفريق النخبة لارتفاع ملاءته المالية تلقائياً»",
          severity: "Info",
          createdAt: new Date().toISOString()
        },
        {
          id: "mock-2",
          agentId: "SANAD",
          actionType: "Link_Dispatched",
          logMessageAr: "«قام الوكيل سند بتوليد رابط دفع مشفر وإرساله عبر الواتساب الآمن للمشتري (...) لتذكيره بالقسط الثالث»",
          severity: "Warning",
          createdAt: new Date(Date.now() - 60000).toISOString()
        },
        {
          id: "mock-3",
          agentId: "SAHER",
          actionType: "Security_Lock",
          logMessageAr: "«الدرع السيبراني: تم تشفير وتأمين صك الملكية للوحدة (١٠٤) فور تأكيد عملية السداد بنجاح»",
          severity: "Critical",
          createdAt: new Date(Date.now() - 120000).toISOString()
        }
      ]);
    } else {
      setTelemetryLogs([
        {
          id: "mock-1",
          agentId: "SAHER",
          actionType: "Lead_Screening",
          logMessageAr: "«Agent Saher sorted a new lead from social media channels and routed it to the Elite team due to high solvency status automatically»",
          severity: "Info",
          createdAt: new Date().toISOString()
        },
        {
          id: "mock-2",
          agentId: "SANAD",
          actionType: "Link_Dispatched",
          logMessageAr: "«Agent Sanad generated an encrypted payment link and sent it via secure WhatsApp to buyer (...) for the 3rd installment reminder»",
          severity: "Warning",
          createdAt: new Date(Date.now() - 60000).toISOString()
        },
        {
          id: "mock-3",
          agentId: "SAHER",
          actionType: "Security_Lock",
          logMessageAr: "«Cyber Shield: Encrypted and secured title deed for Unit (104) immediately upon successful payment confirmation»",
          severity: "Critical",
          createdAt: new Date(Date.now() - 120000).toISOString()
        }
      ]);
    }
  }, [lang]);

  // إعادة scroll حاوية السجلات للأعلى عند ورود سجلات جديدة (داخل الحاوية فقط)
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [telemetryLogs]);

  const formatLogTime = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}:${seconds}`;
      return toArabicNumerals(timeStr);
    } catch (e) {
      return "";
    }
  };

  const handleToggleSaher = async () => {
    const nextVal = !saherActive;
    setSaherActive(nextVal);
    try {
      const res = await toggleAgentStatusAction('SAHER', nextVal);
      if (!res.success) {
        setSaherActive(!nextVal); // Rollback
        alert(res.error || "فشل تعديل حالة الوكيل ساهر.");
      } else {
        setSaherActive(res.isActive);
      }
    } catch (err: any) {
      setSaherActive(!nextVal);
      alert(err.message || "حدث خطأ غير متوقع.");
    }
  };

  const handleToggleSanad = async () => {
    const nextVal = !sanadActive;
    setSanadActive(nextVal);
    try {
      const res = await toggleAgentStatusAction('SANAD', nextVal);
      if (!res.success) {
        setSanadActive(!nextVal); // Rollback
        alert(res.error || "فشل تعديل حالة الوكيل سند.");
      } else {
        setSanadActive(res.isActive);
      }
    } catch (err: any) {
      setSanadActive(!nextVal);
      alert(err.message || "حدث خطأ غير متوقع.");
    }
  };

  const filteredLogs = telemetryLogs.filter(log => {
    const matchAgent = selectedAgentFilter === 'ALL' || log.agentId === selectedAgentFilter;
    const matchSeverity = selectedSeverityFilter === 'ALL' || log.severity === selectedSeverityFilter;
    return matchAgent && matchSeverity;
  });

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

  // تنسيق المبالغ المالية مع إضافة العملة بالترميز العربي الشرقي
  const formatCurrency = (val: number): string => {
    const formatted = val.toLocaleString('en-US');
    if (lang === 'EN') {
      return formatted + " SAR";
    }
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

  return (
    <div className={`space-y-6 selection-fix p-1 transition-colors duration-500 ${
      theme === 'dark' ? 'text-white' : 'text-[#0b0f19]'
    }`} dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      {/* حقن خط Calibri وعلاج مشكلة التحديد - مُنقّح بدون CSS يُعيد رسم عناصر خارج نطاق الصفحة */}
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
        /* حظر TradingView */
        [class*="tradingview"], [id*="tradingview"], .tradingview, #tradingview {
          display: none !important;
          visibility: hidden !important;
        }
        /* حركة ظهور سجل البث - بالـ opacity فقط دون تحريك الـ layout */
        @keyframes logFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-log-append {
          animation: logFadeIn 0.3s ease forwards;
        }
      `}} />
      
      {/* 1. TOP TELEMETRY HEADER & CONTROL BAR - Cleaned up to prevent duplication */}
      <header className={`border p-6 rounded-2xl transition-all duration-500 ${
        theme === 'dark' 
          ? 'bg-[#111726]/60 backdrop-blur-md border-[#cd7f32]/25 shadow-[0_0_30px_rgba(205,127,50,0.04)]' 
          : 'bg-white/80 backdrop-blur-md border-transparent shadow-[0_8px_30px_rgba(0,0,0,0.035)]'
      }`}>
        <h1 className={`text-xl font-bold tracking-normal transition-colors ${
          lang === 'AR' ? 'text-right' : 'text-left'
        } ${theme === 'dark' ? 'text-white' : 'text-[#0b0f19]'}`}>
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
              onChange={handleToggleSaher}
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
              onChange={handleToggleSanad}
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
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
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
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
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
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
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
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
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
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
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
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-200/10 dark:border-white/5 mb-6 gap-3 ${
              lang === 'AR' ? 'text-right' : 'text-left'
            }`}>
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
                  const statusLower = String(unit.status || "available").toLowerCase();
                  if (statusLower === 'sold') {
                    statusColor = theme === 'dark' 
                      ? "bg-emerald-500/15 border-emerald-500/60 hover:bg-emerald-500/25 text-emerald-400" 
                      : "bg-emerald-50 border-emerald-300 hover:bg-emerald-100 text-emerald-800";
                  } else if (statusLower === 'reserved') {
                    statusColor = theme === 'dark' 
                      ? "bg-[#735334]/15 border-[#E6C687]/50 hover:bg-[#735334]/25 text-[#E6C687]" 
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
                      title={`${t.unit_label} ${toArabicNumerals(unit.unitNumber)} (${statusLower === 'sold' ? t.status_sold : statusLower === 'reserved' ? t.status_res : t.status_avail})`}
                      className={`aspect-square border rounded-md flex items-center justify-center text-[8px] md:text-[9px] font-black cursor-pointer select-none transition-all duration-300 hover:scale-105 active:scale-95 ${statusColor}`}
                    >
                      {toArabicNumerals(unit.unitNumber)}
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
              } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${
                    String(selectedUnit.status).toLowerCase() === 'sold' ? 'bg-emerald-500' : String(selectedUnit.status).toLowerCase() === 'reserved' ? 'bg-[#735334]' : 'bg-blue-500'
                  }`} />
                  <div>
                    <h4 className="font-extrabold text-xs">
                      {t.unit_details_title} | <span dir="ltr">{t.unit_label} {toArabicNumerals(selectedUnit.unitNumber)}</span>
                    </h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {t.floor} {toArabicNumerals(selectedUnit.floorPosition)} - {String(selectedUnit.status).toLowerCase() === 'sold' ? t.status_sold : String(selectedUnit.status).toLowerCase() === 'reserved' ? t.status_res : t.status_avail}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 text-xs font-black">
                  <div>
                    <span className="text-gray-400 font-bold block text-[9px]">{t.area}</span>
                    <span>{toArabicNumerals(selectedUnit.area)} {lang === 'AR' ? 'م²' : 'm²'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block text-[9px]">{t.price}</span>
                    <span className={theme === 'dark' ? 'text-[#E6C687]' : 'text-[#735334]'}>
                      {formatCurrency(selectedUnit.priceSar)}
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
                  {t.close_btn}
                </button>
              </div>
            )}
          </div>

          {/* قمع المبيعات ومسار الفرص */}
          <div className={`border p-6 rounded-3xl transition-all duration-500 ${
            theme === 'dark' 
              ? 'bg-[#111726]/60 border-[#cd7f32]/25 shadow-2xl' 
              : 'bg-white/80 border-transparent shadow-[0_8px_30px_rgba(0,0,0,0.035)]'
          } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
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
                      {toArabicNumerals(stage.count)} {t.leads_unit} ({toArabicNumerals(stage.percentage)}%)
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
          <div className={`border p-6 rounded-3xl flex flex-col h-[400px] transition-all duration-500 ${
            theme === 'dark' 
              ? 'bg-black/40 border-[#cd7f32]/25 shadow-inner' 
              : 'bg-slate-100/70 border-slate-200 shadow-sm'
          }`}>
            <div className="flex flex-col gap-2 pb-3 border-b border-gray-200/10 dark:border-white/5 mb-4 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className={`font-black text-sm transition-colors ${theme === 'dark' ? 'text-white' : 'text-[#0b0f19]'}`}>
                  {t.log_title}
                </h3>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              
              {/* Dropdowns for Filtering */}
              <div className="flex gap-2 mt-1">
                {/* Agent Filter */}
                <select
                  value={selectedAgentFilter}
                  onChange={(e) => setSelectedAgentFilter(e.target.value)}
                  className={`text-[10px] font-bold py-1 px-2 rounded border focus:ring-0 ${
                    theme === 'dark' 
                      ? 'bg-slate-900 border-white/10 text-slate-300' 
                      : 'bg-white border-slate-300 text-slate-700'
                  }`}
                  style={{ fontFamily: 'Calibri, sans-serif' }}
                >
                  <option value="ALL">{lang === 'AR' ? 'الوكيل: الكل' : 'Agent: All'}</option>
                  <option value="SAHER">{lang === 'AR' ? 'الوكيل: ساهر' : 'Agent: Saher'}</option>
                  <option value="SANAD">{lang === 'AR' ? 'الوكيل: سند' : 'Agent: Sanad'}</option>
                </select>

                {/* Severity Filter */}
                <select
                  value={selectedSeverityFilter}
                  onChange={(e) => setSelectedSeverityFilter(e.target.value)}
                  className={`text-[10px] font-bold py-1 px-2 rounded border focus:ring-0 ${
                    theme === 'dark' 
                      ? 'bg-slate-900 border-white/10 text-slate-300' 
                      : 'bg-white border-slate-300 text-slate-700'
                  }`}
                  style={{ fontFamily: 'Calibri, sans-serif' }}
                >
                  <option value="ALL">{t.severity_filter_all}</option>
                  <option value="Info">{t.severity_filter_info}</option>
                  <option value="Warning">{t.severity_filter_warning}</option>
                  <option value="Critical">{t.severity_filter_critical}</option>
                </select>
              </div>
            </div>

            <div 
              ref={logContainerRef}
              className="flex-1 overflow-y-auto space-y-3 pr-1 text-[11px] leading-relaxed"
              style={{ overscrollBehavior: 'contain' }}
            >
              {filteredLogs.map((log) => {
                let agentColor = theme === 'dark' ? 'text-slate-300' : 'text-slate-700';
                
                // Colorize based on severity/agent
                if (log.agentId === "SAHER") {
                  agentColor = theme === 'dark' ? 'text-[#E6C687]' : 'text-[#735334] font-bold';
                } else if (log.agentId === "SANAD") {
                  agentColor = 'text-emerald-500 font-bold';
                }
                
                // Override for Critical severity
                if (log.severity === "Critical") {
                  agentColor = 'text-rose-500 font-extrabold';
                } else if (log.severity === "Warning") {
                  agentColor = 'text-amber-500 font-bold';
                }

                // Format timestamp
                const formattedTime = formatLogTime(log.createdAt);

                return (
                  <div 
                    key={log.id} 
                    className={`p-3 rounded-lg border transition-all duration-300 animate-log-append ${
                      theme === 'dark' 
                        ? 'bg-white/5 border-white/5 hover:bg-white/10' 
                        : 'bg-white border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)]'
                    } ${agentColor}`}
                  >
                    <div className="flex justify-between items-center mb-1 text-[9px] opacity-75">
                      <span>{log.agentId === "SAHER" ? (lang === 'AR' ? "🤖 ساهر" : "🤖 Saher") : log.agentId === "SANAD" ? (lang === 'AR' ? "⚡ سند" : "⚡ Sanad") : "💻 System"}</span>
                      <span dir="ltr">{formattedTime}</span>
                    </div>
                    <div>{toArabicNumerals(log.logMessageAr)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* قنوات التسويق والمصادر */}
          <div className={`border p-6 rounded-3xl transition-all duration-500 ${
            theme === 'dark' 
              ? 'bg-[#111726]/60 border-[#cd7f32]/25 shadow-2xl' 
              : 'bg-white/80 border-transparent shadow-[0_8px_30px_rgba(0,0,0,0.035)]'
          } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
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
                       src.source === "Google Ads" ? (lang === 'AR' ? "إعلانات جوجل" : "Google Ads") : 
                       src.source === "Meta Ads" ? (lang === 'AR' ? "حملة ميتا الإعلانية" : "Meta Ads") : 
                       src.source === "TikTok Ads" ? (lang === 'AR' ? "إعلانات تيك توك" : "TikTok Ads") : src.source}
                    </span>
                    <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                      theme === 'dark' ? 'bg-[#E6C687]/15 text-[#E6C687]' : 'bg-[#735334]/15 text-[#735334]'
                    }`}>
                      {toArabicNumerals(src.count)} {t.leads_unit}
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
          } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
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
                    <p className="text-[10px] text-gray-400 font-bold">
                      {city.city === "الرياض" ? (lang === 'AR' ? "الرياض" : "Riyadh") :
                       city.city === "جدة" ? (lang === 'AR' ? "جدة" : "Jeddah") :
                       city.city === "الدمام" ? (lang === 'AR' ? "الدمام" : "Dammam") :
                       city.city === "مكة" ? (lang === 'AR' ? "مكة" : "Makkah") : city.city}
                    </p>
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