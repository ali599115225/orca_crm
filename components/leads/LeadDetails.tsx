"use client";

import type { DisplayLocale } from "@/lib/display";
import type { Copy, LeadItem, DetailTab, Tour, UnitOption, Offer, Opportunity } from "./types";
import { EmptyState, LeadStatusBadge } from "./helpers";

import LeadSummaryPanel from "./panels/LeadSummaryPanel";
import LeadContactsPanel from "./panels/LeadContactsPanel";
import LeadTasksPanel from "./panels/LeadTasksPanel";
import LeadToursPanel from "./panels/LeadToursPanel";
import LeadOffersPanel from "./panels/LeadOffersPanel";
import LeadOpportunitiesPanel from "./panels/LeadOpportunitiesPanel";
import LeadPipelinePanel from "./panels/LeadPipelinePanel";

interface LeadDetailsProps {
  labels: Copy;
  selectedLead: LeadItem | null;
  detailTab: DetailTab;
  setDetailTab: (tab: DetailTab) => void;
  detailTabs: Array<{ id: DetailTab; labelKey: keyof Copy }>;
  isArabic: boolean;
  displayLocale: DisplayLocale;
  leadInitials: (lead: LeadItem) => string;
  leadDisplayName: (lead: LeadItem) => string;
  leadDisplayCity: (lead: LeadItem) => string;
  leadDisplaySource: (lead: LeadItem) => string;
  leadDisplayStatus: (status?: string | null) => string;
  leadDisplayOwner: (value?: string | null) => string;
  formatNumber: (value: unknown, isArabic: boolean) => string;
  formatDate: (value: string | null | undefined, isArabic: boolean, fallback: string) => string;
  formatDisplayTime: (value: string) => string;
  formatCurrency: (value: unknown, isArabic: boolean) => string;
  detailData: any;
  toursLoading: boolean;
  selectedLeadTours: Tour[];
  units: UnitOption[];
  unitDisplayLabel: (unit?: UnitOption | null) => string;
  offersLoading: boolean;
  selectedLeadOffers: Offer[];
  opportunities: Opportunity[];
  offerableOpportunities: Opportunity[];
  acceptingOfferId: string | null;
  openOfferModal: () => void;
  openTourModal: (offer: Offer) => void;
  handleAcceptOffer: (offer: Offer) => Promise<void> | void;
  openOpportunityModal: () => void;
  opportunitiesLoading: boolean;
  selectedLeadOpportunities: Opportunity[];
  stageCounts: Record<string, number>;
  getStageLabel: (stageId: string, displayLocale: DisplayLocale) => string;
  formatPipelineCount: (value: unknown) => string;
  pipelineStages: string[];
}

export default function LeadDetails({
  labels,
  selectedLead,
  detailTab,
  setDetailTab,
  detailTabs,
  isArabic,
  displayLocale,
  leadInitials,
  leadDisplayName,
  leadDisplayCity,
  leadDisplaySource,
  leadDisplayStatus,
  leadDisplayOwner,
  formatNumber,
  formatDate,
  formatDisplayTime,
  formatCurrency,
  detailData,
  toursLoading,
  selectedLeadTours,
  units,
  unitDisplayLabel,
  offersLoading,
  selectedLeadOffers,
  opportunities,
  offerableOpportunities,
  acceptingOfferId,
  openOfferModal,
  openTourModal,
  handleAcceptOffer,
  openOpportunityModal,
  opportunitiesLoading,
  selectedLeadOpportunities,
  stageCounts,
  getStageLabel,
  formatPipelineCount,
  pipelineStages,
}: LeadDetailsProps) {
  return (
    <div className="h-fit rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm">
      {selectedLead ? (
        <div className="space-y-3">
          <div className="border-b border-[var(--nc-border)] pb-3">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] text-xl font-bold text-[var(--nc-text-primary)]">
                {leadInitials(selectedLead)}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold text-[var(--nc-text-primary)]">
                  {leadDisplayName(selectedLead)}
                </h2>
                <p className="mt-1 truncate text-xs text-[var(--nc-text-secondary)]">
                  {leadDisplayCity(selectedLead)} · {leadDisplaySource(selectedLead)}
                </p>
              </div>

              <LeadStatusBadge status={selectedLead.stage} displayLocale={displayLocale} />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                {
                  label: labels.score,
                  value: selectedLead.leadScore ? `${selectedLead.leadScore}/100` : labels.notSpecified,
                },
                { label: labels.city, value: leadDisplayCity(selectedLead) },
                { label: labels.source, value: leadDisplaySource(selectedLead) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="min-h-[52px] rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3"
                >
                  <p className="truncate text-xs text-[var(--nc-text-secondary)]">{stat.label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-[var(--nc-text-primary)]">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {detailTabs.map((tab) => {
              const active = detailTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDetailTab(tab.id)}
                  className={
                    active
                      ? "nc-btn-primary min-h-[34px] rounded-xl px-3 py-1.5 text-xs font-semibold"
                      : "nc-btn-ghost min-h-[34px] rounded-xl px-3 py-1.5 text-xs font-semibold"
                  }
                >
                  {labels[tab.labelKey]}
                </button>
              );
            })}
          </div>

          {detailTab === "summary" && (
            <LeadSummaryPanel
              labels={labels}
              selectedLead={selectedLead}
              detailData={detailData}
              leadDisplayName={leadDisplayName}
              leadDisplayCity={leadDisplayCity}
              leadDisplaySource={leadDisplaySource}
              leadDisplayStatus={leadDisplayStatus}
              leadDisplayOwner={leadDisplayOwner}
            />
          )}

          {detailTab === "contacts" && <LeadContactsPanel labels={labels} />}

          {detailTab === "tasks" && <LeadTasksPanel labels={labels} />}

          {detailTab === "tours" && (
            <LeadToursPanel
              labels={labels}
              selectedLead={selectedLead}
              toursLoading={toursLoading}
              selectedLeadTours={selectedLeadTours}
              units={units}
              isArabic={isArabic}
              leadDisplayName={leadDisplayName}
              unitDisplayLabel={unitDisplayLabel}
              formatDate={formatDate}
              formatDisplayTime={formatDisplayTime}
            />
          )}

          {detailTab === "offers" && (
            <LeadOffersPanel
              labels={labels}
              selectedLead={selectedLead}
              offersLoading={offersLoading}
              selectedLeadOffers={selectedLeadOffers}
              opportunities={opportunities}
              units={units}
              offerableOpportunities={offerableOpportunities}
              isArabic={isArabic}
              acceptingOfferId={acceptingOfferId}
              openOfferModal={openOfferModal}
              openTourModal={openTourModal}
              handleAcceptOffer={handleAcceptOffer}
              leadDisplayName={leadDisplayName}
              unitDisplayLabel={unitDisplayLabel}
              formatCurrency={formatCurrency}
            />
          )}

          {detailTab === "opportunities" && (
            <LeadOpportunitiesPanel
              labels={labels}
              selectedLead={selectedLead}
              opportunitiesLoading={opportunitiesLoading}
              selectedLeadOpportunities={selectedLeadOpportunities}
              units={units}
              isArabic={isArabic}
              displayLocale={displayLocale}
              openOpportunityModal={openOpportunityModal}
              leadDisplayName={leadDisplayName}
              unitDisplayLabel={unitDisplayLabel}
              formatCurrency={formatCurrency}
              formatNumber={formatNumber}
              formatDate={formatDate}
            />
          )}

          {detailTab === "pipeline" && (
            <LeadPipelinePanel
              labels={labels}
              stageCounts={stageCounts}
              displayLocale={displayLocale}
              getStageLabel={getStageLabel}
              formatPipelineCount={formatPipelineCount}
              pipelineStages={pipelineStages}
            />
          )}
        </div>
      ) : (
        <EmptyState message={labels.selectLead} />
      )}
    </div>
  );
}
