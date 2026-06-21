"use client";

import type { Copy, LeadItem, Offer, Opportunity, UnitOption } from "../types";
import { EmptyState } from "../helpers";

interface LeadOffersPanelProps {
  labels: Copy;
  selectedLead: LeadItem;
  offersLoading: boolean;
  selectedLeadOffers: Offer[];
  opportunities: Opportunity[];
  units: UnitOption[];
  offerableOpportunities: Opportunity[];
  isArabic: boolean;
  acceptingOfferId: string | null;
  openOfferModal: () => void;
  openTourModal: (offer: Offer) => void;
  handleAcceptOffer: (offer: Offer) => Promise<void> | void;
  leadDisplayName: (lead: LeadItem) => string;
  unitDisplayLabel: (unit?: UnitOption | null) => string;
  formatCurrency: (value: unknown, isArabic: boolean) => string;
}

export default function LeadOffersPanel({
  labels,
  selectedLead,
  offersLoading,
  selectedLeadOffers,
  opportunities,
  units,
  offerableOpportunities,
  isArabic,
  acceptingOfferId,
  openOfferModal,
  openTourModal,
  handleAcceptOffer,
  leadDisplayName,
  unitDisplayLabel,
  formatCurrency,
}: LeadOffersPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">{labels.offerListTitle}</h3>
          <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">{leadDisplayName(selectedLead)}</p>
        </div>
        <button
          type="button"
          onClick={openOfferModal}
          disabled={offerableOpportunities.length === 0}
          className="nc-btn-primary min-h-[40px] rounded-xl px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.createOffer}
        </button>
      </div>
      {offerableOpportunities.length === 0 && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300">
          {labels.offerNoOpportunity}
        </div>
      )}
      {offersLoading ? (
        <EmptyState message={labels.offersLoading} />
      ) : selectedLeadOffers.length === 0 ? (
        <EmptyState message={labels.noOffers} />
      ) : (
        <div className="space-y-2">
          {selectedLeadOffers.map((offer) => {
            const opportunity = opportunities.find((item) => item.id === offer.linkedOpportunityId);
            const unit = units.find((item) => item.id === offer.unitId);
            const legacyBlocked = !offer.unitId;

            return (
              <div key={offer.id} className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--nc-text-primary)]">
                      {formatCurrency(offer.price, isArabic)}
                    </p>
                    <p className="mt-1 truncate text-xs text-[var(--nc-text-secondary)]">
                      {unit
                        ? unitDisplayLabel(unit)
                        : labels.legacyOfferBlocked}
                    </p>
                    {opportunity && (
                      <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                        {labels.offerOpportunity}: {formatCurrency(opportunity.value, isArabic)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openTourModal(offer)}
                      disabled={legacyBlocked}
                      className="nc-btn-ghost min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {labels.scheduleTour}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAcceptOffer(offer)}
                      disabled={legacyBlocked || offer.status === "ACCEPTED" || acceptingOfferId === offer.id}
                      className="nc-btn-primary min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {acceptingOfferId === offer.id
                        ? labels.acceptingOffer
                        : offer.status === "ACCEPTED"
                          ? labels.offerAccepted
                          : labels.acceptOffer}
                    </button>
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
