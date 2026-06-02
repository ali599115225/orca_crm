'use client';
import React, { useState } from 'react';
import { LayoutDashboard, FileText, ShieldCheck, Calculator, TrendingUp } from 'lucide-react';

export default function RentalView() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'العقود', icon: <LayoutDashboard size={20}/> },
    { id: 'ejar', name: 'شبكة إيجار', icon: <FileText size={20}/> },
    { id: 'zatca', name: 'الزكاة والضريبة', icon: <ShieldCheck size={20}/> },
    { id: 'finance', name: 'المحاسبة', icon: <Calculator size={20}/> }
  ];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* التبويبات التكتيكية */}
      <div className="flex gap-4 p-2 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-[#df7b62] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            {tab.icon} {tab.name}
          </button>
        ))}
      </div>

      {/* لوحة العرض الزجاجية */}
      <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <h2 className="text-2xl font-black mb-6 border-b border-white/10 pb-4">
          {tabs.find(t => t.id === activeTab)?.name}
        </h2>
        
        {/* شبكة البيانات */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
            <h4 className="text-slate-400 mb-2">الإجمالي المحصل</h4>
            <p className="text-3xl font-black text-[#df7b62]">0.00 ر.س</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
            <h4 className="text-slate-400 mb-2">عقود قيد التنفيذ</h4>
            <p className="text-3xl font-black text-emerald-400">0</p>
          </div>
        </div>
      </div>
    </div>
  );
}