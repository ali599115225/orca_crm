"use client";

import { useEffect, useState } from "react";
import type { Copy, LeadItem, Tour, UnitOption } from "../types";
import { EmptyState } from "../helpers";
import { ExternalLink, MapPinned } from "lucide-react";
import { leadVisual } from "@/features/leads/visual";
import LeadListPager from "@/features/leads/components/LeadListPager";

type WritableTourStatus = "COMPLETED" | "CANCELLED" | "NO_SHOW" | "FOLLOW_UP";

interface LeadToursPanelProps {
  labels: Copy;
  selectedLead: LeadItem;
  toursLoading: boolean;
  loadError: string | null;
  actionError: string | null;
  selectedLeadTours: Tour[];
  units: UnitOption[];
  isArabic: boolean;
  displayLocale: "ar" | "en";
  canWrite: boolean;
  updatingTourId: string | null;
  handleUpdateTourStatus: (
    tour: Tour,
    status: WritableTourStatus,
  ) => Promise<void> | void;
  leadDisplayName: (lead: LeadItem) => string;
  unitDisplayLabel: (unit?: UnitOption | null) => string;
  formatDate: (
    value: string | null | undefined,
    isArabic: boolean,
    fallback: string,
  ) => string;
  formatDisplayTime: (value: string) => string;
  openTourPage: (tourId: string) => void;
  openUnitPage: (unitId: string) => void;
}

const LEAD_PANEL_PAGE_SIZE = 5;

function statusLabel(status: string, isArabic: boolean): string {
  const labels: Record<string, [string, string]> = {
    SCHEDULED: ["مجدولة", "Scheduled"],
    COMPLETED: ["مكتملة", "Completed"],
    CANCELLED: ["ملغاة", "Cancelled"],
    NO_SHOW: ["لم يحضر", "No show"],
    FOLLOW_UP: ["متابعة", "Follow-up"],
  };
  const pair = labels[status];
  return pair ? pair[isArabic ? 0 : 1] : status;
}


function tourStatusTone(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "CANCELLED":
      return "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300";
    case "NO_SHOW":
      return "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300";
    case "FOLLOW_UP":
      return "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300";
    default:
      return "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }
}

export default function LeadToursPanel({
  labels,
  selectedLead,
  toursLoading,
  loadError,
  actionError,
  selectedLeadTours,
  units,
  isArabic,
  canWrite,
  updatingTourId,
  handleUpdateTourStatus,
  leadDisplayName,
  unitDisplayLabel,
  formatDate,
  formatDisplayTime,
  openTourPage,
  openUnitPage,
}: LeadToursPanelProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(
    1,
    Math.ceil(selectedLeadTours.length / LEAD_PANEL_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const visibleTours = selectedLeadTours.slice(
    (safePage - 1) * LEAD_PANEL_PAGE_SIZE,
    safePage * LEAD_PANEL_PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [selectedLead.id]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const completeLabel = isArabic ? "إكمال الجولة" : "Complete tour";
  const noShowLabel = isArabic ? "لم يحضر" : "No show";
  const cancelLabel = isArabic ? "إلغاء الجولة" : "Cancel tour";
  const followUpLabel = isArabic ? "متابعة" : "Follow-up";

  return (
    <div className="space-y-3">
      <div className={`${leadVisual.softPanel} flex items-center gap-3 p-4`}>
        <span className={leadVisual.iconTile}>
          <MapPinned className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className={leadVisual.sectionTitle}>{labels.tourListTitle}</h3>
          <p className={leadVisual.meta}>
            <bdi dir="auto">{leadDisplayName(selectedLead)}</bdi>
          </p>
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
          {actionError}
        </div>
      )}

      {loadError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
          {loadError}
        </div>
      ) : toursLoading ? (
        <EmptyState message={labels.toursLoading} />
      ) : selectedLeadTours.length === 0 ? (
        <EmptyState message={labels.noOfferTours} />
      ) : (
        <div className="space-y-2">
          {visibleTours.map((tour) => {
            const unit = units.find((item) => item.id === tour.unitId);
            const isUpdating = updatingTourId === tour.id;
            const isFinal =
              tour.status === "COMPLETED" || tour.status === "CANCELLED";

            return (
              <div
                key={tour.id}
                className={`${leadVisual.card} p-4`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--nc-text-primary)]">
                      <bdi dir="auto">{tour.location}</bdi>
                    </p>
                    <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                      {unitDisplayLabel(unit)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs font-semibold text-[var(--nc-text-secondary)] sm:justify-end">
                    <span className={`rounded-full border px-2.5 py-1 font-bold ${tourStatusTone(tour.status)}`}>
                      {statusLabel(tour.status, isArabic)}
                    </span>
                    <span>
                      {formatDate(
                        tour.startAt,
                        isArabic,
                        labels.notSpecified,
                      )}{" "}
                      · {formatDisplayTime(tour.startAt)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--nc-border)] pt-3">
                  <button
                    type="button"
                    onClick={() => openTourPage(tour.id)}
                    className={leadVisual.secondaryButton}
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    {isArabic ? "صفحة الجولات" : "Tours page"}
                  </button>
                  {unit && (
                    <button
                      type="button"
                      onClick={() => openUnitPage(unit.id)}
                      className={leadVisual.secondaryButton}
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      {isArabic ? "الوحدة" : "Unit"}
                    </button>
                  )}
                </div>

                {canWrite && !isFinal && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={Boolean(updatingTourId)}
                      onClick={() =>
                        void handleUpdateTourStatus(tour, "COMPLETED")
                      }
                      className={leadVisual.compactPrimaryButton}
                    >
                      {isUpdating ? labels.loading : completeLabel}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(updatingTourId)}
                      onClick={() =>
                        void handleUpdateTourStatus(tour, "NO_SHOW")
                      }
                      className={leadVisual.secondaryButton}
                    >
                      {noShowLabel}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(updatingTourId)}
                      onClick={() =>
                        void handleUpdateTourStatus(tour, "FOLLOW_UP")
                      }
                      className={leadVisual.secondaryButton}
                    >
                      {followUpLabel}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(updatingTourId)}
                      onClick={() =>
                        void handleUpdateTourStatus(tour, "CANCELLED")
                      }
                      className={leadVisual.dangerGhostButton}
                    >
                      {cancelLabel}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <LeadListPager
            page={safePage}
            totalPages={totalPages}
            isArabic={isArabic}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
