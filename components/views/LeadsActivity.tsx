'use client';
import React from 'react';
import { Phone, MessageCircle, MapPin, Calendar } from 'lucide-react';

const activities = [
  { id: 1, type: 'whatsapp', title: 'رسالة واتساب', desc: 'تم إرسال بروشور المشروع', time: 'منذ ساعتين' },
  { id: 2, type: 'call', title: 'مكالمة صادرة', desc: 'استغرقت 4 دقائق - مهتم بالسعر', time: 'منذ يوم' },
  { id: 3, type: 'visit', title: 'جولة عقارية', desc: 'زيارة موقع حي النرجس', time: 'قبل 3 أيام' },
];

const getIcon = (type: string) => {
  switch(type) {
    case 'whatsapp': return <MessageCircle size={14} className="text-green-400"/>;
    case 'call': return <Phone size={14} className="text-blue-400"/>;
    case 'visit': return <MapPin size={14} className="text-purple-400"/>;
    default: return <Calendar size={14} className="text-white/40"/>;
  }
};

export default function LeadsActivity() {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm">سجل المتابعة</h3>
      <div className="relative border-l border-white/10 ml-2 space-y-6">
        {activities.map((act) => (
          <div key={act.id} className="relative pl-6">
            <div className="absolute -left-[5px] top-1 p-1 bg-[#001F33] border border-white/10 rounded-full">
              {getIcon(act.type)}
            </div>
            <div className="bg-[#032238]/30 p-3 rounded-lg border border-white/5">
              <p className="text-xs font-bold text-white">{act.title}</p>
              <p className="text-xs text-white/50 mt-1">{act.desc}</p>
              <p className="text-[10px] text-white/30 mt-2">{act.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
