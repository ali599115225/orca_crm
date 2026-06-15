import React from 'react';

export type BadgeVariant =
  | 'preview'
  | 'soon'
  | 'paused'
  | 'demo'
  | 'pending'
  | 'active'
  | 'draft'
  | 'sent'
  | 'excellent'
  | 'connected'
  | 'notConnected'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'noShow'
  | 'followUp'
  | 'default';

interface StatusBadgeProps {
  variant: BadgeVariant;
  lang?: 'AR' | 'EN';
  className?: string;
}

const badgeMap: Record<BadgeVariant, { ar: string; en: string; style: string }> = {
  preview: {
    ar: 'معاينة',
    en: 'Preview',
    style: 'bg-purple-500/10 text-purple-700 border-purple-500/25 dark:text-purple-300',
  },
  soon: {
    ar: 'قريباً',
    en: 'Soon',
    style: 'bg-amber-500/10 text-amber-800 border-amber-500/25 dark:text-amber-300',
  },
  paused: {
    ar: 'متوقف',
    en: 'Paused',
    style: 'bg-slate-500/10 text-slate-700 border-slate-500/25 dark:text-slate-300',
  },
  demo: {
    ar: 'بيانات تجريبية',
    en: 'Demo data',
    style: 'bg-orange-500/10 text-orange-800 border-orange-500/25 dark:text-orange-300',
  },
  pending: {
    ar: 'قيد الربط',
    en: 'Integration pending',
    style: 'bg-cyan-500/10 text-cyan-800 border-cyan-500/25 dark:text-cyan-300',
  },
  active: {
    ar: 'نشطة',
    en: 'Active',
    style: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25 dark:text-emerald-300',
  },
  draft: {
    ar: 'مسودة',
    en: 'Draft',
    style: 'bg-slate-500/10 text-slate-700 border-slate-500/25 dark:text-slate-300',
  },
  sent: {
    ar: 'مرسل',
    en: 'Sent',
    style: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25 dark:text-emerald-300',
  },
  excellent: {
    ar: 'ممتاز',
    en: 'Excellent',
    style: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25 dark:text-emerald-300',
  },
  connected: {
    ar: 'مربوط',
    en: 'Connected',
    style: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25 dark:text-emerald-300',
  },
  notConnected: {
    ar: 'غير مربوط',
    en: 'Not connected',
    style: 'bg-rose-500/10 text-rose-800 border-rose-500/25 dark:text-rose-300',
  },
  scheduled: {
    ar: 'مجدولة',
    en: 'Scheduled',
    style: 'bg-sky-500/10 text-sky-800 border-sky-500/25 dark:text-sky-300',
  },
  completed: {
    ar: 'مكتملة',
    en: 'Completed',
    style: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25 dark:text-emerald-300',
  },
  cancelled: {
    ar: 'ملغاة',
    en: 'Cancelled',
    style: 'bg-rose-500/10 text-rose-800 border-rose-500/25 dark:text-rose-300',
  },
  noShow: {
    ar: 'لم يحضر',
    en: 'No show',
    style: 'bg-amber-500/10 text-amber-800 border-amber-500/25 dark:text-amber-300',
  },
  followUp: {
    ar: 'تحتاج متابعة',
    en: 'Follow-up',
    style: 'bg-purple-500/10 text-purple-700 border-purple-500/25 dark:text-purple-300',
  },
  default: {
    ar: 'غير محدد',
    en: 'Default',
    style: 'bg-slate-500/10 text-slate-700 border-slate-500/25 dark:text-slate-300',
  },
};

export function StatusBadge({ variant, lang = 'AR', className = '' }: StatusBadgeProps) {
  const badge = badgeMap[variant] || badgeMap.default;
  const label = lang === 'AR' ? badge.ar : badge.en;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black leading-none ${badge.style} ${className}`}>
      {label}
    </span>
  );
}

export default StatusBadge;
