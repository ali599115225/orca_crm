"use client";

import type { Copy, LeadItem, Tour, UnitOption } from "../types";
import { EmptyState } from "../helpers";

interface LeadToursPanelProps {
  labels: Copy;
  selectedLead: LeadItem;
  toursLoading: boolean;
  selectedLeadTours: Tour[];
  units: UnitOption[];
  isArabic: boolean;
  leadDisplayName: (lead: LeadItem) => string;
  unitDisplayLabel: (unit?: UnitOption | null) => string;
  formatDate: (value: string | null | undefined, isArabic: boolean, fallback: string) => string;
  formatDisplayTime: (value: string) => string;
}

export default function LeadToursPanel({
  labels,
  selectedLead,
  toursLoading,
  selectedLeadTours,
  units,
  isArabic,
  leadDisplayName,
  unitDisplayLabel,
  formatDate,
  formatDisplayTime,
}: LeadToursPanelProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3">
        <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">{labels.tourListTitle}</h3>
        <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">{leadDisplayName(selectedLead)}</p>
      </div>
      {toursLoading ? (
        <EmptyState message={labels.toursLoading} />
      ) : selectedLeadTours.length === 0 ? (
        <EmptyState message={labels.noOfferTours} />
      ) : (
        <div className="space-y-2">
          {selectedLeadTours.map((tour) => {
            const unit = units.find((item) => item.id === tour.unitId);
            return (
              <div key={tour.id} className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--nc-text-primary)]">{tour.location}</p>
                    <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                      {unitDisplayLabel(unit)}
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-[var(--nc-text-secondary)]">
                    {formatDate(tour.startAt, isArabic, labels.notSpecified)} · {formatDisplayTime(tour.startAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
