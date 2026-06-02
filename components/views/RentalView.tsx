'use client';

import React, { useState } from 'react';
import EjarView from './EjarView';
import ZatcaView from './ZatcaView';
import ErpFinanceView from './ErpFinanceView';
import { Home, FileText, ShieldCheck, Calculator, LayoutDashboard, AlertCircle } from 'lucide-react';

export default function RentalView() {
  // تفعيل تبديل الحالة وضبط القيمة الافتراضية للوحة التحكم
  const [activeTab, setActiveTab] = useState('dashboard');

  // مصفوفة التبويبات الموحدة المعرفات المتطابقة تماماً مع شروط العرض السفلي
  const tabs = [
    { id: 'dashboard', name: 'عقود الإيجار والتحصيل', icon: <LayoutDashboard size={16} /> },
    { id: 'ejar', name: 'توثيق شبكة إيجار الوطنية', icon: <FileText size={16} /> },
    { id: 'zatca', name: 'بوابة الزكاة والضريبة (ZATCA)', icon: <ShieldCheck size={16} /> },
    { id: 'finance', name: 'القيود ودفتر الأستاذ', icon: <Calculator size={16} /> },
  ];

  return (
    <div className="w-full h-full text-slate-100 space-y-6" dir="rtl">
      
      {/* هيدر الصفحة الاستراتيجي */}
      <div className="flex flex-col space-y-2 pb-2">
        <div className="flex items-center gap-2 text-[#df7b62] text-[11px] font-black uppercase tracking-wider bg-[#df7b62]/10 border border-[#df7b62]/20 px-2.5 py-1 rounded-full w-fit">
          <Home size={12} /> الامتثال والتحصيل المالي
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white">بوابة حوكمة الإيجارات والامتثال المالي (ERP)</h1>
            <p className="text-slate-400 text-xs mt-1">تتبع عقود الإيجار، التدفقات النقدية، وفحص مطابقة المعايير المحاسبية مع ربط الفاتورة الإلكترونية ZATKA</p>
          </div>
        </div>
      </div>

      {/* شريط التبويبات العلوي التكتيكي المحسن التفعيل */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800/60 pb-3 relative z-20">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab(tab.id);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer select-none border ${
                isSelected
                  ? 'bg-[#df7b62] text-white shadow-lg shadow-[#df7b62]/20 border-[#df7b62]'
                  : 'bg-[#151f32] text-slate-450 border-slate-800 hover:bg-[#1e293b] hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* منطق عرض المكونات الفرعية بناءً على التبويب النشط الصارم */}
      <div className="w-full relative z-10">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* كروت المؤشرات الحية المقتنصة من الصورة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-[#151f32] border border-slate-850 p-4 rounded-2xl flex flex-col justify-between h-24">
                <span className="text-slate-400 text-[10px] font-black tracking-wider text-left">عقود الإيجار النشطة</span>
                <span className="text-2xl font-black text-white text-right font-inter">.</span>
              </div>
              <div className="bg-[#151f32] border border-slate-850 p-4 rounded-2xl flex flex-col justify-between h-24">
                <span className="text-slate-400 text-[10px] font-black tracking-wider text-left">إجمالي المحصل</span>
                <span className="text-2xl font-black text-emerald-400 text-right font-inter">٠ ر.س</span>
              </div>
              <div className="bg-[#151f32] border border-slate-850 p-4 rounded-2xl flex flex-col justify-between h-24">
                <span className="text-slate-400 text-[10px] font-black tracking-wider text-left">المستحقات المتأخرة</span>
                <span className="text-2xl font-black text-amber-500 text-right font-inter">٠ ر.س</span>
              </div>
              <div className="bg-[#151f32] border border-slate-850 p-4 rounded-2xl flex flex-col justify-between h-24">
                <span className="text-slate-400 text-[10px] font-black tracking-wider text-left">معدل الامتثال الضريبي</span>
                <span className="text-2xl font-black text-indigo-400 text-right font-inter">٩٨٪</span>
              </div>
            </div>

            {/* شريط الإقرار والتحصين من الصورة */}
            <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs font-bold text-emerald-400">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} />
                <span>جميع العقود متوافقة مع معايير وزارة الإسكان والتطوير الحضري وتخضع لتدقيق الامتثال التلقائي.</span>
              </div>
              <input type="checkbox" checked readOnly className="rounded border-emerald-500/30 text-emerald-500 focus:ring-0" />
            </div>

            {/* شبكة العمل وبناء العقود وسجل المطابقة المكتمل من لقطة الشاشة */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* سجل عقود الإيجار (7 أعمدة) */}
              <div className="lg:col-span-7 bg-[#151f32]/40 border border-slate-850 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-850 bg-slate-900/20 flex justify-between items-center">
                  <h3 className="font-bold text-xs text-white">📋 سجل عقود الإيجار الحالية والامتثال</h3>
                  <input type="text" placeholder="البحث برقم الوحدة أو اسم المستأجر..." className="bg-[#0b1120] border border-slate-800 text-[10px] px-3 py-1 rounded-lg w-48 focus:outline-none" />
                </div>
                <div className="p-8 text-center text-slate-500 text-xs font-semibold">
                  لا توجد عقود إيجار مسجلة حالياً
                </div>
              </div>

              {/* إنشاء عقد جديد (5 أعمدة) */}
              <div className="lg:col-span-5 bg-[#151f32]/40 border border-slate-850 rounded-2xl p-5 space-y-4">
                <h3 className="text-white font-bold text-xs border-b border-slate-850 pb-2.5 flex items-center gap-2">
                  <Plus size={16} className="text-[#df7b62]" /> إنشاء عقد إيجار جديد في النظام
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

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <label className="block text-slate-400 mb-1">قيمة الإيجار الشهري (ر.س) *</label>
                    <input type="text" placeholder="٥٠٠٠" className="w-full bg-[#0b1120] border border-slate-800 rounded-lg px-3 py-2 text-white text-left font-inter focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">مدة العقد (بالشهور) *</label>
                    <select className="w-full bg-[#0b1120] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none">
                      <option>١٢ شهراً</option>
                      <option>٦ شهور</option>
                    </select>
                  </div>
                </div>

                <button type="button" className="w-full py-2.5 bg-[#df7b62] hover:bg-[#c5654e] text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
                  حفظ وتعميد العقد بالسيرفر ➔
                </button>
              </div>

            </div>
          </div>
        )}

        {/* استدعاء وتوجيه المكونات الفرعية الجاهزة بالسيرفر السحابي بأسمائها المطابقة */}
        {activeTab === 'ejar' && <div className="animate-fade-in"><EjarView /></div>}
        {activeTab === 'zatca' && <div className="animate-fade-in"><ZatcaView /></div>}
        {activeTab === 'finance' && <div className="animate-fade-in"><ErpFinanceView /></div>}
      </div>

    </div>
  );
}
// مكون مخصص فرعي للـ Plus لعدم حدوث خطأ استدعاء
function Plus(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
}