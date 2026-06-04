'use client';
import React, { useState } from 'react';
import { MessageCircle, Send, Sparkles } from 'lucide-react';

export default function LeadsWhatsApp() {
  const [message, setMessage] = useState('');

  return (
    <div className="bg-[#032238]/30 border border-white/5 rounded-xl p-5 space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <MessageCircle size={16} className="text-green-400"/> تكامل الواتساب
      </h3>

      {/* منطقة القوالب الذكية */}
      <div className="flex gap-2">
        <button className="px-3 py-1 bg-[#042A44] border border-white/10 rounded text-[10px] text-white/60 hover:text-cyan-400 transition-all">
          عرض الأسعار
        </button>
        <button className="px-3 py-1 bg-[#042A44] border border-white/10 rounded text-[10px] text-white/60 hover:text-cyan-400 transition-all">
          تأكيد الموعد
        </button>
      </div>

      {/* منطقة الكتابة */}
      <div className="relative">
        <textarea 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="اكتب رسالة للعميل..."
          className="w-full bg-[#001F33] border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-500 h-24"
        />
        <button className="absolute bottom-3 right-3 p-2 bg-cyan-500 rounded-md text-[#001F33] hover:bg-cyan-400 transition-all">
          <Send size={16} />
        </button>
      </div>

      {/* زر الرد الذكي */}
      <button className="w-full py-2 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all">
        <Sparkles size={14} /> اقتراح رد بالذكاء الاصطناعي
      </button>
    </div>
  );
}
