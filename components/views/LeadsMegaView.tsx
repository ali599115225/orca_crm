'use client';
import React, { useState } from 'react';
import LeadsContactDetails from './LeadsContactDetails';
import LeadsActivity from './LeadsActivity';
import LeadsWhatsApp from './LeadsWhatsApp';
import LeadsTasks from './LeadsTasks';

const initialLeads = [
  { id: 1, name: 'علي إبراهيم', stage: 'جديد', budget: '3.5 مليون ر.س' },
  { id: 2, name: 'محمد السالم', stage: 'قيد التواصل', budget: '2.1 مليون ر.س' },
];

export default function LeadsMegaView() {
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const stages = ['جديد', 'قيد التواصل', 'جولة عقارية', 'مفاوضات'];

  return (
    <div className="flex h-[85vh] w-full gap-4 p-4 bg-[#00121F]">
      {/* الأعمدة الرئيسية */}
      {stages.map((stage) => (
        <div key={stage} className="flex-1 bg-[#032238]/30 border border-white/5 rounded-xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-white/5 text-white/70 font-semibold text-sm bg-white/5">{stage}</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {initialLeads.filter(l => l.stage === stage).map(lead => (
              <div 
                key={lead.id} 
                onClick={() => setSelectedLead(lead)}
                className="bg-[#042A44] p-3 rounded-lg border border-white/5 cursor-pointer hover:border-cyan-500 transition-all"
              >
                <h4 className="text-white text-sm font-medium">{lead.name}</h4>
                <p className="text-[10px] text-white/40 mt-1">{lead.budget}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* اللوحة الجانبية */}
      {selectedLead && (
        <div className="w-[450px] bg-[#001F33] border-l border-white/10 p-6 overflow-y-auto shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-white font-bold text-lg">{selectedLead.name}</h2>
            <button onClick={() => setSelectedLead(null)} className="text-white/50 hover:text-white">إغلاق</button>
          </div>
          <div className="space-y-6">
            <LeadsContactDetails />
            <LeadsWhatsApp />
            <LeadsActivity />
            <LeadsTasks />
          </div>
        </div>
      )}
    </div>
  );
}
