'use client';
import React, { useState } from 'react';
import { LayoutGrid, ListFilter, Archive, X } from 'lucide-react';

const mainStages = [{ id: 'جديد', title: 'جديد' }, { id: 'تواصل', title: 'قيد التواصل' }, { id: 'جولة', title: 'جولة عقارية' }, { id: 'تفاوض', title: 'مفاوضات' }];
const archiveStages = [{ id: 'إغلاق', title: 'إغلاق' }, { id: 'مستبعد', title: 'غير مهتم' }];

export default function LeadsView() {
  const [viewMode, setViewMode] = useState('kanban');
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden bg-[#001F33] relative">
      {/* الترويسة */}
      <div className="flex justify-between items-center px-6 py-4 flex-shrink-0">
        <h2 className="text-xl font-bold text-[#FFFFFF]">إدارة العملاء المحتملين</h2>
        <div className="flex gap-2">
            <button onClick={() => setIsPanelOpen(!isPanelOpen)} className="flex items-center gap-2 px-3 py-2 bg-[#032238] border border-white/10 rounded-lg text-sm text-white/60 hover:text-white hover:bg-cyan-500/20 transition-all">
                <Archive size={16}/> {isPanelOpen ? 'إخفاء الأرشيف' : 'عرض الأرشيف'}
            </button>
            <div className="flex bg-[#032238] rounded-lg p-1 border border-white/5">
                <button onClick={() => setViewMode('kanban')} className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/40'}`}><LayoutGrid size={18}/></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/40'}`}><ListFilter size={18}/></button>
            </div>
        </div>
      </div>

      {/* منطقة العرض الرئيسية */}
      <div className="flex-1 px-6 pb-6 overflow-hidden flex gap-4">
        <div className="flex h-full gap-4 flex-1 transition-all">
          {mainStages.map((stage) => (
            <div key={stage.id} className="flex-1 flex flex-col h-full bg-[#032238]/30 border border-white/5 rounded-xl overflow-hidden">
              <div className="p-3 border-b border-white/5 bg-white/5"><h3 className="text-sm font-semibold text-white/80">{stage.title}</h3></div>
              <div className="flex-1 p-3"></div>
            </div>
          ))}
        </div>

        {/* اللوحة المنزلقة (Archive Panel) */}
        <div className={`transition-all duration-300 ease-in-out ${isPanelOpen ? 'w-80' : 'w-0 opacity-0'} flex flex-col gap-4`}>
          {archiveStages.map((stage) => (
            <div key={stage.id} className="flex-1 flex flex-col bg-[#032238]/50 border border-white/10 rounded-xl overflow-hidden">
              <div className="p-3 border-b border-white/10 bg-white/5"><h3 className="text-sm font-semibold text-white/50">{stage.title}</h3></div>
              <div className="flex-1 p-3"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
