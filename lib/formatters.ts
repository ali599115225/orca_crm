// lib/formatters.ts

/**
 * Translates English digits to Arabic numerals.
 *
 * Kept for explicit non-operational callers that intentionally request Arabic
 * numerals. ORCA operational display formatters must keep Latin digits.
 */
export function toArabicNumerals(num: string | number | undefined | null): string {
  if (num === undefined || num === null) return "";
  const str = num.toString();
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return str
    .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
    .replace(/%/g, "٪");
}

/**
 * Formats a numeric value using the ORCA-UPC-01 operational currency contract.
 *
 * Arabic: 180,000 ر.س
 * English: SAR 180,000
 * Digits remain Latin in both languages.
 */
export function formatCurrency(val: number, lang: "AR" | "EN" = "AR"): string {
  const rounded = Math.round(val);
  const formatted = rounded.toLocaleString("en-US");

  if (lang === "EN") {
    return `SAR ${formatted}`;
  }

  return `${formatted} ر.س`;
}
