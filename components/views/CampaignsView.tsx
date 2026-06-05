'use client';

import React, { useState } from 'react';
import { useApp } from '@/app/context/AppContext';

interface CampaignMetrics {
  id: string;
  name: string;
  platform: 'EMAIL' | 'SNAPCHAT' | 'X';
  leadsGenerated: number;
  spend: number;
  cpl: number; // التكلفة لكل عميل محتمل
  roi: string; // العائد على الاستثمار الإعلاني
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
}

export default function CampaignsView() {
  const { theme, lang } = useApp();
  const isDark = theme === 'dark';
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // سجل الحملات التسويقية النشطة للمشاريع العقارية لعام ٢٠٢٦م
  const [campaigns, setCampaigns] = useState<CampaignMetrics[]>([
    { id: '1', name: 'إطلاق مخطط نرجس الرياض - بريد إلكتروني', platform: 'EMAIL', leadsGenerated: 450, spend: 1200, cpl: 2.6, roi: '450%', status: 'ACTIVE' },
    { id: '2', name: 'حملة فلل حطين الفاخرة - سناب شات', platform: 'SNAPCHAT', leadsGenerated: 890, spend: 15000, cpl: 16.8, roi: '320%', status: 'ACTIVE' },
    { id: '3', name: 'أبراج المربع الاستثمارية - منصة X', platform: 'X', leadsGenerated: 310, spend: 9500, cpl: 30.6, roi: '280%', status: 'PAUSED' },
  ]);

  const toArabicNumerals = (num: string | number): string => {
    if (lang === 'EN') return num.toString();
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return num.toString().replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)]);
  };

  const handleOptimize = (id: string) => {
    setLoadingAction(id);
    setTimeout(() => {
      setLoadingAction(null);
      alert(lang === 'AR' 
        ? "🤖 قام الوكيل ساهر بتحليل الحشود الإعلانية وإعادة توزيع الميزانية لخفض تكلفة العميل (CPL)!" 
        : "🤖 AI Agent Saher optimized ad sets audience data to minimize Cost Per Lead!");
    }, 1200);
  };

  return (
    <div className="space-y-6" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .campaign-neon-border {
          border: 1px solid rgba(0, 123, 255, 0.3) !important;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37), 0 0 15px rgba(0, 123, 255, 0.1) !important;
        }
        .text-gradient-neon {
          background: linear-gradient(90deg, #C0C0C0 0%, #007BFF 50%, #C0C0C0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}} />

      {/* الهيدر والمؤشر الإستراتيجي */}
      <div className={`p-6 rounded-2xl border transition-all ${isDark ? 'bg-[#1C2B48]/60 backdrop-blur-xl campaign-neon-border' : 'bg-white border-[#A7C7E7]/20 shadow-sm'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-gradient-neon">
              {lang === 'AR' ? "مركز الحملات التسويقية المتكامل — Omni-Channel Marketing" : "AI Omni-Channel Campaign Matrix"}
            </h1>
            <p className={`text-xs mt-1 ${isDark ? 'text-[#C4D8E5] font-medium' : 'text-[#C4D8E5] font-medium'}`}>
              {lang === 'AR' ? "مراقبة وإدارة حملات البريد الإلكتروني، إعلانات Snapchat، ومنصة X حياً، مع احتساب العائد المالي الفوري لكل قناة." : "Monitor and scale automated Email blasts, Snapchat Ads, and X Campaigns with live CPL and ROI matrix tracking."}
            </p>
          </div>

          <div className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white font-inter flex items-center gap-2 shadow-[0_0_15px_rgba(0,123,255,0.3)]">
            <span>{lang === 'AR' ? "الوكيل ساهر التسويقي: نشط 🤖" : "AI Marketing Copilot: Active 🤖"}</span>
          </div>
        </div>
      </div>

      {/* لوحة المؤشرات الرقمية الحادة للأداء التسويقي المجدّي */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* إحصائيات البريد الإلكتروني العائد الفخم */}
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#1C2B48]/30 border-[#A7C7E7]/20' : 'bg-slate-50 border-[#A7C7E7]/20'}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-[#C4D8E5] font-medium font-bold uppercase tracking-wider">{lang === 'AR' ? "📨 النشرات والبريد الإلكتروني" : "📨 Email Blast Engine"}</span>
            <span className="bg-blue-500/10 text-blue-400 text-[9px] font-black px-2 py-0.5 rounded border border-blue-500/20">ROI 450%</span>
          </div>
          <div className="text-2xl font-black text-white font-inter">
            {toArabicNumerals("94.2%")} <span className="text-xs font-medium text-[#C4D8E5] font-medium">{lang === 'AR' ? "معدل تسليم" : "Delivery Rate"}</span>
          </div>
          <p className="text-[9px] text-[#C4D8E5] font-medium mt-1.5">{lang === 'AR' ? "تكلفة شبه معدومة مع أعلى استهداف للمستثمرين العقاريين." : "Near-zero overhead with pinpoint institutional real estate investor targets."}</p>
        </div>

        {/* إحصائيات سناب شات العملاء المباشرين */}
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#1C2B48]/30 border-[#A7C7E7]/20' : 'bg-slate-50 border-[#A7C7E7]/20'}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-[#C4D8E5] font-medium font-bold uppercase tracking-wider">{lang === 'AR' ? "👻 إعلانات Snapchat Ads" : "👻 Snapchat Pixel"}</span>
            <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded border border-emerald-500/20">CPL {toArabicNumerals("16.8")} ر.س</span>
          </div>
          <div className="text-2xl font-black text-white font-inter">
            {toArabicNumerals(890)} <span className="text-xs font-medium text-[#C4D8E5] font-medium">{lang === 'AR' ? "عميل محتمل" : "Leads Generated"}</span>
          </div>
          <p className="text-[9px] text-[#C4D8E5] font-medium mt-1.5">{lang === 'AR' ? "القناة الأسرع لجمع بيانات المهتمين بالشراء السكني في المملكة." : "Fastest channel for capturing high-intent residential buyers in KSA."}</p>
        </div>

        {/* إحصائيات منصة إكس النخبة الاستثمارية */}
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#1C2B48]/30 border-[#A7C7E7]/20' : 'bg-slate-50 border-[#A7C7E7]/20'}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-[#C4D8E5] font-medium font-bold uppercase tracking-wider">{lang === 'AR' ? "𝕏 إعلانات منصة X" : "𝕏 X Premium Ads"}</span>
            <span className="bg-purple-500/10 text-purple-400 text-[9px] font-black px-2 py-0.5 rounded border border-purple-500/20">ROI 280%</span>
          </div>
          <div className="text-2xl font-black text-blue-500 font-inter">
            {toArabicNumerals(310)} <span className="text-xs font-medium text-[#C4D8E5] font-medium">{lang === 'AR' ? "مستثمر نخبة" : "Elite Investors"}</span>
          </div>
          <p className="text-[9px] text-[#C4D8E5] font-medium mt-1.5">{lang === 'AR' ? "مثالي لاستهداف صفقات الأراضي الاستثمارية والمكاتب التجارية." : "Ideal for capturing commercial buyers and premium scale property deals."}</p>
        </div>

      </div>

      {/* جدول الفرز والمراقبة للأداء الإعلاني الجاري */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1C2B48]/40 border-[#A7C7E7]/20' : 'bg-white border-[#A7C7E7]/20 shadow-sm'}`}>
        <div className="p-4 border-b border-[#A7C7E7]/20 bg-[#1C2B48]/20">
          <h3 className="font-bold text-xs text-white">{lang === 'AR' ? "لوحة تحليل كفاءة الميزانيات والعائد الرقمي" : "Cross-Platform Performance & Spend Matrix"}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-extrabold ${isDark ? 'bg-[#1C2B48]/80 text-[#C4D8E5] font-medium border-[#A7C7E7]/20' : 'bg-slate-50 text-[#C4D8E5] font-medium'} ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
                <th className="px-5 py-3">{lang === 'AR' ? "اسم الحملة" : "Campaign Name"}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "المنصة" : "Platform"}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "العملاء المجلوبين" : "Leads"}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "الميزانية المصروفة" : "Total Spend"}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "تكلفة العميل (CPL)" : "CPL"}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "عائد الاستثمار (ROI)" : "Ad ROI"}</th>
                <th className="px-4 py-3">{lang === 'AR' ? "حالة التدفق" : "State"}</th>
                <th className="px-5 py-3 text-center">{lang === 'AR' ? "أتمتة الذكاء الاصطناعي" : "AI Actions"}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
              {campaigns.map((camp) => (
                <tr key={camp.id} className={`transition-colors ${isDark ? 'hover:bg-[#1C2B48]/20 text-[#C4D8E5] font-medium' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <td className="px-5 py-4 font-bold text-white">{camp.name}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                      camp.platform === 'EMAIL' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      camp.platform === 'SNAPCHAT' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                      'bg-[#1C2B48] text-[#C4D8E5] font-medium border border-slate-700'
                    }`}>
                      {camp.platform}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-bold font-inter">{toArabicNumerals(camp.leadsGenerated)}</td>
                  <td className="px-4 py-4 font-semibold font-inter">{toArabicNumerals(camp.spend.toLocaleString())} ر.س</td>
                  <td className="px-4 py-4 font-bold text-amber-500 font-inter">{toArabicNumerals(camp.cpl)} ر.س</td>
                  <td className="px-4 py-4 font-black text-emerald-400 font-inter">{camp.roi}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      camp.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      camp.status === 'PAUSED' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' :
                      'bg-blue-500/10 text-blue-400'
                    }`}>
                      {camp.status === 'ACTIVE' ? (lang === 'AR' ? "نشطة حالياً" : "Active") : (lang === 'AR' ? "موقوفة مؤقتاً" : "Paused")}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => handleOptimize(camp.id)}
                      disabled={loadingAction !== null}
                      className="text-[10px] font-black px-3 py-1 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg border border-blue-500/20 transition-all cursor-pointer"
                    >
                      {loadingAction === camp.id ? (lang === 'AR' ? "جاري التحسين..." : "Optimizing...") : (lang === 'AR' ? "⚡ تحسين ذكي" : "⚡ Optimize")}
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
