'use client';
import React, { useState } from 'react';
import { Settings, Zap, UserCheck } from 'lucide-react';

export default function AutomationSettings() {
  const [autoAssignment, setAutoAssignment] = useState(true);
  const [autoFollowup, setAutoFollowup] = useState(true);

  return (
    <div className="bg-[var(--nc-surface)] border border-white/5 rounded-xl p-6">
      <h3 className="text-white font-semibold flex items-center gap-2 mb-6">
        <Settings size={18} className="text-cyan-400"/> إعدادات أتمتة العملاء
      </h3>
      
      <div className="space-y-4">
        {/* مفتاح التوزيع التلقائي */}
        <div className="flex items-center justify-between p-4 bg-[#001F33] rounded-lg border border-white/5">
          <div className="flex items-center gap-3">
            <UserCheck className={autoAssignment ? "text-cyan-400" : "text-white/20"} />
            <div>
              <p className="text-sm text-white">التوزيع التلقائي للعملاء</p>
              <p className="text-[10px] text-white/40">توزيع العملاء على الوكلاء حسب القواعد</p>
            </div>
          </div>
          <button 
            onClick={() => setAutoAssignment(!autoAssignment)}
            className={`w-12 h-6 rounded-full transition-all ${autoAssignment ? 'bg-cyan-500' : 'bg-white/10'}`}
          />
        </div>

        {/* مفتاح المتابعة التلقائية */}
        <div className="flex items-center justify-between p-4 bg-[#001F33] rounded-lg border border-white/5">
          <div className="flex items-center gap-3">
            <Zap className={autoFollowup ? "text-amber-400" : "text-white/20"} />
            <div>
              <p className="text-sm text-white">المتابعة التلقائية (واتساب)</p>
              <p className="text-[10px] text-white/40">إرسال رسائل ترحيبية فورية للعملاء</p>
            </div>
          </div>
          <button 
            onClick={() => setAutoFollowup(!autoFollowup)}
            className={`w-12 h-6 rounded-full transition-all ${autoFollowup ? 'bg-amber-500' : 'bg-white/10'}`}
          />
        </div>
      </div>
    </div>
  );
}
