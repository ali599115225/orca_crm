"use client";

import { AlertTriangle, Inbox, RotateCcw } from "lucide-react";
import { dashboardVisual } from "../visual";

interface DashboardSectionStateProps {
  kind: "empty" | "error";
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export default function DashboardSectionState({
  kind,
  message,
  retryLabel,
  onRetry,
}: DashboardSectionStateProps) {
  const Icon = kind === "error" ? AlertTriangle : Inbox;

  return (
    <div
      className={`${dashboardVisual.softPanel} flex min-h-32 flex-col items-center justify-center gap-3 px-5 py-8 text-center`}
      role={kind === "error" ? "alert" : "status"}
    >
      <Icon
        className={
          kind === "error"
            ? "h-6 w-6 text-red-500"
            : "h-6 w-6 text-[var(--nc-text-dim)]"
        }
        aria-hidden="true"
      />
      <p className={dashboardVisual.body}>{message}</p>
      {kind === "error" && onRetry && retryLabel && (
        <button
          type="button"
          onClick={onRetry}
          className={dashboardVisual.secondaryLink}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
