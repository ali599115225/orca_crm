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
      data-dashboard-card="kpi"
    >
      <span className={dashboardVisual.metricIconTile}>{icon}</span>

      <span className="orca-dashboard-v1-metric-copy">
        <strong className="orca-dashboard-v1-metric-title">{title}</strong>
        <span className="orca-dashboard-v1-metric-description">
          {description}
        </span>
      </span>

      {isReady ? (
        <strong className="orca-dashboard-v1-metric-value">{value.data}</strong>
      ) : (
        <span className="orca-dashboard-v1-metric-error">
          <strong>—</strong>
          <small>{errorLabel}</small>
        </span>
      )}
    </Link>
  );
}