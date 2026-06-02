'use client';
import React, { useState } from 'react';
import { LayoutDashboard, FileText, ShieldCheck, Calculator, Activity, ArrowUpRight } from 'lucide-react';

export default function RentalView() {
  const [currentSubTab, setCurrentSubTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'لوحة التحكم', icon: <LayoutDashboard size={18}/> },
    { id: 'ejar', name: 'عقود إيجار', icon: <FileText size={18}/> },
    { id: 'zatca', name: 'الزكاة (ZATCA)', icon: <ShieldCheck size={18}/> },
    { id: 'finance', name: 'المحاسبة', icon: <Calculator size={18}/> }
  ];

  return (
    <div className="w-full min-h-screen bg-[#0b1120] text-slate-100 p-8 font-sans" dir="rtl">
      {/* العنوان التكتيكي */}
      <div className="mb-10">
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">إدارة الأصول العقارية</h1>
        <div className="h-1 w-20 bg-gradient-to-r from-[#df7b62] to-transparent rounded-full"></div>
      </div>

      {/* شريط التبويبات بنمط Glassmorphism */}
      <div className="flex gap-4 mb-8 bg-slate-900/30 p-2 rounded-2xl border border-white/5 w-fit backdrop-blur-md">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setCurrentSubTab(t.id)} 
            className={`px-8 py-4 rounded-xl flex items-center gap-3 transition-all duration-300 font-bold ${currentSubTab === t.id ? 'bg-[#df7b62] text-white shadow-[0_0_20px_rgba(223,123,98,0.3)]' : 'hover:bg-white/5 text-slate-400'}`}>
            {t.icon} {t.name}
          </button>
        ))}
      </div>

      {/* المحتوى الرئيسي */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* بطاقة عرض المحتوى الرئيسية */}
        <div className="lg:col-span-3 bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
           <div className="flex items-center justify-between mb-8">
             <h2 className="text-2xl font-black">{tabs.find(t => t.id === currentSubTab)?.name}</h2>
             <span className="flex items-center gap-1 text-[#df7b62] text-xs font-bold bg-[#df7b62]/10 px-3 py-1 rounded-full border border-[#df7b62]/20">
               <Activity size={12}/> نشط
             </span>
           </div>
           
           <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center text-slate-500">
             <p>المحتوى التكتيكي للـ {currentSubTab} يتم تحديثه الآن...</p>
           </div>
        </div>

        {/* بطاقة جانبية للمؤشرات */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/20 backdrop-blur-lg border border-white/10 rounded-3xl p-6">
           <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-400"><TrendingUp size={16}/> مؤشرات الأداء</h3>
           <div className="space-y-4">
             <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
               <span className="text-xs">المعدل الضريبي</span>
               <span className="font-mono font-bold text-[#df7b62]">١٥٪</span>
             </div>
             <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
               <span className="text-xs">نسبة الامتثال</span>
               <span className="font-mono font-bold text-emerald-400">٩٨.٢٪</span>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}