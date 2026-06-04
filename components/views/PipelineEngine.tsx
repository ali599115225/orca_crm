'use client';
import React, { useState } from 'react';
import LeadsPipeline from './LeadsPipeline'; // الـ Pipeline السابق
// سنقوم بدمج اللوحة هنا لاحقاً

export default function PipelineEngine() {
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // دالة لفتح ملف العميل عند الضغط على أي كرت
  const handleLeadClick = (lead: any) => {
    setSelectedLead(lead);
    setIsPanelOpen(true);
  };

  return (
    <div className="flex h-screen w-full">
      {/* منطقة العرض الرئيسية - سنمرر دالة النقر */}
      <LeadsPipeline onLeadClick={handleLeadClick} />

      {/* اللوحة الجانبية المرتبطة بالبيانات المختارة */}
      {isPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
           <div className="w-[450px] h-full bg-[#001F33] border-l border-white/10 shadow-2xl overflow-y-auto">
             {/* هنا سيتم دمج كافة المكونات التي برمجناها (Score, Activity, Contact, WA, Tasks) */}
             <div className="p-6">
                <h2 className="text-white text-xl font-bold">ملف: {selectedLead?.name || 'عميل جديد'}</h2>
                {/* باقي المكونات ستظهر هنا */}
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
