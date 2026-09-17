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
  opportunity: "/operations/leads",
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
      className={`${dashboardVisual.dashPanel} orca-dashboard-v1-pipeline`}
      data-dashboard-card="pipeline"
      data-dashboard-connected-pipeline
    >
      <div className="orca-dashboard-v1-panel-head">
        <div className="orca-dashboard-v1-panel-title-group">
          <span className={dashboardVisual.iconTile}>
            <Activity aria-hidden="true" />
          </span>

          <div className="orca-dashboard-v1-panel-copy">
            <div className="orca-dashboard-v1-title-line">
              <h2 className={dashboardVisual.sectionTitle}>
                {copy.pipelineTitle}
              </h2>
              <span className={dashboardVisual.statusBadge}>{copy.live}</span>
            </div>
            <p>{copy.pipelineDescription}</p>
          </div>
        </div>

        {pipeline.status === "ready" && (
          <div className="orca-dashboard-v1-pipeline-total">
            <span>{copy.pipelineTotal}</span>
            <strong>{pipeline.data.total}</strong>
          </div>
        )}
      </div>

      {pipeline.status === "error" ? (
        <DashboardSectionState
          kind="error"
          message={copy.dataUnavailable}
          retryLabel={copy.retry}
          onRetry={onRetry}
        />
      ) : (
        <>
          <div className={dashboardVisual.hScroll}>
            <div className="orca-dashboard-v1-stage-track">
              <span className="orca-dashboard-v1-stage-line" aria-hidden="true" />

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
                    className="orca-dashboard-v1-stage"
                  >
                    <span className="orca-dashboard-v1-stage-label">
                      {labels[stage.key]}
                    </span>
                    <span className="orca-dashboard-v1-stage-icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <strong>{stage.count}</strong>
                    <small>{percent}%</small>
                  </Link>
                );
              })}
            </div>
          </div>

          <div
            className="orca-dashboard-v1-pipeline-summary"
            data-dashboard-pipeline-summary
          >
            <span>
              {copy.activeStages}
              <strong>{activeStages}/5</strong>
            </span>
            <span>
              {copy.closeRate}
              <strong>{closeRate}%</strong>
            </span>
          </div>
        </>
      )}
    </section>
  );
}