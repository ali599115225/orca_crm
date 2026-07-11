"use client";

import type { FormEvent } from "react";
import type { Copy, LeadItem, TourForm } from "../types";
import { TimeField } from "@/components/ui/date-time/TimeField";
import { FieldError } from "../helpers";
import { leadVisual } from "@/features/leads/visual";

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
      className={leadVisual.modalOverlay}
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeTourModal();
      }}
    >
      <form
        onSubmit={handleScheduleTour}
        dir={direction}
        className={leadVisual.modal}
      >
        <div className={leadVisual.modalHeader}>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--nc-text-primary)]">{labels.scheduleTour}</h2>
            <p className="mt-1 truncate text-xs text-[var(--nc-text-secondary)]">{leadDisplayName(selectedLead)}</p>
          </div>
          <button type="button" onClick={closeTourModal} className={leadVisual.closeButton}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className={leadVisual.modalBody}>
          {tourErrors.form && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
              {tourErrors.form}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={`mb-1.5 block ${leadVisual.label}`}>{labels.tourDate}</label>
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
                className={`${leadVisual.input} text-left`}
              />
              <FieldError message={tourErrors.startDate} />
            </div>
            <div dir="ltr">
              <label className={`mb-1.5 block text-right ${leadVisual.label}`}>{labels.tourTime}</label>
              <TimeField value={tourForm.time} onChange={(v) => setTourForm(f => ({ ...f, time: v }))} className="w-full" />
            </div>
          </div>
          <div>
            <label className={`mb-1.5 block ${leadVisual.label}`}>{labels.tourLocation}</label>
            <input
              value={tourForm.location}
              onChange={(event) => {
                setTourForm((form) => ({ ...form, location: event.target.value }));
                setTourErrors((errors) => ({ ...errors, location: undefined, form: undefined }));
              }}
              className={leadVisual.input}
            />
            <FieldError message={tourErrors.location} />
          </div>
        </div>

        <div className={leadVisual.modalFooter}>
          <button type="button" onClick={closeTourModal} className={leadVisual.secondaryButton}>
            {labels.cancel}
          </button>
          <button type="submit" disabled={tourSaving} className={leadVisual.primaryButton}>
            {tourSaving ? labels.savingTour : labels.saveTour}
          </button>
        </div>
      </form>
    </div>
  );
}
