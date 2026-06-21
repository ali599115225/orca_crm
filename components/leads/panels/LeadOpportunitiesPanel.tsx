"use client";

import type { DisplayLocale } from "@/lib/display";
import { displayEnum } from "@/lib/display";
import type { Copy, LeadItem, Opportunity, UnitOption } from "../types";
import { EmptyState } from "../helpers";

interface LeadOpportunitiesPanelProps {
  labels: Copy;
  selectedLead: LeadItem;
  opportunitiesLoading: boolean;
  selectedLeadOpportunities: Opportunity[];
  units: UnitOption[];
  isArabic: boolean;
  displayLocale: DisplayLocale;
  openOpportunityModal: () => void;
  leadDisplayName: (lead: LeadItem) => string;
  unitDisplayLabel: (unit?: UnitOption | null) => string;
  formatCurrency: (value: unknown, isArabic: boolean) => string;
  formatNumber: (value: unknown, isArabic: boolean) => string;
  formatDate: (value: string | null | undefined, isArabic: boolean, fallback: string) => string;
}

export default function LeadOpportunitiesPanel({
  labels,
  selectedLead,
  opportunitiesLoading,
  selectedLeadOpportunities,
  units,
  isArabic,
  displayLocale,
  openOpportunityModal,
  leadDisplayName,
  unitDisplayLabel,
  formatCurrency,
  formatNumber,
  formatDate,
}: LeadOpportunitiesPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">
            {labels.opportunityListTitle}
          </h3>
          <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
            {leadDisplayName(selectedLead)}
          </p>
        </div>
        <button
          type="button"
          onClick={openOpportunityModal}
          className="nc-btn-primary min-h-[40px] rounded-xl px-4 py-2 text-xs font-bold"
        >
          {labels.createOpportunity}
        </button>
      </div>

      {opportunitiesLoading ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-6 text-center">
          <p className="text-sm font-medium text-[var(--nc-text-secondary)]">
            {labels.opportunitiesLoading}
          </p>
        </div>
      ) : selectedLeadOpportunities.length === 0 ? (
        <EmptyState message={labels.noOpportunities} />
      ) : (
        <div className="space-y-2">
          {selectedLeadOpportunities.map((opportunity) => {
            const unit = units.find((item) => item.id === opportunity.unitId);

            return (
              <div
                key={opportunity.id}
                className="grid gap-3 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--nc-text-primary)]">
                    {formatCurrency(opportunity.value, isArabic)}
                  </p>
                  <p className="mt-1 truncate text-xs text-[var(--nc-text-secondary)]">
                    {unit
                      ? unitDisplayLabel(unit)
                      : labels.opportunityNoUnit}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--nc-text-secondary)] sm:justify-end">
                  <span className="rounded-full border border-[var(--nc-border)] bg-[var(--nc-surface)] px-2.5 py-1 font-semibold text-[var(--nc-text-primary)]">
                    {formatNumber(opportunity.probability, isArabic)}%
                  </span>
                  <span>
                    {formatDate(opportunity.closeDate, isArabic, labels.notSpecified)}
                  </span>
                  <span className="rounded-full border border-[var(--nc-border)] bg-[var(--nc-surface)] px-2.5 py-1 font-semibold text-[var(--nc-text-primary)]">
                    {displayEnum(opportunity.status, "generalStatus", displayLocale) || opportunity.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
