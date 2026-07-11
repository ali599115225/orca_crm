"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
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

  return (
    <section className={`${dashboardVisual.sectionPanel} p-5 sm:p-6`}>
      <div className="mb-5 flex items-start gap-3">
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

      {pipeline.status === "error" ? (
        <DashboardSectionState
          kind="error"
          message={copy.dataUnavailable}
          retryLabel={copy.retry}
          onRetry={onRetry}
        />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {pipeline.data.stages.map((stage) => {
              const percent =
                pipeline.data.total > 0
                  ? Math.round((stage.count / pipeline.data.total) * 100)
                  : 0;

              return (
                <Link
                  key={stage.key}
                  href={stageLinks[stage.key]}
                  className={dashboardVisual.stageCard}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-[var(--nc-text-primary)]">
                      {labels[stage.key]}
                    </span>
                    <strong className="text-2xl font-black text-[var(--nc-text-primary)]">
                      {stage.count}
                    </strong>
                  </div>

                  <div className={`mt-4 ${dashboardVisual.progressTrack}`}>
                    <div
                      className={dashboardVisual.progressBar}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <p className="mt-2 text-xs font-semibold text-[var(--nc-text-dim)]">
                    {percent}%
                  </p>
                </Link>
              );
            })}
          </div>

          {pipeline.data.total === 0 && (
            <p className="text-center text-xs text-[var(--nc-text-dim)]">
              {copy.noActiveDeals}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
