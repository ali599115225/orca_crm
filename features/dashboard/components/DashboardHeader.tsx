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
    <header
      className="orca-workspace-hero !gap-4 !py-2.5 sm:!py-3"
      data-dashboard-card="title"
    >
      <div className="min-w-0">
        <p className="text-xs font-bold text-[var(--nc-accent)]">
          {copy.dashboardEyebrow}
        </p>
        <h1 className={`mt-1.5 ${dashboardVisual.title}`}>
          {copy.welcome} <bdi dir="auto">{welcomeName}</bdi>
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--nc-text-secondary)]">
          {copy.description}
        </p>
      </div>

      <div className="flex w-full flex-col items-start gap-1.5 sm:w-auto sm:items-end">
        <p className="flex items-center gap-2 text-xs">
          <CalendarDays
            className="h-3.5 w-3.5 shrink-0 text-[var(--nc-text-dim)]"
            aria-hidden="true"
          />
          <span className="font-bold text-[var(--nc-text-dim)]">
            {copy.today}
          </span>
          <span className="font-bold text-[var(--nc-text-secondary)]">
            {formatRiyadhDisplayDate(generatedAt)}
          </span>
        </p>

        <div className="flex flex-wrap items-center gap-2">
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
            className={dashboardVisual.headerIconButton}
            title={copy.refreshData}
            aria-label={copy.refreshData}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
