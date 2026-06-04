'use client';
import React from 'react';
import { PieChart, TrendingUp, Users, Target } from 'lucide-react';

export default function LeadsReports() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-white mb-6">التقارير التحليلية للعملاء</h2>
      
      {/* شبكة التقارير */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* تقرير المصادر */}
        <div className="bg-[#032238]/30 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
            <PieChart size={18} className="text-purple-400"/> الأداء حسب المصدر
          </h3>
          <div className="space-y-4">
            {['Google Ads', 'Meta Ads', 'WhatsApp'].map(source => (
              <div key={source} className="flex justify-between text-sm">
                <span className="text-white/60">{source}</span>
                <span className="text-white font-bold">34%</span>
              </div>
            ))}
          </div>
        </div>

        {/* تقرير التحويل */}
        <div className="bg-[#032238]/30 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
            <Target size={18} className="text-cyan-400"/> معدل التحويل (Conversion)
          </h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-white">12.5%</span>
            <span className="text-green-400 text-sm mb-2 font-medium">+2.4% هذا الشهر</span>
          </div>
        </div>

        {/* تقرير الوكلاء */}
        <div className="bg-[#032238]/30 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
            <Users size={18} className="text-amber-400"/> أداء الوكلاء
          </h3>
          <div className="space-y-3">
             <div className="flex justify-between text-sm">
                <span className="text-white/60">أحمد (Senior)</span>
                <span className="text-white font-bold">15 إغلاق</span>
             </div>
             <div className="flex justify-between text-sm">
                <span className="text-white/60">سارة (Mid-Level)</span>
                <span className="text-white font-bold">12 إغلاق</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
