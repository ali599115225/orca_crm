import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Breadcrumb } from './Breadcrumb';
import { StatusBadge, BadgeVariant } from './StatusBadge';
import { useApp } from '@/app/context/AppContext';

interface PageShellProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon | any;
  badge?: BadgeVariant;
  breadcrumb?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function PageShell({ title, subtitle, icon: Icon, badge, breadcrumb, actions, children }: PageShellProps) {
  const { lang } = useApp();
  const isRTL = lang === 'AR';

  const defaultBreadcrumb = [
    { label: isRTL ? 'العمليات' : 'Operations', href: '/operations' },
    { label: title },
  ];

  return (
    <div className="nc-stack p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumb || defaultBreadcrumb} className="mb-3" />

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-[var(--nc-accent-soft)] text-[var(--nc-accent)] flex items-center justify-center shrink-0">
              <Icon size={20} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="nc-heading-1">{title}</h1>
              {badge && <StatusBadge variant={badge} lang={lang} />}
            </div>
            {subtitle && (
              <p className="text-[var(--nc-text-dim)] text-sm mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 w-full md:w-auto">{actions}</div>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}

export default PageShell;
