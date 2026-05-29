// app/operations/leads/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getLeadsAction, getProjectsAction, createLeadAction, updateLeadStatusAction } from '@/app/actions/leads';
import { useApp } from '@/app/context/AppContext';

// تفصيل تسلسل قمع ومسار المبيعات العقارية مع الحالات المترجمة النخبوية
const STATUS_PIPELINE = [
  { key: 'NEW', labelAr: 'طلبات استثمارية واردة', labelEn: 'Incoming Investment Requests', next: 'CONTACTED', style: 'border-sky-500 bg-sky-500/5 text-sky-600' },
  { key: 'CONTACTED', labelAr: 'قيد التأهيل الدبلوماسي', labelEn: 'Diplomatic Qualification Phase', next: 'VISIT_SCHEDULED', style: 'border-indigo-500 bg-indigo-500/5 text-indigo-600' },
  { key: 'VISIT_SCHEDULED', labelAr: 'معاينة الموقع الميدانية', labelEn: 'Site Inspection Phase', next: 'RESERVED', style: 'border-amber-500 bg-amber-500/5 text-amber-600' },
  { key: 'RESERVED', labelAr: 'تخصيص الوحدة والعربون', labelEn: 'Asset Allocation & Deposit', next: 'CONTRACT_SIGNED', style: 'border-emerald-500 bg-emerald-500/5 text-emerald-600' },
  { key: 'CONTRACT_SIGNED', labelAr: 'إقفال الصفقة والتوثيق', labelEn: 'Deal Closure & Registration', next: null, style: 'border-teal-500 bg-teal-500/5 text-teal-600' },
];

const MOCK_LEADS = [
  {
    id: "mock-lead-1",
    firstName: "أ. عبد العزيز",
    lastName: "الشمري",
    phone: "0505123456",
    city: "الرياض",
    source: "Snapchat Ads",
    status: "NEW",
    leadScore: 85,
    createdAt: new Date().toISOString(),
    project: { name: "برج النخبة السكني" }
  },
  {
    id: "mock-lead-2",
    firstName: "م. خالد",
    lastName: "الهذلول",
    phone: "0555987654",
    city: "جدة",
    source: "Google Ads",
    status: "CONTACTED",
    leadScore: 60,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    project: { name: "فلل الياسمين الفاخرة" }
  },
  {
    id: "mock-lead-3",
    firstName: "أ. سارة",
    lastName: "الراجحي",
    phone: "0501112223",
    city: "الرياض",
    source: "Meta Ads",
    status: "VISIT_SCHEDULED",
    leadScore: 95,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    project: { name: "برج النخبة السكني" }
  },
  {
    id: "mock-lead-4",
    firstName: "أ. فيصل",
    lastName: "بن سلطان",
    phone: "0533445566",
    city: "الدمام",
    source: "TikTok Ads",
    status: "RESERVED",
    leadScore: 75,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    project: { name: "مجمع النخبة العقاري" }
  },
  {
    id: "mock-lead-5",
    firstName: "م. محمد",
    lastName: "الدوسري",
    phone: "0544332211",
    city: "الرياض",
    source: "Google Ads",
    status: "CONTRACT_SIGNED",
    leadScore: 30,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    project: { name: "فلل الياسمين الفاخرة" }
  }
];

const TRANSLATIONS = {
  AR: {
    title: "مركز التدفق الاستثماري وإدارة الملاءة المالية",
    subtitle: "تتبع مسار المستثمرين، مكافحة التكرار، وأتمتة حركة التدفق عبر الوكلاء الأذكياء",
    investorActive: "مستثمر نشط",
    kanbanMode: "🗂️ عرض لوحة البطاقات (Kanban)",
    tableMode: "📋 عرض جدول البيانات",
    formTitle: "تسجيل الطلب الاستثماري الجديد وتفعيل الفحص السيبراني",
    firstName: "الاسم الثنائي للمستثمر *",
    lastName: "اسم العائلة للمستثمر",
    phone: "رقم الجوال الموثق *",
    email: "البريد الإلكتروني المهني",
    city: "المدينة الاستثمارية",
    source: "قناة تدفق الفرص",
    targetProject: "المشروع العقاري المستهدف",
    submitBtn: "توثيق الطلب وفحص الحصانة السيبرانية ➔",
    searchPlaceholder: "البحث برقم الهاتف...",
    sourcePlaceholder: "كل القنوات الإعلانية",
    snapchatAds: "إعلانات سناب شات (Snapchat)",
    googleAds: "إعلانات جوجل (Google)",
    metaAds: "حملة ميتا الإعلانية (Meta)",
    tiktokAds: "إعلانات تيك توك (TikTok)",
    statusPlaceholder: "كل درجات الجدية",
    highSolvency: "ملاءة عالية (٧٥٪ - ١٠٠٪)",
    warmPipeline: "قيد النضج (٤٠٪ - ٧٤٪)",
    lowSolvency: "مستبعد (أقل من ٤٠٪)",
    scoreLabel: "تصنيف ملاءة ساهر",
    awaitingNew: "بانتظار مستثمرين جدد ✨",
    allocationContract: "📄 عقد الحجز",
    nextBtn: "التالي ➔",
    processingBtn: "جاري...",
    tableTitle: "جدول تتبع بيانات المستثمرين والصفقات",
    tableId: "م",
    tableInvestor: "اسم المستثمر المحتمل",
    tablePhone: "رقم الجوال الموثق",
    tableSource: "مصدر الفرصة",
    tableClassification: "تصنيف الوكيل ساهر",
    tableTime: "وقت الاقتناص",
    tableActions: "إجراءات",
    tableDetails: "👁️ تفاصيل",
    noData: "لا يوجد مستثمرون مسجلون حالياً يطابقون خيارات التصفية النشطة.",
    drawerTitle: "تفاصيل العميل وتحليل الوكيل ساهر",
    drawerClose: "✕ إغلاق",
    drawerName: "اسم المستثمر:",
    drawerPhone: "رقم الجوال الموثق:",
    drawerSource: "قناة تدفق الفرص:",
    drawerCity: "المدينة الاستثمارية:",
    drawerTarget: "المشروع العقاري المستهدف:",
    drawerScore: "درجة الجدية الاستثمارية:",
    drawerStatus: "مسار حالة المستثمر الحالية:",
    drawerNlp: "تحليل لغة العميل بواسطة الوكيل ساهر (NLP Intent):",
    scoreHigh: "ملاءة عالية",
    scoreWarm: "قيد النضج",
    scoreLow: "مستبعد",
    saherHighMsg: "«الوكيل ساهر: اهتمام شراء عاجل جداً. العميل {name} من حملة [{source}] يستعلم عن حجز شقة في برج النخبة بمدينة {city}. يرغب في السداد نقداً (كاش) ويطلب معاينة فورية غداً صباحاً. تم تقييم الجدية بنسبة {score}٪ وتوجيهه آلياً لخط المبيعات الساخن.»",
    saherWarmMsg: "«الوكيل ساهر: اهتمام شراء متوسط. العميل {name} من حملة [{source}] يطلب تفاصيل مساحات وأسعار شقق ٣ غرف بمدينة {city}. يستفسر عن إمكانية التمويل العقاري عبر البنك الأهلي. تم تقييم الجدية بنسبة {score}٪ وإضافته لقمع المتابعة الدوري.»",
    saherLowMsg: "«الوكيل ساهر: اهتمام منخفض. العميل {name} من حملة [{source}] قام بملء النموذج بشكل خاطئ أو بقصد الفضول وتصفح الأسعار فقط. لم يحدد تفاصيل الشراء أو الميزانية. تم تقييم الجدية بنسبة {score}٪ واستبعاده تلقائياً من المكالمات العاجلة.»",
    successMsg: "تم توثيق الطلب الاستثماري بنجاح وفحص الأمان السيبراني للعمليات!"
  },
  EN: {
    title: "Investment Flow & Solvency Management Center",
    subtitle: "Track investor flow, neutralize duplication, and automate routing via intelligent agents",
    investorActive: "Active Investors",
    kanbanMode: "🗂️ Kanban Board View",
    tableMode: "📋 Data Table View",
    formTitle: "Log New Investment Request & Enable Cyber Security Check",
    firstName: "Investor First Name *",
    lastName: "Investor Last Name",
    phone: "Verified Mobile Number *",
    email: "Professional Email",
    city: "Investment City",
    source: "Lead Acquisition Channel",
    targetProject: "Target Real Estate Project",
    submitBtn: "Log Request & Verify Cyber Immunity ➔",
    searchPlaceholder: "Search by phone number...",
    sourcePlaceholder: "All Advertising Channels",
    snapchatAds: "Snapchat Ads",
    googleAds: "Google Ads",
    metaAds: "Meta Ads Campaign",
    tiktokAds: "TikTok Ads",
    statusPlaceholder: "All Intent Scores",
    highSolvency: "High Solvency (75% - 100%)",
    warmPipeline: "Warm Pipeline (40% - 74%)",
    lowSolvency: "Excluded (Below 40%)",
    scoreLabel: "Saher Solvency Classification",
    awaitingNew: "Awaiting new investors ✨",
    allocationContract: "📄 Contract",
    nextBtn: "Next ➔",
    processingBtn: "Processing...",
    tableTitle: "Investor Pipeline & Deal Tracking Ledger",
    tableId: "#",
    tableInvestor: "Prospective Investor Name",
    tablePhone: "Verified Mobile Number",
    tableSource: "Acquisition Source",
    tableClassification: "Saher Classification",
    tableTime: "Ingestion Time",
    tableActions: "Actions",
    tableDetails: "👁️ Details",
    noData: "No registered investors match the active filters.",
    drawerTitle: "Customer Details & Saher AI Audit",
    drawerClose: "✕ Close",
    drawerName: "Investor Name:",
    drawerPhone: "Verified Mobile Number:",
    drawerSource: "Acquisition Source:",
    drawerCity: "Investment City:",
    drawerTarget: "Target Real Estate Project:",
    drawerScore: "Investor Intent Score:",
    drawerStatus: "Current Investor Pipeline Status:",
    drawerNlp: "Client Language Analysis by Agent Saher (NLP Intent):",
    scoreHigh: "High Solvency",
    scoreWarm: "Warm Pipeline",
    scoreLow: "Excluded",
    saherHighMsg: "«Agent Saher: Urgent purchase intent. Client {name} from [{source}] campaign inquires about reserving a unit in Elite Tower in {city}. Desires cash payment and requests immediate viewing tomorrow morning. Solvency score rated at {score}% and auto-routed to the sales hotline.»",
    saherWarmMsg: "«Agent Saher: Moderate purchase intent. Client {name} from [{source}] campaign requests dimensions and rates for 3-bedroom apartments in {city}. Inquired about mortgage feasibility via SNB. Intent score rated at {score}% and queued in the follow-up loop.»",
    saherLowMsg: "«Agent Saher: Low purchase intent. Client {name} from [{source}] campaign populated the form with generic data. Did not state allocation preference or budget. Solvency score rated at {score}% and excluded from urgent call sheets.»",
    successMsg: "Investment request logged successfully with cyber security clearance!"
  }
};

export default function LeadsView() {
  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;

  const [leads, setLeads] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban'); 
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<any | null>(null);

  // جلب البيانات الحية عند فتح الصفحة ومزامنة السمة
  useEffect(() => {
    async function loadData() {
      const dbLeads = await getLeadsAction();
      const dbProjects = await getProjectsAction();
      setLeads(dbLeads.length > 0 ? dbLeads : MOCK_LEADS);
      setProjects(dbProjects);
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await createLeadAction(formData);

    if (result.success) {
      setSuccessMessage(t.successMsg);
      e.currentTarget.reset();
      const updatedLeads = await getLeadsAction();
      setLeads(updatedLeads.length > 0 ? updatedLeads : MOCK_LEADS);
    } else {
      setErrorMessage(result.error || "حدث خطأ غير متوقع.");
    }
  };

  const handleMoveToNextStep = async (leadId: string, currentStatus: string, nextStatus: string) => {
    setUpdatingId(leadId);
    const result = await updateLeadStatusAction(leadId, nextStatus);
    setUpdatingId(null);
    if (result.success) {
      const updatedLeads = await getLeadsAction();
      setLeads(updatedLeads.length > 0 ? updatedLeads : MOCK_LEADS);
      
      if (selectedLeadForDrawer && selectedLeadForDrawer.id === leadId) {
        const matching = updatedLeads.find(l => l.id === leadId);
        if (matching) setSelectedLeadForDrawer(matching);
      }
    }
  };

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

  // تطبيق قناع حماية الجوال للأرقام السيادية
  const formatPhoneMask = (phone: string): string => {
    if (!phone) return "";
    let clean = phone.replace(/\s+/g, "");
    if (lang === 'EN') {
      if (clean.startsWith("05")) {
        return "05" + "x".repeat(8);
      }
      if (clean.startsWith("+9665")) {
        return "+9665" + "x".repeat(8);
      }
      return clean.substring(0, 2) + "x".repeat(Math.max(4, clean.length - 2));
    }
    let converted = toArabicNumerals(clean);
    if (converted.startsWith("٠٥") || converted.startsWith("05")) {
      return "٠٥" + "×".repeat(8);
    }
    if (converted.startsWith("+٩٦٦٥") || converted.startsWith("+9665")) {
      return "+٩٦٦٥" + "×".repeat(8);
    }
    return converted.substring(0, 2) + "×".repeat(Math.max(4, converted.length - 2));
  };

  const formatDateTime = (dateStr: string | Date): string => {
    try {
      const date = new Date(dateStr);
      const y = date.getFullYear();
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const d = date.getDate().toString().padStart(2, '0');
      const hrs = date.getHours().toString().padStart(2, '0');
      const mins = date.getMinutes().toString().padStart(2, '0');
      const secs = date.getSeconds().toString().padStart(2, '0');
      const formatted = `${y}-${m}-${d} ${hrs}:${mins}:${secs}`;
      return toArabicNumerals(formatted);
    } catch (e) {
      return "";
    }
  };

  const getSyntheticIntentText = (lead: any) => {
    const name = `${lead.firstName} ${lead.lastName || ""}`.trim();
    const city = lead.city || "الرياض";
    const source = lead.source === "Snapchat Ads" ? (lang === 'AR' ? "سناب شات" : "Snapchat") : 
                   lead.source === "Google Ads" ? (lang === 'AR' ? "جوجل" : "Google") : 
                   lead.source === "Meta Ads" ? (lang === 'AR' ? "ميتا" : "Meta") : lead.source || "غير محدد";
    const score = lead.leadScore || 50;
    
    if (score >= 75) {
      return t.saherHighMsg.replace('{name}', name).replace('{source}', source).replace('{city}', city).replace('{score}', toArabicNumerals(score));
    } else if (score >= 40) {
      return t.saherWarmMsg.replace('{name}', name).replace('{source}', source).replace('{city}', city).replace('{score}', toArabicNumerals(score));
    } else {
      return t.saherLowMsg.replace('{name}', name).replace('{source}', source).replace('{city}', city).replace('{score}', toArabicNumerals(score));
    }
  };

  const matchesSource = (leadSource: string, filter: string) => {
    if (filter === 'ALL') return true;
    const src = (leadSource || "").toLowerCase();
    if (filter === 'SNAPCHAT') return src.includes('snapchat') || src.includes('سناب');
    if (filter === 'GOOGLE') return src.includes('google') || src.includes('جوجل');
    if (filter === 'META') return src.includes('meta') || src.includes('facebook') || src.includes('ميتا');
    if (filter === 'TIKTOK') return src.includes('tiktok') || src.includes('تيك');
    return false;
  };

  const matchesStatus = (leadScore: number, filter: string) => {
    if (filter === 'ALL') return true;
    if (filter === 'HIGH') return leadScore >= 75;
    if (filter === 'WARM') return leadScore >= 40 && leadScore < 75;
    if (filter === 'LOW') return leadScore < 40;
    return false;
  };

  const filteredLeads = leads.filter(lead => {
    const matchesPhone = (lead.phone || "").includes(searchPhone);
    const matchesSrc = matchesSource(lead.source, selectedSourceFilter);
    const matchesStat = matchesStatus(lead.leadScore, selectedStatusFilter);
    return matchesPhone && matchesSrc && matchesStat;
  });

  return (
    <div className="space-y-6 selection-fix p-1">
      
      {/* حقن خط Calibri وعلاج مشكلة التحديد وتنسيق السمة والـ layout */}
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
      `}} />

      {/* الهيدر وزري التبديل الفخمين بين الجدول واللوحة */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
        <div>
          <div className={`flex items-center gap-3 ${lang === 'AR' ? 'flex-row' : 'flex-row-reverse justify-end'}`}>
            <h1 className={`text-2xl font-bold tracking-normal transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-[#0b0f19]'
            }`}>
              {t.title}
            </h1>
            <span className={`px-2.5 py-1 text-xs font-black rounded-full shrink-0 ${
              theme === 'dark' ? 'bg-[#E6C687]/20 text-[#E6C687]' : 'bg-[#735334]/20 text-[#735334]'
            }`}>
              {toArabicNumerals(filteredLeads.length)} {t.investorActive}
            </span>
          </div>
          <p className={`text-xs mt-1 transition-colors ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            {t.subtitle}
          </p>
        </div>

        {/* أزرار التبديل الدائرية الناعمة بتأثير الـ Cairo */}
        <div className={`flex p-1 rounded-xl self-start md:self-auto border transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-[#111726]/40 border-white/5' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <button 
            onClick={() => setViewMode('kanban')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              viewMode === 'kanban' 
                ? (theme === 'dark' ? 'bg-[#E6C687] text-slate-950 shadow-sm' : 'bg-[#735334] text-white shadow-sm') 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.kanbanMode}
          </button>
          <button 
            onClick={() => setViewMode('table')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              viewMode === 'table' 
                ? (theme === 'dark' ? 'bg-[#E6C687] text-slate-950 shadow-sm' : 'bg-[#735334] text-white shadow-sm') 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.tableMode}
          </button>
        </div>
      </div>

      {/* نموذج الإضافة السريع للمستثمر المعتمد بقاعدة البيانات */}
      <div className={`p-6 rounded-2xl border transition-all duration-500 ${
        theme === 'dark' 
          ? 'bg-[#111726]/60 border-[#cd7f32]/25 shadow-[0_0_30px_rgba(205,127,50,0.04)]' 
          : 'bg-white border-[#735334]/20 shadow-[0_8px_30px_rgba(0,0,0,0.035)]'
      } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
        <h2 className={`text-sm font-bold mb-4 border-b pb-2 ${
          theme === 'dark' ? 'text-[#E6C687] border-white/5' : 'text-[#735334] border-slate-200'
        }`}>
          {t.formTitle}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
          {/* اسم المضيف الخفي لمزامنة المستأجر */}
          <input type="hidden" name="clientHost" value={typeof window !== "undefined" ? window.location.host : ""} />
          
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.firstName}</label>
            <input 
              type="text" 
              name="firstName" 
              required 
              className={`w-full border rounded-lg p-2 text-xs focus:ring-0 focus:outline-none ${
                theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-800'
              }`} 
              placeholder={lang === 'AR' ? "مثال: عبد العزيز" : "e.g. Abdulaziz"} 
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.lastName}</label>
            <input 
              type="text" 
              name="lastName" 
              className={`w-full border rounded-lg p-2 text-xs focus:ring-0 focus:outline-none ${
                theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-800'
              }`} 
              placeholder={lang === 'AR' ? "الشمري" : "Al-Shammari"} 
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.phone}</label>
            <input 
              type="tel" 
              name="phone" 
              required 
              className={`w-full border rounded-lg p-2 text-xs focus:ring-0 focus:outline-none ${
                theme === 'dark' ? 'bg-slate-900 border-white/10 text-white text-left' : 'bg-white border-slate-300 text-slate-800 text-left'
              }`} 
              placeholder="05xxxxxxxx" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.email}</label>
            <input 
              type="email" 
              name="email" 
              className={`w-full border rounded-lg p-2 text-xs focus:ring-0 focus:outline-none ${
                theme === 'dark' ? 'bg-slate-900 border-white/10 text-white text-left' : 'bg-white border-slate-300 text-slate-800 text-left'
              }`} 
              placeholder="name@company.com" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.city}</label>
            <select 
              name="city" 
              className={`w-full border rounded-lg p-2.5 text-xs focus:ring-0 focus:outline-none ${
                theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-850'
              }`}
            >
              <option value="الرياض">{lang === 'AR' ? "الرياض" : "Riyadh"}</option>
              <option value="جدة">{lang === 'AR' ? "جدة" : "Jeddah"}</option>
              <option value="الدمام">{lang === 'AR' ? "الدمام" : "Dammam"}</option>
              <option value="مكة">{lang === 'AR' ? "مكة" : "Makkah"}</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.source}</label>
            <select 
              name="source" 
              className={`w-full border rounded-lg p-2.5 text-xs focus:ring-0 focus:outline-none ${
                theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-850'
              }`}
            >
              <option value="Snapchat Ads">{lang === 'AR' ? "إعلانات سناب شات" : "Snapchat Ads"}</option>
              <option value="Google Ads">{lang === 'AR' ? "إعلانات جوجل" : "Google Ads"}</option>
              <option value="Meta Ads">{lang === 'AR' ? "حملة ميتا الإعلانية" : "Meta Ads"}</option>
              <option value="TikTok Ads">{lang === 'AR' ? "إعلانات تيك توك" : "TikTok Ads"}</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.targetProject}</label>
            <select 
              name="projectId" 
              className={`w-full border rounded-lg p-2.5 text-xs focus:ring-0 focus:outline-none ${
                theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-850'
              }`}
            >
              <option value="">{lang === 'AR' ? "-- اختر مشروعاً --" : "-- Select Project --"}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <button 
            type="submit" 
            className={`w-full text-xs font-black p-2.5 rounded-lg transition-all duration-300 cursor-pointer shadow-md hover:scale-[1.02] ${
              theme === 'dark' ? 'bg-[#E6C687] text-slate-950 hover:bg-[#E6C687]/90' : 'bg-[#735334] text-white hover:bg-[#735334]/90'
            }`}
          >
            {t.submitBtn}
          </button>
        </form>
      </div>

      {/* التنبيهات ورسائل النجاح والخطأ */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-xl font-bold">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-xl font-bold">
          {successMessage}
        </div>
      )}

      {/* الفلترة والبحث المتقدم */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row gap-4 justify-between items-center transition-all duration-500 ${
        theme === 'dark' 
          ? 'bg-[#111726]/40 border-white/5 shadow-inner' 
          : 'bg-white border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)]'
      } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
        <div className="flex flex-col md:flex-row gap-3 w-full">
          {/* بحث برقم الهاتف */}
          <div className="w-full md:w-1/3">
            <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.tablePhone}</label>
            <input 
              type="text" 
              placeholder={t.searchPlaceholder} 
              className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:ring-0 focus:outline-none ${
                theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-800'
              }`}
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
            />
          </div>

          {/* فلتر قناة الحملة */}
          <div className="w-full md:w-1/3">
            <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.source}</label>
            <select
              value={selectedSourceFilter}
              onChange={(e) => setSelectedSourceFilter(e.target.value)}
              className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:ring-0 focus:outline-none ${
                theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-850'
              }`}
            >
              <option value="ALL">{t.sourcePlaceholder}</option>
              <option value="SNAPCHAT">{t.snapchatAds}</option>
              <option value="GOOGLE">{t.googleAds}</option>
              <option value="META">{t.metaAds}</option>
              <option value="TIKTOK">{t.tiktokAds}</option>
            </select>
          </div>

          {/* فلتر تقييم الوكيل ساهر */}
          <div className="w-full md:w-1/3">
            <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.scoreLabel}</label>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:ring-0 focus:outline-none ${
                theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-850'
              }`}
            >
              <option value="ALL">{t.statusPlaceholder}</option>
              <option value="HIGH">{t.highSolvency}</option>
              <option value="WARM">{t.warmPipeline}</option>
              <option value="LOW">{t.lowSolvency}</option>
            </select>
          </div>
        </div>
      </div>

      {/* طريقة العرض 1: عرض بطاقات الكانبان التفاعلية */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STATUS_PIPELINE.map((column) => {
            const columnLeads = filteredLeads.filter((l) => l.status === column.key);
            const columnLabel = lang === 'AR' ? column.labelAr : column.labelEn;
            return (
              <div 
                key={column.key} 
                className={`rounded-2xl p-4 flex flex-col space-y-3 min-w-[220px] transition-colors duration-500 border ${
                  theme === 'dark'
                    ? 'bg-black/30 border-white/5 shadow-inner'
                    : 'bg-slate-100 border-slate-200 shadow-sm'
                }`}
              >
                {/* هيدر العمود المطور بدقة */}
                <div className={`p-3 rounded-xl border shadow-sm flex items-center justify-between text-xs font-black ${
                  theme === 'dark'
                    ? 'bg-[#111726]/80 border-white/5 text-[#E6C687]'
                    : 'bg-white border-slate-200 text-[#735334]'
                }`}>
                  <span>{columnLabel}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 ${
                    theme === 'dark' ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {toArabicNumerals(columnLeads.length)}
                  </span>
                </div>

                {/* بطاقات المبيعات بداخل العمود */}
                <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[450px] min-h-[200px] pr-1">
                  {columnLeads.length === 0 ? (
                    <div className={`h-full flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed rounded-2xl ${
                      theme === 'dark'
                        ? 'border-white/5 bg-white/5 text-slate-500'
                        : 'border-slate-300/40 bg-white/40 text-slate-400'
                    }`}>
                      <span className="text-[10px] font-bold">{t.awaitingNew}</span>
                    </div>
                  ) : (
                    columnLeads.map((lead) => {
                      let badgeStyle = "";
                      let scoreLabel = "";
                      if (lead.leadScore >= 75) {
                        scoreLabel = t.scoreHigh;
                        badgeStyle = theme === 'dark' 
                          ? "bg-emerald-500 text-slate-950 font-black shadow-[0_2px_8px_rgba(16,185,129,0.25)]" 
                          : "bg-emerald-100 border border-emerald-300 text-emerald-800 font-extrabold";
                      } else if (lead.leadScore >= 40) {
                        scoreLabel = t.scoreWarm;
                        badgeStyle = theme === 'dark'
                          ? "bg-blue-500/20 border border-blue-400/30 text-blue-400 font-bold"
                          : "bg-blue-100 border border-blue-300 text-blue-800 font-extrabold";
                      } else {
                        scoreLabel = t.scoreLow;
                        badgeStyle = theme === 'dark'
                          ? "bg-rose-950/40 border border-rose-800/30 text-rose-400 font-medium"
                          : "bg-rose-100 border border-rose-300 text-rose-800 font-medium";
                      }

                      return (
                        <div 
                          key={lead.id} 
                          onClick={() => setSelectedLeadForDrawer(lead)}
                          className={`p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] space-y-3 cursor-pointer select-none ${
                            theme === 'dark'
                              ? 'bg-[#111726]/60 border-white/5 hover:border-[#cd7f32]/40 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-[#735334]/50 shadow-[0_2px_8px_rgba(0,0,0,0.015)]'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start gap-1">
                              <h4 className="font-extrabold text-xs truncate">{lead.firstName} {lead.lastName || ""}</h4>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] tracking-wide shrink-0 ${badgeStyle}`}>
                                {scoreLabel}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5" dir="ltr">
                              {formatPhoneMask(lead.phone)}
                            </p>
                          </div>

                          {lead.project && (
                            <div className={`text-[9px] border p-1.5 rounded-md font-bold truncate ${
                              theme === 'dark' ? 'bg-slate-900/60 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'
                            }`}>
                              🎯 {lead.project.name}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold border-t border-gray-200/10 pt-2.5">
                            <span>{t.drawerScore} {toArabicNumerals(lead.leadScore)}٪</span>
                            <span>{lead.city}</span>
                          </div>

                          {/* زر توليد العقد السحابي الموحد */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                            <a 
                              href={`/contract/${lead.id}`}
                              target="_blank"
                              className={`text-[9px] font-black p-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer hover:scale-[1.02] ${
                                theme === 'dark' ? 'bg-[#E6C687] text-slate-950' : 'bg-[#735334] text-white'
                              }`}
                            >
                              {t.allocationContract}
                            </a>

                            {column.next && (
                              <button 
                                disabled={updatingId === lead.id}
                                onClick={() => handleMoveToNextStep(lead.id, column.key, column.next!)}
                                className={`text-[9px] font-bold p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center hover:scale-[1.02] ${
                                  theme === 'dark' ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                                }`}
                              >
                                {updatingId === lead.id ? t.processingBtn : t.nextBtn}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* طريقة العرض 2: عرض جدول البيانات الكلاسيكي المنسق بالكامل بالعربية */
        <div className={`rounded-2xl border overflow-hidden transition-all duration-500 ${
          theme === 'dark' 
            ? 'bg-[#111726]/60 border-[#cd7f32]/25 shadow-2xl' 
            : 'bg-white border-[#735334]/20 shadow-[0_8px_30px_rgba(0,0,0,0.035)]'
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
          <div className={`p-4 border-b flex flex-wrap gap-2 items-center justify-between ${
            theme === 'dark' ? 'border-white/5' : 'border-slate-100'
          }`}>
            <h3 className="font-bold text-xs">{t.tableTitle}</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead className={theme === 'dark' ? 'bg-slate-950/40 text-slate-300' : 'bg-slate-100 text-slate-650'}>
                <tr className={`border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
                  <th className="px-5 py-3 font-extrabold">{t.tableId}</th>
                  <th className="px-5 py-3 font-extrabold">{t.tableInvestor}</th>
                  <th className="px-4 py-3 font-extrabold">{t.tablePhone}</th>
                  <th className="px-4 py-3 font-extrabold">{t.tableSource}</th>
                  <th className="px-4 py-3 font-extrabold">{t.tableClassification}</th>
                  <th className="px-4 py-3 font-extrabold">{t.tableTime}</th>
                  <th className="px-5 py-3 font-extrabold">{t.tableActions}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-105'}`}>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400 font-medium">
                      {t.noData}
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead, index) => {
                    let badgeStyle = "";
                    let scoreLabel = "";
                    if (lead.leadScore >= 75) {
                      scoreLabel = t.scoreHigh;
                      badgeStyle = theme === 'dark' 
                        ? "bg-emerald-500 text-slate-950 font-black shadow-[0_2px_8px_rgba(16,185,129,0.25)]" 
                        : "bg-emerald-100 border border-emerald-300 text-emerald-800 font-extrabold";
                    } else if (lead.leadScore >= 40) {
                      scoreLabel = t.scoreWarm;
                      badgeStyle = theme === 'dark'
                        ? "bg-blue-500/20 border border-blue-400/30 text-blue-400 font-bold"
                        : "bg-blue-100 border border-blue-300 text-blue-800 font-extrabold";
                    } else {
                      scoreLabel = t.scoreLow;
                      badgeStyle = theme === 'dark'
                        ? "bg-rose-950/40 border border-rose-800/30 text-rose-400 font-medium"
                        : "bg-rose-100 border border-rose-300 text-rose-800 font-medium";
                    }

                    return (
                      <tr 
                        key={lead.id} 
                        onClick={() => setSelectedLeadForDrawer(lead)}
                        className={`transition-colors cursor-pointer ${
                          theme === 'dark' ? 'hover:bg-white/5 text-slate-350' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {/* الرقم المتسلسل */}
                        <td className="px-5 py-3.5 font-bold">
                          {toArabicNumerals(index + 1)}
                        </td>
                        
                        {/* الاسم */}
                        <td className="px-5 py-3.5 font-bold">
                          {lead.firstName} {lead.lastName || ""}
                        </td>
                        
                        {/* الجوال */}
                        <td className="px-4 py-3.5 font-bold" dir="ltr">
                          {formatPhoneMask(lead.phone)}
                        </td>
                        
                        {/* المصدر والمشروع */}
                        <td className="px-4 py-3.5">
                          <p className="font-semibold">{lead.source}</p>
                          {lead.project && (
                            <p className="text-[10px] text-amber-500 mt-0.5">🎯 {lead.project.name}</p>
                          )}
                        </td>
                        
                        {/* تصنيف ساهر */}
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-1 rounded text-[10px] tracking-wide shrink-0 ${badgeStyle}`}>
                            {scoreLabel} ({toArabicNumerals(lead.leadScore)}٪)
                          </span>
                        </td>
                        
                        {/* وقت الاقتناص */}
                        <td className="px-4 py-3.5" dir="ltr">
                          {formatDateTime(lead.createdAt)}
                        </td>
                        
                        {/* الإجراءات */}
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <a 
                              href={`/contract/${lead.id}`}
                              target="_blank"
                              className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition-all inline-block hover:scale-[1.02] ${
                                theme === 'dark' ? 'bg-[#E6C687] text-slate-950' : 'bg-[#735334] text-white'
                              }`}
                            >
                              {t.allocationContract}
                            </a>
                            <button 
                              onClick={() => setSelectedLeadForDrawer(lead)}
                              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all inline-block hover:scale-[1.02] ${
                                theme === 'dark' ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                              }`}
                            >
                              {t.tableDetails}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* تفاصيل العميل وتحليل الوكيل ساهر - Context Drawer */}
      {selectedLeadForDrawer && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setSelectedLeadForDrawer(null)}
        >
          <div 
            className={`fixed inset-y-0 w-full sm:w-96 border-l shadow-2xl p-6 flex flex-col transition-all duration-300 transform translate-x-0 ${
              theme === 'dark'
                ? 'bg-[#111726]/95 border-[#cd7f32]/25 text-white'
                : 'bg-white/95 border-[#735334]/25 text-[#735334]'
            } ${lang === 'AR' ? 'right-0 border-r' : 'left-0 border-l'}`} 
            dir={lang === 'AR' ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className={`flex items-center justify-between pb-4 border-b mb-6 ${
              theme === 'dark' ? 'border-white/10' : 'border-slate-200'
            }`}>
              <h3 className={`font-black text-sm ${
                theme === 'dark' ? 'text-[#E6C687]' : 'text-[#735334]'
              }`}>{t.drawerTitle}</h3>
              <button 
                onClick={() => setSelectedLeadForDrawer(null)} 
                className={`text-xs font-bold ${
                  theme === 'dark' ? 'text-white hover:text-amber-500' : 'text-[#735334] hover:text-amber-700'
                }`}
              >{t.drawerClose}</button>
            </div>
            
            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-400 font-bold block text-[10px] mb-1">{t.drawerName}</label>
                <span className={`text-sm font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  {selectedLeadForDrawer.firstName} {selectedLeadForDrawer.lastName || ""}
                </span>
              </div>
              
              <div>
                <label className="text-slate-400 font-bold block text-[10px] mb-1">{t.drawerPhone}</label>
                <span className={`text-sm font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`} dir="ltr">
                  {formatPhoneMask(selectedLeadForDrawer.phone)}
                </span>
              </div>
              
              <div>
                <label className="text-slate-400 font-bold block text-[10px] mb-1">{t.drawerSource}</label>
                <span className={`text-sm font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  {selectedLeadForDrawer.source}
                </span>
              </div>
              
              <div>
                <label className="text-slate-400 font-bold block text-[10px] mb-1">{t.drawerCity}</label>
                <span className={`text-sm font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  {selectedLeadForDrawer.city}
                </span>
              </div>

              {selectedLeadForDrawer.project && (
                <div>
                  <label className="text-slate-400 font-bold block text-[10px] mb-1">{t.drawerTarget}</label>
                  <span className={`text-sm font-extrabold ${theme === 'dark' ? 'text-[#E6C687]' : 'text-[#735334]'}`}>
                    {selectedLeadForDrawer.project.name}
                  </span>
                </div>
              )}
              
              <div>
                <label className="text-slate-400 font-bold block text-[10px] mb-1">{t.drawerScore}</label>
                <span className={`text-sm font-extrabold ${
                  theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                }`}>{toArabicNumerals(selectedLeadForDrawer.leadScore)}٪</span>
              </div>

              <div>
                <label className="text-slate-400 font-bold block text-[10px] mb-1">{t.drawerStatus}</label>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-600 border border-sky-100">
                  {selectedLeadForDrawer.status}
                </span>
              </div>

              <div className={`pt-4 border-t ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                <label className="text-slate-400 font-bold block text-[10px] mb-1.5">{t.drawerNlp}</label>
                <div className={`p-4 rounded-xl border text-[11px] leading-relaxed select-text ${
                  theme === 'dark'
                    ? 'bg-slate-950/60 border-white/5 text-slate-300 selection:bg-[#E6C687]/20 selection:text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 selection:bg-[#735334]/20 selection:text-[#735334]'
                }`} style={{ fontFamily: 'Calibri, sans-serif' }}>
                  {getSyntheticIntentText(selectedLeadForDrawer)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}