// components/ui/LayoutContainer.tsx
'use client';

import React from 'react';

interface LayoutContainerProps {
  kpis: React.ReactNode;          // 4 KPIs cards (usually 4 SmartCards/panels)
  actions: React.ReactNode;       // Left block (Actions panel/controls)
  insights: React.ReactNode;      // Right block (AI Predictor / Insights panel)
  details: React.ReactNode;       // Full-width bottom row (tables, logs, detailed lists)
  className?: string;
}

export default function LayoutContainer({
  kpis,
  actions,
  insights,
  details,
  className = '',
}: LayoutContainerProps) {
  return (
    <div className={`nc-stack space-y-6 w-full ${className}`}>
      {/* 1. KPIs Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpis}
      </div>

      {/* 2. Middle Section (Actions & AI Insights) */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 items-stretch">
        {/* Actions Card (Smaller width - 1/3) */}
        <div className="w-full lg:w-[32%] flex flex-col">
          {actions}
        </div>
        {/* AI Predictor / Insights (Remaining width - 2/3) */}
        <div className="w-full lg:flex-1 flex flex-col">
          {insights}
        </div>
      </div>

      {/* 3. Bottom Section (Details, Logs & Lists) */}
      <div className="w-full">
        {details}
      </div>
    </div>
  );
}
