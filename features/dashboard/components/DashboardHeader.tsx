"use client";

import { Bot, CalendarDays, FilePlus2, RefreshCw } from "lucide-react";
import { formatRiyadhDisplayDate } from "../timezone";
import type { DashboardCopy } from "../copy/dashboardCopy";
import { dashboardVisual } from "../visual";

interface DashboardHeaderProps {
  copy: DashboardCopy;
  welcomeName: string;
  generatedAt: string;
  canIssueContract: boolean;
  onIssueContract: () => void;
  onAskOrca: () => void;
  onRefresh: () => void;
}

export default function DashboardHeader({
  copy,
  welcomeName,
  generatedAt,
  canIssueContract,
  onIssueContract,
  onAskOrca,
  onRefresh,
}: DashboardHeaderProps) {
  return (
    <header className="orca-workspace-hero" data-dashboard-card="title">
      <div className="min-w-0">
        <p className="text-xs font-bold text-[var(--nc-accent)]">
          {copy.dashboardEyebrow}
        </p>
        <h1 className={`mt-2 ${dashboardVisual.title}`}>
          {copy.welcome} <bdi dir="auto">{welcomeName}</bdi>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--nc-text-secondary)]">
          {copy.description}
        </p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-stretch sm:justify-end">
        <div
          className={`${dashboardVisual.softPanel} flex min-h-11 items-center gap-3 px-4 py-2.5`}
        >
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
            className={dashboardVisual.headerPrimaryButton}
          >
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            {copy.issueContract}
          </button>
        )}

        <button
          type="button"
          onClick={onAskOrca}
          className={dashboardVisual.headerSecondaryButton}
        >
          <Bot className="h-4 w-4" aria-hidden="true" />
          {copy.askOrca}
        </button>

        <button
          type="button"
          onClick={onRefresh}
          className={dashboardVisual.headerGhostButton}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {copy.refreshData}
        </button>
      </div>
    </header>
  );
}
