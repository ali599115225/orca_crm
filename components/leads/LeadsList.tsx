"use client";

import type { DisplayLocale } from "@/lib/display";
import type { Copy, LeadItem } from "./types";
import { EmptyState, LeadStatusBadge, PaginationBar } from "./helpers";

interface LeadsListProps {
  labels: Copy;
  filteredLeads: LeadItem[];
  pagedLeads: LeadItem[];
  selectedLead: LeadItem | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  leadPage: number;
  setLeadPage: (value: number | ((prev: number) => number)) => void;
  leadTotalPages: number;
  isArabic: boolean;
  textAlign: string;
  displayLocale: DisplayLocale;
  handleSelect: (lead: LeadItem) => Promise<void> | void;
  leadDisplayName: (lead: LeadItem) => string;
  leadDisplaySource: (lead: LeadItem) => string;
  leadDisplayOwner: (value?: string | null) => string;
  formatNumber: (value: unknown, isArabic: boolean) => string;
}

export default function LeadsList({
  labels,
  filteredLeads,
  pagedLeads,
  selectedLead,
  searchTerm,
  setSearchTerm,
  leadPage,
  setLeadPage,
  leadTotalPages,
  isArabic,
  textAlign,
  displayLocale,
  handleSelect,
  leadDisplayName,
  leadDisplaySource,
  leadDisplayOwner,
  formatNumber,
}: LeadsListProps) {
  return (
    <div className="h-fit rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-[var(--nc-text-primary)]">{labels.leadsList}</h2>
          <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
            {formatNumber(filteredLeads.length, isArabic)} {labels.leadsUnit}
          </p>
        </div>

        <input
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setLeadPage(1);
          }}
          placeholder={labels.searchPlaceholder}
          className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-4 text-sm text-[var(--nc-text-primary)] outline-none lg:max-w-md"
        />
      </div>

      {filteredLeads.length > 0 ? (
        <div className="overflow-hidden">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-[var(--nc-border)] text-[var(--nc-text-secondary)]">
                <th className={`w-[30%] px-3 py-3 ${textAlign} font-semibold`}>{labels.lead}</th>
                <th className={`w-[16%] px-3 py-3 text-center font-semibold`}>{labels.status}</th>
                <th className={`w-[22%] px-3 py-3 ${textAlign} font-semibold`}>{labels.source}</th>
                <th className={`w-[18%] px-3 py-3 ${textAlign} font-semibold`}>{labels.owner}</th>
                <th className={`w-[14%] px-3 py-3 text-center font-semibold`}>{labels.score}</th>
              </tr>
            </thead>

            <tbody>
              {pagedLeads.map((lead) => {
                const selected = selectedLead?.id === lead.id;

                return (
                  <tr
                    key={lead.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      void handleSelect(lead);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void handleSelect(lead);
                      }
                    }}
                    className={
                      selected
                        ? "cursor-pointer border-b border-[var(--nc-border)] bg-[var(--nc-surface-soft)] outline-none"
                        : "cursor-pointer border-b border-[var(--nc-border)] outline-none transition-colors hover:bg-[var(--nc-surface-soft)]"
                    }
                  >
                    <td className="truncate px-3 py-3 font-semibold text-[var(--nc-text-primary)]">
                      {leadDisplayName(lead)}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex justify-center">
                        <LeadStatusBadge status={lead.stage} displayLocale={displayLocale} />
                      </span>
                    </td>

                    <td className="truncate px-3 py-3 text-[var(--nc-text-secondary)]">
                      {leadDisplaySource(lead)}
                    </td>

                    <td className="truncate px-3 py-3 text-[var(--nc-text-secondary)]">
                      {leadDisplayOwner(lead.assignedTo)}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-center font-mono text-xs text-[var(--nc-text-secondary)]">
                      {formatNumber(lead.leadScore || 0, isArabic)}/100
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <PaginationBar
            page={leadPage}
            totalPages={leadTotalPages}
            labels={labels}
            isArabic={isArabic}
            onPrevious={() => setLeadPage((page) => Math.max(1, page - 1))}
            onNext={() => setLeadPage((page) => Math.min(leadTotalPages, page + 1))}
          />
        </div>
      ) : (
        <EmptyState message={labels.noLeads} />
      )}
    </div>
  );
}
