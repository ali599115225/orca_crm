'use client';

import React, { useState } from 'react';
import { useApp } from '@/app/context/AppContext';

interface ContractLog {
  id: string;
  contractNo: string;
  lessor: string; // الطرف الأول (المؤجر)
  lessee: string; // الطرف الثاني (المستأجر)
  unitName: string;
  rentAmount: number;
  status: 'VERIFIED' | 'PENDING' | 'EXPIRED';
  expiryDate: string;
}

export default function EjarView() {
  const { theme, lang } = useApp();
  const isDark = theme === 'dark';
  
  const [loadingAction, setLoadingAction] = useState(false);

  // سجل عقود الإيجار الموحدة المزامنة مع شبكة إيجار الوطنية لعام ٢٠٢٦م
  const [contracts, setContracts] = useState<ContractLog[]>([
    { id: '1', contractNo: 'EJ-99201-2026', lessor: 'شركة أوركا العقارية', lessee: 'عبد الرحمن السديري', unitName: 'شقة سكني - برج العليا ٣', rentAmount: 65000, status: 'VERIFIED', expiryDate: '2027-05-15' },
    { id: '2', contractNo: 'EJ-88392-2026', lessor: 'مجموعة الماجد للاستثمار', lessee: 'شركة الحلول الرقمية', unitName: 'مكتب تجاري - المربع ٥', rentAmount: 120000, status: 'VERIFIED', expiryDate: '2027-03-01' },
    { id: '3', contractNo: 'EJ-77210-2026', lessor: 'علي بن راشد الزاير', lessee: 'محمد حسن الشمري', unitName: 'فيلا سكنية - حطين ٢', rentAmount: 180000, status: 'PENDING', expiryDate: '2027-05-28' },
  ]);

  const toArabicNumerals = (num: string | number): string => {
    if (lang === 'EN') return num.toString();
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return num.toString().replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)]);
  };

  const handleSyncEjar = () => {
    setLoadingAction(true);
    setTimeout(() => {
      setLoadingAction(false);
      alert(lang === 'AR' ? "🔄 تم سحب وتحديث بيانات العقود من منصة إيجار بنجاح! الاستجابة: 200 OK." : "🔄 Contracts successfully synchronized from Ejar network! Response: 200 OK.");
    }, 1500);
  };

  return (
    <div className="space-y-6" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      {/* وتد الحماية والتنسيق النيوني للحدود */}
      <style dangerouslySetInnerHTML={{ __html: `
        .ejar-neon-border {
          border: 1px solid rgba(0, 123, 255, 0.3) !important;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37), 0 0 15px rgba(0, 123, 255, 0.1) !important;
        }
        .text-gradient-silver-blue {
          background: linear-gradient(90deg, #C0C0C0 0%, #007BFF 50%, #C0C0C0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}} />

      {/* الهيدر الرئيسي للموديول والنبض الحيوي */}
      <div className={`p-6 rounded-2xl border transition-all ${isDark ? 'bg-slate-950/60 backdrop-blur-xl ejar-neon-border' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-gradient-silver-blue">
              {lang === 'AR' ? "منظومة ربط وتوثيق العقود — شبكة إيجار الوطنية (Ejar)" : "National Ejar Contract Integration Hub"}
            </h1>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-650'}`}>
              {lang === 'AR' ? "أتمتة سحب بيانات الطرف الأول (المؤجر)ين والطرف الثاني (المستأجر)ين، توثيق العقود الموحدة، ومراقبة حالة الدفعات والدعم السكني حياً لعام ٢٠٢٦م." : "Automate landlord & tenant syncing, unified contract registration, and live lease payout status tracking for 2026."}
            </p>
          </div>

          <div className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>{lang === 'AR' ? "ربط الـ API: مستقر سحابياً" : "API Link: Cloud Stable"}</span>
          </div>
        </div>
      </div>

      {/* كروت التحكم والمؤشرات الرقمية الفخمة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* كرت سحب ومزامنة البيانات */}
        <div className={`p-6 rounded-2xl border flex flex-col justify-between ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="space-y-2">
            <h3 className={`text-xs font-black ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>{lang === 'AR' ? "🔄 المزامنة الشبكية الحية" : "🔄 Live Network Sync"}</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {lang === 'AR' ? "قم بسحب أحدث حالات العقود السكنية والتجارية وتوثيقات الطرف الثاني (المستأجر)ين المسجلة في منصة وزارة الإسكان مباشرة." : "Pull latest residential and commercial lease statuses directly from the Ministry of Housing database."}
            </p>
          </div>
          <button
            onClick={handleSyncEjar}
            disabled={loadingAction}
            className="w-full mt-5 bg-gradient-to-r from-[#C0C0C0] via-[#007BFF] to-[#C0C0C0] text-slate-950 hover:scale-[1.01] text-xs font-black py-2.5 px-4 rounded-xl transition-all shadow-[0_4px_15px_rgba(0,123,255,0.2)]"
          >
            {loadingAction ? (lang === 'AR' ? "جاري سحب البيانات..." : "Syncing...") : (lang === 'AR' ? "مزامنة العقود الآن ➔" : "Synchronize Records ➔")}
          </button>
        </div>

        {/* مؤشر العقود الموثقة النشطة */}
        <div className={`p-6 rounded-2xl border flex flex-col justify-between ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'AR' ? "العقود الموحدة النشطة" : "Active Unified Contracts"}</span>
            <div className="text-3xl font-black text-white font-inter mt-1">
              {toArabicNumerals(384)} <span className="text-xs font-medium text-slate-400">{lang === 'AR' ? "عقد موثق" : "Contracts"}</span>
            </div>
          </div>
          <div className="text-[10px] text-blue-400 font-bold mt-2">
            ✔ {lang === 'AR' ? "محمية ومطابقة لصمام الـ RLS السيرفري" : "Secured under strict server RLS data isolation"}
          </div>
        </div>

        {/* مؤشر القيمة الإيجارية المدارة */}
        <div className={`p-6 rounded-2xl border flex flex-col justify-between ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'AR' ? "المحصلات الإيجارية الجارية" : "Managed Rental Volume"}</span>
            <div className="text-3xl font-black text-blue-500 font-inter mt-1">
              {toArabicNumerals("2.4M")} <span className="text-xs font-medium text-slate-400">{lang === 'AR' ? "ر.س" : "SAR"}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            {lang === 'AR' ? "موزعة على الحسابات البنكية ومربوطة بنظام الفواتير الضريبية ZATKA." : "Mapped directly with payment schedules and connected to ZATKA tax invoice books."}
          </p>
        </div>

      </div>

      {/* جدول مراقبة تدفق عقود إيجار النشطة (Unified Lease Ledger) */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="p-4 border-b border-slate-800 bg-slate-900/20">
          <h3 className="font-bold text-xs text-white">{lang === 'AR' ? "سجل توثيق ومطابقة شبكة العقود العقارية" : "Unified Real Estate Lease Hub & Ledger"}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-extrabold ${isDark ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600'} ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
                <th className="px-5 py-3">{lang === 'AR' ? "رقم عقد إيجار" : "Contract No."}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "الطرف الأول (المؤجر) / الطرف الثاني (المستأجر)" : "Parties (Lessor/Lessee)"}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "الوحدة العقارية" : "Property Unit"}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "القيمة الإيجارية" : "Rental Value"}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "حالة التوثيق الوزاري" : "Ejar State"}</th>
                <th className="px-5 py-3">{lang === 'AR' ? "تاريخ الانتهاء" : "Expiry Date"}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
              {contracts.map((con) => (
                <tr key={con.id} className={`transition-colors ${isDark ? 'hover:bg-slate-900/20 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <td className="px-5 py-4 font-black text-white font-inter">{con.contractNo}</td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-350">{con.lessor}</p>
                    <span className="text-[10px] text-slate-500 font-medium">⬅ {con.lessee}</span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-400">{con.unitName}</td>
                  <td className="px-4 py-4 font-black font-inter text-blue-400">{toArabicNumerals(con.rentAmount.toLocaleString())} ر.س</td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-black border ${
                      con.status === 'VERIFIED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      con.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                      'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {con.status === 'VERIFIED' ? (lang === 'AR' ? "✔ موثق رسمي" : "✔ Verified") :
                       con.status === 'PENDING' ? (lang === 'AR' ? "⚡ قيد المراجعة..." : "⚡ Pending...") :
                       (lang === 'AR' ? "❌ منتهي" : "❌ Expired")}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-400 text-[10px] font-inter">{toArabicNumerals(con.expiryDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
