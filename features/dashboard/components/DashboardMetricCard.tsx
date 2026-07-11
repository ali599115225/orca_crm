"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { DashboardDataState } from "../model";
import { dashboardVisual } from "../visual";

interface DashboardMetricCardProps {
  title: string;
  description: string;
  value: DashboardDataState<number>;
  icon: ReactNode;
  href: string;
  errorLabel: string;
}

export default function DashboardMetricCard({
  title,
  description,
  value,
  icon,
  href,
  errorLabel,
}: DashboardMetricCardProps) {
  const isReady = value.status === "ready";

  return (
    <Link
      href={href}
      className={dashboardVisual.metricCard}
      aria-label={title}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--nc-text-primary)]">
            {title}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--nc-text-secondary)]">
            {description}
          </p>
        </div>
        <span className={dashboardVisual.metricIconTile}>{icon}</span>
      </div>

      <div className="mt-4">
        {isReady ? (
          <strong className="text-3xl font-black leading-none text-[var(--nc-text-primary)]">
            {value.data}
          </strong>
        ) : (
          <div className="flex items-end justify-between gap-3">
            <strong className="text-3xl font-black leading-none text-[var(--nc-text-dim)]">
              —
            </strong>
            <span className="text-xs font-bold text-red-600 dark:text-red-300">
              {errorLabel}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
