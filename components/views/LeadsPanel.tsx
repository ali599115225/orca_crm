'use client';
import React from 'react';
import { Target, TrendingUp, AlertCircle, Bot } from 'lucide-react';

export default function LeadsPanel() {
  // محاكاة لبيانات المحرك الذكي
  const leadScore = 85; 
  const probability = 'عالية جداً';

  return (
    <div className="p-6 space-y-6">
      {/* قسم محرك التقييم الذكي */}
      <div className="bg-[#032238] border border-white/10 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Target size={18} className="text-cyan-400"/> محرك تقييم العميل (AI)
          </h3>
          <span className="text-2xl font-bold text-cyan-400">{leadScore}%</span>
        </div>
        
        {/* شريط التقدم */}
        <div className="w-full h-2 bg-[#001F33] rounded-full overflow-hidden mb-4">
          <div className="h-full bg-cyan-500 transition-all duration-1000" style={{ width: `${leadScore}%` }}></div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#001F33] p-2 rounded border border-white/5 text-white/60">احتمالية الإغلاق: {probability}</div>
          <div className="bg-[#001F33] p-2 rounded border border-white/5 text-white/60">المرحلة: تفاوض</div>
        </div>
      </div>

      {/* قسم توصيات الذكاء الاصطناعي */}
      <div className="bg-gradient-to-br from-cyan-900/20 to-transparent border border-cyan-500/10 p-4 rounded-xl">
        <h4 className="text-cyan-400 text-sm font-medium mb-2 flex items-center gap-2">
            <Bot size={16}/> توصيات المتابعة
        </h4>
        <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-start gap-2">
                <span className="text-cyan-500">•</span> إرسال عرض "حي النرجس" المخصص للعميل.
            </li>
            <li className="flex items-start gap-2">
                <span className="text-cyan-500">•</span> أفضل وقت للاتصال: 5:30 مساءً.
            </li>
        </ul>
      </div>
    </div>
  );
}
