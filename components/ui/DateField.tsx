"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Calendar } from "lucide-react";

export function formatDateToDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function parseNativeValueToDate(value: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function parseVisibleToNative(value: string): string {
  if (!isValidDDMMYYYY(value)) return "";
  const [dd, mm, yyyy] = value.trim().split("/");
  return `${yyyy}-${mm}-${dd}`;
}

export function isValidDDMMYYYY(value: string): boolean {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

function formatVisibleInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  error?: string;
  className?: string;
}

export const DateField: React.FC<DateFieldProps> = ({
  value,
  onChange,
  label,
  placeholder = "DD/MM/YYYY",
  disabled = false,
  min,
  max,
  error: customError,
  className = "",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [visibleValue, setVisibleValue] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    const date = parseNativeValueToDate(value);
    setVisibleValue(date ? formatDateToDDMMYYYY(date) : "");
    setLocalError("");
  }, [value]);

  const validateAndCommit = (text: string) => {
    if (!text) {
      setLocalError("");
      onChange("");
      return;
    }

    if (!isValidDDMMYYYY(text)) {
      setLocalError("يرجى كتابة التاريخ بصيغة DD/MM/YYYY");
      return;
    }

    const nativeValue = parseVisibleToNative(text);
    if (min && nativeValue < min) {
      setLocalError("التاريخ أقدم من الحد المسموح");
      return;
    }
    if (max && nativeValue > max) {
      setLocalError("التاريخ أحدث من الحد المسموح");
      return;
    }

    setLocalError("");
    onChange(nativeValue);
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {label ? (
        <label className="block text-[11px] font-bold text-[var(--nc-text-dim)]">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={visibleValue}
          onChange={(event) => {
            const next = formatVisibleInput(event.target.value);
            setVisibleValue(next);
            if (next.length === 10) validateAndCommit(next);
            else {
              setLocalError("");
              if (!next) onChange("");
            }
          }}
          onBlur={() => validateAndCommit(visibleValue)}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={10}
          dir="ltr"
          className={`orca-operations-form-control w-full pe-11 text-center font-mono tracking-wider ${
            localError || customError ? "!border-rose-500/70" : ""
          }`}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          disabled={disabled}
          className="absolute inset-y-0 end-0 grid min-h-11 w-11 place-items-center rounded-e-xl text-[var(--nc-text-dim)] transition-colors hover:text-[var(--nc-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)] disabled:opacity-40"
          aria-label="إدخال التاريخ بصيغة يوم/شهر/سنة"
        >
          <Calendar size={15} aria-hidden="true" />
        </button>
      </div>

      {localError || customError ? (
        <span className="flex items-center gap-1 text-[11px] font-bold text-rose-300">
          <AlertCircle size={11} aria-hidden="true" />
          {localError || customError}
        </span>
      ) : null}
    </div>
  );
};

interface DateRangeProps {
  fromDate: string;
  toDate: string;
  onChange: (from: string, to: string) => void;
  labelFrom?: string;
  labelTo?: string;
}

export const DateRangeField: React.FC<DateRangeProps> = ({
  fromDate,
  toDate,
  onChange,
  labelFrom = "تاريخ البداية",
  labelTo = "تاريخ النهاية",
}) => {
  const [rangeWarning, setRangeWarning] = useState("");

  const updateRange = (nextFrom: string, nextTo: string) => {
    if (nextFrom && nextTo && nextFrom > nextTo) {
      onChange(nextTo, nextFrom);
      setRangeWarning("تم تبديل التواريخ تلقائيًا للحفاظ على الترتيب الصحيح.");
      window.setTimeout(() => setRangeWarning(""), 3000);
      return;
    }
    setRangeWarning("");
    onChange(nextFrom, nextTo);
  };

  return (
    <div className="w-full space-y-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <DateField
          value={fromDate}
          onChange={(next) => updateRange(next, toDate)}
          label={labelFrom}
        />
        <DateField
          value={toDate}
          onChange={(next) => updateRange(fromDate, next)}
          label={labelTo}
        />
      </div>
      {rangeWarning ? (
        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
          <AlertCircle size={11} aria-hidden="true" />
          {rangeWarning}
        </span>
      ) : null}
    </div>
  );
};
