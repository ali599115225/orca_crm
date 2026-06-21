"use client";

import type { FormEvent } from "react";
import type { Copy, LeadItem, OfferForm, Opportunity, UnitOption } from "../types";
import { DateField } from "@/components/ui/date-time/DateField";
import { FieldError } from "../helpers";

interface CreateOfferDialogProps {
  labels: Copy;
  selectedLead: LeadItem;
  offerForm: OfferForm;
  setOfferForm: (value: OfferForm | ((prev: OfferForm) => OfferForm)) => void;
  offerErrors: Partial<Record<keyof OfferForm, string>> & { form?: string };
  setOfferErrors: (value: (Partial<Record<keyof OfferForm, string>> & { form?: string }) | ((prev: Partial<Record<keyof OfferForm, string>> & { form?: string }) => Partial<Record<keyof OfferForm, string>> & { form?: string })) => void;
  offerableOpportunities: Opportunity[];
  units: UnitOption[];
  isArabic: boolean;
  direction: "rtl" | "ltr";
  offerSaving: boolean;
  offerFormOpportunity: Opportunity | undefined;
  offerFormUnit: UnitOption | undefined;
  closeOfferModal: () => void;
  handleCreateOffer: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  leadDisplayName: (lead: LeadItem) => string;
  unitDisplayLabel: (unit?: UnitOption | null) => string;
  formatCurrency: (value: unknown, isArabic: boolean) => string;
}

export default function CreateOfferDialog({
  labels,
  selectedLead,
  offerForm,
  setOfferForm,
  offerErrors,
  setOfferErrors,
  offerableOpportunities,
  units,
  isArabic,
  direction,
  offerSaving,
  offerFormOpportunity,
  offerFormUnit,
  closeOfferModal,
  handleCreateOffer,
  leadDisplayName,
  unitDisplayLabel,
  formatCurrency,
}: CreateOfferDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeOfferModal();
      }}
    >
      <form
        onSubmit={handleCreateOffer}
        dir={direction}
        className="flex max-h-[85vh] w-[calc(100vw-1.5rem)] max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-text-primary)] shadow-2xl sm:w-full"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--nc-border)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--nc-text-primary)]">{labels.createOffer}</h2>
            <p className="mt-1 truncate text-xs text-[var(--nc-text-secondary)]">{leadDisplayName(selectedLead)}</p>
          </div>
          <button type="button" onClick={closeOfferModal} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] text-lg leading-none text-[var(--nc-text-secondary)]">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {offerErrors.form && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
              {offerErrors.form}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">{labels.offerOpportunity}</label>
            <select
              value={offerForm.opportunityId}
              onChange={(event) => {
                const opportunity = offerableOpportunities.find((item) => item.id === event.target.value);
                setOfferForm((form) => ({
                  ...form,
                  opportunityId: event.target.value,
                  price: opportunity ? String(Number(opportunity.value || 0)) : "",
                }));
                setOfferErrors((errors) => ({ ...errors, opportunityId: undefined, form: undefined }));
              }}
              className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[#C8A45D]"
            >
              <option value="">{labels.offerOpportunityRequired}</option>
              {offerableOpportunities.map((opportunity) => {
                const unit = units.find((item) => item.id === opportunity.unitId);
                return (
                  <option key={opportunity.id} value={opportunity.id}>
                    {formatCurrency(opportunity.value, isArabic)} - {unitDisplayLabel(unit)}
                  </option>
                );
              })}
            </select>
            <FieldError message={offerErrors.opportunityId} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">{labels.offerPrice}</label>
              <input
                type="number"
                min="1"
                value={offerForm.price}
                onChange={(event) => {
                  setOfferForm((form) => ({ ...form, price: event.target.value }));
                  setOfferErrors((errors) => ({ ...errors, price: undefined, form: undefined }));
                }}
                className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[#C8A45D]"
              />
              <FieldError message={offerErrors.price} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">{labels.offerValidUntil}</label>
              <DateField
                value={offerForm.validUntil}
                onChange={(validUntil) => {
                  setOfferForm((form) => ({ ...form, validUntil, validUntilText: validUntil }));
                  setOfferErrors((errors) => ({ ...errors, validUntil: undefined, form: undefined }));
                }}
                className="w-full border-[var(--nc-border)] bg-[var(--nc-surface)] focus-within:border-[#C8A45D] focus-within:ring-0"
              />
              <FieldError message={offerErrors.validUntil} />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-3">
            <p className="text-xs font-semibold text-[var(--nc-text-secondary)]">{labels.offerUnitReadonly}</p>
            <p className="mt-1 truncate text-sm font-bold text-[var(--nc-text-primary)]">
              {unitDisplayLabel(offerFormUnit)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--nc-border)] px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={closeOfferModal} className="nc-btn-ghost min-h-[42px] rounded-xl px-4 py-2 text-sm font-bold">
            {labels.cancel}
          </button>
          <button type="submit" disabled={offerSaving || !offerFormOpportunity?.unitId} className="min-h-[42px] rounded-xl bg-[#C8A45D] px-5 py-2 text-sm font-bold text-white hover:bg-[#B89245] disabled:cursor-not-allowed disabled:opacity-60">
            {offerSaving ? labels.savingOffer : labels.saveOffer}
          </button>
        </div>
      </form>
    </div>
  );
}
