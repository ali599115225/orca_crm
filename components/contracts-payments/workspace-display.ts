import { displayEntity, displayEnum, displayPerson } from '@/lib/display';
import type { DisplayLocale } from '@/lib/display';
import { formatDisplayDate } from '@/lib/display/dateTime';

export type ContractsPaymentsLocale = DisplayLocale;

export function textFor(locale: ContractsPaymentsLocale, ar: string, en: string): string {
  return locale === 'ar' ? ar : en;
}

function emptyValue(locale: ContractsPaymentsLocale): string {
  return textFor(locale, 'غير محدد', 'Not specified');
}

function isArabicText(value: string): boolean {
  return /[؀-ۿ]/.test(value);
}

function isTechnicalReference(value?: string | null): boolean {
  const text = String(value || '').trim();
  if (!text) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text) ||
    /^[0-9a-f]{12,}$/i.test(text);
}

function isDemoOrMockValue(value: unknown): boolean {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return false;
  return text.includes('demo') ||
    text.includes('stress') ||
    text.includes('mock') ||
    text.includes('test data') ||
    text.includes('unnamed') ||
    text.includes('unknown') ||
    text.includes('no data available') ||
    text.includes('تجريبي') ||
    text.includes('محاكاة') ||
    text.includes('اختباري') ||
    text.includes('غير معروف') ||
    text.includes('لا توجد بيانات');
}

function isUnsafeDisplayValue(value: unknown, locale: ContractsPaymentsLocale): boolean {
  const text = String(value || '').trim();
  if (!text) return true;
  if (isTechnicalReference(text) || isDemoOrMockValue(text)) return true;
  if (locale === 'en' && isArabicText(text)) return true;
  if (locale === 'ar' && !isArabicText(text) && /^[a-zA-Z][a-zA-Z\s]*$/.test(text) && text.length >= 4) return true;
  return false;
}

function cleanDisplayCandidate(
  value: unknown,
  original: unknown,
  locale: ContractsPaymentsLocale,
): string | null {
  const text = String(value || '').trim();
  if (!text || isUnsafeDisplayValue(text, locale)) return null;
  const raw = String(original || '').trim().toLowerCase();
  if (raw && text.toLowerCase() === raw && /^[a-z0-9_.-]+$/i.test(text) && text.includes('_')) return null;
  return text;
}

export function safeDisplayValue(value: unknown, locale: ContractsPaymentsLocale): string {
  const text = String(value || '').trim();
  return isUnsafeDisplayValue(text, locale) ? emptyValue(locale) : text;
}

export function displayPersonSafe(value: unknown, locale: ContractsPaymentsLocale): string {
  return cleanDisplayCandidate(displayPerson(String(value || ''), locale), value, locale) ||
    safeDisplayValue(value, locale);
}

export function displayEntitySafe(
  value: unknown,
  kind: string,
  locale: ContractsPaymentsLocale,
): string {
  return cleanDisplayCandidate(
    displayEntity(String(value || ''), kind as never, locale),
    value,
    locale,
  ) || safeDisplayValue(value, locale);
}

export function invoiceStatusLabel(status: string, locale: ContractsPaymentsLocale): string {
  return displayEnum(String(status || ''), 'invoiceStatus', locale);
}

export function invoiceStatusBadgeClass(status: string): string {
  switch (String(status).toLowerCase()) {
    case 'paid':
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    case 'overdue':
      return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    default:
      return 'bg-warning/20 text-warning border border-warning/30';
  }
}

export function paymentMethodLabel(method: string, locale: ContractsPaymentsLocale): string {
  const normalized = String(method || '').trim().toLowerCase();
  if (normalized === 'bank_transfer' || normalized === 'transfer') {
    return displayEnum('bank', 'paymentMethod', locale);
  }
  return displayEnum(normalized, 'paymentMethod', locale);
}

export function paymentStatusLabel(
  status: string | undefined,
  locale: ContractsPaymentsLocale,
): string {
  switch (String(status || '').trim().toUpperCase()) {
    case 'COMPLETED': return textFor(locale, 'مكتملة', 'Completed');
    case 'PAID': return textFor(locale, 'مدفوعة', 'Paid');
    case 'PENDING': return textFor(locale, 'معلقة', 'Pending');
    case 'PROCESSING': return textFor(locale, 'قيد المعالجة', 'Processing');
    case 'INITIATING': return textFor(locale, 'قيد الإنشاء', 'Initiating');
    case 'FAILED': return textFor(locale, 'فشلت', 'Failed');
    case 'CANCELLED': return textFor(locale, 'ملغاة', 'Cancelled');
    default: return safeDisplayValue(status, locale);
  }
}

export function paymentProviderLabel(
  provider: string | undefined,
  locale: ContractsPaymentsLocale,
): string {
  switch (String(provider || '').trim().toUpperCase()) {
    case 'MANUAL': return textFor(locale, 'يدوي', 'Manual');
    case 'NGENIUS': return 'N-Genius';
    case 'PAYLINK': return 'Paylink';
    default: return safeDisplayValue(provider, locale);
  }
}

export function paymentStatusBadgeClass(status: string | undefined): string {
  switch (String(status || '').trim().toUpperCase()) {
    case 'COMPLETED':
    case 'PAID':
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    case 'FAILED':
    case 'CANCELLED':
      return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    case 'PROCESSING':
    case 'INITIATING':
      return 'bg-sky-500/20 text-sky-300 border border-sky-500/30';
    default:
      return 'bg-warning/20 text-warning border border-warning/30';
  }
}

export function formatNumberValue(value: number, locale: ContractsPaymentsLocale): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US').format(value || 0);
}

export function formatMoneyValue(value: number, locale: ContractsPaymentsLocale): string {
  return locale === 'ar'
    ? `${formatNumberValue(value, locale)} ر.س`
    : `SAR ${formatNumberValue(value, locale)}`;
}

export function formatDateValue(value: string, locale: ContractsPaymentsLocale): string {
  if (!value) return emptyValue(locale);
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return formatDisplayDate(date);
  return safeDisplayValue(value, locale);
}
