"use client";

import { useEffect, useState } from "react";
import type { DisplayLocale } from "@/lib/display";
import type { Copy, LeadItem, Opportunity, UnitOption } from "../types";
import { EmptyState } from "../helpers";
import { BriefcaseBusiness, ExternalLink } from "lucide-react";
import { opportunityStatusLabel } from "@/features/leads/copy/leadsCopy";
import { leadVisual } from "@/features/leads/visual";
import LeadListPager from "@/features/leads/components/LeadListPager";



const LEAD_PANEL_PAGE_SIZE = 5;

function opportunityStatusTone(status: string): string {
  const normalized = String(status || "").toUpperCase();
  if (normalized.includes("WON") || normalized.includes("CLOSED")) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (normalized.includes("LOST") || normalized.includes("CANCEL")) {
    return "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300";
  }
  if (normalized.includes("NEGOT")) {
    return "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300";
  }
  if (normalized.includes("PROPOSAL") || normalized.includes("OFFER")) {
    return "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300";
  }
  if (normalized === "OPEN" || normalized === "QUALIFIED") {
    return "border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-accent-text)]";
  }
  return "border-[var(--nc-border)] bg-[var(--nc-surface-strong)] text-[var(--nc-text-secondary)]";
}
interface LeadOpportunitiesPanelProps {
  labels: Copy;
  selectedLead: LeadItem;
  opportunitiesLoading: boolean;
  loadError: string | null;
  selectedLeadOpportunities: Opportunity[];
  units: UnitOption[];
  isArabic: boolean;
  displayLocale: DisplayLocale;
  canWrite: boolean;
  openOpportunityModal: () => void;
  leadDisplayName: (lead: LeadItem) => string;
  unitDisplayLabel: (unit?: UnitOption | null) => string;
  formatCurrency: (value: unknown, isArabic: boolean) => string;
  formatNumber: (value: unknown, isArabic: boolean) => string;
  formatDate: (
    value: string | null | undefined,
    isArabic: boolean,
    fallback: string,
  ) => string;
  openUnitPage: (unitId: string) => void;
}

export default function LeadOpportunitiesPanel({
  labels,
  selectedLead,
  opportunitiesLoading,
  loadError,
  selectedLeadOpportunities,
  units,
  isArabic,
  displayLocale,
  canWrite,
  openOpportunityModal,
  leadDisplayName,
  unitDisplayLabel,
  formatCurrency,
  formatNumber,
  formatDate,
  openUnitPage,
}: LeadOpportunitiesPanelProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(
    1,
    Math.ceil(selectedLeadOpportunities.length / LEAD_PANEL_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const visibleOpportunities = selectedLeadOpportunities.slice(
    (safePage - 1) * LEAD_PANEL_PAGE_SIZE,
    safePage * LEAD_PANEL_PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [selectedLead.id]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  return (
    <div className="space-y-3">
      <div className={`${leadVisual.softPanel} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className={leadVisual.iconTile}>
            <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className={leadVisual.sectionTitle}>{labels.opportunityListTitle}</h3>
            <p className={leadVisual.meta}>
              <bdi dir="auto">{leadDisplayName(selectedLead)}</bdi>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openOpportunityModal}
          disabled={!canWrite}
          className={leadVisual.primaryButton}
        >
          {labels.createOpportunity}
        </button>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
          {loadError}
        </div>
      ) : opportunitiesLoading ? (
        <EmptyState message={labels.opportunitiesLoading} />
      ) : selectedLeadOpportunities.length === 0 ? (
        <EmptyState message={labels.noOpportunities} />
      ) : (
        <div className="space-y-2">
          {visibleOpportunities.map((opportunity) => {
            const unit = units.find((item) => item.id === opportunity.unitId);

            return (
              <div
                key={opportunity.id}
                className={`${leadVisual.card} grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto]`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--nc-text-primary)]">
                    {formatCurrency(opportunity.value, isArabic)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="truncate text-xs text-[var(--nc-text-secondary)]">
                      {unit ? unitDisplayLabel(unit) : labels.opportunityNoUnit}
                    </p>
                    {unit && (
                      <button
                        type="button"
                        onClick={() => openUnitPage(unit.id)}
                        className={leadVisual.secondaryButton}
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        {isArabic ? "الوحدة" : "Unit"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--nc-text-secondary)] sm:justify-end">
                  <span className="rounded-full border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-2.5 py-1 font-semibold text-[var(--nc-text-primary)]">
                    {formatNumber(opportunity.probability, isArabic)}%
                  </span>
                  <span>
                    {formatDate(
                      opportunity.closeDate,
                      isArabic,
                      labels.notSpecified,
                    )}
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 font-bold ${opportunityStatusTone(opportunity.status)}`}>
                    {opportunityStatusLabel(
                      opportunity.status,
                      isArabic ? "ar" : "en",
                    )}
                  </span>
                </div>
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
