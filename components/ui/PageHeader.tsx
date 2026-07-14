import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon | any;
  children?: React.ReactNode;
  eyebrow?: string;
  workspace?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  children,
  eyebrow,
  workspace = false,
}) => {
  return (
    <div
      className={
        workspace
          ? "orca-workspace-hero"
          : "flex w-full flex-col items-start justify-between gap-3 border-none bg-transparent mb-4 md:flex-row md:items-center"
      }
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-[var(--nc-accent-soft)] text-[var(--nc-accent)] flex items-center justify-center shrink-0">
            <Icon size={20} />
          </div>
        )}
        <div>
          {eyebrow ? (
            <p className="text-xs font-bold text-[var(--nc-accent)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className={workspace ? "mt-1 text-2xl font-black text-[var(--nc-text-primary)]" : "nc-heading-1"}>
            {title}
          </h1>
          {description && (
            <p className={workspace ? "mt-1 text-sm text-[var(--nc-text-secondary)]" : "mt-0.5 text-sm font-medium text-[var(--nc-text-secondary)]"}>
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
