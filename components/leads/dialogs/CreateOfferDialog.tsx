"use client";

import type { FormEvent } from "react";
import type { Copy, LeadItem, OfferForm, Opportunity, UnitOption } from "../types";
import { DateField } from "@/components/ui/date-time/DateField";
import { FieldError } from "../helpers";
import { leadVisual } from "@/features/leads/visual";
import SettingsSelect from "@/components/settings/SettingsSelect";
import type { SettingsSelectOption } from "@/components/settings/SettingsSelect";

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
  const opportunityOptions: SettingsSelectOption[] = offerableOpportunities.map(
    (opportunity) => {
      const unit = units.find((item) => item.id === opportunity.unitId);
      return {
        value: opportunity.id,
        label: `${formatCurrency(opportunity.value, isArabic)} · ${unitDisplayLabel(unit)}`,
      };
    },
  );

  return (
    <div
      className={leadVisual.modalOverlay}
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeOfferModal();
      }}
    >
      <form
        onSubmit={handleCreateOffer}
        dir={direction}
        className={leadVisual.modal}
      >
        <div className={leadVisual.modalHeader}>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--nc-text-primary)]">{labels.createOffer}</h2>
            <p className="mt-1 truncate text-xs text-[var(--nc-text-secondary)]">{leadDisplayName(selectedLead)}</p>
          </div>
          <button type="button" onClick={closeOfferModal} className={leadVisual.closeButton}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className={leadVisual.modalBody}>
          {offerErrors.form && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
              {offerErrors.form}
            </div>
          )}

          <div>
            <label className={`mb-1.5 block ${leadVisual.label}`}>{labels.offerOpportunity}</label>
            <SettingsSelect
              value={offerForm.opportunityId}
              placeholder={labels.offerOpportunityRequired}
              onChange={(value) => {
                const opportunity = offerableOpportunities.find(
                  (item) => item.id === value,
                );
                setOfferForm((form) => ({
                  ...form,
                  opportunityId: value,
                  price: opportunity
                    ? String(Number(opportunity.value || 0))
                    : "",
                }));
                setOfferErrors((errors) => ({
                  ...errors,
                  opportunityId: undefined,
                  form: undefined,
                }));
              }}
              options={opportunityOptions}
              aria-label={labels.offerOpportunity}
              className={`${leadVisual.select} w-full`}
            />
            <FieldError message={offerErrors.opportunityId} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={`mb-1.5 block ${leadVisual.label}`}>{labels.offerPrice}</label>
              <input
                type="number"
                min="1"
                value={offerForm.price}
                onChange={(event) => {
                  setOfferForm((form) => ({ ...form, price: event.target.value }));
                  setOfferErrors((errors) => ({ ...errors, price: undefined, form: undefined }));
                }}
                dir="ltr"
                className={`${leadVisual.input} text-left`}
              />
              <FieldError message={offerErrors.price} />
            </div>
            <div>
              <label className={`mb-1.5 block ${leadVisual.label}`}>{labels.offerValidUntil}</label>
              <DateField
                value={offerForm.validUntil}
                onChange={(validUntil) => {
                  setOfferForm((form) => ({ ...form, validUntil, validUntilText: validUntil }));
                  setOfferErrors((errors) => ({ ...errors, validUntil: undefined, form: undefined }));
                }}
                className="w-full border-[var(--nc-border)] bg-[var(--nc-surface-solid)] focus-within:border-[var(--nc-accent)] focus-within:ring-2 focus-within:ring-[var(--nc-accent-soft)]"
              />
              <FieldError message={offerErrors.validUntil} />
            </div>
          </div>

          <div className={`${leadVisual.softPanel} px-4 py-3`}>
            <p className="text-xs font-semibold text-[var(--nc-text-secondary)]">{labels.offerUnitReadonly}</p>
            <p className="mt-1 truncate text-sm font-bold text-[var(--nc-text-primary)]">
              {unitDisplayLabel(offerFormUnit)}
            </p>
          </div>
        </div>

        <div className={leadVisual.modalFooter}>
          <button type="button" onClick={closeOfferModal} className={leadVisual.secondaryButton}>
            {labels.cancel}
          </button>
          <button type="submit" disabled={offerSaving || !offerFormOpportunity?.unitId} className={leadVisual.primaryButton}>
            {offerSaving ? labels.savingOffer : labels.saveOffer}
          </button>
        </div>
      </form>
    </div>
  );
}
