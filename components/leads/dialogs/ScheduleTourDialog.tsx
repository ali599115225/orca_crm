"use client";

import type { FormEvent } from "react";
import type { Copy, LeadItem, TourForm } from "../types";
import { TimeField } from "@/components/ui/date-time/TimeField";
import { FieldError } from "../helpers";

interface ScheduleTourDialogProps {
  labels: Copy;
  selectedLead: LeadItem;
  tourForm: TourForm;
  setTourForm: (value: TourForm | ((prev: TourForm) => TourForm)) => void;
  tourErrors: Partial<Record<keyof TourForm, string>> & { form?: string };
  setTourErrors: (value: (Partial<Record<keyof TourForm, string>> & { form?: string }) | ((prev: Partial<Record<keyof TourForm, string>> & { form?: string }) => Partial<Record<keyof TourForm, string>> & { form?: string })) => void;
  direction: "rtl" | "ltr";
  tourSaving: boolean;
  closeTourModal: () => void;
  handleScheduleTour: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  leadDisplayName: (lead: LeadItem) => string;
  normalizeDateFieldText: (value: string) => string;
  parseDateFieldToIso: (value: string) => string;
}

export default function ScheduleTourDialog({
  labels,
  selectedLead,
  tourForm,
  setTourForm,
  tourErrors,
  setTourErrors,
  direction,
  tourSaving,
  closeTourModal,
  handleScheduleTour,
  leadDisplayName,
  normalizeDateFieldText,
  parseDateFieldToIso,
}: ScheduleTourDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeTourModal();
      }}
    >
      <form
        onSubmit={handleScheduleTour}
        dir={direction}
        className="flex max-h-[85vh] w-[calc(100vw-1.5rem)] max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-text-primary)] shadow-2xl sm:w-full"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--nc-border)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--nc-text-primary)]">{labels.scheduleTour}</h2>
            <p className="mt-1 truncate text-xs text-[var(--nc-text-secondary)]">{leadDisplayName(selectedLead)}</p>
          </div>
          <button type="button" onClick={closeTourModal} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] text-lg leading-none text-[var(--nc-text-secondary)]">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {tourErrors.form && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
              {tourErrors.form}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">{labels.tourDate}</label>
              <input
                type="text"
                value={tourForm.startDateText}
                dir="ltr"
                lang="en-CA"
                inputMode="numeric"
                pattern="\d{2}-\d{2}-\d{4}"
                onChange={(event) => {
                  const startDateText = normalizeDateFieldText(event.target.value);
                  const startDate = parseDateFieldToIso(startDateText);
                  setTourForm((form) => ({ ...form, startDate, startDateText }));
                  setTourErrors((errors) => ({ ...errors, startDate: undefined, form: undefined }));
                }}
                className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-left text-sm font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[#C8A45D]"
              />
              <FieldError message={tourErrors.startDate} />
            </div>
            <div dir="ltr">
              <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)] text-right">{labels.tourTime}</label>
              <TimeField value={tourForm.time} onChange={(v) => setTourForm(f => ({ ...f, time: v }))} className="w-full" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">{labels.tourLocation}</label>
            <input
              value={tourForm.location}
              onChange={(event) => {
                setTourForm((form) => ({ ...form, location: event.target.value }));
                setTourErrors((errors) => ({ ...errors, location: undefined, form: undefined }));
              }}
              className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none focus:border-[#C8A45D]"
            />
            <FieldError message={tourErrors.location} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--nc-border)] px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={closeTourModal} className="nc-btn-ghost min-h-[42px] rounded-xl px-4 py-2 text-sm font-bold">
            {labels.cancel}
          </button>
          <button type="submit" disabled={tourSaving} className="min-h-[42px] rounded-xl bg-[#C8A45D] px-5 py-2 text-sm font-bold text-white hover:bg-[#B89245] disabled:cursor-not-allowed disabled:opacity-60">
            {tourSaving ? labels.savingTour : labels.saveTour}
          </button>
        </div>
      </form>
    </div>
  );
}
