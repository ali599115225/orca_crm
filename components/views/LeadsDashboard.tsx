'use client';
import React from 'react';
import { Users, TrendingUp, PhoneIncoming, AlertCircle, BarChart3 } from 'lucide-react';

export default function LeadsDashboard() {
  const stats = [
    { title: 'العملاء الجدد', value: '42', icon: <Users size={20}/>, color: 'text-blue-400' },
    { title: 'قيد المتابعة', value: '128', icon: <PhoneIncoming size={20}/>, color: 'text-amber-400' },
    { title: 'العملاء الساخنين', value: '15', icon: <TrendingUp size={20}/>, color: 'text-red-400' },
    { title: 'يحتاج متابعة', value: '8', icon: <AlertCircle size={20}/>, color: 'text-purple-400' },
  ];

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* بطاقات الإحصائيات - Enterprise Level */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-[#032238]/50 border border-white/5 p-4 rounded-xl flex items-center gap-4">
            <div className={`p-3 bg-[#042A44] rounded-lg ${stat.color}`}>{stat.icon}</div>
            <div>
              <p className="text-xs text-white/50">{stat.title}</p>
              <h3 className="text-xl font-bold text-white">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* منطقة المصادر والتقارير */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#032238]/30 border border-white/5 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><BarChart3 size={18}/> مصادر العملاء</h3>
            {/* هنا سيتم دمج الـ Chart الخاص بالمصادر */}
            <div className="h-48 flex items-center justify-center border border-dashed border-white/10 rounded-lg text-white/20">رسم بياني لأداء المصادر</div>
        </div>
        <div className="bg-[#032238]/30 border border-white/5 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">أداء الوكلاء</h3>
            {/* هنا ستظهر قائمة الوكلاء وتوزيع المهام */}
        </div>
      </div>
    </div>
  );
}
