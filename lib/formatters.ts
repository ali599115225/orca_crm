// lib/formatters.ts

/**
 * Translates English digits to Arabic numerals.
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
 * Formats a numeric value into a currency string (SAR / ر.س) based on the language.
 */
export function formatCurrency(val: number, lang: 'AR' | 'EN' = 'AR'): string {
  const rounded = Math.round(val);
  const formatted = rounded.toLocaleString('en-US');
  if (lang === 'EN') {
    return `${formatted} SAR`;
  }
  return `${toArabicNumerals(formatted)} ر.س`;
}
