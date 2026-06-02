'use client';
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, ShieldCheck, Calculator } from 'lucide-react';

export default function RentalPage() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState('dashboard');

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="p-10 text-white">جاري التهيئة...</div>;

  return (
    <div className="w-full min-h-screen bg-[#0b1120] text-slate-100 p-6" dir="rtl">
      <h1 className="text-2xl font-black mb-6">إدارة الإيجارات (الوضع المدمج)</h1>
      
      <div className="flex gap-4 mb-6 border-b border-slate-800 pb-4">
        {[
          { id: 'dashboard', name: 'العقود', icon: <LayoutDashboard size={16}/> },
          { id: 'ejar', name: 'إيجار', icon: <FileText size={16}/> },
          { id: 'zatca', name: 'زاتكا', icon: <ShieldCheck size={16}/> },
          { id: 'finance', name: 'مالية', icon: <Calculator size={16}/> }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} 
            className={`p-3 rounded-lg flex items-center gap-2 ${tab === t.id ? 'bg-[#df7b62] text-white' : 'bg-[#151f32]'}`}>
            {t.icon} {t.name}
          </button>
        ))}
      </div>

      <div className="bg-[#151f32] p-8 rounded-xl border border-slate-800">
        <h2 className="text-xl font-bold">المحتوى الحالي: {tab}</h2>
        <p className="text-slate-400 mt-2">يعمل هذا المكون الآن بشكل مستقل داخل الصفحة لضمان عدم وجود أخطاء استيراد.</p>
      </div>
    </div>
  );
}