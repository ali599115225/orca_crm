// app/operations/sales/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getSalesPerformanceAction, SalesRepKPI } from '@/app/actions/sales';
import { useApp } from '@/app/context/AppContext';

const TRANSLATIONS = {
  AR: {
    tag: "تحليلات المبيعات ونسبة التحويل لعام {year} 📊",
    title: "تحليل وتقييم أداء فريق المبيعات",
    desc: "تتبع جودة خدمة المستشارين العقاريين، سرعة الاستجابة، ونسب إغلاق الحجوزات بنظام الفوترة العقارية الموحد.",
    card1_title: "إجمالي عملاء المبيعات",
    card1_sub: "عميل مسند للقسم",
    card2_title: "حجوزات نشطة بالقسم",
    card2_sub: "عربونات مسجلة",
    card3_title: "العقود الموقعة نهائياً",
    card3_sub: "إغلاق ناجح",
    card4_title: "متوسط معدل التحويل (CR)",
    card4_sub: "نسبة ممتازة",
    tableTitle: "لوحة تميز فريق المبيعات (لوحة تميز فريق المبيعات)",
    tableSub: "مرتبة تنازلياً حسب تحقيق الهدف الفردي",
    tableRank: "رتبة التميز",
    tableRep: "اسم المستشار العقاري",
    tableLeads: "العملاء المتابعين",
    tableResponse: "متوسط سرعة الرد",
    tableCr: "معدل التحويل (CR)",
    tableDeals: "حجوزات / عقود مغلقة",
    tableTarget: "تحقيق الأهداف الشهرية (KPI Target)",
    loading: "جاري حساب وتحليل مؤشرات الأداء العقاري...",
    noData: "لا يوجد بيانات مبيعات مسجلة في قاعدة بيانات شركتكم حالياً للتحليل.",
    bookingSuffix: " حجز",
    contractSuffix: " عقد",
    leadSuffix: " عميل"
  },
  EN: {
    tag: "Sales Performance & Conversion Audit {year} 📊",
    title: "Sales Team Performance & KPIs Leaderboard",
    desc: "Track real estate consultant performance, response latencies, and conversion ratios inside the unified billing system.",
    card1_title: "Total Assigned Leads",
    card1_sub: "Assigned leads to department",
    card2_title: "Active Reservations",
    card2_sub: "Deposits registered",
    card3_title: "Final Sales Contracts",
    card3_sub: "Successful closure",
    card4_title: "Average Conversion Rate (CR)",
    card4_sub: "Excellent ratio",
    tableTitle: "Sales Representatives Leaderboard & Performance Matrix",
    tableSub: "Ranked descending based on monthly target achievement",
    tableRank: "Rank Index",
    tableRep: "Real Estate Consultant",
    tableLeads: "Assigned Leads",
    tableResponse: "Avg Response Time",
    tableCr: "Conversion Rate (CR)",
    tableDeals: "Reservations / Contracts Closed",
    tableTarget: "Monthly KPI Target Achievement",
    loading: "Calculating and evaluating real estate performance metrics...",
    noData: "No sales data found in your company database for analysis.",
    bookingSuffix: " res.",
    contractSuffix: " contr.",
    leadSuffix: " leads"
  }
};

export default function SalesView() {
  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;

  const [salesReps, setSalesReps] = useState<SalesRepKPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPerformance() {
      try {
        const data = await getSalesPerformanceAction();
        setSalesReps(data);
      } catch (err) {
        console.error("Failed to load sales data", err);
      } finally {
        setLoading(false);
      }
    }
    loadPerformance();
  }, []);

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

  // حساب مؤشرات القسم الإجمالية التجميعية
  const totalLeadsAssigned = salesReps.reduce((acc, curr) => acc + curr.leadsCount, 0);
  const totalBookings = salesReps.reduce((acc, curr) => acc + curr.bookings, 0);
  const totalContracts = salesReps.reduce((acc, curr) => acc + curr.contracts, 0);
  const averageConversionRate = salesReps.length > 0
    ? (salesReps.reduce((acc, curr) => acc + parseFloat(curr.conversionRate), 0) / salesReps.length).toFixed(1)
    : "0.0";

  const isDark = theme === 'dark';

  return (
    <div className={`sales-page-wrapper calibri-strictly ${isDark ? 'dark-canvas' : 'light-canvas'}`} dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      {/* تضمين خط كاليبري وخصائص التنسيق العام */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.cdnfonts.com/css/calibri');
        
        .calibri-strictly, .calibri-strictly * {
          font-family: 'Calibri', 'Calibri-Regular', 'Arial', sans-serif !important;
        }
        
        /* تباين خاص بالمظهر الداكن والفاتح - بدون margin سالب يسبب انزلاق */
        .sales-page-wrapper {
          min-height: 100%;
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        
        /* تأثير الزجاج المتلألئ للمظهر الداكن */
        .frosted-glass-dark {
          background: rgba(11, 15, 25, 0.6) !important;
          backdrop-filter: blur(18px) !important;
          -webkit-backdrop-filter: blur(18px) !important;
          border: 1px solid rgba(115, 83, 52, 0.35) !important;
          box-shadow: 0 10px 40px 0 rgba(0, 0, 0, 0.4) !important;
        }
        
        /* المظهر الفاتح الراقي */
        .milky-glass-light {
          background: rgba(255, 255, 255, 0.92) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(226, 232, 240, 0.9) !important;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.03) !important;
        }
        
        .bronze-glow-dark {
          border: 1px solid #735334 !important;
          box-shadow: 0 0 20px rgba(115, 83, 52, 0.35) !important;
        }
        
        .bronze-glow-light {
          border: 1px solid #735334 !important;
          box-shadow: 0 4px 20px rgba(115, 83, 52, 0.12) !important;
        }
        
        .text-royal-bronze {
          color: #735334 !important;
        }
        .text-gold-accent {
          color: #E6C687 !important;
        }
      `}} />

      {/* الترويسة العليا */}
      <div className={`mb-8 ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
        <span className={`inline-block text-[10px] font-extrabold px-3 py-1 rounded-full border ${
          isDark 
            ? 'bg-amber-500/10 text-[#E6C687] border-[#735334]/40' 
            : 'bg-[#735334]/10 text-[#735334] border-[#735334]/20'
        }`}>
          {t.tag.replace('{year}', toArabicNumerals(2026))}
        </span>
        <h1 className={`text-3xl font-black mt-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {t.title}
        </h1>
        <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-650'}`}>
          {t.desc}
        </p>
      </div>

      {/* لوحة المؤشرات الإجمالية للقسم (Core Performance Cards Row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        
        {/* إجمالي عملاء المبيعات */}
        <div className={`p-5 rounded-2xl transition-all flex flex-col justify-between ${
          isDark ? 'frosted-glass-dark' : 'milky-glass-light'
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
          <p className={`text-[10px] font-extrabold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.card1_title}</p>
          <div className={`flex items-baseline justify-between mt-3 ${lang === 'AR' ? 'flex-row' : 'flex-row-reverse'}`}>
            <span className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {loading ? '...' : toArabicNumerals(totalLeadsAssigned)}
            </span>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
              isDark ? 'bg-slate-800/80 text-slate-350' : 'bg-slate-100 text-slate-600'
            }`}>
              {t.card1_sub}
            </span>
          </div>
        </div>

        {/* حجوزات نشطة بالقسم */}
        <div className={`p-5 rounded-2xl transition-all flex flex-col justify-between border-r-4 ${
          isDark ? 'frosted-glass-dark border-r-amber-500' : 'milky-glass-light border-r-amber-600'
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
          <p className={`text-[10px] font-extrabold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.card2_title}</p>
          <div className={`flex items-baseline justify-between mt-3 ${lang === 'AR' ? 'flex-row' : 'flex-row-reverse'}`}>
            <span className="text-3xl font-black text-amber-500">
              {loading ? '...' : toArabicNumerals(totalBookings)}
            </span>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
              isDark ? 'bg-amber-950/20 text-amber-400' : 'bg-amber-50 text-amber-800'
            }`}>
              {t.card2_sub}
            </span>
          </div>
        </div>

        {/* العقود الموقعة نهائياً */}
        <div className={`p-5 rounded-2xl transition-all flex flex-col justify-between border-r-4 ${
          isDark ? 'frosted-glass-dark border-r-emerald-500' : 'milky-glass-light border-r-emerald-600'
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
          <p className={`text-[10px] font-extrabold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.card3_title}</p>
          <div className={`flex items-baseline justify-between mt-3 ${lang === 'AR' ? 'flex-row' : 'flex-row-reverse'}`}>
            <span className="text-3xl font-black text-emerald-500">
              {loading ? '...' : toArabicNumerals(totalContracts)}
            </span>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
              isDark ? 'bg-emerald-950/20 text-emerald-400' : 'bg-emerald-50 text-emerald-800'
            }`}>
              {t.card3_sub}
            </span>
          </div>
        </div>

        {/* متوسط معدل التحويل */}
        <div className={`p-5 rounded-2xl transition-all flex flex-col justify-between border-r-4 ${
          isDark ? 'frosted-glass-dark border-r-[#735334]' : 'milky-glass-light border-r-[#735334]'
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
          <p className={`text-[10px] font-extrabold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.card4_title}</p>
          <div className={`flex items-baseline justify-between mt-3 ${lang === 'AR' ? 'flex-row' : 'flex-row-reverse'}`}>
            <span className={`text-3xl font-black ${isDark ? 'text-[#E6C687]' : 'text-[#735334]'}`}>
              {loading ? '...' : toArabicNumerals(averageConversionRate)}٪
            </span>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
              isDark ? 'bg-[#735334]/20 text-[#E6C687]' : 'bg-[#735334]/10 text-[#735334]'
            }`}>
              {t.card4_sub}
            </span>
          </div>
        </div>

      </div>

      {/* جدول تقييم أداء مستشاري المبيعات (Leaderboard Matrix) */}
      <div className={`rounded-2xl transition-all overflow-hidden border ${
        isDark ? 'frosted-glass-dark' : 'milky-glass-light'
      }`}>
        <div className={`p-5 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        } ${lang === 'AR' ? 'flex-row' : 'flex-row-reverse'}`}>
          <h3 className={`font-black text-sm ${isDark ? 'text-[#E6C687]' : 'text-[#735334]'}`}>
            {t.tableTitle}
          </h3>
          <span className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-450'}`}>
            {t.tableSub}
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className={`border-b text-[10px] font-extrabold ${
                isDark ? 'bg-slate-950/40 text-slate-400 border-slate-800' : 'bg-slate-100/50 text-slate-600 border-slate-200'
              } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
                <th className="px-5 py-4">{t.tableRank}</th>
                <th className="px-5 py-4">{t.tableRep}</th>
                <th className="px-4 py-4">{t.tableLeads}</th>
                <th className="px-4 py-4">{t.tableResponse}</th>
                <th className="px-4 py-4">{t.tableCr}</th>
                <th className="px-4 py-4">{t.tableDeals}</th>
                <th className="px-5 py-4">{t.tableTarget}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/70' : 'divide-slate-105'}`}>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-450 font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block ml-2"></span>
                    {t.loading}
                  </td>
                </tr>
              ) : salesReps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-450 font-bold">
                    {t.noData}
                  </td>
                </tr>
              ) : (
                salesReps.map((rep, index) => {
                  const rank = index + 1;
                  const isTopRank = rank <= 2;
                  
                  return (
                    <tr 
                      key={rep.id} 
                      className={`transition-colors ${
                        isSelectedRep(rank) 
                          ? (isDark ? 'bg-[#735334]/10' : 'bg-[#735334]/5') 
                          : (isDark ? 'hover:bg-slate-900/30' : 'hover:bg-slate-50/50')
                      } ${lang === 'AR' ? 'text-right' : 'text-left'}`}
                    >
                      {/* رتبة التميز */}
                      <td className="px-5 py-4">
                        <div className={`flex items-center ${lang === 'AR' ? 'justify-start' : 'justify-end'}`}>
                          <span className={`h-6 w-6 rounded-full flex items-center justify-center font-black text-[10px] ${
                            rank === 1 ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.4)]' :
                            rank === 2 ? 'bg-slate-300 text-slate-950' :
                            isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {toArabicNumerals(rank)}
                          </span>
                        </div>
                      </td>

                      {/* اسم المستشار العقاري */}
                      <td className="px-5 py-4">
                        <div>
                          <p className={`font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {rep.name}
                          </p>
                          <p className={`text-[9px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {rep.email}
                          </p>
                        </div>
                      </td>

                      {/* العملاء المتابعين */}
                      <td className="px-4 py-4 font-extrabold text-slate-400 dark:text-slate-300">
                        {toArabicNumerals(rep.leadsCount)}{t.leadSuffix}
                      </td>

                      {/* متوسط سرعة الرد */}
                      <td className="px-4 py-4 font-bold text-slate-400 dark:text-slate-300">
                        {toArabicNumerals(rep.responseTime)}
                      </td>

                      {/* معدل التحويل (CR) */}
                      <td className="px-4 py-4 font-black text-amber-500">
                        {toArabicNumerals(rep.conversionRate)}٪
                      </td>

                      {/* حجوزات / عقود مغلقة */}
                      <td className="px-4 py-4">
                        <div className={`flex gap-2 ${lang === 'AR' ? 'justify-start' : 'justify-end'}`}>
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold border ${
                            isDark 
                              ? 'bg-amber-950/20 text-amber-400 border-amber-900/50' 
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {toArabicNumerals(rep.bookings)}{t.bookingSuffix}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold border ${
                            isDark 
                              ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/50' 
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
                            {toArabicNumerals(rep.contracts)}{t.contractSuffix}
                          </span>
                        </div>
                      </td>

                      {/* تحقيق الأهداف الشهرية (KPI Target) */}
                      <td className="px-5 py-4">
                        <div className={`flex items-center space-x-3.5 min-w-[140px] ${lang === 'AR' ? 'space-x-reverse' : ''}`}>
                          <span className={`text-[11px] font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {toArabicNumerals(rep.targetAchieved)}٪
                          </span>
                          
                          {/* Progress bar tube */}
                          <div className={`flex-1 rounded-full h-2 overflow-hidden border ${
                            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-200 border-slate-300'
                          }`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                rep.targetAchieved >= 80 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' :
                                rep.targetAchieved >= 50 ? 'bg-gradient-to-r from-amber-600 to-amber-400' : 
                                'bg-gradient-to-r from-red-600 to-rose-500'
                              }`} 
                              style={{ width: `${rep.targetAchieved}%` }}
                            />
                          </div>
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
    </div>
  );
}

// دالة التحقق من ترتيب المستشار لإعطاء خلفية مميزة للمراكز الأولى
function isSelectedRep(rank: number): boolean {
  return rank === 1;
}