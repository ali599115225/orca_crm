'use client';
import React, { useState } from 'react';
import LeadsDashboard from './LeadsDashboard';
import PipelineEngine from './PipelineEngine';
import LeadsReports from './LeadsReports';
import AutomationSettings from '../settings/AutomationSettings';

export default function LeadsModule() {
  const [activeTab, setActiveTab] = useState('pipeline');

  return (
    <div className="h-full flex flex-col bg-[#001F33]">
      {/* شريط التبويبات العلوي */}
      <div className="flex gap-2 p-4 border-b border-white/5 bg-[#032238]/50">
        {['dashboard', 'pipeline', 'reports', 'settings'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-cyan-500 text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* منطقة عرض المحتوى النشط */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && <LeadsDashboard />}
        {activeTab === 'pipeline' && <PipelineEngine />}
        {activeTab === 'reports' && <LeadsReports />}
        {activeTab === 'settings' && <AutomationSettings />}
      </div>
    </div>
  );
}
