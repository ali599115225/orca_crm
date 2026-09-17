"use client";

import { Bot, CalendarDays, FilePlus2, RefreshCw } from "lucide-react";
import OperationsPageHeader from "@/components/operations/OperationsPageHeader";
import { operationsVisual } from "@/features/operations/visual";
import { formatRiyadhDisplayDate } from "../timezone";
import type { DashboardCopy } from "../copy/dashboardCopy";

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
    <OperationsPageHeader
      data-dashboard-card="title"
      eyebrow={copy.dashboardEyebrow}
      title={
        <>
          {copy.welcome} <bdi dir="auto">{welcomeName}</bdi>
        </>
      }
      description={copy.description}
      meta={
        <p className="flex items-center gap-2">
          <CalendarDays
            className="h-3.5 w-3.5 shrink-0"
            aria-hidden="true"
          />
          <span>{copy.today}</span>
          <strong className="text-[var(--nc-text-secondary)]">
            {formatRiyadhDisplayDate(generatedAt)}
          </strong>
        </p>
      }
      actions={
        <>
          {canIssueContract ? (
            <button
              type="button"
              onClick={onIssueContract}
              className={operationsVisual.primaryButton}
            >
              <FilePlus2 aria-hidden="true" />
              {copy.issueContract}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onAskOrca}
            className={operationsVisual.secondaryButton}
          >
            <Bot aria-hidden="true" />
            {copy.askOrca}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className={operationsVisual.iconButton}
            title={copy.refreshData}
            aria-label={copy.refreshData}
          >
            <RefreshCw aria-hidden="true" />
          </button>
        </>
      }
    />
  );
}