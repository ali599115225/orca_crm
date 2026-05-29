// app/operations/projects/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getDetailedProjectsAction, createProjectAction } from '@/app/actions/projects';
import { useApp } from '@/app/context/AppContext';

const STATUS_TRANSLATIONS: Record<string, Record<string, { label: string; style: string }>> = {
  AR: {
    PLANNING: { label: 'تحت التخطيط', style: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/40' },
    UNDER_CONSTRUCTION: { label: 'قيد الإنشاء', style: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40' },
    COMPLETED: { label: 'مكتمل وجاهز', style: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40' },
    SOLD_OUT: { label: 'مباع بالكامل', style: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-800/40' },
  },
  EN: {
    PLANNING: { label: 'Planning', style: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/40' },
    UNDER_CONSTRUCTION: { label: 'Under Construction', style: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40' },
    COMPLETED: { label: 'Completed', style: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40' },
    SOLD_OUT: { label: 'Sold Out', style: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-800/40' },
  }
};

const MOCK_PROJECTS = [
  {
    id: "mock-project-1",
    name: "مجمع ريزيدنس الفضي ١",
    city: "الرياض",
    status: "UNDER_CONSTRUCTION",
    unitsTotal: 120,
    unitsSold: 96,
    unitsBooked: 12,
    minPrice: 1250000,
    maxPrice: 2400000,
    _count: { leads: 42 }
  },
  {
    id: "mock-project-2",
    name: "برج النخبة السكني ٣",
    city: "جدة",
    status: "COMPLETED",
    unitsTotal: 85,
    unitsSold: 72,
    unitsBooked: 8,
    minPrice: 1850000,
    maxPrice: 3900000,
    _count: { leads: 58 }
  },
  {
    id: "mock-project-3",
    name: "مجمع صرح الحمراء السكني",
    city: "الرياض",
    status: "PLANNING",
    unitsTotal: 50,
    unitsSold: 0,
    unitsBooked: 0,
    minPrice: 950000,
    maxPrice: 1800000,
    _count: { leads: 14 }
  }
];

const TRANSLATIONS = {
  AR: {
    title: "إدارة أصول ومشاريع المحفظة العقارية",
    subtitle: "تتبع حالة التطوير البنائي، حجم الوحدات الإجمالي ونسب الاستيعاب المبيعاتي",
    addAssetBtn: "➕ إضافة أصل عقاري جديد",
    successMsg: "تم تسجيل المشروع العقاري الجديد بنجاح في قاعدة بيانات شركتكم!",
    card1_title: "إجمالي المشاريع العقارية النشطة",
    card1_sub: "موقع استثماري مسجل",
    card2_title: "مجموع الوحدات السكنية والشركات",
    card2_sub: "وحدة عقارية متكاملة",
    card3_title: "القيمة السوقية للمحفظة الاستثمارية ر.س",
    card3_sub: "التقييم الأساسي للمحفظة",
    unit_total_label: "إجمالي الوحدات في المشروع: ",
    unit_total_suffix: " وحدة",
    min_price_label: "يبدأ من: ",
    absorption_label: "نسبة المبيعات والامتصاص:",
    absorption_sold: "تم بيع ",
    interested_leads: "المستثمرون المهتمون:",
    interested_suffix: " مستثمر",
    sold: "مباع",
    booked: "محجوز",
    available: "متاح",
    modal_title: "إضافة أصل عقاري وموقع جديد للمحفظة",
    modal_close: "✕ إغلاق",
    modal_name: "اسم المشروع العقاري الجديد *",
    modal_city: "المدينة الاستثمارية *",
    modal_status: "حالة التطوير البنائي *",
    modal_units: "إجمالي عدد الوحدات السكنية والشركات *",
    modal_min: "الحد الأدنى لقيمة الأصول (ر.س) *",
    modal_max: "الحد الأقصى لقيمة الأصول (ر.س)",
    modal_save: "توثيق وحفظ الأصل العقاري ➔",
    modal_cancel: "إلغاء",
    status_planning: "تحت التخطيط",
    status_construction: "قيد الإنشاء",
    status_completed: "مكتمل وجاهز",
    status_soldout: "مباع بالكامل"
  },
  EN: {
    title: "Real Estate Asset Portfolio",
    subtitle: "Track build stage, total units count, and sales absorption ratios",
    addAssetBtn: "➕ Add New Real Estate Asset",
    successMsg: "New real estate project registered successfully in your company database!",
    card1_title: "Total Active Projects",
    card1_sub: "Registered investment sites",
    card2_title: "Total Residential & Office Units",
    card2_sub: "Integrated real estate units",
    card3_title: "Portfolio Target Valuation (SAR)",
    card3_sub: "Base portfolio valuation",
    unit_total_label: "Total Units in Project: ",
    unit_total_suffix: " units",
    min_price_label: "Starts from: ",
    absorption_label: "Sales & Absorption Ratio:",
    absorption_sold: "Sold ",
    interested_leads: "Interested Investors:",
    interested_suffix: " investors",
    sold: "Sold",
    booked: "Reserved",
    available: "Available",
    modal_title: "Add New Asset Location to Portfolio",
    modal_close: "✕ Close",
    modal_name: "New Real Estate Project Name *",
    modal_city: "Investment City *",
    modal_status: "Build Status *",
    modal_units: "Total Residential & Office Units *",
    modal_min: "Minimum Asset Value (SAR) *",
    modal_max: "Maximum Asset Value (SAR)",
    modal_save: "Log & Save Real Estate Asset ➔",
    modal_cancel: "Cancel",
    status_planning: "Planning Phase",
    status_construction: "Under Construction",
    status_completed: "Completed & Ready",
    status_soldout: "Sold Out"
  }
};

export default function ProjectsView() {
  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;

  const [projects, setProjects] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      const dbProjects = await getDetailedProjectsAction();
      setProjects(dbProjects.length > 0 ? dbProjects : MOCK_PROJECTS);
    }
    loadProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await createProjectAction(formData);

    if (result.success) {
      setSuccessMessage(t.successMsg);
      e.currentTarget.reset();
      setIsModalOpen(false);
      const updatedProjects = await getDetailedProjectsAction();
      setProjects(updatedProjects.length > 0 ? updatedProjects : MOCK_PROJECTS);
    } else {
      setErrorMessage(result.error || "حدث خطأ غير متوقع أثناء الحفظ.");
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

  // تنسيق المبالغ المالية السيادية
  const formatCurrency = (val: number): string => {
    const formatted = Math.round(val).toLocaleString('en-US');
    if (lang === 'EN') return formatted + " SAR";
    return toArabicNumerals(formatted) + " ر.س";
  };

  // احتساب المقاييس الإجمالية للمحفظة الاستثمارية
  const totalProjectsCount = projects.length;
  const totalUnitsCount = projects.reduce((acc, p) => acc + (p.unitsTotal || 0), 0);
  const totalMarketValue = projects.reduce((acc, p) => acc + ((p.unitsTotal || 0) * (p.minPrice || 0)), 0);

  return (
    <div className="space-y-6 selection-fix p-1">
      
      {/* حقن خط Cairo/Inter وتنسيق السمة والـ layout */}
      <style dangerouslySetInnerHTML={{__html: `
        body, html, * {
          font-family: 'Cairo', 'Inter', sans-serif !important;
          letter-spacing: normal !important;
        }
        .selection-fix, .selection-fix * {
          letter-spacing: normal !important;
        }
        ::selection {
          background-color: ${theme === "dark" ? "rgba(99, 102, 241, 0.2)" : "rgba(79, 70, 229, 0.15)"} !important;
          color: #27272a !important;
          text-shadow: none !important;
        }
      `}} />

      {/* الهيدر وزر الإضافة */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
        <div>
          <h1 className={`text-2xl font-bold tracking-normal transition-colors ${
            theme === 'dark' ? 'text-white' : 'text-[#0b0f19]'
          }`}>
            {t.title}
          </h1>
          <p className={`text-xs mt-1 transition-colors ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            {t.subtitle}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer shadow-md hover:scale-[1.02] flex items-center gap-1.5 ${
            theme === 'dark' ? 'bg-[#E6C687] text-slate-950 hover:bg-[#E6C687]/90' : 'bg-[#735334] text-white hover:bg-[#735334]/90'
          }`}
        >
          {t.addAssetBtn}
        </button>
      </div>

      {/* التنبيهات ورسائل الخطأ والنجاح */}
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

      {/* 1. مؤشرات المحفظة الاستثمارية الفاخرة (Portfolio Analytics Metrics) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* كارت 1: المشاريع النشطة */}
        <div className={`border p-6 rounded-2xl transition-all duration-550 ${
          theme === 'dark' 
            ? 'bg-[#111726]/60 border-[#cd7f32]/20 hover:border-[#cd7f32]/40 shadow-[0_0_20px_rgba(205,127,50,0.02)] text-white' 
            : 'bg-white border-transparent shadow-[0_8px_30px_rgba(0,0,0,0.035)] text-[#735334]'
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
          <p className={`text-[11px] font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-[#735334]/70'}`}>
            {t.card1_title}
          </p>
          <p className={`text-4xl font-black mt-3 ${theme === 'dark' ? 'text-white' : 'text-[#735334]'}`}>
            {toArabicNumerals(totalProjectsCount)}
          </p>
          <span className={`text-[10px] font-bold block mt-1.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            {t.card1_sub}
          </span>
        </div>

        {/* كارت 2: مجموع الوحدات */}
        <div className={`border p-6 rounded-2xl transition-all duration-550 ${
          theme === 'dark' 
            ? 'bg-[#111726]/60 border-[#cd7f32]/20 hover:border-[#cd7f32]/40 shadow-[0_0_20px_rgba(205,127,50,0.02)] text-white' 
            : 'bg-white border-transparent shadow-[0_8px_30px_rgba(0,0,0,0.035)] text-[#735334]'
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
          <p className={`text-[11px] font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-[#735334]/70'}`}>
            {t.card2_title}
          </p>
          <p className={`text-4xl font-black mt-3 ${theme === 'dark' ? 'text-white' : 'text-[#735334]'}`}>
            {toArabicNumerals(totalUnitsCount)}
          </p>
          <span className={`text-[10px] font-bold block mt-1.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            {t.card2_sub}
          </span>
        </div>

        {/* كارت 3: القيمة السوقية */}
        <div className={`border p-6 rounded-2xl transition-all duration-550 ${
          theme === 'dark' 
            ? 'bg-[#111726]/60 border-[#cd7f32]/35 hover:border-[#cd7f32]/50 shadow-[0_0_25px_rgba(205,127,50,0.06)] text-white' 
            : 'bg-white border-transparent shadow-[0_8px_30px_rgba(0,0,0,0.035)] text-[#735334]'
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
          <p className={`text-[11px] font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-[#735334]/70'}`}>
            {t.card3_title}
          </p>
          <p className={`text-3xl font-black mt-3 ${theme === 'dark' ? 'text-[#E6C687]' : 'text-[#735334]'}`}>
            {formatCurrency(totalMarketValue)}
          </p>
          <span className={`text-[10px] font-bold block mt-1.5 ${theme === 'dark' ? 'text-[#E6C687]/80' : 'text-[#735334]/80'}`}>
            {t.card3_sub}
          </span>
        </div>

      </div>

      {/* 2. شبكة عرض بطاقات المشاريع الحية (Active Projects Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          const statusDetails = STATUS_TRANSLATIONS[lang]?.[project.status] || STATUS_TRANSLATIONS.AR[project.status] || { label: project.status, style: 'bg-gray-50' };
          const leadsCount = project._count?.leads || 0;
          
          // احتساب نسبة المبيعات (الامتصاص)
          const totalUnits = project.unitsTotal || 1;
          const soldUnits = project.unitsSold || 0;
          const absorptionPercentage = Math.round((soldUnits / totalUnits) * 100);

          return (
            <div 
              key={project.id} 
              className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] ${
                theme === 'dark' 
                  ? 'bg-[#111726]/60 border-[#cd7f32]/25 shadow-2xl hover:border-[#cd7f32]/50 text-white' 
                  : 'bg-white border-slate-200 hover:border-[#735334]/50 shadow-[0_8px_30px_rgba(0,0,0,0.02)] text-slate-800'
              } ${lang === 'AR' ? 'text-right' : 'text-left'}`}
            >
              <div className="p-6 space-y-4">
                <div className={`flex items-center justify-between ${lang === 'AR' ? 'flex-row' : 'flex-row-reverse'}`}>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${statusDetails.style}`}>
                    {statusDetails.label}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    theme === 'dark' ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {project.city}
                  </span>
                </div>
                
                <div>
                  <h3 className="font-bold text-lg">{project.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {t.unit_total_label}<span className="font-bold">{toArabicNumerals(project.unitsTotal)} {lang === 'AR' ? 'وحدة' : 'units'}</span>
                  </p>
                </div>

                {project.minPrice && (
                  <p className={`text-sm font-extrabold ${theme === 'dark' ? 'text-[#E6C687]' : 'text-[#735334]'}`}>
                    {t.min_price_label}{formatCurrency(project.minPrice)}
                  </p>
                )}

                {/* نسبة المبيعات (الامتصاص المالي) مع المؤشر المضيء */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>{t.absorption_label}</span>
                    <span className={theme === 'dark' ? 'text-[#E6C687]' : 'text-[#735334]'}>
                      {t.absorption_sold}{toArabicNumerals(absorptionPercentage)}٪
                    </span>
                  </div>
                  <div className={`w-full rounded-full h-2 overflow-hidden ${
                    theme === 'dark' ? 'bg-slate-900 border border-white/5 shadow-[0_0_10px_rgba(230,198,135,0.15)]' : 'bg-slate-100'
                  }`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        theme === 'dark' ? 'bg-gradient-to-r from-[#cd7f32] to-[#E6C687]' : 'bg-[#735334]'
                      }`}
                      style={{ width: `${absorptionPercentage}%` }}
                    />
                  </div>
                </div>

                <div className={`border-t pt-3 flex items-center justify-between text-xs ${
                  theme === 'dark' ? 'border-white/5 text-slate-400' : 'border-slate-100 text-slate-650'
                }`}>
                  <span>{t.interested_leads}</span>
                  <span className={`font-bold px-2 py-0.5 rounded border ${
                    theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-750'
                  }`}>
                    {toArabicNumerals(leadsCount)} {lang === 'AR' ? 'مستثمر' : 'investors'}
                  </span>
                </div>
              </div>

              {/* التقسيم الفردي للمخزون أسفل الكارت */}
              <div className={`px-6 py-3 border-t grid grid-cols-3 gap-1 text-center text-[10px] ${
                theme === 'dark' ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-105'
              }`}>
                <div>
                  <p className="text-gray-405 font-medium">{t.sold}</p>
                  <p className={`font-black mt-0.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    {toArabicNumerals(project.unitsSold)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-405 font-medium">{t.booked}</p>
                  <p className="font-black text-amber-600 mt-0.5">
                    {toArabicNumerals(project.unitsBooked)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-405 font-medium">{t.available}</p>
                  <p className="font-black text-emerald-600 mt-0.5">
                    {toArabicNumerals(project.unitsTotal - project.unitsSold - project.unitsBooked)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. نافذة إضافة أصل عقاري جديد (Add New Asset Modal) */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className={`w-full max-w-lg rounded-2xl border p-6 flex flex-col relative animate-fadeIn font-Calibri shadow-2xl transition-colors duration-500 ${
              theme === 'dark'
                ? 'bg-[#111726]/95 border-[#cd7f32]/25 text-white'
                : 'bg-white border-[#735334]/20 text-[#735334]'
            } ${lang === 'AR' ? 'text-right' : 'text-left'}`} 
            dir={lang === 'AR' ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between pb-4 border-b mb-6 ${
              theme === 'dark' ? 'border-white/10' : 'border-slate-200'
            }`}>
              <h3 className={`font-black text-sm ${
                theme === 'dark' ? 'text-[#E6C687]' : 'text-[#735334]'
              }`}>{t.modal_title}</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className={`text-xs font-bold ${
                  theme === 'dark' ? 'text-white hover:text-amber-500' : 'text-[#735334] hover:text-amber-700'
                }`}
              >{t.modal_close}</button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.modal_name}</label>
                <input 
                  type="text" 
                  name="name"
                  required
                  className={`w-full border rounded-lg p-2.5 text-xs focus:ring-0 focus:outline-none ${
                    theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                  placeholder={lang === 'AR' ? "مثال: مجمع ريزيدنس الفضي ١" : "e.g. Silver Residence 1"}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.modal_city}</label>
                  <select 
                    name="city" 
                    className={`w-full border rounded-lg p-2.5 text-xs focus:ring-0 focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-900 border-white/10 text-[#E6C687]' : 'bg-white border-slate-300 text-[#735334]'
                    }`}
                  >
                    <option value="الرياض">{lang === 'AR' ? "الرياض" : "Riyadh"}</option>
                    <option value="جدة">{lang === 'AR' ? "جدة" : "Jeddah"}</option>
                    <option value="الدمام">{lang === 'AR' ? "الدمام" : "Dammam"}</option>
                    <option value="مكة المكرمة">{lang === 'AR' ? "مكة المكرمة" : "Makkah"}</option>
                    <option value="المدينة المنورة">{lang === 'AR' ? "المدينة المنورة" : "Madinah"}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.modal_status}</label>
                  <select 
                    name="status" 
                    className={`w-full border rounded-lg p-2.5 text-xs focus:ring-0 focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-900 border-white/10 text-[#E6C687]' : 'bg-white border-slate-300 text-[#735334]'
                    }`}
                  >
                    <option value="PLANNING">{t.status_planning}</option>
                    <option value="UNDER_CONSTRUCTION">{t.status_construction}</option>
                    <option value="COMPLETED">{t.status_completed}</option>
                    <option value="SOLD_OUT">{t.status_soldout}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.modal_units}</label>
                <input 
                  type="number" 
                  name="unitsTotal"
                  required
                  className={`w-full border rounded-lg p-2.5 text-xs focus:ring-0 focus:outline-none ${
                    theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                  placeholder="e.g. 120"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.modal_min}</label>
                  <input 
                    type="number" 
                    name="minPrice"
                    required
                    className={`w-full border rounded-lg p-2.5 text-xs focus:ring-0 focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                    placeholder="e.g. 1250000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">{t.modal_max}</label>
                  <input 
                    type="number" 
                    name="maxPrice"
                    className={`w-full border rounded-lg p-2.5 text-xs focus:ring-0 focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                    placeholder="e.g. 2400000"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <button 
                  type="submit"
                  className={`flex-1 text-xs font-black p-3 rounded-lg transition-all duration-300 cursor-pointer shadow-md hover:scale-[1.02] ${
                    theme === 'dark' ? 'bg-[#E6C687] text-slate-950 hover:bg-[#E6C687]/90' : 'bg-[#735334] text-white hover:bg-[#735334]/90'
                  }`}
                >
                  {t.modal_save}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 text-xs font-bold p-3 rounded-lg transition-all duration-300 cursor-pointer ${
                    theme === 'dark' ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                  }`}
                >
                  {t.modal_cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}