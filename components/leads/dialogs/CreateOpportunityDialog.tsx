"use client";

import type { FormEvent } from "react";
import type { Copy, LeadItem, OpportunityForm, OpportunityFormErrors, UnitOption } from "../types";
import { FieldError } from "../helpers";

interface CreateOpportunityDialogProps {
  labels: Copy;
  selectedLead: LeadItem;
  opportunityForm: OpportunityForm;
  setOpportunityForm: (value: OpportunityForm | ((prev: OpportunityForm) => OpportunityForm)) => void;
  opportunityErrors: OpportunityFormErrors;
  setOpportunityErrors: (value: OpportunityFormErrors | ((prev: OpportunityFormErrors) => OpportunityFormErrors)) => void;
  unitSelectOpen: boolean;
  setUnitSelectOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  unitsLoading: boolean;
  selectedUnit: UnitOption | undefined;
  hasValidSelectedUnit: boolean;
  unitsError: string | null;
  selectableUnits: UnitOption[];
  opportunitySaving: boolean;
  isArabic: boolean;
  direction: "rtl" | "ltr";
  closeOpportunityModal: () => void;
  handleCreateOpportunity: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  leadDisplayName: (lead: LeadItem) => string;
  unitDisplayLabel: (unit?: UnitOption | null) => string;
  formatCurrency: (value: unknown, isArabic: boolean) => string;
  formatNumber: (value: unknown, isArabic: boolean) => string;
  normalizeDateFieldText: (value: string) => string;
  parseDateFieldToIso: (value: string) => string;
}

export default function CreateOpportunityDialog({
  labels,
  selectedLead,
  opportunityForm,
  setOpportunityForm,
  opportunityErrors,
  setOpportunityErrors,
  unitSelectOpen,
  setUnitSelectOpen,
  unitsLoading,
  selectedUnit,
  hasValidSelectedUnit,
  unitsError,
  selectableUnits,
  opportunitySaving,
  isArabic,
  direction,
  closeOpportunityModal,
  handleCreateOpportunity,
  leadDisplayName,
  unitDisplayLabel,
  formatCurrency,
  formatNumber,
  normalizeDateFieldText,
  parseDateFieldToIso,
}: CreateOpportunityDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-opportunity-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeOpportunityModal();
        }
      }}
    >
      <form
        onSubmit={handleCreateOpportunity}
        dir={direction}
        className="flex max-h-[85vh] w-[calc(100vw-1.5rem)] max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-text-primary)] shadow-2xl sm:w-full"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--nc-border)] px-5 py-4">
          <div className="min-w-0">
            <h2 id="create-opportunity-title" className="text-base font-bold text-[var(--nc-text-primary)]">
              {labels.createOpportunity}
            </h2>
            <p className="mt-1 truncate text-xs text-[var(--nc-text-secondary)]">
              {labels.opportunityLead}: {leadDisplayName(selectedLead)}
            </p>
          </div>
          <button
            type="button"
            onClick={closeOpportunityModal}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] text-lg leading-none text-[var(--nc-text-secondary)] transition-colors hover:text-[var(--nc-text-primary)]"
            aria-label={labels.cancel}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-3">
            <p className="text-xs font-semibold text-[var(--nc-text-secondary)]">
              {labels.opportunityLead}
            </p>
            <p className="mt-1 truncate text-sm font-bold text-[var(--nc-text-primary)]">
              {leadDisplayName(selectedLead)}
            </p>
          </div>

          {opportunityErrors.form && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
              {opportunityErrors.form}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">
                {labels.opportunityValue}
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={opportunityForm.value}
                onChange={(event) => {
                  setOpportunityForm((form) => ({ ...form, value: event.target.value }));
                  setOpportunityErrors((errors) => ({ ...errors, value: undefined, form: undefined }));
                }}
                className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none transition-colors focus:border-[#C8A45D]"
                inputMode="numeric"
              />
              <FieldError message={opportunityErrors.value} />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">
                {labels.opportunityProbability}
              </label>
              <div className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 focus-within:border-[#C8A45D]">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={opportunityForm.probability}
                  onChange={(event) => {
                    setOpportunityForm((form) => ({ ...form, probability: event.target.value }));
                    setOpportunityErrors((errors) => ({ ...errors, probability: undefined, form: undefined }));
                  }}
                  className="min-w-0 flex-1 accent-[#C8A45D]"
                />
                <span className="w-12 text-center text-sm font-bold text-[var(--nc-text-primary)]">
                  {formatNumber(opportunityForm.probability, isArabic)}%
                </span>
              </div>
              <FieldError message={opportunityErrors.probability} />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">
              {labels.opportunityCloseDate}
            </label>
            <input
              type="text"
              value={opportunityForm.closeDateText}
              dir="ltr"
              lang="en-CA"
              onChange={(event) => {
                const closeDateText = normalizeDateFieldText(event.target.value);
                const closeDate = parseDateFieldToIso(closeDateText);

                setOpportunityForm((form) => ({ ...form, closeDate, closeDateText }));
                setOpportunityErrors((errors) => ({ ...errors, closeDate: undefined, form: undefined }));
              }}
              className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-left text-sm font-semibold text-[var(--nc-text-primary)] outline-none transition-colors focus:border-[#C8A45D]"
              inputMode="numeric"
              pattern="\d{2}-\d{2}-\d{4}"
            />
            <FieldError message={opportunityErrors.closeDate} />
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">
              {labels.opportunityUnit}
            </label>
            <button
              type="button"
              onClick={() => setUnitSelectOpen((open) => !open)}
              className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none transition-colors hover:border-[#C8A45D]"
              aria-expanded={unitSelectOpen}
              aria-busy={unitsLoading}
            >
              <span className="min-w-0 truncate text-start">
                {unitsLoading
                  ? labels.unitsLoading
                  : selectedUnit
                  ? `${unitDisplayLabel(selectedUnit)} (${formatCurrency(selectedUnit.priceSar, isArabic)})`
                  : labels.opportunityUnitPlaceholder}
              </span>
              <span className="shrink-0 text-[var(--nc-text-secondary)]" aria-hidden="true">
                {unitSelectOpen ? "^" : "v"}
              </span>
            </button>
            <FieldError message={opportunityErrors.unitId} />

            {unitSelectOpen && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-1 shadow-lg">
                {unitsLoading ? (
                  <div className="px-3 py-3 text-sm font-semibold text-[var(--nc-text-secondary)]">
                    {labels.unitsLoading}
                  </div>
                ) : unitsError ? (
                  <div className="px-3 py-3 text-sm font-semibold text-red-500">
                    {unitsError}
                  </div>
                ) : selectableUnits.length === 0 ? (
                  <div className="px-3 py-3 text-sm font-semibold text-[var(--nc-text-secondary)]">
                    {labels.noAvailableUnits}
                  </div>
                ) : (
                  selectableUnits.map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => {
                        setOpportunityForm((form) => ({ ...form, unitId: unit.id }));
                        setOpportunityErrors((errors) => ({ ...errors, unitId: undefined, form: undefined }));
                        setUnitSelectOpen(false);
                      }}
                      className={
                        opportunityForm.unitId === unit.id
                          ? "flex w-full items-center justify-between gap-3 rounded-lg bg-[#C8A45D]/15 px-3 py-2 text-start text-sm font-bold text-[var(--nc-text-primary)]"
                          : "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-sm font-semibold text-[var(--nc-text-primary)] transition-colors hover:bg-[var(--nc-surface-soft)]"
                      }
                    >
                      <span className="min-w-0 truncate">
                        {unitDisplayLabel(unit)}
                      </span>
                      <span className="shrink-0 text-xs text-[var(--nc-text-secondary)]">
                        {formatCurrency(unit.priceSar, isArabic)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeOpportunityModal}
            className="nc-btn-ghost min-h-[42px] rounded-xl px-4 py-2 text-sm font-bold"
          >
            {labels.cancel}
          </button>
          <button
            type="submit"
            disabled={opportunitySaving || unitsLoading || !hasValidSelectedUnit}
            className="min-h-[42px] rounded-xl bg-[#C8A45D] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[#B89245] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {opportunitySaving ? labels.savingOpportunity : labels.saveOpportunity}
          </button>
        </div>
      </form>
    </div>
  );
}
