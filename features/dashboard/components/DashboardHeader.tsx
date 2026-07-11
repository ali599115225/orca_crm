"use client";

import { CalendarDays, FilePlus2 } from "lucide-react";
import { formatRiyadhDisplayDate } from "../timezone";
import type { DashboardCopy } from "../copy/dashboardCopy";
import { dashboardVisual } from "../visual";

interface DashboardHeaderProps {
  copy: DashboardCopy;
  welcomeName: string;
  generatedAt: string;
  canIssueContract: boolean;
  onIssueContract: () => void;
}

export default function DashboardHeader({
  copy,
  welcomeName,
  generatedAt,
  canIssueContract,
  onIssueContract,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className={dashboardVisual.title}>
          {copy.welcome} <bdi dir="auto">{welcomeName}</bdi>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--nc-text-secondary)]">
          {copy.description}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className={`${dashboardVisual.softPanel} flex min-h-11 items-center gap-3 px-4 py-2.5`}>
          <CalendarDays
            className="h-4 w-4 text-[var(--nc-text-dim)]"
            aria-hidden="true"
          />
          <div>
            <p className="text-[11px] font-bold text-[var(--nc-text-dim)]">
              {copy.today}
            </p>
            <p className="text-sm font-bold text-[var(--nc-text-primary)]">
              {formatRiyadhDisplayDate(generatedAt)}
            </p>
          </div>
        </div>

        {canIssueContract && (
          <button
            type="button"
            onClick={onIssueContract}
            className={dashboardVisual.primaryButton}
          >
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            {copy.issueContract}
          </button>
        )}
      </div>
    </header>
  );
}
