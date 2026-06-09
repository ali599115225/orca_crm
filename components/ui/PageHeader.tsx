import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon | any;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, icon: Icon, children }) => {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 bg-transparent border-none w-full">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-[var(--nc-accent-soft)] text-[var(--nc-accent)] flex items-center justify-center shrink-0">
            <Icon size={20} />
          </div>
        )}
        <div>
          <h1 className="nc-heading-1">
            {title}
          </h1>
          {description && (
            <p className="text-[var(--nc-text-secondary)] text-sm mt-0.5 font-medium">
              {description}
            </p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
