"use client";

import type { DisplayLocale } from "@/lib/display";
import type { Copy } from "../types";

interface LeadPipelinePanelProps {
  labels: Copy;
  stageCounts: Record<string, number>;
  displayLocale: DisplayLocale;
  getStageLabel: (stageId: string, displayLocale: DisplayLocale) => string;
  formatPipelineCount: (value: unknown) => string;
  pipelineStages: string[];
}

export default function LeadPipelinePanel({
  labels,
  stageCounts,
  displayLocale,
  getStageLabel,
  formatPipelineCount,
  pipelineStages,
}: LeadPipelinePanelProps) {
  return (
    <div className="relative">
      <div
        tabIndex={0}
        aria-label={labels.pipeline}
        className="max-h-[220px] space-y-1.5 overflow-y-auto pr-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {pipelineStages.map((stage) => {
          const count = stageCounts[stage] || 0;

          return (
            <div
              key={stage}
              className="grid min-h-[44px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-3 py-2"
            >
              <span className="truncate text-sm font-semibold text-[var(--nc-text-primary)]">
                {getStageLabel(stage, displayLocale)}
              </span>
              <span className="whitespace-nowrap text-xs text-[var(--nc-text-secondary)]">
                {formatPipelineCount(count)} {labels.leadsUnit}
              </span>
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 rounded-b-2xl bg-gradient-to-t from-[var(--nc-surface)] to-transparent" />
    </div>
  );
}
