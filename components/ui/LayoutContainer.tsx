import React from 'react';

interface LayoutContainerProps {
  kpis: React.ReactNode;
  actions: React.ReactNode;
  insights: React.ReactNode;
  details: React.ReactNode;
}

export const LayoutContainer: React.FC<LayoutContainerProps> = ({ kpis, actions, insights, details }) => {
  return (
    <div className="space-y-6 p-6 md:p-8 animate-in fade-in duration-500" dir="rtl">

      {/* 1. KPIs Top Row (always on top) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis}
      </section>

      {/* 2. Middle Section (Action + Insight) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="nc-glass p-6">
          {actions}
        </div>
        <div className="nc-glass p-6">
          {insights}
        </div>
      </section>

      {/* 3. Bottom Section (Details/Logs) */}
      <section className="nc-glass p-6 w-full">
        {details}
      </section>

    </div>
  );
};

export default LayoutContainer;
