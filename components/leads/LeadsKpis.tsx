"use client";

import type { Copy } from "./types";

interface LeadsKpisProps {
  labels: Copy;
  totalLeads: number;
  newLeads: number;
  qualified: number;
  conversion: number;
  isArabic: boolean;
  formatNumber: (value: unknown, isArabic: boolean) => string;
}

export default function LeadsKpis({
  labels,
  totalLeads,
  newLeads,
  qualified,
  conversion,
  isArabic,
  formatNumber,
}: LeadsKpisProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: labels.totalLeads, value: totalLeads, note: labels.leadRegistry },
        { label: labels.newLeads, value: newLeads, note: labels.thisWeek },
        { label: labels.qualified, value: qualified, note: labels.readyFollowUp },
        { label: labels.conversion, value: `${conversion}%`, note: labels.closedRate },
      ].map((kpi) => (
        <div
          key={kpi.label}
          className="flex min-h-[104px] flex-col justify-between rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-5 shadow-sm"
        >
          <span className="text-sm text-[var(--nc-text-secondary)]">{kpi.label}</span>
          <span className="text-2xl font-bold text-[var(--nc-text-primary)]">
            {typeof kpi.value === "number" ? formatNumber(kpi.value, isArabic) : kpi.value}
          </span>
          <span className="text-xs text-[var(--nc-text-secondary)]">{kpi.note}</span>
        </div>
      ))}
    </div>
  );
}
