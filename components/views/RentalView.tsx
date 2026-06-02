'use client';

import React, { useState, useEffect } from 'react';
import { Home, FileText, ShieldCheck, Calculator, LayoutDashboard, CheckCircle } from 'lucide-react';

export default function RentalView() {
  const [currentSubTab, setCurrentSubTab] = useState('dashboard');

  // Debugger لنتأكد هل الضغط يصل للسكربت أم لا
  const handleTabClick = (tabId: string) => {
    console.log("Tab clicked:", tabId);
    setCurrentSubTab(tabId);
  };

  return (
    <div className="w-full min-h-screen text-slate-100 space-y-6" dir="rtl">
      {/* هيدر الصفحة */}
      <div className="flex flex-col space-y-2 pb-2">
        <h1 className="text-xl md:text-2xl font-black text-white">بوابة حوكمة الإيجارات (ERP)</h1>
      </div>

      {/* شريط التبويبات - إضافة pointer-events-auto لضمان التفاعل */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800/60 pb-3 relative z-50 pointer-events-auto">
        {[
          { id: 'dashboard', name: 'عقود الإيجار', icon: <LayoutDashboard size={16} /> },
          { id: 'ejar', name: 'شبكة إيجار', icon: <FileText size={16} /> },
          { id: 'zatca', name: 'الزكاة والضريبة', icon: <ShieldCheck size={16} /> },
          { id: 'finance', name: 'الأستاذ العام', icon: <Calculator size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${
              currentSubTab === tab.id
                ? 'bg-[#df7b62] text-white border-[#df7b62]'
                : 'bg-[#151f32] text-slate-400 border-slate-800 hover:bg-[#1e293b]'
            }`}
          >
            {tab.icon}
            {tab.name}
          </button>
        ))}
      </div>

      {/* عرض المحتوى */}
      <div className="w-full p-6 bg-[#151f32]/20 border border-slate-800 rounded-2xl">
        <h2 className="text-lg font-bold mb-4">أنت الآن في: {currentSubTab}</h2>
        <p className="text-sm text-slate-400">إذا تغير هذا النص عند الضغط على التبويبات، فالمشكلة في تنسيق العرض، وإذا لم يتغير، فالمشكلة في تفعيل الـ React State.</p>
      </div>
    </div>
  );
}