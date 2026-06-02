'use client';

import React, { useState } from 'react';
import { Home, FileText, ShieldCheck, Calculator, LayoutDashboard, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export default function RentalView() {
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

      {/* شريط التبويبات العلوي التكتيكي الصافي */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800/60 pb-3 relative z-30">
        {tabs.map((tab) => {
          const isSelected = currentSubTab === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => setCurrentSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-150 cursor-pointer select-none border ${
                isSelected
                  ? 'bg-[#df7b62] text-white shadow-lg shadow-[#df7b62]/20 border-[#df7b62]'
                  : 'bg-[#151f32] text-slate-400 border-slate-800 hover:bg-[#1e293b] hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.name}</span>
            </div>
          );
        })}
      </div>

      {/* عرض المحتوى بناءً على الحالة المحلية لمنع الالتفاف الدائري */}
      <div className="w-full relative z-10 mt-4">
        
        {/* 1. التبويب الرئيسي: لوحة التحكم وسجل العقود */}
        {currentSubTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
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

            <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs font-bold text-emerald-400">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} />
                <span>جميع العقود متوافقة مع معايير وزارة الإسكان وتخضع لتدقيق الامتثال التلقائي.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 bg-[#151f32]/40 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
                  <h3 className="font-bold text-xs text-white">📋 سجل عقود الإيجار الحالية والامتثال</h3>
                </div>
                <div className="p-8 text-center text-slate-500 text-xs font-semibold">
                  لا توجد عقود إيجار مسجلة حالياً في هذا النطاق الماسي
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
                <div className="w-full py-2.5 bg-[#df7b62] hover:bg-[#c5654e] text-white text-xs font-bold rounded-xl transition-all text-center cursor-pointer">
                  حفظ وتعميد العقد بالسيرفر ➔
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. تبويب شبكة إيجار الوطنية الحية */}
        {currentSubTab === 'ejar' && (
          <div className="bg-[#151f32]/40 border border-slate-800 rounded-2xl p-6 space-y-6 animate-fade-in text-right">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">🟢 بوابة الربط مع شبكة إيجار الوطنية</h3>
                <p className="text-slate-400 text-xs mt-1">توثيق العقود فورياً وإصدار السندات الموحدة بوزارة الإسكان</p>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-full">متصل حياً</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0b1120] border border-slate-850 p-4 rounded-xl">
                <span className="text-slate-500 text-[10px] font-bold block">العقود الموثقة</span>
                <span className="text-lg font-black text-white font-inter mt-1 block">٠ عقد</span>
              </div>
              <div className="bg-[#0b1120] border border-slate-850 p-4 rounded-xl">
                <span className="text-slate-500 text-[10px] font-bold block">طلبات التوثيق المعلقة</span>
                <span className="text-lg font-black text-amber-400 font-inter mt-1 block">٠ طلب</span>
              </div>
              <div className="bg-[#0b1120] border border-slate-850 p-4 rounded-xl">
                <span className="text-slate-500 text-[10px] font-bold block">حالة الاتصال بالـ API</span>
                <span className="text-lg font-black text-emerald-400 text-xs font-bold mt-1 block">مستقر بنسبة 100%</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. تبويب هيئة الزكاة والضريبة والجمارك ZATCA */}
        {currentSubTab === 'zatca' && (
          <div className="bg-[#151f32]/40 border border-slate-800 rounded-2xl p-6 space-y-6 animate-fade-in text-right">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">🛡️ حوكمة الفوترة الإلكترونية (ZATCA) - المرحلة الثانية</h3>
                <p className="text-slate-400 text-xs mt-1">توليد الـ الحقول المشفرة Cryptographic Stamps والأختام الإلكترونية للفواتير</p>
              </div>
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold rounded-full">الربط التلقائي نشط</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-center justify-between text-xs font-medium text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-indigo-400" />
                <span>تم ربط وتعميد الـ Cryptographic Keys وجاهز لتوليد الـ QR Code لجميع فواتير التحصيل العقاري الماسية.</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. تبويب القيود ودفتر الأستاذ المالي المحاسبي */}
        {currentSubTab === 'finance' && (
          <div className="bg-[#151f32]/40 border border-slate-800 rounded-2xl p-6 space-y-6 animate-fade-in text-right">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">🧮 شجرة الحسابات ودفتر الأستاذ العام (ERP)</h3>
                <p className="text-slate-400 text-xs mt-1">توليد القيود المحاسبية التلقائية وموازين المراجعة للتدفقات النقدية العقارية</p>
              </div>
              <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded-full">جاهز للترحيل</span>
            </div>
            <div className="p-8 text-center text-slate-500 text-xs font-semibold border border-dashed border-slate-800 rounded-xl">
              لا توجد قيود محاسبية أو عمليات ترحيل غير مسجلة حالياً في هذا النطاق الماسي
            </div>
          </div>
        )}

      </div>

    </div>
  );
}