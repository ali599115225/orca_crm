'use client';

import React, { useState } from 'react';
import { useApp } from '@/app/context/AppContext';

interface FinancialJournal {
  id: string;
  entryNo: string;
  type: 'RECEIPT' | 'PAYMENT' | 'JOURNAL';
  description: string;
  amount: number;
  advisorName: string;
  commission: number; // العمولة المستحقة للمستشار
  erpStatus: 'SYNCED' | 'FAILED' | 'QUEUE';
  timestamp: string;
}

export default function ErpFinanceView() {
  const { theme, lang } = useApp();
  const isDark = theme === 'dark';
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // سجل القيود المحاسبية والعمولات العقارية المؤتمتة لعام ٢٠٢٦م
  const [journals, setJournals] = useState<FinancialJournal[]>([
    { id: '1', entryNo: 'JV-2026-881', type: 'RECEIPT', description: 'دفعة مقدم حجز - فيلا حطين (وحدة رقم ٤)', amount: 50000, advisorName: 'أحمد الغامدي', commission: 1250, erpStatus: 'SYNCED', timestamp: '2026-05-29 14:20' },
    { id: '2', entryNo: 'JV-2026-882', type: 'RECEIPT', description: 'سعي إيجار تجاري - مكتب المربع ٥', amount: 12000, advisorName: 'سارة الشمري', commission: 600, erpStatus: 'SYNCED', timestamp: '2026-05-29 16:45' },
    { id: '3', entryNo: 'JV-2026-883', type: 'JOURNAL', description: 'تسوية عمولة غلق صفقة - برج العليا ٣', amount: 350000, advisorName: 'خالد المنصور', commission: 8750, erpStatus: 'QUEUE', timestamp: '2026-05-29 22:10' },
  ]);

  const toArabicNumerals = (num: string | number): string => {
    if (lang === 'EN') return num.toString();
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return num.toString().replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)]);
  };

  const handleErpSync = (id: string) => {
    setLoadingAction(id);
    setTimeout(() => {
      setJournals(prev => prev.map(j => j.id === id ? { ...j, erpStatus: 'SYNCED' } : j));
      setLoadingAction(null);
      alert(lang === 'AR' 
        ? "✅ تم ترحيل القيد وسند القبض بنجاح إلى برنامج المحاسبة المربوط عبر الـ API! الاستجابة: 201 Created." 
        : "✅ Journal entry and receipt successfully pushed to connected ERP ledger! Response: 201 Created.");
    }, 1300);
  };

  return (
    <div className="space-y-6" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .finance-neon-border {
          border: 1px solid rgba(0, 123, 255, 0.3) !important;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37), 0 0 15px rgba(0, 123, 255, 0.1) !important;
        }
        .text-gradient-finance {
          background: linear-gradient(90deg, #C0C0C0 0%, #007BFF 50%, #C0C0C0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}} />

      {/* الهيدر والمؤشر الإستراتيجي المالي */}
      <div className={`p-6 rounded-2xl border transition-all ${isDark ? 'bg-slate-950/60 backdrop-blur-xl finance-neon-border' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-gradient-finance">
              {lang === 'AR' ? "لوحة الإدارة المالية الشاملة وتكامل الـ ERP المحاسبي" : "ERP Integration & General Ledger Finance Hub"}
            </h1>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-650'}`}>
              {lang === 'AR' ? "مزامنة قيود اليومية، سندات القبض والصرف آلياً مع برامج المحاسبة المحلية، واحتساب عمولات المستشارين العقاريين حياً." : "Automate journal routing, receipts syncing with local ERP providers, and real estate consultant commission auditing live."}
            </p>
          </div>

          <div className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span>{lang === 'AR' ? "بوابة ERP: متصلة حياً" : "ERP Gateway: Connected Live"}</span>
          </div>
        </div>
      </div>

      {/* لوحة مراقبة التدفقات النقدية والعمولات المجدية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* كرت حجم الترحيل المحاسبي الإجمالي */}
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'AR' ? "إجمالي الدفعات المرحلة للـ ERP" : "Total Synced Volume to ERP"}</span>
          <div className="text-2xl font-black text-white font-inter mt-1">
            {toArabicNumerals("4.1M")} <span className="text-xs font-medium text-slate-400">{lang === 'AR' ? "ر.س" : "SAR"}</span>
          </div>
          <p className="text-[9px] text-emerald-400 mt-2 font-bold">✔ {lang === 'AR' ? "تمت المطابقة والتسوية بالكامل" : "Fully reconciled and balanced"}</p>
        </div>

        {/* مؤشر العمولات المحتسبة حياً للمستشارين */}
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'AR' ? "عمولات الفريق المستحقة" : "Calculated Team Commissions"}</span>
          <div className="text-2xl font-black text-blue-500 font-inter mt-1">
            {toArabicNumerals("106,450")} <span className="text-xs font-medium text-slate-400">{lang === 'AR' ? "ر.س" : "SAR"}</span>
          </div>
          <p className="text-[9px] text-slate-500 mt-2">{lang === 'AR' ? "تُحتسب ميكانيكياً بناءً على نسب الإغلاق المعتمدة لكل مستشار." : "Calculated based on confirmed conversion rate per consultant account."}</p>
        </div>

        {/* حالة طابور القيود المعلقة */}
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'AR' ? "قيود في قائمة الانتظار" : "Entries In Pending Queue"}</span>
          <div className="text-2xl font-black text-white font-inter mt-1">
            {toArabicNumerals(1)} <span className="text-xs font-medium text-slate-400">{lang === 'AR' ? "قيد معلق" : "Pending Entry"}</span>
          </div>
          <p className="text-[9px] text-amber-400 mt-2 font-bold animate-pulse">⚡ {lang === 'AR' ? "ينتظر الدفع النهائي لترحيل القيد" : "Awaiting final escrow settlement for transmission"}</p>
        </div>

      </div>

      {/* جدول القيود وسندات القبض حياً (Live General Ledger Subsystem) */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="p-4 border-b border-slate-800 bg-slate-900/20">
          <h3 className="font-bold text-xs text-white">{lang === 'AR' ? "سجل حركة قيود الحسابات العقارية والترحيل المالي" : "Real Estate Accounting Ledger & ERP Status"}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-extrabold ${isDark ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600'} ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
                <th className="px-5 py-3">{lang === 'AR' ? "رقم القيد" : "Entry No."}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "البيان والشرح المحاسبي" : "Description / Allocation"}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "قيمة السند" : "Transaction Amount"}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "المستشار العقاري" : "Real Estate Advisor"}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "عمولة المبيعات" : "Commission"}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "حالة ربط الـ ERP" : "ERP Sync Status"}</th>
                <th className="px-5 py-3 text-center">{lang === 'AR' ? "إجراءات الترحيل" : "Accounting Override"}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
              {journals.map((journ) => (
                <tr key={journ.id} className={`transition-colors ${isDark ? 'hover:bg-slate-900/20 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <td className="px-5 py-4 font-black text-white font-inter">{journ.entryNo}</td>
                  <td className="px-4 py-4 font-medium text-slate-400">{journ.description}</td>
                  <td className="px-4 py-4 font-black font-inter text-white">{toArabicNumerals(journ.amount.toLocaleString())} ر.س</td>
                  <td className="px-4 py-4 font-bold">{journ.advisorName}</td>
                  <td className="px-4 py-4 font-black font-inter text-blue-400">{toArabicNumerals(journ.commission.toLocaleString())} ر.س</td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-black border ${
                      journ.erpStatus === 'SYNCED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      journ.erpStatus === 'QUEUE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                      'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {journ.erpStatus === 'SYNCED' ? (lang === 'AR' ? "✔ تم الترحيل والمطابقة" : "✔ Synced") :
                       journ.erpStatus === 'QUEUE' ? (lang === 'AR' ? "⚡ في الانتظار..." : "⚡ In Queue...") :
                       (lang === 'AR' ? "❌ فشل الترحيل" : "❌ Sync Failed")}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => handleErpSync(journ.id)}
                      disabled={loadingAction !== null || journ.erpStatus === 'SYNCED'}
                      className={`text-[10px] font-black px-3 py-1 rounded-lg border transition-all ${
                        journ.erpStatus === 'SYNCED'
                          ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                          : 'bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border-blue-500/20 cursor-pointer'
                      }`}
                    >
                      {loadingAction === journ.id ? (lang === 'AR' ? "جاري الترحيل..." : "Syncing...") : (lang === 'AR' ? "رحّل الآن ➔" : "Push to ERP ➔")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
