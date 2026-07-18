"use client";

import { useEffect, useState } from "react";
import type { Copy, LeadItem, Offer, Opportunity, UnitOption } from "../types";
import { EmptyState } from "../helpers";
import { ExternalLink, FileText } from "lucide-react";
import { leadVisual } from "@/features/leads/visual";
import LeadListPager from "@/features/leads/components/LeadListPager";

const LEAD_PANEL_PAGE_SIZE = 5;

function offerStatusLabel(status: string, isArabic: boolean): string {
  const labels: Record<string, [string, string]> = {
    PENDING: ["قيد الانتظار", "Pending"],
    ACCEPTED: ["مقبول", "Accepted"],
    REJECTED: ["مرفوض", "Rejected"],
    EXPIRED: ["منتهي", "Expired"],
    CANCELLED: ["ملغى", "Cancelled"],
  };
  const pair = labels[status];
  return pair ? pair[isArabic ? 0 : 1] : status;
}


function offerStatusTone(status: string): string {
  switch (status) {
    case "ACCEPTED":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "REJECTED":
    case "CANCELLED":
      return "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300";
    case "EXPIRED":
      return "border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-300";
    default:
      return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }
}

interface LeadOffersPanelProps {
  labels: Copy;
  selectedLead: LeadItem;
  offersLoading: boolean;
  loadError: string | null;
  actionError: string | null;
  selectedLeadOffers: Offer[];
  opportunities: Opportunity[];
  units: UnitOption[];
  offerableOpportunities: Opportunity[];
  isArabic: boolean;
  canWrite: boolean;
  acceptingOfferId: string | null;
  openOfferModal: () => void;
  openTourModal: (offer: Offer) => void;
  handleAcceptOffer: (offer: Offer) => Promise<void> | void;
  leadDisplayName: (lead: LeadItem) => string;
  unitDisplayLabel: (unit?: UnitOption | null) => string;
  formatCurrency: (value: unknown, isArabic: boolean) => string;
  openOfferPage: (offerId: string) => void;
  openUnitPage: (unitId: string) => void;
}

export default function LeadOffersPanel({
  labels,
  selectedLead,
  offersLoading,
  loadError,
  actionError,
  selectedLeadOffers,
  opportunities,
  units,
  offerableOpportunities,
  isArabic,
  canWrite,
  acceptingOfferId,
  openOfferModal,
  openTourModal,
  handleAcceptOffer,
  leadDisplayName,
  unitDisplayLabel,
  formatCurrency,
  openOfferPage,
  openUnitPage,
}: LeadOffersPanelProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(
    1,
    Math.ceil(selectedLeadOffers.length / LEAD_PANEL_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const visibleOffers = selectedLeadOffers.slice(
    (safePage - 1) * LEAD_PANEL_PAGE_SIZE,
    safePage * LEAD_PANEL_PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [selectedLead.id]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const canCreateOffer = canWrite && offerableOpportunities.length > 0;
  const emptyMessage =
    offerableOpportunities.length === 0
      ? labels.offerNoOpportunity
      : labels.noOffers;

  return (
    <div className="space-y-3">
      <div className={`${leadVisual.softPanel} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className={leadVisual.iconTile}>
            <FileText className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className={leadVisual.sectionTitle}>{labels.offerListTitle}</h3>
            <p className={leadVisual.meta}>
              <bdi dir="auto">{leadDisplayName(selectedLead)}</bdi>
            </p>
          </div>
        </div>
        <div>
          <button
            type="button"
            onClick={openOfferModal}
            disabled={!canCreateOffer}
            className={leadVisual.primaryButton}
            title={!canCreateOffer ? (!canWrite ? (isArabic ? "لا تملك صلاحية الكتابة" : "No write permission") : labels.offerNoOpportunity) : undefined}
          >
            {labels.createOffer}
          </button>
          {!canCreateOffer && (
            <p className="mt-1.5 text-xs font-medium text-[var(--nc-text-dim)]" role="note">
              {!canWrite
                ? (isArabic ? "لا تملك صلاحية الكتابة" : "No write permission")
                : labels.offerNoOpportunity}
            </p>
          )}
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
      ) : offersLoading ? (
        <EmptyState message={labels.offersLoading} />
      ) : selectedLeadOffers.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="space-y-2">
          {visibleOffers.map((offer) => {
            const opportunity = opportunities.find(
              (item) => item.id === offer.linkedOpportunityId,
            );
            const unit = units.find((item) => item.id === offer.unitId);
            const legacyBlocked = !offer.unitId;
            const validUntil = new Date(offer.validUntil);
            const isExpired =
              !Number.isNaN(validUntil.getTime()) &&
              validUntil.getTime() < Date.now();
            const isPending = offer.status === "PENDING";
            const actionsDisabled =
              !canWrite || legacyBlocked || isExpired || !isPending;
            const validityLabel = Number.isNaN(validUntil.getTime())
              ? labels.notSpecified
              : validUntil.toLocaleDateString(isArabic ? "ar-SA" : "en-US");

            return (
              <div
                key={offer.id}
                className={`${leadVisual.card} p-4`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--nc-text-primary)]">
                      {formatCurrency(offer.price, isArabic)}
                    </p>
                    <p className="mt-1 truncate text-xs text-[var(--nc-text-secondary)]">
                      {unit ? unitDisplayLabel(unit) : labels.legacyOfferBlocked}
                    </p>
                    {opportunity && (
                      <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                        {labels.offerOpportunity}:{" "}
                        {formatCurrency(opportunity.value, isArabic)}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--nc-text-secondary)]">
                      <span className={`rounded-full border px-2.5 py-1 font-bold ${offerStatusTone(offer.status)}`}>
                        {offerStatusLabel(offer.status, isArabic)}
                      </span>
                      <span>
                        {labels.offerValidUntil}: {validityLabel}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openOfferPage(offer.id)}
                      className={leadVisual.secondaryButton}
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      {isArabic ? "صفحة العروض" : "Offers page"}
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
                    <button
                      type="button"
                      onClick={() => openTourModal(offer)}
                      disabled={actionsDisabled}
                      className={leadVisual.secondaryButton}
                    >
                      {labels.scheduleTour}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAcceptOffer(offer)}
                      disabled={
                        actionsDisabled || acceptingOfferId === offer.id
                      }
                      className={leadVisual.compactPrimaryButton}
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
