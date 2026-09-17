import React from "react";
import { LucideIcon } from "lucide-react";
import OperationsPageHeader from "@/components/operations/OperationsPageHeader";

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
  if (workspace) {
    return (
      <OperationsPageHeader
        title={title}
        description={description}
        eyebrow={eyebrow}
        icon={Icon}
        actions={children}
      />
    );
  }

  return (
    <div className="mb-4 flex w-full flex-col items-start justify-between gap-3 border-none bg-transparent md:flex-row md:items-center">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--nc-accent-soft)] text-[var(--nc-accent)]">
            <Icon size={20} />
          </div>
        )}
        <div>
          {eyebrow ? (
            <p className="text-xs font-bold text-[var(--nc-accent)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="nc-heading-1">{title}</h1>
          {description ? (
            <p className="mt-0.5 text-sm font-medium text-[var(--nc-text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {children ? (
        <div className="mt-2 flex w-full items-center gap-2 md:mt-0 md:w-auto">
          {children}
        </div>
      ) : null}
    </div>
  );
};

export default PageHeader;