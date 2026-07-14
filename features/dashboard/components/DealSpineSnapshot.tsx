"use client";

import Link from "next/link";
import {
  Activity,
  CalendarCheck2,
  CheckCircle2,
  FileCheck2,
  SendHorizontal,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DashboardReadModel, DashboardPipelineStageKey } from "../model";
import type { DashboardCopy } from "../copy/dashboardCopy";
import { dashboardVisual } from "../visual";
import DashboardSectionState from "./DashboardSectionState";

interface DealSpineSnapshotProps {
  pipeline: DashboardReadModel["pipeline"];
  copy: DashboardCopy;
  onRetry: () => void;
}

const stageLinks: Record<DashboardPipelineStageKey, string> = {
  opportunity: "/operations/opportunities",
  tour: "/operations/tours",
  offer: "/operations/offers",
  contract: "/operations/sales",
  closed: "/operations/sales",
};

const stageIcons: Record<DashboardPipelineStageKey, LucideIcon> = {
  opportunity: UsersRound,
  tour: CalendarCheck2,
  offer: SendHorizontal,
  contract: FileCheck2,
  closed: CheckCircle2,
};

export default function DealSpineSnapshot({
  pipeline,
  copy,
  onRetry,
}: DealSpineSnapshotProps) {
  const labels: Record<DashboardPipelineStageKey, string> = {
    opportunity: copy.opportunity,
    tour: copy.tour,
    offer: copy.offer,
    contract: copy.contract,
    closed: copy.closed,
  };

  const activeStages =
    pipeline.status === "ready"
      ? pipeline.data.stages.filter((stage) => stage.count > 0).length
      : 0;
  const closedCount =
    pipeline.status === "ready"
      ? pipeline.data.stages.find((stage) => stage.key === "closed")?.count || 0
      : 0;
  const closeRate =
    pipeline.status === "ready" && pipeline.data.total > 0
      ? Math.round((closedCount / pipeline.data.total) * 100)
      : 0;

  return (
    <section
      className={`${dashboardVisual.sectionPanel} flex h-full min-h-[310px] flex-col p-5`}
      data-dashboard-card="pipeline"
      data-dashboard-connected-pipeline
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className={dashboardVisual.iconTile}>
            <Activity className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={dashboardVisual.sectionTitle}>
                {copy.pipelineTitle}
              </h2>
              <span className={dashboardVisual.statusBadge}>{copy.live}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
              {copy.pipelineDescription}
            </p>
          </div>
        </div>

        {pipeline.status === "ready" && (
          <div className="shrink-0 text-end">
            <span className="block text-[11px] font-bold text-[var(--nc-text-dim)]">
              {copy.pipelineTotal}
            </span>
            <strong className="mt-1 block text-xl font-black text-[var(--nc-text-primary)]">
              {pipeline.data.total}
            </strong>
          </div>
        )}
      </div>

      {pipeline.status === "error" ? (
        <div className="mt-5 flex flex-1 items-center">
          <DashboardSectionState
            kind="error"
            message={copy.dataUnavailable}
            retryLabel={copy.retry}
            onRetry={onRetry}
          />
        </div>
      ) : (
        <>
          <div className="mt-5 min-h-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="relative mx-auto min-w-[620px] px-4 pb-1 pt-1">
              <div
                className="absolute left-[10%] right-[10%] top-[66px] h-px bg-[var(--nc-border)]"
                aria-hidden="true"
              />
              <div className="relative grid grid-cols-5">
                {pipeline.data.stages.map((stage) => {
                  const Icon = stageIcons[stage.key];
                  const percent =
                    pipeline.data.total > 0
                      ? Math.round((stage.count / pipeline.data.total) * 100)
                      : 0;

                  return (
                    <Link
                      key={stage.key}
                      href={stageLinks[stage.key]}
                      className="group relative z-10 flex min-h-[150px] flex-col items-center px-2 py-2 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]"
                    >
                      <span className="text-xs font-bold text-[var(--nc-text-secondary)] transition group-hover:text-[var(--nc-accent)]">
                        {labels[stage.key]}
                      </span>
                      <span className="mt-3 grid h-12 w-12 place-items-center rounded-full border border-[var(--nc-accent-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-accent)] shadow-sm transition group-hover:border-[var(--nc-accent)] group-hover:bg-[var(--nc-accent-soft)]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <strong className="mt-3 text-2xl font-black text-[var(--nc-text-primary)]">
                        {stage.count}
                      </strong>
                      <span className="mt-1 text-[11px] font-bold text-[var(--nc-text-dim)]">
                        {percent}%
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className="mt-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-[var(--nc-border)] pt-3 text-xs"
            data-dashboard-pipeline-summary
          >
            <span className="inline-flex items-center gap-2">
              <span className="font-bold text-[var(--nc-text-dim)]">
                {copy.activeStages}
              </span>
              <strong className="text-[var(--nc-text-primary)]">
                {activeStages}/5
              </strong>
            </span>
            <span
              className="h-1 w-1 rounded-full bg-[var(--nc-border-strong)]"
              aria-hidden="true"
            />
            <span className="inline-flex items-center gap-2">
              <span className="font-bold text-[var(--nc-text-dim)]">
                {copy.closeRate}
              </span>
              <strong className="text-[var(--nc-text-primary)]">
                {closeRate}%
              </strong>
            </span>
          </div>
        </>
      )}
    </section>
  );
}
