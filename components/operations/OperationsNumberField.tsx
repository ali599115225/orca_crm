"use client";

import React from "react";

type NumberMode = "integer" | "decimal";

interface OperationsNumberFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "inputMode"
  > {
  value: string;
  onValueChange: (value: string) => void;
  mode?: NumberMode;
}

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EASTERN_ARABIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function normalizeDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) =>
      String(ARABIC_INDIC_DIGITS.indexOf(digit)),
    )
    .replace(/[۰-۹]/g, (digit) =>
      String(EASTERN_ARABIC_DIGITS.indexOf(digit)),
    );
}

function sanitizeNumber(value: string, mode: NumberMode) {
  const normalized = normalizeDigits(value).replace(/[٫,]/g, ".");

  if (mode === "integer") {
    return normalized.replace(/\D/g, "");
  }

  const cleaned = normalized.replace(/[^\d.]/g, "");
  const separator = cleaned.indexOf(".");

  if (separator === -1) return cleaned;

  return `${cleaned.slice(0, separator + 1)}${cleaned
    .slice(separator + 1)
    .replace(/\./g, "")}`;
}

export default function OperationsNumberField({
  value,
  onValueChange,
  mode = "integer",
  className = "",
  ...props
}: OperationsNumberFieldProps) {
  return (
    <input
      {...props}
      type="text"
      inputMode={mode === "decimal" ? "decimal" : "numeric"}
      value={value}
      onChange={(event) => onValueChange(sanitizeNumber(event.target.value, mode))}
      dir="ltr"
      autoComplete="off"
      className={["orca-operations-input", className].filter(Boolean).join(" ")}
    />
  );
}
