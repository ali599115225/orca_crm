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
    title: "إدارة حوكمة البيانات والتحقق من الملاءة",
    subtitle: "أتمتة العمليات الاستثمارية وتتبع مسار تدفق الفرص العقارية مع مكافحة التكرار لضمان الامتثال المالي عبر الوكلاء الأذكياء",
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
  const [isFormOpen, setIsFormOpen] = useState(false);

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
    let clean = phone.replace(/\s+/g, "").replace(/\.0+$/, "");
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

  const getRelativeTime = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHrs / 24);

      if (lang === 'EN') {
        if (diffMins < 1) return `just now`;
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHrs < 24) return `${diffHrs}h ago`;
        return `${diffDays}d ago`;
      } else {
        if (diffMins < 1) return `الآن`;
        if (diffMins < 60) return `منذ ${toArabicNumerals(diffMins)} دقيقة`;
        if (diffHrs < 24) return `منذ ${toArabicNumerals(diffHrs)} ساعة`;
        return `منذ ${toArabicNumerals(diffDays)} يوم`;
      }
    } catch (e) {
      return lang === 'AR' ? 'منذ فترة' : 'recently';
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
    <div className="orca-page h-full flex flex-col w-full max-w-[1800px] mx-auto" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#df7b62]/10 border border-[#df7b62]/20 text-[#df7b62] text-xs font-semibold mb-3">
            <i className="ph-bold ph-kanban"></i> {lang === 'AR' ? 'مسار التدفق الاستثماري' : 'Investment Pipeline Flow'}
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {lang === 'AR' ? 'إدارة حوكمة البيانات والتحقق من الملاءة' : 'Data Governance & Solvency Validation'}
          </h1>
          <p className="text-xs md:text-sm text-slate-550 dark:text-slate-400">
            {lang === 'AR' 
              ? 'أتمتة العمليات الاستثمارية وتتبع مسار تدفق الفرص العقارية مع مكافحة التكرار لضمان الامتثال المالي عبر الوكلاء الأذكياء.'
              : 'Autonomous process automation, solvency validation, and lead tracking for strict compliance.'
            }
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* View Toggles */}
          <div className="flex bg-slate-100 dark:bg-[#151f32] p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md shadow-sm text-sm font-semibold transition-all cursor-pointer ${
                viewMode === 'kanban' 
                  ? 'bg-white dark:bg-[#0b1120] text-slate-900 dark:text-white' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <i className="ph-fill ph-kanban"></i> {lang === 'AR' ? 'لوحة البطاقات' : 'Kanban Board'}
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer ${
                viewMode === 'table' 
                  ? 'bg-white dark:bg-[#0b1120] text-slate-900 dark:text-white' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <i className="ph-fill ph-list-dashes"></i> {lang === 'AR' ? 'جدول البيانات' : 'Data Table'}
            </button>
          </div>
          
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#df7b62] hover:bg-[#c5654e] text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-md cursor-pointer"
          >
            <i className="ph-bold ph-plus"></i> {lang === 'AR' ? 'مستثمر جديد' : 'New Investor'}
          </button>
        </div>
      </div>

      {/* Search and Filters row */}
      <div className="sticky top-0 z-50 bg-[#f8fafc]/90 dark:bg-[#0b1120]/90 backdrop-blur-md py-4 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 border-b border-slate-200/50 dark:border-slate-800/50 -mt-4 md:-mt-6 lg:-mt-8 pt-4 md:pt-6 lg:pt-8 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`flex items-center border rounded-xl px-4 py-2.5 transition-all ${theme === 'dark' ? 'bg-[#151f32] border-slate-800 focus-within:border-[#df7b62]' : 'bg-white border-slate-200 focus-within:border-[#df7b62]'}`}>
            <i className="ph ph-magnifying-glass text-slate-400 text-lg ml-2"></i>
            <input 
              type="text" 
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder={t.searchPlaceholder} 
              className={`bg-transparent border-none outline-none text-sm w-full font-sans ${theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`} 
            />
          </div>

          <select
            value={selectedSourceFilter}
            onChange={(e) => setSelectedSourceFilter(e.target.value)}
            className={`rounded-xl border px-4 py-2.5 text-sm transition-all focus:outline-none focus:border-[#df7b62] ${theme === 'dark' ? 'bg-[#151f32] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
          >
            <option value="ALL">{t.sourcePlaceholder}</option>
            <option value="SNAPCHAT">{t.snapchatAds}</option>
            <option value="GOOGLE">{t.googleAds}</option>
            <option value="META">{t.metaAds}</option>
            <option value="TIKTOK">{t.tiktokAds}</option>
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className={`rounded-xl border px-4 py-2.5 text-sm transition-all focus:outline-none focus:border-[#df7b62] ${theme === 'dark' ? 'bg-[#151f32] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
          >
            <option value="ALL">{t.statusPlaceholder}</option>
            <option value="HIGH">{t.highSolvency}</option>
            <option value="WARM">{t.warmPipeline}</option>
            <option value="LOW">{t.lowSolvency}</option>
          </select>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        /* Kanban Board Container */
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 pb-4 scrollbar-fade scroll-container relative z-10 w-full">
          {[
            {
              key: 'NEW_REQUESTS',
              labelAr: 'طلبات استثمارية واردة',
              labelEn: 'Incoming Investment Requests',
              statuses: ['NEW'],
              color: 'text-sky-500 bg-sky-500'
            },
            {
              key: 'IN_PROGRESS',
              labelAr: 'قيد المتابعة والمعاينة',
              labelEn: 'Diplomatic Qualification & Site Inspection',
              statuses: ['CONTACTED', 'VISIT_SCHEDULED', 'VISITED', 'OFFER_MADE', 'RESERVED'],
              color: 'text-indigo-500 bg-indigo-500'
            },
            {
              key: 'CLOSED_WON',
              labelAr: 'إقفال الصفقة والتوثيق',
              labelEn: 'Deal Closure & Registration',
              statuses: ['CONTRACT_SIGNED', 'WON'],
              color: 'text-emerald-500 bg-emerald-500'
            }
          ].map((stage) => {
            const stageLeads = filteredLeads.filter(l => stage.statuses.includes(l.status));
            const count = stageLeads.length;

            return (
              <div key={stage.key} className="flex flex-col w-full">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2.5 text-xs md:text-sm truncate">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.color} shrink-0 shadow-[0_0_8px_currentColor]`}></span>
                    <span className="truncate tracking-wide font-extrabold">{lang === 'AR' ? stage.labelAr : stage.labelEn}</span>
                  </h3>
                  <span className="bg-slate-200 dark:bg-[#151f32] text-slate-700 dark:text-slate-300 text-xs font-bold px-3 py-1 rounded-full font-en shrink-0 border border-slate-300/40 dark:border-slate-800/40 shadow-sm">
                    {toArabicNumerals(count)}
                  </span>
                </div>

                <div className={`bg-white/40 dark:bg-[#151f32]/40 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/60 rounded-3xl p-4 pb-12 h-[648px] min-h-[648px] max-h-[648px] overflow-y-auto scrollbar-fade scroll-container mask-fade-top flex flex-col gap-4 transition-all duration-300 ${
                  count === 0 ? 'justify-center border-dashed border-slate-300 dark:border-slate-800' : ''
                }`}>
                  {count === 0 ? (
                    <p className="text-slate-400 dark:text-slate-500 text-sm text-center leading-relaxed font-medium">
                      {stage.key === 'CLOSED_WON'
                        ? (lang === 'AR' ? <>اسحب بطاقة العميل هنا <br/> عند استلام العربون</> : <>Drag investor card here <br/> on deposit receipt</>)
                        : (lang === 'AR' ? 'لا يوجد مستثمرون في هذه المرحلة' : 'No investors in this stage')
                      }
                    </p>
                  ) : (
                    stageLeads.map((lead) => {
                      const isClosed = stage.key === 'CLOSED_WON';
                      const isHigh = lead.leadScore >= 75;
                      const isWarm = lead.leadScore >= 40 && lead.leadScore < 75;
                      
                      const currentStageConfig = STATUS_PIPELINE.find(s => s.key === lead.status);
                      const nextStatus = currentStageConfig?.next;

                      return (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedLeadForDrawer(lead)}
                          className={`bg-white dark:bg-[#0b1120] border ${
                            isClosed
                              ? 'border-emerald-500/20 dark:border-emerald-500/10 shadow-[0_2px_12px_rgba(16,185,129,0.03)] hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] orca-view-enter'
                              : 'border-slate-200/90 dark:border-slate-800/85 hover:border-[#df7b62]/50 dark:hover:border-[#df7b62]/40 hover:shadow-[0_0_20px_rgba(223,123,98,0.15)] orca-view-enter'
                          } p-4 rounded-2xl orca-transition cursor-pointer relative overflow-hidden group flex flex-col gap-2.5 min-h-[168px] w-full shrink-0`}
                        >
                          {isClosed && <div className="absolute top-0 right-0 left-0 h-[3px] bg-emerald-500"></div>}

                          {/* Row 1: Badges */}
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            {lead.project ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-slate-500/5 dark:bg-slate-400/5 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-800/60 min-w-0 flex-1 max-w-[58%]"
                                title={lead.project.name}
                              >
                                <i className="ph-bold ph-buildings text-[11px] shrink-0 opacity-80"></i>
                                <span className="truncate leading-tight">{lead.project.name}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-500 min-w-0 flex-1">
                                <i className="ph-bold ph-buildings text-[11px] shrink-0 opacity-40"></i>
                                <span className="leading-tight">—</span>
                              </span>
                            )}

                            <span
                              title={`${isHigh ? t.scoreHigh : isWarm ? t.scoreWarm : t.scoreLow} (${toArabicNumerals(lead.leadScore)}%)`}
                              className={`inline-flex flex-col items-end gap-0.5 text-[9px] font-semibold px-2 py-1 rounded-lg border shrink-0 max-w-[42%] leading-tight ${
                                isHigh
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                                  : isWarm
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25'
                              }`}
                            >
                              <span className="flex items-center gap-1 w-full justify-end">
                                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></span>
                                <span className="truncate">{isHigh ? t.scoreHigh : isWarm ? t.scoreWarm : t.scoreLow}</span>
                              </span>
                              <span className="font-en text-[10px] opacity-90">{toArabicNumerals(lead.leadScore)}%</span>
                            </span>
                          </div>

                          {/* Row 2: Name and Subdetails */}
                          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                            <h4
                              className="text-slate-900 dark:text-slate-100 font-semibold text-[13px] group-hover:text-[#df7b62] orca-transition leading-snug line-clamp-2"
                              title={`${lead.firstName} ${lead.lastName || ''}`.trim()}
                            >
                              {lead.firstName} {lead.lastName || ''}
                            </h4>

                            <div className="flex flex-col gap-1">
                              <p className="text-slate-600 dark:text-slate-300 text-[11px] font-mono tracking-wide flex items-center gap-1.5 min-w-0">
                                <i className="ph ph-phone text-slate-500 dark:text-slate-400 text-xs shrink-0"></i>
                                <span className="truncate" dir="ltr">{formatPhoneMask(lead.phone)}</span>
                              </p>
                              <p
                                className="text-slate-500 dark:text-slate-400 text-[10px] flex items-center gap-1.5 min-w-0"
                                title={lead.source || (lang === 'AR' ? 'مباشر' : 'Direct')}
                              >
                                <i className="ph ph-megaphone text-slate-500 dark:text-slate-400 text-xs shrink-0"></i>
                                <span className="truncate leading-tight">{lead.source || (lang === 'AR' ? 'مباشر' : 'Direct')}</span>
                              </p>
                            </div>
                          </div>

                          {/* Row 3: Footer */}
                          <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t border-slate-100/90 dark:border-slate-800/90">
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 min-w-0 shrink">
                              <i className="ph ph-clock text-xs shrink-0"></i>
                              <span className="truncate">{getRelativeTime(lead.createdAt)}</span>
                            </div>

                            {nextStatus ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveToNextStep(lead.id, lead.status, nextStatus);
                                }}
                                disabled={updatingId === lead.id}
                                className="orca-focus text-[10px] font-semibold text-[#df7b62] bg-[#df7b62]/10 hover:bg-[#df7b62] hover:text-white px-2 py-1 rounded-lg border border-[#df7b62]/25 hover:border-transparent orca-transition inline-flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer shrink-0 leading-none"
                              >
                                {updatingId === lead.id ? (
                                  t.processingBtn
                                ) : (
                                  <>
                                    <span className="whitespace-nowrap">{lang === 'AR' ? 'ترقية الحالة' : 'Advance'}</span>
                                    <i className={`ph-bold ${lang === 'AR' ? 'ph-caret-left' : 'ph-caret-right'} text-[10px]`} aria-hidden />
                                  </>
                                )}
                              </button>
                            ) : (
                              <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/25 px-2 py-1 rounded-lg inline-flex items-center gap-1 shrink-0 leading-none">
                                <i className="ph-fill ph-seal-check text-xs" aria-hidden />
                                <span>{lang === 'AR' ? 'مكتمل' : 'Done'}</span>
                              </div>
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
        /* Table Container */
        <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20">
            <h2 className="text-slate-900 dark:text-white font-bold text-lg">{t.tableTitle}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0b1120]/30">
                  <th className="p-4 font-semibold">{t.tableId}</th>
                  <th className="p-4 font-semibold">{t.tableInvestor}</th>
                  <th className="p-4 font-semibold">{t.tablePhone}</th>
                  <th className="p-4 font-semibold">{t.tableSource}</th>
                  <th className="p-4 font-semibold">{t.tableClassification}</th>
                  <th className="p-4 font-semibold">{t.tableTime}</th>
                  <th className="p-4 font-semibold">{t.tableActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      {t.noData}
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead, index) => (
                    <tr 
                      key={lead.id} 
                      onClick={() => setSelectedLeadForDrawer(lead)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer"
                    >
                      <td className="p-4 font-en">{toArabicNumerals(index + 1)}</td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        {lead.firstName} {lead.lastName || ''}
                      </td>
                      <td className="p-4 font-en">{formatPhoneMask(lead.phone)}</td>
                      <td className="p-4">{lead.source || '—'}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${
                          lead.leadScore >= 75 
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : lead.leadScore >= 40 
                            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                            : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}>
                          {lead.leadScore >= 75 ? t.scoreHigh : lead.leadScore >= 40 ? t.scoreWarm : t.scoreLow} ({toArabicNumerals(lead.leadScore)}%)
                        </span>
                      </td>
                      <td className="p-4 font-en">{formatDateTime(lead.createdAt)}</td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setSelectedLeadForDrawer(lead)}
                          className="text-[#df7b62] hover:text-[#c5654e] font-semibold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          {t.tableDetails}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsFormOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-[#0b1120] text-white border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] z-10">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <i className="ph-fill ph-user-plus text-[#df7b62] text-xl"></i>
                {t.formTitle}
              </h2>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                {successMessage}
              </div>
            )}

            <form onSubmit={async (e) => {
              await handleSubmit(e);
              setTimeout(() => {
                setIsFormOpen(false);
                setSuccessMessage(null);
              }, 2000);
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs mb-1.5">{t.firstName}</label>
                  <input 
                    type="text" 
                    name="firstName" 
                    required 
                    className="w-full rounded-lg bg-[#151f32] border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#df7b62]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1.5">{t.lastName}</label>
                  <input 
                    type="text" 
                    name="lastName" 
                    className="w-full rounded-lg bg-[#151f32] border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#df7b62]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1.5">{t.phone}</label>
                <input 
                  type="text" 
                  name="phone" 
                  required 
                  className="w-full rounded-lg bg-[#151f32] border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#df7b62]"
                  placeholder="05xxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1.5">{t.email}</label>
                <input 
                  type="email" 
                  name="email" 
                  className="w-full rounded-lg bg-[#151f32] border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#df7b62]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs mb-1.5">{t.city}</label>
                  <input 
                    type="text" 
                    name="city" 
                    className="w-full rounded-lg bg-[#151f32] border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#df7b62]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1.5">{t.source}</label>
                  <select 
                    name="source" 
                    className="w-full rounded-lg bg-[#151f32] border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#df7b62]"
                  >
                    <option value="Snapchat Ads">{t.snapchatAds}</option>
                    <option value="Google Ads">{t.googleAds}</option>
                    <option value="Meta Ads">{t.metaAds}</option>
                    <option value="TikTok Ads">{t.tiktokAds}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1.5">{t.targetProject}</label>
                <select 
                  name="projectId" 
                  className="w-full rounded-lg bg-[#151f32] border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#df7b62]"
                >
                  <option value="">-- {t.targetProject} --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 rounded-lg bg-[#df7b62] hover:bg-[#c5654e] text-white font-bold text-sm transition-colors mt-4 cursor-pointer"
              >
                {t.submitBtn}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer Sidebar */}
      {selectedLeadForDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedLeadForDrawer(null)}
          />
          <div className="relative w-full max-w-lg bg-[#0b1120] text-white border-r border-slate-800 h-full flex flex-col z-10 shadow-2xl p-6 overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <i className="ph-fill ph-user-focus text-[#df7b62] text-xl"></i>
                {t.drawerTitle}
              </h2>
              <button 
                onClick={() => setSelectedLeadForDrawer(null)}
                className="text-slate-400 hover:text-white transition-colors font-bold text-sm cursor-pointer"
              >
                {t.drawerClose}
              </button>
            </div>

            <div className="space-y-5 flex-1">
              <div className="p-4 rounded-xl bg-[#151f32] border border-slate-800">
                <p className="text-slate-400 text-xs mb-1">{t.drawerName}</p>
                <p className="font-bold text-base text-white">
                  {selectedLeadForDrawer.firstName} {selectedLeadForDrawer.lastName || ''}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#151f32] border border-slate-800">
                  <p className="text-slate-400 text-xs mb-1">{t.drawerPhone}</p>
                  <p className="font-bold text-sm text-white font-en">{formatPhoneMask(selectedLeadForDrawer.phone)}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#151f32] border border-slate-800">
                  <p className="text-slate-400 text-xs mb-1">{t.drawerSource}</p>
                  <p className="font-bold text-sm text-white">{selectedLeadForDrawer.source || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#151f32] border border-slate-800">
                  <p className="text-slate-400 text-xs mb-1">{t.drawerCity}</p>
                  <p className="font-bold text-sm text-white">{selectedLeadForDrawer.city || '—'}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#151f32] border border-slate-800">
                  <p className="text-slate-400 text-xs mb-1">{t.drawerTarget}</p>
                  <p className="font-bold text-sm text-white">{selectedLeadForDrawer.project?.name || '—'}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#151f32] border border-slate-800">
                <p className="text-slate-400 text-xs mb-1">{t.drawerScore}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                    selectedLeadForDrawer.leadScore >= 75 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : selectedLeadForDrawer.leadScore >= 40 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {selectedLeadForDrawer.leadScore >= 75 ? t.scoreHigh : selectedLeadForDrawer.leadScore >= 40 ? t.scoreWarm : t.scoreLow}
                  </span>
                  <span className="text-sm font-en font-bold text-white">({toArabicNumerals(selectedLeadForDrawer.leadScore)}%)</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#151f32] border border-slate-800">
                <p className="text-slate-400 text-xs mb-1">{t.drawerStatus}</p>
                <p className="font-bold text-sm text-[#df7b62]">
                  {lang === 'AR' 
                    ? (STATUS_PIPELINE.find(s => s.key === selectedLeadForDrawer.status)?.labelAr || selectedLeadForDrawer.status)
                    : (STATUS_PIPELINE.find(s => s.key === selectedLeadForDrawer.status)?.labelEn || selectedLeadForDrawer.status)
                  }
                </p>
              </div>

              {/* AI Agent Saher NLP Intent Analysis */}
              <div className="p-5 rounded-xl bg-[#df7b62]/10 border border-[#df7b62]/20 shadow-md">
                <p className="text-[#df7b62] text-xs font-bold mb-2 flex items-center gap-1.5">
                  <i className="ph-fill ph-robot text-base animate-pulse"></i>
                  {t.drawerNlp}
                </p>
                <p className="text-slate-350 text-xs leading-relaxed italic">
                  {getSyntheticIntentText(selectedLeadForDrawer)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS للتمرير الأفقي المخفي */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #df7b62; }
      `}} />

    </div>
  );
}
