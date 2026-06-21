import type { DisplayLocale, DisplayOptions, EnumType } from './types';

const ENUM_MAPS: Record<EnumType, Record<string, { ar: string; en: string }>> = {
  leadStatus: {
    NEW: { ar: 'جديد', en: 'New' },
    CONTACTED: { ar: 'تم التواصل', en: 'Contacted' },
    VISIT_SCHEDULED: { ar: 'مجدول', en: 'Scheduled' },
    VISITED: { ar: 'تمت الزيارة', en: 'Visited' },
    OFFER_MADE: { ar: 'أرسل العرض', en: 'Offered' },
    RESERVED: { ar: 'محجوز', en: 'Reserved' },
    CONTRACT_SIGNED: { ar: 'موقّع', en: 'Signed' },
    WON: { ar: 'مكتمل', en: 'Won' },
    LOST: { ar: 'ملغي', en: 'Lost' },
  },
  leadSource: {
    WHATSAPP: { ar: 'واتساب', en: 'WhatsApp' },
    WEBSITE: { ar: 'الموقع الإلكتروني', en: 'Website' },
    REFERRAL: { ar: 'توصية', en: 'Referral' },
    'Google Ads': { ar: 'إعلانات قوقل', en: 'Google Ads' },
    'Meta Ads': { ar: 'إعلانات ميتا', en: 'Meta Ads' },
    'Snapchat Ads': { ar: 'إعلانات سناب', en: 'Snapchat Ads' },
    'TikTok Ads': { ar: 'إعلانات تيك توك', en: 'TikTok Ads' },
    'إعلانات سناب شات': { ar: 'إعلانات سناب شات', en: 'Snapchat Ads' },
    'حملة ميتا': { ar: 'حملة ميتا', en: 'Meta Ads' },
    'زيارة مباشرة': { ar: 'زيارة مباشرة', en: 'Direct Visit' },
  },
  taskPriority: {
    HIGH: { ar: 'عالية', en: 'High' },
    MEDIUM: { ar: 'متوسطة', en: 'Medium' },
    LOW: { ar: 'منخفضة', en: 'Low' },
  },
  tourStatus: {
    SCHEDULED: { ar: 'مجدولة', en: 'Scheduled' },
    COMPLETED: { ar: 'مكتملة', en: 'Completed' },
    CANCELLED: { ar: 'ملغاة', en: 'Cancelled' },
    NO_SHOW: { ar: 'لم يحضر', en: 'No Show' },
    FOLLOW_UP: { ar: 'تحتاج متابعة', en: 'Follow-up' },
  },
  offerStatus: {
    PENDING: { ar: 'معلق', en: 'Pending' },
    ACCEPTED: { ar: 'مقبول', en: 'Accepted' },
    REJECTED: { ar: 'مرفوض', en: 'Rejected' },
  },
  rentalStatus: {
    active: { ar: 'نشط', en: 'Active' },
    expired: { ar: 'منتهي', en: 'Expired' },
    terminated: { ar: 'ملغي', en: 'Terminated' },
  },
  propertyStatus: {
    Available: { ar: 'متاحة', en: 'Available' },
    Hold: { ar: 'محجوزة', en: 'On Hold' },
    Sold: { ar: 'مباعة', en: 'Sold' },
    Reserved: { ar: 'محجوزة', en: 'Reserved' },
  },
  projectStatus: {
    PLANNING: { ar: 'مخطط له', en: 'Planning' },
    UNDER_CONSTRUCTION: { ar: 'قيد الإنشاء', en: 'Under Construction' },
    COMPLETED: { ar: 'مكتمل', en: 'Completed' },
    SOLD_OUT: { ar: 'مباع بالكامل', en: 'Sold Out' },
  },
  invoiceStatus: {
    paid: { ar: 'مدفوعة', en: 'Paid' },
    unpaid: { ar: 'غير مدفوعة', en: 'Unpaid' },
    overdue: { ar: 'متأخرة', en: 'Overdue' },
  },
  generalStatus: {},
};

const FALLBACKS: Record<DisplayLocale, string> = {
  ar: 'غير محدد',
  en: 'Not specified',
};

export function displayEnum(
  value: string | null | undefined,
  enumType: EnumType,
  locale: DisplayLocale,
  _options?: DisplayOptions
): string {
  const raw = String(value || '').trim();
  if (!raw) return FALLBACKS[locale];

  const map = ENUM_MAPS[enumType] || {};
  const entry = map[raw];
  if (entry) return entry[locale] || raw;

  const reverseEntry = Object.entries(map).find(([, labels]) => labels[locale] === raw);
  if (reverseEntry) return locale === 'ar' ? reverseEntry[1].ar : reverseEntry[1].en;

  return raw;
}
