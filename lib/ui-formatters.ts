// lib/ui-formatters.ts — centralized display formatters
// No DB calls. No API calls. No business logic. Display only.

/**
 * Format a UUID or ID into a short, human-readable string.
 * Never returns a full UUID. Falls back to em-dash for empty values.
 */
export function formatShortId(id: string | null | undefined, prefix?: string): string {
  if (!id) return '—';
  const short = id.length >= 8 ? id.slice(-8).toUpperCase() : id.toUpperCase();
  return prefix ? `${prefix}-${short}` : short;
}

/**
 * Format a monetary amount with Saudi Riyal symbol.
 * Handles null/undefined gracefully. Does not mutate.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  lang?: string,
): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '—';
  const formatted = num.toLocaleString(lang === 'EN' ? 'en-US' : 'ar-SA');
  const symbol = lang === 'EN' ? 'SAR' : 'ر.س';
  return `${formatted} ${symbol}`;
}

/**
 * Format an ISO date string or Date object for display.
 * Returns DD/MM/YYYY in Arabic context.
 */
export function formatDate(value: string | Date | null | undefined, _lang?: string): string {
  if (!value) return '—';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '—';
  }
}

/**
 * Display a relation name, or a clear fallback if missing.
 */
export function formatRelation(name?: string | null): string {
  if (!name) return 'غير مرتبط';
  return name;
}
