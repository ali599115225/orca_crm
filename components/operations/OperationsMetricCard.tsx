import React from "react";
import type { LucideIcon } from "lucide-react";
import { operationsVisual } from "@/features/operations/visual";

interface OperationsMetricCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  value: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  trailing?: React.ReactNode;
}

export default function OperationsMetricCard({
  title,
  value,
  description,
  icon: Icon,
  trailing,
  className = "",
  ...props
}: OperationsMetricCardProps) {
  return (
    <div
      className={[operationsVisual.metricCard, className].filter(Boolean).join(" ")}
      {...props}
    >
      <span className={operationsVisual.metricIconTile} aria-hidden="true">
        {Icon ? <Icon /> : null}
      </span>

      <span className="min-w-0">
        <strong className="block truncate text-[12px] font-extrabold text-[var(--nc-text-primary)]">
          {title}
        </strong>
        {description ? (
          <span className="mt-0.5 block truncate text-[12px] text-[var(--nc-text-dim)]">
            {description}
          </span>
        ) : null}
      </span>

      <span className="min-w-0 text-end">
        <strong className="block whitespace-nowrap text-[22px] font-black leading-none text-[var(--nc-text-primary)]">
          {value}
        </strong>
        {trailing ? (
          <span className="mt-1 block text-[12px] text-[var(--nc-text-dim)]">
            {trailing}
          </span>
        ) : null}
      </span>
    </div>
  );
}
