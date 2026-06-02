'use client';

import React, { useState } from 'react';
import { useApp } from '@/app/context/AppContext';

interface InvoiceLog {
  id: string;
  invoiceNo: string;
  client: string;
  amount: number;
  tax: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  timestamp: string;
  xmlUrl?: string;
}

export default function ZatkaView() {
  const { theme, lang } = useApp();
  const isDark = theme === 'dark';
  
  // محاكاة حالة الاتصال ببيئة الـ Sandbox الحكومية
  const [isCcsidConnected, setIsCcsidConnected] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);

  // سجل فواتير المبيعات والدفعات العقارية الممررة للهيئة
  const [invoices, setInvoices] = useState<InvoiceLog[]>([
    { id: '1', invoiceNo: 'INV-2026-001', client: 'شركة الرمال العقارية', amount: 150000, tax: 22500, status: 'SUCCESS', timestamp: '2026-05-29 10:14' },
    { id: '2', invoiceNo: 'INV-2026-002', client: 'خالد عبد الله منصور', amount: 45000, tax: 6750, status: 'SUCCESS', timestamp: '2026-05-29 11:30' },
    { id: '3', invoiceNo: 'INV-2026-003', client: 'مؤسسة أوتاد الرياض', amount: 320000, tax: 48000, status: 'PENDING', timestamp: '2026-05-29 23:40' },
  ]);

  const toArabicNumerals = (num: string | number): string => {
    if (lang === 'EN') return num.toString();
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return num.toString().replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)]);
  };

  const handleSyncTest = () => {
    setLoadingAction(true);
    setTimeout(() => {
      setLoadingAction(false);
      alert(lang === 'AR' ? "🎯 استجابة الـ API من سيرفر ZATKA: 200 OK. تم التحقق من سلامة تشفير الـ XML!" : "🎯 API Response from ZATKA: 200 OK. XML cryptographic stamp verified!");
    }, 1200);
  };

  return (
    <div className="space-y-6" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      {/* وتد الحماية والـ CSS المخصص */}
      <style dangerouslySetInnerHTML={{ __html: `
        .zatka-neon-border {
          border: 1px solid rgba(0, 123, 255, 0.3) !important;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37), 0 0 15px rgba(0, 123, 255, 0.1) !important;
        }
        .text-gradient-metallic {
          background: linear-gradient(90deg, #C0C0C0 0%, #007BFF 50%, #C0C0C0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}} />

      {/* الهيدر والمؤشر الحيوي للنظام */}
      <div className={`p-6 rounded-2xl border transition-all ${isDark ? 'bg-slate-950/60 backdrop-blur-xl zatka-neon-border' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-gradient-metallic">
              {lang === 'AR' ? "بوابة الفوترة الإلكترونية الممتثلة — هيئة الزكاة والضريبة والجمارك (ZATKA)" : "Compliant E-Invoicing Gateway — ZATKA Connector"}
            </h1>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {lang === 'AR' ? "إدارة التشفير السيبراني للفواتير، توليد طوابع XML، ومراقبة النبض الحي مع بيئة الربط والتكامل الفيدرالية لعام ٢٠٢٦م." : "Cryptographic invoice stamping, XML generation, and live pulse monitoring with ZATKA Phase 2 integration for 2026."}
            </p>
          </div>

          {/* شارة حالة الربط الحكومي */}
          <div className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 ${
            isCcsidConnected 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isCcsidConnected ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
            <span>{isCcsidConnected ? (lang === 'AR' ? "مصلحة الربط: نشطة (200 OK)" : "Connection: Active (200 OK)") : (lang === 'AR' ? "فشل الاتصال" : "Connection Failed")}</span>
          </div>
        </div>
      </div>

      {/* شبكة البيانات ومؤشرات الأداء المالي الرقمي */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* كرت توليد فواتير الـ XML المشفرة */}
        <div className={`p-6 rounded-2xl border flex flex-col justify-between ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="space-y-2">
            <h3 className={`text-xs font-black ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>{lang === 'AR' ? "🔧 فحص توازن البيئة التجريبية" : "🔧 Sandbox Compliance Check"}</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {lang === 'AR' ? "قم بإجراء اختبار دوري لإرسال عينة هيكلية من الشيفرة البرمجية للفاتورة ومطابقتها مع خوادم الهيئة الفيدرالية." : "Run periodic structural schema validation to check invoice arrays alignment against government endpoints."}
            </p>
          </div>
          <button
            onClick={handleSyncTest}
            disabled={loadingAction}
            className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-[0_4px_12px_rgba(0,123,255,0.25)]"
          >
            {loadingAction ? (lang === 'AR' ? "جاري التمرير والمطابقة..." : "Validating...") : (lang === 'AR' ? "إرسال نبضة فحص (Test API)" : "Send Test Pulse (API)")}
          </button>
        </div>

        {/* مؤشر الفواتير الناجحة الإجمالي */}
        <div className={`p-6 rounded-2xl border flex flex-col justify-between ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'AR' ? "إجمالي الفواتير المعتمدة" : "Total Approved Invoices"}</span>
            <div className="text-3xl font-black text-white font-inter mt-1">
              {toArabicNumerals("1,482")} <span className="text-xs font-medium text-slate-400">{lang === 'AR' ? "فاتورة" : "Invoices"}</span>
            </div>
          </div>
          <div className="text-[10px] text-emerald-400 font-bold mt-2 flex items-center gap-1">
            <span>↑ %٩٩.٨</span>
            <span className="text-slate-500 font-medium">{lang === 'AR' ? "نسبة نجاح الامتثال الضريبي" : "Tax compliance success rate"}</span>
          </div>
        </div>

        {/* مؤشر القيمة المضافة المعلقة */}
        <div className={`p-6 rounded-2xl border flex flex-col justify-between ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'AR' ? "ضريبة القيمة المضافة المحتسبة (VAT)" : "Calculated VAT (15%)"}</span>
            <div className="text-3xl font-black text-blue-500 font-inter mt-1">
              {toArabicNumerals("29,235")} <span className="text-xs font-medium text-slate-400">{lang === 'AR' ? "ر.س" : "SAR"}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            {lang === 'AR' ? "يتم ترحيلها ميكانيكياً إلى القيود المحاسبية لنظام الـ ERP المربوط حياً." : "Automatically routed to connected ERP general ledger accounting books."}
          </p>
        </div>

      </div>

      {/* جدول مراقبة تدفق سجل الفواتير الحية (Live Compliance Invoice Ledger) */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="p-4 border-b border-slate-800 bg-slate-900/20">
          <h3 className="font-bold text-xs text-white">{lang === 'AR' ? "سجل الامتثال والترحيل الفوري لفواتير المبيعات والدفعات" : "Live Compliance & Transmission Ledger"}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-extrabold ${isDark ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600'} ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
                <th className="px-5 py-3">{lang === 'AR' ? "الرقم التسلسلي للفاتورة الإلكترونية" : "Invoice No."}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "المستفيد / المنشأة" : "Client / entity"}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "صافي المبلغ" : "Net Amount"}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "الضريبة المضافة (١٥٪)" : "VAT (15%)"}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "حالة الاعتماد في ZATKA" : "ZATKA State"}</th>
                <th className="px-5 py-3">{lang === 'AR' ? "التوقيت" : "Timestamp"}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
              {invoices.map((inv) => (
                <tr key={inv.id} className={`transition-colors ${isDark ? 'hover:bg-slate-900/20 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <td className="px-5 py-4 font-black text-white font-inter">{inv.invoiceNo}</td>
                  <td className="px-4 py-4 font-bold">{inv.client}</td>
                  <td className="px-4 py-4 font-bold font-inter">{toArabicNumerals(inv.amount.toLocaleString())} ر.س</td>
                  <td className="px-4 py-4 font-semibold text-blue-400 font-inter">{toArabicNumerals(inv.tax.toLocaleString())} ر.س</td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-black border ${
                      inv.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      inv.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                      'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {inv.status === 'SUCCESS' ? (lang === 'AR' ? "✔ معتمدة وموقعة" : "✔ Stamped") :
                       inv.status === 'PENDING' ? (lang === 'AR' ? "⚡ جاري الترحيل..." : "⚡ Transmitting...") :
                       (lang === 'AR' ? "❌ مرفوضة" : "❌ Rejected")}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-400 text-[10px] font-inter">{toArabicNumerals(inv.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
