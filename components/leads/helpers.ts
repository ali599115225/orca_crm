import React from "react";
import { displayEnum } from "@/lib/display";
import type { DisplayLocale } from "@/lib/display";
import { formatDisplayDate } from "@/lib/display/dateTime";
import type { Copy } from "./types";
import { leadStatusTone, leadVisual } from "@/features/leads/visual";

export const PIPELINE_STAGES = [
  "New",
  "Contacted",
  "Qualified",
  "Tour Scheduled",
  "Offer Sent",
  "Negotiation",
  "Closed",
];

export function formatNumber(value: unknown, isArabic: boolean): string {
  const numberValue = Number(value || 0);

  return Number.isFinite(numberValue)
    ? numberValue.toLocaleString(isArabic ? "ar-SA" : "en-US")
    : "0";
}

export function formatPipelineCount(value: unknown): string {
  const numberValue = Number(value || 0);

  return Number.isFinite(numberValue) ? numberValue.toLocaleString("en-US") : "0";
}

export function formatCurrency(value: unknown, isArabic: boolean): string {
  const numberValue = Number(value || 0);

  return Number.isFinite(numberValue)
    ? `${numberValue.toLocaleString(isArabic ? "ar-SA" : "en-US")} ${isArabic ? "ر.س" : "SAR"}`
    : isArabic
      ? "0 ر.س"
      : "0 SAR";
}

export function formatDate(value: string | null | undefined, isArabic: boolean, fallback: string): string {
  if (!value) return fallback;

  return formatDisplayDate(value) || fallback;
}

export function normalizeDateFieldText(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);

  return parts.join("-");
}

export function parseDateFieldToIso(value: string): string {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) return "";

  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day)
  ) {
    return "";
  }

  return iso;
}

export function getStageLabel(stageId: string, displayLocale: DisplayLocale): string {
  return displayEnum(stageId, 'leadStatus', displayLocale);
}

// Presentational components using React.createElement for pure .ts compatibility
export function EmptyState({ message }: { message: string }) {
  return React.createElement(
    "div",
    {
      className: `${leadVisual.emptyState} flex min-h-[96px] items-center justify-center`,
    },
    React.createElement(
      "p",
      { className: "text-sm font-medium leading-6 text-[var(--nc-text-secondary)]" },
      message
    )
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return React.createElement(
    "p",
    { className: "mt-1 text-xs font-semibold text-red-500" },
    message
  );
}

export function LeadStatusBadge({
  status,
  displayLocale,
}: {
  status?: string | null;
  displayLocale: DisplayLocale;
}) {
  const label = displayEnum(status, 'leadStatus', displayLocale);

  return React.createElement(
    "span",
    {
      className: `inline-flex min-h-7 min-w-[96px] items-center justify-center rounded-full border px-3 text-xs font-bold ${leadStatusTone(status)}`,
    },
    label
  );
}

export function PaginationBar({
  page,
  totalPages,
  labels,
  isArabic,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  labels: Copy;
  isArabic: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;

  return React.createElement(
    "div",
    {
      className:
        "mt-4 flex flex-col gap-3 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-3 text-sm text-[var(--nc-text-secondary)] sm:flex-row sm:items-center sm:justify-between",
    },
    React.createElement(
      "span",
      null,
      labels.page,
      " ",
      formatNumber(page, isArabic),
      " ",
      labels.of,
      " ",
      formatNumber(totalPages, isArabic)
    ),
    React.createElement(
      "div",
      { className: "flex gap-2" },
      React.createElement(
        "button",
        {
          type: "button",
          disabled: page <= 1,
          onClick: onPrevious,
          className:
            leadVisual.secondaryButton,
        },
        labels.previous
      ),
      React.createElement(
        "button",
        {
          type: "button",
          disabled: page >= totalPages,
          onClick: onNext,
          className:
            leadVisual.compactPrimaryButton,
        },
        labels.next
      )
    )
  );
}
