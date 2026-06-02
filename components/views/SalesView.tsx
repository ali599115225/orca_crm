// components/views/SalesView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getSalesPerformanceAction, SalesRepKPI } from '@/app/actions/sales';
import { useApp } from '@/app/context/AppContext';

const TRANSLATIONS = {
  AR: {
    tag: "تحليلات المبيعات ونسبة التحويل لعام ٢٠٢٦ 📊",
    title: "تحليل وتقييم أداء فريق المبيعات (KPIs)",
    desc: "تتبع جودة خدمة المستشارين العقاريين، سرعة الاستجابة، ونسب إغلاق الحجوزات بنظام المبيعات الموحد.",
    card1_title: "إجمالي عملاء المبيعات",
    card1_sub: "عميل مسند للقسم",
    card2_title: "حجوزات نشطة بالقسم",
    card2_sub: "عربونات مسجلة",
    card3_title: "العقود الموقعة نهائياً",
    card3_sub: "إغلاق ناجح",
    card4_title: "متوسط معدل التحويل (CR)",
    card4_sub: "نسبة ممتازة",
    tableTitle: "لوحة تميز فريق المبيعات (Leaderboard)",
    tableSub: "مرتبة تنازلياً حسب تحقيق الهدف الفردي ومعدلات الإغلاق العقارية",
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
    tag: "Sales Performance & Conversion Audit 2026 📊",
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
  const isArabic = lang === 'AR';
  const dir = isArabic ? 'rtl' : 'ltr';

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
    if (!isArabic) return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, "٪");
  };

  // تنسيق الأرقام والنسبة المئوية
  const formatPercentage = (val: string | number): string => {
    let raw = val.toString().replace('%', '');
    return toArabicNumerals(raw) + "٪";
  };

  // حساب الأرقام الإجمالية
  const totalLeads = salesReps.reduce((sum, r) => sum + r.leadsCount, 0);
  const totalBookings = salesReps.reduce((sum, r) => sum + r.bookings, 0);
  const totalContracts = salesReps.reduce((sum, r) => sum + r.contracts, 0);
  const totalDeals = totalBookings + totalContracts;
  const avgCR = totalLeads > 0 ? ((totalDeals / totalLeads) * 100).toFixed(1) : "0.0";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
        <div className="w-10 h-10 border-4 border-[#df7b62] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-slate-500 dark:text-slate-450">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="orca-page orca-stack" dir={dir}>
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#df7b62]/10 border border-[#df7b62]/20 text-[#df7b62] text-xs font-semibold mb-3">
          <i className="ph-bold ph-trend-up"></i> {t.tag}
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {t.title}
        </h1>
        <p className="text-xs md:text-sm text-slate-550 dark:text-slate-400">
          {t.desc}
        </p>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">{t.card1_title}</p>
          <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-en">{toArabicNumerals(totalLeads)}</h3>
          <span className="text-[10px] text-slate-450 block mt-1">{t.card1_sub}</span>
        </div>
        <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">{t.card2_title}</p>
          <h3 className="text-xl md:text-2xl font-bold text-amber-500">{toArabicNumerals(totalBookings)}</h3>
          <span className="text-[10px] text-slate-450 block mt-1">{t.card2_sub}</span>
        </div>
        <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">{t.card3_title}</p>
          <h3 className="text-xl md:text-2xl font-bold text-emerald-500">{toArabicNumerals(totalContracts)}</h3>
          <span className="text-[10px] text-slate-450 block mt-1">{t.card3_sub}</span>
        </div>
        <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">{t.card4_title}</p>
          <h3 className="text-xl md:text-2xl font-bold text-indigo-500 dark:text-indigo-400 font-en">{formatPercentage(avgCR)}</h3>
          <span className="text-[10px] text-slate-450 block mt-1">{t.card4_sub}</span>
        </div>
      </div>

      {/* Main Leaderboard Panel */}
      <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20">
          <h3 className="text-slate-900 dark:text-white font-bold text-base">{t.tableTitle}</h3>
          <p className="text-xs text-slate-550 dark:text-slate-450 mt-1">{t.tableSub}</p>
        </div>

        {salesReps.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
            {t.noData}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0b1120]/30">
                  <th className="p-4 font-semibold text-center w-24">{t.tableRank}</th>
                  <th className="p-4 font-semibold">{t.tableRep}</th>
                  <th className="p-4 font-semibold text-center">{t.tableLeads}</th>
                  <th className="p-4 font-semibold text-center">{t.tableResponse}</th>
                  <th className="p-4 font-semibold text-center">{t.tableCr}</th>
                  <th className="p-4 font-semibold text-center">{t.tableDeals}</th>
                  <th className="p-4 font-semibold w-64">{t.tableTarget}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {salesReps.map((rep, idx) => {
                  const rank = idx + 1;
                  return (
                    <tr key={rep.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                          rank === 1 
                            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 font-black' 
                            : rank === 2 
                            ? 'bg-slate-400/20 text-slate-400 border border-slate-400/30 font-black'
                            : rank === 3
                            ? 'bg-[#df7b62]/20 text-[#df7b62]/90 border border-[#df7b62]/30 font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {toArabicNumerals(rank)}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        {rep.name}
                        <span className="text-[10px] text-slate-400 dark:text-slate-550 block font-normal mt-0.5">{rep.email}</span>
                      </td>
                      <td className="p-4 text-center font-en">{toArabicNumerals(rep.leadsCount)}{t.leadSuffix}</td>
                      <td className="p-4 text-center text-xs">{toArabicNumerals(rep.responseTime)}</td>
                      <td className="p-4 text-center font-en font-bold text-[#df7b62]">{formatPercentage(rep.conversionRate)}</td>
                      <td className="p-4 text-center text-xs font-en">
                        <span className="text-amber-500 font-semibold">{toArabicNumerals(rep.bookings)}{t.bookingSuffix}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-emerald-500 font-semibold">{toArabicNumerals(rep.contracts)}{t.contractSuffix}</span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            <span>{isArabic ? "نسبة الإنجاز:" : "Achieved:"}</span>
                            <span className="font-en">{formatPercentage(rep.targetAchieved)}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                rep.targetAchieved >= 90 
                                  ? 'bg-emerald-500' 
                                  : rep.targetAchieved >= 50 
                                  ? 'bg-amber-500' 
                                  : 'bg-[#df7b62]'
                              }`}
                              style={{ width: `${rep.targetAchieved}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
