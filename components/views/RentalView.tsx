'use client';

import React, { useState } from 'react';
import EjarView from './EjarView';
import ZatcaView from './ZatcaView';
import ErpFinanceView from './ErpFinanceView';
import { Home, FileText, ShieldCheck, Calculator, LayoutDashboard, AlertCircle } from 'lucide-react';

export default function RentalView() {
  // استخدام التبديل المحلي الصارم لكسر جمود الأزرار
  const [currentSubTab, setCurrentSubTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'عقود الإيجار والتحصيل', icon: <LayoutDashboard size={16} /> },
    { id: 'ejar', name: 'توثيق شبكة إيجار الوطنية', icon: <FileText size={16} /> },
    { id: 'zatca', name: 'بوابة الزكاة والضريبة (ZATCA)', icon: <ShieldCheck size={16} /> },
    { id: 'finance', name: 'القيود ودفتر الأستاذ', icon: <Calculator size={16} /> },
  ];

  return (
    <div className="w-full min-h-screen text-slate-100 space-y-6" dir="rtl">
      
      {/* هيدر الصفحة */}
      <div className="flex flex-col space-y-2 pb-2">
        <div className="flex items-center gap-2 text-[#df7b62] text-[11px] font-black uppercase tracking-wider bg-[#df7b62]/10 border border-[#df7b62]/20 px-2.5 py-1 rounded-full w-fit">
          <Home size={12} /> الامتثال والتحصيل المالي العقاري
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white">بوابة حوكمة الإيجارات والامتثال المالي (ERP)</h1>
          <p className="text-slate-400 text-xs mt-1">تتبع عقود الإيجار، التدفقات النقدية، وفحص مطابقة المعايير المحاسبية مع ربط الفاتورة الإلكترونية ZATKA</p>
        </div>
      </div>

      {/* شريط التبويبات العلوي - مع فك الارتباط التام لمنع التجمد */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800/60 pb-3 relative z-30">
        {tabs.map((tab) => {
          const isSelected = currentSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setCurrentSubTab(tab.id);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-150 cursor-pointer select-none border ${
                isSelected
                  ? 'bg-[#df7b62] text-white shadow-lg shadow-[#df7b62]/20 border-[#df7b62]'
                  : 'bg-[#151f32] text-slate-400 border-slate-800 hover:bg-[#1e293b] hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.name}</span>
            </button>
          );
        ))}
      </div>

      {/* عرض المحتوى التكتيكي بناءً على الحالة المحلية المحدثة */}
      <div className="w-full relative z-10 mt-4">
        {currentSubTab === 'dashboard' && (
          <div className="space-y-6">
            {/* كروت المؤشرات الحية */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#151f32] border border-slate-800 p-4 rounded-2xl flex flex-col justify-between h-24">
                <span className="text-slate-400 text-[10px] font-black tracking-wider">عقود الإيجار النشطة</span>
                <span className="text-2xl font-black text-white text-left font-inter">٣٤</span>
              </div>
              <div className="bg-[#151f32] border border-slate-800 p-4 rounded-2xl flex flex-col justify-between h-24">
                <span className="text-slate-400 text-[10px] font-black tracking-wider">إجمالي المحصل</span>
                <span className="text-2xl font-black text-emerald-400 text-left font-inter">٠ ر.س</span>
              </div>
              <div className="bg-[#151f32] border border-slate-800 p-4 rounded-2xl flex flex-col justify-between h-24">
                <span className="text-slate-400 text-[10px] font-black tracking-wider">المستحقات المتأخرة</span>
                <span className="text-2xl font-black text-amber-500 text-left font-inter">٠ ر.س</span>
              </div>
              <div className="bg-[#151f32] border border-slate-800 p-4 rounded-2xl flex flex-col justify-between h-24">
                <span className="text-slate-400 text-[10px] font-black tracking-wider">معدل الامتثال الضريبي</span>
                <span className="text-2xl font-black text-indigo-400 text-left font-inter">٩٨٪</span>
              </div>
            </div>

            {/* شريط الإقرار والتحصين */}
            <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs font-bold text-emerald-400">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} />
                <span>جميع العقود متوافقة مع معايير وزارة الإسكان والتطوير الحضري وتخضع لتدقيق الامتثال التلقائي.</span>
              </div>
            </div>

            {/* سجل العمل وبناء العقود */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 bg-[#151f32]/40 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
                  <h3 className="font-bold text-xs text-white">📋 سجل عقود الإيجار الحالية والامتثال</h3>
                </div>
                <div className="p-8 text-center text-slate-500 text-xs font-semibold">
                  لا توجد عقود إيجار مسجلة حالياً في هذا النطاق
                </div>
              </div>

              <div className="lg:col-span-5 bg-[#151f32]/40 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-white font-bold text-xs border-b border-slate-800 pb-2.5 flex items-center gap-2">
                  إنشاء عقد إيجار جديد في النظام
                </h3>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <label className="block text-slate-400 mb-1">رقم الوحدة العقارية *</label>
                    <input type="text" placeholder="e.g. A-501" className="w-full bg-[#0b1120] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">اسم المستأجر الكامل *</label>
                    <input type="text" placeholder="محمد العتيبي" className="w-full bg-[#0b1120] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none" />
                  </div>
                </div>
                <button type="button" className="w-full py-2.5 bg-[#df7b62] hover:bg-[#c5654e] text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
                  حفظ وتعميد العقد بالسيرفر ➔
                </button>
              </div>
            </div>
          </div>
        )}

        {/* فك الحظر الاستدعائي للواجهات الفرعية بشكل معزول ومباشر */}
        {currentSubTab === 'ejar' && <div className="w-full block text-right"><EjarView /></div>}
        {currentSubTab === 'zatca' && <div className="w-full block text-right"><ZatcaView /></div>}
        {currentSubTab === 'finance' && <div className="w-full block text-right"><ErpFinanceView /></div>}
      </div>

    </div>
  );
}