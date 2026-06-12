import React from 'react';
import { useApp } from '@/app/context/AppContext';

interface LayoutContainerProps {
  kpis?: React.ReactNode;
  actions?: React.ReactNode;
  insights?: React.ReactNode;
  details?: React.ReactNode;
  children?: React.ReactNode;
}

export const LayoutContainer: React.FC<LayoutContainerProps> = ({ kpis, actions, insights, details, children }) => {
  const { lang } = useApp();
  const isRTL = lang === 'AR';

  return (
    <div className="nc-page nc-stack" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* 1. KPIs Top Row */}
      {kpis && (
        <section className="nc-stagger-enter grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis}
        </section>
      )}

      {/* 2. Middle Section */}
      {(actions || insights) && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {actions && (
            <div className="flex flex-col gap-4 w-full min-h-0">
              {actions}
            </div>
          )}
          {insights && (
            <div className="flex flex-col gap-4 w-full min-h-0">
              {insights}
            </div>
          )}
        </section>
      )}

      {/* 3. Bottom Section */}
      {details && (
        <section className="w-full">
          {details}
        </section>
      )}

      {/* 4. Children */}
      {children && (
        <section className="w-full">
          {children}
        </section>
      )}

    </div>
  );
};

export default LayoutContainer;
