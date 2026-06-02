'use client';
import React, { useState } from 'react';
import { LayoutDashboard, FileText, ShieldCheck, Calculator, TrendingUp, AlertCircle, Plus } from 'lucide-react';

export default function RentalView() {
  const [currentSubTab, setCurrentSubTab] = useState('dashboard');

  const renderContent = () => {
    switch(currentSubTab) {
      case 'dashboard':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">عقود الإيجار النشطة</h3>
              <button className="bg-[#df7b62] px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16}/> عقد جديد</button>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <p className="text-slate-400">لا توجد عقود نشطة حالياً. ابدأ بإضافة عقد جديد.</p>
            </div>
          </div>
        );
      case 'ejar':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">ربط شبكة إيجار</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-2xl font-black">0</p>
                <p className="text-sm text-blue-400">عقد مؤرشف</p>
              </div>
              <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl">
                <p className="text-2xl font-black">0</p>
                <p className="text-sm text-green-400">عقد قيد المزامنة</p>
              </div>
            </div>
          </div>
        );
      case 'zatca':
        return (
          <div className="space-y-4">
             <h3 className="text-lg font-bold">الامتثال الضريبي (ZATCA)</h3>
             <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5 text-center">
                <ShieldCheck size={48} className="mx-auto text-emerald-500 mb-2"/>
                <p>نظام الفوترة الإلكترونية نشط</p>
             </div>
          </div>
        );
      case 'finance':
        return (
          <div className="space-y-4">
             <h3 className="text-lg font-bold">الأستاذ العام</h3>
             <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                   <thead><tr className="text-slate-400 text-sm border-b border-white/10"><th>البيان</th><th>مدين</th><th>دائن</th></tr></thead>
                   <tbody><tr className="border-b border-white/5"><td>رصيد افتتاحي</td><td>0.00</td><td>0.00</td></tr></tbody>
                </table>
             </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="w-full min-h-screen text-slate-100 p-6 font-sans" dir="rtl">
      <div className="mb-8 border-b border-white/10 pb-6">
        <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">حوكمة الأصول</h1>
      </div>
      <div className="flex gap-2 mb-8 bg-slate-900/50 p-1.5 rounded-2xl w-fit">
        {[
          { id: 'dashboard', name: 'عقود الإيجار', icon: <LayoutDashboard size={16}/> },
          { id: 'ejar', name: 'شبكة إيجار', icon: <FileText size={16}/> },
          { id: 'zatca', name: 'الزكاة والضريبة', icon: <ShieldCheck size={16}/> },
          { id: 'finance', name: 'الأستاذ العام', icon: <Calculator size={16}/> }
        ].map(t => (
          <button key={t.id} onClick={() => setCurrentSubTab(t.id)} 
            className={`px-6 py-3 rounded-xl flex items-center gap-2 transition-all ${currentSubTab === t.id ? 'bg-[#df7b62] text-white shadow-lg' : 'hover:bg-white/5'}`}>
            {t.icon} {t.name}
          </button>
        ))}
      </div>
      <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
         {renderContent()}
      </div>
    </div>
  );
}