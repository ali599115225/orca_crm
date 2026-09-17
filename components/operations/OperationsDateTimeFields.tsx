"use client";

import type { ChangeEvent } from "react";

export function normalizeOperationsDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function normalizeOperationsTimeInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function parseOperationsDate(
  dateValue: string,
): { valid: boolean; native?: string; date?: Date } {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateValue.trim());
  if (!match) return { valid: false };

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false };
  }

  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { valid: false };
  }

  return {
    valid: true,
    native: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    date,
  };
}

export function parseOperationsLocalDateTime(
  dateValue: string,
  timeValue: string,
): { valid: boolean; iso?: string } {
  const dateMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateValue.trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue.trim());
  if (!dateMatch || !timeMatch) return { valid: false };

  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const year = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (
    year < 2000 ||
    year > 2100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return { valid: false };
  }

  const local = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    local.getFullYear() !== year ||
    local.getMonth() !== month - 1 ||
    local.getDate() !== day ||
    local.getHours() !== hour ||
    local.getMinutes() !== minute
  ) {
    return { valid: false };
  }

  return { valid: true, iso: local.toISOString() };
}

export function splitOperationsDateTime(value: string): {
  date: string;
  time: string;
} {
  if (!value) return { date: "", time: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return {
    date: `${day}/${month}/${year}`,
    time: `${hour}:${minute}`,
  };
}

interface OperationsDateTimeFieldsProps {
  dateValue: string;
  timeValue: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  dateLabel: string;
  timeLabel: string;
  error?: string;
  disabled?: boolean;
  dateOnly?: boolean;
}

export default function OperationsDateTimeFields({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  dateLabel,
  timeLabel,
  error,
  disabled = false,
  dateOnly = false,
}: OperationsDateTimeFieldsProps) {
  const inputClass = [
    "h-11 w-full rounded-xl border bg-[var(--nc-surface-solid)] px-3 text-center text-sm font-semibold outline-none transition",
    "text-[var(--nc-text-primary)] placeholder:text-[var(--nc-text-dim)]",
    error
      ? "border-rose-500/60 focus:border-rose-400"
      : "border-[var(--nc-border)] focus:border-[var(--nc-accent-border)]",
    disabled ? "cursor-not-allowed opacity-55" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleDate = (event: ChangeEvent<HTMLInputElement>) => {
    onDateChange(normalizeOperationsDateInput(event.target.value));
  };
  const handleTime = (event: ChangeEvent<HTMLInputElement>) => {
    onTimeChange(normalizeOperationsTimeInput(event.target.value));
  };

  return (
    <div className="space-y-1.5">
      <div className={dateOnly ? "grid grid-cols-1" : "grid grid-cols-[minmax(0,1fr)_104px] gap-2"}>
        <label className="space-y-1">
          <span className="text-[11px] font-bold text-[var(--nc-text-dim)]">
            {dateLabel}
          </span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            value={dateValue}
            onChange={handleDate}
            placeholder="DD/MM/YYYY"
            dir="ltr"
            disabled={disabled}
            className={inputClass}
          />
        </label>

        {!dateOnly ? (
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-[var(--nc-text-dim)]">
              {timeLabel}
            </span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={timeValue}
              onChange={handleTime}
              placeholder="HH:MM"
              dir="ltr"
              disabled={disabled}
              className={inputClass}
            />
          </label>
        ) : null}
      </div>

      {error ? <p className="text-[11px] font-bold text-rose-300">{error}</p> : null}
    </div>
  );
}
