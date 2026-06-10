// components/views/SalesView.tsx
'use client';
import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import LayoutContainer from '@/components/ui/LayoutContainer';
import { SmartCard } from '@/components/ui/SmartCard';
import { getSalesPerformanceAction, SalesRepKPI } from '@/app/actions/sales';
import { useApp } from '@/app/context/AppContext';
import { toArabicNumerals } from '@/lib/formatters';

const TRANSLATIONS = {
  AR: {
    tag: "تحليلات المبيعات ونسبة التحويل لعام ٢٠٢٦ 📊",
    title: "تحليل وتقييم أداء فريق المبيعات (KPIs)",
    desc: "تتبع جودة خدمة المستشارين العقاريين، سرعة الاستجابة، ونسب إغلاق الحجوزات بنظام المبيعات الموحد.",
    card1_title: "إجمالي عملاء المبيعات",
    card1_sub: "عميل مسند للقسم",
    card2_title: "حجوزات نشطة",
    card2_sub: "عربونات مسجلة",
    card3_title: "العقود الموقعة",
    card3_sub: "إغلاق ناجح",
    card4_title: "معدل التحويل (CR)",
    card4_sub: "نسبة ممتازة",
    tableTitle: "لوحة تميز فريق المبيعات (Leaderboard)",
    tableSub: "مرتبة تنازلياً حسب تحقيق الهدف الفردي",
    tableRank: "رتبة",
    tableRep: "المستشار العقاري",
    tableLeads: "العملاء",
    tableResponse: "سرعة الرد",
    tableCr: "معدل التحويل",
    tableDeals: "حجوزات / عقود",
    tableTarget: "تحقيق الهدف",
    loading: "جاري حساب وتحليل مؤشرات الأداء...",
    noData: "لا يوجد بيانات مبيعات مسجلة حالياً.",
    bookingSuffix: " حجز",
    contractSuffix: " عقد",
    leadSuffix: " عميل"
  },
  EN: {
    tag: "Sales Performance & Conversion Audit 2026 📊",
    title: "Sales Team Performance & KPIs Leaderboard",
    desc: "Track real estate consultant performance, response latencies, and conversion ratios.",
    card1_title: "Total Assigned Leads",
    card1_sub: "Assigned leads to department",
    card2_title: "Active Reservations",
    card2_sub: "Deposits registered",
    card3_title: "Final Sales Contracts",
    card3_sub: "Successful closure",
    card4_title: "Avg Conversion Rate (CR)",
    card4_sub: "Excellent ratio",
    tableTitle: "Sales Representatives Leaderboard",
    tableSub: "Ranked by monthly target achievement",
    tableRank: "Rank",
    tableRep: "Consultant",
    tableLeads: "Leads",
    tableResponse: "Response Time",
    tableCr: "Conv. Rate",
    tableDeals: "Reservations / Contracts",
    tableTarget: "KPI Target",
    loading: "Calculating performance metrics...",
    noData: "No sales data found.",
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

  const formatPercentage = (val: string | number): string => {
    let raw = val.toString().replace(/%/g, '');
    return (isArabic ? toArabicNumerals(raw) : raw) + "٪";
  };

  const totalLeads = salesReps.reduce((sum, r) => sum + r.leadsCount, 0);
  const totalBookings = salesReps.reduce((sum, r) => sum + r.bookings, 0);
  const totalContracts = salesReps.reduce((sum, r) => sum + r.contracts, 0);
  const totalDeals = totalBookings + totalContracts;
  const avgCR = totalLeads > 0 ? ((totalDeals / totalLeads) * 100).toFixed(1) : "0.0";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
        <div className="w-10 h-10 border-4 border-[var(--nc-accent-border)] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-[var(--nc-foreground-muted)] font-medium">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="nc-page nc-stack p-6" dir={dir}>

      {/* Header */}
      <PageHeader title={t.title} description={t.desc}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] text-[var(--nc-accent)] text-xs font-semibold">
          <i className="ph-bold ph-trend-up"></i> {t.tag}
        </div>
      </PageHeader>

      <LayoutContainer
        kpis={
          <>
            <SmartCard elevation="elevated" className="p-3">
              <div className="flex items-start mb-3">
                <div className="flex-1">
                  <p className="text-[var(--nc-text-dim)] text-[10px] font-bold uppercase tracking-wider mb-0.5">{t.card1_title}</p>
                  <h3 className="text-xl font-black text-[var(--nc-text-primary)] font-en">{toArabicNumerals(totalLeads)}</h3>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[var(--nc-accent-soft)] flex items-center justify-center text-[var(--nc-accent)]">
                  <i className="ph-bold ph-users text-base"></i>
                </div>
              </div>
              <span className="text-[9px] text-[var(--nc-text-dim)]">{t.card1_sub}</span>
            </SmartCard>
            <SmartCard elevation="elevated" className="p-3">
              <div className="flex items-start mb-3">
                <div className="flex-1">
                  <p className="text-[var(--nc-text-dim)] text-[10px] font-bold uppercase tracking-wider mb-0.5">{t.card2_title}</p>
                  <h3 className="text-xl font-black text-amber-500">{toArabicNumerals(totalBookings)}</h3>
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <i className="ph-bold ph-clock text-base"></i>
                </div>
              </div>
              <span className="text-[9px] text-[var(--nc-text-dim)]">{t.card2_sub}</span>
            </SmartCard>
            <SmartCard elevation="elevated" className="p-3">
              <div className="flex items-start mb-3">
                <div className="flex-1">
                  <p className="text-[var(--nc-text-dim)] text-[10px] font-bold uppercase tracking-wider mb-0.5">{t.card3_title}</p>
                  <h3 className="text-xl font-black text-emerald-500">{toArabicNumerals(totalContracts)}</h3>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <i className="ph-bold ph-check-circle text-base"></i>
                </div>
              </div>
              <span className="text-[9px] text-[var(--nc-text-dim)]">{t.card3_sub}</span>
            </SmartCard>
            <SmartCard elevation="elevated" className="p-3">
              <div className="flex items-start mb-3">
                <div className="flex-1">
                  <p className="text-[var(--nc-text-dim)] text-[10px] font-bold uppercase tracking-wider mb-0.5">{t.card4_title}</p>
                  <h3 className="text-xl font-black text-indigo-500 font-en">{formatPercentage(avgCR)}</h3>
                </div>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <i className="ph-bold ph-chart-line-up text-base"></i>
                </div>
              </div>
              <span className="text-[9px] text-[var(--nc-text-dim)]">{t.card4_sub}</span>
            </SmartCard>
          </>
        }
        actions={
          <SmartCard elevation="default" className="p-4 space-y-4 h-full flex flex-col">
            <div className="border-b border-[var(--nc-glass-border)] pb-3">
              <h4 className="nc-heading-3 flex items-center gap-2">
                <i className="ph-bold ph-ranking text-[var(--nc-accent)]"></i>
                {isArabic ? 'مؤشرات فريق المبيعات' : 'Sales Team KPIs'}
              </h4>
              <p className="text-[10px] text-[var(--nc-text-dim)] mt-1">{t.tableSub}</p>
            </div>
            <div className="space-y-3 flex-grow pt-2">
              {salesReps[0] && (
                <div className="bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] rounded-xl p-3 space-y-1">
                  <p className="text-[9px] text-[var(--nc-accent)] font-bold uppercase tracking-wide">
                    {isArabic ? 'المركز الأول' : 'Top Performer'}
                  </p>
                  <p className="text-sm font-bold text-[var(--nc-text-primary)]">{salesReps[0].name}</p>
                  <p className="text-[10px] text-[var(--nc-text-dim)]">
                    CR: <span className="font-bold text-[var(--nc-accent)] font-en">{formatPercentage(salesReps[0].conversionRate)}</span>
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="nc-card-default p-3 text-center">
                  <p className="text-[9px] text-[var(--nc-text-dim)] font-bold">{isArabic ? 'فريق المبيعات' : 'Sales Team'}</p>
                  <p className="text-xl font-black text-[var(--nc-text-primary)] font-en">{toArabicNumerals(salesReps.length)}</p>
                </div>
                <div className="nc-card-default p-3 text-center">
                  <p className="text-[9px] text-[var(--nc-text-dim)] font-bold">{isArabic ? 'إجمالي الصفقات' : 'Total Deals'}</p>
                  <p className="text-xl font-black text-[var(--nc-text-primary)] font-en">{toArabicNumerals(totalDeals)}</p>
                </div>
              </div>
            </div>
          </SmartCard>
        }
        insights={
          <SmartCard elevation="default" className="p-4 space-y-3 h-full flex flex-col">
            <div className="border-b border-[var(--nc-glass-border)] pb-3">
              <h4 className="nc-heading-3 flex items-center gap-2">
                <i className="ph-bold ph-chart-bar text-[var(--nc-accent)]"></i>
                {isArabic ? 'توزيع الأداء' : 'Performance Breakdown'}
              </h4>
            </div>
            <div className="space-y-3 flex-grow pt-1">
              {salesReps.slice(0, 5).map((rep, idx) => (
                <div key={rep.id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[var(--nc-text-primary)] truncate max-w-[60%]">{rep.name}</span>
                    <span className="text-[9px] font-bold text-[var(--nc-accent)] font-en">{formatPercentage(rep.targetAchieved)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--nc-surface-strong)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        rep.targetAchieved >= 90 ? 'bg-emerald-500' :
                        rep.targetAchieved >= 50 ? 'bg-amber-500' : 'bg-[var(--nc-accent)]'
                      }`}
                      style={{ width: `${Math.min(rep.targetAchieved, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </SmartCard>
        }
        details={
          <SmartCard className="overflow-hidden">
            <div className="p-4 border-b border-[var(--nc-glass-border)] flex justify-between items-center">
              <h4 className="nc-heading-3 flex items-center gap-2">
                <i className="ph-bold ph-medal text-amber-500"></i>
                {t.tableTitle}
              </h4>
              <span className="text-[10px] text-[var(--nc-text-dim)]">{toArabicNumerals(salesReps.length)} {isArabic ? 'مستشار' : 'consultants'}</span>
            </div>

            {salesReps.length === 0 ? (
              <div className="p-8 text-center text-[var(--nc-text-dim)] text-sm">
                {t.noData}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="nc-table">
                  <thead>
                    <tr>
                      <th className="text-center w-12">{t.tableRank}</th>
                      <th>{t.tableRep}</th>
                      <th className="text-center">{t.tableLeads}</th>
                      <th className="text-center">{t.tableResponse}</th>
                      <th className="text-center">{t.tableCr}</th>
                      <th className="text-center">{t.tableDeals}</th>
                      <th className="w-56">{t.tableTarget}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesReps.map((rep, idx) => {
                      const rank = idx + 1;
                      return (
                        <tr key={rep.id} className="nc-hover-glow cursor-pointer">
                          <td className="text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-[10px] ${
                              rank === 1 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                              rank === 2 ? 'bg-[var(--nc-surface-strong)] text-[var(--nc-text-dim)] border border-[var(--nc-glass-border)]' :
                              rank === 3 ? 'bg-[var(--nc-accent-soft)] text-[var(--nc-accent)] border border-[var(--nc-accent-border)]' :
                              'bg-[var(--nc-surface-strong)] text-[var(--nc-text-dim)]'
                            }`}>
                              {toArabicNumerals(rank)}
                            </span>
                          </td>
                          <td>
                            <p className="font-bold text-[var(--nc-text-primary)] text-xs">{rep.name}</p>
                            <span className="text-[9px] text-[var(--nc-text-dim)] block">{rep.email}</span>
                          </td>
                          <td className="text-center text-xs font-en">{toArabicNumerals(rep.leadsCount)}{t.leadSuffix}</td>
                          <td className="text-center text-xs">{toArabicNumerals(rep.responseTime)}</td>
                          <td className="text-center font-bold text-[var(--nc-accent)] font-en">{formatPercentage(rep.conversionRate)}</td>
                          <td className="text-center text-xs font-en">
                            <span className="text-amber-500 font-semibold">{toArabicNumerals(rep.bookings)}{t.bookingSuffix}</span>
                            <span className="text-[var(--nc-text-dim)] mx-1">/</span>
                            <span className="text-emerald-500 font-semibold">{toArabicNumerals(rep.contracts)}{t.contractSuffix}</span>
                          </td>
                          <td>
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[9px] text-[var(--nc-text-dim)]">
                                <span>{isArabic ? 'الإنجاز:' : 'Achieved:'}</span>
                                <span className="font-en font-bold">{formatPercentage(rep.targetAchieved)}</span>
                              </div>
                              <div className="h-1.5 w-full bg-[var(--nc-surface-strong)] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    rep.targetAchieved >= 90 ? 'bg-emerald-500' :
                                    rep.targetAchieved >= 50 ? 'bg-amber-500' : 'bg-[var(--nc-accent)]'
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
          </SmartCard>
        }
      />

    </div>
  );
}
