import React from 'react';
import { useApp } from '@/app/context/AppContext';

interface LayoutContainerProps {
  kpis?: React.ReactNode;
  actions?: React.ReactNode;
  insights?: React.ReactNode;
  details?: React.ReactNode;
  children?: React.ReactNode;
  workspace?: boolean;
}

export const LayoutContainer: React.FC<LayoutContainerProps> = ({
  kpis,
  actions,
  insights,
  details,
  children,
  workspace = false,
}) => {
  const { lang } = useApp();
  const isRTL = lang === 'AR';

  return (
    <div
      className={workspace ? "space-y-4" : "nc-page nc-stack"}
      dir={isRTL ? "rtl" : "ltr"}
    >

      {/* 1. KPIs Top Row */}
      {kpis && (
        <section
          className={
            workspace
              ? "orca-workspace-metrics"
              : "nc-stagger-enter grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4"
          }
        >
          {kpis}
        </section>
      )}

      {/* 2. Middle Section */}
      {(actions || insights) && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
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
